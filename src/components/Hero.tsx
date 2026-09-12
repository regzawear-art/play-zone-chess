
import { useEffect, useState } from 'react';
import {
  ArrowRight,
  ChevronLeft,
  ChevronRight,
  Trophy,
} from 'lucide-react';

interface HeroProps {
  onPlay: () => void;
}

const slides = [
  {
    eyebrow: 'PLAY • IMPROVE • MASTER',
    title: 'Your Chess Journey',
    highlight: 'Starts Here.',
    description:
      'Play powerful games, improve your skills, and challenge players from around the world.',
    accent: 'from-royal-500/20 via-transparent to-blue-500/10',
  },
  {
    eyebrow: 'TRAIN • ANALYZE • GROW',
    title: 'Become a Better',
    highlight: 'Chess Player.',
    description:
      'Practice tactics, study positions, and sharpen your decision-making with every game.',
    accent: 'from-purple-500/20 via-transparent to-royal-500/10',
  },
  {
    eyebrow: 'COMPETE • CLIMB • WIN',
    title: 'Prove Your',
    highlight: 'Chess Skills.',
    description:
      'Compete against players, climb the leaderboard, and build your chess legacy.',
    accent: 'from-amber-500/20 via-transparent to-orange-500/10',
  },
];

export function Hero({ onPlay }: HeroProps) {
  const [activeSlide, setActiveSlide] = useState(0);

  useEffect(() => {
    const timer = setInterval(() => {
      setActiveSlide((current) => (current + 1) % slides.length);
    }, 6000);

    return () => clearInterval(timer);
  }, []);

  const slide = slides[activeSlide];

  const previousSlide = () => {
    setActiveSlide(
      (current) => (current-1 + slides.length) % slides.length
    );
  };

  const nextSlide = () => {
    setActiveSlide((current) => (current + 1) % slides.length);
  };

  return (
    <section className="relative w-full min-w-0 overflow-hidden pt-24 pb-8 sm:pt-32 sm:pb-16 lg:pt-20 lg:pb-20">
      {/* Background */}
      <div className="pointer-events-none absolute inset-0 overflow-hidden">
        <div
          className={`absolute inset-x-0 top-0 h-[500px] bg-gradient-to-b ${ slide.accent } transition-all duration-500 ease-smooth`}
        />

        <div className="absolute inset-0 bg-[radial-gradient(circle_at_top_right,rgba(255,255,255,0.06),transparent_35%)]" />
      </div>

      <div className="relative mx-auto w-full max-w-7xl px-4 sm:px-6 lg:px-8">
        <div className="grid min-w-0 items-center gap-6 lg:grid-cols-[1.05fr_1fr] lg:gap-12">
          {/* LEFT CONTENT */}
          <div className="relative min-w-0">
            <div className="relative min-h-[285px] sm:min-h-[310px] lg:min-h-[320px]">
              {slides.map((s, index) => (
                <div
                  key={s.title}
                  className={`absolute inset-0 transition-opacity duration-700 ease-smooth ${
    index === activeSlide
        ? 'opacity-100'
        : 'pointer-events-none opacity-0'
} `}
                >
                  <div className="mb-4 inline-flex items-center gap-2 rounded-full border border-white/10 bg-white/5 px-3 py-1.5 text-xs font-semibold tracking-wider text-white/70 sm:text-sm">
                    <span className="h-1.5 w-1.5 rounded-full bg-royal-400" />
                    {s.eyebrow}
                  </div>

                  <h1 className="max-w-3xl text-4xl font-bold leading-[1.05] tracking-tight text-white sm:text-5xl lg:text-6xl xl:text-7xl">
                    {s.title}{' '}
                    <span className="bg-gradient-to-r from-royal-400 to-blue-400 bg-clip-text text-transparent">
                      {s.highlight}
                    </span>
                  </h1>

                  <p className="mt-5 max-w-xl text-sm leading-6 text-white/60 sm:text-base sm:leading-7 lg:text-lg">
                    {s.description}
                  </p>

                  <div className="mt-7 flex flex-wrap items-center gap-3 sm:mt-8">
                    <button
                      type="button"
                      onClick={onPlay}
                      className="group inline-flex items-center gap-2 rounded-xl bg-royal-500 px-5 py-3 text-sm font-semibold text-white shadow-lg shadow-royal-500/20 transition-all hover:bg-royal-400 hover:shadow-royal-500/30 sm:px-6 sm:py-3.5"
                    >
                      Play Chess
                      <ArrowRight
                        size={17}
                        className="transition-transform group-hover:translate-x-1"
                      />
                    </button>

                    <div className="inline-flex items-center gap-2 rounded-xl border border-white/10 bg-white/5 px-4 py-3 text-sm text-white/70">
                      <Trophy
                        size={17}
                        className="text-royal-400 sm:h-5 sm:w-5"
                      />
                      <span>Improve your game</span>
                    </div>
                  </div>
                </div>
              ))}
            </div>

            {/* Carousel controls */}
            <div className="mt-5 flex items-center justify-between sm:mt-6">
              <div className="flex items-center gap-2">
                {slides.map((_, index) => (
                  <button
                    key={index}
                    type="button"
                    onClick={() => setActiveSlide(index)}
                    aria-label={`Go to slide ${ index + 1 } `}
                    className={`h-1.5 rounded-full transition-all duration-500 sm: h-2 ${
    index === activeSlide
        ? 'w-7 bg-royal-400 sm:w-9'
        : 'w-2 bg-white/20 hover:bg-white/40'
} `}
                  />
                ))}
              </div>

              <div className="flex items-center gap-2">
                <button
                  type="button"
                  onClick={previousSlide}
                  aria-label="Previous slide"
                  className="flex h-9 w-9 items-center justify-center rounded-lg border border-white/10 bg-white/5 text-white/70 transition-colors hover:bg-white/10 hover:text-white"
                >
                  <ChevronLeft size={17} />
                </button>

                <button
                  type="button"
                  onClick={nextSlide}
                  aria-label="Next slide"
                  className="flex h-9 w-9 items-center justify-center rounded-lg border border-white/10 bg-white/5 text-white/70 transition-colors hover:bg-white/10 hover:text-white"
                >
                  <ChevronRight size={17} />
                </button>
              </div>
            </div>
          </div>

          {/* RIGHT VISUAL */}
          <div className="relative min-w-0">
            <div className="relative mx-auto aspect-square w-full max-w-[520px]">
              <div
                className={`absolute inset-0 bg-gradient-to-tr ${ slide.accent } `}
              />

              <div className="absolute inset-4 rounded-3xl border border-white/10 bg-white/[0.03] backdrop-blur-sm sm:inset-6 lg:inset-8" />

              <div className="absolute inset-0 flex items-center justify-center">
                <div className="relative flex h-[72%] w-[72%] items-center justify-center rounded-3xl border border-white/10 bg-navy-900/80 shadow-2xl backdrop-blur-md">
                  <div className="text-center">
                    <div className="mx-auto mb-4 flex h-16 w-16 items-center justify-center rounded-2xl bg-royal-500/10 sm:h-20 sm:w-20">
                      <Trophy
                        size={30}
                        className="text-royal-400 sm:h-9 sm:w-9"
                      />
                    </div>

                    <div className="text-2xl font-bold text-white sm:text-3xl">
                      Chess
                    </div>

                    <div className="mt-1 text-xs text-white/40 sm:text-sm">
                      Play. Learn. Master.
                    </div>
                  </div>
                </div>
              </div>

              {/* Decorative elements */}
              <div className="absolute left-2 top-1/4 h-2 w-2 rounded-full bg-royal-400/70 sm:left-4" />
              <div className="absolute right-4 top-1/3 h-3 w-3 rounded-full bg-blue-400/50 sm:right-8" />
              <div className="absolute bottom-1/4 left-1/4 h-2 w-2 rounded-full bg-purple-400/50" />
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}

