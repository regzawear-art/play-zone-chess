import React, { useCallback, useEffect, useState, useMemo } from 'react';
import { supabase } from '../lib/supabase';
import { OnlineGameView } from '../components/OnlineGameView';
import { useProfile } from '../hooks/useProfile';
import multiplayer from '../lib/multiplayer/supabase-multiplayer';
import { ChessBoard } from '../components/ChessBoard';
import { PlayerHUD } from '../components/PlayerHUD';
import { useChess } from '../hooks/useChess';
import type { Color } from '../game/types';

// Styles: ensure match page fills viewport and board fits without vertical scroll
const pageStyle: React.CSSProperties = {
  height: '100vh',
  margin: 0,
  display: 'flex',
  alignItems: 'center',
  justifyContent: 'center',
  background: 'var(--bg-color, #0b1220)',
};

const contentStyle: React.CSSProperties = {
  width: '100%',
  height: '100%',
  display: 'grid',
  gridTemplateColumns: '1fr 360px',
  gap: '18px',
  alignItems: 'center',
  justifyItems: 'center',
  boxSizing: 'border-box',
  padding: '20px',
};

const boardWrapStyle: React.CSSProperties = {
  width: '100%',
  height: '100%',
  display: 'flex',
  alignItems: 'center',
  justifyContent: 'center',
};

// Compute board size to fit viewport: min(viewportHeight - padding, viewportWidth - sidebar - padding)
function computeBoardSize(): number {
  const vh = window.innerHeight;
  const vw = window.innerWidth;
  const sidebar = 360 + 40; // sidebar + gaps
  const size = Math.min(vh - 40, vw - sidebar);
  return Math.max(320, Math.floor(size));
}

export default function MatchPage() {
  const params = new URLSearchParams(window.location.search);
  const gameId = params.get('gameId');
  const mode = params.get('mode');
  const [ready, setReady] = useState(false);
  const [config, setConfig] = useState<any>(null);
  const [boardSize, setBoardSize] = useState<number>(() => computeBoardSize());

  useEffect(() => {
    const onResize = () => setBoardSize(computeBoardSize());
    window.addEventListener('resize', onResize);
    return () => window.removeEventListener('resize', onResize);
  }, []);

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
            type: 'online',
            gameId: game.id,
            roomId: game.id,
            isHost,
            userId: uid,
            playerColor: (isHost ? 'w' : 'b') as Color,
            timeControl: (game.time_control as any) || '3min',
            customMinutes: 5,
          });
        } else if (mode === 'ai') {
          // local AI match: configure from query params (difficulty, time control)
          const difficulty = (params.get('difficulty') || 'intermediate') as any;
          const timeControl = (params.get('time') || '3min') as any;
          setConfig({ type: 'ai', mode: 'ai', timeControl, difficulty, playerColor: (params.get('color') || 'w') as Color });
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

  if (!config) return <div className="min-h-screen flex items-center justify-center text-white">Match not found</div>;

  if (config.type === 'ai') {
    // AI match: use useChess hook to run a local game and render board + moves
    const aiOpts = { playerColor: config.playerColor as Color, opponentColor: config.playerColor === 'w' ? 'b' : 'w', vsComputer: true, timeControl: config.timeControl || '3min', customMinutes: config.customMinutes || 5, opponentName: 'Computer', opponentAvatar: '', opponentFlag: '', aiDifficulty: config.difficulty || 'intermediate' };
      const chess = useChess(aiOpts as any);
      useEffect(() => {
          if (game.pendingResult) {
              setShowGameOver(true);
          }
      }, [game.pendingResult]);
    return (
      <div style={pageStyle as any}>
        <div style={contentStyle as any}>
          <div style={boardWrapStyle as any}>
            <div style={{ width: boardSize, height: boardSize }}>
              <ChessBoard
                board={chess.board}
                selected={chess.selected}
                legal={chess.legal}
                lastMove={chess.lastMove}
                status={chess.status}
                orientation={chess.playerColor}
                turn={chess.state.turn}
                onSquareClick={chess.selectSquare}
                onDrop={chess.dropPiece}
                promotion={chess.promotion}
                onChoosePromotion={chess.choosePromotion}
                onCancelPromotion={chess.cancelPromotion}
                thinking={chess.thinking}
                onSizeChange={() => {}}
              />
            </div>
          </div>
          <div style={{ width: 360, height: '100%', overflow: 'auto' }}>
            <PlayerHUD player={{ name: 'You', avatar: '', flag: '', rating: 0, online: true, capturedPieces: [], materialDiff: 0 }} ms={chess.whiteMs} active={chess.running && chess.state.turn === 'w'} running={chess.running} align="bottom" />
            <div style={{ padding: 12 }}>
              {/* move list */}
              {/* derive SAN list from chess.history */}
              {/* fallback: map history entries if present */}
              {chess && chess.history && (
                // @ts-ignore
                <div>
                  {/* lightweight move list */}
                  {/* Avoid pulling new dependency; reuse MoveList if available */}
                  {/* eslint-disable-next-line @typescript-eslint/no-var-requires */}
                  {(() => {
                    try {
                      // dynamic require to avoid static import cycles in pages
                      const MoveList = require('../components/MoveList').default;
                      // @ts-ignore
                      const san = (chess.history || []).map((h: any) => h.san);
                      // @ts-ignore
                      return <MoveList moves={san} />;
                    } catch (e) {
                      return <div className="text-sm text-navy-300">Move list unavailable</div>;
                    }
                  })()}
                </div>
              )}
            </div>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div style={pageStyle as any}>
      <div style={contentStyle as any}>
        <div style={boardWrapStyle as any}>
          <div style={{ width: boardSize, height: boardSize }}>
            <OnlineGameView
              config={config}
              themeId={localStorage.getItem('boardTheme') || 'default'}
              onThemeChange={() => {}}
              onExit={() => { window.close(); }}
              onRematch={() => { window.location.reload(); }}
            />
          </div>
        </div>
        <div style={{ width: 360, height: '100%', overflow: 'auto' }}>
          {/* Right sidebar: moves, chat, controls */}
          <div style={{ padding: 12 }}>
            {/* use MoveList for online games by reading game.history if available */}
            {/* eslint-disable-next-line @typescript-eslint/no-var-requires */}
            {(() => {
              try {
                const MoveList = require('../components/MoveList').default;
                // attempt to read move SANs from localStorage or placeholder
                // OnlineGameView exposes game.history via window event; fallback to empty
                const stored: string[] = [];
                return <MoveList moves={stored} />;
              } catch (e) {
                return <div className="p-4 text-white">Moves and chat will be here</div>;
              }
            })()}
          </div>
        </div>
      </div>
    </div>
  );
}
