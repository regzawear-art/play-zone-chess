
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

import FriendList from './multiplayer/FriendList';
import FriendRequestsPanel from './multiplayer/FriendRequestsPanel';
import InviteModal from './multiplayer/InviteModal';
import InvitesInbox from './multiplayer/InvitesInbox';
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
  const [inviteOpen, setInviteOpen] = useState(false);
  const [activeTab, setActiveTab] = useState<'friends' | 'invites'>('friends');
  const [copyMsg, setCopyMsg] = useState<string | null>(null);
  const [unreadInvites, setUnreadInvites] = useState<number>(0);

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
    <header
      className={`fixed inset - x - 0 top - 0 z - 50 transition - all duration - 300 ${
    scrolled
        ? 'bg-navy-800/95 shadow-lg shadow-black/20 backdrop-blur-xl'
        : 'bg-navy-800/80 backdrop-blur-md'
} `}
    >
      <div className="flex h-14 w-full min-w-0 items-center gap-1 px-3 sm:px-4 lg:px-6">
        {/* Logo */}
        <button
          onClick={() => go('home')}
          className="mr-2 flex shrink-0 items-center gap-2"
          aria-label="Gambit Royale home"
        >
          <span className="relative grid h-8 w-8 place-items-center rounded-lg bg-blue-grad shadow-glow-sm">
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

        {/* Desktop nav links */}
        <nav className="hidden items-center gap-0.5 lg:flex">
          {NAV_LINKS.map((link) => {
            const Icon = link.icon;
            const isActive = active === link.id;

            return (
              <button
                key={link.id}
                onClick={() => go(link.id)}
                className={`relative flex items - center gap - 1.5 rounded - lg px - 3 py - 1.5 text - [13px] font - semibold transition - all duration - 200 ${
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

        {/* Spacer */}
        <div className="min-w-0 flex-1" />

        {/* Right cluster */}
        <div className="flex shrink-0 items-center gap-1.5">
          <div className="hidden lg:block">
            <SoundControls />
          </div>

          {/* Wallet */}
          {user && (
            <button
              onClick={onWallet}
              className="hidden items-center gap-1.5 rounded-lg border border-royal-500/20 bg-navy-700/80 px-2.5 py-1.5 text-xs font-bold text-royal-400 transition-all hover:border-royal-500/40 hover:shadow-glow-sm sm:inline-flex"
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

          {/* =====================================================
              FRIENDS BUTTON + PANEL
             ===================================================== */}
          {user && (
            <div className="relative">
              <button
                onClick={() => setFriendsOpen((v) => !v)}
                className="relative ml-2 flex items-center gap-1.5 rounded-lg border border-white/8 bg-navy-700/80 py-1 pl-2 pr-2.5 transition-all hover:border-white/15"
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
                <>
                  {/* Backdrop */}
                  <div
                    className="fixed inset-0 z-10"
                    onClick={() => setFriendsOpen(false)}
                  />

                  {/* Friends popup */}
                  <div
                    className="
                      fixed
                      left-3
                      right-3
                      top-16
                      z-20
                      max-h-[calc(100vh-80px)]
                      min-w-0
                      overflow-y-auto
                      overflow-x-hidden
                      rounded-xl
                      border
                      border-white/10
                      bg-navy-700
                      p-3
                      shadow-card-lg
                      backdrop-blur-xl
                      animate-pop-in

                      sm:absolute
                      sm:left-auto
                      sm:right-0
                      sm:top-12
                      sm:w-[min(32rem,calc(100vw-2rem))]
                      sm:max-h-[calc(100vh-80px)]
                      sm:overflow-y-auto
                    "
                  >
                    {/* Header */}
                    <div className="mb-3 flex min-w-0 flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
                      {/* Tabs */}
                      <div className="flex min-w-0 items-center gap-1">
                        <button
                          type="button"
                          onClick={() => setActiveTab('friends')}
                          className={`rounded - md px - 3 py - 1 text - sm ${
    activeTab === 'friends'
        ? 'bg-navy-600 text-white'
        : 'text-navy-300 hover:bg-white/5'
} `}
                        >
                          Friends
                        </button>

                        <button
                          type="button"
                          onClick={() => setActiveTab('invites')}
                          className={`rounded - md px - 3 py - 1 text - sm ${
    activeTab === 'invites'
        ? 'bg-navy-600 text-white'
        : 'text-navy-300 hover:bg-white/5'
} `}
                        >
                          Invites
                        </button>
                      </div>

                      {/* Actions */}
                      <div className="flex min-w-0 flex-wrap items-center gap-2">
                        <button
                          type="button"
                          onClick={() => setInviteOpen(true)}
                          className="shrink-0 whitespace-nowrap text-xs text-navy-200 hover:text-white"
                        >
                          New Invite
                        </button>

                        <button
                          type="button"
                          onClick={async () => {
                            try {
                              await navigator.clipboard?.writeText(
                                user?.id || '',
                              );

                              setCopyMsg('Copied');

                              setTimeout(
                                () => setCopyMsg(null),
                                2000,
                              );

                              window.dispatchEvent(
                                new CustomEvent('app-toast', {
                                  detail: {
                                    message:
                                      'Your ID copied to clipboard',
                                    type: 'success',
                                  },
                                }),
                              );
                            } catch (e) {
                              console.warn(
                                'copy failed',
                                e,
                              );

                              setCopyMsg('Failed');

                              setTimeout(
                                () => setCopyMsg(null),
                                2000,
                              );

                              window.dispatchEvent(
                                new CustomEvent('app-toast', {
                                  detail: {
                                    message: 'Copy failed',
                                    type: 'error',
                                  },
                                }),
                              );
                            }
                          }}
                          className="shrink-0 whitespace-nowrap text-xs text-navy-200 hover:text-white"
                        >
                          {copyMsg ?? 'Copy my ID'}
                        </button>
                      </div>
                    </div>

                    {/* Main content */}
                    <div
                      className="
                        flex
                        w-full
                        min-w-0
                        flex-col
                        gap-3
                        sm:flex-row
                      "
                    >
                      {/* Friends */}
                      <div className="w-full min-w-0 sm:w-1/2">
                        <div className="max-h-72 min-w-0 max-w-full overflow-x-hidden overflow-y-auto">
                          <FriendList compact />
                        </div>
                      </div>

                      {/* Invites / Requests */}
                      <div className="w-full min-w-0 sm:w-1/2">
                        <div className="max-h-72 min-w-0 max-w-full overflow-x-hidden overflow-y-auto">
                          {activeTab === 'invites' ? (
                            <InvitesInbox
                              onClose={() =>
                                setFriendsOpen(false)
                              }
                            />
                          ) : (
                            <div className="rounded-lg p-2 text-sm text-navy-300">
                              Select Invites to view incoming
                              invites.
                            </div>
                          )}

                          {/* Friend requests */}
                          <div className="mt-2">
                            <div className="mb-1 text-xs text-navy-400">
                              Friend requests
                            </div>

                            <div className="min-w-0 max-w-full overflow-hidden rounded-lg border border-white/5 bg-navy-700/60 p-1">
                              <FriendRequestsPanel />
                            </div>
                          </div>
                        </div>
                      </div>
                    </div>
                  </div>
                </>
              )}
            </div>
          )}

          {/* Auth */}
          {user ? (
            <div className="relative hidden sm:block">
              <button
                onClick={() => setUserOpen((o) => !o)}
                className="flex items-center gap-1.5 rounded-lg border border-white/8 bg-navy-700/80 py-1 pl-1 pr-2.5 transition-all hover:border-white/15"
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
                  <div
                    className="fixed inset-0 z-10"
                    onClick={() => setUserOpen(false)}
                  />

                  <div className="absolute right-0 top-10 z-20 w-44 overflow-hidden rounded-xl border border-white/10 bg-navy-700 p-1 shadow-card-lg backdrop-blur-xl animate-pop-in">
                    <button
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
              onClick={onLogin}
              className="hidden items-center gap-1.5 rounded-lg bg-blue-grad px-3.5 py-1.5 text-xs font-bold text-white shadow-glow-sm transition-transform hover:translate-y-[-1px] sm:inline-flex"
            >
              Log In
            </button>
          )}

          {inviteOpen && (
            <InviteModal
              onClose={() => setInviteOpen(false)}
            />
          )}

          {/* Mobile hamburger */}
          <button
            onClick={() => setMobileOpen((o) => !o)}
            className="grid h-9 w-9 place-items-center rounded-lg border border-white/10 bg-navy-700/80 text-white lg:hidden"
            aria-label="Menu"
          >
            {mobileOpen ? <X size={16} /> : <Menu size={16} />}
          </button>
        </div>
      </div>

      {/* Mobile dropdown */}
      {mobileOpen && (
        <div className="border-t border-white/5 bg-navy-800/98 px-3 pb-3 pt-2 backdrop-blur-xl lg:hidden">
          <ul className="flex flex-col gap-0.5">
            {NAV_LINKS.map((link) => {
              const Icon = link.icon;
              const isActive = active === link.id;

              return (
                <li key={link.id}>
                  <button
                    onClick={() => go(link.id)}
                    className={`flex w - full items - center gap - 3 rounded - lg px - 3 py - 2.5 text - sm font - semibold transition - colors ${
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
                onClick={() => go('profile')}
                className="flex w-full items-center gap-3 rounded-lg px-3 py-2.5 text-sm font-semibold text-navy-300 transition-colors hover:bg-navy-700 hover:text-white"
              >
                <User size={18} />
                Profile
              </button>
            </li>

            <li>
              <button
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
      )}
    </header>
  );
}

