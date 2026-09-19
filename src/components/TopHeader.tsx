
import { useEffect, useState } from 'react';
import {
  Crown,
  Home,
  Gamepad2,
  Trophy,
  Users,
  User,
  LogOut,
  Menu,
  X,
  Wallet,
  Settings as SettingsIcon,
  CreditCard,
  Gift,
} from 'lucide-react';

import PlayWithFriends from './multiplayer/PlayWithFriends';
import { SoundControls } from './SoundControls';
import { formatCurrency, getStoredCurrency } from '@/data/countries';
import type { AppUser } from '@/lib/supabase';

interface NavLink {
  id: string;
  label: string;
  icon: typeof Home;
}

const NAV_LINKS: NavLink[] = [
  { id: 'home', label: 'Home', icon: Home },
  { id: 'play', label: 'Play', icon: Gamepad2 },
  { id: 'leaderboard', label: 'Leaderboard', icon: Trophy },
  { id: 'clubs', label: 'Clubs', icon: Users },
  { id: 'pricing', label: 'Pricing', icon: CreditCard },
  { id: 'referral', label: 'Refer', icon: Gift },
];

interface Props {
  active: string;
  onNavigate: (id: string) => void;
  user: AppUser | null;
  onLogin: () => void;
  onLogout: () => void;
  onWallet: () => void;
  walletBalanceInr?: number;
}

export function TopHeader({
  active,
  onNavigate,
  user,
  onLogin,
  onLogout,
  onWallet,
  walletBalanceInr,
}: Props) {
  const [scrolled, setScrolled] = useState(false);
  const [mobileOpen, setMobileOpen] = useState(false);
  const [userOpen, setUserOpen] = useState(false);
  const [friendsOpen, setFriendsOpen] = useState(false);
  const [unreadInvites] = useState<number>(0);

  useEffect(() => {
    const onScroll = () => setScrolled(window.scrollY > 12);

    onScroll();

    window.addEventListener('scroll', onScroll, { passive: true });

    return () => {
      window.removeEventListener('scroll', onScroll);
    };
  }, []);

  const go = (id: string) => {
    onNavigate(id);
    setMobileOpen(false);
  };

  const initial = user?.email?.charAt(0).toUpperCase() ?? 'U';

  return (
    <>
      {/* =========================================================
          HEADER
         ========================================================= */}
      <header
        className={`sticky top-0 z-50 w-full border-b border-white / 5 transition-all duration-300 ${
    scrolled
        ? 'bg-navy-900 shadow-lg shadow-black/20'
        : 'bg-navy-900'
} `}
      >
        <div className="mx-auto flex h-14 w-full min-w-0 items-center gap-1 px-3 sm:px-4 lg:px-6">
          {/* =====================================================
              LOGO
             ===================================================== */}
          <button
            type="button"
            onClick={() => go('home')}
            className="mr-2 flex shrink-0 items-center gap-2"
            aria-label="Gambit Royale home"
          >
            <span className="relative grid h-8 w-8 shrink-0 place-items-center rounded-lg bg-blue-grad shadow-glow-sm">
              <Crown size={16} className="text-white" />
            </span>

            <span className="hidden flex-col leading-none sm:flex">
              <span className="font-display text-sm font-extrabold tracking-tight text-white">
                Gambit
              </span>

              <span className="font-display text-[8px] font-semibold uppercase tracking-[0.2em] text-royal-400">
                Royale
              </span>
            </span>
          </button>

          {/* =====================================================
              DESKTOP NAV
             ===================================================== */}
          <nav className="hidden min-w-0 items-center gap-0.5 lg:flex">
            {NAV_LINKS.map((link) => {
              const Icon = link.icon;
              const isActive = active === link.id;

              return (
                <button
                  key={link.id}
                  type="button"
                  onClick={() => go(link.id)}
                  className={`relative flex items-center gap-1.5 rounded-lg px-3 py-1.5 text-[13px] font-semibold transition-all duration-200 ${
    isActive
        ? 'bg-royal-500/15 text-royal-400'
        : 'text-navy-300 hover:bg-white/5 hover:text-white'
} `}
                >
                  <Icon size={15} />
                  <span>{link.label}</span>
                </button>
              );
            })}
          </nav>

          {/* =====================================================
              SPACER
             ===================================================== */}
          <div className="min-w-0 flex-1" />

          {/* =====================================================
              RIGHT CLUSTER
             ===================================================== */}
          <div className="flex shrink-0 items-center gap-1.5">
            {/* Sound */}
            <div className="hidden lg:block">
              <SoundControls />
            </div>

            {/* ===================================================
                WALLET
               =================================================== */}
            {user && (
              <button
                type="button"
                onClick={onWallet}
                className="hidden items-center gap-1.5 rounded-lg border border-royal-500/20 bg-navy-800 px-2.5 py-1.5 text-xs font-bold text-royal-400 transition-all hover:border-royal-500/40 hover:shadow-glow-sm sm:inline-flex"
              >
                <Wallet size={14} />

                {walletBalanceInr !== undefined && (
                  <span className="tabular-nums">
                    {formatCurrency(
                      walletBalanceInr,
                      getStoredCurrency(),
                    )}
                  </span>
                )}
              </button>
            )}

            {/* ===================================================
                FRIENDS
               =================================================== */}
            {user && (
              <div className="relative">
                <button
                  type="button"
                  onClick={() => {
                    setFriendsOpen((v) => !v);
                    setUserOpen(false);
                  }}
                  className="relative ml-1 flex h-9 w-9 items-center justify-center rounded-lg border border-white/10 bg-navy-800 transition-all hover:border-white/20 hover:bg-navy-700"
                  title="Friends"
                  aria-label="Friends"
                  aria-expanded={friendsOpen}
                >
                  <Users size={16} className="text-navy-100" />

                  {unreadInvites > 0 && (
                    <span className="absolute -right-1 -top-1 inline-flex h-4 w-4 items-center justify-center rounded-full bg-red-500 text-[10px] font-bold text-white">
                      {unreadInvites}
                    </span>
                  )}
                </button>
                {friendsOpen && (
                  <PlayWithFriends onClose={() => setFriendsOpen(false)} />
                )}
              </div>
            )}

            {/* ===================================================
                USER MENU
               =================================================== */}
            {user ? (
              <div className="relative hidden sm:block">
                <button
                  type="button"
                  onClick={() => {
                    setUserOpen((o) => !o);
                    setFriendsOpen(false);
                  }}
                  className="flex items-center gap-1.5 rounded-lg border border-white/10 bg-navy-800 py-1 pl-1 pr-2.5 transition-all hover:border-white/20"
                >
                  <span className="grid h-6 w-6 place-items-center rounded-md bg-blue-grad text-[10px] font-bold text-white">
                    {initial}
                  </span>

                  <span className="max-w-[100px] truncate text-xs font-bold text-navy-100">
                    {user.email}
                  </span>
                </button>

                {userOpen && (
                  <>
                    <button
                      type="button"
                      aria-label="Close user menu"
                      className="fixed inset-0 z-[90]"
                      onClick={() => setUserOpen(false)}
                    />

                    <div className="absolute right-0 top-10 z-[100] w-44 overflow-hidden rounded-xl border border-white/10 bg-navy-800 p-1 shadow-2xl animate-pop-in">
                      <button
                        type="button"
                        onClick={() => {
                          go('profile');
                          setUserOpen(false);
                        }}
                        className="flex w-full items-center gap-2 rounded-lg px-3 py-2 text-left text-sm font-semibold text-navy-100 transition-colors hover:bg-navy-600"
                      >
                        <User
                          size={14}
                          className="text-navy-300"
                        />
                        Profile
                      </button>

                      <button
                        type="button"
                        onClick={() => {
                          go('settings');
                          setUserOpen(false);
                        }}
                        className="flex w-full items-center gap-2 rounded-lg px-3 py-2 text-left text-sm font-semibold text-navy-100 transition-colors hover:bg-navy-600"
                      >
                        <SettingsIcon
                          size={14}
                          className="text-navy-300"
                        />
                        Settings
                      </button>

                      <div className="my-0.5 h-px bg-white/10" />

                      <button
                        type="button"
                        onClick={() => {
                          onLogout();
                          setUserOpen(false);
                        }}
                        className="flex w-full items-center gap-2 rounded-lg px-3 py-2 text-left text-sm font-semibold text-red-400 transition-colors hover:bg-red-500/10"
                      >
                        <LogOut size={14} />
                        Log Out
                      </button>
                    </div>
                  </>
                )}
              </div>
            ) : (
              <button
                type="button"
                onClick={onLogin}
                className="hidden items-center gap-1.5 rounded-lg bg-blue-grad px-3.5 py-1.5 text-xs font-bold text-white shadow-glow-sm transition-transform hover:translate-y-[-1px] sm:inline-flex"
              >
                Log In
              </button>
            )}
            {/* ===================================================
                MOBILE MENU BUTTON
               =================================================== */}
            <button
              type="button"
              onClick={() => setMobileOpen((o) => !o)}
              className="grid h-9 w-9 shrink-0 place-items-center rounded-lg border border-white/10 bg-navy-800 text-white lg:hidden"
              aria-label="Menu"
              aria-expanded={mobileOpen}
            >
              {mobileOpen ? <X size={16} /> : <Menu size={16} />}
            </button>
          </div>
        </div>

        {/* =======================================================
            MOBILE MENU
           ======================================================= */}
        {mobileOpen && (
          <>
            {/* Mobile menu backdrop */}
            <button
              type="button"
              aria-label="Close menu"
              onClick={() => setMobileOpen(false)}
              className="fixed inset-0 top-14 z-[60] bg-black/60 lg:hidden"
            />

            {/* Mobile menu */}
            <div className="relative z-[70] border-t border-white/5 bg-navy-900 px-3 pb-3 pt-2 shadow-2xl lg:hidden">
              <ul className="flex flex-col gap-0.5">
                {NAV_LINKS.map((link) => {
                  const Icon = link.icon;
                  const isActive = active === link.id;

                  return (
                    <li key={link.id}>
                      <button
                        type="button"
                        onClick={() => go(link.id)}
                        className={`flex w-full items-center gap-3 rounded-lg px-3 py-2.5 text-sm font-semibold transition-colors ${
    isActive
        ? 'bg-royal-500/15 text-royal-400'
        : 'text-navy-300 hover:bg-navy-700 hover:text-white'
} `}
                      >
                        <Icon size={18} />
                        {link.label}
                      </button>
                    </li>
                  );
                })}

                <li>
                  <button
                    type="button"
                    onClick={() => go('profile')}
                    className="flex w-full items-center gap-3 rounded-lg px-3 py-2.5 text-sm font-semibold text-navy-300 transition-colors hover:bg-navy-700 hover:text-white"
                  >
                    <User size={18} />
                    Profile
                  </button>
                </li>

                <li>
                  <button
                    type="button"
                    onClick={() => go('settings')}
                    className="flex w-full items-center gap-3 rounded-lg px-3 py-2.5 text-sm font-semibold text-navy-300 transition-colors hover:bg-navy-700 hover:text-white"
                  >
                    <SettingsIcon size={18} />
                    Settings
                  </button>
                </li>
              </ul>

              <div className="mt-2 flex items-center gap-2">
                <SoundControls />

                {user ? (
                  <button
                    type="button"
                    onClick={() => {
                      onLogout();
                      setMobileOpen(false);
                    }}
                    className="ml-auto flex items-center gap-2 rounded-lg px-3 py-2 text-sm font-semibold text-red-400 transition-colors hover:bg-red-500/10"
                  >
                    <LogOut size={16} />
                    Log Out
                  </button>
                ) : (
                  <button
                    type="button"
                    onClick={() => {
                      onLogin();
                      setMobileOpen(false);
                    }}
                    className="ml-auto flex items-center gap-2 rounded-lg bg-blue-grad px-4 py-2 text-sm font-bold text-white shadow-glow-sm"
                  >
                    Log In
                  </button>
                )}
              </div>
            </div>
          </>
        )}
      </header>
    </>
  );
}

