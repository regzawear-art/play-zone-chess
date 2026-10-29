
import { useEffect, useRef, useState } from 'react';
import {
  ArrowRight,
  ChevronLeft,
  ChevronRight,
  Trophy,
} from 'lucide-react';

interface HeroProps {
  onPlay: () => void;
  onQuickMatch?: () => void;
  onLeaderboard?: () => void;
  onAuth?: () => void;
  onOnline?: () => void;
  onRooms?: () => void;
  onAI?: () => void;
}

const slides = [
  {
    eyebrow: 'PLAY • IMPROVE • MASTER',
    title: 'Your Chess Journey',
    highlight: 'Starts Here.',
    description:
      'Play powerful games, improve your skills, and challenge players from around the world.',
    accent: '', image: '/hero/hero-1.webp', gradient: 'from-amber-300 via-yellow-200 to-blue-300', spark: '#fcd34d',
  },
  {
    eyebrow: 'TRAIN • ANALYZE • GROW',
    title: 'Become a Better',
    highlight: 'Chess Player.',
    description:
      'Practice tactics, study positions, and sharpen your decision-making with every game.',
    accent: '', image: '/hero/hero-2.webp', gradient: 'from-fuchsia-400 via-violet-300 to-sky-300', spark: '#c084fc',
  },
  {
    eyebrow: 'COMPETE • CLIMB • WIN',
    title: 'Prove Your',
    highlight: 'Chess Skills.',
    description:
      'Compete against players, climb the leaderboard, and build your chess legacy.',
    accent: '', image: '/hero/hero-3.webp', gradient: 'from-amber-400 via-orange-300 to-red-400', spark: '#fb923c',
  },
];

const floaters = [
  { glyph: '♞', left: '62%', top: '14%', size: 64, dur: 9, delay: 0 },
  { glyph: '♛', left: '86%', top: '58%', size: 54, dur: 11, delay: 1.5 },
  { glyph: '♜', left: '48%', top: '74%', size: 40, dur: 8, delay: 0.8 },
  { glyph: '♝', left: '92%', top: '18%', size: 36, dur: 10, delay: 2.2 },
  { glyph: '♚', left: '6%', top: '82%', size: 44, dur: 12, delay: 0.4 },
];

const sparks = Array.from({ length: 18 }, (_, i) => ({
  left: `${(i * 53) % 100}%`,
  size: 2 + (i % 3),
  dur: 5 + (i % 5),
  delay: (i * 0.7) % 6,
}));

export function Hero({ onPlay }: HeroProps) {
  const [activeSlide, setActiveSlide] = useState(0);

  useEffect(() => {
    const timer = setInterval(() => {
      setActiveSlide((current) => (current + 1) % slides.length);
    }, 6000);

    return () => clearInterval(timer);
  }, []);

  const slide = slides[activeSlide];
  const touchX = useRef<number | null>(null);
  const onTouchStart = (e: React.TouchEvent) => { touchX.current = e.touches[0].clientX; };
  const onTouchEnd = (e: React.TouchEvent) => {
    if (touchX.current === null) return;
    const dx = e.changedTouches[0].clientX - touchX.current;
    touchX.current = null;
    if (Math.abs(dx) < 40) return;
    setActiveSlide((c) => (dx < 0 ? (c + 1) : (c - 1 + slides.length)) % slides.length);
  };

  const previousSlide = () => {
    setActiveSlide(
      (current) => (current-1 + slides.length) % slides.length
    );
  };

  const nextSlide = () => {
    setActiveSlide((current) => (current + 1) % slides.length);
  };

  return (
    <section className="relative w-full min-w-0 overflow-hidden bg-navy-950" onTouchStart={onTouchStart} onTouchEnd={onTouchEnd}>
      <style>{`
        @keyframes heroKenBurns { 0% { transform: scale(1.04) translate3d(0,0,0); } 100% { transform: scale(1.16) translate3d(-2%, -1.5%, 0); } }
        @keyframes heroFloat { 0%,100% { transform: translateY(0) rotate(-6deg); } 50% { transform: translateY(-26px) rotate(6deg); } }
        @keyframes heroSpark { 0% { transform: translateY(0) scale(1); opacity: 0; } 15% { opacity: 1; } 100% { transform: translateY(-260px) scale(0.3); opacity: 0; } }
        @keyframes heroRise { 0% { opacity: 0; transform: translateY(28px); filter: blur(6px); } 100% { opacity: 1; transform: translateY(0); filter: blur(0); } }
        @keyframes heroProgress { from { width: 0%; } to { width: 100%; } }
        .hero-kb { animation: heroKenBurns 7s ease-out forwards; }
        .hero-rise { animation: heroRise 0.9s cubic-bezier(.2,.8,.2,1) both; }
        @media (prefers-reduced-motion: reduce) { .hero-kb, .hero-rise, .hero-anim { animation: none !important; } }
      `}</style>

      {/* Background slides: top image block on mobile, full-bleed on desktop */}
      <div className="absolute inset-x-0 top-0 h-[64vh] max-h-[520px] min-h-[340px] sm:h-[70vh] lg:inset-0 lg:h-auto lg:max-h-none">
        {slides.map((s, index) => (
          <div
            key={s.image}
            className={`absolute inset-0 transition-opacity duration-[1200ms] ease-in-out ${index === activeSlide ? 'opacity-100' : 'opacity-0'}`}
          >
            <img
              key={index === activeSlide ? `on-${activeSlide}` : `off-${index}`}
              src={s.image}
              alt=""
              loading={index === 0 ? 'eager' : 'lazy'}
              className={`h-full w-full object-cover object-[78%_center] lg:object-[70%_center] ${index === activeSlide ? 'hero-kb' : ''}`}
            />
          </div>
        ))}
        <div className="absolute inset-0 hidden bg-gradient-to-r from-navy-950 via-navy-950/75 to-navy-950/10 lg:block" />
        <div className="absolute inset-0 bg-gradient-to-t from-navy-950 via-navy-950/30 to-navy-950/50 lg:via-transparent lg:to-navy-950/40" />
      </div>

      {/* Floating chess pieces */}
      <div className="pointer-events-none absolute inset-0 overflow-hidden">
        {floaters.map((f, i) => (
          <span
            key={i}
            className={`hero-anim absolute select-none text-white/10 drop-shadow-[0_0_18px_rgba(140,120,255,0.35)] ${i > 1 ? 'hidden sm:block' : ''}`}
            style={{ left: f.left, top: f.top, fontSize: `clamp(${Math.round(f.size * 0.55)}px, 6vw, ${f.size}px)`, animation: `heroFloat ${f.dur}s ease-in-out ${f.delay}s infinite` }}
          >
            {f.glyph}
          </span>
        ))}
        {sparks.map((p, i) => (
          <span
            key={`s${i}`}
            className="hero-anim absolute rounded-full"
            style={{ left: p.left, bottom: '-10px', width: p.size, height: p.size, background: slide.spark, boxShadow: `0 0 10px ${slide.spark}`, animation: `heroSpark ${p.dur}s linear ${p.delay}s infinite` }}
          />
        ))}
      </div>

      <div className="relative mx-auto flex min-h-[640px] w-full max-w-7xl items-end px-5 pt-[44vh] pb-10 sm:min-h-[700px] sm:px-6 sm:pt-[48vh] lg:min-h-[680px] lg:items-center lg:px-8 lg:pt-28 lg:pb-14">
        <div key={activeSlide} className="max-w-2xl">
          <div className="hero-rise mb-4 inline-flex items-center gap-2 rounded-full border border-white/15 bg-white/10 px-3 py-1.5 text-xs font-semibold tracking-wider text-white/80 backdrop-blur-md sm:text-sm">
            <span className="h-1.5 w-1.5 animate-pulse rounded-full" style={{ background: slide.spark }} />
            {slide.eyebrow}
          </div>

          <h1 className="hero-rise text-[2.15rem] font-bold leading-[1.08] tracking-tight text-white drop-shadow-xl sm:text-5xl lg:text-6xl xl:text-7xl" style={{ animationDelay: '0.12s' }}>
            {slide.title}{' '}
            <span className={`bg-gradient-to-r ${slide.gradient} bg-clip-text text-transparent`}>
              {slide.highlight}
            </span>
          </h1>

          <p className="hero-rise mt-4 max-w-xl text-[15px] leading-6 text-white/75 sm:mt-5 sm:text-base sm:leading-7 lg:text-lg" style={{ animationDelay: '0.24s' }}>
            {slide.description}
          </p>

          <div className="hero-rise mt-6 flex flex-col gap-3 sm:mt-8 sm:flex-row sm:flex-wrap sm:items-center" style={{ animationDelay: '0.36s' }}>
            <button
              type="button"
              onClick={onPlay}
              className="group inline-flex w-full items-center justify-center gap-2 rounded-xl bg-royal-500 px-6 py-3.5 sm:w-auto text-sm font-semibold text-white shadow-lg shadow-royal-500/30 transition-all hover:scale-[1.03] hover:bg-royal-400"
            >
              Play Chess
              <ArrowRight size={17} className="transition-transform group-hover:translate-x-1" />
            </button>
            <div className="hidden items-center gap-2 rounded-xl border border-white/15 bg-white/10 px-4 py-3 text-sm text-white/80 backdrop-blur-md sm:inline-flex">
              <Trophy size={17} className="text-amber-300" />
              <span>Improve your game</span>
            </div>
          </div>

          {/* Controls */}
          <div className="mt-7 flex items-center justify-between gap-4 sm:mt-10 sm:justify-start">
            <div className="flex items-center gap-2">
              {slides.map((_, index) => (
                <button
                  key={index}
                  type="button"
                  onClick={() => setActiveSlide(index)}
                  aria-label={`Go to slide ${index + 1}`}
                  className={`relative h-1.5 overflow-hidden rounded-full transition-all duration-500 ${index === activeSlide ? 'w-12 bg-white/25' : 'w-3 bg-white/25 hover:bg-white/50'}`}
                >
                  {index === activeSlide && (
                    <span className="absolute inset-y-0 left-0 rounded-full bg-white" style={{ animation: 'heroProgress 6s linear forwards' }} />
                  )}
                </button>
              ))}
            </div>
            <div className="flex items-center gap-2">
            <button type="button" onClick={previousSlide} aria-label="Previous slide" className="flex h-10 w-10 items-center justify-center rounded-lg border border-white/15 bg-white/10 text-white/80 backdrop-blur-md transition-colors hover:bg-white/20">
              <ChevronLeft size={17} />
            </button>
            <button type="button" onClick={nextSlide} aria-label="Next slide" className="flex h-10 w-10 items-center justify-center rounded-lg border border-white/15 bg-white/10 text-white/80 backdrop-blur-md transition-colors hover:bg-white/20">
              <ChevronRight size={17} />
            </button>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}
