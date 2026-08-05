import type { GameStage } from '../game/types';

export function formatClock(ms: number): string {
  const total = Math.max(0, Math.ceil(ms / 1000));
  const m = Math.floor(total / 60);
  const s = total % 60;
  if (m >= 1) return `${m}:${s.toString().padStart(2, '0')}`;
  if (ms <= 10_000) {
    const tenths = Math.floor((ms % 1000) / 100);
    return `${s}.${tenths}`;
  }
  return `0:${s.toString().padStart(2, '0')}`;
}

export function clamp(n: number, min: number, max: number): number {
  return Math.max(min, Math.min(max, n));
}

const STAGE_LABEL: Record<GameStage, string> = {
  opening: 'Opening',
  middlegame: 'Middlegame',
  endgame: 'Endgame',
};

export function formatStage(stage: GameStage): string {
  return STAGE_LABEL[stage];
}

export function timeAgo(ts: number): string {
  const diff = Date.now() - ts;
  const mins = Math.floor(diff / 60_000);
  if (mins < 1) return 'just now';
  if (mins < 60) return `${mins}m ago`;
  const hours = Math.floor(mins / 60);
  if (hours < 24) return `${hours}h ago`;
  const days = Math.floor(hours / 24);
  return `${days}d ago`;
}
