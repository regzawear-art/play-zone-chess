import React, { useEffect, useState } from 'react';
import { supabase } from '../lib/supabase';
import { OnlineGameView } from '../components/OnlineGameView';
import { useProfile } from '../hooks/useProfile';
import multiplayer from '../lib/multiplayer/supabase-multiplayer';

export default function MatchPage() {
  const params = new URLSearchParams(window.location.search);
  const gameId = params.get('gameId');
  const mode = params.get('mode');
  const [ready, setReady] = useState(false);
  const [config, setConfig] = useState<any>(null);

  useEffect(() => {
    (async () => {
      // ensure user session is available
      const { data: session } = await supabase.auth.getSession();
      if (!session?.user) {
        // try to detect session in URL fragments
        // fallback: wait a bit for auth to be established (user may be signing in)
        await new Promise((r) => setTimeout(r, 500));
      }

      try {
        if (gameId) {
          // join the game row if needed
          const game = await multiplayer.joinOnlineGame(gameId);
          const { data: me } = await supabase.auth.getUser();
          const uid = me.data?.user?.id;
          const isHost = game.white_id === uid;
          setConfig({
            gameId: game.id,
            roomId: game.id,
            isHost,
            userId: uid,
            playerColor: isHost ? 'w' : 'b',
            timeControl: (game.time_control as any) || '3min',
            customMinutes: 5,
          });
        } else if (mode === 'ai') {
          // local AI match (not implemented fully) - create a minimal wrapper to reuse OnlineGameView is out of scope
          // For now show message
          setConfig({ mode: 'ai' });
        }
        setReady(true);
      } catch (e) {
        // eslint-disable-next-line no-console
        console.error('match init failed', e);
        setReady(true);
      }
    })();
  }, [gameId, mode]);

  if (!ready) return <div className="min-h-screen flex items-center justify-center text-white">Loading match…</div>;

  if (config?.mode === 'ai') return <div className="min-h-screen flex items-center justify-center text-white">AI match not implemented</div>;

  if (!config) return <div className="min-h-screen flex items-center justify-center text-white">Match not found</div>;

  return (
    <div className="min-h-screen bg-navy-800">
      <OnlineGameView
        config={config}
        themeId={localStorage.getItem('boardTheme') || 'default'}
        onThemeChange={() => {}}
        onExit={() => { window.close(); }}
        onRematch={() => { window.location.reload(); }}
      />
    </div>
  );
}
