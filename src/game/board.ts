import type { Board, Piece, PieceType, Color } from './types';

const OFFS = {
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

let pieceCounter = 0;
function mkPiece(type: PieceType, color: Color): Piece {
  return { id: pieceCounter++, type, color };
}

export function initialBoard(): Board {
  const back: PieceType[] = ['r', 'n', 'b', 'q', 'k', 'b', 'n', 'r'];
  const board: Board = Array.from({ length: 8 }, () => Array<Piece | null>(8).fill(null));

  for (let c = 0; c < 8; c++) {
    board[0][c] = mkPiece(back[c], 'b');
    board[1][c] = mkPiece('p', 'b');
    board[6][c] = mkPiece('p', 'w');
    board[7][c] = mkPiece(back[c], 'w');
  }
  return board;
}

export function cloneBoard(board: Board): Board {
  return board.map((row) => row.map((sq) => (sq ? { ...sq } : null)));
}

export function inBounds(r: number, c: number): boolean {
  return r >= 0 && r < 8 && c >= 0 && c < 8;
}

export function findKing(board: Board, color: Color): [number, number] | null {
  for (let r = 0; r < 8; r++) {
    for (let c = 0; c < 8; c++) {
      const p = board[r][c];
      if (p && p.type === 'k' && p.color === color) return [r, c];
    }
  }
  return null;
}

// Is square (r,c) attacked by `byColor`?
export function isSquareAttacked(board: Board, r: number, c: number, byColor: Color): boolean {
  // Pawn attacks
  const dir = byColor === 'w' ? 1 : -1; // attacker pawn one rank closer to its origin
  for (const dc of [-1, 1]) {
    const pr = r + dir;
    const pc = c + dc;
    if (inBounds(pr, pc)) {
      const p = board[pr][pc];
      if (p && p.color === byColor && p.type === 'p') return true;
    }
  }
  // Knight attacks
  for (const [dr, dc] of OFFS.knight) {
    const nr = r + dr;
    const nc = c + dc;
    if (inBounds(nr, nc)) {
      const p = board[nr][nc];
      if (p && p.color === byColor && p.type === 'n') return true;
    }
  }
  // King attacks
  for (const [dr, dc] of OFFS.king) {
    const nr = r + dr;
    const nc = c + dc;
    if (inBounds(nr, nc)) {
      const p = board[nr][nc];
      if (p && p.color === byColor && p.type === 'k') return true;
    }
  }
  // Sliding: rook/queen (orthogonal)
  for (const [dr, dc] of OFFS.rook) {
    let nr = r + dr;
    let nc = c + dc;
    while (inBounds(nr, nc)) {
      const p = board[nr][nc];
      if (p) {
        if (p.color === byColor && (p.type === 'r' || p.type === 'q')) return true;
        break;
      }
      nr += dr;
      nc += dc;
    }
  }
  // Sliding: bishop/queen (diagonal)
  for (const [dr, dc] of OFFS.bishop) {
    let nr = r + dr;
    let nc = c + dc;
    while (inBounds(nr, nc)) {
      const p = board[nr][nc];
      if (p) {
        if (p.color === byColor && (p.type === 'b' || p.type === 'q')) return true;
        break;
      }
      nr += dr;
      nc += dc;
    }
  }
  return false;
}

export function isInCheck(board: Board, color: Color): boolean {
  const k = findKing(board, color);
  if (!k) return false;
  return isSquareAttacked(board, k[0], k[1], color === 'w' ? 'b' : 'w');
}
