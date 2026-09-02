import { useState, useEffect } from 'react';
import {
  DoorOpen, Copy, Check, Users, Loader2, X, Link as LinkIcon,
  Share2, MessageCircle, Mail, RefreshCw, Wifi, Clock,
} from 'lucide-react';
import { supabase } from '@/lib/supabase';
import { sound } from '@/game/sound';
import type { TimeControl } from '@/game/types';

interface Props {
  open: boolean;
  onClose: () => void;
  userId: string | null;
  username: string;
  onRoomJoined: (roomId: string, isHost: boolean, roomCode: string, timeControl: TimeControl) => void;
}

export function RoomPanel({ open, onClose, userId, username, onRoomJoined }: Props) {
  const [roomCode, setRoomCode] = useState<string | null>(null);
  const [roomId, setRoomId] = useState<string | null>(null);
  const [joinCode, setJoinCode] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [copied, setCopied] = useState<'code' | 'link' | null>(null);
  const [mode, setMode] = useState<'create' | 'join'>('create');
  const [waiting, setWaiting] = useState(false);
  const [guestJoined, setGuestJoined] = useState(false);
  const [roomTimeControl, setRoomTimeControl] = useState<TimeControl>('3min');

  useEffect(() => {
    if (!open) {
      setRoomCode(null);
      setRoomId(null);
      setJoinCode('');
      setError(null);
      setCopied(null);
      setWaiting(false);
      setGuestJoined(false);
    }
  }, [open]);

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
            sound.play('game-start');
            setTimeout(() => {
              if (roomCode) onRoomJoined(roomId, true, roomCode, roomTimeControl);
              onClose();
            }, 800);
          }
        },
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [roomId, waiting, onRoomJoined, onClose, roomCode, roomTimeControl]);

  useEffect(() => {
    return () => {
      if (roomId && waiting) {
        supabase.from('rooms').delete().eq('id', roomId).then(() => {});
      }
    };
  }, [roomId, waiting]);

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
      .insert({ host_id: userId, status: 'waiting', time_control: roomTimeControl })
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
      sound.play('select');
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
    sound.play('game-start');
    onRoomJoined(data.id, false, data.code, (data.time_control as TimeControl) || '3min');
    setLoading(false);
    onClose();
  };

  const copyToClipboard = (text: string, type: 'code' | 'link') => {
    navigator.clipboard?.writeText(text);
    setCopied(type);
    setTimeout(() => setCopied(null), 2000);
  };

  const shareLink = () => {
    if (!roomCode) return;
    const link = `${window.location.origin}?room=${roomCode}`;
    copyToClipboard(link, 'link');
  };

  const shareWhatsApp = () => {
    if (!roomCode) return;
    const link = `${window.location.origin}?room=${roomCode}`;
    const text = `Join me for a game of chess! Use code ${roomCode} or click: ${link}`;
    window.open(`https://wa.me/?text=${encodeURIComponent(text)}`, '_blank');
  };

  const shareEmail = () => {
    if (!roomCode) return;
    const link = `${window.location.origin}?room=${roomCode}`;
    const subject = 'Join my chess game!';
    const body = `Let's play chess! Use code ${roomCode} or click this link: ${link}`;
    window.open(`mailto:?subject=${encodeURIComponent(subject)}&body=${encodeURIComponent(body)}`, '_blank');
  };

  const shareNative = async () => {
    if (!roomCode) return;
    const link = `${window.location.origin}?room=${roomCode}`;
    const text = `Join me for a game of chess! Code: ${roomCode} — ${link}`;
    if (navigator.share) {
      try {
        await navigator.share({ title: 'Chess Game Invite', text, url: link });
      } catch {
        // user cancelled
      }
    } else {
      copyToClipboard(link, 'link');
    }
  };

  const handleClose = () => {
    if (roomId && waiting) {
      supabase.from('rooms').delete().eq('id', roomId).then(() => {});
    }
    onClose();
  };

  const TC_OPTIONS: { key: TimeControl; label: string }[] = [
    { key: '1min', label: '1 min' },
    { key: '3min', label: '3 min' },
    { key: '5min', label: '5 min' },
    { key: '10min', label: '10 min' },
    { key: '30min', label: '30 min' },
  ];

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
              <p className="text-xs text-royal-100">Play with a friend anywhere</p>
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
            <div className="space-y-4">
              <div>
                <p className="mb-2 text-xs font-semibold uppercase tracking-wide text-navy-400">Time Control</p>
                <div className="flex flex-wrap gap-1.5">
                  {TC_OPTIONS.map((tc) => (
                    <button
                      key={tc.key}
                      onClick={() => setRoomTimeControl(tc.key)}
                      className={`flex items-center gap-1.5 rounded-lg px-3 py-2 text-xs font-bold transition-all ${
                        roomTimeControl === tc.key
                          ? 'bg-blue-grad text-white shadow-glow-sm'
                          : 'bg-navy-600 text-white hover:bg-navy-500'
                      }`}
                    >
                      <Clock size={12} />
                      {tc.label}
                    </button>
                  ))}
                </div>
              </div>
              <button onClick={createRoom} disabled={loading} className="btn-primary w-full disabled:opacity-60">
                {loading ? <Loader2 size={18} className="animate-spin" /> : <DoorOpen size={18} />}
                Create Room
              </button>
            </div>
          )}

          {mode === 'create' && roomCode && (
            <div className="space-y-4">
              <div className="rounded-2xl bg-navy-600 p-4 text-center">
                <p className="text-xs font-semibold uppercase tracking-wide text-navy-300">Room Code</p>
                <p className="mt-1 font-display text-3xl font-extrabold tracking-[0.3em] text-white">
                  {roomCode}
                </p>
              </div>

              <div className="grid grid-cols-2 gap-2">
                <button onClick={() => copyToClipboard(roomCode, 'code')} className="btn-ghost flex-1 text-sm">
                  {copied === 'code' ? <Check size={16} className="text-emerald-600" /> : <Copy size={16} />}
                  Copy Code
                </button>
                <button onClick={shareLink} className="btn-ghost flex-1 text-sm">
                  {copied === 'link' ? <Check size={16} className="text-emerald-600" /> : <LinkIcon size={16} />}
                  Copy Link
                </button>
              </div>

              <div className="grid grid-cols-3 gap-2">
                <button onClick={shareWhatsApp} className="flex flex-col items-center gap-1.5 rounded-xl bg-emerald-600/20 py-3 text-emerald-400 transition-all hover:bg-emerald-600/30">
                  <MessageCircle size={20} />
                  <span className="text-[10px] font-semibold">WhatsApp</span>
                </button>
                <button onClick={shareEmail} className="flex flex-col items-center gap-1.5 rounded-xl bg-royal-500/20 py-3 text-royal-400 transition-all hover:bg-royal-500/30">
                  <Mail size={20} />
                  <span className="text-[10px] font-semibold">Email</span>
                </button>
                <button onClick={shareNative} className="flex flex-col items-center gap-1.5 rounded-xl bg-navy-600 py-3 text-white transition-all hover:bg-navy-500">
                  <Share2 size={20} />
                  <span className="text-[10px] font-semibold">Share</span>
                </button>
              </div>

              {guestJoined ? (
                <div className="flex items-center justify-center gap-2 rounded-xl bg-emerald-50 py-3 text-sm font-semibold text-emerald-700 animate-pop-in">
                  <Check size={18} />
                  Opponent joined! Starting game…
                </div>
              ) : (
                <div className="flex flex-col items-center gap-2 rounded-xl bg-navy-600 py-4">
                  <div className="flex items-center gap-2 text-sm text-navy-200">
                    <span className="relative flex h-3 w-3">
                      <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-royal-400 opacity-75" />
                      <span className="relative inline-flex h-3 w-3 rounded-full bg-royal-500" />
                    </span>
                    Waiting for opponent to join…
                  </div>
                  <p className="text-xs text-navy-400">
                    Share the code or link with your friend
                  </p>
                </div>
              )}
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
                onKeyDown={(e) => { if (e.key === 'Enter') joinRoom(); }}
                className="w-full rounded-xl border border-white/10 bg-navy-600 px-4 py-3 text-center font-display text-lg font-bold tracking-[0.3em] text-white outline-none transition-all placeholder:tracking-normal placeholder:font-normal placeholder:text-navy-400 focus:border-royal-400 focus:ring-2 focus:ring-royal-400/20"
              />
              <button onClick={joinRoom} disabled={loading || !joinCode.trim()} className="btn-primary w-full disabled:opacity-60">
                {loading ? <Loader2 size={18} className="animate-spin" /> : <Wifi size={18} />}
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
