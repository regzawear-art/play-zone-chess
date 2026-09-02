import { useState } from 'react';
import type { Color, GameStatus, GameStage, TimeControl } from '../game/types';
import { formatClock, formatStage } from '../lib/format';
import { sound } from '../game/sound';
import { Play, RotateCcw, Flag, ChevronDown, Zap, Clock, Timer, Sliders, Layers, FlipHorizontal } from 'lucide-react';

const TC_META: Record<TimeControl, { label: string; sub: string; icon: typeof Zap }> = {
  '1min': { label: '1 Min', sub: '1 + 0', icon: Zap },
  '3min': { label: '3 Min', sub: '3 + 2', icon: Clock },
  '5min': { label: '5 Min', sub: '5 + 3', icon: Clock },
  '10min': { label: '10 Min', sub: '10 + 5', icon: Timer },
  '30min': { label: '30 Min', sub: '30 + 10', icon: Timer },
  custom: { label: 'Custom', sub: 'Set your own', icon: Sliders },
};

const STAGE_STYLE: Record<GameStage, { cls: string; icon: typeof Layers }> = {
  opening: { cls: 'bg-royal-500/15 text-royal-400 ring-royal-500/25', icon: Layers },
  middlegame: { cls: 'bg-amber-500/15 text-amber-400 ring-amber-500/25', icon: Layers },
  endgame: { cls: 'bg-emerald-500/15 text-emerald-400 ring-emerald-500/25', icon: Layers },
};

interface Props {
  status: GameStatus;
  whiteMs: number;
  blackMs: number;
  running: boolean;
  started: boolean;
  thinking: boolean;
  turn: Color;
  playerColor: Color;
  timeControl: TimeControl;
  customMinutes: number;
  history: { san: string }[];
  stageLabel: GameStage | 'Not started' | 'Game over';
  onStart: () => void;
  onResign: () => void;
  onUndo: () => void;
  onChangeTimeControl: (tc: TimeControl) => void;
  onChangeCustomMinutes: (m: number) => void;
  onFlip: () => void;
  onChangeColor: (c: Color) => void;
}

export function GamePanel(props: Props) {
  const {
    status,
    whiteMs,
    blackMs,
    running,
    started,
    thinking,
    turn,
    playerColor,
    timeControl,
    customMinutes,
    history,
    stageLabel,
    onStart,
    onResign,
    onUndo,
    onChangeTimeControl,
    onChangeCustomMinutes,
    onChangeColor,
    onFlip,
  } = props;

  const [tcOpen, setTcOpen] = useState(false);

  const statusText = () => {
    if (status.phase === 'checkmate') {
      const w = status.winner === 'w' ? 'White' : 'Black';
      return `Checkmate — ${w} wins`;
    }
    if (status.phase === 'stalemate') return 'Stalemate — Draw';
    if (status.phase === 'check') return 'Check!';
    if (!started) return 'Ready to play';
    if (thinking) return 'Opponent thinking…';
    return turn === 'w' ? "White's turn" : "Black's turn";
  };

  const statusColor = () => {
    if (status.phase === 'checkmate') return 'text-emerald-400';
    if (status.phase === 'stalemate') return 'text-navy-200';
    if (status.phase === 'check') return 'text-red-400';
    return 'text-white';
  };

  const stageIsLive = stageLabel !== 'Not started' && stageLabel !== 'Game over';
  const stageInfo = stageIsLive ? STAGE_STYLE[stageLabel as GameStage] : null;

  return (
    <div className="flex w-full flex-col gap-4">
      <div className="rounded-2xl glass-dark p-4 shadow-card sm:p-5">
        <div className="flex items-center justify-between gap-3">
          <div className="min-w-0">
            <p className="text-xs font-semibold uppercase tracking-wide text-navy-400">Game status</p>
            <p className={`truncate font-display text-lg font-bold sm:text-xl ${statusColor()}`}>
              {statusText()}
            </p>
          </div>
          <div className="flex flex-col items-end gap-1.5">
            <StatusBadge phase={status.phase} />
            {stageIsLive && stageInfo && (
              <span className={`chip ring-1 ${stageInfo.cls}`}>
                <stageInfo.icon size={11} />
                {formatStage(stageLabel as GameStage)}
              </span>
            )}
          </div>
        </div>
      </div>

      <div className="grid grid-cols-2 gap-3">
        <ClockCard label="White" ms={whiteMs} active={running && turn === 'w'} dim={turn !== 'w' || !running} maxMs={Math.max(whiteMs, 1)} />
        <ClockCard label="Black" ms={blackMs} active={running && turn === 'b'} dim={turn !== 'b' || !running} maxMs={Math.max(blackMs, 1)} />
      </div>

      <div className="flex flex-wrap items-center gap-2">
        <div className="relative">
          <button
            onClick={() => { sound.unlock(); setTcOpen((o) => !o); }}
            className="flex items-center gap-2 rounded-full border border-royal-500/25 bg-navy-700 px-3 py-2 text-xs font-semibold text-white transition-all hover:border-royal-500/50 hover:shadow-glow-sm"
          >
            {(() => { const Icon = TC_META[timeControl].icon; return <Icon size={14} className="text-royal-400" />; })()}
            {TC_META[timeControl].label}
            <ChevronDown size={14} className={`transition-transform ${tcOpen ? 'rotate-180' : ''}`} />
          </button>
          {tcOpen && (
            <div className="absolute left-0 top-11 z-20 w-44 overflow-hidden rounded-2xl border border-royal-500/20 bg-white/95 p-1.5 shadow-card-lg backdrop-blur-xl animate-pop-in">
              {(Object.keys(TC_META) as TimeControl[]).map((tc) => {
                const m = TC_META[tc];
                const Icon = m.icon;
                return (
                  <button
                    key={tc}
                    onClick={() => { onChangeTimeControl(tc); setTcOpen(false); }}
                    className={`flex w-full items-center justify-between rounded-xl px-3 py-2 text-left text-xs font-semibold transition-colors ${
                      timeControl === tc ? 'bg-blue-grad text-white' : 'text-navy-700 hover:bg-royal-50'
                    }`}
                  >
                    <span className="flex items-center gap-2"><Icon size={14} />{m.label}</span>
                    <span className={timeControl === tc ? 'text-royal-100' : 'text-navy-400'}>{m.sub}</span>
                  </button>
                );
              })}
              {timeControl === 'custom' && (
                <div className="mt-1.5 rounded-xl bg-royal-50 p-2.5">
                  <label className="mb-1 block text-[10px] font-bold uppercase tracking-wide text-navy-500">Minutes per side</label>
                  <div className="flex items-center gap-2">
                    <input
                      type="range" min={1} max={60} step={1} value={customMinutes}
                      onChange={(e) => onChangeCustomMinutes(parseInt(e.target.value, 10))}
                      className="slider-blue flex-1"
                    />
                    <span className="w-12 text-right text-sm font-bold text-royal-600">{customMinutes}m</span>
                  </div>
                </div>
              )}
            </div>
          )}
        </div>

        <div className="flex items-center gap-1 rounded-full border border-royal-500/25 bg-navy-700 p-1">
          {(['w', 'b'] as Color[]).map((c) => (
            <button
              key={c}
              onClick={() => onChangeColor(c)}
              className={`flex items-center gap-1.5 rounded-full px-3 py-1.5 text-xs font-semibold transition-all ${
                playerColor === c ? 'bg-blue-grad text-white shadow-glow-sm' : 'text-navy-200 hover:bg-navy-600'
              }`}
            >
              <span className={`h-3 w-3 rounded-full border ${c === 'w' ? 'border-navy-400 bg-white' : 'border-navy-600 bg-navy-900'}`} />
              {c === 'w' ? 'White' : 'Black'}
            </button>
          ))}
        </div>
      </div>

      <div className="flex flex-wrap gap-2">
        {!running && status.phase !== 'checkmate' && status.phase !== 'stalemate' ? (
          <button onClick={onStart} className="btn-primary flex-1">
            <Play size={18} />
            {started ? 'New Game' : 'Start Game'}
          </button>
        ) : (
          <button onClick={onStart} className="btn-ghost flex-1">
            <RotateCcw size={16} />
            New Game
          </button>
        )}
        <button onClick={onFlip} className="btn-ghost" title="Flip board">
          <FlipHorizontal size={16} />
          Flip
        </button>
        <button onClick={onUndo} disabled={history.length === 0} className="btn-ghost disabled:cursor-not-allowed disabled:opacity-40">
          <RotateCcw size={16} />
          Undo
        </button>
        <button onClick={onResign} disabled={!started || status.phase === 'checkmate'} className="btn-ghost disabled:cursor-not-allowed disabled:opacity-40">
          <Flag size={16} />
          Resign
        </button>
      </div>

      <div className="rounded-2xl glass-dark p-4 shadow-card">
        <div className="mb-2 flex items-center justify-between">
          <p className="text-xs font-semibold uppercase tracking-wide text-navy-400">Moves</p>
          <span className="text-xs font-bold text-royal-400">{history.length}</span>
        </div>
        <div className="no-scrollbar max-h-44 overflow-y-auto pr-1">
          {history.length === 0 ? (
            <p className="py-4 text-center text-sm text-navy-400">No moves yet — press Start Game.</p>
          ) : (
            <ol className="grid grid-cols-[auto_1fr_1fr] gap-x-3 gap-y-1 text-sm">
              {Array.from({ length: Math.ceil(history.length / 2) }).map((_, i) => {
                const w = history[i * 2];
                const b = history[i * 2 + 1];
                return (
                  <li key={i} className="contents">
                    <span className="font-semibold text-navy-500">{i + 1}.</span>
                    <span className="font-mono font-medium text-white">{w?.san ?? ''}</span>
                    <span className="font-mono font-medium text-white">{b?.san ?? ''}</span>
                  </li>
                );
              })}
            </ol>
          )}
        </div>
      </div>

      <style>{`
        .slider-green { -webkit-appearance: none; appearance: none; height: 6px; border-radius: 999px; background: linear-gradient(90deg, #81B64C, #6ba238); outline: none; }
        .slider-green::-webkit-slider-thumb { -webkit-appearance: none; appearance: none; width: 16px; height: 16px; border-radius: 50%; background: #fff; border: 2px solid #81B64C; box-shadow: 0 2px 6px rgba(129,182,76,0.4); cursor: pointer; }
        .slider-green::-moz-range-thumb { width: 16px; height: 16px; border-radius: 50%; background: #fff; border: 2px solid #81B64C; box-shadow: 0 2px 6px rgba(129,182,76,0.4); cursor: pointer; }
      `}</style>
    </div>
  );
}

function ClockCard({ label, ms, active, dim, maxMs }: { label: string; ms: number; active: boolean; dim: boolean; maxMs: number }) {
  const low = ms <= 10_000;
  return (
    <div className={`relative overflow-hidden rounded-2xl p-4 text-center shadow-card transition-all duration-300 ${active ? 'bg-blue-grad text-white shadow-glow' : 'glass-dark text-white'} ${dim ? 'opacity-70' : ''}`}>
      <div className="flex items-center justify-center gap-2">
        <span className={`h-2.5 w-2.5 rounded-full ${label === 'White' ? 'bg-white ring-1 ring-navy-400' : 'bg-navy-900'}`} />
        <span className={`text-xs font-semibold uppercase tracking-wide ${active ? 'text-royal-100' : 'text-navy-400'}`}>{label}</span>
      </div>
      <p className={`mt-1 font-display text-2xl font-extrabold tabular-nums sm:text-3xl ${low && active ? 'animate-pulse text-red-300' : ''}`}>
        {formatClock(ms)}
      </p>
      {active && (
        <span className="absolute bottom-0 left-0 h-1 bg-white/40 transition-all" style={{ width: `${Math.min(100, (ms / Math.max(maxMs, 1)) * 100)}%` }} />
      )}
    </div>
  );
}

function StatusBadge({ phase }: { phase: GameStatus['phase'] }) {
  const map: Record<GameStatus['phase'], { label: string; cls: string }> = {
    playing: { label: 'Playing', cls: 'bg-emerald-500/15 text-emerald-400 ring-emerald-500/25' },
    check: { label: 'Check', cls: 'bg-red-500/15 text-red-400 ring-red-500/25 animate-pulse' },
    checkmate: { label: 'Checkmate', cls: 'bg-blue-grad text-white ring-royal-400' },
    stalemate: { label: 'Stalemate', cls: 'bg-navy-600 text-navy-200 ring-navy-500' },
    draw: { label: 'Draw', cls: 'bg-navy-600 text-navy-200 ring-navy-500' },
  };
  return <span className={`chip shrink-0 ring-1 ${map[phase].cls}`}>{map[phase].label}</span>;
}
