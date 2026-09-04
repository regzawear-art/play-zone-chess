import { Zap, Globe2, Trophy, ShieldCheck, Sparkles, Gauge } from 'lucide-react';

const FEATURES = [
  { icon: Zap, title: 'Instant Matching', desc: 'Jump into a rated game in seconds. Our matchmaker pairs you with opponents at your skill level.', color: 'from-royal-400 to-royal-600' },
  { icon: Globe2, title: 'Global Competition', desc: 'Face players from 180+ countries. Climb regional and worldwide ladders in real time.', color: 'from-emerald-400 to-emerald-600' },
  { icon: Trophy, title: 'Tournaments Daily', desc: 'Compete in Bullet, Blitz, and Rapid arenas with prizes, badges, and titles on the line.', color: 'from-amber-400 to-orange-500' },
  { icon: ShieldCheck, title: 'Fair Play First', desc: 'Anti-cheat engines monitor every move so your rating reflects real skill, not shortcuts.', color: 'from-navy-500 to-navy-700' },
  { icon: Sparkles, title: 'Beautiful by Design', desc: 'A premium, distraction-free board with smooth animations and crisp sound on every device.', color: 'from-royal-500 to-navy-600' },
  { icon: Gauge, title: 'Built for Speed', desc: 'Lightning-fast load times and 60fps motion, optimized for mobile and desktop alike.', color: 'from-royal-400 to-royal-500' },
];

export function Features() {
  return (
    <section className="w-full px-4 py-16 sm:px-6 lg:px-8 lg:py-20">
      <div className="mx-auto max-w-3xl text-center">
        <span className="chip mx-auto bg-royal-500/15 text-royal-400 ring-1 ring-royal-500/25">
          <Sparkles size={13} />
          Why Gambit Royale
        </span>
        <h2 className="mt-4 font-display text-3xl font-extrabold tracking-tight text-white sm:text-4xl">
          Everything you need to <span className="shimmer-text">play like a pro</span>
        </h2>
        <p className="mt-3 text-pretty text-navy-300">
          A complete chess platform — from your first game to tournament glory — wrapped in a premium, responsive interface.
        </p>
      </div>
      <div className="mt-12 grid gap-5 sm:grid-cols-2 lg:grid-cols-3">
        {FEATURES.map((f) => {
          const Icon = f.icon;
          return (
            <div key={f.title} className="group relative overflow-hidden rounded-3xl border border-white/10 bg-navy-700/80 p-6 shadow-card backdrop-blur-xl transition-all duration-500 hover:-translate-y-1.5 hover:shadow-card-lg">
              <div className={`grid h-12 w-12 place-items-center rounded-2xl bg-gradient-to-br ${f.color} shadow-glow-sm`}>
                <Icon size={22} className="text-white" />
              </div>
              <h3 className="mt-4 font-display text-lg font-bold text-white">{f.title}</h3>
              <p className="mt-1.5 text-sm leading-relaxed text-navy-300">{f.desc}</p>
              <div className="pointer-events-none absolute -right-8 -top-8 h-24 w-24 rounded-full bg-royal-400/10 blur-2xl transition-all duration-500 group-hover:bg-royal-400/25" />
            </div>
          );
        })}
      </div>
    </section>
  );
}
