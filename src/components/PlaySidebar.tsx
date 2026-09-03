import { useState } from 'react';
import { Crown, Home, Gamepad2, Puzzle, GraduationCap, MoreHorizontal, User, LogOut, Wallet, ChevronRight, Settings as SettingsIcon, Trophy, CreditCard, Gift, Users } from 'lucide-react';
import { SoundControls } from './SoundControls';
import type { AppUser } from '@/lib/supabase';

interface NavItem {
  id: string;
  label: string;
  icon: typeof Home;
}

const PRIMARY_ITEMS: NavItem[] = [
  { id: 'home', label: 'Home', icon: Home },
  { id: 'play', label: 'Play', icon: Gamepad2 },
  { id: 'leaderboard', label: 'Puzzles', icon: Puzzle },
  { id: 'clubs', label: 'Learn', icon: GraduationCap },
];

const MORE_ITEMS: NavItem[] = [
  { id: 'leaderboard', label: 'Leaderboard', icon: Trophy },
  { id: 'clubs', label: 'Clubs', icon: Users },
  { id: 'pricing', label: 'Pricing', icon: CreditCard },
  { id: 'referral', label: 'Refer & Earn', icon: Gift },
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

export function PlaySidebar({ active, onNavigate, user, onLogin, onLogout, onWallet }: Props) {
  const [moreOpen, setMoreOpen] = useState(false);
  const [userMenuOpen, setUserMenuOpen] = useState(false);
  const initial = user?.email?.charAt(0).toUpperCase() ?? 'U';

  return (
    <nav className="flex h-full flex-col border-r border-white/5 bg-navy-750">
      {/* Logo */}
      <div className="flex shrink-0 items-center gap-2.5 px-4 py-4">
        <button onClick={() => onNavigate('home')} className="flex items-center gap-2.5" aria-label="Gambit Royale home">
          <span className="relative grid h-9 w-9 shrink-0 place-items-center rounded-xl bg-blue-grad shadow-glow-sm">
            <Crown size={18} className="text-white" />
          </span>
          <span className="hidden flex-col leading-none lg:flex">
            <span className="font-display text-base font-extrabold tracking-tight text-white">Gambit</span>
            <span className="font-display text-[9px] font-semibold uppercase tracking-[0.2em] text-royal-400">Royale</span>
          </span>
        </button>
      </div>

      {/* Primary nav */}
      <div className="flex flex-col gap-0.5 px-2">
        {PRIMARY_ITEMS.map((item) => {
          const Icon = item.icon;
          const isActive = active === item.id;
          return (
            <button
              key={item.id}
              onClick={() => onNavigate(item.id)}
              className={`group flex items-center gap-3 rounded-xl px-3 py-2.5 transition-all duration-200 ${
                isActive
                  ? 'bg-royal-500/15 text-royal-400 ring-1 ring-royal-500/25'
                  : 'text-navy-300 hover:bg-navy-600/60 hover:text-white'
              }`}
            >
              <Icon size={20} className="shrink-0" />
              <span className="hidden text-sm font-bold lg:inline">{item.label}</span>
            </button>
          );
        })}

        {/* More — expandable */}
        <button
          onClick={() => setMoreOpen((o) => !o)}
          className={`group flex items-center gap-3 rounded-xl px-3 py-2.5 transition-all duration-200 ${
            moreOpen ? 'bg-navy-600/60 text-white' : 'text-navy-300 hover:bg-navy-600/60 hover:text-white'
          }`}
        >
          <MoreHorizontal size={20} className="shrink-0" />
          <span className="hidden text-sm font-bold lg:inline">More</span>
          <ChevronRight
            size={14}
            className={`hidden ml-auto transition-transform lg:block ${moreOpen ? 'rotate-90' : ''}`}
          />
        </button>

        {moreOpen && (
          <div className="flex flex-col gap-0.5 pb-1 pl-2">
            {MORE_ITEMS.map((item) => {
              const Icon = item.icon;
              const isActive = active === item.id;
              return (
                <button
                  key={item.id}
                  onClick={() => { onNavigate(item.id); setMoreOpen(false); }}
                  className={`group flex items-center gap-3 rounded-lg px-3 py-2 transition-all duration-200 ${
                    isActive
                      ? 'bg-royal-500/10 text-royal-400'
                      : 'text-navy-400 hover:bg-navy-600/40 hover:text-white'
                  }`}
                >
                  <Icon size={16} className="shrink-0" />
                  <span className="hidden text-xs font-semibold lg:inline">{item.label}</span>
                </button>
              );
            })}
          </div>
        )}
      </div>

      {/* Spacer */}
      <div className="flex-1" />

      {/* Sound controls */}
      <div className="hidden items-center justify-center px-2 py-2 lg:flex">
        <SoundControls />
      </div>

      {/* Wallet button (if logged in) */}
      {user && (
        <div className="hidden px-2 lg:block">
          <button
            onClick={onWallet}
            className="flex w-full items-center gap-3 rounded-xl border border-royal-500/20 bg-navy-700 px-3 py-2.5 text-sm font-bold text-royal-400 transition-all hover:border-royal-500/40 hover:shadow-glow-sm"
          >
            <Wallet size={18} className="shrink-0" />
            <span>Wallet</span>
          </button>
        </div>
      )}

      {/* Auth area */}
      <div className="relative shrink-0 px-2 pb-3 pt-2">
        {user ? (
          <>
            <button
              onClick={() => setUserMenuOpen((o) => !o)}
              className="flex w-full items-center gap-3 rounded-xl border border-white/8 bg-navy-700 px-3 py-2.5 transition-all hover:border-white/15"
            >
              <span className="grid h-8 w-8 shrink-0 place-items-center rounded-full bg-blue-grad text-xs font-bold text-white">
                {initial}
              </span>
              <span className="hidden max-w-[100px] truncate text-xs font-bold text-navy-100 lg:inline">
                {user.email}
              </span>
              <ChevronRight
                size={14}
                className={`hidden ml-auto text-navy-400 transition-transform lg:block ${userMenuOpen ? 'rotate-90' : ''}`}
              />
            </button>
            {userMenuOpen && (
              <>
                <div className="fixed inset-0 z-10" onClick={() => setUserMenuOpen(false)} />
                <div className="absolute bottom-full left-2 right-2 z-20 mb-2 overflow-hidden rounded-2xl border border-white/10 bg-navy-700 p-1.5 shadow-card-lg backdrop-blur-xl animate-pop-in">
                  <button
                    onClick={() => { onNavigate('profile'); setUserMenuOpen(false); }}
                    className="flex w-full items-center gap-2.5 rounded-xl px-3 py-2.5 text-left text-sm font-semibold text-navy-100 transition-colors hover:bg-navy-600"
                  >
                    <User size={16} className="text-navy-300" />
                    Profile
                  </button>
                  <button
                    onClick={() => { onNavigate('settings'); setUserMenuOpen(false); }}
                    className="flex w-full items-center gap-2.5 rounded-xl px-3 py-2.5 text-left text-sm font-semibold text-navy-100 transition-colors hover:bg-navy-600"
                  >
                    <SettingsIcon size={16} className="text-navy-300" />
                    Settings
                  </button>
                  <div className="my-1 h-px bg-white/10" />
                  <button
                    onClick={() => { onLogout(); setUserMenuOpen(false); }}
                    className="flex w-full items-center gap-2.5 rounded-xl px-3 py-2.5 text-left text-sm font-semibold text-red-400 transition-colors hover:bg-red-500/10"
                  >
                    <LogOut size={16} />
                    Log Out
                  </button>
                </div>
              </>
            )}
          </>
        ) : (
          <button
            onClick={onLogin}
            className="flex w-full items-center justify-center gap-2 rounded-xl bg-blue-grad px-3 py-2.5 text-sm font-bold text-white shadow-glow-sm transition-transform hover:translate-y-[-1px]"
          >
            Log In
          </button>
        )}
      </div>
    </nav>
  );
}
