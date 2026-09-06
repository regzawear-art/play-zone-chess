
import { useEffect, useRef, useState } from 'react';
import { Volume1, Volume2, VolumeX } from 'lucide-react';
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
      if (wrapRef.current && !wrapRef.current.contains(e.target as Node)) {
        setOpen(false);
      }
    }

    document.addEventListener('mousedown', onDocClick);
    return () => document.removeEventListener('mousedown', onDocClick);
  }, []);

  const toggleMute = () => {
    sound.unlock();

    const next = !muted;
    sound.setMuted(next);
    setMuted(next);

    if (!next) {
      sound.play('select');
    }
  };

  const onVolume = (v: number) => {
    sound.unlock();
    sound.setVolume(v);
    setVolume(v);

    if (v > 0 && muted) {
      sound.setMuted(false);
      setMuted(false);
    }

    if (v === 0 && !muted) {
      sound.setMuted(true);
      setMuted(true);
    }
  };

  const displayVolume = muted ? 0 : volume;

  const VolumeIcon =
    muted || volume === 0
      ? VolumeX
      : volume < 0.5
        ? Volume1
        : Volume2;

  return (
    <div ref={wrapRef} className={`relative ${ className ?? '' } `}>
      {/* Single sound button */}
      <button
        type="button"
        onClick={() => setOpen((o) => !o)}
        aria-label={muted ? 'Sound muted. Open sound controls' : 'Open sound controls'}
        aria-expanded={open}
        className={`grid h - 10 w - 10 place - items - center rounded - full border bg - navy - 700 text - white transition - all ${
    open
        ? 'border-royal-500/60 shadow-glow-sm'
        : 'border-royal-500/25 hover:border-royal-500/60 hover:shadow-glow-sm'
} `}
      >
        <VolumeIcon size={18} />
      </button>

      {/* Sound popup */}
      {open && (
        <div className="absolute right-0 top-12 z-50 w-52 rounded-2xl border border-white/10 bg-navy-700 p-4 shadow-card-lg backdrop-blur-xl animate-pop-in">
          <div className="mb-3 flex items-center justify-between">
            <span className="text-xs font-semibold uppercase tracking-wide text-navy-400">
              Sound
            </span>

            <span className="text-xs font-bold text-royal-400 tabular-nums">
              {Math.round(displayVolume * 100)}%
            </span>
          </div>

          {/* Volume slider */}
          <div className="flex items-center gap-2">
            <VolumeX size={14} className="shrink-0 text-navy-400" />

            <input
              type="range"
              min={0}
              max={1}
              step={0.01}
              value={displayVolume}
              onChange={(e) => onVolume(parseFloat(e.target.value))}
              className="sound-slider w-full"
              aria-label="Volume"
            />

            <Volume2 size={14} className="shrink-0 text-navy-300" />
          </div>

          {/* Controls */}
          <div className="mt-4 grid grid-cols-2 gap-2">
            <button
              type="button"
              onClick={toggleMute}
              className={`rounded - lg py - 2 text - xs font - semibold transition - colors ${
    muted
        ? 'bg-red-500/15 text-red-300 hover:bg-red-500/25'
        : 'bg-navy-600 text-white hover:bg-navy-500'
} `}
            >
              {muted ? 'Unmute' : 'Mute'}
            </button>

            <button
              type="button"
              onClick={() => onVolume(0.7)}
              className="rounded-lg bg-navy-600 py-2 text-xs font-semibold text-white transition-colors hover:bg-navy-500"
            >
              Normal
            </button>
          </div>
        </div>
      )}

      <style>{`
    .sound - slider {
    -webkit - appearance: none;
    appearance: none;
    height: 6px;
    border - radius: 999px;
    background: linear - gradient(
        90deg,
            #81B64C 0 %,
            #6ba238 100 %
          );
    outline: none;
    cursor: pointer;
}

        .sound - slider:: -webkit - slider - thumb {
    -webkit - appearance: none;
    appearance: none;
    width: 16px;
    height: 16px;
    border - radius: 50 %;
    background: #fff;
    border: 2px solid #81B64C;
    box - shadow: 0 2px 6px rgba(129, 182, 76, 0.4);
    cursor: pointer;
}

        .sound - slider:: -moz - range - thumb {
    width: 16px;
    height: 16px;
    border - radius: 50 %;
    background: #fff;
    border: 2px solid #81B64C;
    box - shadow: 0 2px 6px rgba(129, 182, 76, 0.4);
    cursor: pointer;
}
`}</style>
    </div>
  );
}

