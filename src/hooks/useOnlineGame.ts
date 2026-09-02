import { useCallback, useEffect, useRef, useState } from 'react';
import type { Board, Color, GameStatus, GameState, HistoryEntry, Move, TimeControl } from '../game/types';
import { initialBoard } from '../game/board';
import { gameStatus as computeStatus, legalMoves, makeMove, toSAN, initialState } from '../game/engine';
import { sound } from '../game/sound';
import { supabase } from '../lib/supabase';

interface RemoteMovePayload {
  player_id: string;
  from_row: number;
  from_col: number;
  to_row: number;
  to_col: number;
  promotion: string | null;
  san: string;
  move_number: number;
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
  promotion: { from: [number, number]; to: [number, number]; moves: Move[] } | null;
  whiteMs: number;
  blackMs: number;
  running: boolean;
  started: boolean;
  opponentConnected: boolean;
  opponentName: string;
  opponentAvatar: string;
}

export function useOnlineGame(config: OnlineGameConfig | null) {
  const [board, setBoard] = useState<Board>(() => initialBoard());
  const [state, setState] = useState<GameState>(() => initialState());
  const [status, setStatus] = useState<GameStatus>({ phase: 'playing', winner: null, stage: 'opening' });
  const [history, setHistory] = useState<HistoryEntry[]>([]);
  const [lastMove, setLastMove] = useState<Move | null>(null);
  const [selected, setSelected] = useState<[number, number] | null>(null);
  const [legal, setLegal] = useState<Move[]>([]);
  const [promotion, setPromotion] = useState<{ from: [number, number]; to: [number, number]; moves: Move[] } | null>(null);
  const [whiteMs, setWhiteMs] = useState(180000);
  const [blackMs, setBlackMs] = useState(180000);
  const [running, setRunning] = useState(false);
  const [started, setStarted] = useState(false);
  const [opponentConnected, setOpponentConnected] = useState(false);
  const [opponentName, setOpponentName] = useState('Opponent');
  const [opponentAvatar, setOpponentAvatar] = useState('');

  const boardRef = useRef(board);
  const stateRef = useRef(state);
  const statusRef = useRef(status);
  const configRef = useRef(config);
  boardRef.current = board;
  stateRef.current = state;
  statusRef.current = status;
  configRef.current = config;

  const tcLabel = config?.timeControl === 'custom' ? `${config.customMinutes} min` : config?.timeControl ?? '3min';
  const initialMs = config?.timeControl === 'custom'
    ? (config.customMinutes || 5) * 60_000
    : { '1min': 60_000, '3min': 180_000, '5min': 300_000, '10min': 600_000, '30min': 1_800_000 }[config?.timeControl ?? '3min'] ?? 180_000;
  const incrementMs = { '1min': 0, '3min': 2_000, '5min': 3_000, '10min': 5_000, '30min': 10_000, custom: 2_000 }[config?.timeControl ?? '3min'] ?? 2_000;

  // Fetch opponent profile
  useEffect(() => {
    if (!config) return;
    const opponentId = config.isHost ? null : null; // We need the host's id when guest
    const myId = config.userId;
    supabase
      .from('online_games')
      .select('host_id, guest_id')
      .eq('id', config.gameId)
      .maybeSingle()
      .then(({ data }) => {
        if (!data) return;
        const oppId = data.host_id === myId ? data.guest_id : data.host_id;
        if (!oppId) return;
        supabase
          .from('profiles')
          .select('username, display_name, avatar_url')
          .eq('id', oppId)
          .maybeSingle()
          .then(({ data: profile }) => {
            if (profile) {
              setOpponentName(profile.display_name || profile.username || 'Opponent');
              setOpponentAvatar(profile.avatar_url || '');
            }
          });
      });
  }, config ? [config.gameId, config.userId, config.isHost] : []);

  // Initialize game when config arrives
  useEffect(() => {
    if (!config) return;
    setBoard(initialBoard());
    setState(initialState());
    setStatus({ phase: 'playing', winner: null, stage: 'opening' });
    setHistory([]);
    setLastMove(null);
    setSelected(null);
    setLegal([]);
    setPromotion(null);
    setWhiteMs(initialMs);
    setBlackMs(initialMs);
    setRunning(true);
    setStarted(true);
    setOpponentConnected(true);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [config?.gameId]);

  // Clock ticking
  useEffect(() => {
    if (!running || statusRef.current.phase === 'checkmate' || statusRef.current.phase === 'stalemate') return;
    const interval = setInterval(() => {
      const s = stateRef.current;
      if (s.turn === 'w') setWhiteMs((ms) => Math.max(0, ms - 100));
      else setBlackMs((ms) => Math.max(0, ms - 100));
    }, 100);
    return () => clearInterval(interval);
  }, [running, state.turn]);

  // Timeout detection
  useEffect(() => {
    if (!started) return;
    if (whiteMs <= 0) {
      setRunning(false);
      setStatus({ phase: 'checkmate', winner: 'b', stage: status.stage });
      sound.play('game-end');
    } else if (blackMs <= 0) {
      setRunning(false);
      setStatus({ phase: 'checkmate', winner: 'w', stage: status.stage });
      sound.play('game-end');
    }
  }, [whiteMs, blackMs, started, status.stage]);

  const doMove = useCallback((move: Move) => {
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

    const st = computeStatus(nb, ns);
    setStatus(st);
    if (move.castle) sound.play('castle');
    else if (move.capture || move.enPassant) sound.play('capture');
    else sound.play('move');
    if (st.phase === 'check') sound.play('check');
    if (st.phase === 'checkmate') {
      sound.play('checkmate');
      setRunning(false);
    } else if (st.phase === 'stalemate') {
      sound.play('game-end');
      setRunning(false);
    } else {
      if (s.turn === 'w') setWhiteMs((ms) => ms + incrementMs);
      else setBlackMs((ms) => ms + incrementMs);
    }

    return { move, san };
  }, [incrementMs]);

  // Broadcast move to the online_game_moves table
  const broadcastMove = useCallback((move: Move, san: string) => {
    const cfg = configRef.current;
    if (!cfg) return;
    supabase.from('online_game_moves').insert({
      game_id: cfg.gameId,
      move_number: 0, // The DB will handle ordering; we also have created_at
      from_row: move.from[0],
      from_col: move.from[1],
      to_row: move.to[0],
      to_col: move.to[1],
      promotion: move.promotion || null,
      player_id: cfg.userId,
      san,
    }).then(() => {});

    supabase.from('online_games').update({
      turn: move.piece.color === 'w' ? 'b' : 'w',
      fen: '', // could serialize FEN here
    }).eq('id', cfg.gameId).then(() => {});
  }, []);

  const selectSquare = useCallback(
    (r: number, c: number) => {
      if (status.phase === 'checkmate' || status.phase === 'stalemate') return;
      const cfg = configRef.current;
      if (!cfg) return;
      if (state.turn !== cfg.playerColor) return;
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
          const result = doMove(target);
          broadcastMove(target, result.san);
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
    [selected, legal, status.phase, state.turn, doMove, broadcastMove],
  );

  const dropPiece = useCallback(
    (from: [number, number], to: [number, number]) => {
      if (status.phase === 'checkmate' || status.phase === 'stalemate') return false;
      const cfg = configRef.current;
      if (!cfg) return false;
      if (state.turn !== cfg.playerColor) return false;
      const b = boardRef.current;
      const s = stateRef.current;
      const moves = legalMovesFrom(b, s, s.turn, from[0], from[1]);
      const target = moves.find((m) => m.to[0] === to[0] && m.to[1] === to[1]);
      if (!target) return false;
      if (target.promotion) {
        setPromotion({ from, to, moves: moves.filter((m) => m.to[0] === to[0] && m.to[1] === to[1]) });
        return true;
      }
      const result = doMove(target);
      broadcastMove(target, result.san);
      return true;
    },
    [status.phase, state.turn, doMove, broadcastMove],
  );

  const choosePromotion = useCallback(
    (move: Move) => {
      setPromotion(null);
      const result = doMove(move);
      broadcastMove(move, result.san);
    },
    [doMove, broadcastMove],
  );

  const cancelPromotion = useCallback(() => setPromotion(null), []);

  const resign = useCallback(() => {
    const cfg = configRef.current;
    if (!cfg) return;
    setRunning(false);
    const winner: Color = cfg.playerColor === 'w' ? 'b' : 'w';
    setStatus({ phase: 'checkmate', winner, stage: status.stage });
    sound.play('game-end');
    supabase.from('online_games').update({ status: 'completed', winner }).eq('id', cfg.gameId).then(() => {});
  }, [status.stage]);

  // Listen for opponent's moves via realtime
  useEffect(() => {
    if (!config) return;
    const channel = supabase
      .channel(`game-moves-${config.gameId}`)
      .on(
        'postgres_changes',
        { event: 'INSERT', schema: 'public', table: 'online_game_moves', filter: `game_id=eq.${config.gameId}` },
        (payload) => {
          const m = payload.new as RemoteMovePayload;
          if (m.player_id === config.userId) return; // Skip our own moves

          const b = boardRef.current;
          const s = stateRef.current;
          const allLegal = legalMoves(b, s, s.turn);
          const found = allLegal.find((mv) =>
            mv.from[0] === m.from_row && mv.from[1] === m.from_col &&
            mv.to[0] === m.to_row && mv.to[1] === m.to_col &&
            ((mv.promotion || '') === (m.promotion || '')),
          );
          if (found) doMove(found);
        },
      )
      .on(
        'postgres_changes',
        { event: 'UPDATE', schema: 'public', table: 'online_games', filter: `id=eq.${config.gameId}` },
        (payload) => {
          const updated = payload.new as { status: string; winner: string | null };
          if (updated.status === 'completed' && updated.winner) {
            setRunning(false);
            setStatus({ phase: 'checkmate', winner: updated.winner as Color, stage: statusRef.current.stage });
            sound.play('game-end');
          }
        },
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [config?.gameId, config?.userId, doMove]);

  // Presence for opponent connection tracking
  useEffect(() => {
    if (!config) return;
    const channel = supabase.channel(`presence-${config.gameId}`);

    channel
      .on('presence', { event: 'sync' }, () => {
        const state = channel.presenceState();
        const ids = Object.keys(state);
        setOpponentConnected(ids.length >= 2);
      })
      .on('presence', { event: 'join' }, () => {
        setOpponentConnected(true);
      })
      .on('presence', { event: 'leave' }, () => {
        const state = channel.presenceState();
        setOpponentConnected(Object.keys(state).length >= 2);
      })
      .subscribe(async (status) => {
        if (status === 'SUBSCRIBED') {
          await channel.track({ user_id: config.userId, joinedAt: Date.now() });
        }
      });

    return () => {
      supabase.removeChannel(channel);
    };
  }, [config?.gameId, config?.userId]);

  return {
    board,
    state,
    status,
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

function legalMovesFrom(board: Board, state: GameState, _color: Color, r: number, c: number): Move[] {
  return legalMoves(board, state, _color).filter((m) => m.from[0] === r && m.from[1] === c);
}
