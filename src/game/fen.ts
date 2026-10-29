import type { Board, Color, GameState, Piece, PieceType } from './types';

let fenPieceId = 100000;

/** Parse a FEN string into the app's board/state representation. */
export function parseFEN(fen: string): { board: Board; state: GameState } {
    const [placement, turn = 'w', castling = '-', ep = '-', half = '0', full = '1'] = fen.trim().split(/\s+/);
    const board: Board = Array.from({ length: 8 }, () => Array<Piece | null>(8).fill(null));
    const rows = placement.split('/');
    for (let r = 0; r < 8; r++) {
        let c = 0;
        for (const ch of rows[r] ?? '') {
            if (/\d/.test(ch)) {
                c += Number(ch);
            } else {
                const color: Color = ch === ch.toUpperCase() ? 'w' : 'b';
                board[r][c] = { id: fenPieceId++, type: ch.toLowerCase() as PieceType, color };
                c++;
            }
        }
    }
    let enPassant: [number, number] | null = null;
    if (ep !== '-' && ep.length === 2) {
        enPassant = [8 - Number(ep[1]), ep.charCodeAt(0) - 97];
    }
    return {
        board,
        state: {
            turn: turn === 'b' ? 'b' : 'w',
            castling: {
                wk: castling.includes('K'),
                wq: castling.includes('Q'),
                bk: castling.includes('k'),
                bq: castling.includes('q'),
            },
            enPassant,
            halfmove: Number(half) || 0,
            fullmove: Number(full) || 1,
        },
    };
}

/** "e2e4" / "e7e8q" → coordinates in [row, col] (row 0 = rank 8). */
export function parseUci(uci: string): { from: [number, number]; to: [number, number]; promotion?: PieceType } {
    const sq = (s: string): [number, number] => [8 - Number(s[1]), s.charCodeAt(0) - 97];
    return {
        from: sq(uci.slice(0, 2)),
        to: sq(uci.slice(2, 4)),
        promotion: uci.length > 4 ? (uci[4] as PieceType) : undefined,
    };
}
