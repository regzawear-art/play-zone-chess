import React, { useEffect, useState } from 'react';
import { Search, Send, X, UserRound, Loader2 } from 'lucide-react';
import multiplayer from '../../lib/multiplayer/supabase-multiplayer';
import SuggestionList from './SuggestionList';

export default function InviteModal({ onClose }: { onClose: () => void }) {
  const [toUser, setToUser] = useState('');
  const [sending, setSending] = useState(false);
  const [suggestions, setSuggestions] = useState<any[]>([]);
  const [loadingSuggestions, setLoadingSuggestions] = useState(false);

  useEffect(() => {
    let cancelled = false;
    const q = toUser.trim();

    if (!q) {
      setSuggestions([]);
      setLoadingSuggestions(false);
      return;
    }

    setLoadingSuggestions(true);
    const timer = window.setTimeout(async () => {
      try {
        const result = await multiplayer.searchPlayers(q, 6);
        if (!cancelled) setSuggestions(result || []);
      } finally {
        if (!cancelled) setLoadingSuggestions(false);
      }
    }, 200);

    return () => {
      cancelled = true;
      window.clearTimeout(timer);
    };
  }, [toUser]);

  const send = async () => {
    const value = toUser.trim();
    if (!value || sending) return;

    setSending(true);
    try {
      await multiplayer.sendInvite(value, { type: 'challenge' });
      window.dispatchEvent(new CustomEvent('app-toast', {
        detail: { message: 'Game invite sent', type: 'success' },
      }));
      onClose();
    } catch (error) {
      console.error('[InviteModal] send failed:', error);
      window.dispatchEvent(new CustomEvent('app-toast', {
        detail: {
          message: error instanceof Error ? error.message : 'Failed to send invite',
          type: 'error',
        },
      }));
    } finally {
      setSending(false);
    }
  };

  const selectPlayer = (player: any) => {
    setToUser(player.username || player.display_name || player.id || '');
    setSuggestions([]);
  };

  return (
    <div
      className="fixed inset-0 z-[9999] grid place-items-center bg-black/75 p-4 backdrop-blur-md"
      role="dialog"
      aria-modal="true"
      aria-label="Send game invite"
      onMouseDown={(event) => {
        if (event.target === event.currentTarget) onClose();
      }}
    >
      <div className="relative w-full max-w-md overflow-hidden rounded-2xl border border-white/10 bg-navy-800 shadow-2xl">
        <div className="border-b border-white/10 bg-navy-900/70 px-5 py-4">
          <button
            type="button"
            onClick={onClose}
            className="absolute right-4 top-4 grid h-8 w-8 place-items-center rounded-lg text-navy-300 hover:bg-white/10 hover:text-white"
            aria-label="Close invite dialog"
          >
            <X size={17} />
          </button>
          <div className="flex items-center gap-3 pr-10">
            <div className="grid h-10 w-10 place-items-center rounded-xl bg-blue-grad text-white shadow-glow-sm">
              <Send size={17} />
            </div>
            <div>
              <h3 className="font-display text-lg font-extrabold text-white">Invite a player</h3>
              <p className="mt-0.5 text-xs text-navy-400">Find a player and challenge them to a game.</p>
            </div>
          </div>
        </div>

        <div className="p-5">
          <label className="mb-2 block text-xs font-semibold uppercase tracking-wide text-navy-400">
            Username or player ID
          </label>
          <div className="relative">
            <Search size={16} className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-navy-400" />
            <input
              autoFocus
              value={toUser}
              onChange={(event) => setToUser(event.target.value)}
              onKeyDown={(event) => {
                if (event.key === 'Escape') onClose();
                if (event.key === 'Enter') void send();
              }}
              className="w-full rounded-xl border border-white/10 bg-navy-700 py-3 pl-10 pr-10 text-sm text-white outline-none placeholder:text-navy-500 focus:border-royal-400/50 focus:ring-2 focus:ring-royal-400/10"
              placeholder="Search username…"
            />
            {loadingSuggestions && (
              <Loader2 size={15} className="absolute right-3 top-1/2 -translate-y-1/2 animate-spin text-navy-400" />
            )}
          </div>

          {suggestions.length > 0 && (
            <div className="mt-2 overflow-hidden rounded-xl border border-white/10 bg-navy-900 shadow-xl">
              <SuggestionList
                items={suggestions}
                onSelect={selectPlayer}
                containerClassName=""
              />
            </div>
          )}

          {!loadingSuggestions && toUser.trim() && suggestions.length === 0 && (
            <div className="mt-3 flex items-center gap-2 rounded-xl border border-white/5 bg-navy-700/60 px-3 py-2.5 text-xs text-navy-400">
              <UserRound size={14} />
              No matching player found. You can still enter an exact player ID.
            </div>
          )}
        </div>

        <div className="flex items-center justify-end gap-2 border-t border-white/10 bg-navy-900/50 px-5 py-4">
          <button type="button" onClick={onClose} className="rounded-xl px-4 py-2.5 text-sm font-semibold text-navy-300 hover:bg-white/5 hover:text-white">
            Cancel
          </button>
          <button
            type="button"
            onClick={() => void send()}
            disabled={sending || !toUser.trim()}
            className="btn-primary rounded-xl px-5 py-2.5 disabled:cursor-not-allowed disabled:opacity-50"
          >
            <Send size={15} />
            {sending ? 'Sending…' : 'Send Invite'}
          </button>
        </div>
      </div>
    </div>
  );
}
