export type Color = 'w' | 'b';
export type PieceType = 'k' | 'q' | 'r' | 'b' | 'n' | 'p';

export interface Piece {
  id: number;
  type: PieceType;
  color: Color;
}

export type Square = Piece | null;
export type Board = Square[][]; // [rank 0..7][file 0..7]; rank 0 = top (rank 8)

export interface CastlingRights {
  wk: boolean;
  wq: boolean;
  bk: boolean;
  bq: boolean;
}

export interface GameState {
  turn: Color;
  castling: CastlingRights;
  enPassant: [number, number] | null;
  halfmove: number;
  fullmove: number;
}

export interface Move {
  from: [number, number];
  to: [number, number];
  piece: Piece;
  capture: Piece | null;
  promotion?: PieceType;
  castle?: 'k' | 'q';
  enPassant?: boolean;
}

export type GamePhase = 'playing' | 'check' | 'checkmate' | 'stalemate' | 'draw';

export type GameStage = 'opening' | 'middlegame' | 'endgame';

export interface GameStatus {
  phase: GamePhase;
  winner: Color | null;
  stage: GameStage;
}

export type TimeControl = '1min' | '3min' | '5min' | '10min' | '30min' | 'custom';

export type AIDifficulty = 'beginner' | 'intermediate' | 'advanced' | 'master';

export type GameMode = 'ai' | 'pass' | 'online' | 'room';

export interface ClockSettings {
  label: string;
  initialMs: number;
  incrementMs: number;
}

export interface ClockState {
  whiteMs: number;
  blackMs: number;
  running: boolean;
}

export interface HistoryEntry {
  move: Move;
  san: string;
  boardBefore: Board;
  stateBefore: GameState;
}

export interface MatchRecord {
  id: number;
  date: number;
  opponentName: string;
  opponentAvatar: string;
  opponentFlag: string;
  result: 'win' | 'loss' | 'draw';
  moves: number;
  timeControlLabel: string;
  ratingChange: number;
  ending: 'checkmate' | 'resign' | 'timeout' | 'stalemate';
}

export interface WalletTransaction {
  id: number;
  date: number;
  type: 'credit' | 'debit' | 'bonus';
  amount: number;
  description: string;
}

export interface WalletState {
  balance: number;
  transactions: WalletTransaction[];
}
