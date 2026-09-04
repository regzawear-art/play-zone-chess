import { Globe, Bot, GraduationCap, Trophy, ChevronRight, Users, DoorOpen, Zap } from 'lucide-react';
import type { GameMode, AIDifficulty } from '../game/types';

interface Props {
  onPlayOnline: () => void;
  onPlayBots: () => void;
  onPlayCoach: () => void;
  onTournaments: () => void;
  mode: GameMode;
  aiDifficulty: AIDifficulty;
  onChangeMode: (m: GameMode) => void;
  onChangeDifficulty: (d: AIDifficulty) => void;
}

const PRIMARY_CARDS = [
  { id: 'online', label: 'Play Online', sub: 'Match with a human', icon: Globe, accent: 'from-emerald-500 to-emerald-600' },
  { id: 'bots', label: 'Play Bots', sub: 'Challenge the AI', icon: Bot, accent: 'from-royal-500 to-royal-600' },
  { id: 'coach', label: 'Play Coach', sub: 'Learn & improve', icon: GraduationCap, accent: 'from-amber-500 to-orange-500' },
  { id: 'tournaments', label: 'Tournaments', sub: 'Compete for prizes', icon: Trophy, accent: 'from-sky-500 to-blue-600' },
] as const;

const SECONDARY_MODES = [
  { key: 'pass' as GameMode, label: 'Pass & Play', icon: Users },
  { key: 'room' as GameMode, label: 'Private Room', icon: DoorOpen },
];

const DIFFICULTIES: { key: AIDifficulty; label: string }[] = [
  { key: 'beginner', label: 'Beginner' },
  { key: 'intermediate', label: 'Intermediate' },
  { key: 'advanced', label: 'Advanced' },
  { key: 'master', label: 'Master' },
];

export function PlayActionCards({
  onPlayOnline, onPlayBots, onPlayCoach, onTournaments,
  mode, aiDifficulty, onChangeMode, onChangeDifficulty,
}: Props) {
  const handlers: Record<string, () => void> = {
    online: onPlayOnline,
    bots: onPlayBots,
    coach: onPlayCoach,
    tournaments: onTournaments,
  };

  return (
    <div className="flex flex-col gap-2">
      {/* Primary action cards — 2x2 grid for clean proportional layout */}
      <div className="grid grid-cols-2 gap-2">
        {PRIMARY_CARDS.map((card) => {
          const Icon = card.icon;
          return (
            <button
              key={card.id}
              onClick={handlers[card.id]}
              className="group flex flex-col items-start gap-1.5 rounded-xl border border-white/8 bg-navy-750 p-3 text-left transition-all duration-200 hover:border-white/15 hover:bg-navy-700"
            >
              <span className={`grid h-9 w-9 shrink-0 place-items-center rounded-lg bg-gradient-to-br ${card.accent} transition-transform group-hover:scale-105`}>
                <Icon size={18} className="text-white" />
              </span>
              <div className="min-w-0">
                <p className="text-[13px] font-bold text-white leading-tight">{card.label}</p>
                <p className="truncate text-[10px] text-navy-400">{card.sub}</p>
              </div>
            </button>
          );
        })}
      </div>

      {/* Secondary mode buttons */}
      <div className="grid grid-cols-2 gap-2">
        {SECONDARY_MODES.map((m) => {
          const Icon = m.icon;
          const isActive = mode === m.key;
          return (
            <button
              key={m.key}
              onClick={() => onChangeMode(m.key)}
              className={`flex items-center justify-center gap-1.5 rounded-lg px-2 py-2 text-xs font-bold transition-all ${
                isActive
                  ? 'bg-royal-500/15 text-royal-400 ring-1 ring-royal-500/30'
                  : 'bg-navy-750 text-navy-300 hover:bg-navy-700 hover:text-white'
              }`}
            >
              <Icon size={14} />
              {m.label}
            </button>
          );
        })}
      </div>

      {/* AI difficulty selector (compact, only when AI mode) */}
      {mode === 'ai' && (
        <div className="rounded-xl border border-white/8 bg-navy-750 p-2.5">
          <div className="mb-1.5 flex items-center gap-1.5">
            <Zap size={12} className="text-royal-400" />
            <span className="text-[10px] font-bold uppercase tracking-wide text-navy-400">Bot Level</span>
          </div>
          <div className="grid grid-cols-2 gap-1.5">
            {DIFFICULTIES.map((d) => {
              const isActive = aiDifficulty === d.key;
              return (
                <button
                  key={d.key}
                  onClick={() => onChangeDifficulty(d.key)}
                  className={`rounded-lg px-2 py-1.5 text-xs font-bold transition-all ${
                    isActive
                      ? 'bg-blue-grad text-white shadow-glow-sm'
                      : 'bg-navy-600 text-navy-200 hover:bg-navy-500 hover:text-white'
                  }`}
                >
                  {d.label}
                </button>
              );
            })}
          </div>
        </div>
      )}
    </div>
  );
}
