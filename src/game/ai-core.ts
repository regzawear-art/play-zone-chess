import type { Board, Color, GameState, Move, AIDifficulty, Piece, PieceType } from './types';
import { applyMove, makeMove } from './engine';
import { isSquareAttacked, findKing, cloneBoard } from './board';
import { PIECE_VALUE } from './pieces';

// Copied/adapted heavy AI logic. This module runs inside the worker.

const DIFFICULTY_DEPTH: Record<AIDifficulty, number> = {
  beginner: 1,
  intermediate: 2,
  advanced: 6,
  master: 8,
};

const DIFFICULTY_RANDOMNESS: Record<AIDifficulty, number> = {
  beginner: 120,
  intermediate: 40,
  advanced: 6,
  master: 0,
};

const DIFFICULTY_TIME_MS: Record<AIDifficulty, number> = {
  beginner: 100,
  intermediate: 400,
  advanced: 1200,
  master: 2500,
};

let currentDifficulty: AIDifficulty = 'intermediate';

export function setAIDifficultyCore(d: AIDifficulty) {
  currentDifficulty = d;
}

// ── Zobrist hashing & transposition table ─────────────────────────────
// Map piece types to index: 0..11 (w: p,n,b,r,q,k = 0..5, b: p..k = 6..11)
const PIECE_INDEX: Record<string, number> = { 'wp': 0, 'wn': 1, 'wb': 2, 'wr': 3, 'wq': 4, 'wk': 5, 'bp': 6, 'bn': 7, 'bb': 8, 'br': 9, 'bq': 10, 'bk': 11 };

function rnd32(): number { return (Math.random() * 0x100000000) >>> 0; }

const ZOBRIST_PIECE: number[][] = Array.from({ length: 12 }, () => Array.from({ length: 64 }, () => (BigInt(rnd32()) << 32n) ^ BigInt(rnd32())));
const ZOBRIST_SIDE = (BigInt(rnd32()) << 32n) ^ BigInt(rnd32());
const ZOBRIST_CASTLING: number[] = Array.from({ length: 16 }, () => (BigInt(rnd32()) << 32n) ^ BigInt(rnd32()));
const ZOBRIST_EP: number[] = Array.from({ length: 8 }, () => (BigInt(rnd32()) << 32n) ^ BigInt(rnd32()));

function hashBoard(board: any, state: any): bigint {
  let h = 0n;
  for (let r = 0; r < 8; r++) {
    for (let c = 0; c < 8; c++) {
      const p = board[r][c];
      if (!p) continue;
      const sq = r * 8 + c;
      const key = (p.color === 'w' ? 'w' : 'b') + p.type;
      const idx = PIECE_INDEX[key];
      h ^= ZOBRIST_PIECE[idx][sq];
    }
  }
  if (state.turn === 'w') h ^= ZOBRIST_SIDE;
  // castling bits: pack as 4 bits wk,wq,bk,bq
  let cast = 0;
  if (state.castling.wk) cast |= 1;
  if (state.castling.wq) cast |= 2;
  if (state.castling.bk) cast |= 4;
  if (state.castling.bq) cast |= 8;
  h ^= ZOBRIST_CASTLING[cast];
  if (state.enPassant) {
    const file = state.enPassant[1];
    if (file >= 0 && file < 8) h ^= ZOBRIST_EP[file];
  }
  return h;
}

type TTEntry = { depth: number; score: number; flag: 'EXACT' | 'LOWER' | 'UPPER'; move?: FastMove };
const TTABLE = new Map<bigint, TTEntry>();

let deadlineAt = 0;

interface FastMove {
  from: [number, number];
  to: [number, number];
  piece: Piece;
  capture: Piece | null;
  promotion?: PieceType;
  castle?: 'k' | 'q';
  enPassant?: boolean;
}

const ROOK_DIRS = [[1, 0], [-1, 0], [0, 1], [0, -1]];
const BISHOP_DIRS = [[1, 1], [1, -1], [-1, 1], [-1, -1]];
const KING_DIRS = [[1, 0], [-1, 0], [0, 1], [0, -1], [1, 1], [1, -1], [-1, 1], [-1, -1]];
const KNIGHT_DIRS = [[2, 1], [2, -1], [-2, 1], [-2, -1], [1, 2], [1, -2], [-1, 2], [-1, -2]];
const ALL_DIRS = [...ROOK_DIRS, ...BISHOP_DIRS];

function inB(r: number, c: number): boolean {
  return r >= 0 && r < 8 && c >= 0 && c < 8;
}

function genPseudoMoves(board: Board, state: GameState, color: Color): FastMove[] {
  const moves: FastMove[] = [];
  const enemy: Color = color === 'w' ? 'b' : 'w';
  const pawnDir = color === 'w' ? -1 : 1;
  const startRank = color === 'w' ? 6 : 1;
  const promoRank = color === 'w' ? 0 : 7;

  for (let r = 0; r < 8; r++) {
    for (let c = 0; c < 8; c++) {
      const p = board[r][c];
      if (!p || p.color !== color) continue;

      if (p.type === 'p') {
        const r1 = r + pawnDir;
        if (inB(r1, c) && !board[r1][c]) {
          if (r1 === promoRank) {
            for (const promo of ['q', 'r', 'b', 'n'] as PieceType[])
              moves.push({ from: [r, c], to: [r1, c], piece: p, capture: null, promotion: promo });
          } else {
            moves.push({ from: [r, c], to: [r1, c], piece: p, capture: null });
          }
          const r2 = r + 2 * pawnDir;
          if (r === startRank && !board[r2][c]) moves.push({ from: [r, c], to: [r2, c], piece: p, capture: null });
        }
        for (const dc of [-1, 1]) {
          const nc = c + dc;
          if (!inB(r1, nc)) continue;
          const target = board[r1][nc];
          if (target && target.color === enemy) {
            if (r1 === promoRank) {
              for (const promo of ['q', 'r', 'b', 'n'] as PieceType[])
                moves.push({ from: [r, c], to: [r1, nc], piece: p, capture: target, promotion: promo });
            } else {
              moves.push({ from: [r, c], to: [r1, nc], piece: p, capture: target });
            }
          }
          if (state.enPassant && state.enPassant[0] === r1 && state.enPassant[1] === nc)
            moves.push({ from: [r, c], to: [r1, nc], piece: p, capture: null, enPassant: true });
        }
      } else if (p.type === 'n') {
        for (const [dr, dc] of KNIGHT_DIRS) {
          const nr = r + dr, nc = c + dc;
          if (!inB(nr, nc)) continue;
          const t = board[nr][nc];
          if (!t || t.color === enemy) moves.push({ from: [r, c], to: [nr, nc], piece: p, capture: t });
        }
      } else if (p.type === 'k') {
        for (const [dr, dc] of KING_DIRS) {
          const nr = r + dr, nc = c + dc;
          if (!inB(nr, nc)) continue;
          const t = board[nr][nc];
          if (!t || t.color === enemy) moves.push({ from: [r, c], to: [nr, nc], piece: p, capture: t });
        }
        const rights = state.castling;
        const homeRank = color === 'w' ? 7 : 0;
        if (r === homeRank && c === 4 && !isSquareAttacked(board, homeRank, 4, enemy)) {
          const ks = color === 'w' ? rights.wk : rights.bk;
          const qs = color === 'w' ? rights.wq : rights.bq;
          if (ks && !board[homeRank][5] && !board[homeRank][6] && board[homeRank][7]?.type === 'r')
            if (!isSquareAttacked(board, homeRank, 5, enemy) && !isSquareAttacked(board, homeRank, 6, enemy))
              moves.push({ from: [r, c], to: [homeRank, 6], piece: p, capture: null, castle: 'k' });
          if (qs && !board[homeRank][3] && !board[homeRank][2] && !board[homeRank][1] && board[homeRank][0]?.type === 'r')
            if (!isSquareAttacked(board, homeRank, 3, enemy) && !isSquareAttacked(board, homeRank, 2, enemy))
              moves.push({ from: [r, c], to: [homeRank, 2], piece: p, capture: null, castle: 'q' });
        }
      } else {
        const dirs = p.type === 'r' ? ROOK_DIRS : p.type === 'b' ? BISHOP_DIRS : ALL_DIRS;
        for (const [dr, dc] of dirs) {
          let nr = r + dr, nc = c + dc;
          while (inB(nr, nc)) {
            const t = board[nr][nc];
            if (!t) moves.push({ from: [r, c], to: [nr, nc], piece: p, capture: null });
            else { if (t.color === enemy) moves.push({ from: [r, c], to: [nr, nc], piece: p, capture: t }); break; }
            nr += dr; nc += dc;
          }
        }
      }
    }
  }
  return moves;
}

let whiteKingR = 7, whiteKingC = 4;
let blackKingR = 0, blackKingC = 4;

function initKingPositions(board: Board) {
  const w = findKing(board, 'w');
  const b = findKing(board, 'b');
  if (w) { whiteKingR = w[0]; whiteKingC = w[1]; }
  if (b) { blackKingR = b[0]; blackKingC = b[1]; }
}

function isInCheckFast(board: Board, color: Color): boolean {
  const enemy: Color = color === 'w' ? 'b' : 'w';
  if (color === 'w') return isSquareAttacked(board, whiteKingR, whiteKingC, enemy);
  return isSquareAttacked(board, blackKingR, blackKingC, enemy);
}

interface UndoInfo {
  capturedPiece: Piece | null;
  capturedSquare: [number, number] | null;
  castledRook: { rook: Piece | null; from: [number, number]; to: [number, number] } | null;
  wasPromotion: boolean;
  originalType: PieceType;
  prevWhiteKingR: number; prevWhiteKingC: number;
  prevBlackKingR: number; prevBlackKingC: number;
}

function makeMoveInPlace(board: Board, move: FastMove): UndoInfo {
  const [fr, fc] = move.from; const [tr, tc] = move.to;
  const p = board[fr][fc]!;
  const undo: UndoInfo = {
    capturedPiece: board[tr][tc], capturedSquare: null, castledRook: null,
    wasPromotion: !!move.promotion, originalType: p.type,
    prevWhiteKingR: whiteKingR, prevWhiteKingC: whiteKingC,
    prevBlackKingR: blackKingR, prevBlackKingC: blackKingC,
  };

  // handle capture/enpassant
  if (move.enPassant) {
    const capR = p.color === 'w' ? tr + 1 : tr - 1;
    undo.capturedPiece = board[capR][tc]; undo.capturedSquare = [capR, tc];
    board[capR][tc] = null;
  }
  if (move.castle === 'k') { board[tr][5] = board[tr][7]; board[tr][7] = null; undo.castledRook = { rook: board[tr][5], from: [tr,7], to: [tr,5] }; }
  if (move.castle === 'q') { board[tr][3] = board[tr][0]; board[tr][0] = null; undo.castledRook = { rook: board[tr][3], from: [tr,0], to: [tr,3] }; }

  const captured = board[tr][tc];
  if (!undo.capturedPiece) undo.capturedPiece = captured ?? null;
  board[fr][fc] = null;
  let placed = p;
  if (move.promotion) placed = { ...p, type: move.promotion };
  board[tr][tc] = placed;

  if (p.type === 'k') { if (p.color === 'w') { whiteKingR = tr; whiteKingC = tc; } else { blackKingR = tr; blackKingC = tc; } }

  return undo;
}

function unmakeMove(board: Board, move: FastMove, undo: UndoInfo) {
  const [fr, fc] = move.from; const [tr, tc] = move.to;
  board[fr][fc] = { ...board[tr][tc]! , type: undo.originalType } as Piece;
  board[tr][tc] = undo.capturedPiece ?? null;
  if (undo.castledRook) {
    const rfrom = undo.castledRook.from; const rto = undo.castledRook.to;
    board[rfrom[0]][rfrom[1]] = board[rto[0]][rto[1]];
    board[rto[0]][rto[1]] = null;
  }
  whiteKingR = undo.prevWhiteKingR; whiteKingC = undo.prevWhiteKingC; blackKingR = undo.prevBlackKingR; blackKingC = undo.prevBlackKingC;
}

// Evaluation & search (simplified copy from ai.ts)
const PST_PAWN = [
  [0,0,0,0,0,0,0,0],[50,50,50,50,50,50,50,50],[10,10,20,30,30,20,10,10],[5,5,10,25,25,10,5,5],[0,0,0,20,20,0,0,0],[5,-5,-10,0,0,-10,-5,5],[5,10,10,-20,-20,10,10,5],[0,0,0,0,0,0,0,0]
];
const PST_KNIGHT = [
  [-50,-40,-30,-30,-30,-30,-40,-50],[-40,-20,0,0,0,0,-20,-40],[-30,0,10,15,15,10,0,-30],[-30,5,15,20,20,15,5,-30],[-30,0,15,20,20,15,0,-30],[-30,5,10,15,15,10,5,-30],[-40,-20,0,5,5,0,-20,-40],[-50,-40,-30,-30,-30,-30,-40,-50]
];
const PST_BISHOP = [
  [-20,-10,-10,-10,-10,-10,-10,-20],[-10,0,0,0,0,0,0,-10],[-10,0,5,10,10,5,0,-10],[-10,5,5,10,10,5,5,-10],[-10,0,10,10,10,10,0,-10],[-10,10,10,10,10,10,10,-10],[-10,5,0,0,0,0,5,-10],[-20,-10,-10,-10,-10,-10,-10,-20]
];

function evaluate(board: Board, side: Color): number {
  let score = 0;
  for (let r = 0; r < 8; r++) {
    for (let c = 0; c < 8; c++) {
      const p = board[r][c]; if (!p) continue;
      const sign = p.color === side ? 1 : -1;
      let v = PIECE_VALUE[p.type] * 100;
      const tblR = p.color === 'w' ? r : 7 - r;
      if (p.type === 'p') v += PST_PAWN[tblR][c]; else if (p.type === 'n') v += PST_KNIGHT[tblR][c]; else if (p.type === 'b') v += PST_BISHOP[tblR][c]; else { const centerDist = Math.abs(3.5 - r) + Math.abs(3.5 - c); v += (7 - centerDist); }
      score += sign * v;
    }
  }
  return score;
}

// Move ordering: prefer TT move, captures (MVV-LVA), promotions, killer moves, history score
const KILLER_SLOTS = 2;
const MAX_PLY = 128;
const KILLERS: FastMove[][] = Array.from({ length: MAX_PLY }, () => []);
const HISTORY: Map<number, number> = new Map();

function moveKey(m: FastMove): number {
  return (m.from[0] * 8 + m.from[1]) * 64 + (m.to[0] * 8 + m.to[1]);
}

function movesEqual(a: FastMove | undefined, b: FastMove | undefined): boolean {
  if (!a || !b) return false;
  if (a.from[0] !== b.from[0] || a.from[1] !== b.from[1]) return false;
  if (a.to[0] !== b.to[0] || a.to[1] !== b.to[1]) return false;
  if ((a.promotion || '') !== (b.promotion || '')) return false;
  if ((a.castle || '') !== (b.castle || '')) return false;
  return true;
}

function fastScore(m: FastMove): number {
  let s = 0;
  if (m.capture) s += PIECE_VALUE[m.capture.type] * 100 - PIECE_VALUE[m.piece.type] * 10;
  if (m.promotion) s += 80000;
  return s;
}

function orderMoves(moves: FastMove[], ply: number, ttMove?: FastMove): FastMove[] {
  const scored = moves.map((m) => {
    let s = 0;
    // TT move very high
    if (ttMove && movesEqual(m, ttMove)) s += 1000000;
    // captures / promotions
    s += fastScore(m);
    // killer moves
    const killers = KILLERS[ply] || [];
    for (let i = 0; i < killers.length; i++) if (movesEqual(m, killers[i])) s += 30000 - i * 1000;
    // history heuristic
    const hk = moveKey(m);
    s += (HISTORY.get(hk) || 0);
    return { m, s };
  });
  scored.sort((a, b) => b.s - a.s);
  return scored.map((x) => x.m);
}

let quiescenceNodes = 0; const MAX_QUIESCENCE_NODES = 100000;
function quiescence(board: Board, state: GameState, alpha: number, beta: number, rootSide: Color, ply: number): number {
  if (quiescenceNodes >= MAX_QUIESCENCE_NODES) return evaluate(board, rootSide);
  if (deadlineAt && (typeof performance !== 'undefined') && performance.now() > deadlineAt) return evaluate(board, rootSide);
  quiescenceNodes++;
  const stand = evaluate(board, rootSide);
  if (stand >= beta) return beta; if (stand > alpha) alpha = stand;
  const captures = genPseudoMoves(board, state, state.turn).filter((m) => m.capture || m.promotion);
  const tt = TTABLE.get(hashBoard(board, state));
  for (const m of orderMoves(captures, ply, tt?.move)) {
    const undo = makeMoveInPlace(board, m);
    if (isInCheckFast(board, state.turn)) { unmakeMove(board, m, undo); continue; }
    const childState = childGameState(state, m);
    const val = -quiescence(board, childState, -beta, -alpha, rootSide, ply + 1);
    unmakeMove(board, m, undo);
    if (val >= beta) return beta; if (val > alpha) alpha = val;
  }
  return alpha;
}

function childGameState(state: GameState, move: FastMove): GameState {
  const nextColor: Color = state.turn === 'w' ? 'b' : 'w';
  const castling = { ...state.castling };
  const p = move.piece; const [fr, fc] = move.from; const [tr, tc] = move.to;
  if (p.type === 'k') { if (p.color === 'w') { castling.wk=false; castling.wq=false; } else { castling.bk=false; castling.bq=false; } }
  if (p.type === 'r') { if (fr===7 && fc===0) castling.wq=false; if (fr===7 && fc===7) castling.wk=false; if (fr===0 && fc===0) castling.bq=false; if (fr===0 && fc===7) castling.bk=false; }
  if (tr===7 && tc===0) castling.wq=false; if (tr===7 && tc===7) castling.wk=false; if (tr===0 && tc===0) castling.bq=false; if (tr===0 && tc===7) castling.bk=false;
  let enPassant: [number, number] | null = null;
  if (p.type === 'p' && Math.abs(tr - fr) === 2) enPassant = [(fr + tr) / 2, fc];
  const halfmove = p.type === 'p' || move.capture ? 0 : state.halfmove + 1;
  const fullmove = state.turn === 'b' ? state.fullmove + 1 : state.fullmove;
  return { turn: nextColor, castling, enPassant, halfmove, fullmove };
}

let searchNodes = 0; const MAX_SEARCH_NODES = 600000;
function negamax(board: Board, state: GameState, depth: number, alpha: number, beta: number, rootSide: Color, ply: number): number {
  if (searchNodes >= MAX_SEARCH_NODES) return evaluate(board, rootSide);
  if (deadlineAt && (typeof performance !== 'undefined') && performance.now() > deadlineAt) return evaluate(board, rootSide);
  searchNodes++;
  if (depth === 0) return quiescence(board, state, alpha, beta, rootSide, ply);
  const pseudo = genPseudoMoves(board, state, state.turn);
  if (pseudo.length === 0) { if (isInCheckFast(board, state.turn)) return -100000 + (10 - depth); return 0; }
  // Transposition table probe
  const key = hashBoard(board, state);
  const tt = TTABLE.get(key);
  if (tt && tt.depth >= depth) {
    if (tt.flag === 'EXACT') return tt.score;
    if (tt.flag === 'LOWER') alpha = Math.max(alpha, tt.score);
    else if (tt.flag === 'UPPER') beta = Math.min(beta, tt.score);
    if (alpha >= beta) return tt.score;
  }
  let best = -Infinity; let legalCount = 0; let bestMove: FastMove | undefined = undefined;
  for (const m of orderMoves(pseudo, ply, tt?.move)) {
    const undo = makeMoveInPlace(board, m);
    if (isInCheckFast(board, state.turn)) { unmakeMove(board, m, undo); continue; }
    legalCount++;
    const childState = childGameState(state, m);
    const val = -negamax(board, childState, depth - 1, -beta, -alpha, rootSide, ply + 1);
    unmakeMove(board, m, undo);
    if (val > best) { best = val; bestMove = m; }
    if (best > alpha) alpha = best;
    if (alpha >= beta) {
      // record killer and history
      if (!m.capture && !m.promotion) {
        const killers = KILLERS[ply];
        // insert if not present
        if (!killers.some((k) => movesEqual(k, m))) {
          killers.unshift(m);
          if (killers.length > KILLER_SLOTS) killers.pop();
        }
        const hk = moveKey(m);
        HISTORY.set(hk, (HISTORY.get(hk) || 0) + depth * depth);
      }
      break;
    }
  }
  if (legalCount === 0) { if (isInCheckFast(board, state.turn)) return -100000 + (10 - depth); return 0; }
  // Store in transposition table as an EXACT entry
  const entry: TTEntry = { depth, score: best, flag: 'EXACT', move: bestMove };
  TTABLE.set(key, entry);
  return best;
}

export function chooseMoveCore(board: Board, state: GameState, side: Color): Move | null {
  const work = cloneBoard(board);
  initKingPositions(work);
  const pseudo = genPseudoMoves(work, state, side);
  const legal: FastMove[] = [];
  for (const m of pseudo) { const undo = makeMoveInPlace(work, m); if (!isInCheckFast(work, side)) legal.push(m); unmakeMove(work, m, undo); }
  if (legal.length === 0) return null;
  const maxDepth = DIFFICULTY_DEPTH[currentDifficulty];
  const randomness = DIFFICULTY_RANDOMNESS[currentDifficulty];
  const timeBudget = DIFFICULTY_TIME_MS[currentDifficulty] ?? 800;

  // Iterative deepening with time budget and transposition table support
  searchNodes = 0; quiescenceNodes = 0; TTABLE.clear();
  const start = (typeof performance !== 'undefined') ? performance.now() : Date.now();
  deadlineAt = start + timeBudget;

  let bestFm: FastMove | null = null; let bestScore = -Infinity;

  for (let depth = 1; depth <= maxDepth; depth++) {
    if (deadlineAt && ((typeof performance !== 'undefined') ? performance.now() : Date.now()) > deadlineAt) break;
    for (const m of legal) {
      if (deadlineAt && ((typeof performance !== 'undefined') ? performance.now() : Date.now()) > deadlineAt) break;
      const undo = makeMoveInPlace(work, m);
      if (isInCheckFast(work, side)) { unmakeMove(work, m, undo); continue; }
      const childState = childGameState(state, m);
      const val = -negamax(work, childState, depth - 1, -Infinity, Infinity, side, 1);
      unmakeMove(work, m, undo);
      const jitter = (Math.random() - 0.5) * randomness;
      if (val + jitter > bestScore) { bestScore = val + jitter; bestFm = m; }
    }
  }
  deadlineAt = 0;
  if (!bestFm) return null;
  return {
    from: bestFm.from, to: bestFm.to, piece: bestFm.piece, capture: bestFm.capture,
    promotion: bestFm.promotion, castle: bestFm.castle, enPassant: bestFm.enPassant,
  };
}

export { applyMove, makeMove, findKing };

export function getSearchStats() {
  return { searchNodes, quiescenceNodes, ttSize: TTABLE.size };
}
