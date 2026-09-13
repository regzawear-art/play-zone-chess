import { useMemo, useState } from 'react';
import type { Color } from '../game/types';
import { ChessBoard } from './ChessBoard';
import { PlayerHUD } from './PlayerHUD';
import { BoardThemeSwitcher } from './BoardThemeSwitcher';
import { GameOverPopup } from './GameOverPopup';
import { formatClock } from '../lib/format';
import {
    Flag,
    FlipHorizontal,
    Clock,
    Wifi,
    WifiOff,
    ArrowLeft,
    RotateCcw,
} from 'lucide-react';
import {
    useOnlineGame,
    type OnlineGameConfig,
} from '../hooks/useOnlineGame';
import { computeCaptured } from './onlineCaptured';

interface Props {
    config: OnlineGameConfig;
    themeId: string;
    onThemeChange: (id: string) => void;
    onExit: () => void;
    onRematch: () => void;
}

export function OnlineGameView({
    config,
    themeId,
    onThemeChange,
    onExit,
    onRematch,
}: Props) {
    const game = useOnlineGame(config);

    const [orientation, setOrientation] = useState<Color>(
        config.playerColor
    );

    const [showGameOver, setShowGameOver] = useState(false);

    const playerColor = config.playerColor;

    const isMyTurn =
        game.state.turn === playerColor && game.running;

    const phase = game.status.phase;
    const resultReason = game.resultReason;

    const gameOver =
        resultReason !== null ||
        phase === 'checkmate' ||
        phase === 'stalemate';

    const captured = useMemo(
        () => computeCaptured(game.board),
        [game.board]
    );

    /*
     * Keep the exact same board sizing philosophy as Bot mode.
     *
     * Bot mode:
     * mobile  -> max 92vw / viewport-height aware
     * desktop -> max 72vh, capped at 760px
     *
     * This prevents the board from becoming so tall that
     * the controls/resign button get pushed below the viewport.
     */
    const topPlayer =
        orientation === 'w'
            ? {
                name:
                    playerColor === 'w'
                        ? game.opponentName
                        : 'You',
                avatar:
                    playerColor === 'w'
                        ? game.opponentAvatar
                        : '',
                flag: '',
                rating: 0,
                online: game.opponentConnected,
                capturedPieces:
                    playerColor === 'w'
                        ? captured.black
                        : captured.white,
                materialDiff:
                    playerColor === 'w'
                        ? captured.blackDiff
                        : captured.whiteDiff,
            }
            : {
                name:
                    playerColor === 'b'
                        ? game.opponentName
                        : 'You',
                avatar:
                    playerColor === 'b'
                        ? game.opponentAvatar
                        : '',
                flag: '',
                rating: 0,
                online: game.opponentConnected,
                capturedPieces:
                    playerColor === 'b'
                        ? captured.black
                        : captured.white,
                materialDiff:
                    playerColor === 'b'
                        ? captured.blackDiff
                        : captured.whiteDiff,
            };

    const bottomPlayer =
        orientation === 'w'
            ? {
                name:
                    playerColor === 'w'
                        ? 'You'
                        : game.opponentName,
                avatar: '',
                flag: '',
                rating: 0,
                online: true,
                capturedPieces:
                    playerColor === 'w'
                        ? captured.white
                        : captured.black,
                materialDiff:
                    playerColor === 'w'
                        ? captured.whiteDiff
                        : captured.blackDiff,
            }
            : {
                name:
                    playerColor === 'b'
                        ? 'You'
                        : game.opponentName,
                avatar: '',
                flag: '',
                rating: 0,
                online: true,
                capturedPieces:
                    playerColor === 'b'
                        ? captured.white
                        : captured.black,
                materialDiff:
                    playerColor === 'b'
                        ? captured.whiteDiff
                        : captured.blackDiff,
            };

    const topMs =
        (orientation === 'w'
            ? game.blackMs
            : game.whiteMs) ?? 0;

    const bottomMs =
        (orientation === 'w'
            ? game.whiteMs
            : game.blackMs) ?? 0;

    const topActive =
        game.running &&
        game.state.turn !== orientation;

    const bottomActive =
        game.running &&
        game.state.turn === orientation;

    const statusText = () => {
        if (resultReason === 'timeout') {
            const youWon = game.status.winner === playerColor;
            return youWon
                ? 'Time — You win!'
                : 'Time — Opponent wins';
        }

        if (resultReason === 'resignation') {
            const youWon = game.status.winner === playerColor;
            return youWon
                ? 'Resignation — You win!'
                : 'Resignation — Opponent wins';
        }

        if (resultReason === 'insufficient_material') {
            return 'Draw — Insufficient material';
        }

        if (resultReason === 'stalemate') {
            return 'Stalemate — Draw';
        }

        if (resultReason === 'checkmate') {
            const w =
                game.status.winner === 'w'
                    ? 'White'
                    : 'Black';

            const youWon =
                game.status.winner === playerColor;

            return youWon
                ? 'Checkmate — You win!'
                : `Checkmate — ${w} wins`;
        }

        if (phase === 'check') {
            return 'Check!';
        }

        if (!game.opponentConnected) {
            return 'Waiting for opponent to connect…';
        }

        if (isMyTurn) {
            return 'Your move';
        }

        return 'Opponent thinking…';
    };

    const statusColor = () => {
        if (phase === 'checkmate') {
            return game.status.winner === playerColor
                ? 'text-emerald-400'
                : 'text-red-400';
        }

        if (phase === 'stalemate') {
            return 'text-navy-200';
        }

        if (phase === 'check') {
            return 'text-red-400';
        }

        if (!game.opponentConnected) {
            return 'text-amber-400';
        }

        if (isMyTurn) {
            return 'text-royal-400';
        }

        return 'text-white';
    };

    return (
        <div className="min-h-screen bg-[#07111f] text-white">
            {/* Top bar */}
            <header className="sticky top-0 z-50 border-b border-navy-600/40 bg-navy-900/95 backdrop-blur">
                <div className="mx-auto flex h-14 max-w-[1500px] items-center justify-between px-3 sm:px-5">
                    <button
                        type="button"
                        onClick={onExit}
                        className="flex items-center gap-2 rounded-lg px-2 py-2 text-sm font-semibold text-navy-200 transition hover:bg-navy-700 hover:text-white"
                    >
                        <ArrowLeft size={17} />

                        <span className="hidden sm:inline">
                            Exit Game
                        </span>
                    </button>

                    <div className="flex items-center gap-2">
                        <div className="hidden rounded-full bg-navy-700 px-3 py-1.5 text-xs font-bold text-white sm:block">
                            Room:{' '}
                            {(config.roomId || '')
                                .slice(0, 6)
                                .toUpperCase()}
                        </div>

                        <div
                            className={`flex items-center gap-1.5 rounded-full px-2.5 py-1.5 text-[10px] font-bold sm:px-3 sm:text-xs ${game.opponentConnected
                                    ? 'bg-emerald-500/15 text-emerald-400'
                                    : 'bg-amber-500/15 text-amber-400'
                                }`}
                        >
                            {game.opponentConnected ? (
                                <Wifi size={12} />
                            ) : (
                                <WifiOff size={12} />
                            )}

                            {game.opponentConnected
                                ? 'Connected'
                                : 'Waiting'}
                        </div>

                        <BoardThemeSwitcher
                            currentThemeId={themeId}
                            onThemeChange={onThemeChange}
                        />
                    </div>
                </div>
            </header>

            {/* Game */}
            <main className="mx-auto flex min-h-[calc(100vh-3.5rem)] w-full max-w-[1500px] items-center justify-center p-2 sm:p-4 lg:p-5">
                <div className="grid w-full gap-4 lg:grid-cols-[minmax(0,1fr)_360px] lg:items-center">
                    {/* BOARD */}
                    <section className="flex min-w-0 justify-center">
                        <div className="w-full max-w-[min(92vw,calc(100vh-150px))] lg:max-w-[min(72vh,760px)]">
                            {/* Status */}
                            <div className="mb-2 rounded-xl border border-navy-600/40 bg-navy-800/80 px-3 py-2 text-center shadow-card sm:mb-3 sm:px-4 sm:py-3">
                                <p
                                    className={`font-display text-sm font-bold sm:text-base ${statusColor()}`}
                                >
                                    {statusText()}
                                </p>
                            </div>

                            {/* Top player */}
                            <PlayerHUD
                                player={topPlayer}
                                ms={topMs}
                                active={topActive}
                                running={game.running}
                                align="top"
                            />

                            {/* Board */}
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

                            {/* Bottom player */}
                            <PlayerHUD
                                player={bottomPlayer}
                                ms={bottomMs}
                                active={bottomActive}
                                running={game.running}
                                align="bottom"
                            />

                            {/* Mobile controls */}
                            <div className="mt-2 lg:hidden">
                                <OnlineGameControls
                                    game={game}
                                    orientation={orientation}
                                    setOrientation={setOrientation}
                                    themeId={themeId}
                                    onThemeChange={onThemeChange}
                                    onRematch={onRematch}
                                    gameOver={gameOver}
                                />
                            </div>
                        </div>
                    </section>

                    {/* RIGHT PANEL */}
                    <aside className="w-full">
                        {/* Desktop controls */}
                        <div className="hidden lg:block">
                            <OnlineGameControls
                                game={game}
                                orientation={orientation}
                                setOrientation={setOrientation}
                                themeId={themeId}
                                onThemeChange={onThemeChange}
                                onRematch={onRematch}
                                gameOver={gameOver}
                            />
                        </div>

                        {/* Game info */}
                        <div className="mt-3 rounded-xl border border-navy-600/40 bg-navy-800/90 p-3 shadow-card-lg">
                            <div className="mb-3 text-sm font-bold">
                                Game Info
                            </div>

                            <div className="space-y-2 text-sm">
                                <div className="flex justify-between">
                                    <span className="text-navy-400">
                                        You play
                                    </span>

                                    <span className="font-bold text-white">
                                        {playerColor === 'w'
                                            ? 'White'
                                            : 'Black'}
                                    </span>
                                </div>

                                <div className="flex justify-between gap-3">
                                    <span className="text-navy-400">
                                        Opponent
                                    </span>

                                    <span className="truncate font-bold text-white">
                                        {game.opponentName}
                                    </span>
                                </div>

                                <div className="flex justify-between">
                                    <span className="text-navy-400">
                                        Time control
                                    </span>

                                    <span className="font-bold text-white">
                                        {config.timeControl === 'custom'
                                            ? `${config.customMinutes} min`
                                            : config.timeControl}
                                    </span>
                                </div>

                                <div className="flex justify-between">
                                    <span className="text-navy-400">
                                        Connection
                                    </span>

                                    <span
                                        className={`font-bold ${game.opponentConnected
                                                ? 'text-emerald-400'
                                                : 'text-amber-400'
                                            }`}
                                    >
                                        {game.opponentConnected
                                            ? 'Live'
                                            : 'Reconnecting…'}
                                    </span>
                                </div>
                            </div>
                        </div>

                        {/* Clocks */}
                        <div className="mt-3 grid grid-cols-2 gap-3">
                            <div
                                className={`rounded-xl p-3 text-center shadow-card transition-all ${game.running &&
                                        game.state.turn === 'w'
                                        ? 'bg-blue-grad text-white shadow-glow'
                                        : 'glass-dark text-white opacity-70'
                                    }`}
                            >
                                <div className="flex items-center justify-center gap-1.5">
                                    <span className="h-2 w-2 rounded-full bg-white ring-1 ring-navy-400" />

                                    <span className="text-[10px] font-semibold uppercase tracking-wide text-navy-400">
                                        White
                                    </span>
                                </div>

                                <p className="mt-1 font-display text-xl font-extrabold tabular-nums">
                                    {formatClock(game.whiteMs)}
                                </p>
                            </div>

                            <div
                                className={`rounded-xl p-3 text-center shadow-card transition-all ${game.running &&
                                        game.state.turn === 'b'
                                        ? 'bg-blue-grad text-white shadow-glow'
                                        : 'glass-dark text-white opacity-70'
                                    }`}
                            >
                                <div className="flex items-center justify-center gap-1.5">
                                    <span className="h-2 w-2 rounded-full bg-navy-900" />

                                    <span className="text-[10px] font-semibold uppercase tracking-wide text-navy-400">
                                        Black
                                    </span>
                                </div>

                                <p className="mt-1 font-display text-xl font-extrabold tabular-nums">
                                    {formatClock(game.blackMs)}
                                </p>
                            </div>
                        </div>

                        {/* Moves */}
                        <div className="mt-3 rounded-xl border border-navy-600/40 bg-navy-800/90 p-3 shadow-card-lg">
                            <div className="mb-2 flex items-center justify-between">
                                <div className="text-sm font-bold">
                                    Moves
                                </div>

                                <span className="text-xs font-bold text-royal-400">
                                    {game.history.length}
                                </span>
                            </div>

                            <div className="max-h-[320px] overflow-y-auto">
                                {game.history.length === 0 ? (
                                    <div className="py-6 text-center text-xs text-navy-500">
                                        Make the first move
                                    </div>
                                ) : (
                                    <div className="grid grid-cols-2 gap-x-4 gap-y-1 text-sm">
                                        {game.history.map(
                                            (move: any, index: number) => (
                                                <div
                                                    key={`${index}-${move.san}`}
                                                    className="flex gap-2"
                                                >
                                                    <span className="w-5 text-navy-500">
                                                        {Math.floor(index / 2) + 1}.
                                                    </span>

                                                    <span className="font-semibold">
                                                        {move.san}
                                                    </span>
                                                </div>
                                            )
                                        )}
                                    </div>
                                )}
                            </div>
                        </div>

                        {/* Rematch */}
                        {gameOver && (
                            <button
                                type="button"
                                onClick={onRematch}
                                className="btn-primary mt-3 flex w-full items-center justify-center gap-2"
                            >
                                <RotateCcw size={16} />
                                Rematch
                            </button>
                        )}
                    </aside>
                </div>
            </main>

            {/* Game over */}
            {gameOver && !showGameOver && (
                <GameOverPopup
                    status={game.status}
                    ending={
                        resultReason === 'timeout'
                            ? 'timeout'
                            : resultReason === 'resignation'
                                ? 'resignation'
                                : resultReason === 'insufficient_material'
                                    ? 'insufficient_material'
                                    : resultReason === 'stalemate'
                                        ? 'stalemate'
                                        : 'checkmate'
                    }
                    onClose={() => setShowGameOver(true)}
                    onNewGame={onRematch}
                    winnerName={
                        game.status.winner === playerColor
                            ? 'You'
                            : game.opponentName
                    }
                    playerWon={
                        game.status.winner === playerColor
                    }
                    moves={game.history.length}
                    duration="0:00"
                    ratingChange={
                        game.status.winner === playerColor
                            ? 8
                            : phase === 'stalemate'
                                ? 0
                                : -6
                    }
                />
            )}
        </div>
    );
}

function OnlineGameControls({
    game,
    orientation,
    setOrientation,
    themeId,
    onThemeChange,
    onRematch,
    gameOver,
}: {
    game: any;
    orientation: Color;
    setOrientation: React.Dispatch<
        React.SetStateAction<Color>
    >;
    themeId: string;
    onThemeChange: (id: string) => void;
    onRematch: () => void;
    gameOver: boolean;
}) {
    return (
        <div className="rounded-xl border border-navy-600/40 bg-navy-800/90 p-3 shadow-card-lg">
            {/* Header */}
            <div className="mb-3 flex items-center justify-between gap-3">
                <div>
                    <div className="text-sm font-bold">
                        Game Controls
                    </div>

                    <div className="text-[11px] text-navy-400">
                        {game.history.length} moves
                    </div>
                </div>

                {/* RESIGN */}
                <button
                    type="button"
                    onClick={game.resign}
                    disabled={!game.running || gameOver}
                    className="flex items-center gap-2 rounded-lg bg-red-500/15 px-3 py-2 text-xs font-bold text-red-300 transition hover:bg-red-500/25 disabled:cursor-not-allowed disabled:opacity-30"
                >
                    <Flag size={14} />
                    Resign
                </button>
            </div>

            {/* Main controls */}
            <div className="grid grid-cols-2 gap-2">
                <button
                    type="button"
                    onClick={() =>
                        setOrientation((value) =>
                            value === 'w' ? 'b' : 'w'
                        )
                    }
                    className="flex items-center justify-center gap-2 rounded-lg bg-navy-700 px-3 py-2.5 text-xs font-bold transition hover:bg-navy-600"
                >
                    <FlipHorizontal
                        size={14}
                        className="text-royal-400"
                    />
                    Flip Board
                </button>

                <div className="flex items-center justify-center gap-2 rounded-lg bg-navy-700 px-3 py-2.5 text-xs font-bold">
                    <Clock
                        size={14}
                        className="text-royal-400"
                    />
                    {game.history.length} moves
                </div>
            </div>

            {/* Theme */}
            <div className="mt-3 flex items-center gap-2">
                <BoardThemeSwitcher
                    currentThemeId={themeId}
                    onThemeChange={onThemeChange}
                />

                {gameOver && (
                    <button
                        type="button"
                        onClick={onRematch}
                        className="ml-auto flex items-center gap-2 rounded-lg bg-blue-grad px-3 py-2 text-xs font-bold shadow-glow-sm"
                    >
                        <RotateCcw size={14} />
                        Rematch
                    </button>
                )}
            </div>

            {/* Desktop move list */}
            <div className="mt-3 hidden rounded-lg bg-navy-900/60 p-3 lg:block">
                <div className="mb-2 text-xs font-bold uppercase tracking-wider text-navy-400">
                    Moves
                </div>

                <div className="max-h-[320px] overflow-y-auto">
                    {game.history.length === 0 ? (
                        <div className="py-6 text-center text-xs text-navy-500">
                            Make the first move
                        </div>
                    ) : (
                        <div className="grid grid-cols-2 gap-x-4 gap-y-1 text-sm">
                            {game.history.map(
                                (move: any, index: number) => (
                                    <div
                                        key={`${index}-${move.san}`}
                                        className="flex gap-2"
                                    >
                                        <span className="w-5 text-navy-500">
                                            {Math.floor(index / 2) + 1}.
                                        </span>

                                        <span className="font-semibold">
                                            {move.san}
                                        </span>
                                    </div>
                                )
                            )}
                        </div>
                    )}
                </div>
            </div>
        </div>
    );
}