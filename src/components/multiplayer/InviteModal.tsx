
import React, { useEffect, useState } from 'react';
import multiplayer from '../../lib/multiplayer/supabase-multiplayer';
import SuggestionList from './SuggestionList';

export default function InviteModal({ onClose }: { onClose: () => void }) {
  const [toUser, setToUser] = useState('');
  const [sending, setSending] = useState(false);
  const [suggestions, setSuggestions] = useState<any[]>([]);
  const [loadingSuggestions, setLoadingSuggestions] = useState(false);
  const [focusedSuggestion, setFocusedSuggestion] = useState<number>(-1);

  useEffect(() => {
    let cancelled = false;

    const load = async () => {
      const q = toUser.trim();

      if (!q || q.length < 1) {
        setSuggestions([]);
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

      // Get current user
      const u = await supabase.auth.getUser();
      const myId = u.data?.user?.id;

      // Resolve target id
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

      // Prevent self-invite
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
        fixed inset-0 z-50
        flex items-center justify-center
        bg-black/50
        px-3 py-4
        sm:px-4
      "
      onMouseDown={(e) => {
        if (e.target === e.currentTarget) {
          onClose();
        }
      }}
    >
      <div
        className="
          relative
          w-full
          max-w-md
          min-w-0
          overflow-visible
          rounded-xl
          bg-navy-800
          p-4
          shadow-xl
          sm:p-5
        "
        onMouseDown={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div className="mb-5 min-w-0">
          <h3 className="text-base font-bold text-white">
            Send Invite
          </h3>

          <p className="mt-1 text-sm text-navy-400">
            Search for a player to invite
          </p>
        </div>

        {/* Search */}
        <div className="relative min-w-0">
          <input
            value={toUser}
            onChange={(e) => setToUser(e.target.value)}
            className="
              block
              w-full
              min-w-0
              rounded-lg
              border
              border-transparent
              bg-navy-700
              px-3
              py-2.5
              text-sm
              text-white
              outline-none
              placeholder:text-navy-400
              focus:border-blue-500
            "
            placeholder="Username, email or ID"
          />

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
                z-50
                mt-1
                min-w-0
                max-w-full
                overflow-hidden
              "
            />
          )}
        </div>

        {/* Actions */}
        <div className="mt-5 flex min-w-0 justify-end gap-2">
          <button
            type="button"
            onClick={onClose}
            className="
              shrink-0
              rounded-lg
              px-4
              py-2
              text-sm
              text-navy-300
              transition
              hover:bg-navy-700
            "
          >
            Cancel
          </button>

          <button
            type="button"
            onClick={send}
            disabled={sending}
            className="
              shrink-0
              rounded-lg
              px-4
              py-2
              text-sm
              btn
              btn-primary
            "
          >
            {sending ? 'Sending...' : 'Send'}
          </button>
        </div>
      </div>
    </div>
  );
}

