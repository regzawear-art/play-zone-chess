import { useState, useEffect, useRef, useCallback } from 'react';
import { Search, X, Loader2, Swords, Timer } from 'lucide-react';
import { supabase } from '@/lib/supabase';

interface Props {
  open: boolean;
  onClose: () => void;
  userId: string | null;
  timeControl: string;
  onMatched: (gameId: string, isHost: boolean, opponentId: string) => void;
  onLogin: () => void;
}

type QueueRow = {
  id: string;
  user_id: string;
  time_control: string;
  status: string;
  game_id: string | null;
  opponent_id: string | null;
  created_at: string;
};

/**
 * Client-side matchmaking is deliberately deterministic.
 *
 * The old implementation let two users both query before either inserted a
 * queue row. When that happened both users waited forever. Here both users
 * enter the queue first, then the oldest pair is resolved. The lower UUID is
 * the deterministic host, so only one browser creates the game.
 *
 * The SQL migration also contains an atomic RPC for deployments where you
 * want matchmaking to be server-side. This client fallback keeps the UI
 * usable even before that migration has been applied.
 */
export function MatchmakingPanel({ open, onClose, userId, timeControl, onMatched, onLogin }: Props) {
  const [searching, setSearching] = useState(false);
  const [matched, setMatched] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [queueId, setQueueId] = useState<string | null>(null);
  const [elapsed, setElapsed] = useState(0);

  const pollRef = useRef<number | null>(null);
  const timerRef = useRef<number | null>(null);
  const giveUpRef = useRef<number | null>(null);
  const channelRef = useRef<ReturnType<typeof supabase.channel> | null>(null);
  const mountedRef = useRef(true);
  const finishingRef = useRef(false);

  const clearTimers = useCallback(() => {
    if (pollRef.current !== null) window.clearInterval(pollRef.current);
    if (timerRef.current !== null) window.clearInterval(timerRef.current);
    if (giveUpRef.current !== null) window.clearTimeout(giveUpRef.current);
    pollRef.current = null;
    timerRef.current = null;
    giveUpRef.current = null;
  }, []);

  const removeChannel = useCallback(() => {
    if (channelRef.current) {
      void supabase.removeChannel(channelRef.current);
      channelRef.current = null;
    }
  }, []);

  const cancelSearch = useCallback(async () => {
    clearTimers();
    removeChannel();

    const id = queueId;
    setQueueId(null);
    setSearching(false);
    finishingRef.current = false;

    if (id) {
      await supabase
        .from('matchmaking_queue')
        .delete()
        .eq('id', id)
        .eq('user_id', userId ?? '');
    }
  }, [clearTimers, removeChannel, queueId, userId]);

  useEffect(() => {
    mountedRef.current = true;
    return () => {
      mountedRef.current = false;
      clearTimers();
      removeChannel();
    };
  }, [clearTimers, removeChannel]);

  useEffect(() => {
    if (!open) {
      void cancelSearch();
      setSearching(false);
      setMatched(false);
      setError(null);
      setElapsed(0);
    }
  }, [open, cancelSearch]);

  useEffect(() => {
    if (!searching) {
      if (timerRef.current !== null) window.clearInterval(timerRef.current);
      timerRef.current = null;
      return;
    }

    timerRef.current = window.setInterval(() => setElapsed((value) => value + 1), 1000);
    return () => {
      if (timerRef.current !== null) window.clearInterval(timerRef.current);
      timerRef.current = null;
    };
  }, [searching]);

  const openMatchedGame = useCallback((gameId: string, isHost: boolean, opponentId: string) => {
    if (finishingRef.current || !mountedRef.current) return;
    finishingRef.current = true;
    clearTimers();
    removeChannel();
    setMatched(true);
    setSearching(false);

    window.setTimeout(() => {
      if (!mountedRef.current) return;
      onMatched(gameId, isHost, opponentId);
      onClose();
    }, 450);
  }, [clearTimers, removeChannel, onMatched, onClose]);

  const createGameAsHost = useCallback(async (opponent: QueueRow) => {
    if (!userId || finishingRef.current) return;

    try {
      const { data: game, error: gameError } = await supabase
        .from('online_games')
        .insert({
          host_id: userId,
          guest_id: opponent.user_id,
          time_control: timeControl,
          status: 'active',
          fen: 'startpos',
          turn: 'w',
        })
        .select('*')
        .single();

      if (gameError) throw gameError;
      if (!game?.id) throw new Error('Game creation returned no game id.');

      // Only the host's own queue row is updated because RLS intentionally
      // prevents one user from updating another user's queue row. The guest
      // discovers the game by polling online_games where guest_id = their id.
      const now = new Date().toISOString();
      const { error: ownError } = await supabase
        .from('matchmaking_queue')
        .update({
          status: 'matched',
          game_id: game.id,
          opponent_id: opponent.user_id,
          matched_at: now,
        })
        .eq('id', queueId ?? '')
        .eq('user_id', userId)
        .eq('status', 'searching');

      if (ownError) throw ownError;

      openMatchedGame(game.id, true, opponent.user_id);
    } catch (err) {
      console.error('[Matchmaking] host creation failed:', err);
      setError(err instanceof Error ? err.message : 'Failed to create online game.');
      await cancelSearch();
    }
  }, [userId, timeControl, queueId, openMatchedGame, cancelSearch]);

  const checkQueue = useCallback(async () => {
    if (!userId || !queueId || finishingRef.current) return;

    const { data: me, error: meError } = await supabase
      .from('matchmaking_queue')
      .select('id,user_id,time_control,status,game_id,opponent_id,created_at')
      .eq('id', queueId)
      .maybeSingle();

    if (meError) {
      console.warn('[Matchmaking] queue check failed:', meError);
      return;
    }

    if (!me) return;

    if (me.status === 'matched' && me.game_id) {
      openMatchedGame(me.game_id, false, me.opponent_id ?? '');
      return;
    }

    // Guest path: the host cannot update our queue row because of RLS.
    // Instead, look for an active game that names us as guest.
    const { data: guestGame } = await supabase
      .from('online_games')
      .select('id,host_id,guest_id,time_control,status')
      .eq('guest_id', userId)
      .eq('status', 'active')
      .eq('time_control', timeControl)
      .order('created_at', { ascending: false })
      .limit(1)
      .maybeSingle();

    if (guestGame?.id) {
      await supabase
        .from('matchmaking_queue')
        .update({
          status: 'matched',
          game_id: guestGame.id,
          opponent_id: guestGame.host_id,
          matched_at: new Date().toISOString(),
        })
        .eq('id', queueId)
        .eq('user_id', userId);

      openMatchedGame(guestGame.id, false, guestGame.host_id);
      return;
    }

    const { data: candidates, error: candidateError } = await supabase
      .from('matchmaking_queue')
      .select('id,user_id,time_control,status,game_id,opponent_id,created_at')
      .eq('status', 'searching')
      .eq('time_control', timeControl)
      .neq('user_id', userId)
      .order('created_at', { ascending: true })
      .limit(10);

    if (candidateError || !candidates?.length) return;

    const opponent = candidates[0] as QueueRow;
    // Only the oldest queue entry creates the game. This prevents a third
    // searching player from pairing itself with the same oldest player while
    // two browsers are resolving the same queue snapshot.
    const mineIsOlder =
      me.created_at < opponent.created_at ||
      (me.created_at === opponent.created_at && me.id < opponent.id);
    if (mineIsOlder) {
      await createGameAsHost(opponent);
    }
  }, [userId, queueId, timeControl, openMatchedGame, createGameAsHost]);

  const startSearch = async () => {
    if (!userId) {
      onLogin();
      return;
    }

    setError(null);
    setMatched(false);
    setElapsed(0);
    finishingRef.current = false;

    // Remove stale duplicate rows for this user before creating a new one.
    await supabase
      .from('matchmaking_queue')
      .delete()
      .eq('user_id', userId)
      .eq('status', 'searching');

    const { data: myEntry, error: insertError } = await supabase
      .from('matchmaking_queue')
      .insert({ user_id: userId, time_control: timeControl, status: 'searching' })
      .select('id,user_id,time_control,status,game_id,opponent_id,created_at')
      .single();

    if (insertError || !myEntry) {
      console.error('[Matchmaking] queue insert failed:', insertError);
      setError(insertError?.message ?? 'Failed to join matchmaking queue.');
      setSearching(false);
      return;
    }

    setQueueId(myEntry.id);
    setSearching(true);

    const channel = supabase
      .channel(`mm-${myEntry.id}`)
      .on(
        'postgres_changes',
        {
          event: 'UPDATE',
          schema: 'public',
          table: 'matchmaking_queue',
          filter: `id=eq.${myEntry.id}`,
        },
        (payload) => {
          const row = payload.new as QueueRow;
          if (row.status === 'matched' && row.game_id) {
            openMatchedGame(row.game_id, false, row.opponent_id ?? '');
          }
        },
      )
      .subscribe();

    channelRef.current = channel;

    // Polling is intentional: it makes matchmaking work even if the project
    // has not added matchmaking_queue to Supabase Realtime yet.
    pollRef.current = window.setInterval(() => void checkQueue(), 1200);
    void checkQueue();

    giveUpRef.current = window.setTimeout(() => {
      if (!finishingRef.current) {
        setError('No opponent found yet. You can keep searching or try again later.');
        void cancelSearch();
      }
    }, 120000);
  };

  if (!open) return null;

  return (
    <div className="fixed inset-0 z-[100] grid place-items-center bg-black/70 p-4 backdrop-blur-md">
      <div className="relative w-full max-w-md overflow-hidden rounded-3xl border border-white/10 bg-navy-800 shadow-2xl">
        <div className="relative overflow-hidden bg-blue-grad px-6 py-6">
          <button
            type="button"
            onClick={() => { void cancelSearch(); onClose(); }}
            className="absolute right-4 top-4 grid h-8 w-8 place-items-center rounded-full bg-white/15 text-white hover:bg-white/25"
            aria-label="Close matchmaking"
          >
            <X size={16} />
          </button>
          <div className="flex items-center gap-3 pr-8">
            <span className="grid h-11 w-11 place-items-center rounded-2xl bg-white/15">
              <Search size={20} className="text-white" />
            </span>
            <div>
              <p className="font-display text-xl font-extrabold text-white">Play Online</p>
              <p className="mt-0.5 text-xs text-white/70">Automatically match you with another player.</p>
            </div>
          </div>
        </div>

        <div className="px-6 py-6">
          {!searching && !matched && (
            <div className="space-y-4">
              <div className="flex items-center gap-3 rounded-2xl border border-white/5 bg-navy-700 p-4">
                <Timer size={20} className="text-royal-400" />
                <div>
                  <p className="text-sm font-semibold text-white">Time control</p>
                  <p className="text-xs text-navy-300">{timeControl === 'custom' ? 'Custom' : timeControl}</p>
                </div>
              </div>
              <button type="button" onClick={() => void startSearch()} className="btn-primary w-full">
                <Swords size={18} />
                Find Opponent
              </button>
              {!userId && <p className="text-center text-xs text-navy-400">Sign in to play online.</p>}
            </div>
          )}

          {searching && !matched && (
            <div className="space-y-5 text-center">
              <div className="relative mx-auto grid h-20 w-20 place-items-center">
                <div className="absolute h-20 w-20 animate-ping rounded-full bg-royal-400/20" />
                <div className="relative grid h-16 w-16 place-items-center rounded-full bg-blue-grad shadow-glow-sm">
                  <Loader2 size={28} className="animate-spin text-white" />
                </div>
              </div>
              <div>
                <p className="font-display text-lg font-bold text-white">Looking for an opponent…</p>
                <p className="mt-1 font-display text-2xl font-extrabold tabular-nums text-royal-400">
                  {String(Math.floor(elapsed / 60)).padStart(2, '0')}:{String(elapsed % 60).padStart(2, '0')}
                </p>
                <p className="mt-2 text-xs text-navy-400">Keep this window open. The match starts automatically.</p>
              </div>
              <button type="button" onClick={() => void cancelSearch()} className="btn-ghost w-full">
                <X size={16} />
                Cancel Search
              </button>
            </div>
          )}

          {matched && (
            <div className="space-y-4 py-2 text-center">
              <div className="mx-auto grid h-16 w-16 place-items-center rounded-2xl bg-emerald-500/15">
                <Swords size={28} className="text-emerald-300" />
              </div>
              <div>
                <p className="font-display text-lg font-bold text-white">Opponent Found!</p>
                <p className="mt-1 text-sm text-navy-300">Opening the board…</p>
              </div>
            </div>
          )}

          {error && (
            <p className="mt-4 rounded-xl border border-red-400/10 bg-red-500/10 px-3 py-2 text-sm text-red-300">{error}</p>
          )}
        </div>
      </div>
    </div>
  );
}
