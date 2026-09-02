import type { Board, Color, GameState, GameStage, Move, Piece } from './types';
import { cloneBoard, inBounds, isSquareAttacked, isInCheck, findKing } from './board';
import { squareName, PIECE_VALUE } from './pieces';

const DIRS = {
  rook: [
    [1, 0],
    [-1, 0],
    [0, 1],
    [0, -1],
  ],
  bishop: [
    [1, 1],
    [1, -1],
    [-1, 1],
    [-1, -1],
  ],
  knight: [
    [2, 1],
    [2, -1],
    [-2, 1],
    [-2, -1],
    [1, 2],
    [1, -2],
    [-1, 2],
    [-1, -2],
  ],
  king: [
    [1, 0],
    [-1, 0],
    [0, 1],
    [0, -1],
    [1, 1],
    [1, -1],
    [-1, 1],
    [-1, -1],
  ],
};

type Proto = { from: [number, number]; to: [number, number]; piece: Piece; castle?: 'k' | 'q'; enPassant?: boolean };

function pseudoMoves(board: Board, state: GameState, color: Color): Proto[] {
  const moves: Proto[] = [];
  const enemy: Color = color === 'w' ? 'b' : 'w';
  const pawnDir = color === 'w' ? -1 : 1;
  const startRank = color === 'w' ? 6 : 1;
  const promoRank = color === 'w' ? 0 : 7;

  for (let r = 0; r < 8; r++) {
    for (let c = 0; c < 8; c++) {
      const p = board[r][c];
      if (!p || p.color !== color) continue;

      if (p.type === 'p') {
        // forward 1
        const r1 = r + pawnDir;
        if (inBounds(r1, c) && !board[r1][c]) {
          pushPawn(moves, p, r, c, r1, c, r1 === promoRank);
          // forward 2
          const r2 = r + 2 * pawnDir;
          if (r === startRank && !board[r2][c]) {
            moves.push({ from: [r, c], to: [r2, c], piece: p });
          }
        }
        // captures
        for (const dc of [-1, 1]) {
          const nc = c + dc;
          if (!inBounds(r1, nc)) continue;
          const target = board[r1][nc];
          if (target && target.color === enemy) {
            pushPawn(moves, p, r, c, r1, nc, r1 === promoRank);
          }
          // en passant
          if (state.enPassant && state.enPassant[0] === r1 && state.enPassant[1] === nc) {
            moves.push({ from: [r, c], to: [r1, nc], piece: p, enPassant: true });
          }
        }
      } else if (p.type === 'n') {
        for (const [dr, dc] of DIRS.knight) {
          const nr = r + dr;
          const nc = c + dc;
          if (!inBounds(nr, nc)) continue;
          const target = board[nr][nc];
          if (!target || target.color === enemy) {
            moves.push({ from: [r, c], to: [nr, nc], piece: p });
          }
        }
      } else if (p.type === 'k') {
        for (const [dr, dc] of DIRS.king) {
          const nr = r + dr;
          const nc = c + dc;
          if (!inBounds(nr, nc)) continue;
          const target = board[nr][nc];
          if (!target || target.color === enemy) {
            moves.push({ from: [r, c], to: [nr, nc], piece: p });
          }
        }
        // castling
        const rights = state.castling;
        const homeRank = color === 'w' ? 7 : 0;
        if (r === homeRank && c === 4 && !isInCheck(board, color)) {
          const ks = color === 'w' ? rights.wk : rights.bk;
          const qs = color === 'w' ? rights.wq : rights.bq;
          if (ks && !board[homeRank][5] && !board[homeRank][6] && board[homeRank][7]?.type === 'r') {
            if (!isSquareAttacked(board, homeRank, 5, enemy) && !isSquareAttacked(board, homeRank, 6, enemy)) {
              moves.push({ from: [r, c], to: [homeRank, 6], piece: p, castle: 'k' });
            }
          }
          if (
            qs &&
            !board[homeRank][3] &&
            !board[homeRank][2] &&
            !board[homeRank][1] &&
            board[homeRank][0]?.type === 'r'
          ) {
            if (!isSquareAttacked(board, homeRank, 3, enemy) && !isSquareAttacked(board, homeRank, 2, enemy)) {
              moves.push({ from: [r, c], to: [homeRank, 2], piece: p, castle: 'q' });
            }
          }
        }
      } else {
        // sliding pieces
        const dirs = p.type === 'r' ? DIRS.rook : p.type === 'b' ? DIRS.bishop : [...DIRS.rook, ...DIRS.bishop];
        for (const [dr, dc] of dirs) {
          let nr = r + dr;
          let nc = c + dc;
          while (inBounds(nr, nc)) {
            const target = board[nr][nc];
            if (!target) {
              moves.push({ from: [r, c], to: [nr, nc], piece: p });
            } else {
              if (target.color === enemy) moves.push({ from: [r, c], to: [nr, nc], piece: p });
              break;
            }
            nr += dr;
            nc += dc;
          }
        }
      }
    }
  }
  return moves;
}

function pushPawn(
  moves: Proto[],
  p: Piece,
  r: number,
  c: number,
  nr: number,
  nc: number,
  _promo: boolean,
) {
  // Promotion is expanded into 4 concrete moves in legalMoves(); here we emit one
  // pseudo-move per target square and let the caller detect the promo rank.
  moves.push({ from: [r, c], to: [nr, nc], piece: p });
}

// Apply a move to a fresh board copy and return the resulting board.
export function applyMove(board: Board, state: GameState, move: Move): Board {
  const nb = cloneBoard(board);
  const [fr, fc] = move.from;
  const [tr, tc] = move.to;
  const p = nb[fr][fc]!;
  nb[fr][fc] = null;

  if (move.enPassant) {
    const capR = p.color === 'w' ? tr + 1 : tr - 1;
    nb[capR][tc] = null;
  }
  if (move.castle === 'k') {
    nb[tr][5] = nb[tr][7];
    nb[tr][7] = null;
  } else if (move.castle === 'q') {
    nb[tr][3] = nb[tr][0];
    nb[tr][0] = null;
  }

  let placed = p;
  if (move.promotion) {
    placed = { ...p, type: move.promotion };
  }
  nb[tr][tc] = placed;
  void state;
  return nb;
}

export function nextCastling(state: GameState, move: Move): GameState['castling'] {
  const c = { ...state.castling };
  const p = move.piece;
  const [fr, fc] = move.from;
  const [tr, tc] = move.to;
  if (p.type === 'k') {
    if (p.color === 'w') {
      c.wk = false;
      c.wq = false;
    } else {
      c.bk = false;
      c.bq = false;
    }
  }
  if (p.type === 'r') {
    if (fr === 7 && fc === 0) c.wq = false;
    if (fr === 7 && fc === 7) c.wk = false;
    if (fr === 0 && fc === 0) c.bq = false;
    if (fr === 0 && fc === 7) c.bk = false;
  }
  // rook captured
  if (tr === 7 && tc === 0) c.wq = false;
  if (tr === 7 && tc === 7) c.wk = false;
  if (tr === 0 && tc === 0) c.bq = false;
  if (tr === 0 && tc === 7) c.bk = false;
  return c;
}

// Build fully-legal moves (filters out self-check), with captures & promotion metadata.
export function legalMoves(board: Board, state: GameState, color: Color): Move[] {
  const protos = pseudoMoves(board, state, color);
  const legal: Move[] = [];
  const promoRank = color === 'w' ? 0 : 7;

  for (const m of protos) {
    const isPromo = m.piece.type === 'p' && m.to[0] === promoRank;
    const capture =
      board[m.to[0]][m.to[1]] ?? (m.enPassant ? board[m.from[0]][m.to[1]] : null);

    if (isPromo) {
      for (const promo of ['q', 'r', 'b', 'n'] as const) {
        const mv: Move = {
          from: m.from,
          to: m.to,
          piece: m.piece,
          capture: capture ?? null,
          promotion: promo,
          castle: m.castle,
          enPassant: m.enPassant,
        };
        if (leavesKingSafe(board, state, mv, color)) legal.push(mv);
      }
    } else {
      const mv: Move = {
        from: m.from,
        to: m.to,
        piece: m.piece,
        capture: capture ?? null,
        castle: m.castle,
        enPassant: m.enPassant,
      };
      if (leavesKingSafe(board, state, mv, color)) legal.push(mv);
    }
  }
  return legal;
}

function leavesKingSafe(board: Board, state: GameState, move: Move, color: Color): boolean {
  const nb = applyMove(board, state, move);
  return !isInCheck(nb, color);
}

export function legalMovesFrom(board: Board, state: GameState, color: Color, r: number, c: number): Move[] {
  return legalMoves(board, state, color).filter((m) => m.from[0] === r && m.from[1] === c);
}

export function detectStage(board: Board, moveCount: number): GameStage {
  // Count non-pawn, non-king material on the board.
  let bigPieces = 0;
  for (let r = 0; r < 8; r++) {
    for (let c = 0; c < 8; c++) {
      const p = board[r][c];
      if (!p) continue;
      if (p.type === 'n' || p.type === 'b' || p.type === 'r' || p.type === 'q') bigPieces++;
    }
  }
  if (moveCount < 16 && bigPieces > 10) return 'opening';
  if (bigPieces <= 6) return 'endgame';
  return 'middlegame';
}

export function gameStatus(board: Board, state: GameState): {
  check: Color | null;
  phase: 'playing' | 'check' | 'checkmate' | 'stalemate';
  winner: Color | null;
  stage: GameStage;
} {
  const moves = legalMoves(board, state, state.turn);
  const check = isInCheck(board, state.turn) ? state.turn : null;
  const stage = detectStage(board, state.fullmove);
  if (moves.length === 0) {
    if (check) {
      return { check, phase: 'checkmate', winner: state.turn === 'w' ? 'b' : 'w', stage };
    }
    return { check: null, phase: 'stalemate', winner: null, stage };
  }
  return { check, phase: check ? 'check' : 'playing', winner: null, stage };
}

// --- SAN-ish notation for move history ---
export function toSAN(board: Board, state: GameState, move: Move, allLegal: Move[]): string {
  if (move.castle === 'k') return 'O-O';
  if (move.castle === 'q') return 'O-O-O';
  const p = move.piece;
  const dest = squareName(move.to[0], move.to[1]);
  let san = '';
  if (p.type === 'p') {
    if (move.capture) {
      san = `${squareName(move.from[0], move.from[1])[0]}x${dest}`;
    } else {
      san = dest;
    }
    if (move.promotion) san += `=${move.promotion.toUpperCase()}`;
  } else {
    const same = allLegal.filter(
      (m) => m.piece.type === p.type && m.to[0] === move.to[0] && m.to[1] === move.to[1] && !(m.from[0] === move.from[0] && m.from[1] === move.from[1]),
    );
    let disamb = '';
    if (same.length > 0) {
      const sameFile = same.some((m) => m.from[1] === move.from[1]);
      const sameRank = same.some((m) => m.from[0] === move.from[0]);
      if (!sameFile) disamb = squareName(move.from[0], move.from[1])[0];
      else if (!sameRank) disamb = squareName(move.from[0], move.from[1])[1];
      else disamb = squareName(move.from[0], move.from[1]);
    }
    san = `${p.type.toUpperCase()}${disamb}${move.capture ? 'x' : ''}${dest}`;
  }
  // check/checkmate marker
  const nb = applyMove(board, state, move);
  const enemy: Color = p.color === 'w' ? 'b' : 'w';
  const enemyInCheck = isInCheck(nb, enemy);
  if (enemyInCheck) {
    const enemyState: GameState = { ...state, turn: enemy };
    const enemyMoves = legalMoves(nb, enemyState, enemy);
    san += enemyMoves.length === 0 ? '#' : '+';
  }
  return san;
}

export function makeMove(board: Board, state: GameState, move: Move): { board: Board; state: GameState } {
  const nb = applyMove(board, state, move);
  const nextColor: Color = state.turn === 'w' ? 'b' : 'w';
  const castling = nextCastling(state, move);
  let enPassant: [number, number] | null = null;
  if (move.piece.type === 'p' && Math.abs(move.to[0] - move.from[0]) === 2) {
    enPassant = [(move.from[0] + move.to[0]) / 2, move.from[1]];
  }
  const halfmove = move.piece.type === 'p' || move.capture ? 0 : state.halfmove + 1;
  const fullmove = state.turn === 'b' ? state.fullmove + 1 : state.fullmove;
  return {
    board: nb,
    state: { turn: nextColor, castling, enPassant, halfmove, fullmove },
  };
}

export function initialState(): GameState {
  return {
    turn: 'w',
    castling: { wk: true, wq: true, bk: true, bq: true },
    enPassant: null,
    halfmove: 0,
    fullmove: 1,
  };
}

export { findKing };
