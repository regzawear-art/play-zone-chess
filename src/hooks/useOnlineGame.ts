import { useCallback, useEffect, useRef, useState } from 'react';
import type {
    Board,
    Color,
    GameStatus,
    GameState,
    HistoryEntry,
    Move,
    TimeControl,
} from '../game/types';
import { initialBoard } from '../game/board';
import {
    gameStatus as computeStatus,
    legalMoves,
    makeMove,
    toSAN,
    initialState,
} from '../game/engine';
import { sound } from '../game/sound';
import { supabase } from '../lib/supabase';

type ResultReason =
    | 'checkmate'
    | 'timeout'
    | 'resignation'
    | 'stalemate'
    | 'insufficient_material'
    | null;

interface RemoteMovePayload {
    player_id: string;
    from_row: number;
    from_col: number;
    to_row: number;
    to_col: number;
    promotion: string | null;
    san: string;
    move_number: number;
    created_at?: string;
}

interface OnlineGameRow {
    id: string;
    host_id: string;
    guest_id: string | null;
    time_control: TimeControl | null;
    status: string;
    winner: Color | null;
    turn: Color;
    white_ms: number | null;
    black_ms: number | null;
    clock_updated_at: string | null;
    payload: unknown;
}

interface PersistedMove {
    player_id: string;
    from_row: number;
    from_col: number;
    to_row: number;
    to_col: number;
    promotion: string | null;
    san: string;
    move_number: number;
    created_at?: string;
}

interface GamePayload {
    result_reason?: ResultReason;
    resultReason?: ResultReason;
}

export interface OnlineGameConfig {
    gameId: string;
    roomId: string;
    isHost: boolean;
    userId: string;
    playerColor: Color;
    timeControl: TimeControl;
    customMinutes: number;
}

export interface OnlineGameState {
    board: Board;
    state: GameState;
    status: GameStatus;
    history: HistoryEntry[];
    lastMove: Move | null;
    selected: [number, number] | null;
    legal: Move[];
    promotion: {
        from: [number, number];
        to: [number, number];
        moves: Move[];
    } | null;
    whiteMs: number;
    blackMs: number;
    running: boolean;
    started: boolean;
    opponentConnected: boolean;
    opponentName: string;
    opponentAvatar: string;
    resultReason: ResultReason;
}

function getInitialTimeMs(
    timeControl: TimeControl | null | undefined,
    customMinutes = 5,
): number {
    if (timeControl === 'custom') {
        return (customMinutes || 5) * 60_000;
    }

    return (
        {
            '1min': 60_000,
            '3min': 180_000,
            '5min': 300_000,
            '10min': 600_000,
            '30min': 1_800_000,
        }[timeControl ?? '3min'] ?? 180_000
    );
}

function getIncrementMs(timeControl: TimeControl | null | undefined): number {
    return (
        {
            '1min': 0,
            '3min': 2_000,
            '5min': 3_000,
            '10min': 5_000,
            '30min': 10_000,
            custom: 2_000,
        }[timeControl ?? '3min'] ?? 2_000
    );
}

/*
 * Draw by insufficient material.
 *
 * Cases handled:
 * - King vs King
 * - King + bishop vs King
 * - King + knight vs King
 * - King + bishop vs King + bishop when both bishops
 *   are on the same colour square
 */
function isInsufficientMaterial(board: Board): boolean {
    const pieces: {
        color: Color;
        type: string;
        row: number;
        col: number;
    }[] = [];

    for (let r = 0; r < 8; r += 1) {
        for (let c = 0; c < 8; c += 1) {
            const piece = board[r][c];

            if (!piece) continue;

            if (piece.type === 'king') continue;

            pieces.push({
                color: piece.color,
                type: piece.type,
                row: r,
                col: c,
            });
        }
    }

    /*
     * Any pawn, rook or queen means there is potentially
     * enough material to checkmate.
     */
    if (
        pieces.some(
            (piece) =>
                piece.type === 'pawn' ||
                piece.type === 'rook' ||
                piece.type === 'queen',
        )
    ) {
        return false;
    }

    /*
     * King vs king.
     */
    if (pieces.length === 0) {
        return true;
    }

    /*
     * King + one bishop/knight vs king.
     */
    if (pieces.length === 1) {
        return (
            pieces[0].type === 'bishop' ||
            pieces[0].type === 'knight'
        );
    }

    /*
     * King + bishop vs king + bishop.
     *
     * Only automatically insufficient when both bishops
     * are on the same coloured squares.
     */
    if (
        pieces.length === 2 &&
        pieces.every((piece) => piece.type === 'bishop')
    ) {
        const firstSquareColour =
            (pieces[0].row + pieces[0].col) % 2;

        const secondSquareColour =
            (pieces[1].row + pieces[1].col) % 2;

        return firstSquareColour === secondSquareColour;
    }

    return false;
}

function readResultReason(payload: unknown): ResultReason {
    if (!payload || typeof payload !== 'object') {
        return null;
    }

    const p = payload as GamePayload;

    if (
        p.result_reason === 'checkmate' ||
        p.result_reason === 'timeout' ||
        p.result_reason === 'resignation' ||
        p.result_reason === 'stalemate' ||
        p.result_reason === 'insufficient_material'
    ) {
        return p.result_reason;
    }

    if (
        p.resultReason === 'checkmate' ||
        p.resultReason === 'timeout' ||
        p.resultReason === 'resignation' ||
        p.resultReason === 'stalemate' ||
        p.resultReason === 'insufficient_material'
    ) {
        return p.resultReason;
    }

    return null;
}

function getStoredPayload(
    payload: unknown,
    resultReason: ResultReason,
): Record<string, unknown> {
    if (
        payload &&
        typeof payload === 'object' &&
        !Array.isArray(payload)
    ) {
        return {
            ...(payload as Record<string, unknown>),
            result_reason: resultReason,
        };
    }

    return {
        result_reason: resultReason,
    };
}

export function useOnlineGame(config: OnlineGameConfig | null) {
    const initialMs = getInitialTimeMs(
        config?.timeControl,
        config?.customMinutes,
    );

    const incrementMs = getIncrementMs(config?.timeControl);

    const [board, setBoard] = useState<Board>(() => initialBoard());
    const [state, setState] = useState<GameState>(() => initialState());

    const [status, setStatus] = useState<GameStatus>({
        phase: 'playing',
        winner: null,
        stage: 'opening',
    });

    const [resultReason, setResultReason] =
        useState<ResultReason>(null);

    const [history, setHistory] = useState<HistoryEntry[]>([]);
    const [lastMove, setLastMove] = useState<Move | null>(null);
    const [selected, setSelected] =
        useState<[number, number] | null>(null);

    const [legal, setLegal] = useState<Move[]>([]);

    const [promotion, setPromotion] = useState<{
        from: [number, number];
        to: [number, number];
        moves: Move[];
    } | null>(null);

    const [whiteMs, setWhiteMs] = useState(initialMs);
    const [blackMs, setBlackMs] = useState(initialMs);

    const [running, setRunning] = useState(false);
    const [started, setStarted] = useState(false);
    const [opponentConnected, setOpponentConnected] =
        useState(false);

    const [opponentName, setOpponentName] =
        useState('Opponent');

    const [opponentAvatar, setOpponentAvatar] =
        useState('');

    const boardRef = useRef(board);
    const stateRef = useRef(state);
    const statusRef = useRef(status);
    const resultReasonRef = useRef<ResultReason>(resultReason);
    const configRef = useRef(config);

    const whiteMsRef = useRef(whiteMs);
    const blackMsRef = useRef(blackMs);
    const runningRef = useRef(running);
    const startedRef = useRef(started);

    const clockUpdatedAtRef =
        useRef<number | null>(null);

    const loadingGameRef = useRef(false);

    boardRef.current = board;
    stateRef.current = state;
    statusRef.current = status;
    resultReasonRef.current = resultReason;
    configRef.current = config;

    whiteMsRef.current = whiteMs;
    blackMsRef.current = blackMs;
    runningRef.current = running;
    startedRef.current = started;

    /*
     * Get the latest clock values including elapsed time
     * since the last authoritative clock snapshot.
     */
    const getCurrentClock = useCallback(() => {
        let white = whiteMsRef.current;
        let black = blackMsRef.current;

        const lastClockUpdate =
            clockUpdatedAtRef.current;

        if (
            runningRef.current &&
            lastClockUpdate !== null
        ) {
            const elapsed = Math.max(
                0,
                Date.now() - lastClockUpdate,
            );

            if (stateRef.current.turn === 'w') {
                white = Math.max(
                    0,
                    white - elapsed,
                );
            } else {
                black = Math.max(
                    0,
                    black - elapsed,
                );
            }
        }

        return {
            white: Math.round(white),
            black: Math.round(black),
        };
    }, []);

    /*
     * Persist the current clock state.
     */
    const persistClock = useCallback(
        async (force = false) => {
            const cfg = configRef.current;

            if (!cfg) return;

            if (
                !force &&
                !runningRef.current
            ) {
                return;
            }

            const clock = getCurrentClock();

            whiteMsRef.current = clock.white;
            blackMsRef.current = clock.black;

            setWhiteMs(clock.white);
            setBlackMs(clock.black);

            const now =
                new Date().toISOString();

            clockUpdatedAtRef.current =
                Date.now();

            await supabase
                .from('online_games')
                .update({
                    white_ms: clock.white,
                    black_ms: clock.black,
                    clock_updated_at: now,
                    turn: stateRef.current.turn,
                    updated_at: now,
                })
                .eq('id', cfg.gameId);
        },
        [getCurrentClock],
    );

    /*
     * Finalize the game.
     *
     * Result is persisted inside payload so we don't need
     * another database column.
     */
    const finalizeGame = useCallback(
        async (
            reason: Exclude<ResultReason, null>,
            winner: Color | null,
            finalWhiteMs?: number,
            finalBlackMs?: number,
        ) => {
            const cfg = configRef.current;

            if (!cfg) return;

            /*
             * Never overwrite an already-finalized result.
             */
            if (resultReasonRef.current !== null) {
                return;
            }

            resultReasonRef.current = reason;
            setResultReason(reason);

            setRunning(false);
            runningRef.current = false;

            const white =
                Math.max(
                    0,
                    Math.round(
                        finalWhiteMs ??
                        whiteMsRef.current,
                    ),
                );

            const black =
                Math.max(
                    0,
                    Math.round(
                        finalBlackMs ??
                        blackMsRef.current,
                    ),
                );

            whiteMsRef.current = white;
            blackMsRef.current = black;

            setWhiteMs(white);
            setBlackMs(black);

            const now =
                new Date().toISOString();

            clockUpdatedAtRef.current =
                Date.now();

            /*
             * Keep the existing GameStatus shape.
             *
             * The actual ending reason is stored separately
             * in resultReason.
             */
            if (reason === 'stalemate' ||
                reason === 'insufficient_material') {
                setStatus({
                    phase: 'stalemate',
                    winner: null,
                    stage:
                        statusRef.current.stage,
                });
            } else {
                setStatus({
                    phase: 'checkmate',
                    winner,
                    stage:
                        statusRef.current.stage,
                });
            }

            const currentPayload =
                await supabase
                    .from('online_games')
                    .select('payload')
                    .eq('id', cfg.gameId)
                    .maybeSingle();

            const payload =
                getStoredPayload(
                    currentPayload.data?.payload,
                    reason,
                );

            /*
             * Only change an ACTIVE game.
             *
             * This prevents a second client from accidentally
             * overwriting an already-completed result.
             */
            const { data, error } =
                await supabase
                    .from('online_games')
                    .update({
                        status: 'completed',
                        winner,
                        white_ms: white,
                        black_ms: black,
                        clock_updated_at: now,
                        updated_at: now,
                        payload,
                    })
                    .eq('id', cfg.gameId)
                    .eq('status', 'active')
                    .select('id')
                    .maybeSingle();

            if (error) {
                console.error(
                    'Failed to finalize online game:',
                    error,
                );
                return;
            }

            /*
             * If no row was updated, another client already
             * finalized the game. Its realtime event will provide
             * the authoritative result.
             */
            if (!data) {
                return;
            }

            sound.play('game-end');
        },
        [],
    );

    /*
     * Fetch opponent profile.
     */
    useEffect(() => {
        if (!config?.gameId) return;

        const myId = config.userId;

        supabase
            .from('online_games')
            .select('host_id, guest_id')
            .eq('id', config.gameId)
            .maybeSingle()
            .then(({ data }) => {
                if (!data) return;

                const oppId =
                    data.host_id === myId
                        ? data.guest_id
                        : data.host_id;

                if (!oppId) return;

                supabase
                    .from('profiles')
                    .select(
                        'username, display_name, avatar_url',
                    )
                    .eq('id', oppId)
                    .maybeSingle()
                    .then(({ data: profile }) => {
                        if (profile) {
                            setOpponentName(
                                profile.display_name ||
                                profile.username ||
                                'Opponent',
                            );

                            setOpponentAvatar(
                                profile.avatar_url ||
                                '',
                            );
                        }
                    });
            });
    }, [
        config?.gameId,
        config?.userId,
    ]);

    /*
     * Load and reconstruct existing game.
     */
    useEffect(() => {
        if (!config?.gameId) return;

        let cancelled = false;

        const loadGame = async () => {
            loadingGameRef.current = true;

            setRunning(false);
            setStarted(false);
            setOpponentConnected(false);

            const { data: gameRow, error: gameError } =
                await supabase
                    .from('online_games')
                    .select(
                        `
                            id,
                            host_id,
                            guest_id,
                            time_control,
                            status,
                            winner,
                            turn,
                            white_ms,
                            black_ms,
                            clock_updated_at,
                            payload
                        `,
                    )
                    .eq('id', config.gameId)
                    .maybeSingle();

            if (cancelled) {
                loadingGameRef.current = false;
                return;
            }

            if (gameError) {
                console.error(
                    '[useOnlineGame] Failed to load online game:',
                    gameError
                );

                loadingGameRef.current = false;
                return;
            }

            if (!gameRow) {
                console.error(
                    '[useOnlineGame] Online game row not found:',
                    {
                        gameId: config.gameId,
                        userId: config.userId,
                    }
                );

                loadingGameRef.current = false;
                return;
            }

            const row =
                gameRow as OnlineGameRow;

            const { data: moveRows, error: movesError } =
                await supabase
                    .from('online_game_moves')
                    .select(
                        `
                            player_id,
                            from_row,
                            from_col,
                            to_row,
                            to_col,
                            promotion,
                            san,
                            move_number,
                            created_at
                        `,
                    )
                    .eq('game_id', config.gameId)
                    .order(
                        'created_at',
                        { ascending: true },
                    );

            if (movesError) {
                console.error(
                    'Failed to load online game moves:',
                    movesError,
                );
            }

            const persistedMoves =
                (moveRows || []) as PersistedMove[];

            let currentBoard =
                initialBoard();

            let currentState =
                initialState();

            let currentHistory:
                HistoryEntry[] = [];

            let currentLastMove:
                Move | null = null;

            /*
             * Replay persisted moves.
             */
            for (const persisted of persistedMoves) {
                const allLegal =
                    legalMoves(
                        currentBoard,
                        currentState,
                        currentState.turn,
                    );

                const found =
                    allLegal.find(
                        (mv) =>
                            mv.from[0] ===
                            persisted.from_row &&
                            mv.from[1] ===
                            persisted.from_col &&
                            mv.to[0] ===
                            persisted.to_row &&
                            mv.to[1] ===
                            persisted.to_col &&
                            (mv.promotion || '') ===
                            (persisted.promotion || ''),
                    );

                if (!found) {
                    console.warn(
                        'Could not replay persisted move:',
                        persisted,
                    );

                    continue;
                }

                const san =
                    persisted.san ||
                    toSAN(
                        currentBoard,
                        currentState,
                        found,
                        allLegal,
                    );

                const beforeBoard =
                    currentBoard;

                const beforeState =
                    currentState;

                const result =
                    makeMove(
                        currentBoard,
                        currentState,
                        found,
                    );

                currentHistory.push({
                    move: found,
                    san,
                    boardBefore:
                        beforeBoard,
                    stateBefore:
                        beforeState,
                });

                currentBoard =
                    result.board;

                currentState =
                    result.state;

                currentLastMove =
                    found;
            }

            if (cancelled) {
                loadingGameRef.current = false;
                return;
            }

            let loadedWhiteMs =
                row.white_ms ??
                getInitialTimeMs(
                    row.time_control ||
                    config.timeControl,
                    config.customMinutes,
                );

            let loadedBlackMs =
                row.black_ms ??
                getInitialTimeMs(
                    row.time_control ||
                    config.timeControl,
                    config.customMinutes,
                );

            /*
             * Carry elapsed time forward for active games.
             */
            if (
                row.status === 'active' &&
                row.clock_updated_at &&
                row.guest_id &&
                persistedMoves.length > 0
            ) {
                const elapsed =
                    Math.max(
                        0,
                        Date.now() -
                        new Date(
                            row.clock_updated_at,
                        ).getTime(),
                    );

                if (row.turn === 'w') {
                    loadedWhiteMs =
                        Math.max(
                            0,
                            loadedWhiteMs -
                            elapsed,
                        );
                } else {
                    loadedBlackMs =
                        Math.max(
                            0,
                            loadedBlackMs -
                            elapsed,
                        );
                }
            }

            const storedReason =
                readResultReason(
                    row.payload,
                );

            /*
             * If the database says completed but old data
             * doesn't have result_reason, infer checkmate
             * only when there is actually a winner.
             */
            let loadedResultReason =
                storedReason;

            if (
                row.status === 'completed' &&
                !loadedResultReason
            ) {
                if (row.winner) {
                    loadedResultReason =
                        'checkmate';
                } else {
                    const engineStatus =
                        computeStatus(
                            currentBoard,
                            currentState,
                        );

                    loadedResultReason =
                        engineStatus.phase ===
                            'stalemate'
                            ? 'stalemate'
                            : 'stalemate';
                }
            }

            const engineStatus =
                computeStatus(
                    currentBoard,
                    currentState,
                );

            let loadedStatus:
                GameStatus;

            if (
                loadedResultReason ===
                'stalemate' ||
                loadedResultReason ===
                'insufficient_material'
            ) {
                loadedStatus = {
                    phase: 'stalemate',
                    winner: null,
                    stage:
                        engineStatus.stage,
                };
            } else if (
                row.status === 'completed' &&
                row.winner
            ) {
                /*
                 * Checkmate, timeout and resignation all
                 * use the winner field, while resultReason
                 * tells the UI why.
                 */
                loadedStatus = {
                    phase: 'checkmate',
                    winner: row.winner,
                    stage:
                        engineStatus.stage,
                };
            } else {
                loadedStatus =
                    engineStatus;
            }

            setBoard(currentBoard);
            setState(currentState);
            setStatus(loadedStatus);

            setResultReason(
                loadedResultReason,
            );

            resultReasonRef.current =
                loadedResultReason;

            setHistory(currentHistory);
            setLastMove(currentLastMove);

            setSelected(null);
            setLegal([]);
            setPromotion(null);

            setWhiteMs(loadedWhiteMs);
            setBlackMs(loadedBlackMs);

            whiteMsRef.current =
                loadedWhiteMs;

            blackMsRef.current =
                loadedBlackMs;

            clockUpdatedAtRef.current =
                Date.now();

            const hasStarted =
                persistedMoves.length > 0 ||
                row.status === 'completed';

            setStarted(hasStarted);
            startedRef.current =
                hasStarted;

            if (
                row.status === 'completed' ||
                loadedResultReason
            ) {
                setRunning(false);
                runningRef.current =
                    false;
            }

            loadingGameRef.current =
                false;
        };

        void loadGame();

        return () => {
            cancelled = true;
        };
    }, [
        config?.gameId,
        config?.timeControl,
        config?.customMinutes,
    ]);

    /*
     * Local smooth clock.
     */
    useEffect(() => {
        if (
            !running ||
            resultReasonRef.current !== null
        ) {
            return;
        }

        const interval =
            window.setInterval(() => {
                if (!runningRef.current) {
                    return;
                }

                if (
                    resultReasonRef.current !==
                    null
                ) {
                    return;
                }

                const elapsed = 100;

                if (
                    stateRef.current.turn ===
                    'w'
                ) {
                    setWhiteMs((ms) => {
                        const next =
                            Math.max(
                                0,
                                ms - elapsed,
                            );

                        whiteMsRef.current =
                            next;

                        return next;
                    });
                } else {
                    setBlackMs((ms) => {
                        const next =
                            Math.max(
                                0,
                                ms - elapsed,
                            );

                        blackMsRef.current =
                            next;

                        return next;
                    });
                }
            }, 100);

        return () =>
            window.clearInterval(
                interval,
            );
    }, [running, state.turn]);

    /*
     * Timeout detection.
     */
    useEffect(() => {
        if (
            !started ||
            resultReasonRef.current !== null
        ) {
            return;
        }

        if (whiteMs <= 0) {
            void finalizeGame(
                'timeout',
                'b',
                0,
                blackMsRef.current,
            );

            return;
        }

        if (blackMs <= 0) {
            void finalizeGame(
                'timeout',
                'w',
                whiteMsRef.current,
                0,
            );
        }
    }, [
        whiteMs,
        blackMs,
        started,
        finalizeGame,
    ]);

    /*
     * Execute a local move.
     */
    const doMove = useCallback(
        (move: Move) => {
            if (
                resultReasonRef.current !== null
            ) {
                return {
                    move,
                    san: '',
                };
            }

            const b =
                boardRef.current;

            const s =
                stateRef.current;

            const allLegal =
                legalMoves(
                    b,
                    s,
                    s.turn,
                );

            const san =
                toSAN(
                    b,
                    s,
                    move,
                    allLegal,
                );

            const result =
                makeMove(
                    b,
                    s,
                    move,
                );

            setHistory((h) => [
                ...h,
                {
                    move,
                    san,
                    boardBefore: b,
                    stateBefore: s,
                },
            ]);

            setBoard(result.board);
            setState(result.state);
            setLastMove(move);
            setSelected(null);
            setLegal([]);

            const st =
                computeStatus(
                    result.board,
                    result.state,
                );

            setStatus(st);

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

            if (st.phase === 'check') {
                sound.play('check');
            }

            /*
             * Checkmate.
             */
            if (
                st.phase ===
                'checkmate'
            ) {
                setRunning(false);
                runningRef.current =
                    false;

                void finalizeGame(
                    'checkmate',
                    s.turn === 'w'
                        ? 'w'
                        : 'b',
                    whiteMsRef.current,
                    blackMsRef.current,
                );
            }

            /*
             * Stalemate.
             */
            else if (
                st.phase ===
                'stalemate'
            ) {
                setRunning(false);
                runningRef.current =
                    false;

                void finalizeGame(
                    'stalemate',
                    null,
                    whiteMsRef.current,
                    blackMsRef.current,
                );
            }

            /*
             * Insufficient material.
             */
            else if (
                isInsufficientMaterial(
                    result.board,
                )
            ) {
                setRunning(false);
                runningRef.current =
                    false;

                void finalizeGame(
                    'insufficient_material',
                    null,
                    whiteMsRef.current,
                    blackMsRef.current,
                );
            }

            /*
             * Normal move: add increment to the
             * player who just moved.
             */
            else {
                if (s.turn === 'w') {
                    const next =
                        whiteMsRef.current +
                        incrementMs;

                    whiteMsRef.current =
                        next;

                    setWhiteMs(next);
                } else {
                    const next =
                        blackMsRef.current +
                        incrementMs;

                    blackMsRef.current =
                        next;

                    setBlackMs(next);
                }
            }

            clockUpdatedAtRef.current =
                Date.now();

            return {
                move,
                san,
            };
        },
        [incrementMs, finalizeGame],
    );

    /*
     * Persist a move.
     */
    const broadcastMove = useCallback(
        async (
            move: Move,
            san: string,
        ) => {
            const cfg =
                configRef.current;

            if (!cfg) return;

            const moveNumber =
                history.length + 1;

            await supabase
                .from('online_game_moves')
                .insert({
                    game_id:
                        cfg.gameId,
                    move_number:
                        moveNumber,
                    from_row:
                        move.from[0],
                    from_col:
                        move.from[1],
                    to_row:
                        move.to[0],
                    to_col:
                        move.to[1],
                    promotion:
                        move.promotion ||
                        null,
                    player_id:
                        cfg.userId,
                    san,
                });

            /*
             * Do not update an already-completed game.
             */
            if (
                resultReasonRef.current !==
                null
            ) {
                return;
            }

            const now =
                new Date().toISOString();

            clockUpdatedAtRef.current =
                Date.now();

            await supabase
                .from('online_games')
                .update({
                    turn:
                        stateRef.current
                            .turn,
                    white_ms:
                        Math.round(
                            whiteMsRef.current,
                        ),
                    black_ms:
                        Math.round(
                            blackMsRef.current,
                        ),
                    clock_updated_at:
                        now,
                    updated_at:
                        now,
                })
                .eq(
                    'id',
                    cfg.gameId,
                )
                .eq(
                    'status',
                    'active',
                );
        },
        [history.length],
    );

    /*
     * Select / move a piece.
     */
    const selectSquare = useCallback(
        (
            r: number,
            c: number,
        ) => {
            if (
                resultReasonRef.current !==
                null
            ) {
                return;
            }

            const cfg =
                configRef.current;

            if (!cfg) return;

            if (
                state.turn !==
                cfg.playerColor
            ) {
                return;
            }

            const b =
                boardRef.current;

            const s =
                stateRef.current;

            const piece =
                b[r][c];

            if (selected) {
                const target =
                    legal.find(
                        (m) =>
                            m.to[0] === r &&
                            m.to[1] === c,
                    );

                if (target) {
                    if (
                        target.promotion
                    ) {
                        const promoMoves =
                            legal.filter(
                                (m) =>
                                    m.to[0] ===
                                    r &&
                                    m.to[1] ===
                                    c,
                            );

                        setPromotion({
                            from: selected,
                            to: [r, c],
                            moves: promoMoves,
                        });

                        return;
                    }

                    const result =
                        doMove(target);

                    if (result.san) {
                        void broadcastMove(
                            target,
                            result.san,
                        );
                    }

                    return;
                }
            }

            if (
                piece &&
                piece.color === s.turn
            ) {
                setSelected([
                    r,
                    c,
                ]);

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
            selected,
            legal,
            state.turn,
            doMove,
            broadcastMove,
        ],
    );

    /*
     * Drag/drop move.
     */
    const dropPiece = useCallback(
        (
            from: [number, number],
            to: [number, number],
        ) => {
            if (
                resultReasonRef.current !==
                null
            ) {
                return false;
            }

            const cfg =
                configRef.current;

            if (!cfg) return false;

            if (
                state.turn !==
                cfg.playerColor
            ) {
                return false;
            }

            const b =
                boardRef.current;

            const s =
                stateRef.current;

            const moves =
                legalMovesFrom(
                    b,
                    s,
                    s.turn,
                    from[0],
                    from[1],
                );

            const target =
                moves.find(
                    (m) =>
                        m.to[0] ===
                        to[0] &&
                        m.to[1] ===
                        to[1],
                );

            if (!target) {
                return false;
            }

            if (target.promotion) {
                setPromotion({
                    from,
                    to,
                    moves: moves.filter(
                        (m) =>
                            m.to[0] ===
                            to[0] &&
                            m.to[1] ===
                            to[1],
                    ),
                });

                return true;
            }

            const result =
                doMove(target);

            if (result.san) {
                void broadcastMove(
                    target,
                    result.san,
                );
            }

            return true;
        },
        [
            state.turn,
            doMove,
            broadcastMove,
        ],
    );

    /*
     * Promotion.
     */
    const choosePromotion =
        useCallback(
            (move: Move) => {
                if (
                    resultReasonRef.current !==
                    null
                ) {
                    return;
                }

                setPromotion(null);

                const result =
                    doMove(move);

                if (result.san) {
                    void broadcastMove(
                        move,
                        result.san,
                    );
                }
            },
            [doMove, broadcastMove],
        );

    const cancelPromotion =
        useCallback(() => {
            setPromotion(null);
        }, []);

    /*
     * Resign.
     */
    const resign =
        useCallback(async () => {
            const cfg =
                configRef.current;

            if (!cfg) return;

            if (
                resultReasonRef.current !==
                null
            ) {
                return;
            }

            const clock =
                getCurrentClock();

            const winner: Color =
                cfg.playerColor === 'w'
                    ? 'b'
                    : 'w';

            await finalizeGame(
                'resignation',
                winner,
                clock.white,
                clock.black,
            );
        }, [
            getCurrentClock,
            finalizeGame,
        ]);

    /*
     * Opponent move + game result realtime.
     */
    useEffect(() => {
        if (!config?.gameId) return;

        const channel =
            supabase
                .channel(
                    `game-moves-${config.gameId}`,
                )
                .on(
                    'postgres_changes',
                    {
                        event: 'INSERT',
                        schema: 'public',
                        table:
                            'online_game_moves',
                        filter:
                            `game_id=eq.${config.gameId}`,
                    },
                    (payload) => {
                        const m =
                            payload.new as RemoteMovePayload;

                        if (
                            m.player_id ===
                            config.userId
                        ) {
                            return;
                        }

                        if (
                            resultReasonRef.current !==
                            null
                        ) {
                            return;
                        }

                        const b =
                            boardRef.current;

                        const s =
                            stateRef.current;

                        const allLegal =
                            legalMoves(
                                b,
                                s,
                                s.turn,
                            );

                        const found =
                            allLegal.find(
                                (mv) =>
                                    mv.from[0] ===
                                    m.from_row &&
                                    mv.from[1] ===
                                    m.from_col &&
                                    mv.to[0] ===
                                    m.to_row &&
                                    mv.to[1] ===
                                    m.to_col &&
                                    (mv.promotion ||
                                        '') ===
                                    (m.promotion ||
                                        ''),
                            );

                        if (!found) {
                            console.warn(
                                'Could not apply remote move:',
                                m,
                            );

                            return;
                        }

                        /*
                         * Apply opponent move locally.
                         *
                         * doMove handles checkmate,
                         * stalemate and insufficient
                         * material without rebroadcasting.
                         */
                        doMove(found);

                        clockUpdatedAtRef.current =
                            Date.now();
                    },
                )
                .on(
                    'postgres_changes',
                    {
                        event: 'UPDATE',
                        schema: 'public',
                        table:
                            'online_games',
                        filter:
                            `id=eq.${config.gameId}`,
                    },
                    (payload) => {
                        const updated =
                            payload.new as {
                                status: string;
                                winner:
                                Color | null;
                                white_ms:
                                number;
                                black_ms:
                                number;
                                turn: Color;
                                payload:
                                unknown;
                            };

                        if (
                            updated.status !==
                            'completed'
                        ) {
                            return;
                        }

                        const remoteReason =
                            readResultReason(
                                updated.payload,
                            );

                        /*
                         * If we already know our own result,
                         * never overwrite it with another
                         * interpretation.
                         */
                        if (
                            resultReasonRef.current !==
                            null
                        ) {
                            return;
                        }

                        let reason =
                            remoteReason;

                        /*
                         * Backward compatibility with an
                         * older completed game.
                         */
                        if (!reason) {
                            reason =
                                updated.winner
                                    ? 'checkmate'
                                    : 'stalemate';
                        }

                        resultReasonRef.current =
                            reason;

                        setResultReason(
                            reason,
                        );

                        setWhiteMs(
                            Math.max(
                                0,
                                updated.white_ms ??
                                whiteMsRef.current,
                            ),
                        );

                        setBlackMs(
                            Math.max(
                                0,
                                updated.black_ms ??
                                blackMsRef.current,
                            ),
                        );

                        whiteMsRef.current =
                            Math.max(
                                0,
                                updated.white_ms ??
                                whiteMsRef.current,
                            );

                        blackMsRef.current =
                            Math.max(
                                0,
                                updated.black_ms ??
                                blackMsRef.current,
                            );

                        setRunning(false);
                        runningRef.current =
                            false;

                        if (
                            reason ===
                            'stalemate' ||
                            reason ===
                            'insufficient_material'
                        ) {
                            setStatus({
                                phase:
                                    'stalemate',
                                winner: null,
                                stage:
                                    statusRef.current
                                        .stage,
                            });
                        } else {
                            setStatus({
                                phase:
                                    'checkmate',
                                winner:
                                    updated.winner,
                                stage:
                                    statusRef.current
                                        .stage,
                            });
                        }

                        sound.play(
                            'game-end',
                        );
                    },
                )
                .subscribe();

        return () => {
            void supabase.removeChannel(
                channel,
            );
        };
    }, [
        config?.gameId,
        config?.userId,
        doMove,
    ]);

    /*
     * Presence.
     */
    useEffect(() => {
        if (!config?.gameId) return;

        const channel =
            supabase.channel(
                `presence-${config.gameId}`,
            );

        const updateConnectionState =
            () => {
                const presence =
                    channel.presenceState();

                setOpponentConnected(
                    Object.keys(
                        presence,
                    ).length >= 2,
                );
            };

        channel
            .on(
                'presence',
                {
                    event: 'sync',
                },
                updateConnectionState,
            )
            .on(
                'presence',
                {
                    event: 'join',
                },
                updateConnectionState,
            )
            .on(
                'presence',
                {
                    event: 'leave',
                },
                updateConnectionState,
            )
            .subscribe(
                async (
                    channelStatus,
                ) => {
                    if (
                        channelStatus ===
                        'SUBSCRIBED'
                    ) {
                        await channel.track({
                            user_id:
                                config.userId,
                            joinedAt:
                                Date.now(),
                        });

                        updateConnectionState();
                    }
                },
            );

        return () => {
            void supabase.removeChannel(
                channel,
            );
        };
    }, [
        config?.gameId,
        config?.userId,
    ]);

    /*
     * Start/pause clock based on both players.
     */
    useEffect(() => {
        if (!config) return;

        if (
            opponentConnected &&
            resultReasonRef.current ===
            null
        ) {
            setStarted(true);
            startedRef.current = true;

            if (
                !runningRef.current
            ) {
                clockUpdatedAtRef.current =
                    Date.now();

                setRunning(true);
                runningRef.current =
                    true;
            }
        } else {
            if (
                runningRef.current
            ) {
                void persistClock(true);
            }

            setRunning(false);
            runningRef.current =
                false;
        }
    }, [
        opponentConnected,
        config?.gameId,
        persistClock,
    ]);

    /*
     * Persist clock when tab becomes hidden.
     */
    useEffect(() => {
        const handleVisibility =
            () => {
                if (
                    document.visibilityState ===
                    'hidden'
                ) {
                    void persistClock(true);
                }
            };

        document.addEventListener(
            'visibilitychange',
            handleVisibility,
        );

        return () => {
            document.removeEventListener(
                'visibilitychange',
                handleVisibility,
            );
        };
    }, [persistClock]);

    /*
     * Persist before leaving page.
     */
    useEffect(() => {
        const handleBeforeUnload =
            () => {
                void persistClock(true);
            };

        window.addEventListener(
            'beforeunload',
            handleBeforeUnload,
        );

        return () => {
            window.removeEventListener(
                'beforeunload',
                handleBeforeUnload,
            );
        };
    }, [persistClock]);

    return {
        board,
        state,
        status,
        resultReason,
        history,
        lastMove,
        selected,
        legal,
        promotion,
        whiteMs,
        blackMs,
        running,
        started,
        opponentConnected,
        opponentName,
        opponentAvatar,
        selectSquare,
        dropPiece,
        choosePromotion,
        cancelPromotion,
        resign,
    };
}

function legalMovesFrom(
    board: Board,
    state: GameState,
    color: Color,
    r: number,
    c: number,
): Move[] {
    return legalMoves(
        board,
        state,
        color,
    ).filter(
        (m) =>
            m.from[0] === r &&
            m.from[1] === c,
    );
}