
import React, { useEffect, useState } from 'react';
import multiplayer from '../../lib/multiplayer/supabase-multiplayer';
import SuggestionList from './SuggestionList';

export default function InviteModal({ onClose }: { onClose: () => void }) {
  const [toUser, setToUser] = useState('');
  const [sending, setSending] = useState(false);
  const [suggestions, setSuggestions] = useState<any[]>([]);
  const [loadingSuggestions, setLoadingSuggestions] = useState(false);

  useEffect(() => {
    let cancelled = false;

    const load = async () => {
      const q = toUser.trim();

      if (!q || q.length < 1) {
        setSuggestions([]);
        setLoadingSuggestions(false);
        return;
      }

      setLoadingSuggestions(true);

      try {
        const res = await multiplayer.searchPlayers(q, 6);

        if (!cancelled) {
          setSuggestions(res || []);
        }
      } catch (e) {
        if (!cancelled) {
          setSuggestions([]);
        }
      } finally {
        if (!cancelled) {
          setLoadingSuggestions(false);
        }
      }
    };

    const t = setTimeout(load, 150);

    return () => {
      cancelled = true;
      clearTimeout(t);
    };
  }, [toUser]);

  const send = async () => {
    setSending(true);

    try {
      const { supabase } = await import('../../lib/supabase');

      const u = await supabase.auth.getUser();
      const myId = u.data?.user?.id;

      let targetId = toUser;

      if (!/^[0-9a-fA-F-]{8,}$/.test(toUser)) {
        const byU = await supabase
          .from('profiles')
          .select('id,username')
          .eq('username', toUser)
          .maybeSingle();

        if (byU?.data?.id) {
          targetId = byU.data.id;
        }
      }

      if (targetId && myId && targetId === myId) {
        window.dispatchEvent(
          new CustomEvent('app-toast', {
            detail: {
              message: "You can't invite yourself",
              type: 'info',
            },
          }),
        );

        setSending(false);
        return;
      }

      const res = await multiplayer.sendInvite(toUser, {});

      console.log('invite sent', res);

      onClose();
    } catch (e) {
      console.error('invite failed', e);

      window.dispatchEvent(
        new CustomEvent('app-toast', {
          detail: {
            message: 'Failed to send invite',
            type: 'error',
          },
        }),
      );
    } finally {
      setSending(false);
    }
  };

  return (
    <div
      className="
        fixed
        inset-0
        z-[9999]
      "
      role="dialog"
      aria-modal="true"
      aria-label="Send invite"
    >
      {/* Full-screen dark backdrop */}
      <button
        type="button"
        aria-label="Close invite dialog"
        onClick={onClose}
        className="
          absolute
          inset-0
          h-full
          w-full
          cursor-default
          bg-black/80
          backdrop-blur-[2px]
        "
      />

      {/* Left-side drawer */}
      <div
        className="
          absolute
          left-0
          top-0
          flex
          h-full
          w-[min(400px,92vw)]
          flex-col
          overflow-visible
          border-r
          border-white/10
          bg-navy-900
          shadow-[12px_0_40px_rgba(0,0,0,0.45)]
        "
        onMouseDown={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div className="flex shrink-0 items-start justify-between border-b border-white/10 px-4 py-4 sm:px-5">
          <div className="min-w-0">
            <h3 className="text-base font-bold text-white">
              Send Invite
            </h3>

            <p className="mt-1 text-sm text-navy-400">
              Search for a player to invite
            </p>
          </div>

          <button
            type="button"
            onClick={onClose}
            aria-label="Close"
            className="
              ml-3
              grid
              h-8
              w-8
              shrink-0
              place-items-center
              rounded-lg
              text-lg
              text-navy-400
              transition-colors
              hover:bg-white/10
              hover:text-white
            "
          >
            ×
          </button>
        </div>

        {/* Content */}
        <div className="flex-1 overflow-y-auto px-4 py-5 sm:px-5">
          {/* Search */}
          <div className="relative min-w-0">
            <input
              autoFocus
              value={toUser}
              onChange={(e) => setToUser(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === 'Enter' && toUser.trim() && !sending) {
                  send();
                }
              }}
              className="
                block
                w-full
                min-w-0
                rounded-lg
                border
                border-white/10
                bg-navy-700
                px-3
                py-3
                text-sm
                text-white
                outline-none
                placeholder:text-navy-400
                focus:border-blue-500
                focus:ring-1
                focus:ring-blue-500/30
              "
              placeholder="Username, email or ID"
            />

            {loadingSuggestions && (
              <div className="mt-2 text-xs text-navy-400">
                Searching...
              </div>
            )}

            {suggestions.length > 0 && (
              <SuggestionList
                items={suggestions}
                onSelect={async (s) => {
                  try {
                    await multiplayer.sendInvite(s.id, {});

                    window.dispatchEvent(
                      new CustomEvent('app-toast', {
                        detail: {
                          message: 'Invite sent',
                          type: 'success',
                        },
                      }),
                    );

                    onClose();
                  } catch (err) {
                    window.dispatchEvent(
                      new CustomEvent('app-toast', {
                        detail: {
                          message: 'Failed to send invite',
                          type: 'error',
                        },
                      }),
                    );
                  }
                }}
                containerClassName="
                  absolute
                  left-0
                  right-0
                  top-full
                  z-[10000]
                  mt-1
                  min-w-0
                  max-w-full
                  overflow-hidden
                  rounded-lg
                  border
                  border-white/10
                  bg-navy-800
                  shadow-2xl
                "
              />
            )}
          </div>
        </div>

        {/* Actions */}
        <div
          className="
            flex
            shrink-0
            items-center
            justify-start
            gap-2
            border-t
            border-white/10
            bg-navy-900
            px-4
            py-4
            sm:px-5
          "
        >
          <button
            type="button"
            onClick={onClose}
            className="
              rounded-lg
              px-4
              py-2
              text-sm
              text-navy-300
              transition
              hover:bg-navy-700
              hover:text-white
            "
          >
            Cancel
          </button>

          <button
            type="button"
            onClick={send}
            disabled={sending || !toUser.trim()}
            className="
              rounded-lg
              px-4
              py-2
              text-sm
              btn
              btn-primary
              disabled:cursor-not-allowed
              disabled:opacity-50
            "
          >
            {sending ? 'Sending...' : 'Send'}
          </button>
        </div>
      </div>
    </div>
  );
}

