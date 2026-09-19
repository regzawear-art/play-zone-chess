import React, { useEffect, useState } from 'react';
import { createPortal } from 'react-dom';
import { X, Users, Mail, UserPlus } from 'lucide-react';
import useFriends from '../../hooks/useFriends';
import useInvites from '../../hooks/useInvites';
import multiplayer from '../../lib/multiplayer/supabase-multiplayer';
import SuggestionList from './SuggestionList';
import FriendRequestsPanel from './FriendRequestsPanel';
import InvitesInbox from './InvitesInbox';

type Props = {
  onClose?: () => void;
};

function FriendsContent() {
  const { friends } = useFriends();
  const [search, setSearch] = useState('');
  const [results, setResults] = useState<any[]>([]);

  const challenge = async (idOrUsername: string) => {
    try {
      let targetId = idOrUsername;
      if (!/^[0-9a-fA-F-]{8,}$/.test(idOrUsername)) {
        const matches = await multiplayer.searchPlayers(idOrUsername, 1);
        if (matches?.length) targetId = matches[0].id;
      }
      await multiplayer.sendInvite(targetId, { type: 'challenge' });
      window.dispatchEvent(new CustomEvent('app-toast', {
        detail: { message: 'Challenge sent', type: 'success' },
      }));
    } catch (e) {
      console.warn('send invite failed', e);
      window.dispatchEvent(new CustomEvent('app-toast', {
        detail: { message: 'Failed to send challenge', type: 'error' },
      }));
    }
  };

  const onSearch = async (q: string) => {
    setSearch(q);
    if (!q.trim()) {
      setResults([]);
      return;
    }
    try {
      const res = await multiplayer.searchPlayers(q, 6);
      setResults(res || []);
    } catch {
      setResults([]);
    }
  };

  return (
    <div className="space-y-3">
      <div className="rounded-xl border border-white/8 bg-navy-750 p-3">
        <div className="mb-2 flex items-center justify-between">
          <h3 className="text-sm font-bold text-white">Friends</h3>
          <button
            type="button"
            onClick={() => window.dispatchEvent(new CustomEvent('open-add-friend'))}
            title="Add friend"
            aria-label="Add friend"
            className="flex items-center gap-2 text-navy-300 hover:text-white"
          >
            <UserPlus size={14} />
            <span className="text-xs">Add</span>
          </button>
        </div>

        <div className="relative mb-3">
          <input
            value={search}
            onChange={(e) => onSearch(e.target.value)}
            placeholder="Search by username, email or ID"
            className="w-full rounded-md bg-navy-700 px-3 py-2 text-sm text-white outline-none placeholder:text-navy-400"
          />
          {results.length > 0 && (
            <div className="absolute left-0 right-0 top-full z-20 mt-1 rounded border border-white/10 bg-navy-800 shadow-xl">
              <SuggestionList
                items={results}
                onSelect={async (r) => {
                  try {
                    await multiplayer.sendFriendRequest(r.id);
                    setResults([]);
                    setSearch('');
                    window.dispatchEvent(new CustomEvent('app-toast', {
                      detail: { message: 'Friend request sent', type: 'success' },
                    }));
                  } catch (e: any) {
                    window.dispatchEvent(new CustomEvent('app-toast', {
                      detail: {
                        message: e?.message || 'Failed to send friend request',
                        type: 'error',
                      },
                    }));
                  }
                }}
                containerClassName=""
              />
            </div>
          )}
        </div>

        <div className="flex flex-col gap-2">
          {friends.length === 0 && (
            <p className="text-sm text-navy-300">No friends yet</p>
          )}
          {friends.map((f: any) => (
            <div
              key={f.id}
              className="flex min-w-0 flex-col gap-2 rounded-md bg-navy-700 px-3 py-2 sm:flex-row sm:items-center sm:justify-between"
            >
              <div className="min-w-0 flex-1">
                <div className="truncate text-sm font-semibold text-white">
                  {f.username ?? f.id}
                </div>
                <div className="text-xs text-navy-300">{f.status}</div>
              </div>
              <button
                type="button"
                onClick={() => challenge(f.id)}
                className="shrink-0 text-xs text-navy-200 hover:text-white"
              >
                Challenge
              </button>
            </div>
          ))}
        </div>
      </div>

      <div className="rounded-xl border border-white/5 bg-navy-800 p-3">
        <div className="mb-1 text-xs font-semibold text-navy-400">Friend requests</div>
        <FriendRequestsPanel />
      </div>
    </div>
  );
}


function SendInviteContent() {
  const [search, setSearch] = useState('');
  const [results, setResults] = useState<any[]>([]);
  const [sending, setSending] = useState<string | null>(null);

  const onSearch = async (q: string) => {
    setSearch(q);
    if (!q.trim()) {
      setResults([]);
      return;
    }

    try {
      // Search the profiles table, so this can find any player who has
      // registered/logged in, not only people already in the Friends list.
      const res = await multiplayer.searchPlayers(q, 10);
      setResults((res || []).filter((player: any) => player?.id));
    } catch {
      setResults([]);
    }
  };

  const send = async (player: any) => {
    if (!player?.id || sending) return;

    setSending(player.id);
    try {
      await multiplayer.sendInvite(player.id, { type: 'challenge' });
      window.dispatchEvent(new CustomEvent('app-toast', {
        detail: {
          message: `Challenge sent to ${player.username || 'player'}`,
          type: 'success',
        },
      }));
      setResults([]);
      setSearch('');
    } catch (error: any) {
      window.dispatchEvent(new CustomEvent('app-toast', {
        detail: {
          message: error?.message || 'Failed to send challenge',
          type: 'error',
        },
      }));
    } finally {
      setSending(null);
    }
  };

  return (
    <div className="mb-4 rounded-xl border border-white/8 bg-navy-750 p-3">
      <div className="mb-2">
        <h3 className="text-sm font-bold text-white">Invite a player</h3>
        <p className="mt-0.5 text-xs text-navy-300">
          Search any player who has registered on the game and send them a challenge.
        </p>
      </div>

      <div className="relative">
        <input
          value={search}
          onChange={(e) => onSearch(e.target.value)}
          placeholder="Search by username or player ID"
          className="w-full rounded-md bg-navy-700 px-3 py-2 text-sm text-white outline-none placeholder:text-navy-400"
        />

        {results.length > 0 && (
          <div className="absolute left-0 right-0 top-full z-30 mt-1 max-h-64 overflow-y-auto rounded-lg border border-white/10 bg-navy-800 p-1 shadow-2xl">
            {results.map((player: any) => (
              <div
                key={player.id}
                className="flex items-center justify-between gap-3 rounded-md px-3 py-2 hover:bg-navy-700"
              >
                <div className="min-w-0">
                  <div className="truncate text-sm font-semibold text-white">
                    {player.username || player.email || player.id}
                  </div>
                  {player.last_active && (
                    <div className="text-[11px] text-navy-400">Registered player</div>
                  )}
                </div>
                <button
                  type="button"
                  disabled={sending === player.id}
                  onClick={() => send(player)}
                  className="shrink-0 rounded-md bg-white/10 px-3 py-1.5 text-xs font-semibold text-white hover:bg-white/15 disabled:opacity-50"
                >
                  {sending === player.id ? 'Sending…' : 'Invite'}
                </button>
              </div>
            ))}
          </div>
        )}

        {search.trim() && results.length === 0 && (
          <div className="mt-2 text-xs text-navy-400">No registered player found.</div>
        )}
      </div>
    </div>
  );
}

export default function PlayWithFriends({ onClose }: Props) {
  const { invites } = useInvites();
  const [activeTab, setActiveTab] = useState<'friends' | 'invites'>('friends');

  useEffect(() => {
    if (invites.length > 0) setActiveTab('invites');
  }, [invites.length]);

  useEffect(() => {
    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key === 'Escape') onClose?.();
    };
    window.addEventListener('keydown', onKeyDown);
    return () => window.removeEventListener('keydown', onKeyDown);
  }, [onClose]);

  const modal = (
    <div className="fixed inset-0 z-[10000] flex items-center justify-center p-4">
      <button
        type="button"
        aria-label="Close friends"
        className="absolute inset-0 bg-black/70 backdrop-blur-[2px]"
        onClick={onClose}
      />

      <div
        role="dialog"
        aria-modal="true"
        aria-label="Play with friends"
        className="relative z-10 flex max-h-[90vh] w-full max-w-2xl flex-col overflow-hidden rounded-2xl border border-white/10 bg-navy-900 shadow-2xl"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flex shrink-0 items-center justify-between border-b border-white/10 px-4 py-3">
          <div>
            <h2 className="text-base font-bold text-white">Play With Friends</h2>
            <p className="text-xs text-navy-400">Choose a friend to send a challenge</p>
          </div>
          <button
            type="button"
            onClick={(e) => {
              e.stopPropagation();
              onClose?.();
            }}
            aria-label="Close"
            className="grid h-9 w-9 place-items-center rounded-lg text-navy-300 hover:bg-white/10 hover:text-white"
          >
            <X size={18} />
          </button>
        </div>

        <div className="flex shrink-0 border-b border-white/10 px-4 pt-2">
          <button
            type="button"
            onClick={() => setActiveTab('friends')}
            className={`flex items-center gap-2 rounded-t-lg px-4 py-2 text-sm font-semibold ${
              activeTab === 'friends' ? 'bg-navy-700 text-white' : 'text-navy-300 hover:text-white'
            }`}
          >
            <Users size={15} /> Friends
          </button>
          <button
            type="button"
            onClick={() => setActiveTab('invites')}
            className={`relative flex items-center gap-2 rounded-t-lg px-4 py-2 text-sm font-semibold ${
              activeTab === 'invites' ? 'bg-navy-700 text-white' : 'text-navy-300 hover:text-white'
            }`}
          >
            <Mail size={15} /> Invites
            {invites.length > 0 && (
              <span className="ml-1 inline-flex min-w-5 items-center justify-center rounded-full bg-red-500 px-1.5 py-0.5 text-[10px] font-bold text-white">
                {invites.length}
              </span>
            )}
          </button>
        </div>

        <div className="min-h-0 overflow-y-auto p-4">
          {activeTab === 'friends' ? (
            <FriendsContent />
          ) : (
            <><SendInviteContent /><InvitesInbox onClose={undefined} /></>
          )}
        </div>
      </div>
    </div>
  );

  return typeof document !== 'undefined' ? createPortal(modal, document.body) : null;
}
