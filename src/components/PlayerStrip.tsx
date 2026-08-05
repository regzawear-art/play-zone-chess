import type { Player } from '../data/players';

interface Props {
  player: Player;
  label: string;
  active: boolean;
  align: 'top' | 'bottom';
  showOnline?: boolean;
}

export function PlayerStrip({ player, label, active, showOnline }: Props) {
  const online = player.online;
  return (
    <div
      className={`flex items-center gap-3 rounded-2xl p-3 shadow-card transition-all duration-300 sm:p-3.5 ${
        active ? 'glass-dark shadow-glow-sm ring-1 ring-royal-500/40' : 'glass-dark'
      }`}
    >
      <div className="relative shrink-0">
        <div
          className={`h-11 w-11 overflow-hidden rounded-full ring-2 transition-all sm:h-12 sm:w-12 ${
            active ? 'ring-royal-400 shadow-glow-sm' : 'ring-white/10'
          }`}
        >
          <img
            src={player.avatar}
            alt={player.name}
            loading="lazy"
            className="h-full w-full object-cover"
          />
        </div>
        {showOnline !== false && (
          <span
            className={`absolute -bottom-0.5 -right-0.5 h-3.5 w-3.5 rounded-full ring-2 ring-navy-700 ${
              online ? 'bg-emerald-500' : 'bg-navy-500'
            }`}
            title={online ? 'Online' : 'Offline'}
          />
        )}
        {active && (
          <span className="absolute -right-0.5 -top-0.5 flex h-3 w-3">
            <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-royal-400 opacity-75" />
            <span className="relative inline-flex h-3 w-3 rounded-full bg-royal-500 ring-2 ring-navy-700" />
          </span>
        )}
      </div>

      <div className="min-w-0 flex-1">
        <div className="flex items-center gap-1.5">
          {player.title && (
            <span className="rounded bg-blue-grad px-1.5 py-0.5 text-[10px] font-bold text-white shadow-glow-sm">
              {player.title}
            </span>
          )}
          <span className="truncate text-sm font-bold text-white sm:text-base">{player.name}</span>
          <span className="shrink-0 text-base sm:text-lg" title={player.country}>
            {player.flag}
          </span>
          {showOnline !== false && (
            <span className={`hidden shrink-0 text-[10px] font-semibold uppercase tracking-wide sm:inline ${online ? 'text-emerald-400' : 'text-navy-400'}`}>
              {online ? 'Online' : 'Offline'}
            </span>
          )}
        </div>
        <div className="mt-0.5 flex items-center gap-2 text-xs text-navy-400">
          <span className="font-semibold text-royal-400">{player.rating}</span>
          <span className="text-navy-500">·</span>
          <span>{label}</span>
        </div>
      </div>
    </div>
  );
}
