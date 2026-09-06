import { useEffect, useState } from 'react';
import multiplayer from '../lib/multiplayer/supabase-multiplayer';

export function useFriends() {
  const [friends, setFriends] = useState<any[]>([]);

  useEffect(() => {
    let mounted = true;
    (async () => {
      try {
        const list = await multiplayer.listFriends();
        if (mounted) setFriends(list as any[]);
      } catch (e) {
        // eslint-disable-next-line no-console
        console.warn('failed to list friends', e);
      }
    })();
    return () => { mounted = false; };
  }, []);

  return { friends };
}

export default useFriends;
