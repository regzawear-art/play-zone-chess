import { supabase } from '../supabase';

// Helpers for multiplayer: friends, invites, games and realtime subscriptions

export async function listFriends() {
  const user = supabase.auth.getUser();
  // caller should ensure user is authenticated; we return empty on missing
  const uid = (await user).data?.user?.id;
  if (!uid) return [];
  const { data, error } = await supabase.from('friends').select('*').or(`user_id.eq.${uid},friend_id.eq.${uid}`);
  if (error) throw error;
  return data;
}

export async function sendInvite(toUser: string, payload: any = {}) {
  const u = await supabase.auth.getUser();
  const from = u.data?.user?.id; if (!from) throw new Error('not authenticated');
  const { data, error } = await supabase.from('invites').insert({ from_user: from, to_user: toUser, payload }).select().single();
  if (error) throw error;
  return data;
}

export async function acceptInvite(inviteId: string) {
  const u = await supabase.auth.getUser();
  const uid = u.data?.user?.id; if (!uid) throw new Error('not authenticated');
  // mark invite accepted, create game
  const { data: invite } = await supabase.from('invites').select('*').eq('id', inviteId).single();
  if (!invite) throw new Error('invite not found');
  const white = invite.payload && invite.payload.color === 'b' ? invite.from_user : uid;
  const black = invite.payload && invite.payload.color === 'b' ? uid : invite.from_user;
  const { data: game, error: gerr } = await supabase.from('games').insert({ white_id: white, black_id: black }).select().single();
  if (gerr) throw gerr;
  await supabase.from('invites').update({ status: 'accepted', game_id: game.id }).eq('id', inviteId);
  return game;
}

export function subscribeToInvites(cb: (payload: any) => void) {
  const channel = supabase.channel('public:invites').on('postgres_changes', { event: '*', schema: 'public', table: 'invites' }, (msg) => {
    cb(msg);
  }).subscribe();
  return () => { supabase.removeChannel(channel); };
}

export function subscribeToGame(gameId: string, cb: (payload: any) => void) {
  const ch = supabase.channel('game:' + gameId).on('postgres_changes', { event: '*', schema: 'public', table: 'games', filter: `id=eq.${gameId}` }, (msg) => cb(msg)).subscribe();
  return () => { supabase.removeChannel(ch); };
}

export async function pushMove(gameId: string, move: any) {
  // append move to moves JSONB array and update fen/status
  const { data, error } = await supabase.rpc('append_move_to_game', { p_game_id: gameId, p_move: move });
  if (error) throw error;
  return data;
}

export default {
  listFriends, sendInvite, acceptInvite, subscribeToInvites, subscribeToGame, pushMove,
};
