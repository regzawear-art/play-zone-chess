import { useMemo, useState } from 'react';
import { PLAYERS, winRate, gamesPlayed } from '../data/players';
import { Crown, TrendingUp, TrendingDown, Minus } from 'lucide-react';

type SortKey = 'rating' | 'wins' | 'winRate';

export function Leaderboard() {
  const [sort, setSort] = useState<SortKey>('rating');
  const ranked = useMemo(() => {
    const list = [...PLAYERS];
    list.sort((a, b) => {
      if (sort === 'wins') return b.wins - a.wins;
      if (sort === 'winRate') return winRate(b) - winRate(a);
      return b.rating - a.rating;
    });
    return list;
  }, [sort]);
  const maxRating = Math.max(...PLAYERS.map((p) => p.rating));

  return (
    <div
      className="w-full overflow-hidden rounded-3xl border border-white/10 bg-navy-700/80 p-4 shadow-card-lg backdrop-blur-xl sm:p-6"
      style={{ maxWidth: '100%', boxSizing: 'border-box', overflowX: 'hidden' }}
    >
      <div className="flex flex-col gap-3 border-b border-white/10 p-5 sm:flex-row sm:items-center sm:justify-between sm:p-6">
        <div>
          <h3 className="font-display text-xl font-extrabold text-white sm:text-2xl">Global Leaderboard</h3>
          <p className="mt-0.5 text-sm text-navy-400">Top players ranked by performance</p>
        </div>
        <div className="flex items-center gap-1 rounded-full border border-royal-500/25 bg-navy-600 p-1">
          {([{ k: 'rating', label: 'Rating' }, { k: 'wins', label: 'Wins' }, { k: 'winRate', label: 'Win %' }] as { k: SortKey; label: string }[]).map((t) => (
            <button key={t.k} onClick={() => setSort(t.k)} className={`rounded-full px-3 py-1.5 text-xs font-semibold transition-all ${sort === t.k ? 'bg-blue-grad text-white shadow-glow-sm' : 'text-navy-300 hover:bg-navy-500'}`}>{t.label}</button>
          ))}
        </div>
      </div>
      <div className="w-full" style={{ maxWidth: '100%', overflowX: 'hidden', boxSizing: 'border-box' }}>
        <table className="w-full border-collapse text-left" style={{ width: '100%', maxWidth: '100%', tableLayout: 'fixed', boxSizing: 'border-box' }}>
          <colgroup>
            <col className="w-10 sm:w-14" />
            <col />
            <col className="w-20 sm:w-24" />
            <col className="hidden w-24 sm:table-cell" />
            <col className="hidden w-20 md:table-cell" />
            <col className="w-16 sm:w-20" />
          </colgroup>
          <thead>
            <tr className="text-xs uppercase tracking-wide text-navy-400">
              <th className="px-2 py-3 font-semibold sm:px-6">#</th>
              <th className="px-2 py-3 font-semibold sm:px-6">Player</th>
              <th className="px-2 py-3 text-right font-semibold sm:px-6">Rating</th>
              <th className="hidden px-5 py-3 text-right font-semibold sm:px-6 sm:table-cell">W/D/L</th>
              <th className="hidden px-5 py-3 text-right font-semibold sm:px-6 md:table-cell">Win %</th>
              <th className="px-2 py-3 text-right font-semibold sm:px-6">Streak</th>
            </tr>
          </thead>
          <tbody>
            {ranked.map((p, i) => {
              const isTop = i < 3;
              const trend: 'up' | 'flat' = p.streak > 0 ? 'up' : 'flat';
              return (
                <tr key={p.id} className="group border-t border-white/5 transition-colors hover:bg-navy-600/50">
                  <td className="px-2 py-3 sm:px-6">
                    <div className="flex items-center gap-1.5">
                      {isTop ? (
                        <span className={`grid h-7 w-7 place-items-center rounded-lg text-xs font-bold text-white shadow-glow-sm ${i === 0 ? 'bg-amber-400' : i === 1 ? 'bg-navy-400' : 'bg-orange-400'}`}>{i === 0 ? <Crown size={14} /> : i + 1}</span>
                      ) : (
                        <span className="grid h-7 w-7 place-items-center rounded-lg bg-navy-600 text-xs font-bold text-navy-300">{i + 1}</span>
                      )}
                    </div>
                  </td>
                  <td className="px-2 py-3 sm:px-6">
                    <div className="flex items-center gap-2 sm:gap-3">
                      <div className="relative h-8 w-8 shrink-0 overflow-hidden rounded-full ring-2 ring-white/10 transition-all group-hover:ring-royal-400/50 sm:h-10 sm:w-10">
                        <img src={p.avatar} alt={p.name} loading="lazy" className="h-full w-full object-cover" />
                      </div>
                      <div className="min-w-0">
                        <div className="flex items-center gap-1.5">
                          {p.title && <span className="rounded bg-blue-grad px-1.5 py-0.5 text-[10px] font-bold text-white">{p.title}</span>}
                          <span className="truncate text-sm font-bold text-white">{p.name}</span>
                          <span className="shrink-0 text-base">{p.flag}</span>
                        </div>
                        <p className="truncate text-xs text-navy-400">{p.country}</p>
                      </div>
                    </div>
                  </td>
                  <td className="px-2 py-3 text-right sm:px-6">
                    <div className="flex items-center justify-end gap-2">
                      <span className="font-display text-base font-extrabold text-white">{p.rating}</span>
                      {trend === 'up' ? <TrendingUp size={14} className="text-emerald-400" /> : <Minus size={14} className="text-navy-500" />}
                    </div>
                    <div className="mt-1 ml-auto h-1 w-12 max-w-full overflow-hidden rounded-full bg-navy-600 sm:w-20">
                      <div className="h-full bg-blue-grad" style={{ width: `${(p.rating / maxRating) * 100}%` }} />
                    </div>
                  </td>
                  <td className="hidden px-5 py-3 text-right text-xs font-semibold sm:px-6 sm:table-cell">
                    <span className="text-emerald-400">{p.wins}</span>
                    <span className="text-navy-500">/</span>
                    <span className="text-navy-300">{p.draws}</span>
                    <span className="text-navy-500">/</span>
                    <span className="text-red-400">{p.losses}</span>
                  </td>
                  <td className="hidden px-5 py-3 text-right sm:px-6 md:table-cell">
                    <span className="font-semibold text-white">{winRate(p)}%</span>
                    <span className="ml-1 text-xs text-navy-400">({gamesPlayed(p)})</span>
                  </td>
                  <td className="px-2 py-3 text-right sm:px-6">
                    <span className={`chip ring-1 ${p.streak >= 3 ? 'bg-red-500/15 text-red-400 ring-red-500/25' : p.streak > 0 ? 'bg-emerald-500/15 text-emerald-400 ring-emerald-500/25' : 'bg-navy-600 text-navy-400 ring-white/10'}`}>{p.streak > 0 ? `${p.streak}W` : '—'}</span>
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>
    </div>
  );
}
