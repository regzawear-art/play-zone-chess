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
  const rank = 8-r;
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

// ---------------------------------------------------------------------------
// Stockfish UCI client
//
// Design notes (fixes for the "bot thinks forever" bug):
//  * The engine is created lazily and initialised once with a proper
//    `uci` -> `uciok` / `isready` -> `readyok` handshake. Searches never start
//    before the engine reports ready (the WASM binary is large and can take a
//    while to load on first use).
//  * Requests are serialized. A new request first sends `stop` to any running
//    search and waits for its `bestmove`, so a stale `bestmove` can never be
//    delivered to the wrong request.
//  * Every search uses `go movetime N` and has a hard watchdog: if no
//    `bestmove` arrives shortly after N ms we send `stop`, and if that still
//    doesn't help we resolve `null` so the caller can fall back to the JS AI.
//  * The `bestmove` handler only resolves the *active* request and never
//    blocks the UI thread (everything runs in the Worker, callbacks are async).
// ---------------------------------------------------------------------------

const DEFAULT_MOVETIME_MS = 1000;
const MIN_MOVETIME_MS = 50;
const MAX_MOVETIME_MS = 5000;
// Extra time (on top of movetime) we allow the engine to answer before we `stop` it.
const STOP_GRACE_MS = 800;
// Extra time after `stop` before we give up and resolve null.
const ABORT_GRACE_MS = 1500;
// Engine boot (WASM download + compile + NNUE load) can be slow on first use.
const INIT_TIMEOUT_MS = 30000;

let sfWorker: Worker | null = null;
let workerFailed = false;

type LineListener = (line: string) => void;
let lineListener: LineListener | null = null;

function createWorker(): Worker | null {
  if (sfWorker) return sfWorker;
  if (workerFailed) return null;
  try {
    // Prebuilt Stockfish (nmrugg/stockfish.js) served from /public/stockfish.
    // The URL hash tells it where to find the .wasm file.
    const w = new Worker(
      `/stockfish/stockfish.js#${encodeURIComponent('/stockfish/stockfish.wasm?v=2')}`,
    );
    w.addEventListener('message', (ev: MessageEvent) => {
      const d = ev.data;
      if (typeof d !== 'string') return;
      const line = d.trim();
      if (!line) return;
      // Always track bestmove, even after a request was aborted, so late
      // replies from cancelled searches are counted and discarded correctly.
      if (line.startsWith('bestmove')) handleBestmove(line);
      if (lineListener) lineListener(line);
    });
    w.addEventListener('error', (e) => {
      // eslint-disable-next-line no-console
      console.error('[stockfish] worker error', e);
      workerFailed = true;
      sfWorker = null;
      engineReady = null;
      failActive(new Error('stockfish worker crashed'));
    });
    sfWorker = w;
    return w;
  } catch (e) {
    // eslint-disable-next-line no-console
    console.warn('[stockfish] failed to create worker', e);
    workerFailed = true;
    return null;
  }
}

function send(cmd: string) {
  sfWorker?.postMessage(cmd);
}

// ---- Initialisation -------------------------------------------------------

let engineReady: Promise<boolean> | null = null;

function waitForLine(match: (line: string) => boolean, timeoutMs: number): Promise<boolean> {
  return new Promise((resolve) => {
    const prev = lineListener;
    const timer = setTimeout(() => {
      lineListener = prev;
      resolve(false);
    }, timeoutMs);
    lineListener = (line) => {
      if (prev) prev(line);
      if (match(line)) {
        clearTimeout(timer);
        lineListener = prev;
        resolve(true);
      }
    };
  });
}

function initEngine(): Promise<boolean> {
  if (engineReady) return engineReady;
  const w = createWorker();
  if (!w) return Promise.resolve(false);

  engineReady = (async () => {
    const gotUci = waitForLine((l) => l === 'uciok', INIT_TIMEOUT_MS);
    send('uci');
    if (!(await gotUci)) return false;

    send('setoption name Hash value 64');
    // Threads > 1 requires SharedArrayBuffer (COOP/COEP); the default build is single-threaded.
    const gotReady = waitForLine((l) => l === 'readyok', INIT_TIMEOUT_MS);
    send('isready');
    return gotReady;
  })().then((ok) => {
    if (!ok) {
      // Allow a later retry instead of caching a permanent failure.
      engineReady = null;
    }
    return ok;
  });
  return engineReady;
}

// ---- Search request handling ---------------------------------------------

interface ActiveSearch {
  resolve: (best: string | null) => void;
  stopTimer: ReturnType<typeof setTimeout>;
  abortTimer: ReturnType<typeof setTimeout>;
  done: boolean;
}

let active: ActiveSearch | null = null;
// Number of `go` commands sent whose `bestmove` hasn't been seen yet.
// Used to discard stale `bestmove` lines from cancelled searches.
let outstandingSearches = 0;
// Serializes requests so only one search runs at a time.
let queue: Promise<unknown> = Promise.resolve();

function finishActive(best: string | null) {
  const a = active;
  if (!a || a.done) return;
  a.done = true;
  clearTimeout(a.stopTimer);
  clearTimeout(a.abortTimer);
  active = null;
  a.resolve(best);
}

function failActive(_err: Error) {
  outstandingSearches = 0;
  finishActive(null);
}

function handleBestmove(line: string) {
  // "bestmove e2e4 ponder e7e5"  |  "bestmove (none)"
  if (outstandingSearches > 0) outstandingSearches--;
  // Only the newest search may resolve the active request; any older
  // bestmove (from a cancelled search) is dropped.
  if (outstandingSearches > 0) return;
  const parts = line.split(/\s+/);
  const best = parts[1];
  finishActive(best && best !== '(none)' && best !== '0000' ? best : null);
}

function runSearch(fen: string, movetime: number, options: string[]): Promise<string | null> {
  return new Promise<string | null>((resolve) => {
    const a: ActiveSearch = {
      resolve,
      // Engine didn't answer in time -> ask it to stop and report its best move so far.
      stopTimer: setTimeout(() => {
        // eslint-disable-next-line no-console
        console.warn('[stockfish] movetime exceeded, sending stop');
        send('stop');
      }, movetime + STOP_GRACE_MS),
      // Still nothing -> give up so the UI is never blocked; caller falls back.
      abortTimer: setTimeout(() => {
        // eslint-disable-next-line no-console
        console.warn('[stockfish] no bestmove after stop, aborting search');
        // Keep outstandingSearches as-is: a late bestmove will still be discarded correctly.
        finishActive(null);
      }, movetime + STOP_GRACE_MS + ABORT_GRACE_MS),
      done: false,
    };
    active = a;

    for (const o of options) send(o);
    send('position fen ' + fen);
    outstandingSearches++;
    send('go movetime ' + movetime);
  });
}

/** Cancel a running search (if any) and wait until the engine is idle again. */
async function ensureIdle(): Promise<void> {
  if (outstandingSearches === 0) return;
  send('stop');
  const start = Date.now();
  // Wait (bounded) for the pending bestmove of the cancelled search.
  while (outstandingSearches > 0 && Date.now() - start < 1500) {
    await new Promise((r) => setTimeout(r, 25));
  }
  if (outstandingSearches > 0) {
    // Engine never confirmed; assume it is idle so we don't deadlock the queue.
    outstandingSearches = 0;
  }
}

function buildOptions(opts?: { limitStrength?: boolean; elo?: number; skillLevel?: number }): string[] {
  const cmds: string[] = [];
  if (opts?.limitStrength) {
    cmds.push('setoption name UCI_LimitStrength value true');
    if (typeof opts.elo === 'number') {
      // Stockfish clamps UCI_Elo to its supported range (1320..3190 in SF 17/18).
      cmds.push('setoption name UCI_Elo value ' + Math.max(1320, Math.min(3190, Math.floor(opts.elo))));
    }
  } else {
    cmds.push('setoption name UCI_LimitStrength value false');
  }
  // Always (re)set Skill Level so a previous difficulty never leaks into the next request.
  const skill = typeof opts?.skillLevel === 'number' ? Math.max(0, Math.min(20, Math.floor(opts.skillLevel))) : 20;
  cmds.push('setoption name Skill Level value ' + skill);
  return cmds;
}

function uciToMove(best: string, board: Board, state: GameState, side: Color): Move | null {
  if (!/^[a-h][1-8][a-h][1-8][qrbn]?$/.test(best)) return null;
  const fileToCol = (f: string) => 'abcdefgh'.indexOf(f);
  const from: [number, number] = [8 - parseInt(best[1], 10), fileToCol(best[0])];
  const to: [number, number] = [8 - parseInt(best[3], 10), fileToCol(best[2])];
  const promotion = best.length === 5 ? best[4] : undefined;
  try {
    const all = legalMoves(board, state, side);
    return (
      all.find(
        (m) =>
          m.from[0] === from[0] &&
          m.from[1] === from[1] &&
          m.to[0] === to[0] &&
          m.to[1] === to[1] &&
          (m.promotion || '') === (promotion || ''),
      ) ?? null
    );
  } catch {
    return null;
  }
}

/**
 * Ask Stockfish for a move. Resolves with a legal Move, or `null` if the engine is
 * unavailable / timed out (callers should then fall back to the built-in JS AI).
 * Never rejects and never waits longer than roughly movetime + ~2.3s (after init).
 */
export async function chooseWithStockfish(
  board: Board,
  state: GameState,
  side: Color,
  movetime = DEFAULT_MOVETIME_MS,
  opts?: { limitStrength?: boolean; elo?: number; skillLevel?: number },
): Promise<Move | null> {
  const mt = Math.min(MAX_MOVETIME_MS, Math.max(MIN_MOVETIME_MS, Math.floor(movetime) || DEFAULT_MOVETIME_MS));
  const fen = boardToFEN(board, state);

  const job = queue.then(async (): Promise<Move | null> => {
    try {
      if (!(await initEngine())) return null;
      await ensureIdle();
      const best = await runSearch(fen, mt, buildOptions(opts));
      return best ? uciToMove(best, board, state, side) : null;
    } catch (e) {
      // eslint-disable-next-line no-console
      console.error('[stockfish] search failed', e);
      return null;
    }
  });
  // Keep the queue alive regardless of individual failures.
  queue = job.catch(() => null);
  return job;
}

/** Abort any in-flight search (e.g. game reset / new game). Safe to call anytime. */
export function cancelStockfishSearch(): void {
  if (outstandingSearches > 0) send('stop');
}
