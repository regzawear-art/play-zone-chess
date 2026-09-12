import { useEffect, useRef } from 'react';
import { supabase } from '@/lib/supabase';

// Update profiles.last_active periodically and on visibility change
export default function usePresenceHeartbeat(userId: string | null, intervalMs = 30000) {
  const timerRef = useRef<number | null>(null);

  useEffect(() => {
    if (!userId) return;
    let mounted = true;

    const ping = async () => {
      try {
        await supabase.from('profiles').update({ last_active: new Date().toISOString() }).eq('id', userId);
      } catch (e) {
        // ignore
      }
    };

    ping();
    timerRef.current = window.setInterval(ping, intervalMs);

    const onVisibility = () => {
      if (document.visibilityState === 'visible') ping();
    };
    window.addEventListener('visibilitychange', onVisibility);

    return () => {
      mounted = false;
      if (timerRef.current) window.clearInterval(timerRef.current);
      window.removeEventListener('visibilitychange', onVisibility);
    };
  }, [userId, intervalMs]);
}
