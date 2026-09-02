import type { Board, Color, GameState, Move, AIDifficulty, Piece, PieceType } from './types';
import { applyMove, makeMove } from './engine';
import { isSquareAttacked, findKing, cloneBoard } from './board';
import { PIECE_VALUE } from './pieces';

// ── Difficulty configuration ──────────────────────────────────────────
const DIFFICULTY_DEPTH: Record<AIDifficulty, number> = {
  beginner: 1,
  intermediate: 2,
  advanced: 3,
  master: 4,
};

const DIFFICULTY_RANDOMNESS: Record<AIDifficulty, number> = {
  beginner: 120,
  intermediate: 40,
  advanced: 12,
  master: 0,
};

let currentDifficulty: AIDifficulty = 'intermediate';

export function setAIDifficulty(d: AIDifficulty) {
  currentDifficulty = d;
}

// ── Fast pseudo-legal move generation ─────────────────────────────────

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
          if (r === startRank && !board[r2][c])
            moves.push({ from: [r, c], to: [r2, c], piece: p, capture: null });
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
          if (!t || t.color === enemy)
            moves.push({ from: [r, c], to: [nr, nc], piece: p, capture: t });
        }
      } else if (p.type === 'k') {
        for (const [dr, dc] of KING_DIRS) {
          const nr = r + dr, nc = c + dc;
          if (!inB(nr, nc)) continue;
          const t = board[nr][nc];
          if (!t || t.color === enemy)
            moves.push({ from: [r, c], to: [nr, nc], piece: p, capture: t });
        }
        // Castling — must not be in check, and squares between must be safe
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
            if (!t) {
              moves.push({ from: [r, c], to: [nr, nc], piece: p, capture: null });
            } else {
              if (t.color === enemy)
                moves.push({ from: [r, c], to: [nr, nc], piece: p, capture: t });
              break;
            }
            nr += dr; nc += dc;
          }
        }
      }
    }
  }
  return moves;
}

// ── Incremental king tracking ─────────────────────────────────────────

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

// ── Make / Unmake on the working board (which is already a clone) ─────

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
  const [fr, fc] = move.from;
  const [tr, tc] = move.to;
  const p = board[fr][fc]!;

  const undo: UndoInfo = {
    capturedPiece: board[tr][tc],
    capturedSquare: null,
    castledRook: null,
    wasPromotion: !!move.promotion,
    originalType: p.type,
    prevWhiteKingR: whiteKingR, prevWhiteKingC: whiteKingC,
    prevBlackKingR: blackKingR, prevBlackKingC: blackKingC,
  };

  board[fr][fc] = null;

  if (move.enPassant) {
    const capR = p.color === 'w' ? tr + 1 : tr - 1;
    undo.capturedPiece = board[capR][tc];
    undo.capturedSquare = [capR, tc];
    board[capR][tc] = null;
  }

  if (move.castle === 'k') {
    const rook = board[tr][7];
    undo.castledRook = { rook, from: [tr, 7], to: [tr, 5] };
    board[tr][5] = rook;
    board[tr][7] = null;
  } else if (move.castle === 'q') {
    const rook = board[tr][0];
    undo.castledRook = { rook, from: [tr, 0], to: [tr, 3] };
    board[tr][3] = rook;
    board[tr][0] = null;
  }

  if (move.promotion) {
    p.type = move.promotion;
  }

  board[tr][tc] = p;

  if (p.type === 'k') {
    if (p.color === 'w') { whiteKingR = tr; whiteKingC = tc; }
    else { blackKingR = tr; blackKingC = tc; }
  }

  return undo;
}

function unmakeMove(board: Board, move: FastMove, undo: UndoInfo): void {
  const [fr, fc] = move.from;
  const [tr, tc] = move.to;

  const p = board[tr][tc]!;
  if (undo.wasPromotion) {
    p.type = undo.originalType;
  }
  board[fr][fc] = p;
  board[tr][tc] = move.enPassant ? null : undo.capturedPiece;

  if (move.enPassant && undo.capturedSquare) {
    board[undo.capturedSquare[0]][undo.capturedSquare[1]] = undo.capturedPiece;
  }

  if (undo.castledRook && undo.castledRook.rook) {
    const { rook, from, to } = undo.castledRook;
    board[from[0]][from[1]] = rook;
    board[to[0]][to[1]] = null;
  }

  whiteKingR = undo.prevWhiteKingR;
  whiteKingC = undo.prevWhiteKingC;
  blackKingR = undo.prevBlackKingR;
  blackKingC = undo.prevBlackKingC;
}

// ── Evaluation ────────────────────────────────────────────────────────
const PST_PAWN = [
  [ 0,  0,  0,  0,  0,  0,  0,  0],
  [50, 50, 50, 50, 50, 50, 50, 50],
  [10, 10, 20, 30, 30, 20, 10, 10],
  [ 5,  5, 10, 25, 25, 10,  5,  5],
  [ 0,  0,  0, 20, 20,  0,  0,  0],
  [ 5, -5,-10,  0,  0,-10, -5,  5],
  [ 5, 10, 10,-20,-20, 10, 10,  5],
  [ 0,  0,  0,  0,  0,  0,  0,  0],
];
const PST_KNIGHT = [
  [-50,-40,-30,-30,-30,-30,-40,-50],
  [-40,-20,  0,  0,  0,  0,-20,-40],
  [-30,  0, 10, 15, 15, 10,  0,-30],
  [-30,  5, 15, 20, 20, 15,  5,-30],
  [-30,  0, 15, 20, 20, 15,  0,-30],
  [-30,  5, 10, 15, 15, 10,  5,-30],
  [-40,-20,  0,  5,  5,  0,-20,-40],
  [-50,-40,-30,-30,-30,-30,-40,-50],
];
const PST_BISHOP = [
  [-20,-10,-10,-10,-10,-10,-10,-20],
  [-10,  0,  0,  0,  0,  0,  0,-10],
  [-10,  0,  5, 10, 10,  5,  0,-10],
  [-10,  5,  5, 10, 10,  5,  5,-10],
  [-10,  0, 10, 10, 10, 10,  0,-10],
  [-10, 10, 10, 10, 10, 10, 10,-10],
  [-10,  5,  0,  0,  0,  0,  5,-10],
  [-20,-10,-10,-10,-10,-10,-10,-20],
];

function evaluate(board: Board, side: Color): number {
  let score = 0;
  for (let r = 0; r < 8; r++) {
    for (let c = 0; c < 8; c++) {
      const p = board[r][c];
      if (!p) continue;
      const sign = p.color === side ? 1 : -1;
      let v = PIECE_VALUE[p.type] * 100;
      const tblR = p.color === 'w' ? r : 7 - r;
      if (p.type === 'p') v += PST_PAWN[tblR][c];
      else if (p.type === 'n') v += PST_KNIGHT[tblR][c];
      else if (p.type === 'b') v += PST_BISHOP[tblR][c];
      else {
        const centerDist = Math.abs(3.5 - r) + Math.abs(3.5 - c);
        v += (7 - centerDist);
      }
      score += sign * v;
    }
  }
  return score;
}

// ── Move ordering ─────────────────────────────────────────────────────
function orderFast(moves: FastMove[]): FastMove[] {
  return moves.sort((a, b) => fastScore(b) - fastScore(a));
}

function fastScore(m: FastMove): number {
  let s = 0;
  if (m.capture) s += PIECE_VALUE[m.capture.type] * 100 - PIECE_VALUE[m.piece.type] * 10;
  if (m.promotion) s += 800;
  return s;
}

// ── Quiescence search ─────────────────────────────────────────────────
let quiescenceNodes = 0;
const MAX_QUIESCENCE_NODES = 3000;

function quiescence(board: Board, state: GameState, alpha: number, beta: number, rootSide: Color): number {
  if (quiescenceNodes >= MAX_QUIESCENCE_NODES) return evaluate(board, rootSide);
  quiescenceNodes++;

  const stand = evaluate(board, rootSide);
  if (stand >= beta) return beta;
  if (stand > alpha) alpha = stand;

  const captures = genPseudoMoves(board, state, state.turn).filter((m) => m.capture || m.promotion);

  for (const m of orderFast(captures)) {
    const undo = makeMoveInPlace(board, m);
    if (isInCheckFast(board, state.turn)) {
      unmakeMove(board, m, undo);
      continue;
    }
    const childState = childGameState(state, m);
    const val = -quiescence(board, childState, -beta, -alpha, rootSide);
    unmakeMove(board, m, undo);
    if (val >= beta) return beta;
    if (val > alpha) alpha = val;
  }
  return alpha;
}

// ── Fast child state computation ──────────────────────────────────────
function childGameState(state: GameState, move: FastMove): GameState {
  const nextColor: Color = state.turn === 'w' ? 'b' : 'w';
  const castling = { ...state.castling };
  const p = move.piece;
  const [fr, fc] = move.from;
  const [tr, tc] = move.to;

  if (p.type === 'k') {
    if (p.color === 'w') { castling.wk = false; castling.wq = false; }
    else { castling.bk = false; castling.bq = false; }
  }
  if (p.type === 'r') {
    if (fr === 7 && fc === 0) castling.wq = false;
    if (fr === 7 && fc === 7) castling.wk = false;
    if (fr === 0 && fc === 0) castling.bq = false;
    if (fr === 0 && fc === 7) castling.bk = false;
  }
  if (tr === 7 && tc === 0) castling.wq = false;
  if (tr === 7 && tc === 7) castling.wk = false;
  if (tr === 0 && tc === 0) castling.bq = false;
  if (tr === 0 && tc === 7) castling.bk = false;

  let enPassant: [number, number] | null = null;
  if (p.type === 'p' && Math.abs(tr - fr) === 2)
    enPassant = [(fr + tr) / 2, fc];

  const halfmove = p.type === 'p' || move.capture ? 0 : state.halfmove + 1;
  const fullmove = state.turn === 'b' ? state.fullmove + 1 : state.fullmove;

  return { turn: nextColor, castling, enPassant, halfmove, fullmove };
}

// ── Negamax with alpha-beta ───────────────────────────────────────────
let searchNodes = 0;
const MAX_SEARCH_NODES = 12000;

function negamax(
  board: Board,
  state: GameState,
  depth: number,
  alpha: number,
  beta: number,
  rootSide: Color,
): number {
  if (searchNodes >= MAX_SEARCH_NODES) return evaluate(board, rootSide);
  searchNodes++;

  if (depth === 0) {
    return quiescence(board, state, alpha, beta, rootSide);
  }

  const pseudo = genPseudoMoves(board, state, state.turn);
  if (pseudo.length === 0) {
    if (isInCheckFast(board, state.turn)) return -100000 + (10 - depth);
    return 0;
  }

  let best = -Infinity;
  let legalCount = 0;

  for (const m of orderFast(pseudo)) {
    const undo = makeMoveInPlace(board, m);
    if (isInCheckFast(board, state.turn)) {
      unmakeMove(board, m, undo);
      continue;
    }
    legalCount++;
    const childState = childGameState(state, m);
    const val = -negamax(board, childState, depth - 1, -beta, -alpha, rootSide);
    unmakeMove(board, m, undo);

    if (val > best) best = val;
    if (best > alpha) alpha = best;
    if (alpha >= beta) break;
  }

  if (legalCount === 0) {
    if (isInCheckFast(board, state.turn)) return -100000 + (10 - depth);
    return 0;
  }

  return best;
}

// ── Public entry point ────────────────────────────────────────────────
export function chooseMove(board: Board, state: GameState, side: Color): Move | null {
  // Clone the board so the make/unmake search never touches the real game board.
  const work = cloneBoard(board);
  initKingPositions(work);

  const pseudo = genPseudoMoves(work, state, side);
  const legal: FastMove[] = [];

  for (const m of pseudo) {
    const undo = makeMoveInPlace(work, m);
    if (!isInCheckFast(work, side)) legal.push(m);
    unmakeMove(work, m, undo);
  }

  if (legal.length === 0) return null;

  const depth = DIFFICULTY_DEPTH[currentDifficulty];
  const randomness = DIFFICULTY_RANDOMNESS[currentDifficulty];

  // Beginner: frequently pick a random move
  if (currentDifficulty === 'beginner') {
    if (Math.random() < 0.35) {
      return fastToMove(legal[Math.floor(Math.random() * legal.length)]);
    }
  }

  // Intermediate: sometimes pick a shallow-eval suboptimal move
  if (currentDifficulty === 'intermediate' && Math.random() < 0.15) {
    const scored = legal.map((m) => {
      const undo = makeMoveInPlace(work, m);
      const s = evaluate(work, side) + (Math.random() - 0.5) * 60;
      unmakeMove(work, m, undo);
      return { m, score: s };
    });
    scored.sort((a, b) => b.score - a.score);
    const mid = scored.slice(0, Math.min(3, scored.length));
    return fastToMove(mid[Math.floor(Math.random() * mid.length)].m);
  }

  // Full search with node caps
  searchNodes = 0;
  quiescenceNodes = 0;

  const scored = legal.map((m) => {
    const undo = makeMoveInPlace(work, m);
    const childState = childGameState(state, m);
    const base = -negamax(work, childState, depth - 1, -Infinity, Infinity, side);
    const jitter = (Math.random() - 0.5) * randomness;
    unmakeMove(work, m, undo);
    return { m, score: base + jitter };
  });

  scored.sort((a, b) => b.score - a.score);
  const top = scored.filter((s) => s.score >= scored[0].score - randomness);
  const pick = top[Math.floor(Math.random() * top.length)];
  return fastToMove(pick.m);
}

function fastToMove(fm: FastMove): Move {
  return {
    from: fm.from,
    to: fm.to,
    piece: fm.piece,
    capture: fm.capture,
    promotion: fm.promotion,
    castle: fm.castle,
    enPassant: fm.enPassant,
  };
}

export { applyMove, makeMove, findKing };
