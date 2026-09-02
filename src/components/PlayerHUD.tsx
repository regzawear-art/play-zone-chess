import type { PieceType } from '../game/types';
import { GLYPH } from '../game/pieces';
import { formatClock } from '../lib/format';
import { Clock, Wifi } from 'lucide-react';

export interface HUDPlayer {
  name: string;
  avatar: string;
  flag: string;
  rating: number;
  title?: string;
  online?: boolean;
  capturedPieces: PieceType[];
  materialDiff: number;
}

interface Props {
  player: HUDPlayer;
  ms: number;
  active: boolean;
  running: boolean;
  align: 'top' | 'bottom';
}

const PIECE_ORDER: Record<string, number> = { p: 0, n: 1, b: 2, r: 3, q: 4, k: 5 };

export function PlayerHUD({ player, ms, active, running, align }: Props) {
  const sortedPieces = [...player.capturedPieces].sort((a, b) => (PIECE_ORDER[a] ?? 9) - (PIECE_ORDER[b] ?? 9));
  const lowTime = ms <= 10_000;
  const online = player.online === true;

  return (
    <div
      className={`flex items-center gap-2 rounded-xl px-2.5 py-2 transition-all duration-300 sm:gap-3 sm:px-4 sm:py-3 ${
        active
          ? 'glass-dark shadow-glow-sm ring-1 ring-royal-500/40'
          : 'glass-dark'
      }`}
    >
      {/* Avatar */}
      <div className="relative shrink-0">
        <div
          className={`h-9 w-9 overflow-hidden rounded-full ring-2 transition-all sm:h-11 sm:w-11 ${
            active ? 'ring-royal-400 shadow-glow-sm' : 'ring-white/10'
          }`}
        >
          <img src={player.avatar} alt={player.name} loading="lazy" className="h-full w-full object-cover" />
        </div>
        {online && (
          <span className="absolute -bottom-0.5 -right-0.5 h-2.5 w-2.5 rounded-full bg-emerald-500 ring-2 ring-navy-800 sm:h-3 sm:w-3" title="Online" />
        )}
        {active && (
          <span className="absolute -right-0.5 -top-0.5 flex h-3 w-3">
            <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-royal-400 opacity-75" />
            <span className="relative inline-flex h-3 w-3 rounded-full bg-royal-500 ring-2 ring-navy-800" />
          </span>
        )}
      </div>

      {/* Name + rating + flag */}
      <div className="min-w-0 flex-1">
        <div className="flex items-center gap-1.5">
          {player.title && (
            <span className="rounded bg-blue-grad px-1.5 py-0.5 text-[10px] font-bold text-white shadow-glow-sm">
              {player.title}
            </span>
          )}
          <span className="truncate text-xs font-bold text-white sm:text-sm">{player.name}</span>
          <span className="shrink-0 text-xs sm:text-base">{player.flag}</span>
        </div>
        <div className="mt-0.5 flex items-center gap-1.5">
          <span className="text-[11px] font-semibold text-royal-400 sm:text-xs">{player.rating}</span>
          {/* Captured pieces - visible on all screens */}
          <span className="text-navy-400 text-[10px]">·</span>
          <div className="flex items-center leading-none">
            {sortedPieces.slice(0, 6).map((p, i) => (
              <span
                key={i}
                className="text-navy-200 text-xs sm:text-sm"
                style={{ marginLeft: i > 0 ? '-3px' : '0', opacity: 0.8 }}
              >
                {GLYPH[p]}
              </span>
            ))}
            {player.materialDiff > 0 && (
              <span className="ml-1 rounded bg-royal-500/20 px-1 py-0 text-[9px] font-bold text-royal-300 sm:text-[11px]">
                +{player.materialDiff}
              </span>
            )}
          </div>
        </div>
      </div>

      {/* Clock */}
      <div
        className={`flex shrink-0 flex-col items-center justify-center rounded-lg px-2 py-1 transition-all duration-300 sm:px-4 sm:py-2 ${
          active
            ? 'bg-blue-grad text-white shadow-glow-sm'
            : 'bg-navy-600 text-navy-100'
        }`}
      >
        <Clock size={9} className={`mb-0.5 ${active ? 'text-royal-100' : 'text-navy-300'} hidden sm:block`} />
        <span
          className={`font-display text-base font-extrabold tabular-nums sm:text-xl ${
            lowTime && active ? 'animate-pulse text-red-300' : ''
          }`}
        >
          {formatClock(ms)}
        </span>
      </div>
    </div>
  );
}
