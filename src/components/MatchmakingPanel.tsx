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

export function MatchmakingPanel({ open, onClose, userId, timeControl, onMatched, onLogin }: Props) {
  const [searching, setSearching] = useState(false);
  const [matched, setMatched] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [queueId, setQueueId] = useState<string | null>(null);
  const [elapsed, setElapsed] = useState(0);
  const pollRef = useRef<number | null>(null);
  const timerRef = useRef<number | null>(null);
  const realtimeChannelRef = useRef<ReturnType<typeof supabase.channel> | null>(null);

  useEffect(() => {
    if (!open) {
      cancelSearch();
      setSearching(false);
      setMatched(false);
      setError(null);
      setQueueId(null);
      setElapsed(0);
    }
  }, [open]);

  useEffect(() => {
    if (searching) {
      timerRef.current = window.setInterval(() => setElapsed((e) => e + 1), 1000);
    } else {
      if (timerRef.current) { window.clearInterval(timerRef.current); timerRef.current = null; }
      setElapsed(0);
    }
    return () => { if (timerRef.current) window.clearInterval(timerRef.current); };
  }, [searching]);

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      if (pollRef.current) window.clearInterval(pollRef.current);
      if (timerRef.current) window.clearInterval(timerRef.current);
      if (realtimeChannelRef.current) supabase.removeChannel(realtimeChannelRef.current);
      if (queueId) supabase.from('matchmaking_queue').delete().eq('id', queueId).then(() => {});
    };
  }, [queueId]);

  const cancelSearch = useCallback(async () => {
    if (pollRef.current) { window.clearInterval(pollRef.current); pollRef.current = null; }
    if (realtimeChannelRef.current) { supabase.removeChannel(realtimeChannelRef.current); realtimeChannelRef.current = null; }
    if (queueId) {
      await supabase.from('matchmaking_queue').delete().eq('id', queueId);
      setQueueId(null);
    }
    setSearching(false);
  }, [queueId]);

  const startSearch = async () => {
    if (!userId) { onLogin(); return; }
    setError(null);
    setSearching(true);
    setMatched(false);

    // First, try to find an existing searching opponent
    const { data: existing } = await supabase
      .from('matchmaking_queue')
      .select('*')
      .eq('status', 'searching')
      .eq('time_control', timeControl)
      .neq('user_id', userId)
      .order('created_at', { ascending: true })
      .limit(1)
      .maybeSingle();

    if (existing) {
      // Match found — create the game as the guest (joining player)
      const { data: game, error: gameErr } = await supabase
        .from('online_games')
        .insert({
          host_id: existing.user_id,
          guest_id: userId,
          time_control: timeControl,
          status: 'active',
        })
        .select()
        .maybeSingle();

      if (gameErr || !game) {
        setError('Failed to create game. Please try again.');
        setSearching(false);
        return;
      }

      // Mark the opponent's queue entry as matched
      await supabase
        .from('matchmaking_queue')
        .update({ status: 'matched', game_id: game.id, opponent_id: userId, matched_at: new Date().toISOString() })
        .eq('id', existing.id);

      setMatched(true);
      setSearching(false);
      setTimeout(() => {
        onMatched(game.id, false, existing.user_id);
        onClose();
      }, 1200);
      return;
    }

    // No existing opponent — insert ourselves into the queue
    const { data: myEntry, error: insertErr } = await supabase
      .from('matchmaking_queue')
      .insert({ user_id: userId, time_control: timeControl, status: 'searching' })
      .select()
      .maybeSingle();

    if (insertErr || !myEntry) {
      setError('Failed to join queue. Please try again.');
      setSearching(false);
      return;
    }

    setQueueId(myEntry.id);

    // Subscribe to changes on our queue entry for realtime match notification
    const channel = supabase
      .channel(`mm-${myEntry.id}`)
      .on(
        'postgres_changes',
        { event: 'UPDATE', schema: 'public', table: 'matchmaking_queue', filter: `id=eq.${myEntry.id}` },
        (payload) => {
          const updated = payload.new as { status: string; game_id: string | null; opponent_id: string | null };
          if (updated.status === 'matched' && updated.game_id) {
            setMatched(true);
            setSearching(false);
            if (pollRef.current) { window.clearInterval(pollRef.current); pollRef.current = null; }
            setTimeout(() => {
              onMatched(updated.game_id!, true, updated.opponent_id!);
              onClose();
            }, 1200);
          }
        },
      )
      .subscribe();

    realtimeChannelRef.current = channel;

    // Also poll as a fallback (every 2s) in case realtime misses the update
    pollRef.current = window.setInterval(async () => {
      const { data: check } = await supabase
        .from('matchmaking_queue')
        .select('status, game_id, opponent_id')
        .eq('id', myEntry.id)
        .maybeSingle();
      if (check && check.status === 'matched' && check.game_id) {
        if (pollRef.current) { window.clearInterval(pollRef.current); pollRef.current = null; }
        setMatched(true);
        setSearching(false);
        setTimeout(() => {
          onMatched(check.game_id, true, check.opponent_id!);
          onClose();
        }, 1200);
      }
    }, 2000);
  };

  if (!open) return null;

  return (
    <div className="fixed inset-0 z-[100] grid place-items-center bg-navy-900/70 p-4 backdrop-blur-sm animate-fade-in">
      <div className="relative w-full max-w-md overflow-hidden rounded-3xl border border-white/10 bg-navy-700 shadow-card-lg animate-pop-in">
        <div className="relative overflow-hidden bg-blue-grad px-6 pb-6 pt-6">
          <button
            onClick={() => { cancelSearch(); onClose(); }}
            className="absolute right-4 top-4 grid h-8 w-8 place-items-center rounded-full bg-white/20 text-white transition-colors hover:bg-white/30"
          >
            <X size={16} />
          </button>
          <div className="flex items-center gap-2.5">
            <span className="grid h-9 w-9 place-items-center rounded-xl bg-white/20">
              <Search size={18} className="text-white" />
            </span>
            <div>
              <p className="font-display text-lg font-extrabold text-white">Online Matchmaking</p>
              <p className="text-xs text-royal-100">Find an opponent to play in real-time</p>
            </div>
          </div>
        </div>

        <div className="px-6 py-6">
          {!searching && !matched && (
            <div className="space-y-4">
              <div className="flex items-center gap-3 rounded-2xl bg-navy-600 p-4">
                <Timer size={20} className="text-royal-400" />
                <div>
                  <p className="text-sm font-semibold text-white">Time Control</p>
                  <p className="text-xs text-navy-300">{timeControl === 'custom' ? 'Custom' : timeControl}</p>
                </div>
              </div>
              <button onClick={startSearch} className="btn-primary w-full">
                <Swords size={18} />
                Find Opponent
              </button>
              {!userId && (
                <p className="text-center text-xs text-navy-400">Sign in to play online</p>
              )}
            </div>
          )}

          {searching && !matched && (
            <div className="space-y-5 text-center">
              <div className="mx-auto grid h-20 w-20 place-items-center">
                <div className="absolute h-20 w-20 animate-ping rounded-full bg-royal-400/30" />
                <div className="relative grid h-16 w-16 place-items-center rounded-full bg-blue-grad shadow-glow-sm">
                  <Loader2 size={28} className="animate-spin text-white" />
                </div>
              </div>
              <div>
                <p className="font-display text-lg font-bold text-white">Searching for opponent…</p>
                <p className="mt-1 font-display text-2xl font-extrabold tabular-nums text-royal-400">
                  {String(Math.floor(elapsed / 60)).padStart(2, '0')}:{String(elapsed % 60).padStart(2, '0')}
                </p>
              </div>
              <button onClick={() => { cancelSearch(); }} className="btn-ghost w-full">
                <X size={16} />
                Cancel Search
              </button>
            </div>
          )}

          {matched && (
            <div className="space-y-4 text-center">
              <div className="mx-auto grid h-16 w-16 place-items-center rounded-2xl bg-emerald-50 animate-pop-in">
                <Swords size={28} className="text-emerald-600" />
              </div>
              <div>
                <p className="font-display text-lg font-bold text-emerald-700">Opponent Found!</p>
                <p className="mt-1 text-sm text-navy-300">Starting game…</p>
              </div>
              <div className="mx-auto h-1 w-32 overflow-hidden rounded-full bg-navy-600">
                <div className="h-full animate-pulse rounded-full bg-emerald-500" style={{ width: '100%' }} />
              </div>
            </div>
          )}

          {error && (
            <p className="mt-3 rounded-xl bg-red-50 px-3 py-2 text-sm text-red-600">{error}</p>
          )}
        </div>
      </div>
    </div>
  );
}
