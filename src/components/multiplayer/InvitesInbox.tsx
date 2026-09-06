
import React, { useEffect, useState } from 'react';
import useInvites from '../../hooks/useInvites';
import multiplayer from '../../lib/multiplayer/supabase-multiplayer';
import { supabase } from '../../lib/supabase';

interface InviteProfile {
  username?: string | null;
  display_name?: string | null;
  avatar_url?: string | null;
}

interface Invite {
  id: string;
  from_user: string;
  payload?: {
    note?: string;
  } | null;
}

type UpdateStatus = 'accepting' | 'rejecting' | 'accepted' | 'rejected';

export default function InvitesInbox({
  onClose,
}: {
  onClose?: () => void;
}) {
  const { invites } = useInvites();

  const [localUpdating, setLocalUpdating] = useState<
    Record<string, UpdateStatus>
  >({});

  const [profiles, setProfiles] = useState<Record<string, InviteProfile>>({});

  /*
   * Load the sender's profile for every invite.
   * Invites contain the UUID, while profiles contain the
   * human-readable username/display name.
   */
  useEffect(() => {
    let cancelled = false;

    const loadProfiles = async () => {
      if (!invites.length) {
        setProfiles({});
        return;
      }

      const userIds = Array.from(
        new Set(
          (invites as Invite[])
            .map((invite) => invite.from_user)
            .filter(Boolean),
        ),
      );

      if (!userIds.length) return;

      try {
        const { data, error } = await supabase
          .from('profiles')
          .select('id, username, display_name, avatar_url')
          .in('id', userIds);

        if (error) {
          console.warn('Failed to load invite profiles', error);
          return;
        }

        if (cancelled) return;

        const profileMap: Record<string, InviteProfile> = {};

        for (const profile of data ?? []) {
          profileMap[profile.id] = {
            username: profile.username,
            display_name: profile.display_name,
            avatar_url: profile.avatar_url,
          };
        }

        setProfiles(profileMap);
      } catch (error) {
        console.warn('Failed to load invite profiles', error);
      }
    };

    loadProfiles();

    return () => {
      cancelled = true;
    };
  }, [invites]);

  const getDisplayName = (invite: Invite) => {
    const profile = profiles[invite.from_user];

    return (
      profile?.display_name ||
      profile?.username ||
      'Chess player'
    );
  };

  const getInitial = (invite: Invite) => {
    const name = getDisplayName(invite);
    return name.charAt(0).toUpperCase();
  };

  const accept = async (id: string) => {
    setLocalUpdating((s) => ({
      ...s,
      [id]: 'accepting',
    }));

    try {
      const game = await multiplayer.acceptInvite(id);

      console.log('accepted invite, created game', game);

      /*
       * Tell App.tsx to open the online game in the
       * same browser tab.
       */
      try {
        const evt = new CustomEvent('online-game-created', {
          detail: game,
        });

        window.dispatchEvent(evt);
      } catch (error) {
        console.warn(
          'failed dispatching online-game-created',
          error,
        );
      }

      window.dispatchEvent(
        new CustomEvent('app-toast', {
          detail: {
            message: 'Accepted invite — opening match',
            type: 'success',
          },
        }),
      );

      setLocalUpdating((s) => ({
        ...s,
        [id]: 'accepted',
      }));

      if (onClose) {
        onClose();
      }
    } catch (error) {
      console.error('accept failed', error);

      setLocalUpdating((s) => {
        const next = { ...s };
        delete next[id];
        return next;
      });

      window.dispatchEvent(
        new CustomEvent('app-toast', {
          detail: {
            message: 'Could not accept invite',
            type: 'error',
          },
        }),
      );
    }
  };

  const reject = async (id: string) => {
    setLocalUpdating((s) => ({
      ...s,
      [id]: 'rejecting',
    }));

    try {
      const { error } = await supabase
        .from('invites')
        .update({ status: 'rejected' })
        .eq('id', id);

      if (error) {
        throw error;
      }

      console.log('rejected', id);

      setLocalUpdating((s) => ({
        ...s,
        [id]: 'rejected',
      }));

      window.dispatchEvent(
        new CustomEvent('app-toast', {
          detail: {
            message: 'Invite rejected',
            type: 'info',
          },
        }),
      );
    } catch (error) {
      console.error('reject failed', error);

      setLocalUpdating((s) => {
        const next = { ...s };
        delete next[id];
        return next;
      });

      window.dispatchEvent(
        new CustomEvent('app-toast', {
          detail: {
            message: 'Could not reject invite',
            type: 'error',
          },
        }),
      );
    }
  };

  return (
    <div className="w-full rounded-xl border border-white/8 bg-navy-750 p-3">
      {/* Header */}
      <div className="mb-3 flex items-center justify-between">
        <div>
          <h3 className="text-sm font-bold text-white">
            Game Invites
          </h3>

          <p className="mt-0.5 text-[11px] text-navy-400">
            {invites.length === 0
              ? 'No pending invites'
              : `${ invites.length } pending invite${ invites.length === 1 ? '' : 's' } `}
          </p>
        </div>

        {onClose && (
          <button
            type="button"
            onClick={onClose}
            className="grid h-7 w-7 place-items-center rounded-lg text-sm text-navy-400 transition-colors hover:bg-navy-600 hover:text-white"
            aria-label="Close invites"
          >
            ×
          </button>
        )}
      </div>

      {/* Scrollable invite list */}
      <div className="max-h-80 space-y-2 overflow-y-auto pr-1">
        {invites.length === 0 && (
          <div className="rounded-lg border border-white/5 bg-navy-700/60 px-3 py-6 text-center">
            <div className="mx-auto mb-2 grid h-10 w-10 place-items-center rounded-full bg-navy-600 text-lg">
              ♟
            </div>

            <p className="text-sm font-semibold text-navy-200">
              No invites
            </p>

            <p className="mt-1 text-xs text-navy-400">
              New game invitations will appear here.
            </p>
          </div>
        )}

        {(invites as Invite[]).map((invite) => {
          const profile = profiles[invite.from_user];
          const status = localUpdating[invite.id];
          const displayName = getDisplayName(invite);
          const avatar = profile?.avatar_url;

          return (
            <div
              key={invite.id}
              className="rounded-xl border border-white/5 bg-navy-700/80 p-3 transition-colors hover:border-white/10"
            >
              {/* Player information */}
              <div className="flex items-start gap-3">
                {avatar ? (
                  <img
                    src={avatar}
                    alt={displayName}
                    className="h-9 w-9 shrink-0 rounded-full object-cover ring-1 ring-white/10"
                  />
                ) : (
                  <div className="grid h-9 w-9 shrink-0 place-items-center rounded-full bg-blue-grad text-xs font-bold text-white">
                    {getInitial(invite)}
                  </div>
                )}

                <div className="min-w-0 flex-1">
                  <div className="truncate text-sm font-bold text-white">
                    {displayName}
                  </div>

                  <div className="mt-0.5 text-xs text-navy-400">
                    wants to play a game with you
                  </div>

                  {invite.payload?.note && (
                    <div className="mt-2 rounded-lg bg-navy-600/70 px-2.5 py-1.5 text-xs text-navy-200">
                      “{invite.payload.note}”
                    </div>
                  )}
                </div>
              </div>

              {/* Actions */}
              <div className="mt-3 flex gap-2">
                {status === 'accepting' ? (
                  <button
                    type="button"
                    disabled
                    className="flex-1 rounded-lg bg-emerald-600/10 px-3 py-2 text-xs font-bold text-emerald-300"
                  >
                    Accepting...
                  </button>
                ) : status === 'rejecting' ? (
                  <button
                    type="button"
                    disabled
                    className="flex-1 rounded-lg bg-red-600/10 px-3 py-2 text-xs font-bold text-red-300"
                  >
                    Rejecting...
                  </button>
                ) : status === 'accepted' ? (
                  <div className="flex-1 rounded-lg bg-emerald-600/10 px-3 py-2 text-center text-xs font-bold text-emerald-300">
                    Accepted
                  </div>
                ) : status === 'rejected' ? (
                  <div className="flex-1 rounded-lg bg-red-600/10 px-3 py-2 text-center text-xs font-bold text-red-300">
                    Rejected
                  </div>
                ) : (
                  <>
                    <button
                      type="button"
                      onClick={() => accept(invite.id)}
                      className="flex-1 rounded-lg bg-emerald-600/10 px-3 py-2 text-xs font-bold text-emerald-300 transition-colors hover:bg-emerald-600/20"
                    >
                      Accept
                    </button>

                    <button
                      type="button"
                      onClick={() => reject(invite.id)}
                      className="flex-1 rounded-lg bg-red-600/10 px-3 py-2 text-xs font-bold text-red-300 transition-colors hover:bg-red-600/20"
                    >
                      Reject
                    </button>
                  </>
                )}
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}

