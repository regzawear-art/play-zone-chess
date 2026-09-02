import type { Board, PieceType } from '../game/types';

const PIECE_VALUES: Record<PieceType, number> = { p: 1, n: 3, b: 3, r: 5, q: 9, k: 0 };

export function computeCaptured(board: Board): {
  white: PieceType[];
  black: PieceType[];
  whiteDiff: number;
  blackDiff: number;
} {
  const counts: Record<string, Record<PieceType, number>> = {
    w: { p: 0, n: 0, b: 0, r: 0, q: 0, k: 0 },
    b: { p: 0, n: 0, b: 0, r: 0, q: 0, k: 0 },
  };
  for (let r = 0; r < 8; r++) {
    for (let c = 0; c < 8; c++) {
      const p = board[r][c];
      if (p) counts[p.color][p.type]++;
    }
  }
  const capturedByWhite: PieceType[] = [];
  const capturedByBlack: PieceType[] = [];
  (['p', 'n', 'b', 'r', 'q'] as PieceType[]).forEach((t) => {
    const missingFromBlack = 8 - counts.b[t];
    for (let i = 0; i < missingFromBlack; i++) capturedByWhite.push(t);
    const missingFromWhite = t === 'p' ? 8 : 2;
    const wm = missingFromWhite - counts.w[t];
    for (let i = 0; i < wm; i++) capturedByBlack.push(t);
  });
  const whiteMaterial = capturedByWhite.reduce((s, p) => s + PIECE_VALUES[p], 0);
  const blackMaterial = capturedByBlack.reduce((s, p) => s + PIECE_VALUES[p], 0);
  return {
    white: capturedByWhite,
    black: capturedByBlack,
    whiteDiff: Math.max(0, whiteMaterial - blackMaterial),
    blackDiff: Math.max(0, blackMaterial - whiteMaterial),
  };
}
