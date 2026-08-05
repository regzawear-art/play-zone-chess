import { useState, useEffect, useRef } from 'react';
import { Send, Smile, MessageSquare, X, Mic, MicOff, Play, Square } from 'lucide-react';
import { supabase } from '@/lib/supabase';

interface ChatMessage {
  id: string;
  username: string;
  avatar_url: string;
  text: string;
  message_type: string;
  created_at: string;
}

interface Props {
  roomId: string | null;
  currentUser: { id: string; username: string; avatar: string } | null;
  onClose?: () => void;
  compact?: boolean;
}

const EMOJIS = ['👍', '🔥', '😊', '😮', '🎉', '💪', '🤔', '👋', '❤️', '😅'];

export function GameChat({ roomId, currentUser, onClose, compact }: Props) {
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [input, setInput] = useState('');
  const [showEmojis, setShowEmojis] = useState(false);
  const [open, setOpen] = useState(compact ?? false);
  const [recording, setRecording] = useState(false);
  const [recordSeconds, setRecordSeconds] = useState(0);
  const [playingId, setPlayingId] = useState<string | null>(null);
  const scrollRef = useRef<HTMLDivElement>(null);
  const mediaRecorderRef = useRef<MediaRecorder | null>(null);
  const audioChunksRef = useRef<Blob[]>([]);
  const recordTimerRef = useRef<number | null>(null);
  const audioPlayersRef = useRef<Map<string, HTMLAudioElement>>(new Map());

  useEffect(() => {
    if (!roomId) return;
    const channel = supabase
      .channel(`chat-${roomId}`)
      .on(
        'postgres_changes',
        { event: 'INSERT', schema: 'public', table: 'chat_messages', filter: `room_id=eq.${roomId}` },
        (payload) => {
          setMessages((prev) => [...prev, payload.new as ChatMessage]);
        },
      )
      .subscribe();

    supabase
      .from('chat_messages')
      .select('*')
      .eq('room_id', roomId)
      .order('created_at', { ascending: true })
      .then(({ data }) => {
        if (data) setMessages(data as ChatMessage[]);
      });

    return () => {
      supabase.removeChannel(channel);
    };
  }, [roomId]);

  useEffect(() => {
    if (scrollRef.current) {
      scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
    }
  }, [messages]);

  const send = async (text: string, type: string = 'text') => {
    if (!roomId || !currentUser || !text.trim()) return;
    await supabase.from('chat_messages').insert({
      room_id: roomId,
      user_id: currentUser.id,
      username: currentUser.username,
      avatar_url: currentUser.avatar,
      text: text.trim(),
      message_type: type,
    });
    setInput('');
    setShowEmojis(false);
  };

  const startRecording = async () => {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      const recorder = new MediaRecorder(stream);
      audioChunksRef.current = [];
      recorder.ondataavailable = (e) => {
        if (e.data.size > 0) audioChunksRef.current.push(e.data);
      };
      recorder.onstop = async () => {
        const blob = new Blob(audioChunksRef.current, { type: 'audio/webm' });
        const reader = new FileReader();
        reader.onload = async () => {
          const base64 = reader.result as string;
          const durationLabel = `${recordSeconds}s`;
          await send(`voice:${durationLabel}|${base64}`, 'voice');
        };
        reader.readAsDataURL(blob);
        stream.getTracks().forEach((t) => t.stop());
      };
      recorder.start();
      mediaRecorderRef.current = recorder;
      setRecording(true);
      setRecordSeconds(0);
      recordTimerRef.current = window.setInterval(() => {
        setRecordSeconds((s) => s + 1);
      }, 1000);
    } catch {
      alert('Microphone access denied or not available.');
    }
  };

  const stopRecording = () => {
    if (mediaRecorderRef.current && mediaRecorderRef.current.state === 'recording') {
      mediaRecorderRef.current.stop();
    }
    setRecording(false);
    if (recordTimerRef.current) {
      window.clearInterval(recordTimerRef.current);
      recordTimerRef.current = null;
    }
  };

  const playVoice = (id: string, dataUrl: string) => {
    let audio = audioPlayersRef.current.get(id);
    if (!audio) {
      audio = new Audio(dataUrl);
      audio.onended = () => setPlayingId(null);
      audioPlayersRef.current.set(id, audio);
    }
    if (playingId === id) {
      audio.pause();
      audio.currentTime = 0;
      setPlayingId(null);
    } else {
      if (playingId && audioPlayersRef.current.get(playingId)) {
        audioPlayersRef.current.get(playingId)!.pause();
      }
      audio.play();
      setPlayingId(id);
    }
  };

  if (!open) {
    return (
      <button
        onClick={() => setOpen(true)}
        className="flex items-center gap-2 rounded-full glass-dark px-4 py-2.5 text-sm font-semibold text-white shadow-card transition-all hover:shadow-glow-sm"
      >
        <MessageSquare size={16} className="text-royal-400" />
        Chat
        {messages.length > 0 && (
          <span className="rounded-full bg-royal-500 px-1.5 py-0.5 text-[10px] font-bold text-white">
            {messages.length}
          </span>
        )}
      </button>
    );
  }

  return (
    <div className={`flex flex-col rounded-2xl glass-dark shadow-card ${compact ? 'h-64' : 'h-80'}`}>
      <div className="flex items-center justify-between border-b border-white/10 px-4 py-2.5">
        <div className="flex items-center gap-2">
          <MessageSquare size={15} className="text-royal-400" />
          <span className="text-sm font-bold text-white">Game Chat</span>
        </div>
        {onClose ? (
          <button onClick={onClose} className="text-navy-400 hover:text-white">
            <X size={16} />
          </button>
        ) : (
          <button onClick={() => setOpen(false)} className="text-navy-400 hover:text-white">
            <X size={16} />
          </button>
        )}
      </div>

      <div ref={scrollRef} className="no-scrollbar flex-1 space-y-2 overflow-y-auto p-3">
        {messages.length === 0 ? (
          <p className="py-6 text-center text-xs text-navy-400">No messages yet. Say hello!</p>
        ) : (
          messages.map((m) => {
            const isVoice = m.message_type === 'voice';
            const voiceData = isVoice ? m.text.split('|') : null;
            const voiceLabel = voiceData ? voiceData[0].replace('voice:', '') : '';
            const voiceUrl = voiceData && voiceData.length > 1 ? voiceData[1] : '';

            return (
              <div key={m.id} className="flex items-start gap-2">
                <div className="h-7 w-7 shrink-0 overflow-hidden rounded-full ring-1 ring-white/10">
                  {m.avatar_url ? (
                    <img src={m.avatar_url} alt={m.username} className="h-full w-full object-cover" />
                  ) : (
                    <div className="grid h-full w-full place-items-center bg-blue-grad text-[10px] font-bold text-white">
                      {m.username.charAt(0).toUpperCase()}
                    </div>
                  )}
                </div>
                <div className="min-w-0 flex-1">
                  <span className="text-[10px] font-semibold text-navy-400">{m.username}</span>
                  {m.message_type === 'emoji' ? (
                    <p className="text-lg leading-tight">{m.text}</p>
                  ) : isVoice ? (
                    <button
                      onClick={() => playVoice(m.id, voiceUrl)}
                      className="flex items-center gap-2 rounded-lg bg-blue-grad px-3 py-2 text-sm text-white shadow-glow-sm transition-all hover:translate-y-[-1px]"
                    >
                      {playingId === m.id ? (
                        <Square size={14} className="fill-current" />
                      ) : (
                        <Play size={14} className="fill-current" />
                      )}
                      <span className="font-semibold">Voice ({voiceLabel})</span>
                    </button>
                  ) : (
                    <p className="rounded-lg bg-navy-600 px-2.5 py-1.5 text-sm text-white">
                      {m.text}
                    </p>
                  )}
                </div>
              </div>
            );
          })
        )}
      </div>

      {showEmojis && (
        <div className="flex flex-wrap gap-1 border-t border-white/10 px-3 py-2">
          {EMOJIS.map((e) => (
            <button
              key={e}
              onClick={() => send(e, 'emoji')}
              className="rounded-lg p-1.5 text-lg transition-transform hover:scale-125"
            >
              {e}
            </button>
          ))}
        </div>
      )}

      {recording && (
        <div className="flex items-center gap-2 border-t border-white/10 px-3 py-2 animate-fade-in">
          <span className="h-3 w-3 animate-pulse rounded-full bg-red-500" />
          <span className="text-sm font-semibold text-red-400">Recording… {recordSeconds}s</span>
          <button onClick={stopRecording} className="ml-auto rounded-full bg-red-500 px-3 py-1 text-xs font-bold text-white">
            Stop
          </button>
        </div>
      )}

      <div className="flex items-center gap-1.5 border-t border-white/10 p-2.5">
        <button
          onClick={() => setShowEmojis((s) => !s)}
          className="grid h-8 w-8 shrink-0 place-items-center rounded-full text-navy-300 transition-colors hover:bg-navy-600"
        >
          <Smile size={18} />
        </button>
        <button
          onClick={recording ? stopRecording : startRecording}
          className={`grid h-8 w-8 shrink-0 place-items-center rounded-full transition-all ${
            recording
              ? 'bg-red-500 text-white animate-pulse'
              : 'text-navy-300 hover:bg-navy-600'
          }`}
          title={recording ? 'Stop recording' : 'Record voice message'}
        >
          {recording ? <MicOff size={18} /> : <Mic size={18} />}
        </button>
        <input
          type="text"
          value={input}
          onChange={(e) => setInput(e.target.value)}
          onKeyDown={(e) => { if (e.key === 'Enter') send(input); }}
          placeholder="Type a message…"
          disabled={recording}
          className="min-w-0 flex-1 rounded-full border border-white/10 bg-navy-600 px-3 py-1.5 text-sm text-white outline-none transition-all placeholder:text-navy-400 focus:border-royal-400 focus:ring-2 focus:ring-royal-400/20 disabled:opacity-50"
        />
        <button
          onClick={() => send(input)}
          disabled={!input.trim() || recording}
          className="grid h-8 w-8 shrink-0 place-items-center rounded-full bg-blue-grad text-white shadow-glow-sm transition-all hover:translate-y-[-1px] disabled:opacity-40"
        >
          <Send size={15} />
        </button>
      </div>
    </div>
  );
}
