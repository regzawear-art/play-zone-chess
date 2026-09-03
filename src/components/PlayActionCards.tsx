import { Globe, Bot, GraduationCap, Trophy, ChevronRight } from 'lucide-react';

interface Props {
  onPlayOnline: () => void;
  onPlayBots: () => void;
  onPlayCoach: () => void;
  onTournaments: () => void;
}

const CARDS = [
  { id: 'online', label: 'Play Online', sub: 'Match with a human', icon: Globe, accent: 'from-emerald-500 to-emerald-600' },
  { id: 'bots', label: 'Play Bots', sub: 'Challenge the AI', icon: Bot, accent: 'from-royal-500 to-royal-600' },
  { id: 'coach', label: 'Play Coach', sub: 'Learn & improve', icon: GraduationCap, accent: 'from-amber-500 to-orange-500' },
  { id: 'tournaments', label: 'Tournaments', sub: 'Compete for prizes', icon: Trophy, accent: 'from-sky-500 to-blue-600' },
] as const;

export function PlayActionCards({ onPlayOnline, onPlayBots, onPlayCoach, onTournaments }: Props) {
  const handlers: Record<string, () => void> = {
    online: onPlayOnline,
    bots: onPlayBots,
    coach: onPlayCoach,
    tournaments: onTournaments,
  };

  return (
    <div className="flex w-full flex-col gap-2.5">
      {CARDS.map((card) => {
        const Icon = card.icon;
        return (
          <button
            key={card.id}
            onClick={handlers[card.id]}
            className="group flex items-center gap-3 rounded-xl border border-white/10 bg-navy-700/80 p-3 text-left shadow-card backdrop-blur-xl transition-all duration-300 hover:-translate-y-0.5 hover:border-white/20 hover:shadow-card-lg"
          >
            <span className={`grid h-10 w-10 shrink-0 place-items-center rounded-xl bg-gradient-to-br ${card.accent} shadow-glow-sm`}>
              <Icon size={20} className="text-white" />
            </span>
            <div className="min-w-0 flex-1">
              <p className="font-display text-sm font-bold text-white">{card.label}</p>
              <p className="truncate text-xs text-navy-300">{card.sub}</p>
            </div>
            <ChevronRight size={18} className="shrink-0 text-navy-400 transition-transform group-hover:translate-x-1 group-hover:text-white" />
          </button>
        );
      })}
    </div>
  );
}
