import type { MatchRecord } from '../game/types';
import { timeAgo } from '../lib/format';
import { Trophy, Skull, Minus, History } from 'lucide-react';

interface Props {
  matches: MatchRecord[];
  onClear: () => void;
}

export function MatchHistory({ matches, onClear }: Props) {
  return (
    <div className="overflow-hidden rounded-3xl border border-white/10 bg-navy-700/80 shadow-card-lg backdrop-blur-xl">
      <div className="flex items-center justify-between border-b border-white/10 p-5 sm:p-6">
        <div className="flex items-center gap-2">
          <div className="grid h-8 w-8 place-items-center rounded-lg bg-royal-500/15 text-royal-400">
            <History size={16} />
          </div>
          <div>
            <h3 className="font-display text-lg font-bold text-white">Match History</h3>
            <p className="text-xs text-navy-400">{matches.length} game{matches.length !== 1 ? 's' : ''} played</p>
          </div>
        </div>
        {matches.length > 0 && (
          <button
            onClick={onClear}
            className="rounded-full border border-white/10 px-3 py-1.5 text-xs font-semibold text-navy-400 transition-colors hover:bg-navy-600"
          >
            Clear
          </button>
        )}
      </div>

      {matches.length === 0 ? (
        <div className="px-6 py-12 text-center">
          <div className="mx-auto mb-3 grid h-14 w-14 place-items-center rounded-2xl bg-royal-500/15">
            <History size={26} className="text-royal-400" />
          </div>
          <p className="text-sm font-semibold text-navy-300">No matches yet</p>
          <p className="mt-1 text-xs text-navy-400">Finish a game and it'll show up here.</p>
        </div>
      ) : (
        <ul className="divide-y divide-white/5">
          {matches.map((m) => {
            const isWin = m.result === 'win';
            const isDraw = m.result === 'draw';
            const Icon = isWin ? Trophy : isDraw ? Minus : Skull;
            const colorCls = isWin ? 'text-emerald-400 bg-emerald-500/15' : isDraw ? 'text-navy-400 bg-navy-600' : 'text-red-400 bg-red-500/15';
            return (
              <li key={m.id} className="flex items-center gap-3 p-4 transition-colors hover:bg-navy-600/40 sm:p-5">
                <div className={`grid h-10 w-10 shrink-0 place-items-center rounded-xl ${colorCls}`}>
                  <Icon size={18} />
                </div>
                <div className="h-10 w-10 shrink-0 overflow-hidden rounded-full ring-2 ring-white/10">
                  <img src={m.opponentAvatar} alt={m.opponentName} loading="lazy" className="h-full w-full object-cover" />
                </div>
                <div className="min-w-0 flex-1">
                  <div className="flex items-center gap-1.5">
                    <span className="truncate text-sm font-bold text-white">{m.opponentName}</span>
                    <span className="shrink-0 text-base">{m.opponentFlag}</span>
                  </div>
                  <p className="truncate text-xs text-navy-400">
                    {m.timeControlLabel} · {m.moves} moves · {m.ending} · {timeAgo(m.date)}
                  </p>
                </div>
                <div className="shrink-0 text-right">
                  <p className={`text-sm font-extrabold ${m.ratingChange > 0 ? 'text-emerald-400' : m.ratingChange < 0 ? 'text-red-400' : 'text-navy-400'}`}>
                    {m.ratingChange > 0 ? '+' : ''}{m.ratingChange}
                  </p>
                  <p className="text-[10px] font-semibold uppercase tracking-wide text-navy-400">
                    {isWin ? 'Win' : isDraw ? 'Draw' : 'Loss'}
                  </p>
                </div>
              </li>
            );
          })}
        </ul>
      )}
    </div>
  );
}
