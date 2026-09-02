import type { Player } from '../data/players';
import { CURRENT_USER, gamesPlayed, winRate } from '../data/players';
import { Trophy, Target, Flame, TrendingUp, Medal, Pencil } from 'lucide-react';

export function ProfileCard({ user = CURRENT_USER }: { user?: Player }) {
  const total = gamesPlayed(user);
  const wr = winRate(user);

  const stats = [
    { label: 'Rating', value: user.rating, icon: TrendingUp, color: 'text-royal-400', bg: 'bg-royal-500/15' },
    { label: 'Win Rate', value: `${wr}%`, icon: Target, color: 'text-emerald-400', bg: 'bg-emerald-500/15' },
    { label: 'Wins', value: user.wins, icon: Trophy, color: 'text-amber-400', bg: 'bg-amber-500/15' },
    { label: 'Streak', value: user.streak, icon: Flame, color: 'text-red-400', bg: 'bg-red-500/15' },
  ];

  return (
    <div className="overflow-hidden rounded-3xl border border-white/10 bg-navy-700/80 shadow-card-lg backdrop-blur-xl">
      <div className="relative h-28 bg-navy-grad sm:h-32">
        <div className="absolute inset-0 bg-hero-radial opacity-60" />
        <div className="pointer-events-none absolute right-6 top-6 select-none text-5xl text-white/10">{'\u265A'}</div>
        <button className="absolute right-3 top-3 flex items-center gap-1.5 rounded-full bg-white/10 px-3 py-1.5 text-xs font-semibold text-white ring-1 ring-white/20 transition-colors hover:bg-white/20">
          <Pencil size={12} />
          Edit
        </button>
      </div>

      <div className="px-5 pb-5 sm:px-6 sm:pb-6">
        <div className="-mt-12 flex items-end justify-between sm:-mt-14">
          <div className="relative">
            <div className="h-24 w-24 overflow-hidden rounded-full ring-4 ring-navy-700 shadow-glow-sm sm:h-28 sm:w-28">
              <img src={user.avatar} alt={user.name} className="h-full w-full object-cover" />
            </div>
            <span className="absolute bottom-1 right-1 grid h-7 w-7 place-items-center rounded-full bg-blue-grad text-xs font-bold text-white ring-2 ring-navy-700 shadow-glow-sm">
              {user.rating}
            </span>
          </div>
          <div className="mb-2 flex items-center gap-1.5 rounded-full bg-emerald-500/15 px-3 py-1.5 text-xs font-semibold text-emerald-400 ring-1 ring-emerald-500/25">
            <Medal size={14} />
            Rising
          </div>
        </div>

        <div className="mt-3 flex items-center gap-2">
          <h3 className="font-display text-xl font-extrabold text-white sm:text-2xl">{user.name}</h3>
          <span className="text-xl" title={user.country}>{user.flag}</span>
        </div>
        <p className="mt-0.5 text-sm text-navy-400">
          {user.country} · {total} games played
        </p>

        <div className="mt-5 grid grid-cols-2 gap-3 sm:grid-cols-4">
          {stats.map((s) => {
            const Icon = s.icon;
            return (
              <div key={s.label} className="rounded-2xl border border-white/10 bg-navy-600 p-3 text-center transition-all hover:shadow-card">
                <div className={`mx-auto grid h-9 w-9 place-items-center rounded-xl ${s.bg}`}>
                  <Icon size={16} className={s.color} />
                </div>
                <p className="mt-2 font-display text-lg font-extrabold text-white">{s.value}</p>
                <p className="text-[11px] font-medium uppercase tracking-wide text-navy-400">{s.label}</p>
              </div>
            );
          })}
        </div>

        <div className="mt-5">
          <div className="mb-1.5 flex items-center justify-between text-xs font-semibold text-navy-300">
            <span>Record</span>
            <span className="text-navy-400">{user.wins}W · {user.draws}D · {user.losses}L</span>
          </div>
          <div className="flex h-2.5 overflow-hidden rounded-full bg-navy-600">
            <div className="bg-emerald-500" style={{ width: `${(user.wins / total) * 100}%` }} />
            <div className="bg-navy-400" style={{ width: `${(user.draws / total) * 100}%` }} />
            <div className="bg-red-400" style={{ width: `${(user.losses / total) * 100}%` }} />
          </div>
        </div>

        <div className="mt-5">
          <p className="mb-2 text-xs font-semibold uppercase tracking-wide text-navy-400">Badges</p>
          <div className="flex flex-wrap gap-2">
            {['Blitz Master', '5-Win Streak', 'Tactician', 'Opening Pro', 'Endgame Ace'].map((b) => (
              <span key={b} className="chip bg-royal-500/15 text-royal-400 ring-1 ring-royal-500/25">
                <Trophy size={11} />
                {b}
              </span>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}
