import { useState } from 'react';
import type { Color, GameStatus, GameStage, TimeControl } from '../game/types';
import { formatStage } from '../lib/format';
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
    status, running, started, thinking, turn, playerColor,
    timeControl, customMinutes, history, stageLabel,
    onStart, onResign, onUndo, onChangeTimeControl, onChangeCustomMinutes,
    onChangeColor, onFlip,
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
    <div className="flex w-full flex-col gap-2.5">
      {/* Status + stage compact row */}
      <div className="rounded-xl border border-white/8 bg-navy-750 p-3">
        <div className="flex items-center justify-between gap-2">
          <p className={`truncate text-sm font-bold ${statusColor()}`}>{statusText()}</p>
          <div className="flex shrink-0 items-center gap-1.5">
            <StatusBadge phase={status.phase} />
            {stageIsLive && stageInfo && (
              <span className={`chip ring-1 ${stageInfo.cls}`}>
                <stageInfo.icon size={10} />
                {formatStage(stageLabel as GameStage)}
              </span>
            )}
          </div>
        </div>
      </div>

      {/* Time control + color selector compact row */}
      <div className="flex flex-wrap items-center gap-2">
        <div className="relative">
          <button
            onClick={() => { sound.unlock(); setTcOpen((o) => !o); }}
            className="flex items-center gap-1.5 rounded-lg border border-white/10 bg-navy-700 px-2.5 py-1.5 text-xs font-semibold text-white transition-all hover:border-white/20"
          >
            {(() => { const Icon = TC_META[timeControl].icon; return <Icon size={13} className="text-royal-400" />; })()}
            {TC_META[timeControl].label}
            <ChevronDown size={12} className={`transition-transform ${tcOpen ? 'rotate-180' : ''}`} />
          </button>
          {tcOpen && (
            <div className="absolute left-0 top-9 z-20 w-44 overflow-hidden rounded-xl border border-white/10 bg-navy-700 p-1.5 shadow-card-lg animate-pop-in">
              {(Object.keys(TC_META) as TimeControl[]).map((tc) => {
                const m = TC_META[tc];
                const Icon = m.icon;
                return (
                  <button
                    key={tc}
                    onClick={() => { onChangeTimeControl(tc); setTcOpen(false); }}
                    className={`flex w-full items-center justify-between rounded-lg px-2.5 py-1.5 text-left text-xs font-semibold transition-colors ${
                      timeControl === tc ? 'bg-blue-grad text-white' : 'text-navy-200 hover:bg-navy-600'
                    }`}
                  >
                    <span className="flex items-center gap-1.5"><Icon size={13} />{m.label}</span>
                    <span className={timeControl === tc ? 'text-royal-100' : 'text-navy-400'}>{m.sub}</span>
                  </button>
                );
              })}
              {timeControl === 'custom' && (
                <div className="mt-1.5 rounded-lg bg-navy-600 p-2">
                  <label className="mb-1 block text-[10px] font-bold uppercase tracking-wide text-navy-400">Minutes per side</label>
                  <div className="flex items-center gap-2">
                    <input
                      type="range" min={1} max={60} step={1} value={customMinutes}
                      onChange={(e) => onChangeCustomMinutes(parseInt(e.target.value, 10))}
                      className="slider-blue flex-1"
                    />
                    <span className="w-10 text-right text-sm font-bold text-royal-400">{customMinutes}m</span>
                  </div>
                </div>
              )}
            </div>
          )}
        </div>

        <div className="flex items-center gap-1 rounded-lg border border-white/10 bg-navy-700 p-0.5">
          {(['w', 'b'] as Color[]).map((c) => (
            <button
              key={c}
              onClick={() => onChangeColor(c)}
              className={`flex items-center gap-1 rounded-md px-2 py-1 text-xs font-semibold transition-all ${
                playerColor === c ? 'bg-blue-grad text-white shadow-glow-sm' : 'text-navy-300 hover:bg-navy-600 hover:text-white'
              }`}
            >
              <span className={`h-2.5 w-2.5 rounded-full border ${c === 'w' ? 'border-navy-400 bg-white' : 'border-navy-600 bg-navy-900'}`} />
              {c === 'w' ? 'W' : 'B'}
            </button>
          ))}
        </div>
      </div>

      {/* Action buttons */}
      <div className="flex flex-wrap gap-1.5">
        {!running && status.phase !== 'checkmate' && status.phase !== 'stalemate' ? (
          <button onClick={onStart} className="btn-primary flex-1 text-sm">
            <Play size={16} />
            {started ? 'New' : 'Start'}
          </button>
        ) : (
          <button onClick={onStart} className="btn-ghost flex-1 text-sm">
            <RotateCcw size={14} />
            New
          </button>
        )}
        <button onClick={onFlip} className="btn-ghost text-sm" title="Flip board">
          <FlipHorizontal size={14} />
        </button>
        <button onClick={onUndo} disabled={history.length === 0} className="btn-ghost text-sm disabled:cursor-not-allowed disabled:opacity-40" title="Undo">
          <RotateCcw size={14} />
        </button>
        <button onClick={onResign} disabled={!started || status.phase === 'checkmate'} className="btn-ghost text-sm disabled:cursor-not-allowed disabled:opacity-40" title="Resign">
          <Flag size={14} />
        </button>
      </div>

      {/* Move list — compact, scrollable */}
      <div className="rounded-xl border border-white/8 bg-navy-750 p-3">
        <div className="mb-1.5 flex items-center justify-between">
          <p className="text-[10px] font-bold uppercase tracking-wide text-navy-400">Moves</p>
          <span className="text-[10px] font-bold text-royal-400">{history.length}</span>
        </div>
        <div className="no-scrollbar max-h-24 overflow-y-auto pr-1">
          {history.length === 0 ? (
            <p className="py-2 text-center text-xs text-navy-500">No moves yet — press Start.</p>
          ) : (
            <ol className="grid grid-cols-[auto_1fr_1fr] gap-x-2 gap-y-0.5 text-xs">
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
