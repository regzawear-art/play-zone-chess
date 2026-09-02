import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import type { Board, Color, GameStatus, GameState, HistoryEntry, MatchRecord, Move, PieceType, TimeControl, GameMode, AIDifficulty } from '../game/types';
import { initialBoard } from '../game/board';
import { gameStatus as computeStatus, legalMoves, legalMovesFrom, makeMove, toSAN, initialState } from '../game/engine';
import { chooseMove, setAIDifficulty } from '../game/ai';
import { sound } from '../game/sound';
import { getOpeningName } from '../game/openings';

export const TIME_CONTROLS: Record<TimeControl, { label: string; initialMs: number; incrementMs: number }> = {
  '1min': { label: '1 Minute', initialMs: 60_000, incrementMs: 0 },
  '3min': { label: '3 Minute', initialMs: 180_000, incrementMs: 2_000 },
  '5min': { label: '5 Minute', initialMs: 300_000, incrementMs: 3_000 },
  '10min': { label: '10 Minute', initialMs: 600_000, incrementMs: 5_000 },
  '30min': { label: '30 Minute', initialMs: 1_800_000, incrementMs: 10_000 },
  custom: { label: 'Custom', initialMs: 300_000, incrementMs: 2_000 },
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

export function useChess(opts: UseChessOptions) {
  const { playerColor, vsComputer, timeControl, customMinutes, opponentName, opponentAvatar, opponentFlag, aiDifficulty } = opts;

  // Set AI difficulty when it changes
  useEffect(() => {
    if (aiDifficulty) setAIDifficulty(aiDifficulty);
  }, [aiDifficulty]);

  const tcBase = TIME_CONTROLS[timeControl];
  const initialMs = timeControl === 'custom' ? customMinutes * 60_000 : tcBase.initialMs;
  const incrementMs = tcBase.incrementMs;

  const [board, setBoard] = useState<Board>(() => initialBoard());
  const [state, setState] = useState<GameState>(() => initialState());
  const [status, setStatus] = useState<GameStatus>({ phase: 'playing', winner: null, stage: 'opening' });
  const [history, setHistory] = useState<HistoryEntry[]>([]);
  const [selected, setSelected] = useState<[number, number] | null>(null);
  const [legal, setLegal] = useState<Move[]>([]);
  const [lastMove, setLastMove] = useState<Move | null>(null);
  const [promotion, setPromotion] = useState<{ from: [number, number]; to: [number, number]; moves: Move[] } | null>(null);
  const [pendingResult, setPendingResult] = useState<{ status: GameStatus; ending: MatchRecord['ending'] } | null>(null);
  const [matches, setMatches] = useState<MatchRecord[]>([]);

  const [whiteMs, setWhiteMs] = useState(initialMs);
  const [blackMs, setBlackMs] = useState(initialMs);
  const [running, setRunning] = useState(false);
  const [started, setStarted] = useState(false);
  const [thinking, setThinking] = useState(false);

  const boardRef = useRef(board);
  const stateRef = useRef(state);
  boardRef.current = board;
  stateRef.current = state;
  const statusRef = useRef(status);
  statusRef.current = status;
  const startedRef = useRef(started);
  startedRef.current = started;
  const tcLabel = timeControl === 'custom' ? `${customMinutes} min` : tcBase.label;
  const initialMsRef = useRef(initialMs);
  initialMsRef.current = initialMs;

  // --- clock ticking ---
  useEffect(() => {
    if (!running || statusRef.current.phase === 'checkmate' || statusRef.current.phase === 'stalemate') return;
    const interval = setInterval(() => {
      const s = stateRef.current;
      if (s.turn === 'w') setWhiteMs((ms) => Math.max(0, ms - 100));
      else setBlackMs((ms) => Math.max(0, ms - 100));
    }, 100);
    return () => clearInterval(interval);
  }, [running, state.turn]);

  const recordMatch = useCallback(
    (winner: Color | null, ending: MatchRecord['ending']) => {
      const playerWon = winner === playerColor;
      const isDraw = winner === null;
      const result: MatchRecord['result'] = isDraw ? 'draw' : playerWon ? 'win' : 'loss';
      const ratingChange = isDraw ? 0 : playerWon ? 8 : -6;
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
    [playerColor, history.length, opponentName, opponentAvatar, opponentFlag, tcLabel],
  );

  // flag on time out
  useEffect(() => {
    if (!started) return;
    if (whiteMs <= 0) {
      setRunning(false);
      setStatus({ phase: 'checkmate', winner: 'b', stage: status.stage });
      sound.play('game-end');
      setPendingResult({ status: { phase: 'checkmate', winner: 'b', stage: status.stage }, ending: 'timeout' });
      recordMatch('b', 'timeout');
    } else if (blackMs <= 0) {
      setRunning(false);
      setStatus({ phase: 'checkmate', winner: 'w', stage: status.stage });
      sound.play('game-end');
      setPendingResult({ status: { phase: 'checkmate', winner: 'w', stage: status.stage }, ending: 'timeout' });
      recordMatch('w', 'timeout');
    }
  }, [whiteMs, blackMs, started, status.stage, recordMatch]);

  const recomputeStatus = useCallback((b: Board, s: GameState) => {
    const st = computeStatus(b, s);
    setStatus(st);
    return st;
  }, []);

  const doMove = useCallback(
    (move: Move) => {
      const b = boardRef.current;
      const s = stateRef.current;
      const allLegal = legalMoves(b, s, s.turn);
      const san = toSAN(b, s, move, allLegal);
      const { board: nb, state: ns } = makeMove(b, s, move);
      setHistory((h) => [...h, { move, san, boardBefore: b, stateBefore: s }]);
      setBoard(nb);
      setState(ns);
      setLastMove(move);
      setSelected(null);
      setLegal([]);

      const st = recomputeStatus(nb, ns);
      if (move.castle) sound.play('castle');
      else if (move.capture || move.enPassant) sound.play('capture');
      else sound.play('move');
      if (st.phase === 'check') sound.play('check');
      if (st.phase === 'checkmate') {
        sound.play('checkmate');
        setRunning(false);
        setPendingResult({ status: st, ending: 'checkmate' });
        recordMatch(st.winner, 'checkmate');
      } else if (st.phase === 'stalemate') {
        sound.play('game-end');
        setRunning(false);
        setPendingResult({ status: st, ending: 'stalemate' });
        recordMatch(null, 'stalemate');
      } else {
        if (s.turn === 'w') setWhiteMs((ms) => ms + incrementMs);
        else setBlackMs((ms) => ms + incrementMs);
      }
    },
    [recomputeStatus, incrementMs, recordMatch],
  );

  // --- computer move ---
  useEffect(() => {
    if (!vsComputer) return;
    if (status.phase === 'checkmate' || status.phase === 'stalemate') return;
    const computerColor: Color = playerColor === 'w' ? 'b' : 'w';
    if (state.turn !== computerColor) return;
    setThinking(true);
    // Use a microtask delay so the thinking indicator can paint before the
    // (now near-instant) AI computation runs, keeping the UI responsive.
    const timer = setTimeout(() => {
      const move = chooseMove(boardRef.current, stateRef.current, computerColor);
      setThinking(false);
      if (move) doMove(move);
    }, 50);
    return () => clearTimeout(timer);
  }, [vsComputer, state.turn, status.phase, playerColor, doMove]);

  const selectSquare = useCallback(
    (r: number, c: number) => {
      if (status.phase === 'checkmate' || status.phase === 'stalemate') return;
      if (vsComputer && state.turn !== playerColor) return;
      const b = boardRef.current;
      const s = stateRef.current;
      const piece = b[r][c];
      if (selected) {
        const target = legal.find((m) => m.to[0] === r && m.to[1] === c);
        if (target) {
          if (target.promotion) {
            const promoMoves = legal.filter((m) => m.to[0] === r && m.to[1] === c);
            setPromotion({ from: selected, to: [r, c], moves: promoMoves });
            return;
          }
          doMove(target);
          return;
        }
      }
      if (piece && piece.color === s.turn) {
        setSelected([r, c]);
        setLegal(legalMovesFrom(b, s, s.turn, r, c));
        sound.play('select');
      } else {
        setSelected(null);
        setLegal([]);
      }
    },
    [selected, legal, status.phase, vsComputer, state.turn, playerColor, doMove],
  );

  // Drop a piece from drag — same as selectSquare but takes from/to directly
  const dropPiece = useCallback(
    (from: [number, number], to: [number, number]) => {
      if (status.phase === 'checkmate' || status.phase === 'stalemate') return false;
      if (vsComputer && state.turn !== playerColor) return false;
      const b = boardRef.current;
      const s = stateRef.current;
      const moves = legalMovesFrom(b, s, s.turn, from[0], from[1]);
      const target = moves.find((m) => m.to[0] === to[0] && m.to[1] === to[1]);
      if (!target) return false;
      if (target.promotion) {
        setPromotion({ from, to, moves: moves.filter((m) => m.to[0] === to[0] && m.to[1] === to[1]) });
        return true;
      }
      doMove(target);
      return true;
    },
    [status.phase, vsComputer, state.turn, playerColor, doMove],
  );

  const choosePromotion = useCallback(
    (move: Move) => {
      setPromotion(null);
      doMove(move);
    },
    [doMove],
  );

  const cancelPromotion = useCallback(() => setPromotion(null), []);

  const startGame = useCallback(() => {
    sound.unlock();
    sound.play('game-start');
    setBoard(initialBoard());
    setState(initialState());
    setStatus({ phase: 'playing', winner: null, stage: 'opening' });
    setHistory([]);
    setSelected(null);
    setLegal([]);
    setLastMove(null);
    setPromotion(null);
    setPendingResult(null);
    setRedoStack([]);
    setWhiteMs(initialMsRef.current);
    setBlackMs(initialMsRef.current);
    setRunning(true);
    setStarted(true);
    setThinking(false);
  }, []);

  const resign = useCallback(() => {
    setRunning(false);
    const winner: Color = playerColor === 'w' ? 'b' : 'w';
    setStatus({ phase: 'checkmate', winner, stage: status.stage });
    setPendingResult({ status: { phase: 'checkmate', winner, stage: status.stage }, ending: 'resign' });
    sound.play('game-end');
    recordMatch(winner, 'resign');
  }, [playerColor, status.stage, recordMatch]);

  // Redo stack — moves that were undone and can be re-applied
  const [redoStack, setRedoStack] = useState<HistoryEntry[]>([]);

  const undo = useCallback(() => {
    setHistory((h) => {
      if (h.length === 0) return h;
      const stepsBack = vsComputer && h.length >= 2 ? 2 : 1;
      const removed = h.slice(-stepsBack);
      const newHist = h.slice(0, -stepsBack);
      setRedoStack((r) => [...r, ...removed.reverse()]);
      if (newHist.length === 0) {
        setBoard(initialBoard());
        setState(initialState());
      } else {
        const last = newHist[newHist.length - 1];
        setBoard(last.boardBefore);
        setState(last.stateBefore);
      }
      setLastMove(null);
      setSelected(null);
      setLegal([]);
      setPromotion(null);
      setPendingResult(null);
      recomputeStatus(
        newHist.length === 0 ? initialBoard() : newHist[newHist.length - 1].boardBefore,
        newHist.length === 0 ? initialState() : newHist[newHist.length - 1].stateBefore,
      );
      return newHist;
    });
  }, [vsComputer, recomputeStatus]);

  const redo = useCallback(() => {
    setRedoStack((r) => {
      if (r.length === 0) return r;
      const entry = r[r.length - 1];
      const newStack = r.slice(0, -1);
      // Re-apply the move by rebuilding from history
      setHistory((h) => {
        const newHist = [...h, entry];
        setBoard((() => { const res = makeMove(entry.boardBefore, entry.stateBefore, entry.move); return res.board; })());
        setState((() => { const res = makeMove(entry.boardBefore, entry.stateBefore, entry.move); return res.state; })());
        setLastMove(entry.move);
        recomputeStatus(
          makeMove(entry.boardBefore, entry.stateBefore, entry.move).board,
          makeMove(entry.boardBefore, entry.stateBefore, entry.move).state,
        );
        return newHist;
      });
      return newStack;
    });
  }, [recomputeStatus]);

  const jumpToMove = useCallback((index: number) => {
    // index is 0-based position in history; -1 = start of game
    setHistory((h) => {
      const target = index + 1;
      if (target >= h.length) {
        // Jump to end — just clear redo and go to current
        setRedoStack([]);
        return h;
      }
      const kept = h.slice(0, target);
      const removed = h.slice(target);
      setRedoStack(removed.reverse());
      if (kept.length === 0) {
        setBoard(initialBoard());
        setState(initialState());
        setLastMove(null);
      } else {
        const last = kept[kept.length - 1];
        const res = makeMove(last.boardBefore, last.stateBefore, last.move);
        setBoard(res.board);
        setState(res.state);
        setLastMove(last.move);
        recomputeStatus(res.board, res.state);
      }
      setSelected(null);
      setLegal([]);
      setPromotion(null);
      setPendingResult(null);
      return kept;
    });
  }, [recomputeStatus]);

  // Apply a move received from a remote opponent (online play)
  const applyRemoteMove = useCallback((move: Move) => {
    const b = boardRef.current;
    const s = stateRef.current;
    // Validate it's a legal move before applying
    const allLegal = legalMoves(b, s, s.turn);
    const found = allLegal.some((m) =>
      m.from[0] === move.from[0] && m.from[1] === move.from[1] &&
      m.to[0] === move.to[0] && m.to[1] === move.to[1] &&
      (m.promotion || '') === (move.promotion || ''),
    );
    if (!found) return false;
    doMove(move);
    return true;
  }, [doMove]);

  const getMoveForBroadcast = useCallback((): Move | null => {
    if (history.length === 0) return null;
    return history[history.length - 1].move;
  }, [history]);

  const clearMatchHistory = useCallback(() => setMatches([]), []);

  const stageLabel = useMemo(() => {
    if (!started) return 'Not started';
    if (status.phase === 'checkmate' || status.phase === 'stalemate') return 'Game over';
    return status.stage;
  }, [started, status]);

  const currentOpening = useMemo(() => {
    if (!started || history.length === 0) return '';
    const sans = history.map((h) => h.san);
    return getOpeningName(sans);
  }, [started, history]);

  const offerDraw = useCallback(() => {
    if (!started || status.phase === 'checkmate' || status.phase === 'stalemate') return;
    setRunning(false);
    setStatus({ phase: 'stalemate', winner: null, stage: status.stage });
    setPendingResult({ status: { phase: 'stalemate', winner: null, stage: status.stage }, ending: 'stalemate' });
    sound.play('game-end');
    recordMatch(null, 'stalemate');
  }, [started, status, recordMatch]);

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
