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
    if (cd === 'master') {
      // eslint-disable-next-line no-console
      console.log('[AI] delegating to Stockfish for master difficulty');
      try {
        const move = await chooseWithStockfish(board, state, side, 3000);
        if (move) return move;
        // eslint-disable-next-line no-console
        console.warn('[AI] Stockfish returned no move, falling back to JS worker');
      } catch (err) {
        // eslint-disable-next-line no-console
        console.error('[AI] Stockfish error, falling back to JS worker', err);
      }
    } else if (cd === 'advanced') {
      // Use Stockfish but limit strength for 'advanced'
      // Lower movetime and set ELO/limit strength to make it weaker than master
      // eslint-disable-next-line no-console
      console.log('[AI] delegating to Stockfish for advanced difficulty (limited)');
      try {
        const move = await chooseWithStockfish(board, state, side, 1600, { limitStrength: true, elo: 1600 });
        if (move) return move;
        // eslint-disable-next-line no-console
        console.warn('[AI] Stockfish (advanced) returned no move, falling back to JS worker');
      } catch (err) {
        // eslint-disable-next-line no-console
        console.error('[AI] Stockfish (advanced) error, falling back to JS worker', err);
      }
    } else if (cd === 'intermediate') {
      // Use Stockfish at low strength for intermediate to be stronger than JS but easier than advanced
      // eslint-disable-next-line no-console
      console.log('[AI] delegating to Stockfish for intermediate difficulty (low strength)');
      try {
        const move = await chooseWithStockfish(board, state, side, 800, { limitStrength: true, elo: 1200 });
        if (move) return move;
        // eslint-disable-next-line no-console
        console.warn('[AI] Stockfish (intermediate) returned no move, falling back to JS worker');
      } catch (err) {
        // eslint-disable-next-line no-console
        console.error('[AI] Stockfish (intermediate) error, falling back to JS worker', err);
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
