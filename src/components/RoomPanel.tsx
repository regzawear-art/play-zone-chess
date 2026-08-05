import { useState, useEffect } from 'react';
import { DoorOpen, Copy, Check, Users, Loader2, X, Link as LinkIcon } from 'lucide-react';
import { supabase } from '@/lib/supabase';

interface Props {
  open: boolean;
  onClose: () => void;
  userId: string | null;
  onRoomJoined: (roomId: string, isHost: boolean) => void;
}

export function RoomPanel({ open, onClose, userId, onRoomJoined }: Props) {
  const [roomCode, setRoomCode] = useState<string | null>(null);
  const [roomId, setRoomId] = useState<string | null>(null);
  const [joinCode, setJoinCode] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [copied, setCopied] = useState(false);
  const [mode, setMode] = useState<'create' | 'join'>('create');
  const [waiting, setWaiting] = useState(false);
  const [guestJoined, setGuestJoined] = useState(false);

  useEffect(() => {
    if (!open) {
      setRoomCode(null);
      setRoomId(null);
      setJoinCode('');
      setError(null);
      setCopied(false);
      setWaiting(false);
      setGuestJoined(false);
    }
  }, [open]);

  // Realtime: listen for guest joining the room
  useEffect(() => {
    if (!roomId || !waiting) return;
    const channel = supabase
      .channel(`room-${roomId}`)
      .on(
        'postgres_changes',
        { event: 'UPDATE', schema: 'public', table: 'rooms', filter: `id=eq.${roomId}` },
        (payload) => {
          const updated = payload.new as { status: string; guest_id: string | null };
          if (updated.status === 'active' && updated.guest_id) {
            setGuestJoined(true);
            setWaiting(false);
            setTimeout(() => {
              onRoomJoined(roomId, true);
              onClose();
            }, 1200);
          }
        },
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [roomId, waiting, onRoomJoined, onClose]);

  // Cleanup orphaned room on unmount/close while waiting
  useEffect(() => {
    return () => {
      if (roomId && waiting) {
        supabase.from('rooms').delete().eq('id', roomId).then(() => {});
      }
    };
  }, [roomId, waiting]);

  // Consume ?room=CODE deep link
  useEffect(() => {
    if (!open) return;
    const params = new URLSearchParams(window.location.search);
    const roomParam = params.get('room');
    if (roomParam) {
      setMode('join');
      setJoinCode(roomParam.toUpperCase());
    }
  }, [open]);

  if (!open) return null;

  const createRoom = async () => {
    if (!userId) {
      setError('Please sign in to create a room.');
      return;
    }
    setLoading(true);
    setError(null);
    const { data, error: err } = await supabase
      .from('rooms')
      .insert({ host_id: userId, status: 'waiting' })
      .select()
      .maybeSingle();
    if (err) {
      setError(err.message);
      setLoading(false);
      return;
    }
    if (data) {
      setRoomCode(data.code);
      setRoomId(data.id);
      setWaiting(true);
    }
    setLoading(false);
  };

  const joinRoom = async () => {
    if (!userId) {
      setError('Please sign in to join a room.');
      return;
    }
    if (!joinCode.trim()) return;
    setLoading(true);
    setError(null);
    const { data, error: err } = await supabase
      .from('rooms')
      .select('*')
      .eq('code', joinCode.trim().toUpperCase())
      .eq('status', 'waiting')
      .maybeSingle();
    if (err) {
      setError(err.message);
      setLoading(false);
      return;
    }
    if (!data) {
      setError('Room not found or already in progress.');
      setLoading(false);
      return;
    }
    if (data.host_id === userId) {
      setError('You cannot join your own room. Share the code with a friend.');
      setLoading(false);
      return;
    }
    const { error: joinErr } = await supabase
      .from('rooms')
      .update({ guest_id: userId, status: 'active' })
      .eq('id', data.id);
    if (joinErr) {
      setError(joinErr.message);
      setLoading(false);
      return;
    }
    onRoomJoined(data.id, false);
    setLoading(false);
    onClose();
  };

  const copyCode = () => {
    if (!roomCode) return;
    navigator.clipboard?.writeText(roomCode);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const copyLink = () => {
    if (!roomCode) return;
    const link = `${window.location.origin}?room=${roomCode}`;
    navigator.clipboard?.writeText(link);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const handleClose = () => {
    if (roomId && waiting) {
      supabase.from('rooms').delete().eq('id', roomId).then(() => {});
    }
    onClose();
  };

  return (
    <div className="fixed inset-0 z-[100] grid place-items-center bg-navy-900/70 p-4 backdrop-blur-sm animate-fade-in">
      <div className="relative w-full max-w-md overflow-hidden rounded-3xl border border-white/10 bg-navy-700 shadow-card-lg animate-pop-in">
        <div className="relative overflow-hidden bg-blue-grad px-6 pb-6 pt-6">
          <button
            onClick={handleClose}
            className="absolute right-4 top-4 grid h-8 w-8 place-items-center rounded-full bg-white/20 text-white transition-colors hover:bg-white/30"
          >
            <X size={16} />
          </button>
          <div className="flex items-center gap-2.5">
            <span className="grid h-9 w-9 place-items-center rounded-xl bg-white/20">
              <DoorOpen size={18} className="text-white" />
            </span>
            <div>
              <p className="font-display text-lg font-extrabold text-white">Private Room</p>
              <p className="text-xs text-royal-100">Play with a friend</p>
            </div>
          </div>
        </div>

        <div className="px-6 py-5">
          <div className="mb-4 flex rounded-full bg-navy-600 p-1">
            <button
              onClick={() => { setMode('create'); setError(null); }}
              className={`flex-1 rounded-full py-2 text-sm font-bold transition-all ${
                mode === 'create' ? 'bg-blue-grad text-white shadow-glow-sm' : 'text-navy-200'
              }`}
            >
              Create
            </button>
            <button
              onClick={() => { setMode('join'); setError(null); }}
              className={`flex-1 rounded-full py-2 text-sm font-bold transition-all ${
                mode === 'join' ? 'bg-blue-grad text-white shadow-glow-sm' : 'text-navy-200'
              }`}
            >
              Join
            </button>
          </div>

          {mode === 'create' && !roomCode && (
            <button onClick={createRoom} disabled={loading} className="btn-primary w-full disabled:opacity-60">
              {loading ? <Loader2 size={18} className="animate-spin" /> : <DoorOpen size={18} />}
              Create Room
            </button>
          )}

          {mode === 'create' && roomCode && (
            <div className="space-y-4">
              <div className="rounded-2xl bg-navy-600 p-4 text-center">
                <p className="text-xs font-semibold uppercase tracking-wide text-navy-300">Room Code</p>
                <p className="mt-1 font-display text-3xl font-extrabold tracking-[0.3em] text-white">
                  {roomCode}
                </p>
              </div>
              <div className="flex gap-2">
                <button onClick={copyCode} className="btn-ghost flex-1">
                  {copied ? <Check size={16} className="text-emerald-600" /> : <Copy size={16} />}
                  Copy Code
                </button>
                <button onClick={copyLink} className="btn-ghost flex-1">
                  <LinkIcon size={16} />
                  Copy Link
                </button>
              </div>
              {guestJoined ? (
                <div className="flex items-center justify-center gap-2 rounded-xl bg-emerald-50 py-3 text-sm font-semibold text-emerald-700 animate-pop-in">
                  <Check size={18} />
                  Opponent joined! Starting game…
                </div>
              ) : (
                <div className="flex items-center justify-center gap-2 rounded-xl bg-royal-50 py-3 text-sm text-royal-700">
                  <span className="h-3 w-3 animate-pulse rounded-full bg-royal-500" />
                  Waiting for opponent to join…
                </div>
              )}
              <p className="text-center text-xs text-navy-400">
                Share the code or link with your friend to start playing
              </p>
            </div>
          )}

          {mode === 'join' && (
            <div className="space-y-3">
              <input
                type="text"
                value={joinCode}
                onChange={(e) => setJoinCode(e.target.value.toUpperCase())}
                placeholder="Enter 6-character code"
                maxLength={6}
                className="w-full rounded-xl border border-white/10 bg-navy-600 px-4 py-3 text-center font-display text-lg font-bold tracking-[0.3em] text-white outline-none transition-all placeholder:tracking-normal placeholder:font-normal placeholder:text-navy-400 focus:border-royal-400 focus:ring-2 focus:ring-royal-400/20"
              />
              <button onClick={joinRoom} disabled={loading || !joinCode.trim()} className="btn-primary w-full disabled:opacity-60">
                {loading ? <Loader2 size={18} className="animate-spin" /> : <DoorOpen size={18} />}
                Join Room
              </button>
            </div>
          )}

          {error && (
            <p className="mt-3 rounded-xl bg-red-500/10 px-3 py-2 text-sm text-red-400">{error}</p>
          )}
        </div>
      </div>
    </div>
  );
}
