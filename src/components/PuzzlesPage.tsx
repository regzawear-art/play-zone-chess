import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { ArrowLeft, Lightbulb, RotateCcw, ChevronRight, Eye, Puzzle as PuzzleIcon, Flame, CheckCircle2, XCircle } from 'lucide-react';
import { ChessBoard } from './ChessBoard';
import type { Board, Color, GameState, GameStatus, Move } from '../game/types';
import { gameStatus, legalMoves, legalMovesFrom, makeMove } from '../game/engine';
import { parseFEN, parseUci } from '../game/fen';
import { sound } from '../game/sound';
import PUZZLES_RAW from '../data/puzzles.json';
import { KhelShopCard, KhelSkyscraper, AdSenseSlot, ADSENSE_SLOTS } from './SylvantaAds';

interface PuzzleData {
    id: string;
    fen: string;
    moves: string[];
    rating: number;
    themes: string[];
}

const PUZZLES = PUZZLES_RAW as PuzzleData[];

const LEVELS = [
    { id: 'Easy', min: 0, max: 1000 },
    { id: 'Medium', min: 1000, max: 1400 },
    { id: 'Hard', min: 1400, max: 1800 },
    { id: 'Expert', min: 1800, max: 9999 },
] as const;
type LevelId = (typeof LEVELS)[number]['id'];

const THEME_LABELS: Record<string, string> = {
    mateIn1: 'Mate in 1', mateIn2: 'Mate in 2', mateIn3: 'Mate in 3', mateIn4: 'Mate in 4',
    fork: 'Fork', pin: 'Pin', skewer: 'Skewer', hangingPiece: 'Hanging piece',
    discoveredAttack: 'Discovered attack', sacrifice: 'Sacrifice', deflection: 'Deflection',
    attraction: 'Attraction', backRankMate: 'Back-rank mate', promotion: 'Promotion',
    endgame: 'Endgame', middlegame: 'Middlegame', opening: 'Opening', trappedPiece: 'Trapped piece',
    doubleCheck: 'Double check', kingsideAttack: 'Kingside attack', advancedPawn: 'Advanced pawn',
    smotheredMate: 'Smothered mate', capturingDefender: 'Remove the defender', quietMove: 'Quiet move',
    defensiveMove: 'Defensive move', clearance: 'Clearance', interference: 'Interference', zugzwang: 'Zugzwang',
};

const STORE_KEY = 'khelchess.puzzles.v1';
type Store = { solved: string[]; streak: number; best: number; level: LevelId };

function loadStore(): Store {
    try {
        const s = JSON.parse(localStorage.getItem(STORE_KEY) || '{}');
        return { solved: s.solved ?? [], streak: s.streak ?? 0, best: s.best ?? 0, level: s.level ?? 'Easy' };
    } catch {
        return { solved: [], streak: 0, best: 0, level: 'Easy' };
    }
}

type Phase = 'loading' | 'solving' | 'wrong' | 'solved' | 'revealed';

function findMove(board: Board, state: GameState, uci: string): Move | undefined {
    const u = parseUci(uci);
    return legalMoves(board, state, state.turn).find(
        (m) => m.from[0] === u.from[0] && m.from[1] === u.from[1] && m.to[0] === u.to[0] && m.to[1] === u.to[1] &&
            (m.promotion || '') === (u.promotion || ''),
    );
}

function moveToUci(m: Move): string {
    const s = (r: number, c: number) => String.fromCharCode(97 + c) + (8 - r);
    return s(m.from[0], m.from[1]) + s(m.to[0], m.to[1]) + (m.promotion ?? '');
}

function playSound(m: Move, nextBoard: Board, nextState: GameState) {
    const st = gameStatus(nextBoard, nextState);
    if (st.phase === 'checkmate') sound.play('checkmate');
    else if (st.phase === 'check') sound.play('check');
    else if (m.castle) sound.play('castle');
    else if (m.capture) sound.play('capture');
    else sound.play('move');
}

export function levelOf(rating: number): LevelId {
    return (LEVELS.find((l) => rating >= l.min && rating < l.max) ?? LEVELS[0]).id;
}

export function PuzzlesPage({ onExit, initialPuzzleId }: { onExit: () => void; initialPuzzleId?: string | null }) {
    const initialPuzzle = initialPuzzleId ? PUZZLES.find((p) => p.id === initialPuzzleId) ?? null : null;
    const [store, setStore] = useState<Store>(loadStore);
    const [level, setLevel] = useState<LevelId>(initialPuzzle ? levelOf(initialPuzzle.rating) : store.level);
    const firstLoad = useRef(true);
    const [puzzle, setPuzzle] = useState<PuzzleData | null>(null);
    const [board, setBoard] = useState<Board>(() => parseFEN('8/8/8/8/8/8/8/8 w - - 0 1').board);
    const [state, setState] = useState<GameState>(() => parseFEN('8/8/8/8/8/8/8/8 w - - 0 1').state);
    const [step, setStep] = useState(0);
    const [phase, setPhase] = useState<Phase>('loading');
    const [selected, setSelected] = useState<[number, number] | null>(null);
    const [legal, setLegal] = useState<Move[]>([]);
    const [lastMove, setLastMove] = useState<Move | null>(null);
    const [promotion, setPromotion] = useState<{ from: [number, number]; to: [number, number]; moves: Move[] } | null>(null);
    const [hintSquare, setHintSquare] = useState<[number, number] | null>(null);
    const [failed, setFailed] = useState(false);
    const timers = useRef<number[]>([]);

    const clearTimers = () => {
        timers.current.forEach((t) => window.clearTimeout(t));
        timers.current = [];
    };
    const later = (fn: () => void, ms: number) => {
        timers.current.push(window.setTimeout(fn, ms));
    };

    useEffect(() => {
        localStorage.setItem(STORE_KEY, JSON.stringify({ ...store, level }));
    }, [store, level]);

    useEffect(() => clearTimers, []);

    const levelPuzzles = useMemo(() => {
        const L = LEVELS.find((l) => l.id === level)!;
        return PUZZLES.filter((p) => p.rating >= L.min && p.rating < L.max);
    }, [level]);

    const solvedInLevel = levelPuzzles.filter((p) => store.solved.includes(p.id)).length;

    const playerColor: Color = puzzle ? (parseFEN(puzzle.fen).state.turn === 'w' ? 'b' : 'w') : 'w';

    const loadPuzzle = useCallback((p: PuzzleData) => {
        clearTimers();
        const { board: b, state: s } = parseFEN(p.fen);
        setPuzzle(p);
        setBoard(b);
        setState(s);
        setStep(0);
        setPhase('loading');
        setSelected(null);
        setLegal([]);
        setLastMove(null);
        setPromotion(null);
        setHintSquare(null);
        setFailed(false);
        // Opponent's setup move
        later(() => {
            const m = findMove(b, s, p.moves[0]);
            if (!m) return;
            const next = makeMove(b, s, m);
            playSound(m, next.board, next.state);
            setBoard(next.board);
            setState(next.state);
            setLastMove(m);
            setStep(1);
            setPhase('solving');
        }, 650);
    }, []);

    const nextPuzzle = useCallback(() => {
        const unsolved = levelPuzzles.filter((p) => !store.solved.includes(p.id) && p.id !== puzzle?.id);
        const pool = unsolved.length ? unsolved : levelPuzzles.filter((p) => p.id !== puzzle?.id);
        const pick = pool[Math.floor(Math.random() * pool.length)] ?? levelPuzzles[0];
        if (pick) loadPuzzle(pick);
    }, [levelPuzzles, store.solved, puzzle, loadPuzzle]);

    // Load first puzzle / on level change
    useEffect(() => {
        if (firstLoad.current && initialPuzzle) {
            firstLoad.current = false;
            loadPuzzle(initialPuzzle);
            return;
        }
        firstLoad.current = false;
        nextPuzzle();
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [level]);

    const markSolved = (p: PuzzleData, clean: boolean) => {
        setStore((s) => {
            const streak = clean ? s.streak + 1 : 0;
            return {
                ...s,
                solved: s.solved.includes(p.id) ? s.solved : [...s.solved, p.id],
                streak,
                best: Math.max(s.best, streak),
            };
        });
    };

    const tryMove = (m: Move) => {
        if (!puzzle || phase !== 'solving') return;
        setSelected(null);
        setLegal([]);
        setHintSquare(null);
        const expected = puzzle.moves[step];
        const next = makeMove(board, state, m);
        const isMate = gameStatus(next.board, next.state).phase === 'checkmate';

        if (moveToUci(m) === expected || isMate) {
            playSound(m, next.board, next.state);
            setBoard(next.board);
            setState(next.state);
            setLastMove(m);
            const nextStep = step + 1;
            if (nextStep >= puzzle.moves.length || isMate) {
                setStep(puzzle.moves.length);
                setPhase('solved');
                sound.play('victory');
                markSolved(puzzle, !failed);
                return;
            }
            setStep(nextStep);
            // Opponent reply
            setPhase('loading');
            later(() => {
                const reply = findMove(next.board, next.state, puzzle.moves[nextStep]);
                if (!reply) return;
                const after = makeMove(next.board, next.state, reply);
                playSound(reply, after.board, after.state);
                setBoard(after.board);
                setState(after.state);
                setLastMove(reply);
                setStep(nextStep + 1);
                setPhase('solving');
            }, 450);
        } else {
            // Wrong: show it briefly, then take it back
            const prevBoard = board, prevState = state, prevLast = lastMove;
            playSound(m, next.board, next.state);
            setBoard(next.board);
            setState(next.state);
            setLastMove(m);
            setPhase('wrong');
            if (!failed) {
                setFailed(true);
                setStore((s) => ({ ...s, streak: 0 }));
            }
            later(() => {
                setBoard(prevBoard);
                setState(prevState);
                setLastMove(prevLast);
                setPhase('solving');
            }, 900);
        }
    };

    const onSquareClick = (r: number, c: number) => {
        if (phase !== 'solving') return;
        if (selected) {
            const targets = legal.filter((m) => m.to[0] === r && m.to[1] === c);
            if (targets.length) {
                if (targets[0].promotion) {
                    setPromotion({ from: selected, to: [r, c], moves: targets });
                    return;
                }
                tryMove(targets[0]);
                return;
            }
        }
        const p = board[r][c];
        if (p && p.color === state.turn) {
            setSelected([r, c]);
            setLegal(legalMovesFrom(board, state, state.turn, r, c));
            sound.play('select');
        } else {
            setSelected(null);
            setLegal([]);
        }
    };

    const onDrop = (from: [number, number], to: [number, number]) => {
        if (phase !== 'solving') return false;
        const p = board[from[0]][from[1]];
        if (!p || p.color !== state.turn) return false;
        const moves = legalMovesFrom(board, state, state.turn, from[0], from[1]).filter(
            (m) => m.to[0] === to[0] && m.to[1] === to[1],
        );
        if (!moves.length) return false;
        if (moves[0].promotion) {
            setPromotion({ from, to, moves });
            return true;
        }
        tryMove(moves[0]);
        return true;
    };

    const showHint = () => {
        if (!puzzle || phase !== 'solving') return;
        const u = parseUci(puzzle.moves[step]);
        setHintSquare(u.from);
        setSelected(u.from);
        setLegal(legalMovesFrom(board, state, state.turn, u.from[0], u.from[1]));
        if (!failed) {
            setFailed(true);
            setStore((s) => ({ ...s, streak: 0 }));
        }
    };

    const showSolution = () => {
        if (!puzzle) return;
        clearTimers();
        setFailed(true);
        setStore((s) => ({ ...s, streak: 0 }));
        setPhase('revealed');
        setSelected(null);
        setLegal([]);
        let b = board, s = state, i = step;
        const playNext = () => {
            if (i >= puzzle.moves.length) return;
            const m = findMove(b, s, puzzle.moves[i]);
            if (!m) return;
            const n = makeMove(b, s, m);
            playSound(m, n.board, n.state);
            b = n.board; s = n.state; i++;
            setBoard(b); setState(s); setLastMove(m); setStep(i);
            later(playNext, 700);
        };
        playNext();
    };

    const status: GameStatus = { phase: 'playing', winner: null, stage: 'middlegame' };
    const sideName = playerColor === 'w' ? 'White' : 'Black';
    const themes = (puzzle?.themes ?? [])
        .filter((t) => THEME_LABELS[t] && !['middlegame', 'endgame', 'opening'].includes(t))
        .slice(0, 3)
        .map((t) => THEME_LABELS[t]);

    const banner = (() => {
        switch (phase) {
            case 'solved':
                return { cls: 'bg-[#81b64c]', icon: <CheckCircle2 size={20} />, title: 'Solved!', sub: failed ? 'Nice — try the next one cleanly.' : 'Perfect solve. Streak +1' };
            case 'wrong':
                return { cls: 'bg-[#c33a32]', icon: <XCircle size={20} />, title: 'Not the best move', sub: 'Try again.' };
            case 'revealed':
                return { cls: 'bg-[#3c3a36]', icon: <Eye size={20} />, title: 'Solution', sub: 'Study it, then try the next puzzle.' };
            default:
                return {
                    cls: playerColor === 'w' ? 'bg-white text-[#262421]' : 'bg-[#1f1e1b] text-white ring-1 ring-white/10',
                    icon: <PuzzleIcon size={20} />,
                    title: `${sideName} to move`,
                    sub: 'Find the best move.',
                };
        }
    })();

    return (
        <div className="flex h-[100dvh] flex-col overflow-hidden overscroll-none bg-[#302e2b] text-white">
            <header className="shrink-0 border-b border-white/5 bg-[#262421]">
                <div className="mx-auto flex h-14 max-w-[1500px] items-center justify-between px-3 sm:px-5 lg:h-12">
                    <button type="button" onClick={onExit} className="flex items-center gap-2 rounded-lg px-2 py-2 text-sm font-semibold text-navy-200 transition hover:bg-white/5 hover:text-white">
                        <ArrowLeft size={17} />
                        <span className="hidden sm:inline">Home</span>
                    </button>
                    <div className="flex items-center gap-2">
                        <PuzzleIcon size={18} className="text-[#81b64c]" />
                        <span className="font-display font-extrabold">Puzzles</span>
                    </div>
                    <div className="flex items-center gap-1.5 rounded-lg bg-white/5 px-3 py-1.5 text-xs font-bold">
                        <Flame size={14} className="text-orange-400" />
                        {store.streak}
                    </div>
                </div>
            </header>

            <main className="flex min-h-0 flex-1 items-start justify-center overflow-y-auto p-0 lg:items-center lg:overflow-hidden lg:p-2">
                <div className="grid w-full max-w-[1500px] 2xl:max-w-[1760px] gap-0 lg:h-full lg:grid-cols-[auto_minmax(320px,380px)] 2xl:grid-cols-[auto_minmax(320px,380px)_160px] lg:items-stretch lg:justify-center lg:gap-5">
                    <section className="flex min-w-0 justify-center lg:items-center">
                        <div className="w-full max-w-[min(100vw,max(260px,calc(100dvh-230px)))] lg:w-[min(calc(100dvh-80px),calc(100vw-420px),1100px)] 2xl:w-[min(calc(100dvh-80px),calc(100vw-620px),1100px)] lg:max-w-none">
                            <div className="relative">
                                <ChessBoard
                                    board={board}
                                    selected={selected ?? hintSquare}
                                    legal={legal}
                                    lastMove={lastMove}
                                    status={status}
                                    orientation={playerColor}
                                    turn={state.turn}
                                    onSquareClick={onSquareClick}
                                    onDrop={onDrop}
                                    promotion={promotion}
                                    onChoosePromotion={(m) => {
                                        setPromotion(null);
                                        tryMove(m);
                                    }}
                                    onCancelPromotion={() => setPromotion(null)}
                                />
                            </div>
                        </div>
                    </section>

                    <aside className="flex min-h-0 flex-col gap-3 p-3 lg:rounded-lg lg:bg-[#262421] lg:p-4">
                        <div className={`flex items-center gap-3 rounded-lg px-4 py-3 ${banner.cls}`}>
                            {banner.icon}
                            <div>
                                <p className="font-display text-lg font-extrabold leading-tight">{banner.title}</p>
                                <p className="text-xs opacity-80">{banner.sub}</p>
                            </div>
                        </div>

                        <div className="grid grid-cols-4 gap-1 rounded-lg bg-[#1f1e1b] p-1">
                            {LEVELS.map((l) => (
                                <button
                                    key={l.id}
                                    type="button"
                                    onClick={() => setLevel(l.id)}
                                    className={`rounded-md py-2 text-xs font-bold transition ${level === l.id ? 'bg-[#81b64c] text-white' : 'text-[#989795] hover:bg-white/5 hover:text-white'}`}
                                >
                                    {l.id}
                                </button>
                            ))}
                        </div>

                        <div className="rounded-lg bg-[#1f1e1b] p-3 text-sm">
                            <div className="flex items-center justify-between">
                                <span className="text-[#989795]">Puzzle rating</span>
                                <span className="font-bold">{puzzle?.rating ?? '—'}</span>
                            </div>
                            {themes.length > 0 && (phase === 'solved' || phase === 'revealed') && (
                                <div className="mt-2 flex flex-wrap gap-1.5">
                                    {themes.map((t) => (
                                        <span key={t} className="rounded bg-white/5 px-2 py-0.5 text-[11px] font-semibold text-[#c3c2c1]">{t}</span>
                                    ))}
                                </div>
                            )}
                            <div className="mt-3 grid grid-cols-3 gap-2 text-center">
                                <div className="rounded bg-white/5 py-2">
                                    <p className="text-lg font-extrabold">{solvedInLevel}<span className="text-xs text-[#989795]">/{levelPuzzles.length}</span></p>
                                    <p className="text-[10px] uppercase tracking-wide text-[#989795]">Solved</p>
                                </div>
                                <div className="rounded bg-white/5 py-2">
                                    <p className="text-lg font-extrabold">{store.streak}</p>
                                    <p className="text-[10px] uppercase tracking-wide text-[#989795]">Streak</p>
                                </div>
                                <div className="rounded bg-white/5 py-2">
                                    <p className="text-lg font-extrabold">{store.best}</p>
                                    <p className="text-[10px] uppercase tracking-wide text-[#989795]">Best</p>
                                </div>
                            </div>
                        </div>

                        <div className="grid grid-cols-3 gap-2">
                            <button type="button" onClick={showHint} disabled={phase !== 'solving'} className="flex flex-col items-center gap-1 rounded-lg bg-[#3c3a36] py-2.5 text-xs font-bold transition hover:bg-[#4a4844] disabled:opacity-40">
                                <Lightbulb size={16} /> Hint
                            </button>
                            <button type="button" onClick={() => puzzle && loadPuzzle(puzzle)} className="flex flex-col items-center gap-1 rounded-lg bg-[#3c3a36] py-2.5 text-xs font-bold transition hover:bg-[#4a4844]">
                                <RotateCcw size={16} /> Retry
                            </button>
                            <button type="button" onClick={showSolution} disabled={phase === 'solved' || phase === 'revealed'} className="flex flex-col items-center gap-1 rounded-lg bg-[#3c3a36] py-2.5 text-xs font-bold transition hover:bg-[#4a4844] disabled:opacity-40">
                                <Eye size={16} /> Solution
                            </button>
                        </div>

                        <button
                            type="button"
                            onClick={nextPuzzle}
                            className="flex items-center justify-center gap-2 rounded-lg bg-[#81b64c] px-4 py-3 text-base font-extrabold text-white shadow-[0_3px_0_#45753c] transition hover:bg-[#a3d160]"
                        >
                            Next Puzzle <ChevronRight size={18} />
                        </button>

                        <div className="mt-auto space-y-2 pt-2">
                            <div className="2xl:hidden"><KhelShopCard /></div>
                            <AdSenseSlot slot={ADSENSE_SLOTS.puzzles} />
                        </div>

                        <p className="pt-1 text-center text-[10px] text-[#6f6d6a]">
                            Puzzles from the Lichess open database (CC0)
                        </p>
                    </aside>

                    {/* Chess.com-style skyscraper ad (wide screens only) */}
                    <div className="hidden 2xl:flex 2xl:items-center 2xl:justify-center">
                        <KhelSkyscraper />
                    </div>
                </div>
            </main>
        </div>
    );
}
