import { useEffect, useState } from 'react';
import multiplayer from '../lib/multiplayer/supabase-multiplayer';

export function useInvites() {
  const [invites, setInvites] = useState<any[]>([]);

  useEffect(() => {
    let unsub: (() => void) | null = null;
    const init = async () => {
      // load initial invites for current user
      try {
        const sup = await import('../lib/supabase');
        const u = await sup.supabase.auth.getUser();
        const uid = u.data?.user?.id;
        if (uid) {
          const { data } = await sup.supabase.from('invites').select('*').eq('to_user', uid).eq('status', 'pending').order('created_at', { ascending: false });
          if (data) setInvites(data as any[]);
        }
      } catch (e) {
        // eslint-disable-next-line no-console
        console.warn('failed to load initial invites', e);
      }

      // subscribe to invite events
      unsub = multiplayer.subscribeToInvites(async (msg) => {
        // simple refresh strategy: reload latest invites for current user
        // eslint-disable-next-line no-console
        console.log('[invites] event', msg);
          try {
            const u = await (await import('../lib/supabase')).supabase.auth.getUser();
            const uid = u.data?.user?.id;
            if (!uid) return;
            const { data, error } = await (await import('../lib/supabase')).supabase.from('invites').select('*').eq('to_user', uid).eq('status', 'pending').order('created_at', { ascending: false });
          if (error) {
            // eslint-disable-next-line no-console
            console.warn('failed to refresh invites', error);
            return;
          }
          setInvites(data || []);
          // notify app about invite list updates (unread badge)
          try {
            const evt = new CustomEvent('invites-updated', { detail: { count: (data || []).length, invites: data || [] } });
            window.dispatchEvent(evt);
          } catch (e) {
            // eslint-disable-next-line no-console
            console.warn('failed to dispatch invites-updated', e);
          }
          // if this notification represents an accepted invite, notify app so sender can open the game
          try {
            if (msg?.eventType === 'UPDATE' && msg.new && msg.new.status === 'accepted' && msg.new.game_id) {
              const detail = { invite: msg.new };
              const e = new CustomEvent('invite-accepted', { detail });
              window.dispatchEvent(e);
            }
          } catch (e) {
            // eslint-disable-next-line no-console
            console.warn('failed to dispatch invite-accepted event', e);
          }
        } catch (e) {
          // eslint-disable-next-line no-console
          console.warn('invite refresh error', e);
        }
      });
    };
    init();
    return () => { if (unsub) unsub(); };
  }, []);

  return { invites };
}

export default useInvites;
