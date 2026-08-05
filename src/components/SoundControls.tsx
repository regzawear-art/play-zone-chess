import { useEffect, useRef, useState } from 'react';
import { Volume2, VolumeX } from 'lucide-react';
import { sound } from '../game/sound';

interface Props {
  className?: string;
}

export function SoundControls({ className }: Props) {
  const [muted, setMuted] = useState(sound.muted);
  const [volume, setVolume] = useState(sound.volume);
  const [open, setOpen] = useState(false);
  const wrapRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    function onDocClick(e: MouseEvent) {
      if (wrapRef.current && !wrapRef.current.contains(e.target as Node)) setOpen(false);
    }
    document.addEventListener('mousedown', onDocClick);
    return () => document.removeEventListener('mousedown', onDocClick);
  }, []);

  const toggleMute = () => {
    sound.unlock();
    const next = !muted;
    sound.setMuted(next);
    setMuted(next);
    if (!next) sound.play('select');
  };

  const onVolume = (v: number) => {
    sound.unlock();
    sound.setVolume(v);
    setVolume(v);
    if (v > 0 && muted) {
      sound.setMuted(false);
      setMuted(false);
    }
  };

  return (
    <div ref={wrapRef} className={`relative ${className ?? ''}`}>
      <button
        type="button"
        onClick={toggleMute}
        aria-label={muted ? 'Unmute' : 'Mute'}
        className="grid h-10 w-10 place-items-center rounded-full border border-royal-500/25 bg-navy-700 text-white transition-all hover:border-royal-500/60 hover:shadow-glow-sm"
      >
        {muted ? <VolumeX size={18} /> : <Volume2 size={18} />}
      </button>
      <button
        type="button"
        onClick={() => setOpen((o) => !o)}
        aria-label="Volume slider"
        className="ml-1 hidden h-10 w-8 place-items-center rounded-full border border-royal-500/25 bg-navy-700 text-white transition-all hover:border-royal-500/60 sm:grid"
      >
        <svg width="10" height="10" viewBox="0 0 10 10" fill="none">
          <path d="M2 3.5L5 6.5L8 3.5" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round" />
        </svg>
      </button>
      {open && (
        <div className="absolute right-0 top-12 z-50 w-44 rounded-2xl border border-white/10 bg-navy-700 p-4 shadow-card-lg backdrop-blur-xl animate-pop-in">
          <div className="mb-2 flex items-center justify-between">
            <span className="text-xs font-semibold uppercase tracking-wide text-navy-400">Volume</span>
            <span className="text-xs font-bold text-royal-400">{Math.round(volume * 100)}%</span>
          </div>
          <input
            type="range"
            min={0}
            max={1}
            step={0.01}
            value={muted ? 0 : volume}
            onChange={(e) => onVolume(parseFloat(e.target.value))}
            className="slider-green w-full"
            aria-label="Volume"
          />
          <div className="mt-3 flex items-center gap-2">
            <button
              onClick={() => onVolume(0)}
              className="flex-1 rounded-lg bg-navy-600 py-1.5 text-xs font-semibold text-white hover:bg-navy-500"
            >
              Mute
            </button>
            <button
              onClick={() => onVolume(0.7)}
              className="flex-1 rounded-lg bg-navy-600 py-1.5 text-xs font-semibold text-white hover:bg-navy-500"
            >
              Normal
            </button>
          </div>
        </div>
      )}
      <style>{`
        .slider-green {
          -webkit-appearance: none;
          appearance: none;
          height: 6px;
          border-radius: 999px;
          background: linear-gradient(90deg, #81B64C, #6ba238);
          outline: none;
        }
        .slider-green::-webkit-slider-thumb {
          -webkit-appearance: none;
          appearance: none;
          width: 16px;
          height: 16px;
          border-radius: 50%;
          background: #fff;
          border: 2px solid #81B64C;
          box-shadow: 0 2px 6px rgba(129,182,76,0.4);
          cursor: pointer;
        }
        .slider-green::-moz-range-thumb {
          width: 16px;
          height: 16px;
          border-radius: 50%;
          background: #fff;
          border: 2px solid #81B64C;
          box-shadow: 0 2px 6px rgba(129,182,76,0.4);
          cursor: pointer;
        }
      `}</style>
    </div>
  );
}
