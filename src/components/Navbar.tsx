import { useEffect, useState } from 'react';
import { Crown, Home, LayoutGrid, Trophy, User, Menu, X, Settings as SettingsIcon, LogOut, Users, Wallet, CreditCard, Gift } from 'lucide-react';
import { SoundControls } from './SoundControls';
import type { AppUser } from '@/lib/supabase';

interface NavLink {
  id: string;
  label: string;
  icon: typeof Home;
}

const LINKS: NavLink[] = [
  { id: 'home', label: 'Home', icon: Home },
  { id: 'play', label: 'Play', icon: LayoutGrid },
  { id: 'leaderboard', label: 'Leaderboard', icon: Trophy },
  { id: 'clubs', label: 'Clubs', icon: Users },
  { id: 'pricing', label: 'Pricing', icon: CreditCard },
  { id: 'referral', label: 'Refer', icon: Gift },
  { id: 'profile', label: 'Profile', icon: User },
  { id: 'settings', label: 'Settings', icon: SettingsIcon },
];

interface Props {
  active: string;
  onNavigate: (id: string) => void;
  user: AppUser | null;
  onLogin: () => void;
  onLogout: () => void;
  onWallet: () => void;
}

export function Navbar({ active, onNavigate, user, onLogin, onLogout, onWallet }: Props) {
  const [scrolled, setScrolled] = useState(false);
  const [menuOpen, setMenuOpen] = useState(false);

  useEffect(() => {
    const onScroll = () => setScrolled(window.scrollY > 24);
    onScroll();
    window.addEventListener('scroll', onScroll, { passive: true });
    return () => window.removeEventListener('scroll', onScroll);
  }, []);

  const go = (id: string) => {
    onNavigate(id);
    setMenuOpen(false);
  };

  return (
    <header
      className={`fixed inset-x-0 top-0 z-40 transition-all duration-500 ${
        scrolled ? 'py-2' : 'py-3'
      }`}
    >
      <div className="mx-auto max-w-7xl px-4 sm:px-6">
        <nav
          className={`flex items-center gap-3 rounded-2xl px-3 py-2.5 transition-all duration-500 sm:px-4 ${
            scrolled ? 'glass shadow-card' : 'bg-navy-800/80 backdrop-blur-md border border-white/5'
          }`}
        >
          {/* Logo — left, flex-1 to balance center */}
          <div className="flex flex-1 items-center justify-start">
            <button onClick={() => go('home')} className="flex items-center gap-2.5" aria-label="Gambit Royale home">
              <span className="relative grid h-10 w-10 place-items-center rounded-xl bg-blue-grad shadow-glow-sm">
                <Crown size={20} className="text-white" />
                <span className="absolute -right-0.5 -top-0.5 h-2.5 w-2.5 rounded-full bg-royal-300 ring-2 ring-navy-800" />
              </span>
              <span className="hidden flex-col leading-none sm:flex">
                <span className="font-display text-lg font-extrabold tracking-tight text-white">Gambit</span>
                <span className="font-display text-[10px] font-semibold uppercase tracking-[0.25em] text-royal-400">Royale</span>
              </span>
            </button>
          </div>

          {/* Desktop links — perfectly centered */}
          <ul className="hidden items-center gap-1 md:flex">
            {LINKS.map((l) => {
              const Icon = l.icon;
              const isActive = active === l.id;
              return (
                <li key={l.id}>
                  <button
                    onClick={() => go(l.id)}
                    className={`group relative flex items-center gap-2 rounded-full px-4 py-2 text-sm font-semibold transition-all duration-300 ${
                      isActive ? 'text-white' : 'text-navy-200 hover:text-royal-400'
                    }`}
                  >
                    {isActive && (
                      <span className="absolute inset-0 rounded-full bg-blue-grad shadow-glow-sm transition-all" />
                    )}
                    <Icon size={16} className="relative z-10" />
                    <span className="relative z-10">{l.label}</span>
                  </button>
                </li>
              );
            })}
          </ul>

          {/* Right cluster — flex-1 to balance center, justify-end */}
          <div className="flex flex-1 items-center justify-end gap-2">
            <SoundControls />
            {user && (
              <button
                onClick={onWallet}
                className="hidden items-center gap-1.5 rounded-full border border-royal-500/25 bg-navy-700 px-3 py-2.5 text-sm font-bold text-royal-400 transition-all hover:border-royal-500/50 hover:shadow-glow-sm sm:inline-flex"
              >
                <Wallet size={16} />
                Wallet
              </button>
            )}

            {/* Auth: user avatar dropdown or Log In button */}
            {user ? (
              <UserMenu email={user.email} onLogout={onLogout} onNavigate={onNavigate} />
            ) : (
              <button
                onClick={onLogin}
                className="hidden items-center gap-2 rounded-full border border-royal-500/30 bg-navy-700 px-4 py-2.5 text-sm font-bold text-royal-400 transition-all hover:border-royal-500/60 hover:shadow-glow-sm sm:inline-flex"
              >
                Log In
              </button>
            )}

            <button
              onClick={() => go('play')}
              className="hidden rounded-full bg-blue-grad px-5 py-2.5 text-sm font-bold text-white shadow-glow-sm transition-all hover:translate-y-[-2px] hover:shadow-glow sm:inline-flex"
            >
              Play Now
            </button>
            {/* Mobile menu toggle */}
            <button
              onClick={() => setMenuOpen((o) => !o)}
              aria-label="Menu"
              className="grid h-10 w-10 place-items-center rounded-full border border-royal-500/25 bg-navy-700 text-white md:hidden"
            >
              {menuOpen ? <X size={18} /> : <Menu size={18} />}
            </button>
          </div>
        </nav>

        {/* Mobile dropdown */}
        {menuOpen && (
          <div className="mt-2 overflow-hidden rounded-2xl glass p-2 shadow-card animate-pop-in md:hidden">
            <ul className="flex flex-col">
              {LINKS.map((l) => {
                const Icon = l.icon;
                const isActive = active === l.id;
                return (
                  <li key={l.id}>
                    <button
                      onClick={() => go(l.id)}
                      className={`flex w-full items-center gap-3 rounded-xl px-4 py-3 text-sm font-semibold transition-colors ${
                        isActive ? 'bg-blue-grad text-white shadow-glow-sm' : 'text-navy-200 hover:bg-navy-600'
                      }`}
                    >
                      <Icon size={18} />
                      {l.label}
                    </button>
                  </li>
                );
              })}
              <li>
                <button
                  onClick={() => go('play')}
                  className="mt-1 flex w-full items-center justify-center gap-2 rounded-xl bg-blue-grad px-4 py-3 text-sm font-bold text-white shadow-glow-sm"
                >
                  Play Now
                </button>
              </li>
              {user ? (
                <li>
                  <button
                    onClick={() => { onLogout(); setMenuOpen(false); }}
                    className="mt-1 flex w-full items-center gap-3 rounded-xl px-4 py-3 text-sm font-semibold text-red-400 transition-colors hover:bg-red-500/10"
                  >
                    <LogOut size={18} />
                    Log Out
                  </button>
                </li>
              ) : (
                <li>
                  <button
                    onClick={() => { onLogin(); setMenuOpen(false); }}
                    className="mt-1 flex w-full items-center justify-center gap-2 rounded-xl border border-royal-500/30 bg-navy-700 px-4 py-3 text-sm font-bold text-royal-400"
                  >
                    Log In / Sign Up
                  </button>
                </li>
              )}
            </ul>
          </div>
        )}
      </div>
    </header>
  );
}

function UserMenu({ email, onLogout, onNavigate }: { email: string; onLogout: () => void; onNavigate: (id: string) => void }) {
  const [open, setOpen] = useState(false);
  const initial = email.charAt(0).toUpperCase() || 'U';

  return (
    <div className="relative hidden sm:block">
      <button
        onClick={() => setOpen((o) => !o)}
        className="flex items-center gap-2 rounded-full border border-royal-500/25 bg-navy-700 py-1.5 pl-1.5 pr-3 transition-all hover:border-royal-500/50 hover:shadow-glow-sm"
      >
        <span className="grid h-7 w-7 place-items-center rounded-full bg-blue-grad text-xs font-bold text-white">
          {initial}
        </span>
        <span className="max-w-[120px] truncate text-xs font-bold text-navy-100">{email}</span>
      </button>
      {open && (
        <>
          <div className="fixed inset-0 z-10" onClick={() => setOpen(false)} />
          <div className="absolute right-0 top-11 z-20 w-48 overflow-hidden rounded-2xl border border-white/10 bg-navy-700 p-1.5 shadow-card-lg backdrop-blur-xl animate-pop-in">
            <button
              onClick={() => { onNavigate('profile'); setOpen(false); }}
              className="flex w-full items-center gap-2.5 rounded-xl px-3 py-2.5 text-left text-sm font-semibold text-navy-100 transition-colors hover:bg-navy-600"
            >
              <User size={16} className="text-navy-300" />
              Profile
            </button>
            <button
              onClick={() => { onNavigate('settings'); setOpen(false); }}
              className="flex w-full items-center gap-2.5 rounded-xl px-3 py-2.5 text-left text-sm font-semibold text-navy-100 transition-colors hover:bg-navy-600"
            >
              <SettingsIcon size={16} className="text-navy-300" />
              Settings
            </button>
            <div className="my-1 h-px bg-white/10" />
            <button
              onClick={() => { onLogout(); setOpen(false); }}
              className="flex w-full items-center gap-2.5 rounded-xl px-3 py-2.5 text-left text-sm font-semibold text-red-400 transition-colors hover:bg-red-500/10"
            >
              <LogOut size={16} />
              Log Out
            </button>
          </div>
        </>
      )}
    </div>
  );
}
