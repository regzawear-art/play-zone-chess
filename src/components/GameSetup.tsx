import {
    Bot,
    Globe,
    Users,
    Clock3,
    Palette,
    Zap,
    Play,
    Check,
} from 'lucide-react';

import type {
    Color,
    GameMode,
    TimeControl,
    AIDifficulty,
} from '../game/types';

interface GameSetupProps {
    gameMode: GameMode;
    onChangeMode: (mode: GameMode) => void;

    timeControl: TimeControl;
    onChangeTimeControl: (time: TimeControl) => void;

    customMinutes: number;
    onChangeCustomMinutes: (minutes: number) => void;

    aiDifficulty: AIDifficulty;
    onChangeDifficulty: (difficulty: AIDifficulty) => void;

    playerColor: Color;
    onChangeColor: (color: Color) => void;

    onPlay: () => void;
    disabled?: boolean;
}

const MODES: {
    key: GameMode;
    label: string;
    description: string;
    icon: typeof Bot;
}[] = [
        {
            key: 'ai',
            label: 'Play with Bot',
            description: 'Train against computer AI',
            icon: Bot,
        },
        {
            key: 'online',
            label: 'Play Online',
            description: 'Find a real opponent',
            icon: Globe,
        },
        {
            key: 'room',
            label: 'Play with Friends',
            description: 'Create or join a private room',
            icon: Users,
        },
    ];

const TIMES: {
    key: TimeControl;
    label: string;
    sub: string;
}[] = [
        {
            key: '1min',
            label: '1 min',
            sub: 'Bullet',
        },
        {
            key: '3min',
            label: '3 min',
            sub: 'Blitz',
        },
        {
            key: '10min',
            label: '10 min',
            sub: 'Rapid',
        },
        {
            key: 'custom',
            label: 'Custom',
            sub: 'Your time',
        },
    ];

const DIFFICULTIES: {
    key: AIDifficulty;
    label: string;
    sub: string;
}[] = [
        {
            key: 'beginner',
            label: 'Basic',
            sub: 'JavaScript AI',
        },
        {
            key: 'intermediate',
            label: 'Intermediate',
            sub: 'Stockfish Level 1',
        },
        {
            key: 'advanced',
            label: 'Advanced',
            sub: 'Stockfish Level 2',
        },
        {
            key: 'master',
            label: 'Master',
            sub: 'Stockfish Level 3',
        },
        {
            key: 'max',
            label: 'Max Engine',
            sub: 'Stockfish Maximum',
        },
    ];

export function GameSetup({
    gameMode,
    onChangeMode,
    timeControl,
    onChangeTimeControl,
    customMinutes,
    onChangeCustomMinutes,
    aiDifficulty,
    onChangeDifficulty,
    playerColor,
    onChangeColor,
    onPlay,
    disabled = false,
}: GameSetupProps) {
    const randomColor = () => {
        onChangeColor(Math.random() < 0.5 ? 'w' : 'b');
    };

    return (
        <div className="mx-auto w-full max-w-7xl">
            <div className="overflow-hidden rounded-2xl border border-white/10 bg-navy-900/90 shadow-card-lg sm:rounded-3xl">
                {/* Header */}
                <div className="border-b border-white/10 bg-gradient-to-r from-royal-500/10 via-transparent to-transparent px-5 py-5 sm:px-7">
                    <div className="flex items-center gap-3">
                        <div className="grid h-11 w-11 place-items-center rounded-xl bg-royal-500/15 ring-1 ring-royal-500/30">
                            <SwordsIcon />
                        </div>

                        <div>
                            <p className="text-xs font-bold uppercase tracking-[0.2em] text-royal-400">
                                Play Chess
                            </p>

                            <h2 className="font-display text-2xl font-extrabold text-white sm:text-3xl">
                                Choose your game
                            </h2>
                        </div>
                    </div>
                </div>

                <div className="p-3 sm:p-7">
                    {/* Game mode */}
                    <div>
                        <div className="mb-3 flex items-center gap-2">
                            <Zap size={15} className="text-royal-400" />
                            <h3 className="text-sm font-bold text-white">
                                Game Mode
                            </h3>
                        </div>

                        <div className="grid grid-cols-2 gap-2 sm:grid-cols-3 sm:gap-3">
                            {MODES.map((mode) => {
                                const Icon = mode.icon;
                                const active = gameMode === mode.key;

                                return (
                                    <button
                                        key={mode.key}
                                        type="button"
                                        disabled={disabled}
                                        onClick={() => onChangeMode(mode.key)}
                                        className={`group min-w-0 rounded-xl border p-3 text-left transition-all sm:rounded-2xl sm:p-4 ${active
                                                ? 'border-royal-400/50 bg-royal-500/15 shadow-glow-sm'
                                                : 'border-white/8 bg-navy-800 hover:border-white/15 hover:bg-navy-750'
                                            } disabled:cursor-not-allowed disabled:opacity-50`}
                                    >
                                        <div className="flex items-start justify-between gap-3">
                                            <span
                                                className={`grid h-11 w-11 place-items-center rounded-xl ${active
                                                        ? 'bg-blue-grad text-white'
                                                        : 'bg-navy-700 text-navy-300 group-hover:text-white'
                                                    }`}
                                            >
                                                <Icon size={21} />
                                            </span>

                                            {active && (
                                                <span className="grid h-6 w-6 place-items-center rounded-full bg-royal-400 text-navy-900">
                                                    <Check size={14} strokeWidth={3} />
                                                </span>
                                            )}
                                        </div>

                                        <p className="mt-3 text-sm font-bold text-white sm:mt-4 sm:text-base">
                                            {mode.label}
                                        </p>

                                        <p className="mt-1 line-clamp-2 text-[11px] text-navy-400 sm:text-xs">
                                            {mode.description}
                                        </p>
                                    </button>
                                );
                            })}
                        </div>
                    </div>

                    {/* Configuration */}
                    <div className="mt-5 grid gap-4 sm:mt-7 sm:gap-6 lg:grid-cols-3">
                        {/* Time */}
                        <div>
                            <div className="mb-3 flex items-center gap-2">
                                <Clock3 size={15} className="text-royal-400" />
                                <h3 className="text-sm font-bold text-white">
                                    Time Control
                                </h3>
                            </div>

                            <div className="grid grid-cols-2 gap-2">
                                {TIMES.map((time) => {
                                    const active = timeControl === time.key;

                                    return (
                                        <button
                                            key={time.key}
                                            type="button"
                                            disabled={disabled}
                                            onClick={() => onChangeTimeControl(time.key)}
                                            className={`rounded-xl border px-3 py-3 text-left transition-all ${active
                                                    ? 'border-royal-400/50 bg-royal-500/15'
                                                    : 'border-white/8 bg-navy-800 hover:bg-navy-750'
                                                } disabled:opacity-50`}
                                        >
                                            <div className="text-sm font-bold text-white">
                                                {time.label}
                                            </div>

                                            <div className="mt-0.5 text-[11px] text-navy-400">
                                                {time.sub}
                                            </div>
                                        </button>
                                    );
                                })}
                            </div>

                            {timeControl === 'custom' && (
                                <div className="mt-3 rounded-xl border border-white/8 bg-navy-800 p-3">
                                    <label className="mb-2 block text-xs font-semibold text-navy-300">
                                        Minutes
                                    </label>

                                    <input
                                        type="number"
                                        min={1}
                                        max={180}
                                        value={customMinutes}
                                        onChange={(e) =>
                                            onChangeCustomMinutes(
                                                Math.max(
                                                    1,
                                                    Math.min(180, Number(e.target.value) || 1)
                                                )
                                            )
                                        }
                                        className="w-full rounded-lg border border-white/10 bg-navy-900 px-3 py-2 text-sm font-bold text-white outline-none focus:border-royal-400/50"
                                    />
                                </div>
                            )}
                        </div>

                        {/* Difficulty */}
                        <div>
                            <div className="mb-3 flex items-center gap-2">
                                <Bot size={15} className="text-royal-400" />
                                <h3 className="text-sm font-bold text-white">
                                    AI Difficulty
                                </h3>
                            </div>

                            <div className="grid grid-cols-2 gap-2">
                                {DIFFICULTIES.map((difficulty) => {
                                    const active =
                                        aiDifficulty === difficulty.key;

                                    return (
                                        <button
                                            key={difficulty.key}
                                            type="button"
                                            disabled={
                                                disabled || gameMode !== 'ai'
                                            }
                                            onClick={() =>
                                                onChangeDifficulty(difficulty.key)
                                            }
                                            className={`rounded-xl border px-3 py-3 text-left transition-all ${active
                                                    ? 'border-royal-400/50 bg-royal-500/15'
                                                    : 'border-white/8 bg-navy-800 hover:bg-navy-750'
                                                } disabled:cursor-not-allowed disabled:opacity-40`}
                                        >
                                            <div className="text-sm font-bold text-white">
                                                {difficulty.label}
                                            </div>

                                            <div className="mt-0.5 truncate text-[10px] text-navy-400">
                                                {difficulty.sub}
                                            </div>
                                        </button>
                                    );
                                })}
                            </div>
                        </div>

                        {/* Color */}
                        <div>
                            <div className="mb-3 flex items-center gap-2">
                                <Palette size={15} className="text-royal-400" />
                                <h3 className="text-sm font-bold text-white">
                                    Your Color
                                </h3>
                            </div>

                            <div className="grid grid-cols-3 gap-2">
                                <button
                                    type="button"
                                    disabled={disabled}
                                    onClick={() => onChangeColor('w')}
                                    className={`rounded-xl border px-3 py-4 text-center transition-all ${playerColor === 'w'
                                            ? 'border-royal-400/50 bg-royal-500/15'
                                            : 'border-white/8 bg-navy-800 hover:bg-navy-750'
                                        } disabled:opacity-50`}
                                >
                                    <div className="mx-auto mb-2 h-6 w-6 rounded-full bg-white shadow" />
                                    <div className="text-xs font-bold text-white">
                                        White
                                    </div>
                                </button>

                                <button
                                    type="button"
                                    disabled={disabled}
                                    onClick={randomColor}
                                    className="rounded-xl border border-white/8 bg-navy-800 px-3 py-4 text-center transition-all hover:bg-navy-750 disabled:opacity-50"
                                >
                                    <div className="mx-auto mb-2 flex h-6 w-6 overflow-hidden rounded-full">
                                        <span className="w-1/2 bg-white" />
                                        <span className="w-1/2 bg-navy-600" />
                                    </div>

                                    <div className="text-xs font-bold text-white">
                                        Random
                                    </div>
                                </button>

                                <button
                                    type="button"
                                    disabled={disabled}
                                    onClick={() => onChangeColor('b')}
                                    className={`rounded-xl border px-3 py-4 text-center transition-all ${playerColor === 'b'
                                            ? 'border-royal-400/50 bg-royal-500/15'
                                            : 'border-white/8 bg-navy-800 hover:bg-navy-750'
                                        } disabled:opacity-50`}
                                >
                                    <div className="mx-auto mb-2 h-6 w-6 rounded-full bg-navy-700 shadow ring-1 ring-white/10" />
                                    <div className="text-xs font-bold text-white">
                                        Black
                                    </div>
                                </button>
                            </div>
                        </div>
                    </div>

                    {/* Summary + play */}
                    <div className="mt-7 flex flex-col gap-4 rounded-2xl border border-white/8 bg-navy-800/80 p-4 sm:flex-row sm:items-center sm:justify-between sm:p-5">
                        <div>
                            <div className="text-xs font-bold uppercase tracking-wider text-navy-400">
                                Ready to play
                            </div>

                            <div className="mt-1 flex flex-wrap items-center gap-x-2 gap-y-1 text-sm font-bold text-white">
                                <span>
                                    {gameMode === 'ai'
                                        ? 'Bot'
                                        : gameMode === 'online'
                                            ? 'Online'
                                            : 'Friends'}
                                </span>

                                <span className="text-navy-500">•</span>

                                <span>
                                    {timeControl === 'custom'
                                        ? `${customMinutes} min`
                                        : timeControl.replace('min', ' min')}
                                </span>

                                {gameMode === 'ai' && (
                                    <>
                                        <span className="text-navy-500">•</span>
                                        <span>
                                            {
                                                DIFFICULTIES.find(
                                                    (d) =>
                                                        d.key === aiDifficulty
                                                )?.label
                                            }
                                        </span>
                                    </>
                                )}
                            </div>
                        </div>

                        <button
                            type="button"
                            disabled={disabled}
                            onClick={onPlay}
                            className="flex min-h-12 items-center justify-center gap-2 rounded-xl bg-blue-grad px-6 text-sm font-extrabold text-white shadow-glow-sm transition-all hover:-translate-y-0.5 hover:shadow-glow disabled:cursor-not-allowed disabled:opacity-50 sm:min-h-14 sm:gap-3 sm:rounded-2xl sm:px-8 sm:text-base"
                        >
                            <Play size={20} fill="currentColor" />
                            PLAY
                        </button>
                    </div>
                </div>
            </div>
        </div>
    );
}

function SwordsIcon() {
    return (
        <svg
            width="21"
            height="21"
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            strokeWidth="2"
            strokeLinecap="round"
            strokeLinejoin="round"
            className="text-royal-400"
        >
            <path d="m14.5 17.5 3-3" />
            <path d="m3 21 9-9" />
            <path d="m15 6 3.5-3.5" />
            <path d="m21 3-3 3" />
            <path d="m9 15 6 6" />
            <path d="m3 3 6 6" />
            <path d="m3 3 3-3" />
            <path d="m21 21-6-6" />
        </svg>
    );
}