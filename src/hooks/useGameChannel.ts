import { useEffect } from 'react';
import multiplayer from '../lib/multiplayer/supabase-multiplayer';

export function useGameChannel(gameId: string, onUpdate: (msg: any) => void) {
  useEffect(() => {
    if (!gameId) return;
    const unsub = multiplayer.subscribeToGame(gameId, (msg) => onUpdate(msg));
    return () => { if (unsub) unsub(); };
  }, [gameId, onUpdate]);
}

export default useGameChannel;
