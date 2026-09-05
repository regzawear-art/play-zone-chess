import { setAIDifficultyCore, chooseMoveCore, getSearchStats } from './ai-core';

type Request =
  | { type: 'setDifficulty'; difficulty: string }
  | { type: 'choose'; id: number; board: any; state: any; side: 'w' | 'b' };

addEventListener('message', async (ev: MessageEvent<Request>) => {
  const msg = ev.data;
  if (msg.type === 'setDifficulty') {
    // @ts-ignore
    setAIDifficultyCore(msg.difficulty);
    postMessage({ type: 'debug', info: `difficulty set to ${msg.difficulty}` });
    return;
  }
  if (msg.type === 'choose') {
    try {
      postMessage({ type: 'debug', id: msg.id, info: 'choose:start' });
      const move = chooseMoveCore(msg.board, msg.state, msg.side);
      const stats = getSearchStats();
      // Post back the move with the same id and stats
      postMessage({ type: 'result', id: msg.id, move, stats });
      postMessage({ type: 'debug', id: msg.id, info: 'choose:done', stats });
    } catch (err) {
      postMessage({ type: 'error', id: msg.id, error: String(err) });
    }
  }
});
