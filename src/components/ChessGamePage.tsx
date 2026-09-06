import { useCallback, useEffect, useMemo, useState } from 'react';
import {
    ArrowLeft,
    Flag,
    Music,
    Music2,
    RotateCcw,
    Swords,
} from 'lucide-react';

import type {
    Color,
    GameMode,
    TimeControl,
    AIDifficulty,
} from '../game/types';

import { useChess } from '../hooks/useChess';
import { ChessBoard } from './ChessBoard';
import { PlayerHUD } from './PlayerHUD';
import { GamePanel } from './GamePanel';
import { BoardThemeSwitcher } from './BoardThemeSwitcher';
import { GameOverPopup } from './GameOverPopup';

import { PLAYERS, CURRENT_USER } from '../data/players';

import {
    getStoredTheme,
    storeTheme,
    getThemeById,
    applyThemeCSS,
} from '../game/themes';

import { sound } from '../game/sound';

const PIECE_VALUES = {
    p: 1,
    n: 3,
    b: 3,
    r: 5,
    q: 9,
    k: 0,
} as const;

function computeCaptured(board: any) {
    const counts = {
        w: { p: 0, n: 0, b: 0, r: 0, q: 0, k: 0 },
        b: { p: 0, n: 0, b: 0, r: 0, q: 0, k: 0 },
    };

    for (let r = 0; r < 8; r++) {
        for (let c = 0; c < 8; c++) {
            const piece = board[r][c];

            if (piece) {
                counts[piece.color][piece.type]++;
            }
        }
    }

    const white: any[] = [];
    const black: any[] = [];

    (['p', 'n', 'b', 'r', 'q'] as const).forEach((type) => {
        const missingBlack = 8 - counts.b[type];

        for (let i = 0; i < missingBlack; i++) {
            white.push(type);
        }

        const originalWhite = type === 'p' ? 8 : 2;
        const missingWhite = originalWhite - counts.w[type];

        for (let i = 0; i < missingWhite; i++) {
            black.push(type);
        }
    });

    const whiteMaterial = white.reduce(
        (sum, piece) => sum + PIECE_VALUES[piece],
        0
    );

    const blackMaterial = black.reduce(
        (sum, piece) => sum + PIECE_VALUES[piece],
        0
    );

    return {
        white,
        black,
        whiteDiff: Math.max(
            0,
            whiteMaterial - blackMaterial
        ),
        blackDiff: Math.max(
            0,
            blackMaterial - whiteMaterial
        ),
    };
}

function formatDuration(ms: number) {
    const seconds = Math.max(0, Math.floor(ms / 1000));
    const minutes = Math.floor(seconds / 60);

    return `${minutes}:${String(seconds % 60).padStart(2, '0')}`;
}

interface ChessGamePageProps {
    gameMode: GameMode;
    aiDifficulty: AIDifficulty;
    playerColor: Color;
    timeControl: TimeControl;
    customMinutes: number;
    onExit: () => void;
}

export function ChessGamePage({
    gameMode,
    aiDifficulty,
    playerColor,
    timeControl,
    customMinutes,
    onExit,
}: ChessGamePageProps) {
    const [orientation, setOrientation] =
        useState<Color>(playerColor);

    const [boardThemeId, setBoardThemeId] =
        useState(getStoredTheme());

    const [musicOn, setMusicOn] = useState(false);

    const [showGameOver, setShowGameOver] =
        useState(false);

    const opponent = PLAYERS[1];

    const user = {
        ...CURRENT_USER,
    };

    useEffect(() => {
        applyThemeCSS(getThemeById(boardThemeId));
    }, [boardThemeId]);

    const game = useChess({
        playerColor,
        opponentColor:
            playerColor === 'w' ? 'b' : 'w',
        vsComputer: gameMode === 'ai',
        timeControl,
        customMinutes,
        opponentName: opponent.name,
        opponentAvatar: opponent.avatar,
        opponentFlag: opponent.flag,
        gameMode,
        aiDifficulty,
    });

    // Automatically start as soon as this screen is opened.
    useEffect(() => {
        const frame = requestAnimationFrame(() => {
            game.startGame();
        });

        return () => cancelAnimationFrame(frame);
    }, []);

    useEffect(() => {
        if (game.pendingResult) {
            setShowGameOver(true);
        }
    }, [game.pendingResult]);

    const captured = useMemo(
        () => computeCaptured(game.board),
        [game.board]
    );

    const whitePlayer =
        playerColor === 'w' ? user : opponent;

    const blackPlayer =
        playerColor === 'w' ? opponent : user;

    const topPlayer =
        orientation === 'w'
            ? blackPlayer
            : whitePlayer;

    const bottomPlayer =
        orientation === 'w'
            ? whitePlayer
            : blackPlayer;

    const topCaptured =
        orientation === 'w'
            ? captured.black
            : captured.white;

    const bottomCaptured =
        orientation === 'w'
            ? captured.white
            : captured.black;

    const topDiff =
        orientation === 'w'
            ? captured.blackDiff
            : captured.whiteDiff;

    const bottomDiff =
        orientation === 'w'
            ? captured.whiteDiff
            : captured.blackDiff;

    const topMs =
        orientation === 'w'
            ? game.blackMs
            : game.whiteMs;

    const bottomMs =
        orientation === 'w'
            ? game.whiteMs
            : game.blackMs;

    const topActive =
        game.running &&
        game.state.turn !== orientation;

    const bottomActive =
        game.running &&
        game.state.turn === orientation;

    const newGame = useCallback(() => {
        setShowGameOver(false);
        game.startGame();
    }, [game]);

    const toggleMusic = useCallback(() => {
        sound.unlock();
        sound.toggleMusic();
        setMusicOn(!sound.musicMuted);
    }, []);

    const gameDuration = formatDuration(
        (timeControl === '1min'
            ? 60000
            : timeControl === '3min'
                ? 180000
                : timeControl === '10min'
                    ? 600000
                    : customMinutes * 60000) *
        2 -
        (game.whiteMs + game.blackMs)
    );

    const winnerName =
        game.status.winner === 'w'
            ? whitePlayer.name
            : blackPlayer.name;

    const playerWon =
        game.status.winner === playerColor;

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
                            Game Setup
                        </span>
                    </button>

                    <div className="flex items-center gap-2">
                        <Swords
                            size={18}
                            className="text-royal-300"
                        />

                        <span className="font-display font-extrabold">
                            Play Zone
                        </span>
                    </div>

                    <button
                        type="button"
                        onClick={onExit}
                        className="rounded-lg bg-navy-700 px-3 py-2 text-xs font-bold text-navy-200 transition hover:bg-navy-600 hover:text-white"
                    >
                        Home
                    </button>
                </div>
            </header>

            {/* Game */}
            <main className="mx-auto flex min-h-[calc(100vh-3.5rem)] w-full max-w-[1500px] items-center justify-center p-2 sm:p-4 lg:p-5">
                <div className="grid w-full gap-4 lg:grid-cols-[minmax(0,1fr)_360px] lg:items-center">
                    {/* BOARD */}
                    <section className="flex min-w-0 justify-center">
                        <div className="w-full max-w-[min(92vw,calc(100vh-150px))] lg:max-w-[min(72vh,760px)]">
                            <PlayerHUD
                                player={{
                                    name: topPlayer.name,
                                    avatar: topPlayer.avatar,
                                    flag: topPlayer.flag,
                                    rating: topPlayer.rating,
                                    title: topPlayer.title,
                                    online: topPlayer.online,
                                    capturedPieces: topCaptured,
                                    materialDiff: topDiff,
                                }}
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
                                thinking={game.thinking}
                            />

                            <PlayerHUD
                                player={{
                                    name: bottomPlayer.name,
                                    avatar: bottomPlayer.avatar,
                                    flag: bottomPlayer.flag,
                                    rating: bottomPlayer.rating,
                                    title: bottomPlayer.title,
                                    online: bottomPlayer.online,
                                    capturedPieces: bottomCaptured,
                                    materialDiff: bottomDiff,
                                }}
                                ms={bottomMs}
                                active={bottomActive}
                                running={game.running}
                                align="bottom"
                            />

                            <div className="mt-2 lg:hidden">
                                <GameControls
                                    game={game}
                                    boardThemeId={boardThemeId}
                                    setBoardThemeId={setBoardThemeId}
                                    toggleMusic={toggleMusic}
                                    musicOn={musicOn}
                                />
                            </div>
                        </div>
                    </section>

                    {/* RIGHT PANEL */}
                    <aside className="w-full">
                        <div className="hidden lg:block">
                            <GameControls
                                game={game}
                                boardThemeId={boardThemeId}
                                setBoardThemeId={setBoardThemeId}
                                toggleMusic={toggleMusic}
                                musicOn={musicOn}
                            />
                        </div>

                        <div className="mt-3">
                            <GamePanel
                                status={game.status}
                                running={game.running}
                                started={game.started}
                                thinking={game.thinking}
                                turn={game.state.turn}
                                playerColor={playerColor}
                                timeControl={timeControl}
                                customMinutes={customMinutes}
                                history={game.history}
                                stageLabel={game.stageLabel as any}
                                onStart={game.startGame}
                                onResign={game.resign}
                                onUndo={game.undo}
                                onChangeTimeControl={() => { }}
                                onChangeCustomMinutes={() => { }}
                                onFlip={() =>
                                    setOrientation((value) =>
                                        value === 'w' ? 'b' : 'w'
                                    )
                                }
                                onChangeColor={() => { }}
                            />
                        </div>

                        <div className="mt-3 rounded-xl border border-navy-600/40 bg-navy-800/80 p-3 lg:hidden">
                            <div className="mb-2 text-sm font-bold">
                                Moves
                            </div>

                            <div className="max-h-44 overflow-y-auto">
                                {game.history.length === 0 ? (
                                    <div className="py-4 text-center text-xs text-navy-400">
                                        No moves yet
                                    </div>
                                ) : (
                                    <div className="grid grid-cols-2 gap-x-4 gap-y-1 text-sm">
                                        {game.history.map(
                                            (move: any, index: number) => (
                                                <div
                                                    key={`${index}-${move.san}`}
                                                    className="flex gap-2"
                                                >
                                                    <span className="w-5 text-navy-400">
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
                    </aside>
                </div>
            </main>

            {game.pendingResult && showGameOver && (
                <GameOverPopup
                    status={game.pendingResult.status}
                    ending={game.pendingResult.ending}
                    onClose={() => setShowGameOver(false)}
                    onNewGame={newGame}
                    winnerName={winnerName}
                    playerWon={playerWon}
                    moves={game.history.length}
                    duration={gameDuration}
                    ratingChange={
                        playerWon
                            ? 8
                            : game.pendingResult.ending === 'stalemate'
                                ? 0
                                : -6
                    }
                />
            )}
        </div>
    );
}

function GameControls({
    game,
    boardThemeId,
    setBoardThemeId,
    toggleMusic,
    musicOn,
}: any) {
    return (
        <div className="rounded-xl border border-navy-600/40 bg-navy-800/90 p-3 shadow-card-lg">
            <div className="mb-3 flex items-center justify-between">
                <div>
                    <div className="text-sm font-bold">
                        Game Controls
                    </div>

                    <div className="text-[11px] text-navy-400">
                        {game.history.length} moves
                    </div>
                </div>

                <button
                    type="button"
                    onClick={game.resign}
                    disabled={!game.started || !game.running}
                    className="flex items-center gap-2 rounded-lg bg-red-500/15 px-3 py-2 text-xs font-bold text-red-300 transition hover:bg-red-500/25 disabled:opacity-30"
                >
                    <Flag size={14} />
                    Resign
                </button>
            </div>

            <div className="grid grid-cols-4 gap-1 rounded-lg bg-navy-700 p-1">
                <button
                    type="button"
                    onClick={() => game.jumpToMove(-1)}
                    disabled={game.history.length === 0}
                    className="rounded-md py-2 text-sm font-bold transition hover:bg-navy-600 disabled:opacity-30"
                >
                    |≪
                </button>

                <button
                    type="button"
                    onClick={game.undo}
                    disabled={game.history.length === 0}
                    className="rounded-md py-2 text-sm font-bold transition hover:bg-navy-600 disabled:opacity-30"
                >
                    ≪
                </button>

                <button
                    type="button"
                    onClick={game.redo}
                    disabled={game.history.length === 0}
                    className="rounded-md py-2 text-sm font-bold transition hover:bg-navy-600 disabled:opacity-30"
                >
                    ≫
                </button>

                <button
                    type="button"
                    onClick={() =>
                        game.jumpToMove(
                            game.history.length - 1
                        )
                    }
                    disabled={game.history.length === 0}
                    className="rounded-md py-2 text-sm font-bold transition hover:bg-navy-600 disabled:opacity-30"
                >
                    ≫|
                </button>
            </div>

            <div className="mt-3 flex items-center gap-2">
                <BoardThemeSwitcher
                    currentThemeId={boardThemeId}
                    onThemeChange={(id: string) => {
                        setBoardThemeId(id);
                        storeTheme(id);
                    }}
                />

                <button
                    type="button"
                    onClick={toggleMusic}
                    className={`grid h-9 w-9 place-items-center rounded-lg transition ${musicOn
                            ? 'bg-blue-grad shadow-glow-sm'
                            : 'bg-navy-700 hover:bg-navy-600'
                        }`}
                    title="Background music"
                >
                    {musicOn ? (
                        <Music2 size={15} />
                    ) : (
                        <Music size={15} />
                    )}
                </button>

                <button
                    type="button"
                    onClick={game.startGame}
                    className="ml-auto flex items-center gap-2 rounded-lg bg-blue-grad px-3 py-2 text-xs font-bold shadow-glow-sm"
                >
                    <RotateCcw size={14} />
                    New Game
                </button>
            </div>

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