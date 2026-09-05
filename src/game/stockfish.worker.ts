// Stockfish worker: prefer local bundled build (public/stockfish/stockfish.js),
// fall back to dynamic import of the installed 'stockfish' package.
// Listens for messages: { type: 'go', id, fen, movetime }
// Posts back: { type: 'ready', hasEngine }, { type: 'result', id, bestmove }, { type: 'info', info }, { type: 'error', id, error }

let currentRequestId: number | null = null;

// Try to load a locally hosted build first (place stockfish.js in public/stockfish/)
let engine: any = null;
try {
  // eslint-disable-next-line @typescript-eslint/ban-ts-comment
  // @ts-ignore
  importScripts('/stockfish/stockfish.js');
} catch (e) {
  // ignore — local file may not exist
}

// Check common global names set by UMD builds
try {
  if (typeof (self as any).Stockfish === 'function') {
    engine = (self as any).Stockfish();
  } else if (typeof (self as any).stockfish === 'function') {
    engine = (self as any).stockfish();
  } else if ((self as any).Module) {
    // Module may be an object or a factory function; attempt several ways
    try {
      if (typeof (self as any).Module === 'function') {
        engine = (self as any).Module();
      }
    } catch (e) {
      // ignore
    }
    if (!engine && typeof (self as any).Module.Stockfish === 'function') {
      engine = (self as any).Module.Stockfish();
    }
    // If Module exposes a 'ready' promise, wait a short time then try to pick up globals
    if (!engine && (self as any).Module && typeof (self as any).Module.ready === 'object' && typeof (self as any).Module.ready.then === 'function') {
      (self as any).Module.ready.then(() => {
        if (!engine) {
          if (typeof (self as any).Stockfish === 'function') engine = (self as any).Stockfish();
          else if (typeof (self as any).stockfish === 'function') engine = (self as any).stockfish();
          postMessage({ type: 'info', info: 'Module.ready fired, engine=' + !!engine });
        }
      }).catch((err: any) => postMessage({ type: 'info', info: 'Module.ready rejected: ' + String(err) }));
    }
  }
} catch (err) {
  postMessage({ type: 'info', info: 'engine detect error: ' + String(err) });
}

postMessage({ type: 'info', info: 'engine constructed=' + !!engine });

postMessage({ type: 'ready', hasEngine: !!engine });

if (engine) {
  engine.onmessage = function (e: any) {
    const line = e.data || e;
    if (typeof line === 'string' && line.startsWith('bestmove')) {
      const parts = line.split(' ');
      const best = parts[1];
      if (currentRequestId !== null) {
        postMessage({ type: 'result', id: currentRequestId, bestmove: best });
        currentRequestId = null;
      }
    } else {
      postMessage({ type: 'info', info: line });
    }
  };
}

addEventListener('message', (ev: MessageEvent<any>) => {
  const msg = ev.data;
  if (!msg) return;
  if (msg.type === 'go') {
    currentRequestId = msg.id;
    try {
      if (!engine) {
        postMessage({ type: 'error', id: msg.id, error: 'engine not available' });
        currentRequestId = null;
        return;
      }
      engine.postMessage('position fen ' + msg.fen);
      engine.postMessage('go movetime ' + Math.max(10, Math.floor(msg.movetime)));
    } catch (err) {
      postMessage({ type: 'error', id: msg.id, error: String(err) });
      currentRequestId = null;
    }
  }
});
