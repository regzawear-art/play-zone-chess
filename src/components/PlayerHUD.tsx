import type { PieceType } from '../game/types';
import { GLYPH } from '../game/pieces';
import { formatClock } from '../lib/format';

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
  const sortedPieces = [...player.capturedPieces].sort((a, b) => (PIECE_ORDER[a] ?? 9)-(PIECE_ORDER[b] ?? 9));
  const lowTime = ms <= 10_000;
  const online = player.online === true;

  return (
    <div
      className={`flex w-full items-center gap-2 px-0.5 py-1 sm:gap-2.5 sm:py-1.5`}
    >
      {/* Avatar */}
      <div className="relative shrink-0">
        <div
          className={`h-8 w-8 overflow-hidden rounded-sm bg-[#3c3a36] sm:h-10 sm:w-10`}
        >
          <img src={player.avatar} alt={player.name} loading="lazy" className="h-full w-full object-cover" />
        </div>
        {online && (
          <span className="absolute -bottom-0.5 -right-0.5 h-2 w-2 rounded-full bg-emerald-500 ring-1 ring-navy-800" title="Online" />
        )}
      </div>

      {/* Name + rating */}
      <div className="min-w-0 flex-1">
        <div className="flex items-center gap-1.5">
          {player.title && (
            <span className="rounded bg-blue-grad px-1 py-0.5 text-[9px] font-bold text-white">
              {player.title}
            </span>
          )}
          <span className="truncate text-xs font-bold text-white sm:text-sm">{player.name}</span>
          <span className="shrink-0 text-xs text-[#989795] sm:text-sm">({player.rating > 0 ? player.rating : 'BOT'})</span>
          <span className="shrink-0 text-xs sm:text-sm">{player.flag}</span>
        </div>
        <div className="mt-0.5 flex items-center gap-1">
          
          {/* Captured pieces */}
          <div className="flex items-center leading-none">
            {sortedPieces.slice(0, 6).map((p, i) => (
              <span
                key={i}
                className="text-[#989795] text-xs sm:text-sm"
                style={{ marginLeft: i > 0 ? '-3px' : '0', opacity: 0.7 }}
              >
                {GLYPH[p]}
              </span>
            ))}
            {player.materialDiff > 0 && (
              <span className="ml-1 text-[9px] font-bold text-[#989795] sm:text-[11px]">
                +{player.materialDiff}
              </span>
            )}
          </div>
        </div>
      </div>

      {/* Clock — chess.com style right-aligned */}
      <div
        className={`flex shrink-0 items-center justify-center min-w-[84px] rounded-sm px-2.5 py-1.5 transition-colors duration-200 sm:min-w-[120px] sm:justify-end sm:px-3 sm:py-2 ${
          active
            ? 'bg-white text-[#262421]'
            : 'bg-[#262421] text-[#989795]'
        }`}
      >
        <span
          className={`font-display text-base font-extrabold tabular-nums sm:text-xl ${
            lowTime && active ? 'animate-pulse text-red-600' : ''
          }`}
        >
          {formatClock(ms)}
        </span>
      </div>
    </div>
  );
}
