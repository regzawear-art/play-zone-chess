import { Crown, Twitter, Github, Youtube, Instagram, Send } from 'lucide-react';
import { supabase } from '@/lib/supabase';

const COLUMNS = [
  {
    title: 'Play',
    links: [
      { label: 'Quick Match', action: 'play' },
      { label: 'Tournaments', action: 'tournaments' },
      { label: 'Puzzles', action: 'puzzles' },
      { label: 'Computer', action: 'play' },
    ],
  },
  {
    title: 'Community',
    links: [
      { label: 'Leaderboard', action: 'leaderboard' },
      { label: 'Clubs', action: 'clubs' },
      { label: 'Forums', action: 'forums' },
      { label: 'Events', action: 'events' },
    ],
  },
  {
    title: 'Company',
    links: [
      { label: 'About', action: 'about' },
      { label: 'Careers', action: 'careers' },
      { label: 'Blog', action: 'blog' },
      { label: 'Press Kit', action: 'press' },
    ],
  },
  {
    title: 'Support',
    links: [
      { label: 'Help Center', action: 'faq' },
      { label: 'Fair Play', action: 'rules' },
      { label: 'Contact', action: 'contact' },
      { label: 'Status', action: 'status' },
    ],
  },
];

const SOCIALS = [
  { icon: Twitter, label: 'Twitter', href: '#' },
  { icon: Instagram, label: 'Instagram', href: '#' },
  { icon: Youtube, label: 'YouTube', href: '#' },
  { icon: Github, label: 'GitHub', href: '#' },
  { icon: Send, label: 'Telegram', href: '#' },
];

interface Props {
  onNavigate: (id: string) => void;
  onFooterPage: (page: string) => void;
}

export function Footer({ onNavigate, onFooterPage }: Props) {
  const handleLink = (action: string) => {
    switch (action) {
      case 'play': onNavigate('play'); break;
      case 'leaderboard': onNavigate('leaderboard'); break;
      case 'clubs': onNavigate('clubs'); break;
      case 'about': onFooterPage('about'); break;
      case 'faq': onFooterPage('faq'); break;
      case 'contact': onFooterPage('contact'); break;
      case 'rules': onFooterPage('rules'); break;
      case 'tournaments':
      case 'puzzles':
      case 'forums':
      case 'events':
      case 'careers':
      case 'blog':
      case 'press':
      case 'status':
        onFooterPage(action); break;
      default: break;
    }
  };

  return (
    <footer className="relative mt-16 overflow-hidden bg-navy-grad text-white">
      <div className="absolute inset-0 bg-hero-radial opacity-50" />
      <div className="pointer-events-none absolute -left-10 bottom-0 select-none text-[160px] leading-none text-white/5">{'\u265A'}</div>
      <div className="pointer-events-none absolute right-10 top-10 select-none text-[100px] leading-none text-white/5">{'\u265E'}</div>

      <div className="relative w-full px-4 py-12 sm:px-6 lg:px-8 sm:py-14">
        <div className="grid gap-10 lg:grid-cols-[1.4fr_2fr]">
          {/* brand */}
          <div>
            <div className="flex items-center gap-2.5">
              <span className="grid h-11 w-11 place-items-center rounded-xl bg-blue-grad shadow-glow-sm">
                <Crown size={22} className="text-white" />
              </span>
              <div className="leading-none">
                <p className="font-display text-xl font-extrabold">Gambit Royale</p>
                <p className="font-display text-[10px] font-semibold uppercase tracking-[0.25em] text-royal-300">
                  Premium Chess
                </p>
              </div>
            </div>
            <p className="mt-4 max-w-sm text-sm leading-relaxed text-royal-100/80">
              Play, compete, and climb the ranks on the world's most beautiful chess platform. Built for
              players of every level — from first move to grandmaster.
            </p>
            {/* newsletter */}
            <form
              className="mt-6 flex max-w-sm gap-2"
              onSubmit={async (e) => {
                e.preventDefault();
                const input = (e.currentTarget.querySelector('input[type="email"]') as HTMLInputElement);
                if (input?.value.trim()) {
                  try {
                    await supabase.from('contact_submissions').insert({
                      name: 'Newsletter',
                      email: input.value.trim(),
                      message: 'Newsletter subscription',
                    });
                  } catch { /* ignore */ }
                  input.value = '';
                  input.placeholder = 'Subscribed!';
                }
              }}
            >
              <input
                type="email"
                placeholder="Get chess tips in your inbox"
                className="min-w-0 flex-1 rounded-full border border-white/15 bg-white/10 px-4 py-2.5 text-sm text-white placeholder:text-royal-200/60 outline-none transition-all focus:border-royal-400 focus:bg-white/15"
              />
              <button className="rounded-full bg-blue-grad px-5 py-2.5 text-sm font-bold shadow-glow-sm transition-transform hover:translate-y-[-2px]">
                Join
              </button>
            </form>
            <div className="mt-6 flex items-center gap-2">
              {SOCIALS.map((s) => {
                const Icon = s.icon;
                return (
                  <a
                    key={s.label}
                    href={s.href}
                    aria-label={s.label}
                    className="grid h-10 w-10 place-items-center rounded-full border border-white/15 bg-white/10 text-white transition-all hover:border-royal-400 hover:bg-blue-grad hover:shadow-glow-sm"
                  >
                    <Icon size={17} />
                  </a>
                );
              })}
            </div>
          </div>

          {/* link columns */}
          <div className="grid grid-cols-2 gap-8 sm:grid-cols-4">
            {COLUMNS.map((col) => (
              <div key={col.title}>
                <p className="font-display text-sm font-bold uppercase tracking-wide text-royal-200">{col.title}</p>
                <ul className="mt-3 space-y-2.5">
                  {col.links.map((l) => (
                    <li key={l.label}>
                      <button
                        onClick={() => handleLink(l.action)}
                        className="text-sm text-royal-100/75 transition-colors hover:text-white"
                      >
                        {l.label}
                      </button>
                    </li>
                  ))}
                </ul>
              </div>
            ))}
          </div>
        </div>

        <div className="mt-12 flex flex-col items-center justify-between gap-4 border-t border-white/10 pt-6 text-center sm:flex-row sm:text-left">
          <p className="text-xs text-royal-200/70">© {new Date().getFullYear()} Gambit Royale. All rights reserved.</p>
          <div className="flex flex-wrap items-center justify-center gap-4 text-xs text-royal-200/70">
            <button onClick={() => onFooterPage('privacy')} className="transition-colors hover:text-white">Privacy</button>
            <button onClick={() => onFooterPage('terms')} className="transition-colors hover:text-white">Terms</button>
            <button onClick={() => onFooterPage('faq')} className="transition-colors hover:text-white">FAQ</button>
            <button onClick={() => onFooterPage('rules')} className="transition-colors hover:text-white">Rules</button>
            <button onClick={() => onFooterPage('contact')} className="transition-colors hover:text-white">Contact</button>
          </div>
        </div>
      </div>
    </footer>
  );
}
