import type { Board, Color, GameState, Move, AIDifficulty } from './types';
import { chooseWithStockfish } from './stockfish';

// Worker-based AI wrapper. Sends compute requests to the worker and returns a Promise.
const worker = new Worker(new URL('./ai.worker.ts', import.meta.url), { type: 'module' });

let reqId = 1;
const pending: Record<number, { resolve: (m: Move | null) => void; reject: (e: any) => void }> = {};

worker.addEventListener('message', (ev: MessageEvent<any>) => {
  const data = ev.data;
  if (!data) return;
  if (data.type === 'debug') {
    // eslint-disable-next-line no-console
    console.log('[AI worker debug]', data);
    return;
  }
  if (data.type === 'result') {
    const id = data.id as number;
    const p = pending[id];
    if (p) { p.resolve(data.move ?? null); delete pending[id]; }
  } else if (data.type === 'error') {
    const id = data.id as number;
    const p = pending[id];
    if (p) { p.reject(new Error(data.error)); delete pending[id]; }
  }
});

export function setAIDifficulty(d: AIDifficulty) {
  worker.postMessage({ type: 'setDifficulty', difficulty: d });
  // locally remember difficulty so we can delegate to Stockfish for master
  (chooseMove as any).currentDifficulty = d; // noop: reformat
}

export async function chooseMove(board: Board, state: GameState, side: Color): Promise<Move | null> {
  // If user requested Stockfish (master), prefer it but fallback to worker AI on error/null
  try {
    const cd = (chooseMove as any).currentDifficulty as AIDifficulty | undefined;
    // Delegate to Stockfish for stronger levels as requested.
    // intermediate -> use limited-strength Stockfish ~ depth 8
    if (cd === 'intermediate') {
      try {
        const move = await chooseWithStockfish(board, state, side, 600, { limitStrength: true, elo: 1500 });
        if (move) return move;
      } catch {
        // fall back to JS worker
      }
    }
    if (cd === 'advanced') {
      try {
        const move = await chooseWithStockfish(board, state, side, 700, { limitStrength: true, elo: 1900 });
        if (move) return move;
      } catch {
        // fall back to JS worker
      }
    }
    if (cd === 'master') {
      try {
        const move = await chooseWithStockfish(board, state, side, 900, { limitStrength: true, elo: 2200 });
        if (move) return move;
      } catch {
        // fall back to JS worker
      }
    }
    if (cd === 'max') {
      try {
        const move = await chooseWithStockfish(board, state, side, 900);
        if (move) return move;
      } catch {
        // fall back to JS worker
      }
    }
  } catch (e) {
    // ignore and fall back to worker AI
  }

  const id = reqId++;
  return new Promise((resolve, reject) => {
    pending[id] = { resolve, reject };
    worker.postMessage({ type: 'choose', id, board, state, side });
    setTimeout(() => {
      if (pending[id]) { pending[id].resolve(null); delete pending[id]; }
    }, 3000);
  });
}
