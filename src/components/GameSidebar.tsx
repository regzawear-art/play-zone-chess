import { useState } from 'react';
import type { Color, GameStatus, GameStage, TimeControl, AIDifficulty, HistoryEntry } from '../game/types';
import { formatClock, formatStage } from '../lib/format';
import { sound } from '../game/sound';
import {
  Play, RotateCcw, Flag, ChevronDown, Zap, Clock, Timer, Sliders,
  Layers, FlipHorizontal, MessageSquare, ListOrdered, Gamepad2,
  ChevronFirst, ChevronLast, ChevronLeft, ChevronRight, Handshake, Swords,
} from 'lucide-react';

export interface SidebarProps {
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
  customIncrement: number;
  history: HistoryEntry[];
  stageLabel: GameStage | 'Not started' | 'Game over';
  currentOpening: string;
  aiDifficulty: AIDifficulty;
  onStart: () => void;
  onResign: () => void;
  onDraw: () => void;
  onUndo: () => void;
  onJumpFirst: () => void;
  onJumpPrev: () => void;
  onJumpNext: () => void;
  onJumpLast: () => void;
  onChangeTimeControl: (tc: TimeControl) => void;
  onChangeCustomMinutes: (m: number) => void;
  onChangeCustomIncrement: (s: number) => void;
  onFlip: () => void;
  onChangeColor: (c: Color) => void;
  onChangeDifficulty: (d: AIDifficulty) => void;
  chatPanel?: React.ReactNode;
}

type Tab = 'play' | 'newgame' | 'moves' | 'chat';

const AI_LEVELS: { value: AIDifficulty; label: string; elo: string }[] = [
  { value: 'beginner', label: 'Beginner', elo: '~600' },
  { value: 'intermediate', label: 'Intermediate', elo: '~1200' },
  { value: 'advanced', label: 'Advanced', elo: '~1800' },
  { value: 'master', label: 'Master', elo: '~2400' },
];

const TC_PRESETS: { value: TimeControl; label: string; sub: string; icon: typeof Zap }[] = [
  { value: '1min', label: '1 min', sub: '1 + 0', icon: Zap },
  { value: '3min', label: '3 min', sub: '3 + 2', icon: Clock },
  { value: '5min', label: '5 min', sub: '5 + 3', icon: Clock },
  { value: '10min', label: '10 min', sub: '10 + 5', icon: Timer },
  { value: '30min', label: '30 min', sub: '30 + 10', icon: Timer },
  { value: 'custom', label: 'Custom', sub: 'Set your own', icon: Sliders },
];

const STAGE_STYLE: Record<GameStage, { cls: string }> = {
  opening: { cls: 'bg-royal-500/15 text-royal-400 ring-royal-500/25' },
  middlegame: { cls: 'bg-amber-500/15 text-amber-400 ring-amber-500/25' },
  endgame: { cls: 'bg-emerald-500/15 text-emerald-400 ring-emerald-500/25' },
};

export function GameSidebar(props: SidebarProps) {
  const [tab, setTab] = useState<Tab>('play');
  const [tcOpen, setTcOpen] = useState(false);

  const {
    status, whiteMs, blackMs, running, started, thinking, turn,
    playerColor, timeControl, customMinutes, customIncrement,
    history, stageLabel, currentOpening, aiDifficulty,
    onStart, onResign, onDraw, onUndo, onJumpFirst, onJumpPrev, onJumpNext, onJumpLast,
    onChangeTimeControl, onChangeCustomMinutes, onChangeCustomIncrement,
    onFlip, onChangeColor, onChangeDifficulty, chatPanel,
  } = props;

  const statusText = () => {
    if (status.phase === 'checkmate') return `Checkmate — ${status.winner === 'w' ? 'White' : 'Black'} wins`;
    if (status.phase === 'stalemate') return 'Draw — Stalemate';
    if (status.phase === 'check') return 'Check!';
    if (!started) return 'Ready to play';
    if (thinking) return 'Opponent thinking…';
    return turn === 'w' ? "White to move" : "Black to move";
  };

  const statusColor = () => {
    if (status.phase === 'checkmate') return 'text-emerald-400';
    if (status.phase === 'stalemate') return 'text-navy-200';
    if (status.phase === 'check') return 'text-red-400';
    return 'text-white';
  };

  const stageIsLive = stageLabel !== 'Not started' && stageLabel !== 'Game over';

  const tabs: { id: Tab; label: string; icon: typeof Play }[] = [
    { id: 'play', label: 'Play', icon: Gamepad2 },
    { id: 'newgame', label: 'New Game', icon: Swords },
    { id: 'moves', label: 'Moves', icon: ListOrdered },
    { id: 'chat', label: 'Chat', icon: MessageSquare },
  ];

  return (
    <div className="flex h-full flex-col overflow-hidden rounded-xl border border-white/10 bg-navy-700/90 shadow-card backdrop-blur-xl">
      {/* Tab bar */}
      <div className="flex shrink-0 border-b border-white/10">
        {tabs.map((t) => {
          const Icon = t.icon;
          return (
            <button
              key={t.id}
              onClick={() => { setTab(t.id); sound.play('select'); }}
              className={`flex flex-1 items-center justify-center gap-1.5 py-3 text-xs font-bold transition-colors ${
                tab === t.id
                  ? 'border-b-2 border-royal-400 bg-royal-500/10 text-royal-400'
                  : 'text-navy-400 hover:bg-navy-600/50 hover:text-white'
              }`}
            >
              <Icon size={14} />
              <span className="hidden sm:inline">{t.label}</span>
            </button>
          );
        })}
      </div>

      {/* Tab content */}
      <div className="flex min-h-0 flex-1 flex-col overflow-y-auto p-4">
        {tab === 'play' && (
          <PlayTab
            statusText={statusText()}
            statusColor={statusColor()}
            status={status}
            stageLabel={stageLabel}
            stageIsLive={stageIsLive}
            currentOpening={currentOpening}
            whiteMs={whiteMs}
            blackMs={blackMs}
            running={running}
            turn={turn}
            started={started}
            onStart={onStart}
            onResign={onResign}
            onDraw={onDraw}
            onUndo={onUndo}
            onFlip={onFlip}
            history={history}
            onJumpFirst={onJumpFirst}
            onJumpPrev={onJumpPrev}
            onJumpNext={onJumpNext}
            onJumpLast={onJumpLast}
          />
        )}

        {tab === 'newgame' && (
          <NewGameTab
            playerColor={playerColor}
            onChangeColor={onChangeColor}
            timeControl={timeControl}
            tcOpen={tcOpen}
            setTcOpen={setTcOpen}
            onChangeTimeControl={onChangeTimeControl}
            customMinutes={customMinutes}
            customIncrement={customIncrement}
            onChangeCustomMinutes={onChangeCustomMinutes}
            onChangeCustomIncrement={onChangeCustomIncrement}
            aiDifficulty={aiDifficulty}
            onChangeDifficulty={onChangeDifficulty}
            onStart={onStart}
            onFlip={onFlip}
          />
        )}

        {tab === 'moves' && (
          <MovesTab history={history} currentOpening={currentOpening} />
        )}

        {tab === 'chat' && (
          <div className="flex min-h-0 flex-1 flex-col">{chatPanel ?? <p className="py-8 text-center text-sm text-navy-400">Chat available in online games.</p>}</div>
        )}
      </div>
    </div>
  );
}

function PlayTab(props: {
  statusText: string; statusColor: string; status: GameStatus;
  stageLabel: GameStage | 'Not started' | 'Game over'; stageIsLive: boolean;
  currentOpening: string; whiteMs: number; blackMs: number; running: boolean;
  turn: Color; started: boolean; onStart: () => void; onResign: () => void;
  onDraw: () => void; onUndo: () => void; onFlip: () => void; history: HistoryEntry[];
  onJumpFirst: () => void; onJumpPrev: () => void; onJumpNext: () => void; onJumpLast: () => void;
}) {
  const { statusText, statusColor, status, stageLabel, stageIsLive, currentOpening,
    whiteMs, blackMs, running, turn, started, onStart, onResign, onDraw, onUndo, onFlip,
    history, onJumpFirst, onJumpPrev, onJumpNext, onJumpLast } = props;

  const navBtn = "grid h-8 w-8 place-items-center rounded text-white transition-colors hover:bg-royal-500/20 disabled:opacity-30 disabled:hover:bg-transparent";

  return (
    <div className="flex flex-col gap-3">
      {/* Status + opening */}
      <div className="rounded-lg bg-navy-600/50 p-3">
        <p className={`font-display text-sm font-bold ${statusColor}`}>{statusText}</p>
        {currentOpening && (
          <p className="mt-1 text-xs text-royal-400">{currentOpening}</p>
        )}
        {stageIsLive && (
          <span className={`chip mt-1.5 ring-1 ${STAGE_STYLE[stageLabel as GameStage].cls}`}>
            <Layers size={10} />
            {formatStage(stageLabel as GameStage)}
          </span>
        )}
      </div>

      {/* Clocks */}
      <div className="grid grid-cols-2 gap-2">
        <ClockPill label="White" ms={whiteMs} active={running && turn === 'w'} />
        <ClockPill label="Black" ms={blackMs} active={running && turn === 'b'} />
      </div>

      {/* Action buttons */}
      <div className="flex flex-wrap gap-2">
        {!running && status.phase !== 'checkmate' && status.phase !== 'stalemate' ? (
          <button onClick={onStart} className="btn-primary flex-1 text-sm">
            <Play size={16} />
            {started ? 'New Game' : 'Start Game'}
          </button>
        ) : (
          <button onClick={onStart} className="btn-ghost flex-1 text-sm">
            <RotateCcw size={15} />
            New Game
          </button>
        )}
      </div>

      {/* Game navigation bar — like Chess.com bottom bar */}
      <div className="flex items-center gap-1 rounded-lg bg-navy-600/50 p-1.5">
        <button onClick={onJumpFirst} disabled={history.length === 0} className={navBtn} title="First move">
          <ChevronFirst size={16} />
        </button>
        <button onClick={onUndo} disabled={history.length === 0} className={navBtn} title="Previous">
          <ChevronLeft size={16} />
        </button>
        <button onClick={onJumpNext} disabled={history.length === 0} className={navBtn} title="Next">
          <ChevronRight size={16} />
        </button>
        <button onClick={onJumpLast} disabled={history.length === 0} className={navBtn} title="Last move">
          <ChevronLast size={16} />
        </button>
        <div className="mx-1 h-5 w-px bg-white/10" />
        <button onClick={onFlip} className="grid h-8 w-8 place-items-center rounded text-white transition-colors hover:bg-royal-500/20" title="Flip board">
          <FlipHorizontal size={15} />
        </button>
        <button onClick={onDraw} disabled={!started || status.phase === 'checkmate' || status.phase === 'stalemate'}
          className="ml-auto flex items-center gap-1 rounded px-2.5 py-1.5 text-xs font-bold text-white transition-colors hover:bg-royal-500/20 disabled:opacity-30" title="Offer draw">
          <Handshake size={14} />
          ½ Draw
        </button>
        <button onClick={onResign} disabled={!started || status.phase === 'checkmate'}
          className="flex items-center gap-1 rounded px-2.5 py-1.5 text-xs font-bold text-red-400 transition-colors hover:bg-red-500/15 disabled:opacity-30" title="Resign">
          <Flag size={14} />
          Resign
        </button>
      </div>
    </div>
  );
}

function NewGameTab(props: {
  playerColor: Color; onChangeColor: (c: Color) => void;
  timeControl: TimeControl; tcOpen: boolean; setTcOpen: (b: boolean) => void;
  onChangeTimeControl: (tc: TimeControl) => void;
  customMinutes: number; customIncrement: number;
  onChangeCustomMinutes: (m: number) => void; onChangeCustomIncrement: (s: number) => void;
  aiDifficulty: AIDifficulty; onChangeDifficulty: (d: AIDifficulty) => void;
  onStart: () => void; onFlip: () => void;
}) {
  const { playerColor, onChangeColor, timeControl, tcOpen, setTcOpen, onChangeTimeControl,
    customMinutes, customIncrement, onChangeCustomMinutes, onChangeCustomIncrement,
    aiDifficulty, onChangeDifficulty, onStart } = props;

  return (
    <div className="flex flex-col gap-4">
      {/* Color picker */}
      <div>
        <label className="mb-1.5 block text-xs font-bold uppercase tracking-wide text-navy-400">Play as</label>
        <div className="flex items-center gap-1 rounded-lg border border-white/10 bg-navy-600 p-1">
          {(['w', 'b'] as Color[]).map((c) => (
            <button key={c} onClick={() => { onChangeColor(c); sound.play('select'); }}
              className={`flex flex-1 items-center justify-center gap-1.5 rounded-md py-2 text-xs font-bold transition-all ${
                playerColor === c ? 'bg-blue-grad text-white shadow-glow-sm' : 'text-navy-300 hover:bg-navy-500'
              }`}>
              <span className={`h-3 w-3 rounded-full border ${c === 'w' ? 'border-navy-400 bg-white' : 'border-navy-600 bg-navy-900'}`} />
              {c === 'w' ? 'White' : 'Black'}
            </button>
          ))}
        </div>
      </div>

      {/* AI difficulty */}
      <div>
        <label className="mb-1.5 block text-xs font-bold uppercase tracking-wide text-navy-400">Computer Level</label>
        <div className="grid grid-cols-2 gap-1.5">
          {AI_LEVELS.map((lvl) => (
            <button key={lvl.value} onClick={() => { onChangeDifficulty(lvl.value); sound.play('select'); }}
              className={`rounded-lg border px-3 py-2 text-left transition-all ${
                aiDifficulty === lvl.value
                  ? 'border-royal-400 bg-royal-500/15'
                  : 'border-white/10 bg-navy-600 hover:bg-navy-500'
              }`}>
              <p className={`text-xs font-bold ${aiDifficulty === lvl.value ? 'text-royal-400' : 'text-white'}`}>{lvl.label}</p>
              <p className="text-[10px] text-navy-400">{lvl.elo} ELO</p>
            </button>
          ))}
        </div>
      </div>

      {/* Time control */}
      <div>
        <label className="mb-1.5 block text-xs font-bold uppercase tracking-wide text-navy-400">Time Control</label>
        <div className="relative">
          <button onClick={() => { sound.unlock(); setTcOpen(!tcOpen); }}
            className="flex w-full items-center justify-between rounded-lg border border-white/10 bg-navy-600 px-3 py-2 text-xs font-bold text-white transition-all hover:border-royal-500/40">
            <span>{TC_PRESETS.find((t) => t.value === timeControl)?.label ?? 'Custom'}</span>
            <ChevronDown size={14} className={`transition-transform ${tcOpen ? 'rotate-180' : ''}`} />
          </button>
          {tcOpen && (
            <div className="absolute left-0 top-10 z-20 w-full overflow-hidden rounded-lg border border-white/10 bg-navy-700 p-1.5 shadow-card-lg animate-pop-in">
              {TC_PRESETS.map((tc) => {
                const Icon = tc.icon;
                return (
                  <button key={tc.value} onClick={() => { onChangeTimeControl(tc.value); setTcOpen(false); }}
                    className={`flex w-full items-center justify-between rounded-md px-3 py-2 text-left text-xs font-semibold transition-colors ${
                      timeControl === tc.value ? 'bg-blue-grad text-white' : 'text-white hover:bg-navy-600'
                    }`}>
                    <span className="flex items-center gap-2"><Icon size={13} />{tc.label}</span>
                    <span className={timeControl === tc.value ? 'text-royal-100' : 'text-navy-400'}>{tc.sub}</span>
                  </button>
                );
              })}
              {timeControl === 'custom' && (
                <div className="mt-1.5 space-y-2 rounded-md bg-navy-600 p-2.5">
                  <div>
                    <label className="mb-1 block text-[10px] font-bold uppercase text-navy-400">Minutes per side</label>
                    <div className="flex items-center gap-2">
                      <input type="range" min={1} max={60} step={1} value={customMinutes}
                        onChange={(e) => onChangeCustomMinutes(parseInt(e.target.value, 10))}
                        className="slider-green flex-1" />
                      <span className="w-10 text-right text-xs font-bold text-royal-400">{customMinutes}m</span>
                    </div>
                  </div>
                  <div>
                    <label className="mb-1 block text-[10px] font-bold uppercase text-navy-400">Increment (seconds)</label>
                    <div className="flex items-center gap-2">
                      <input type="range" min={0} max={30} step={1} value={customIncrement}
                        onChange={(e) => onChangeCustomIncrement(parseInt(e.target.value, 10))}
                        className="slider-green flex-1" />
                      <span className="w-10 text-right text-xs font-bold text-royal-400">+{customIncrement}s</span>
                    </div>
                  </div>
                </div>
              )}
            </div>
          )}
        </div>
      </div>

      <button onClick={onStart} className="btn-primary w-full">
        <Swords size={18} />
        Start Game
      </button>

      <style>{`
        .slider-green { -webkit-appearance: none; appearance: none; height: 6px; border-radius: 999px; background: linear-gradient(90deg, #81B64C, #6ba238); outline: none; }
        .slider-green::-webkit-slider-thumb { -webkit-appearance: none; appearance: none; width: 16px; height: 16px; border-radius: 50%; background: #fff; border: 2px solid #81B64C; cursor: pointer; }
        .slider-green::-moz-range-thumb { width: 16px; height: 16px; border-radius: 50%; background: #fff; border: 2px solid #81B64C; cursor: pointer; }
      `}</style>
    </div>
  );
}

function MovesTab({ history, currentOpening }: { history: HistoryEntry[]; currentOpening: string }) {
  return (
    <div className="flex min-h-0 flex-1 flex-col">
      {currentOpening && (
        <div className="mb-2 rounded-lg bg-navy-600/50 px-3 py-2">
          <p className="text-xs font-bold text-royal-400">{currentOpening}</p>
        </div>
      )}
      <div className="no-scrollbar min-h-0 flex-1 overflow-y-auto">
        {history.length === 0 ? (
          <p className="py-8 text-center text-sm text-navy-400">No moves yet — start a game.</p>
        ) : (
          <ol className="grid grid-cols-[auto_1fr_1fr] gap-x-2 gap-y-0.5 text-sm">
            {Array.from({ length: Math.ceil(history.length / 2) }).map((_, i) => {
              const w = history[i * 2];
              const b = history[i * 2 + 1];
              return (
                <li key={i} className="contents">
                  <span className="py-1 pr-1 text-right font-bold text-navy-500">{i + 1}.</span>
                  <span className="rounded px-1.5 py-1 font-mono font-medium text-white hover:bg-navy-600">{w?.san ?? ''}</span>
                  <span className="rounded px-1.5 py-1 font-mono font-medium text-white hover:bg-navy-600">{b?.san ?? ''}</span>
                </li>
              );
            })}
          </ol>
        )}
      </div>
    </div>
  );
}

function ClockPill({ label, ms, active }: { label: string; ms: number; active: boolean }) {
  const low = ms <= 10_000;
  return (
    <div className={`relative overflow-hidden rounded-lg p-2.5 text-center transition-all duration-300 ${
      active ? 'bg-blue-grad text-white shadow-glow-sm' : 'bg-navy-600 text-white'
    }`}>
      <p className="text-[10px] font-bold uppercase tracking-wide opacity-70">{label}</p>
      <p className={`mt-0.5 font-display text-xl font-extrabold tabular-nums ${low && active ? 'animate-pulse text-red-300' : ''}`}>
        {formatClock(ms)}
      </p>
    </div>
  );
}
