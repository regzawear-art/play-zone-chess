import { useEffect, useState } from 'react';
import multiplayer from '../lib/multiplayer/supabase-multiplayer';

export function useInvites() {
    const [invites, setInvites] = useState<any[]>([]);

    useEffect(() => {
        let unsub: (() => void) | null = null;
        let mounted = true;

        const loadInvites = async () => {
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
                    return;
                }

                if (mounted) {
                    setInvites(data || []);

                    try {
                        const evt = new CustomEvent('invites-updated', {
                            detail: {
                                count: (data || []).length,
                                invites: data || [],
                            },
                        });

                        window.dispatchEvent(evt);
                    } catch (e) {
                        console.warn('failed to dispatch invites-updated event', e);
                    }
                }
            } catch (e) {
                console.warn('failed to load initial invites', e);
            }
        };

        const init = async () => {
            await loadInvites();

            unsub = multiplayer.subscribeToInvites(async (msg) => {
                console.log('[invites] event', msg);

                try {
                    const { supabase } = await import('../lib/supabase');

                    const { data: userData } = await supabase.auth.getUser();
                    const uid = userData?.user?.id;

                    if (!uid) return;

                    const { data, error } = await supabase
                        .from('invites')
                        .select('*')
                        .eq('to_user', uid)
                        .eq('status', 'pending')
                        .order('created_at', { ascending: false });

                    if (error) {
                        console.warn('failed to refresh invites', error);
                        return;
                    }

                    if (mounted) {
                        setInvites(data || []);

                        try {
                            const evt = new CustomEvent('invites-updated', {
                                detail: {
                                    count: (data || []).length,
                                    invites: data || [],
                                },
                            });

                            window.dispatchEvent(evt);
                        } catch (e) {
                            console.warn('failed to dispatch invites-updated event', e);
                        }
                    }

                    // If this notification represents an accepted invite,
                    // notify the app so the sender can open the game.
                    try {
                        if (
                            msg?.eventType === 'UPDATE' &&
                            msg.new &&
                            msg.new.status === 'accepted' &&
                            msg.new.game_id
                        ) {
                            const event = new CustomEvent('invite-accepted', {
                                detail: {
                                    invite: msg.new,
                                },
                            });

                            window.dispatchEvent(event);
                        }
                    } catch (e) {
                        console.warn('failed to dispatch invite-accepted event', e);
                    }
                } catch (e) {
                    console.warn('invite refresh error', e);
                }
            });
        };

        init();

        return () => {
            mounted = false;

            if (unsub) {
                unsub();
                unsub = null;
            }
        };
    }, []);

    return { invites };
}

export default useInvites;