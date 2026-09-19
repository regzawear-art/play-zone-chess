/* eslint-disable */
import { supabase } from '../supabase';

// Helpers for multiplayer: friends, invites, games and realtime subscriptions

type FriendRow = { user_id: string; friend_id: string; status?: string };
type ProfileRec = { id: string; username?: string; display_name?: string; avatar_url?: string; last_active?: string };

type OnlineGameRow = { id: string; host_id: string; guest_id?: string | null; time_control?: string | null; status?: string; fen?: string; moves?: unknown; payload?: unknown };

export async function listFriends(): Promise<{ id: string; username: string; avatar: string; email: string; status: string }[]> {
  const user = await (supabase.auth.getUser() as unknown) as { data?: { user?: { id: string } } };
  // caller should ensure user is authenticated; we return empty on missing
  const uid = user.data?.user?.id;
  if (!uid) return [];
  const friendsRes = (await (supabase.from('friends').select('*').or(`user_id.eq.${uid},friend_id.eq.${uid}`) as unknown)) as { data: FriendRow[] | null; error: unknown };
  const data = friendsRes.data;
  if (!data || data.length === 0) return [];
  // resolve friend profiles for the other participant
  const otherIds: string[] = [];
  for (const row of data as FriendRow[]) {
    const other = row.user_id === uid ? row.friend_id : row.user_id;
    if (other && !otherIds.includes(other)) otherIds.push(other);
  }
  if (otherIds.length === 0) return [];
  const profilesRes = await supabase
    .from('profiles')
    .select('id,username,display_name,avatar_url,last_active')
    .in('id', otherIds as string[]);

  const profiles = profilesRes.data as ProfileRec[] | null;
  if (!profiles) {
    return data.map((row) => ({
      id: row.friend_id === uid ? row.user_id : row.friend_id,
      username: row.friend_id === uid ? row.user_id : row.friend_id,
      avatar: '',
      email: '',
      status: row.status || 'accepted',
    }));
  }
  // map rows to enriched friend objects
  const profilesMap = new Map<string, ProfileRec>();
  for (const p of profiles as ProfileRec[]) profilesMap.set(p.id, p);
  const out = (data as FriendRow[]).map((row) => {
    const other = row.user_id === uid ? row.friend_id : row.user_id;
    const prof = profilesMap.get(other) || null;
    return {
      id: other,
      username: prof?.display_name || prof?.username || other,
      avatar: prof?.avatar_url ?? '',
      email: '',
      status: row.status || 'accepted',
    };
  });
  return out;
}

export async function listOnlinePlayers(windowSeconds = 60): Promise<{ id: string; username: string; avatar: string }[]> {
  // Prefer last_active window over boolean 'online'
  try {
    const threshold = new Date(Date.now()-windowSeconds * 1000).toISOString();
    // select only guaranteed columns to avoid schema differences
    const res = (await (supabase.from('profiles').select('id,username,avatar_url,last_active').gte('last_active', threshold).order('last_active', { ascending: false }).limit(50) as unknown)) as { data: ProfileRec[] | null; error: unknown };
    if (res.data) return res.data.map((p) => ({ id: p.id, username: p.display_name || p.username || p.id, avatar: p.avatar_url || '' }));
  } catch (_) {
    // ignore
  }
  // fallback: empty
  return [];
}

export async function searchPlayers(term: string, limit = 10): Promise<ProfileRec[]> {
  const q = term.trim();
  if (!q) return [];

  const looksLikeId = /^[0-9a-fA-F-]{8,}$/.test(q);
  if (looksLikeId) {
    const byId = await supabase
      .from('profiles')
      .select('id,username,display_name,avatar_url,last_active')
      .eq('id', q)
      .maybeSingle();
    if (byId.data) return [byId.data as ProfileRec];
  }

  const escaped = q.replace(/[%_,]/g, (char) => `\\${char}`);
  const pattern = `%${escaped}%`;
  const { data, error } = await supabase
    .from('profiles')
    .select('id,username,display_name,avatar_url,last_active')
    .or(`username.ilike.${pattern},display_name.ilike.${pattern}`)
    .neq('id', (await supabase.auth.getUser()).data.user?.id ?? '')
    .limit(limit);

  if (error) {
    console.error('[multiplayer] searchPlayers error:', error);
    return [];
  }

  return (data ?? []) as ProfileRec[];
}

export async function sendInvite(toUser: string, payload: Record<string, unknown> = {}) {
  const u = (await (supabase.auth.getUser() as unknown)) as { data?: { user?: { id: string } } };
  const from = u.data?.user?.id; if (!from) throw new Error('not authenticated');

  // Resolve usernames/display names to a profile id. The profiles table does
  // not contain auth email addresses, so email lookup here was never reliable.
  let targetId: string | null = null;
  const t = String(toUser || '').trim();
  const looksLikeId = /^[0-9a-fA-F-]{8,}$/.test(t);

  if (looksLikeId) {
    const byId = await supabase.from('profiles').select('id').eq('id', t).maybeSingle();
    targetId = byId.data?.id ?? null;
  } else if (t) {
    const byUsername = await supabase
      .from('profiles')
      .select('id')
      .or(`username.eq.${t.replace(/,/g, '')},display_name.eq.${t.replace(/,/g, '')}`)
      .maybeSingle();
    targetId = byUsername.data?.id ?? null;
  }

  if (!targetId) {
    throw new Error('target user not found');
  }

  // prevent self-invite: quick check
    const me = await supabase.auth.getUser();
    const myid = me.data?.user?.id;

    if (myid && myid === targetId) {
        throw new Error('self-invite');
    }

  const res = (await (supabase.from('invites').insert({ from_user: from, to_user: targetId, payload }).select().single() as unknown)) as { data?: Record<string, unknown> | null; error?: unknown };
  // @ts-ignore
  if ((res as any).error) {
    // eslint-disable-next-line no-console
    console.error('[multiplayer] sendInvite error', (res as any).error);
    throw new Error('failed to send invite: ' + String((res as any).error.message ?? (res as any).error));
  }
  if (!res.data) throw new Error('failed to send invite');
  return res.data as Record<string, unknown>;
}

export async function acceptInvite(inviteId: string) {
  const u = await supabase.auth.getUser();
  const uid = u.data?.user?.id;
  if (!uid) throw new Error('not authenticated');

  // Fetch the invite and make sure the current user is the recipient.
  const inviteRes = (await (supabase
    .from('invites')
    .select('*')
    .eq('id', inviteId)
    .eq('to_user', uid)
    .eq('status', 'pending')
    .single() as unknown)) as {
    data?: Record<string, any> | null;
    error?: any;
  };

  if (inviteRes.error) {
    throw new Error(`Could not load invite: ${inviteRes.error.message ?? inviteRes.error}`);
  }

  const invite = inviteRes.data;
  if (!invite) throw new Error('invite not found or already handled');

  // The old implementation called create_online_game with the inviter's
  // user id. That RPC deliberately rejects calls where p_user !== auth.uid(),
  // so accepting an invite produced "not authorized". The acceptor is the
  // authenticated user and therefore must create the row as host; the inviter
  // becomes the guest. This is an intentional, secure direct insert covered by
  // the online_games INSERT policy (host_id = auth.uid()).
  const rawInvitePayload = invite.payload;
  const payload: Record<string, unknown> =
    rawInvitePayload && typeof rawInvitePayload === 'object' && !Array.isArray(rawInvitePayload)
      ? (rawInvitePayload as Record<string, unknown>)
      : {};
  const timeControl = typeof payload.time_control === 'string' ? payload.time_control : null;
  const insertBody: Record<string, unknown> = {
    host_id: uid,
    guest_id: invite.from_user,
    time_control: timeControl ?? '3min',
    status: 'active',
    fen: 'startpos',
    turn: 'w',
    moves: [],
    payload,
  };

  const gameRes = (await (supabase
    .from('online_games')
    .insert(insertBody)
    .select()
    .single() as unknown)) as {
    data?: OnlineGameRow | null;
    error?: any;
  };

  if (gameRes.error) {
    console.error('[multiplayer] accept invite game insert failed:', gameRes.error);
    throw new Error(`Failed creating game: ${gameRes.error.message ?? gameRes.error}`);
  }

  const game = gameRes.data;
  if (!game?.id) throw new Error('Failed creating game');

  // Mark the invite accepted and attach the newly-created game. Do not delete
  // it immediately: the inviter needs the UPDATE event/game_id to open the game.
  const { error: updateError } = await supabase
    .from('invites')
    .update({ status: 'accepted', game_id: game.id })
    .eq('id', inviteId)
    .eq('to_user', uid);

  if (updateError) {
    console.error('[multiplayer] failed to update accepted invite:', updateError);
    // The game exists, but the sender cannot discover it through the invite
    // event if this update fails, so surface the error rather than pretending
    // the invite completed normally.
    throw new Error(`Game created, but invite update failed: ${updateError.message}`);
  }

  // Let the acceptor open the game immediately. The sender will receive the
  // invite UPDATE through subscribeToInvites and open the same game by game_id.
  window.dispatchEvent(
    new CustomEvent('online-game-created', {
      detail: game,
    })
  );

  return game;
}

// Friend request helpers
export async function sendFriendRequest(target: string) {
    const {
        data: { user },
        error: authError,
    } = await supabase.auth.getUser();

    if (authError) {
        throw authError;
    }

    if (!user) {
        throw new Error('Not authenticated');
    }

    const from = user.id;
    const value = target.trim();

    if (!value) {
        throw new Error('Please enter a username, email, or user ID');
    }

    let targetId: string | null = null;

    // UUID lookup
    const uuidResult = await supabase
        .from('profiles')
        .select('id')
        .eq('id', value)
        .maybeSingle();

    if (uuidResult.error) {
        console.error('Profile UUID lookup failed:', uuidResult.error);
    }

    if (uuidResult.data?.id) {
        targetId = uuidResult.data.id;
    }

    // Username lookup
    if (!targetId) {
        const usernameResult = await supabase
            .from('profiles')
            .select('id')
            .eq('username', value)
            .maybeSingle();

        if (usernameResult.error) {
            console.error(
                'Profile username lookup failed:',
                usernameResult.error
            );
        }

        if (usernameResult.data?.id) {
            targetId = usernameResult.data.id;
        }
    }

    // Email lookup
    if (!targetId) {
        const emailResult = await supabase
            .from('profiles')
            .select('id')
            .eq('email', value)
            .maybeSingle();

        if (emailResult.error) {
            console.error(
                'Profile email lookup failed:',
                emailResult.error
            );
        }

        if (emailResult.data?.id) {
            targetId = emailResult.data.id;
        }
    }

    if (!targetId) {
        throw new Error('User not found');
    }

    if (targetId === from) {
        throw new Error('self-invite');
    }

    const { data, error } = await supabase
        .from('friends')
        .insert({
            user_id: from,
            friend_id: targetId,
            status: 'pending',
        })
        .select()
        .single();

    if (error) {
        console.error('Friend request insert failed:', error);

        if (error.code === '23505') {
            throw new Error('Friend request already exists');
        }

        throw new Error(`Failed to send friend request: ${error.message}`);
    }

    return data;
}

export async function acceptFriendRequest(rowId: string) {
  const u = (await supabase.auth.getUser() as any);
  const uid = u?.data?.user?.id; if (!uid) throw new Error('not authenticated');
  // mark friend row accepted
  const { data, error } = await supabase.from('friends').update({ status: 'accepted' }).eq('id', rowId).select().maybeSingle();
  if (error) throw error;
  return data;
}

export function subscribeToInvites(cb: (payload: unknown) => void) {
  const channel = supabase.channel('public:invites').on('postgres_changes', { event: '*', schema: 'public', table: 'invites' }, (msg) => {
    cb(msg as unknown);
  }).subscribe();
  return () => { supabase.removeChannel(channel); };
}

export function subscribeToGame(gameId: string, cb: (payload: unknown) => void) {
  const ch = supabase.channel('online-game:' + gameId).on('postgres_changes', { event: '*', schema: 'public', table: 'online_games', filter: `id=eq.${gameId}` }, (msg) => cb(msg)).subscribe();
  return () => { supabase.removeChannel(ch); };
}

export async function pushMove(gameId: string, move: unknown) {
  // append move to moves JSONB array and update fen/status
    const res = (await (supabase.rpc('append_move_to_game', { p_game_id: gameId, p_move: move }) as unknown)) as { data?: unknown; error?: unknown };
  if (res.error) throw res.error as any;
  return res.data;
}

export async function createOnlineGame(options: {
    timeControl?: string | null;
    payload?: Record<string, any>;
} = {}) {
    const {
        data: { user },
        error: userError,
    } = await supabase.auth.getUser();

    if (userError) {
        throw userError;
    }

    if (!user) {
        throw new Error('Not authenticated');
    }

    const payload = options.payload ?? {};

    const { data: rpcData, error: rpcError } = await supabase.rpc(
        'create_online_game',
        {
            p_user: user.id,
            p_time_control: options.timeControl ?? null,
            p_payload: payload,
        }
    );

    if (!rpcError) {
        // create_online_game RETURNS TABLE, so Supabase returns an array.
        const game = Array.isArray(rpcData) ? rpcData[0] : rpcData;

        if (game?.id) {
            window.dispatchEvent(
                new CustomEvent('online-game-created', {
                    detail: game,
                })
            );

            return game;
        }
    }

    // Keep the fallback, but don't hide the actual errors.
    console.error('create_online_game RPC failed:', rpcError);

    const insertBody = {
        host_id: user.id,
        guest_id: null,
        time_control: options.timeControl ?? null,
        status: 'waiting',
        fen: 'startpos',
        moves: [],
        payload,
    };

    const { data: insertedGame, error: insertError } = await supabase
        .from('online_games')
        .insert(insertBody)
        .select()
        .single();

    if (insertError) {
        console.error('Fallback online_games insert failed:', insertError);

        throw new Error(
            `Failed to create game: ${insertError.message}`
        );
    }

    window.dispatchEvent(
        new CustomEvent('online-game-created', {
            detail: insertedGame,
        })
    );

    return insertedGame;
}

export async function joinOnlineGame(gameId: string) {
  const u = await supabase.auth.getUser();
  const uid = u.data?.user?.id; if (!uid) throw new Error('not authenticated');
  // Prefer RPC to join game under RLS; fallback to update
  const { data: rpcData, error: rpcErr } = await supabase.rpc('join_online_game', { p_game: gameId, p_user: uid });
  if (!rpcErr && rpcData) return rpcData as any;

  const { data: game } = await supabase.from('online_games').select('*').eq('id', gameId).single();
  if (!game) throw new Error('game not found');
  if ((game.guest_id === null || !game.guest_id) && game.host_id !== uid) {
    const { data: updated, error } = await supabase.from('online_games').update({ guest_id: uid, status: 'active' }).eq('id', gameId).select().maybeSingle();
    if (error) throw error;
    return updated;
  }
  return game;
}

export default {
  listFriends, listOnlinePlayers, searchPlayers, sendInvite, acceptInvite, subscribeToInvites, subscribeToGame, pushMove,
  sendFriendRequest, acceptFriendRequest,
  createOnlineGame, joinOnlineGame,
};
