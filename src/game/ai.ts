import type { Board, Color, GameState, Move } from './types';
import { legalMoves, applyMove, makeMove } from './engine';
import { isInCheck, findKing } from './board';
import { PIECE_VALUE } from './pieces';

// Lightweight computer opponent: search with alpha-beta + quiescence,
// slight randomization for variety, prefers captures and king safety.

import type { AIDifficulty } from './types';

const DIFFICULTY_DEPTH: Record<AIDifficulty, number> = {
  easy: 1,
  hard: 3,
  gm: 4,
};

const DIFFICULTY_RANDOMNESS: Record<AIDifficulty, number> = {
  easy: 80,
  hard: 14,
  gm: 0,
};

let currentDifficulty: AIDifficulty = 'hard';

export function setAIDifficulty(d: AIDifficulty) {
  currentDifficulty = d;
}

const MAX_DEPTH = DIFFICULTY_DEPTH[currentDifficulty];

function evaluate(board: Board, side: Color): number {
  let score = 0;
  for (let r = 0; r < 8; r++) {
    for (let c = 0; c < 8; c++) {
      const p = board[r][c];
      if (!p) continue;
      const v = PIECE_VALUE[p.type] * 100;
      const sign = p.color === side ? 1 : -1;
      score += sign * v;
      // center bonus
      const centerDist = Math.abs(3.5 - r) + Math.abs(3.5 - c);
      score += sign * (7 - centerDist);
      // pawn advancement
      if (p.type === 'p') {
        const adv = p.color === 'w' ? 6 - r : r - 1;
        score += sign * adv;
      }
    }
  }
  return score;
}

function orderMoves(moves: Move[]): Move[] {
  return [...moves].sort((a, b) => scoreMove(b) - scoreMove(a));
}

function scoreMove(m: Move): number {
  let s = 0;
  if (m.capture) s += PIECE_VALUE[m.capture.type] * 100 - PIECE_VALUE[m.piece.type] * 10;
  if (m.promotion) s += 800;
  return s;
}

function quiescence(board: Board, state: GameState, alpha: number, beta: number, side: Color, rootSide: Color): number {
  const stand = evaluate(board, side === rootSide ? rootSide : (rootSide === 'w' ? 'b' : 'w'));
  // evaluate returns from rootSide perspective
  const standRoot = side === rootSide ? evaluate(board, rootSide) : -evaluate(board, side);
  void stand;
  if (standRoot >= beta) return beta;
  if (standRoot > alpha) alpha = standRoot;

  const moves = legalMoves(board, state, state.turn).filter((m) => m.capture || m.promotion);
  for (const m of orderMoves(moves)) {
    const { board: nb, state: ns } = makeMove(board, state, m);
    const val = -quiescence(nb, ns, -beta, -alpha, state.turn === rootSide ? rootSide : (rootSide === 'w' ? 'b' : 'w'), rootSide);
    if (val >= beta) return beta;
    if (val > alpha) alpha = val;
  }
  return alpha;
}

function negamax(
  board: Board,
  state: GameState,
  depth: number,
  alpha: number,
  beta: number,
  rootSide: Color,
): number {
  if (depth === 0) {
    return evaluate(board, state.turn === rootSide ? rootSide : (rootSide === 'w' ? 'b' : 'w'));
  }
  const moves = legalMoves(board, state, state.turn);
  if (moves.length === 0) {
    if (isInCheck(board, state.turn)) return -100000 + (MAX_DEPTH - depth);
    return 0; // stalemate
  }
  let best = -Infinity;
  for (const m of orderMoves(moves)) {
    const { board: nb, state: ns } = makeMove(board, state, m);
    const val = -negamax(nb, ns, depth - 1, -beta, -alpha, rootSide);
    if (val > best) best = val;
    if (best > alpha) alpha = best;
    if (alpha >= beta) break;
  }
  return best;
}

export function chooseMove(board: Board, state: GameState, side: Color): Move | null {
  const moves = legalMoves(board, state, side);
  if (moves.length === 0) return null;
  const depth = DIFFICULTY_DEPTH[currentDifficulty];
  const randomness = DIFFICULTY_RANDOMNESS[currentDifficulty];

  // Easy mode: sometimes pick a random move
  if (currentDifficulty === 'easy' && Math.random() < 0.3) {
    return moves[Math.floor(Math.random() * moves.length)];
  }

  const scored = moves.map((m) => {
    const { board: nb, state: ns } = makeMove(board, state, m);
    const base = -negamax(nb, ns, depth - 1, -Infinity, Infinity, side);
    const jitter = (Math.random() - 0.5) * randomness;
    return { m, score: base + jitter };
  });
  scored.sort((a, b) => b.score - a.score);
  const top = scored.filter((s) => s.score >= scored[0].score - randomness);
  const pick = top[Math.floor(Math.random() * top.length)];
  return pick.m;
}

export { applyMove, makeMove, findKing };
