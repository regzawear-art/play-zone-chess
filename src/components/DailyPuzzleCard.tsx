import { useMemo } from 'react';
import { CalendarDays, ChevronRight, Puzzle as PuzzleIcon } from 'lucide-react';
import { parseFEN, parseUci } from '../game/fen';
import { legalMoves, makeMove } from '../game/engine';
import { pieceSVG } from '../game/pieces';
import PUZZLES_RAW from '../data/puzzles.json';

interface PuzzleData {
    id: string;
    fen: string;
    moves: string[];
    rating: number;
    themes: string[];
}

const PUZZLES = PUZZLES_RAW as PuzzleData[];

/** Day number in India time, so everyone gets the same puzzle each IST day. */
function istDayNumber(): number {
    return Math.floor((Date.now() + 5.5 * 3600 * 1000) / 86400000);
}

export function getDailyPuzzle(): PuzzleData {
    const pool = PUZZLES.filter((p) => p.rating < 1600);
    // Multiply by a prime so consecutive days don't give neighbouring ratings.
    return pool[(istDayNumber() * 37) % pool.length];
}

function istDateLabel(): string {
    return new Date().toLocaleDateString('en-IN', { timeZone: 'Asia/Kolkata', day: 'numeric', month: 'short', year: 'numeric' });
}

export function DailyPuzzleCard({ onSolve }: { onSolve: (id: string) => void }) {
    const puzzle = useMemo(getDailyPuzzle, []);

    const { board, solver, mateIn } = useMemo(() => {
        const { board: b, state: s } = parseFEN(puzzle.fen);
        const u = parseUci(puzzle.moves[0]);
        const m = legalMoves(b, s, s.turn).find(
            (x) => x.from[0] === u.from[0] && x.from[1] === u.from[1] && x.to[0] === u.to[0] && x.to[1] === u.to[1],
        );
        const after = m ? makeMove(b, s, m) : { board: b, state: s };
        const mate = puzzle.themes.find((t) => /^mateIn\d$/.test(t));
        return { board: after.board, solver: after.state.turn, mateIn: mate ? mate.slice(-1) : null };
    }, [puzzle]);

    const rows = solver === 'w' ? [0, 1, 2, 3, 4, 5, 6, 7] : [7, 6, 5, 4, 3, 2, 1, 0];
    const cols = solver === 'w' ? [0, 1, 2, 3, 4, 5, 6, 7] : [7, 6, 5, 4, 3, 2, 1, 0];
    const side = solver === 'w' ? 'White' : 'Black';

    return (
        <section id="daily-puzzle" className="w-full px-4 py-10 sm:px-6 lg:px-8 lg:py-12">
            <div className="mx-auto grid max-w-5xl items-center gap-6 overflow-hidden rounded-2xl border border-white/10 bg-[#262421] p-5 sm:p-7 md:grid-cols-[minmax(0,320px)_1fr] md:gap-10">
                <button
                    type="button"
                    onClick={() => onSolve(puzzle.id)}
                    aria-label="Open today's puzzle"
                    className="mx-auto grid aspect-square w-full max-w-[320px] grid-cols-8 overflow-hidden rounded-md shadow-lg transition hover:scale-[1.01]"
                >
                    {rows.map((r) =>
                        cols.map((c) => {
                            const p = board[r][c];
                            const light = (r + c) % 2 === 0;
                            return (
                                <div
                                    key={`${r}-${c}`}
                                    className="relative aspect-square"
                                    style={{ background: light ? 'var(--board-light, #ebecd0)' : 'var(--board-dark, #779556)' }}
                                >
                                    {p && (
                                        <div
                                            className="absolute inset-0 p-[6%] [&>svg]:h-full [&>svg]:w-full"
                                            dangerouslySetInnerHTML={{ __html: pieceSVG(p.type, p.color) }}
                                        />
                                    )}
                                </div>
                            );
                        }),
                    )}
                </button>

                <div className="text-center md:text-left">
                    <span className="inline-flex items-center gap-1.5 rounded-full bg-[#81b64c]/15 px-3 py-1 text-xs font-bold text-[#a3d160] ring-1 ring-[#81b64c]/30">
                        <CalendarDays size={13} /> Daily Puzzle · {istDateLabel()}
                    </span>
                    <h2 className="mt-3 font-display text-3xl font-extrabold tracking-tight text-white sm:text-4xl">
                        {side} to move{mateIn ? ` — mate in ${mateIn}` : ''}
                    </h2>
                    <p className="mt-2 text-[#c3c2c1]">
                        A fresh puzzle every day. Find the best move and keep your streak alive.
                    </p>
                    <div className="mt-4 flex flex-wrap items-center justify-center gap-3 md:justify-start">
                        <span className="rounded-lg bg-white/5 px-3 py-1.5 text-sm font-bold text-white">
                            Rating {puzzle.rating}
                        </span>
                    </div>
                    <div className="mt-6 flex flex-wrap items-center justify-center gap-3 md:justify-start">
                        <button
                            type="button"
                            onClick={() => onSolve(puzzle.id)}
                            className="flex items-center gap-2 rounded-lg bg-[#81b64c] px-6 py-3 text-base font-extrabold text-white shadow-[0_3px_0_#45753c] transition hover:bg-[#a3d160]"
                        >
                            Solve Now <ChevronRight size={18} />
                        </button>
                        <button
                            type="button"
                            onClick={() => onSolve('')}
                            className="flex items-center gap-2 rounded-lg bg-white/5 px-5 py-3 text-sm font-bold text-white transition hover:bg-white/10"
                        >
                            <PuzzleIcon size={16} /> More Puzzles
                        </button>
                    </div>
                </div>
            </div>
        </section>
    );
}
