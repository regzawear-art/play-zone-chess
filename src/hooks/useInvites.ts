import { useEffect, useState } from 'react';
import multiplayer from '../lib/multiplayer/supabase-multiplayer';

export function useInvites() {
    const [invites, setInvites] = useState<any[]>([]);

    useEffect(() => {
        let unsub: (() => void) | null = null;
        let mounted = true;
        let acceptedInitialized = false;
        let pollId: number | null = null;
        const handledAcceptedIds = new Set<string>();

        const dispatchInvitesUpdated = (data: any[]) => {
            if (!mounted) return;
            setInvites(data || []);
            window.dispatchEvent(
                new CustomEvent('invites-updated', {
                    detail: { count: (data || []).length, invites: data || [] },
                }),
            );
        };

        const dispatchAccepted = (invite: any) => {
            const id = invite?.id;
            const gameId = invite?.game_id;

            if (!id || !gameId || invite?.status !== 'accepted') return;

            // Ignore invites we have already processed.
            if (handledAcceptedIds.has(id)) return;

            // Mark as handled BEFORE dispatching anything.
            handledAcceptedIds.add(id);

            console.log('[invites] ACCEPTED INVITE DETECTED:', invite);

            console.log('[invites] DISPATCHING invite-accepted:', {
                inviteId: invite.id,
                gameId: invite.game_id,
                fromUser: invite.from_user,
                toUser: invite.to_user,
            });

            window.dispatchEvent(
                new CustomEvent('invite-accepted', {
                    detail: { invite },
                }),
            );
        };

        const loadInvites = async (initializeAccepted = false) => {
            try {
                const { supabase } = await import('../lib/supabase');
                const { data: userData } = await supabase.auth.getUser();
                const uid = userData?.user?.id;

                if (!uid) {
                    if (mounted) setInvites([]);
                    return;
                }

                const { data, error } = await supabase
                    .from('invites')
                    .select('*')
                    .eq('to_user', uid)
                    .eq('status', 'pending')
                    .order('created_at', { ascending: false });

                if (error) {
                    console.warn('failed to load initial invites', error);
                } else {
                    dispatchInvitesUpdated(data || []);
                }

                // Realtime is not guaranteed for every Supabase deployment because
                // the invites table may not yet be in supabase_realtime. Polling the
                // sender's accepted invites gives the sender a reliable fallback.
                const { data: accepted, error: acceptedError } = await supabase
                    .from('invites')
                    .select('*')
                    .eq('from_user', uid)
                    .eq('status', 'accepted')
                    .not('game_id', 'is', null)
                    .order('created_at', { ascending: false })
                    .limit(20);

                if (acceptedError) {
                    console.warn('failed to check accepted invites', acceptedError);
                } else {
                    if (initializeAccepted || !acceptedInitialized) {
                        for (const invite of accepted || []) {
                            if (invite?.id) handledAcceptedIds.add(invite.id);
                        }
                        acceptedInitialized = true;
                    } else {
                        for (const invite of accepted || []) dispatchAccepted(invite);
                    }
                }
            } catch (e) {
                console.warn('failed to refresh invites', e);
            }
        };

        const init = async () => {
            // Initial load establishes which already-accepted invites should not
            // unexpectedly open an old game.
            await loadInvites(true);

            unsub = multiplayer.subscribeToInvites(async (msg) => {
                console.log('[invites] event', msg);

                try {
                    const event = msg as any;
                    const newInvite = event?.new;

                    // Sender path: immediately react when realtime delivers the
                    // accepted UPDATE. Polling below covers deployments where it does not.
                    if (event?.eventType === 'UPDATE' && newInvite?.status === 'accepted') {
                        const { data: userData } = await (await import('../lib/supabase')).supabase.auth.getUser();
                        const uid = userData?.user?.id;
                        if (uid && newInvite.from_user === uid && newInvite.game_id) {
                            dispatchAccepted(newInvite);
                        }
                    }

                    // Refresh pending invites for the recipient side.
                    await loadInvites(false);
                } catch (e) {
                    console.warn('invite refresh error', e);
                }
            });

            // Reliable fallback for accepted invites.
            if (!mounted) return;
            pollId = window.setInterval(() => {
                void loadInvites(false);
            }, 1500);
        };

        void init();

        return () => {
            mounted = false;
            if (unsub) {
                unsub();
                unsub = null;
            }
            if (pollId !== null) {
                window.clearInterval(pollId);
                pollId = null;
            }
        };
    }, []);

    return { invites };
}

export default useInvites;
