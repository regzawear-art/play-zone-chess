import { Bot, Users, Wifi, DoorOpen } from 'lucide-react';
import type { GameMode, AIDifficulty } from '../game/types';

interface Props {
  mode: GameMode;
  aiDifficulty: AIDifficulty;
  onChangeMode: (m: GameMode) => void;
  onChangeDifficulty: (d: AIDifficulty) => void;
}

const MODES: { key: GameMode; label: string; icon: typeof Bot; desc: string }[] = [
  { key: 'ai', label: 'vs AI', icon: Bot, desc: 'Play against computer' },
  { key: 'pass', label: 'Pass & Play', icon: Users, desc: 'Local 2-player' },
  { key: 'online', label: 'Quick Match', icon: Wifi, desc: 'Match with players' },
  { key: 'room', label: 'Private Room', icon: DoorOpen, desc: 'Invite a friend' },
];

const DIFFICULTIES: { key: AIDifficulty; label: string; desc: string }[] = [
  { key: 'beginner', label: 'Beginner', desc: 'Casual play' },
  { key: 'intermediate', label: 'Intermediate', desc: 'Knows the basics' },
  { key: 'advanced', label: 'Advanced', desc: 'Strong opponent' },
  { key: 'master', label: 'Master', desc: 'Top level play' },
];

export function GameModeSelector({ mode, aiDifficulty, onChangeMode, onChangeDifficulty }: Props) {
  return (
    <div className="rounded-2xl glass-dark p-4 shadow-card sm:p-5">
      <p className="mb-3 text-xs font-semibold uppercase tracking-wide text-navy-400">Game Mode</p>
      <div className="grid grid-cols-2 gap-2 sm:grid-cols-4">
        {MODES.map((m) => {
          const Icon = m.icon;
          const isActive = mode === m.key;
          return (
            <button
              key={m.key}
              onClick={() => onChangeMode(m.key)}
              className={`flex flex-col items-center gap-1.5 rounded-xl p-3 text-center transition-all ${
                isActive
                  ? 'bg-blue-grad text-white shadow-glow-sm'
                  : 'bg-navy-600 text-white hover:bg-navy-500'
              }`}
            >
              <Icon size={20} className={isActive ? 'text-white' : 'text-royal-400'} />
              <span className="text-xs font-bold">{m.label}</span>
              <span className={`text-[10px] leading-tight ${isActive ? 'text-royal-100' : 'text-navy-300'}`}>
                {m.desc}
              </span>
            </button>
          );
        })}
      </div>

      {mode === 'ai' && (
        <div className="mt-4 animate-fade-in">
          <p className="mb-2 text-xs font-semibold uppercase tracking-wide text-navy-400">AI Difficulty</p>
          <div className="grid grid-cols-2 gap-2 sm:grid-cols-4">
            {DIFFICULTIES.map((d) => {
              const isActive = aiDifficulty === d.key;
              return (
                <button
                  key={d.key}
                  onClick={() => onChangeDifficulty(d.key)}
                  className={`flex flex-col items-center gap-0.5 rounded-xl p-2.5 text-center transition-all ${
                    isActive
                      ? 'bg-blue-grad text-white shadow-glow-sm'
                      : 'bg-navy-600 text-white hover:bg-navy-500'
                  }`}
                >
                  <span className="text-sm font-bold">{d.label}</span>
                  <span className={`text-[10px] leading-tight ${isActive ? 'text-royal-100' : 'text-navy-300'}`}>
                    {d.desc}
                  </span>
                </button>
              );
            })}
          </div>
        </div>
      )}
    </div>
  );
}
