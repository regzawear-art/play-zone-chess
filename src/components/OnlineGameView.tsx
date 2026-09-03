import { useMemo, useState } from 'react';
import type { Color } from '../game/types';
import { ChessBoard } from './ChessBoard';
import { PlayerHUD } from './PlayerHUD';
import { BoardThemeSwitcher } from './BoardThemeSwitcher';
import { GameOverPopup } from './GameOverPopup';
import { formatClock } from '../lib/format';
import { sound } from '../game/sound';
import { Flag, FlipHorizontal, Clock, Wifi, WifiOff, ArrowLeft, RotateCcw } from 'lucide-react';
import { useOnlineGame, type OnlineGameConfig } from '../hooks/useOnlineGame';
import { computeCaptured } from './onlineCaptured';

interface Props {
  config: OnlineGameConfig;
  themeId: string;
  onThemeChange: (id: string) => void;
  onExit: () => void;
  onRematch: () => void;
}

export function OnlineGameView({ config, themeId, onThemeChange, onExit, onRematch }: Props) {
  const game = useOnlineGame(config);
  const [orientation, setOrientation] = useState<Color>(config.playerColor);
  const [showGameOver, setShowGameOver] = useState(false);

  const playerColor = config.playerColor;
  const isMyTurn = game.state.turn === playerColor && game.running;
  const phase = game.status.phase;

  // Track game-over popup visibility
  const gameOver = phase === 'checkmate' || phase === 'stalemate';

  const captured = useMemo(() => computeCaptured(game.board), [game.board]);

  const topPlayer = orientation === 'w'
    ? { name: playerColor === 'w' ? game.opponentName : 'You', avatar: playerColor === 'w' ? game.opponentAvatar : '', flag: '', rating: 0, online: game.opponentConnected, capturedPieces: playerColor === 'w' ? captured.black : captured.white, materialDiff: playerColor === 'w' ? captured.blackDiff : captured.whiteDiff }
    : { name: playerColor === 'b' ? game.opponentName : 'You', avatar: playerColor === 'b' ? game.opponentAvatar : '', flag: '', rating: 0, online: game.opponentConnected, capturedPieces: playerColor === 'b' ? captured.black : captured.white, materialDiff: playerColor === 'b' ? captured.blackDiff : captured.whiteDiff };

  const bottomPlayer = orientation === 'w'
    ? { name: playerColor === 'w' ? 'You' : game.opponentName, avatar: '', flag: '', rating: 0, online: true, capturedPieces: playerColor === 'w' ? captured.white : captured.black, materialDiff: playerColor === 'w' ? captured.whiteDiff : captured.blackDiff }
    : { name: playerColor === 'b' ? 'You' : game.opponentName, avatar: '', flag: '', rating: 0, online: true, capturedPieces: playerColor === 'b' ? captured.white : captured.black, materialDiff: playerColor === 'b' ? captured.whiteDiff : captured.blackDiff };

  const topMs = orientation === 'w' ? game.blackMs : game.whiteMs;
  const bottomMs = orientation === 'w' ? game.whiteMs : game.blackMs;
  const topActive = game.running && game.state.turn !== orientation;
  const bottomActive = game.running && game.state.turn === orientation;

  const statusText = () => {
    if (phase === 'checkmate') {
      const w = game.status.winner === 'w' ? 'White' : 'Black';
      const youWon = game.status.winner === playerColor;
      return youWon ? `Checkmate — You win!` : `Checkmate — ${w} wins`;
    }
    if (phase === 'stalemate') return 'Stalemate — Draw';
    if (phase === 'check') return 'Check!';
    if (!game.opponentConnected) return 'Waiting for opponent to connect…';
    if (isMyTurn) return 'Your move';
    return 'Opponent thinking…';
  };

  const statusColor = () => {
    if (phase === 'checkmate') return game.status.winner === playerColor ? 'text-emerald-400' : 'text-red-400';
    if (phase === 'stalemate') return 'text-navy-200';
    if (phase === 'check') return 'text-red-400';
    if (!game.opponentConnected) return 'text-amber-400';
    if (isMyTurn) return 'text-royal-400';
    return 'text-white';
  };

  return (
    <div className="min-h-[100svh] bg-navy-800 pt-16">
      <div className="mx-auto max-w-5xl px-3 py-4 sm:px-6 sm:py-6">
        {/* Header bar */}
        <div className="mb-3 flex items-center justify-between gap-2 sm:mb-4 sm:gap-3">
          <button onClick={onExit} className="flex items-center gap-1.5 rounded-lg bg-navy-700 px-2.5 py-2 text-xs font-semibold text-white transition-colors hover:bg-navy-600 sm:px-3 sm:text-sm">
            <ArrowLeft size={16} />
            <span className="hidden sm:inline">Exit Game</span>
          </button>

          <div className="flex items-center gap-1.5 sm:gap-2">
            {/* Connection status */}
            <div className={`flex items-center gap-1.5 rounded-full px-2.5 py-1.5 text-[10px] font-bold sm:px-3 sm:text-xs ${
              game.opponentConnected ? 'bg-emerald-500/15 text-emerald-400' : 'bg-amber-500/15 text-amber-400'
            }`}>
              {game.opponentConnected ? <Wifi size={12} /> : <WifiOff size={12} />}
              {game.opponentConnected ? 'Connected' : 'Waiting'}
            </div>

            {/* Room code */}
            <div className="hidden rounded-full bg-navy-700 px-3 py-1.5 text-xs font-bold text-white sm:block">
              Room: {config.roomId.slice(0, 6).toUpperCase()}
            </div>

            <BoardThemeSwitcher currentThemeId={themeId} onThemeChange={onThemeChange} />
          </div>
        </div>

        {/* Status banner */}
        <div className="mb-3 rounded-2xl glass-dark p-2.5 text-center sm:mb-4 sm:p-4">
          <p className={`font-display text-base font-bold sm:text-lg sm:text-xl ${statusColor()}`}>
            {statusText()}
          </p>
        </div>

        <div className="grid gap-4 lg:grid-cols-[1.1fr_0.7fr] lg:gap-8">
          {/* Board column */}
          <div className="flex flex-col gap-2.5 sm:gap-3">
            <PlayerHUD
              player={topPlayer}
              ms={topMs}
              active={topActive}
              running={game.running}
              align="top"
            />

            <ChessBoard
              board={game.board}
              selected={game.selected}
              legal={game.legal}
              lastMove={game.lastMove}
              status={game.status}
              orientation={orientation}
              turn={game.state.turn}
              onSquareClick={game.selectSquare}
              onDrop={game.dropPiece}
              promotion={game.promotion}
              onChoosePromotion={game.choosePromotion}
              onCancelPromotion={game.cancelPromotion}
              showCoords
            />

            <PlayerHUD
              player={bottomPlayer}
              ms={bottomMs}
              active={bottomActive}
              running={game.running}
              align="bottom"
            />

            {/* Controls bar */}
            <div className="flex flex-wrap items-center gap-2 rounded-xl glass p-2.5 shadow-card">
              <button
                onClick={() => setOrientation((o) => (o === 'w' ? 'b' : 'w'))}
                className="flex items-center gap-1.5 rounded-lg bg-navy-600 px-3 py-2 text-xs font-bold text-white transition-colors hover:bg-navy-500"
              >
                <FlipHorizontal size={14} className="text-royal-400" />
                Flip
              </button>
              <button
                onClick={game.resign}
                disabled={!game.running || gameOver}
                className="flex items-center gap-1.5 rounded-lg bg-navy-600 px-3 py-2 text-xs font-bold text-white transition-colors hover:bg-red-600 disabled:opacity-40"
              >
                <Flag size={14} className="text-royal-400" />
                Resign
              </button>
              <div className="ml-auto flex items-center gap-1.5 rounded-lg bg-navy-600 px-3 py-2 text-xs font-bold text-white">
                <Clock size={14} className="text-royal-400" />
                {game.history.length} moves
              </div>
            </div>
          </div>

          {/* Sidebar */}
          <div className="flex flex-col gap-4">
            {/* Move history */}
            <div className="rounded-2xl glass-dark p-4 shadow-card">
              <div className="mb-2 flex items-center justify-between">
                <p className="text-xs font-semibold uppercase tracking-wide text-navy-400">Moves</p>
                <span className="text-xs font-bold text-royal-400">{game.history.length}</span>
              </div>
              <div className="no-scrollbar max-h-64 overflow-y-auto pr-1">
                {game.history.length === 0 ? (
                  <p className="py-4 text-center text-sm text-navy-400">No moves yet — game starting…</p>
                ) : (
                  <ol className="grid grid-cols-[auto_1fr_1fr] gap-x-3 gap-y-1 text-sm">
                    {Array.from({ length: Math.ceil(game.history.length / 2) }).map((_, i) => {
                      const w = game.history[i * 2];
                      const b = game.history[i * 2 + 1];
                      return (
                        <li key={i} className="contents">
                          <span className="font-semibold text-navy-500">{i + 1}.</span>
                          <span className="font-mono font-medium text-white">{w?.san ?? ''}</span>
                          <span className="font-mono font-medium text-white">{b?.san ?? ''}</span>
                        </li>
                      );
                    })}
                  </ol>
                )}
              </div>
            </div>

            {/* Game info */}
            <div className="rounded-2xl glass-dark p-4 shadow-card">
              <p className="mb-3 text-xs font-semibold uppercase tracking-wide text-navy-400">Game Info</p>
              <div className="space-y-2 text-sm">
                <div className="flex justify-between">
                  <span className="text-navy-400">You play</span>
                  <span className="font-bold text-white">{playerColor === 'w' ? 'White' : 'Black'}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-navy-400">Opponent</span>
                  <span className="font-bold text-white">{game.opponentName}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-navy-400">Time control</span>
                  <span className="font-bold text-white">{config.timeControl === 'custom' ? `${config.customMinutes} min` : config.timeControl}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-navy-400">Connection</span>
                  <span className={`font-bold ${game.opponentConnected ? 'text-emerald-400' : 'text-amber-400'}`}>
                    {game.opponentConnected ? 'Live' : 'Reconnecting…'}
                  </span>
                </div>
              </div>
            </div>

            {/* Clocks */}
            <div className="grid grid-cols-2 gap-3">
              <div className={`rounded-2xl p-3 text-center shadow-card transition-all ${game.running && game.state.turn === 'w' ? 'bg-blue-grad text-white shadow-glow' : 'glass-dark text-white opacity-70'}`}>
                <div className="flex items-center justify-center gap-1.5">
                  <span className="h-2 w-2 rounded-full bg-white ring-1 ring-navy-400" />
                  <span className="text-[10px] font-semibold uppercase tracking-wide text-navy-400">White</span>
                </div>
                <p className="mt-1 font-display text-xl font-extrabold tabular-nums">{formatClock(game.whiteMs)}</p>
              </div>
              <div className={`rounded-2xl p-3 text-center shadow-card transition-all ${game.running && game.state.turn === 'b' ? 'bg-blue-grad text-white shadow-glow' : 'glass-dark text-white opacity-70'}`}>
                <div className="flex items-center justify-center gap-1.5">
                  <span className="h-2 w-2 rounded-full bg-navy-900" />
                  <span className="text-[10px] font-semibold uppercase tracking-wide text-navy-400">Black</span>
                </div>
                <p className="mt-1 font-display text-xl font-extrabold tabular-nums">{formatClock(game.blackMs)}</p>
              </div>
            </div>

            {gameOver && (
              <button onClick={onRematch} className="btn-primary w-full">
                <RotateCcw size={16} />
                Rematch
              </button>
            )}
          </div>
        </div>
      </div>

      {gameOver && !showGameOver && (
        <GameOverPopup
          status={game.status}
          ending={phase === 'checkmate' ? 'checkmate' : 'stalemate'}
          onClose={() => setShowGameOver(true)}
          onNewGame={onRematch}
          winnerName={game.status.winner === playerColor ? 'You' : game.opponentName}
          playerWon={game.status.winner === playerColor}
          moves={game.history.length}
          duration="0:00"
          ratingChange={game.status.winner === playerColor ? 8 : phase === 'stalemate' ? 0 : -6}
        />
      )}
    </div>
  );
}
