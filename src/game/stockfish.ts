import type { Board, GameState, Color, Move } from './types';
import { legalMoves } from './engine';

// Minimal FEN generator for current board/state shape
function pieceChar(p: any): string {
  if (!p) return '';
  const ch = p.type === 'p' ? 'p' : p.type === 'n' ? 'n' : p.type === 'b' ? 'b' : p.type === 'r' ? 'r' : p.type === 'q' ? 'q' : 'k';
  return p.color === 'w' ? ch.toUpperCase() : ch;
}

function squareName(r: number, c: number) {
  const file = 'abcdefgh'[c];
  const rank = 8 - r;
  return `${file}${rank}`;
}

export function boardToFEN(board: Board, state: GameState): string {
  // board rows r=0..7 correspond to ranks 8..1
  const rows: string[] = [];
  for (let r = 0; r < 8; r++) {
    let empty = 0;
    let row = '';
    for (let c = 0; c < 8; c++) {
      const p = board[r][c];
      if (!p) { empty++; } else { if (empty > 0) { row += String(empty); empty = 0; } row += pieceChar(p); }
    }
    if (empty > 0) row += String(empty);
    rows.push(row);
  }
  const piecePlacement = rows.join('/');
  const active = state.turn === 'w' ? 'w' : 'b';
  let castling = '';
  if (state.castling.wk) castling += 'K';
  if (state.castling.wq) castling += 'Q';
  if (state.castling.bk) castling += 'k';
  if (state.castling.bq) castling += 'q';
  if (castling === '') castling = '-';
  let ep = '-';
  if (state.enPassant) ep = squareName(state.enPassant[0], state.enPassant[1]);
  const halfmove = state.halfmove ?? 0;
  const fullmove = state.fullmove ?? 1;
  return `${piecePlacement} ${active} ${castling} ${ep} ${halfmove} ${fullmove}`;
}

// Worker wrapper
let sfWorker: Worker | null = null;
// Prefer launching the prebuilt stockfish worker directly from /stockfish/stockfish.js
// If that fails, fall back to the bundled wrapper (stockfish.worker.ts)
try {
  // This will load the prebuilt JS/WASM worker served from public/stockfish/
  sfWorker = new Worker('/stockfish/stockfish.js');
} catch (e) {
  try {
    sfWorker = new Worker(new URL('./stockfish.worker.ts', import.meta.url), { type: 'module' });
  } catch (err) {
    // Worker not supported or failed to construct in this environment
    // eslint-disable-next-line no-console
    console.warn('[stockfish main] failed to create worker', e, err);
    sfWorker = null;
  }
}

let reqId = 1;
const pending: Record<number, { resolve: (m: string | null) => void; reject: (e: any) => void }> = {};

// Worker mode detection: 'raw' = engine expects string UCI commands; 'wrapped' = expects structured messages; null = unknown
let workerMode: 'raw' | 'wrapped' | null = null;

if (sfWorker) {
  sfWorker.addEventListener('message', (ev) => {
    const d = ev.data;
    if (!d && d !== '') return;
    // eslint-disable-next-line no-console
    console.log('[stockfish main] message', d);

    // Detect mode on first meaningful message
    if (workerMode === null) {
      if (typeof d === 'string') workerMode = 'raw';
      else if (typeof d === 'object' && d.type) workerMode = 'wrapped';
      // eslint-disable-next-line no-console
      console.log('[stockfish main] detected workerMode=', workerMode);
    }

    // Handle structured wrapper responses: { type:'result', id, bestmove }
    if (typeof d === 'object' && d.type === 'result') {
      const p = pending[d.id];
      if (p) { p.resolve(d.bestmove ?? null); delete pending[d.id]; }
      return;
    }

    if (typeof d === 'object' && d.type === 'error') {
      const p = pending[d.id]; if (p) { p.reject(new Error(d.error)); delete pending[d.id]; }
      return;
    }

    // Handle raw engine output (string lines)
    if (typeof d === 'string') {
      const line = d.trim();
      if (line.startsWith('bestmove')) {
        const parts = line.split(' ');
        const best = parts[1];
        // resolve the most recent pending request
        const ids = Object.keys(pending).map((s) => parseInt(s, 10)).sort((a, b) => b - a);
        const id = ids.length ? ids[0] : null;
        if (id !== null) {
          const p = pending[id]; if (p) { p.resolve(best ?? null); delete pending[id]; }
        }
        return;
      }
      return;
    }
  });

  // Probe: send a UCI 'uci' command to trigger raw engine to respond (if it's raw)
  try {
    sfWorker.postMessage('uci');
  } catch (e) {
    // ignore probe errors
  }
}

export async function chooseWithStockfish(board: Board, state: GameState, side: Color, movetime = 2000, opts?: { limitStrength?: boolean; elo?: number; skillLevel?: number }): Promise<Move | null> {
  if (!sfWorker) {
    // Worker unavailable — log and signal caller to fallback
    // eslint-disable-next-line no-console
    console.warn('[stockfish main] worker unavailable, falling back to JS worker');
    return null;
  }

  const fen = boardToFEN(board, state);
  const id = reqId++;
  return new Promise((resolve, reject) => {
    pending[id] = { resolve, reject };
    try {
      // send UCI setoption commands if options provided
      if (opts) {
        if (opts.limitStrength) {
          try { sfWorker!.postMessage('setoption name UCI_LimitStrength value true'); } catch {}
        }
        if (typeof opts.elo === 'number') {
          try { sfWorker!.postMessage('setoption name UCI_Elo value ' + Math.floor(opts.elo)); } catch {}
        }
        if (typeof opts.skillLevel === 'number') {
          try { sfWorker!.postMessage('setoption name Skill Level value ' + Math.floor(opts.skillLevel)); } catch {}
        }
      }

      // Send according to detected worker mode. Raw engines expect string UCI commands.
      if (workerMode === 'wrapped') {
        sfWorker!.postMessage({ type: 'go', id, fen, movetime, opts });
      } else {
        // raw or unknown: send UCI strings
        sfWorker!.postMessage('position fen ' + fen);
        sfWorker!.postMessage('go movetime ' + Math.max(10, Math.floor(movetime)));
      }
    } catch (err) {
      // posting failed, cleanup and resolve null so caller can fallback
      delete pending[id];
      // eslint-disable-next-line no-console
      console.error('[stockfish main] postMessage failed', err);
      resolve(null);
      return;
    }
    setTimeout(() => { if (pending[id]) { pending[id].resolve(null); delete pending[id]; } }, movetime + 2000);
  }).then((best: string | null) => {
    if (!best) return null;
    // best is in UCI like e2e4 or e7e8q
    const fromFile = best[0]; const fromRank = parseInt(best[1], 10);
    const toFile = best[2]; const toRank = parseInt(best[3], 10);
    const fileToCol = (f: string) => 'abcdefgh'.indexOf(f);
    const from: [number, number] = [8 - fromRank, fileToCol(fromFile)];
    const to: [number, number] = [8 - toRank, fileToCol(toFile)];
    const promotion = best.length === 5 ? (best[4] === 'q' ? 'q' : best[4] === 'r' ? 'r' : best[4] === 'b' ? 'b' : 'n') : undefined;
    // Build a minimal Move object — engine will validate later
    // Try to match against legal moves and return the canonical Move object
    try {
      const all = legalMoves(board, state, side);
      const found = all.find((m) => m.from[0] === from[0] && m.from[1] === from[1] && m.to[0] === to[0] && m.to[1] === to[1] && ((m.promotion || '') === (promotion || '')));
      if (found) return found;
    } catch (e) {
      // ignore and fallback
    }
    return null;
  });
}
