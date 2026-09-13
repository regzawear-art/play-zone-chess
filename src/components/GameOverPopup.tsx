
import { useEffect, useState } from 'react';
import type {
  GameStatus,
  MatchRecord,
  MatchEnding,
} from '../game/types';
import {
  Trophy,
  Handshake,
  X,
  Clock,
  Target,
  Zap,
  TrendingUp,
  Star,
  PartyPopper,
  Flag,
} from 'lucide-react';
import { sound } from '../game/sound';

interface Props {
  status: GameStatus;
  ending: MatchEnding;
  onClose: () => void;
  onNewGame: () => void;
  winnerName: string;
  playerWon: boolean;
  moves: number;
  duration: string;
  ratingChange: number;
}

const ENDING_LABELS: Record<MatchEnding, string> = {
  checkmate: 'Checkmate',
  resign: 'Resignation',
  resignation: 'Resignation',
  timeout: 'Time',
  stalemate: 'Stalemate',
  insufficient_material: 'Insufficient Material',
  draw_agreement: 'Draw Agreement',
};

export function GameOverPopup({
  status,
  ending,
  onClose,
  onNewGame,
  winnerName,
  playerWon,
  moves,
  duration,
  ratingChange,
}: Props) {
  const [showStats, setShowStats] = useState(false);

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        onClose();
      }
    };

    window.addEventListener('keydown', onKey);

    return () =>
      window.removeEventListener('keydown', onKey);
  }, [onClose]);

  useEffect(() => {
    if (playerWon && ending === 'checkmate') {
      sound.play('victory');
    }

    const t = setTimeout(
      () => setShowStats(true),
      400,
    );

    return () => clearTimeout(t);
  }, [ending, playerWon]);

  const isDraw =
    ending === 'stalemate' ||
    ending === 'insufficient_material' ||
    ending === 'draw_agreement';

  const isTimeout = ending === 'timeout';

  const isResignation =
    ending === 'resign' ||
    ending === 'resignation';

  const isCheckmate =
    ending === 'checkmate';

  let title: string;
  let subtitle: string;

  if (ending === 'checkmate') {
    title = playerWon
      ? 'Congratulations! You Won!'
      : 'Checkmate';

    subtitle = playerWon
      ? `${ winnerName } wins by Checkmate`
      : `${ winnerName } wins by Checkmate`;
  } else if (ending === 'timeout') {
    title = playerWon
      ? 'Time — You Win!'
      : 'Time Out';

    subtitle = playerWon
      ? `${ winnerName } wins on time`
      : `${ winnerName } wins on time`;
  } else if (
    ending === 'resign' ||
    ending === 'resignation'
  ) {
    title = playerWon
      ? 'Congratulations! You Won!'
      : 'You Resigned';

    subtitle = playerWon
      ? `${ winnerName } wins by resignation`
      : 'You resigned the game';
  } else if (ending === 'insufficient_material') {
    title = 'Draw';

    subtitle =
      'Draw — insufficient material to checkmate';
  } else if (ending === 'stalemate') {
    title = 'Draw';

    subtitle =
      'Stalemate — no legal moves remain';
  } else if (ending === 'draw_agreement') {
    title = 'Draw';

    subtitle =
      'Draw agreed by both players';
  } else {
    title = isDraw
      ? 'Draw'
      : playerWon
        ? 'Congratulations! You Won!'
        : 'Game Over';

    subtitle = isDraw
      ? 'The game ended in a draw'
      : `${ winnerName } wins`;
  }

  const stats = [
    {
      icon: Target,
      label: 'Moves',
      value: String(moves),
    },
    {
      icon: Clock,
      label: 'Duration',
      value: duration,
    },
    {
      icon: Zap,
      label: 'Ending',
      value: ENDING_LABELS[ending],
    },
    {
      icon: TrendingUp,
      label: 'Rating',
      value:
        ratingChange > 0
          ? `+ ${ ratingChange } `
          : String(ratingChange),
    },
  ];

  const ResultIcon = isDraw
    ? Handshake
    : isTimeout
      ? Clock
      : isResignation
        ? Flag
        : isCheckmate
          ? Trophy
          : Trophy;

  return (
    <div className="fixed inset-0 z-[100] flex items-center justify-center bg-black/70 p-4 backdrop-blur-sm">
      <div className="relative w-full max-w-md overflow-hidden rounded-3xl border border-white/10 bg-slate-900 shadow-2xl">
        {/* Close */}
        <button
          type="button"
          onClick={onClose}
          className="absolute right-4 top-4 z-10 flex h-9 w-9 items-center justify-center rounded-full bg-white/5 text-slate-400 transition hover:bg-white/10 hover:text-white"
          aria-label="Close"
        >
          <X className="h-5 w-5" />
        </button>

        {/* Header */}
        <div className="relative px-6 pb-6 pt-10 text-center">
          <div className="pointer-events-none absolute inset-x-0 top-0 h-40 bg-gradient-to-b from-indigo-500/20 to-transparent" />

          <div className="relative mx-auto mb-4 flex h-20 w-20 items-center justify-center rounded-full border border-white/10 bg-white/5">
            <ResultIcon className="h-10 w-10 text-yellow-400" />

            {playerWon && !isDraw && (
              <PartyPopper className="absolute -right-2 -top-2 h-7 w-7 text-pink-400" />
            )}
          </div>

          <h2 className="relative text-2xl font-bold text-white">
            {title}
          </h2>

          <p className="relative mt-2 text-sm text-slate-400">
            {subtitle}
          </p>

          {isDraw && (
            <div className="mt-4 inline-flex items-center gap-2 rounded-full bg-white/5 px-4 py-2 text-sm text-slate-300">
              <Handshake className="h-4 w-4" />
              Draw
            </div>
          )}
        </div>

        {/* Stats */}
        <div
          className={`grid grid - cols - 2 gap - 3 px - 6 transition - all duration - 500 ${
    showStats
        ? 'translate-y-0 opacity-100'
        : 'translate-y-2 opacity-0'
} `}
        >
          {stats.map(
            ({
              icon: Icon,
              label,
              value,
            }) => (
              <div
                key={label}
                className="rounded-2xl border border-white/10 bg-white/[0.03] p-4"
              >
                <div className="flex items-center gap-2 text-xs text-slate-500">
                  <Icon className="h-4 w-4" />
                  <span>{label}</span>
                </div>

                <div className="mt-2 truncate text-sm font-semibold text-white">
                  {value}
                </div>
              </div>
            ),
          )}
        </div>

        {/* Rating */}
        <div className="px-6 pt-4">
          <div className="flex items-center justify-between rounded-2xl border border-white/10 bg-white/[0.03] px-4 py-3">
            <div className="flex items-center gap-2 text-sm text-slate-400">
              <Star className="h-4 w-4" />
              Rating change
            </div>

            <span
              className={`text - sm font - bold ${
    ratingChange > 0
        ? 'text-emerald-400'
        : ratingChange < 0
            ? 'text-red-400'
            : 'text-slate-400'
} `}
            >
              {ratingChange > 0
                ? `+ ${ ratingChange } `
                : ratingChange}
            </span>
          </div>
        </div>

        {/* Actions */}
        <div className="flex gap-3 p-6">
          <button
            type="button"
            onClick={onClose}
            className="flex-1 rounded-2xl border border-white/10 bg-white/5 px-4 py-3 text-sm font-semibold text-slate-300 transition hover:bg-white/10 hover:text-white"
          >
            Close
          </button>

          <button
            type="button"
            onClick={onNewGame}
            className="flex-1 rounded-2xl bg-indigo-500 px-4 py-3 text-sm font-semibold text-white transition hover:bg-indigo-400"
          >
            New Game
          </button>
        </div>
      </div>
    </div>
  );
}

