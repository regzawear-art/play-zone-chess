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
      // eslint-disable-next-line no-console
      console.log('[AI] delegating to Stockfish for intermediate difficulty (limited, ~depth8)');
      try {
        const move = await chooseWithStockfish(board, state, side, 1200, { limitStrength: true, elo: 1600 });
        if (move) return move;
        // eslint-disable-next-line no-console
        console.warn('[AI] Stockfish (intermediate) returned no move, falling back to JS worker');
      } catch (err) {
        // eslint-disable-next-line no-console
        console.error('[AI] Stockfish (intermediate) error, falling back to JS worker', err);
      }
    }
    // advanced -> use limited-strength Stockfish ~ depth 12
    if (cd === 'advanced') {
      // eslint-disable-next-line no-console
      console.log('[AI] delegating to Stockfish for advanced difficulty (limited, ~depth12)');
      try {
        const move = await chooseWithStockfish(board, state, side, 3000, { limitStrength: true, elo: 2000 });
        if (move) return move;
        // eslint-disable-next-line no-console
        console.warn('[AI] Stockfish (advanced) returned no move, falling back to JS worker');
      } catch (err) {
        // eslint-disable-next-line no-console
        console.error('[AI] Stockfish (advanced) error, falling back to JS worker', err);
      }
    }
    // master -> use stronger Stockfish ~ depth 20
    if (cd === 'master') {
      // eslint-disable-next-line no-console
      console.log('[AI] delegating to Stockfish for master difficulty (limited, ~depth20)');
      try {
        const move = await chooseWithStockfish(board, state, side, 8000, { limitStrength: true, elo: 2400 });
        if (move) return move;
        // eslint-disable-next-line no-console
        console.warn('[AI] Stockfish (master) returned no move, falling back to JS worker');
      } catch (err) {
        // eslint-disable-next-line no-console
        console.error('[AI] Stockfish (master) error, falling back to JS worker', err);
      }
    }
    // max -> use full-power Stockfish (no strength limit)
    if (cd === 'max') {
      // eslint-disable-next-line no-console
      console.log('[AI] delegating to Stockfish for max difficulty (full strength)');
      try {
        const move = await chooseWithStockfish(board, state, side, 20000);
        if (move) return move;
        // eslint-disable-next-line no-console
        console.warn('[AI] Stockfish (max) returned no move, falling back to JS worker');
      } catch (err) {
        // eslint-disable-next-line no-console
        console.error('[AI] Stockfish (max) error, falling back to JS worker', err);
      }
    }
  } catch (e) {
    // ignore and fall back to worker AI
  }

  const id = reqId++;
  return new Promise((resolve, reject) => {
    pending[id] = { resolve, reject };
    worker.postMessage({ type: 'choose', id, board, state, side });
    // Add a timeout fallback in case worker fails to respond
    setTimeout(() => {
      if (pending[id]) { pending[id].resolve(null); delete pending[id]; }
    }, 10000);
  });
}
