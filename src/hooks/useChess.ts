import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import type {
    Board,
    Color,
    GameStatus,
    GameState,
    HistoryEntry,
    MatchRecord,
    Move,
    PieceType,
    TimeControl,
    GameMode,
    AIDifficulty,
    MatchEnding,
} from '../game/types';
import { initialBoard } from '../game/board';
import {
    gameStatus as computeStatus,
    legalMoves,
    legalMovesFrom,
    makeMove,
    toSAN,
    initialState,
} from '../game/engine';
import { chooseMove, setAIDifficulty } from '../game/ai';
import { sound } from '../game/sound';
import { getOpeningName } from '../game/openings';

export const TIME_CONTROLS: Record<
    TimeControl,
    { label: string; initialMs: number; incrementMs: number }
> = {
    '1min': {
        label: '1 Minute',
        initialMs: 60_000,
        incrementMs: 0,
    },
    '3min': {
        label: '3 Minute',
        initialMs: 180_000,
        incrementMs: 2_000,
    },
    '5min': {
        label: '5 Minute',
        initialMs: 300_000,
        incrementMs: 3_000,
    },
    '10min': {
        label: '10 Minute',
        initialMs: 600_000,
        incrementMs: 5_000,
    },
    '30min': {
        label: '30 Minute',
        initialMs: 1_800_000,
        incrementMs: 10_000,
    },
    custom: {
        label: 'Custom',
        initialMs: 300_000,
        incrementMs: 2_000,
    },
};

export interface UseChessOptions {
    playerColor: Color;
    opponentColor: Color;
    vsComputer: boolean;
    timeControl: TimeControl;
    customMinutes: number;
    opponentName: string;
    opponentAvatar: string;
    opponentFlag: string;
    gameMode?: GameMode;
    aiDifficulty?: AIDifficulty;
}

let matchIdCounter = Date.now();

function isInsufficientMaterial(board: Board): boolean {
    const pieces = board.flat().filter(
        (piece): piece is NonNullable<typeof piece> => piece !== null,
    );

    const nonKings = pieces.filter((piece) => piece.type !== 'k');

    // King vs King
    if (nonKings.length === 0) {
        return true;
    }

    // Any pawn, rook or queen means there is sufficient material.
    if (
        nonKings.some(
            (piece) =>
                piece.type === 'p' ||
                piece.type === 'r' ||
                piece.type === 'q',
        )
    ) {
        return false;
    }

    // King + Bishop vs King
    if (
        nonKings.length === 1 &&
        nonKings[0].type === 'b'
    ) {
        return true;
    }

    // King + Knight vs King
    if (
        nonKings.length === 1 &&
        nonKings[0].type === 'n'
    ) {
        return true;
    }

    // King + Bishop vs King + Bishop
    //
    // A draw is guaranteed when both bishops remain on
    // squares of the same color.
    if (
        nonKings.length === 2 &&
        nonKings.every((piece) => piece.type === 'b')
    ) {
        const bishopSquares: Array<[number, number]> = [];

        board.forEach((row, r) => {
            row.forEach((piece, c) => {
                if (piece?.type === 'b') {
                    bishopSquares.push([r, c]);
                }
            });
        });

        if (bishopSquares.length === 2) {
            const firstColor =
                (bishopSquares[0][0] + bishopSquares[0][1]) % 2;
            const secondColor =
                (bishopSquares[1][0] + bishopSquares[1][1]) % 2;

            return firstColor === secondColor;
        }
    }

    return false;
}

export function useChess(opts: UseChessOptions) {
    const {
        playerColor,
        vsComputer,
        timeControl,
        customMinutes,
        opponentName,
        opponentAvatar,
        opponentFlag,
        aiDifficulty,
    } = opts;

    useEffect(() => {
        if (aiDifficulty) {
            setAIDifficulty(aiDifficulty);
        }
    }, [aiDifficulty]);

    const tcBase = TIME_CONTROLS[timeControl];

    const initialMs =
        timeControl === 'custom'
            ? customMinutes * 60_000
            : tcBase.initialMs;

    const incrementMs = tcBase.incrementMs;

    const [board, setBoard] = useState<Board>(() => initialBoard());
    const [state, setState] = useState<GameState>(() => initialState());

    const [status, setStatus] = useState<GameStatus>({
        phase: 'playing',
        winner: null,
        stage: 'opening',
    });

    const [history, setHistory] = useState<HistoryEntry[]>([]);
    const [selected, setSelected] =
        useState<[number, number] | null>(null);

    const [legal, setLegal] = useState<Move[]>([]);
    const [lastMove, setLastMove] =
        useState<Move | null>(null);

    const [promotion, setPromotion] = useState<{
        from: [number, number];
        to: [number, number];
        moves: Move[];
    } | null>(null);

    const [pendingResult, setPendingResult] = useState<{
        status: GameStatus;
        ending: MatchEnding;
    } | null>(null);

    const [matches, setMatches] = useState<MatchRecord[]>([]);

    const [whiteMs, setWhiteMs] = useState(initialMs);
    const [blackMs, setBlackMs] = useState(initialMs);

    const [running, setRunning] = useState(false);
    const [started, setStarted] = useState(false);
    const [thinking, setThinking] = useState(false);

    const [redoStack, setRedoStack] =
        useState<HistoryEntry[]>([]);

    const boardRef = useRef(board);
    const stateRef = useRef(state);
    const statusRef = useRef(status);
    const startedRef = useRef(started);
    const initialMsRef = useRef(initialMs);

    boardRef.current = board;
    stateRef.current = state;
    statusRef.current = status;
    startedRef.current = started;
    initialMsRef.current = initialMs;

    const tcLabel =
        timeControl === 'custom'
            ? `${customMinutes} min`
            : tcBase.label;

    // ---------------------------------------------------------
    // Helpers
    // ---------------------------------------------------------

    const finishGame = useCallback(
        (
            winner: Color | null,
            ending: MatchEnding,
            nextStatus?: GameStatus,
        ) => {
            const finalStatus: GameStatus =
                nextStatus ?? {
                    phase:
                        ending === 'stalemate' ||
                            ending === 'insufficient_material' ||
                            ending === 'draw_agreement'
                            ? 'draw'
                            : 'checkmate',
                    winner,
                    stage: statusRef.current.stage,
                };

            setRunning(false);
            setThinking(false);
            setSelected(null);
            setLegal([]);
            setPromotion(null);

            setStatus(finalStatus);

            setPendingResult({
                status: finalStatus,
                ending,
            });

            sound.play(
                ending === 'checkmate'
                    ? 'checkmate'
                    : 'game-end',
            );

            recordMatch(winner, ending);
        },
        [],
    );

    const recordMatch = useCallback(
        (
            winner: Color | null,
            ending: MatchEnding,
        ) => {
            const playerWon = winner === playerColor;
            const isDraw = winner === null;

            const result: MatchRecord['result'] =
                isDraw
                    ? 'draw'
                    : playerWon
                        ? 'win'
                        : 'loss';

            const ratingChange =
                isDraw
                    ? 0
                    : playerWon
                        ? 8
                        : -6;

            const rec: MatchRecord = {
                id: matchIdCounter++,
                date: Date.now(),
                opponentName,
                opponentAvatar,
                opponentFlag,
                result,
                moves: history.length,
                timeControlLabel: tcLabel,
                ratingChange,
                ending,
            };

            setMatches((m) => [rec, ...m].slice(0, 50));
        },
        [
            playerColor,
            history.length,
            opponentName,
            opponentAvatar,
            opponentFlag,
            tcLabel,
        ],
    );

    // ---------------------------------------------------------
    // Clock
    // ---------------------------------------------------------

    useEffect(() => {
        if (
            !running ||
            statusRef.current.phase === 'checkmate' ||
            statusRef.current.phase === 'stalemate' ||
            statusRef.current.phase === 'draw'
        ) {
            return;
        }

        const interval = setInterval(() => {
            const currentState = stateRef.current;

            if (currentState.turn === 'w') {
                setWhiteMs((ms) => Math.max(0, ms - 100));
            } else {
                setBlackMs((ms) => Math.max(0, ms - 100));
            }
        }, 100);

        return () => clearInterval(interval);
    }, [running, state.turn]);

    // ---------------------------------------------------------
    // Timeout
    // ---------------------------------------------------------

    useEffect(() => {
        if (!started || !running) return;
        if (pendingResult) return;

        if (whiteMs <= 0) {
            const winner: Color = 'b';

            const timeoutStatus: GameStatus = {
                phase: 'draw',
                winner,
                stage: statusRef.current.stage,
            };

            setRunning(false);
            setThinking(false);

            setStatus(timeoutStatus);

            setPendingResult({
                status: timeoutStatus,
                ending: 'timeout',
            });

            sound.play('game-end');
            recordMatch(winner, 'timeout');

            return;
        }

        if (blackMs <= 0) {
            const winner: Color = 'w';

            const timeoutStatus: GameStatus = {
                phase: 'draw',
                winner,
                stage: statusRef.current.stage,
            };

            setRunning(false);
            setThinking(false);

            setStatus(timeoutStatus);

            setPendingResult({
                status: timeoutStatus,
                ending: 'timeout',
            });

            sound.play('game-end');
            recordMatch(winner, 'timeout');
        }
    }, [
        whiteMs,
        blackMs,
        started,
        running,
        pendingResult,
        recordMatch,
    ]);

    // ---------------------------------------------------------
    // Status
    // ---------------------------------------------------------

    const recomputeStatus = useCallback(
        (b: Board, s: GameState) => {
            const st = computeStatus(b, s);
            setStatus(st);
            return st;
        },
        [],
    );

    // ---------------------------------------------------------
    // Move
    // ---------------------------------------------------------

    const doMove = useCallback(
        (move: Move) => {
            if (!running) return;
            if (pendingResult) return;

            const b = boardRef.current;
            const s = stateRef.current;

            const allLegal = legalMoves(
                b,
                s,
                s.turn,
            );

            const san = toSAN(
                b,
                s,
                move,
                allLegal,
            );

            const {
                board: nb,
                state: ns,
            } = makeMove(b, s, move);

            setHistory((h) => [
                ...h,
                {
                    move,
                    san,
                    boardBefore: b,
                    stateBefore: s,
                },
            ]);

            setBoard(nb);
            setState(ns);
            setLastMove(move);
            setSelected(null);
            setLegal([]);

            const st = recomputeStatus(nb, ns);

            if (move.castle) {
                sound.play('castle');
            } else if (
                move.capture ||
                move.enPassant
            ) {
                sound.play('capture');
            } else {
                sound.play('move');
            }

            // Checkmate
            if (st.phase === 'checkmate') {
                finishGame(
                    st.winner,
                    'checkmate',
                    st,
                );
                return;
            }

            // Stalemate
            if (st.phase === 'stalemate') {
                finishGame(
                    null,
                    'stalemate',
                    {
                        ...st,
                        phase: 'draw',
                        winner: null,
                    },
                );
                return;
            }

            // Insufficient material
            if (isInsufficientMaterial(nb)) {
                finishGame(
                    null,
                    'insufficient_material',
                    {
                        phase: 'draw',
                        winner: null,
                        stage: st.stage,
                    },
                );
                return;
            }

            if (st.phase === 'check') {
                sound.play('check');
            }

            // Increment is awarded only when the game continues.
            if (s.turn === 'w') {
                setWhiteMs(
                    (ms) => ms + incrementMs,
                );
            } else {
                setBlackMs(
                    (ms) => ms + incrementMs,
                );
            }
        },
        [
            running,
            pendingResult,
            recomputeStatus,
            incrementMs,
            finishGame,
        ],
    );

    // ---------------------------------------------------------
    // Computer move
    // ---------------------------------------------------------

    useEffect(() => {
        if (!vsComputer) return;
        if (!running) return;
        if (pendingResult) return;

        if (
            status.phase === 'checkmate' ||
            status.phase === 'stalemate' ||
            status.phase === 'draw'
        ) {
            return;
        }

        const computerColor: Color =
            playerColor === 'w' ? 'b' : 'w';

        if (state.turn !== computerColor) {
            return;
        }

        setThinking(true);

        const timer = setTimeout(() => {
            (async () => {
                try {
                    const move = await chooseMove(
                        boardRef.current,
                        stateRef.current,
                        computerColor,
                    );

                    if (move && startedRef.current) {
                        doMove(move);
                    }
                } catch (e) {
                    // eslint-disable-next-line no-console
                    console.error(
                        'AI worker error',
                        e,
                    );
                } finally {
                    setThinking(false);
                }
            })();
        }, 50);

        return () => clearTimeout(timer);
    }, [
        vsComputer,
        running,
        pendingResult,
        state.turn,
        status.phase,
        playerColor,
        doMove,
    ]);

    // ---------------------------------------------------------
    // Select square
    // ---------------------------------------------------------

    const selectSquare = useCallback(
        (r: number, c: number) => {
            if (!running || pendingResult) return;

            if (
                status.phase === 'checkmate' ||
                status.phase === 'stalemate' ||
                status.phase === 'draw'
            ) {
                return;
            }

            if (
                vsComputer &&
                state.turn !== playerColor
            ) {
                return;
            }

            const b = boardRef.current;
            const s = stateRef.current;
            const piece = b[r][c];

            if (selected) {
                const target = legal.find(
                    (m) =>
                        m.to[0] === r &&
                        m.to[1] === c,
                );

                if (target) {
                    if (target.promotion) {
                        const promoMoves =
                            legal.filter(
                                (m) =>
                                    m.to[0] === r &&
                                    m.to[1] === c,
                            );

                        setPromotion({
                            from: selected,
                            to: [r, c],
                            moves: promoMoves,
                        });

                        return;
                    }

                    doMove(target);
                    return;
                }
            }

            if (
                piece &&
                piece.color === s.turn
            ) {
                setSelected([r, c]);

                setLegal(
                    legalMovesFrom(
                        b,
                        s,
                        s.turn,
                        r,
                        c,
                    ),
                );

                sound.play('select');
            } else {
                setSelected(null);
                setLegal([]);
            }
        },
        [
            running,
            pendingResult,
            selected,
            legal,
            status.phase,
            vsComputer,
            state.turn,
            playerColor,
            doMove,
        ],
    );

    // ---------------------------------------------------------
    // Drag/drop
    // ---------------------------------------------------------

    const dropPiece = useCallback(
        (
            from: [number, number],
            to: [number, number],
        ) => {
            if (!running || pendingResult) {
                return false;
            }

            if (
                status.phase === 'checkmate' ||
                status.phase === 'stalemate' ||
                status.phase === 'draw'
            ) {
                return false;
            }

            if (
                vsComputer &&
                state.turn !== playerColor
            ) {
                return false;
            }

            const b = boardRef.current;
            const s = stateRef.current;

            const moves = legalMovesFrom(
                b,
                s,
                s.turn,
                from[0],
                from[1],
            );

            const target = moves.find(
                (m) =>
                    m.to[0] === to[0] &&
                    m.to[1] === to[1],
            );

            if (!target) return false;

            if (target.promotion) {
                setPromotion({
                    from,
                    to,
                    moves: moves.filter(
                        (m) =>
                            m.to[0] === to[0] &&
                            m.to[1] === to[1],
                    ),
                });

                return true;
            }

            doMove(target);
            return true;
        },
        [
            running,
            pendingResult,
            status.phase,
            vsComputer,
            state.turn,
            playerColor,
            doMove,
        ],
    );

    // ---------------------------------------------------------
    // Promotion
    // ---------------------------------------------------------

    const choosePromotion = useCallback(
        (move: Move) => {
            setPromotion(null);
            doMove(move);
        },
        [doMove],
    );

    const cancelPromotion = useCallback(
        () => setPromotion(null),
        [],
    );

    // ---------------------------------------------------------
    // Start game
    // ---------------------------------------------------------

    const startGame = useCallback(() => {
        sound.unlock();
        sound.play('game-start');

        setBoard(initialBoard());
        setState(initialState());

        setStatus({
            phase: 'playing',
            winner: null,
            stage: 'opening',
        });

        setHistory([]);
        setSelected(null);
        setLegal([]);
        setLastMove(null);
        setPromotion(null);
        setPendingResult(null);
        setRedoStack([]);

        setWhiteMs(
            initialMsRef.current,
        );

        setBlackMs(
            initialMsRef.current,
        );

        setRunning(true);
        setStarted(true);
        setThinking(false);
    }, []);

    // ---------------------------------------------------------
    // Resign
    // ---------------------------------------------------------

    const resign = useCallback(() => {
        if (!started || pendingResult) return;

        const winner: Color =
            playerColor === 'w' ? 'b' : 'w';

        const resignationStatus: GameStatus = {
            phase: 'draw',
            winner,
            stage: statusRef.current.stage,
        };

        setRunning(false);
        setThinking(false);

        setStatus(resignationStatus);

        setPendingResult({
            status: resignationStatus,
            ending: 'resignation',
        });

        sound.play('game-end');

        recordMatch(
            winner,
            'resignation',
        );
    }, [
        started,
        pendingResult,
        playerColor,
        recordMatch,
    ]);

    // ---------------------------------------------------------
    // Undo
    // ---------------------------------------------------------

    const undo = useCallback(() => {
        setHistory((h) => {
            if (h.length === 0) return h;

            const stepsBack =
                vsComputer && h.length >= 2
                    ? 2
                    : 1;

            const removed = h.slice(
                -stepsBack,
            );

            const newHist = h.slice(
                0,
                -stepsBack,
            );

            setRedoStack((r) => [
                ...r,
                ...removed.reverse(),
            ]);

            if (newHist.length === 0) {
                setBoard(initialBoard());
                setState(initialState());
            } else {
                const last =
                    newHist[newHist.length - 1];

                setBoard(last.boardBefore);
                setState(last.stateBefore);
            }

            setLastMove(null);
            setSelected(null);
            setLegal([]);
            setPromotion(null);
            setPendingResult(null);
            setRunning(startedRef.current);

            const nextBoard =
                newHist.length === 0
                    ? initialBoard()
                    : newHist[
                        newHist.length - 1
                    ].boardBefore;

            const nextState =
                newHist.length === 0
                    ? initialState()
                    : newHist[
                        newHist.length - 1
                    ].stateBefore;

            recomputeStatus(
                nextBoard,
                nextState,
            );

            return newHist;
        });
    }, [
        vsComputer,
        recomputeStatus,
    ]);

    // ---------------------------------------------------------
    // Redo
    // ---------------------------------------------------------

    const redo = useCallback(() => {
        setRedoStack((r) => {
            if (r.length === 0) return r;

            const entry =
                r[r.length - 1];

            const newStack =
                r.slice(0, -1);

            setHistory((h) => {
                const newHist = [
                    ...h,
                    entry,
                ];

                const result = makeMove(
                    entry.boardBefore,
                    entry.stateBefore,
                    entry.move,
                );

                setBoard(result.board);
                setState(result.state);
                setLastMove(entry.move);

                recomputeStatus(
                    result.board,
                    result.state,
                );

                return newHist;
            });

            return newStack;
        });
    }, [recomputeStatus]);

    // ---------------------------------------------------------
    // Jump to move
    // ---------------------------------------------------------

    const jumpToMove = useCallback(
        (index: number) => {
            setHistory((h) => {
                const target = index + 1;

                if (target >= h.length) {
                    setRedoStack([]);
                    return h;
                }

                const kept = h.slice(
                    0,
                    target,
                );

                const removed = h.slice(
                    target,
                );

                setRedoStack(
                    removed.reverse(),
                );

                if (kept.length === 0) {
                    setBoard(initialBoard());
                    setState(initialState());
                    setLastMove(null);
                } else {
                    const last =
                        kept[kept.length - 1];

                    const res = makeMove(
                        last.boardBefore,
                        last.stateBefore,
                        last.move,
                    );

                    setBoard(res.board);
                    setState(res.state);
                    setLastMove(last.move);

                    recomputeStatus(
                        res.board,
                        res.state,
                    );
                }

                setSelected(null);
                setLegal([]);
                setPromotion(null);
                setPendingResult(null);

                return kept;
            });
        },
        [recomputeStatus],
    );

    // ---------------------------------------------------------
    // Remote move
    // ---------------------------------------------------------

    const applyRemoteMove = useCallback(
        (move: Move) => {
            if (!running || pendingResult) {
                return false;
            }

            const b = boardRef.current;
            const s = stateRef.current;

            const allLegal = legalMoves(
                b,
                s,
                s.turn,
            );

            const found = allLegal.some(
                (m) =>
                    m.from[0] === move.from[0] &&
                    m.from[1] === move.from[1] &&
                    m.to[0] === move.to[0] &&
                    m.to[1] === move.to[1] &&
                    (m.promotion || '') ===
                    (move.promotion || ''),
            );

            if (!found) return false;

            doMove(move);
            return true;
        },
        [
            running,
            pendingResult,
            doMove,
        ],
    );

    // ---------------------------------------------------------
    // Broadcast
    // ---------------------------------------------------------

    const getMoveForBroadcast =
        useCallback((): Move | null => {
            if (history.length === 0) {
                return null;
            }

            return history[
                history.length - 1
            ].move;
        }, [history]);

    const clearMatchHistory =
        useCallback(
            () => setMatches([]),
            [],
        );

    // ---------------------------------------------------------
    // Stage
    // ---------------------------------------------------------

    const stageLabel = useMemo(() => {
        if (!started) {
            return 'Not started';
        }

        if (
            pendingResult ||
            status.phase === 'checkmate' ||
            status.phase === 'stalemate' ||
            status.phase === 'draw'
        ) {
            return 'Game over';
        }

        return status.stage;
    }, [
        started,
        status,
        pendingResult,
    ]);

    // ---------------------------------------------------------
    // Opening
    // ---------------------------------------------------------

    const currentOpening = useMemo(() => {
        if (
            !started ||
            history.length === 0
        ) {
            return '';
        }

        const sans =
            history.map((h) => h.san);

        return getOpeningName(sans);
    }, [
        started,
        history,
    ]);

    // ---------------------------------------------------------
    // Draw agreement
    // ---------------------------------------------------------

    const offerDraw = useCallback(() => {
        if (!started || pendingResult) {
            return;
        }

        const drawStatus: GameStatus = {
            phase: 'draw',
            winner: null,
            stage: statusRef.current.stage,
        };

        setRunning(false);
        setThinking(false);

        setStatus(drawStatus);

        setPendingResult({
            status: drawStatus,
            ending: 'draw_agreement',
        });

        sound.play('game-end');

        recordMatch(
            null,
            'draw_agreement',
        );
    }, [
        started,
        pendingResult,
        recordMatch,
    ]);

    // ---------------------------------------------------------
    // Return
    // ---------------------------------------------------------

    return {
        board,
        state,
        status,
        history,
        selected,
        legal,
        lastMove,
        promotion,
        pendingResult,

        whiteMs,
        blackMs,
        running,
        started,
        thinking,

        playerColor,
        matches,

        stageLabel,

        selectSquare,
        dropPiece,
        choosePromotion,
        cancelPromotion,

        startGame,
        resign,

        undo,
        redo,
        jumpToMove,

        applyRemoteMove,
        getMoveForBroadcast,

        clearMatchHistory,
        currentOpening,

        offerDraw,
    };
}