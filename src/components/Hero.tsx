import { useCallback, useEffect, useRef, useState } from 'react';
import { Play, Swords, Trophy, Globe, ChevronRight, Sparkles, Bot, ChevronLeft, Gift } from 'lucide-react';

interface Slide {
  eyebrow: string;
  title: string;
  highlight: string;
  description: string;
  cta: { label: string; icon: typeof Play; primary: boolean; action: string }[];
  image: string;
  accent: string;
}

const SLIDES: Slide[] = [
  {
    eyebrow: 'Welcome Bonus',
    title: 'Play Chess &',
    highlight: 'Earn Rewards',
    description: 'Claim Your $50 Welcome Bonus Upon First Sign-Up!',
    cta: [
      { label: 'Claim Bonus Now', icon: Gift, primary: true, action: 'auth' },
      { label: 'Learn More', icon: Sparkles, primary: false, action: 'play' },
    ],
    image: 'https://images.unsplash.com/photo-1586165368502-1bad197a6461?q=80&w=1920&auto=format&fit=crop',
    accent: 'from-amber-500/30 to-orange-400/10',
  },
  {
    eyebrow: 'Global Online Play',
    title: 'Challenge Players',
    highlight: 'Worldwide',
    description: 'Real-time 1v1 Online Matches, Private Rooms & Custom Clubs.',
    cta: [
      { label: 'Play Online', icon: Globe, primary: true, action: 'online' },
      { label: 'Create Room', icon: Swords, primary: false, action: 'rooms' },
    ],
    image: 'https://images.unsplash.com/photo-1529699211952-734e80c4d42b?q=80&w=1920&auto=format&fit=crop',
    accent: 'from-royal-500/30 to-royal-300/10',
  },
  {
    eyebrow: 'AI Training Ground',
    title: 'Train Against',
    highlight: 'Grandmaster AI',
    description: 'Sharpen your tactical skills across Easy, Hard, and Grandmaster stages.',
    cta: [
      { label: 'Challenge AI', icon: Bot, primary: true, action: 'ai' },
      { label: 'Play Now', icon: Play, primary: false, action: 'play' },
    ],
    image: 'https://images.unsplash.com/photo-1560174038-da43ac74f01b?q=80&w=1920&auto=format&fit=crop',
    accent: 'from-navy-600/30 to-royal-400/10',
  },
];

interface Props {
  onPlay: () => void;
  onLeaderboard: () => void;
  onAuth: () => void;
  onOnline: () => void;
  onRooms: () => void;
  onAI: () => void;
}

export function Hero({ onPlay, onLeaderboard, onAuth, onOnline, onRooms, onAI }: Props) {
  const [index, setIndex] = useState(0);
  const [paused, setPaused] = useState(false);
  const timer = useRef<number | null>(null);

  const next = useCallback(() => setIndex((i) => (i + 1) % SLIDES.length), []);
  const prev = useCallback(() => setIndex((i) => (i - 1 + SLIDES.length) % SLIDES.length), []);
  const goTo = useCallback((i: number) => setIndex(i), []);

  useEffect(() => {
    if (paused) return;
    timer.current = window.setInterval(next, 5000);
    return () => {
      if (timer.current) window.clearInterval(timer.current);
    };
  }, [paused, next]);

  const handleCta = (action: string) => {
    switch (action) {
      case 'auth': onAuth(); break;
      case 'online': onOnline(); break;
      case 'rooms': onRooms(); break;
      case 'ai': onAI(); break;
      case 'leaderboard': onLeaderboard(); break;
      default: onPlay();
    }
  };

  return (
    <section
      id="home"
      className="relative overflow-hidden pt-28 pb-16 sm:pt-32 sm:pb-20 lg:pt-20"
      onMouseEnter={() => setPaused(true)}
      onMouseLeave={() => setPaused(false)}
      aria-roledescription="carousel"
      aria-label="Featured highlights"
    >
      <div className="absolute inset-0 -z-10 bg-hero-radial" />
      <div className="absolute inset-0 -z-10 bg-gradient-to-b from-navy-700 via-navy-800 to-navy-800" />
      <div className="pointer-events-none absolute -left-10 top-40 select-none text-[120px] text-royal-400/15 animate-float sm:text-[180px] lg:text-[220px]">
        {'\u265C'}
      </div>
      <div className="pointer-events-none absolute right-6 top-64 select-none text-[90px] text-royal-400/10 animate-float [animation-delay:1.5s] sm:text-[140px]">
        {'\u265E'}
      </div>

      <div className="mx-auto max-w-7xl px-4 sm:px-6">
        <div className="grid items-center gap-8 lg:grid-cols-[1.05fr_1fr] lg:gap-12">
          {/* Text + CTAs */}
          <div className="relative">
            <div className="relative grid">
              {SLIDES.map((s, i) => (
                <div
                  key={i}
                  className={`col-start-1 row-start-1 transition-all duration-700 ease-smooth ${
                    i === index ? 'translate-y-0 opacity-100' : 'pointer-events-none translate-y-4 opacity-0'
                  }`}
                  aria-hidden={i !== index}
                >
                  <span className="chip mb-4 bg-royal-500/15 text-royal-400 ring-1 ring-royal-500/25">
                    <Sparkles size={13} />
                    {s.eyebrow}
                  </span>
                  <h1 className="font-display text-4xl font-extrabold leading-[1.05] tracking-tight text-white sm:text-5xl lg:text-6xl">
                    {s.title}{' '}
                    <span className="shimmer-text">{s.highlight}</span>
                  </h1>
                  <p className="mt-4 max-w-xl text-pretty text-base leading-relaxed text-navy-200 sm:text-lg">
                    {s.description}
                  </p>
                  <div className="mt-7 flex flex-wrap items-center gap-3">
                    {s.cta.map((c) => {
                      const Icon = c.icon;
                      return c.primary ? (
                        <button
                          key={c.label}
                          onClick={() => handleCta(c.action)}
                          className="btn-primary group"
                        >
                          <Icon size={18} className="transition-transform group-hover:scale-110" />
                          {c.label}
                          <ChevronRight size={16} className="transition-transform group-hover:translate-x-1" />
                        </button>
                      ) : (
                        <button
                          key={c.label}
                          onClick={() => handleCta(c.action)}
                          className="btn-ghost group"
                        >
                          <Icon size={18} className="text-royal-400" />
                          {c.label}
                        </button>
                      );
                    })}
                  </div>
                </div>
              ))}
            </div>

            {/* Navigation: arrows + dots in a clean row */}
            <div className="mt-6 flex items-center gap-3">
              <button
                onClick={prev}
                aria-label="Previous slide"
                className="grid h-9 w-9 shrink-0 place-items-center rounded-full glass text-white shadow-card transition-all hover:shadow-glow-sm hover:bg-navy-600"
              >
                <ChevronLeft size={18} />
              </button>
              <div className="flex items-center gap-2">
                {SLIDES.map((s, i) => (
                  <button
                    key={i}
                    onClick={() => goTo(i)}
                    aria-label={`Go to slide ${i + 1}: ${s.title}`}
                    className={`h-2 rounded-full transition-all duration-500 ${
                      i === index ? 'w-8 bg-blue-grad shadow-glow-sm' : 'w-2 bg-navy-500 hover:bg-navy-400'
                    }`}
                  />
                ))}
              </div>
              <button
                onClick={next}
                aria-label="Next slide"
                className="grid h-9 w-9 shrink-0 place-items-center rounded-full glass text-white shadow-card transition-all hover:shadow-glow-sm hover:bg-navy-600"
              >
                <ChevronRight size={18} />
              </button>
              <span className="ml-1 text-xs font-semibold text-navy-400">
                {String(index + 1).padStart(2, '0')} / {String(SLIDES.length).padStart(2, '0')}
              </span>
            </div>
          </div>

          {/* Visual */}
          <div className="relative">
            <div className="relative mx-auto aspect-[4/3] w-full max-w-lg overflow-hidden rounded-3xl border border-white/10 shadow-card-lg lg:max-w-none">
              {SLIDES.map((s, i) => (
                <div
                  key={i}
                  className={`absolute inset-0 transition-opacity duration-700 ease-smooth ${
                    i === index ? 'opacity-100' : 'opacity-0'
                  }`}
                >
                  <img
                    src={s.image}
                    alt={s.title}
                    loading={i === 0 ? 'eager' : 'lazy'}
                    className="h-full w-full object-cover"
                  />
                  <div className={`absolute inset-0 bg-gradient-to-tr ${s.accent}`} />
                  <div className="absolute inset-0 bg-gradient-to-t from-navy-900/70 via-navy-900/20 to-transparent" />
                </div>
              ))}
              <div className="absolute bottom-4 left-4 right-4 flex items-center justify-between gap-3 rounded-2xl glass-dark p-3 text-white sm:p-4">
                <div className="flex items-center gap-3">
                  <div className="grid h-11 w-11 place-items-center rounded-xl bg-royal-500/20 ring-1 ring-royal-500/30">
                    <Trophy size={20} className="text-royal-400" />
                  </div>
                  <div className="leading-tight">
                    <p className="text-xs uppercase tracking-wide text-royal-300">Live now</p>
                    <p className="text-sm font-bold sm:text-base">12,480 players online</p>
                  </div>
                </div>
                <button
                  onClick={onPlay}
                  className="rounded-full bg-blue-grad px-4 py-2 text-xs font-bold shadow-glow-sm transition-transform hover:translate-y-[-2px] sm:text-sm"
                >
                  Quick Match
                </button>
              </div>
            </div>
            <div className="absolute -inset-4 -z-10 rounded-[2rem] bg-royal-500/15 blur-3xl" />
          </div>
        </div>

        <div className="mt-12 grid grid-cols-2 gap-3 sm:grid-cols-4 sm:gap-4">
          {[
            { k: '2.4M+', v: 'Matches played' },
            { k: '180+', v: 'Countries' },
            { k: '48', v: 'Daily tournaments' },
            { k: '99.9%', v: 'Uptime' },
          ].map((s) => (
            <div key={s.v} className="rounded-2xl glass px-4 py-3 text-center shadow-card sm:py-4">
              <p className="font-display text-2xl font-extrabold text-white sm:text-3xl">{s.k}</p>
              <p className="mt-0.5 text-xs font-medium text-navy-300 sm:text-sm">{s.v}</p>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}
