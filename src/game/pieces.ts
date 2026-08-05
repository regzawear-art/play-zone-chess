import type { Color, PieceType } from './types';

// Filled Unicode glyphs used for BOTH colors; actual color comes from CSS.
// This keeps a uniform, crisp, premium look instead of thin outline glyphs.
export const GLYPH: Record<PieceType, string> = {
  k: '\u265A', // ♚
  q: '\u265B', // ♛
  r: '\u265C', // ♜
  b: '\u265D', // ♝
  n: '\u265E', // ♞
  p: '\u265F', // ♟
};

export const PIECE_NAME: Record<PieceType, string> = {
  k: 'King',
  q: 'Queen',
  r: 'Rook',
  b: 'Bishop',
  n: 'Knight',
  p: 'Pawn',
};

export const PIECE_VALUE: Record<PieceType, number> = {
  p: 1,
  n: 3,
  b: 3,
  r: 5,
  q: 9,
  k: 0,
};

export function fileChar(c: number): string {
  return String.fromCharCode(97 + c); // a..h
}

export function rankChar(r: number): string {
  return String(8 - r); // 8..1
}

export function squareName(r: number, c: number): string {
  return `${fileChar(c)}${rankChar(r)}`;
}

export function colorLabel(color: Color): string {
  return color === 'w' ? 'White' : 'Black';
}
