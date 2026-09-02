import { useEffect, useState } from 'react';
import type { GameStatus, MatchRecord } from '../game/types';
import { Trophy, Handshake, X, Clock, Target, Zap, TrendingUp, Star, PartyPopper, Flag } from 'lucide-react';
import { sound } from '../game/sound';

interface Props {
  status: GameStatus;
  ending: MatchRecord['ending'];
  onClose: () => void;
  onNewGame: () => void;
  winnerName: string;
  playerWon: boolean;
  moves: number;
  duration: string;
  ratingChange: number;
}

const ENDING_LABELS: Record<MatchRecord['ending'], string> = {
  checkmate: 'Checkmate',
  resign: 'Resignation',
  timeout: 'Timeout',
  stalemate: 'Stalemate',
};

export function GameOverPopup({ status, ending, onClose, onNewGame, winnerName, playerWon, moves, duration, ratingChange }: Props) {
  const [showStats, setShowStats] = useState(false);

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => { if (e.key === 'Escape') onClose(); };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [onClose]);

  useEffect(() => {
    if (status.phase === 'checkmate' && playerWon) sound.play('victory');
    const t = setTimeout(() => setShowStats(true), 400);
    return () => clearTimeout(t);
  }, [status.phase, playerWon]);

  const isMate = ending === 'checkmate';
  const isDraw = status.phase === 'stalemate' || ending === 'stalemate';
  const title = isDraw ? 'Draw' : playerWon ? 'Congratulations! You Won!' : ending === 'resign' ? 'You Resigned' : ending === 'timeout' ? 'Time Out' : 'Checkmate';
  const subtitle = isDraw ? 'Stalemate — no legal moves remain' : `${winnerName} wins by ${ENDING_LABELS[ending]}`;
  const stats = [
    { icon: Target, label: 'Moves', value: String(moves) },
    { icon: Clock, label: 'Duration', value: duration },
    { icon: Zap, label: 'Ending', value: ENDING_LABELS[ending] },
    { icon: TrendingUp, label: 'Rating', value: `${ratingChange > 0 ? '+' : ''}${ratingChange}` },
  ];

  return (
    <div className="fixed inset-0 z-50 grid place-items-center bg-navy-900/70 p-4 backdrop-blur-sm animate-fade-in">
      <div className="relative w-full max-w-md overflow-hidden rounded-3xl border border-white/10 bg-navy-700 shadow-card-lg animate-pop-in">
        <div className={`relative overflow-hidden px-6 pb-8 pt-8 text-center text-white ${playerWon ? 'bg-gradient-to-br from-royal-500 via-blue-grad to-navy-700' : 'bg-navy-grad'}`}>
          <button onClick={onClose} aria-label="Close" className="absolute right-3 top-3 grid h-9 w-9 place-items-center rounded-full bg-white/10 text-white transition-colors hover:bg-white/20">
            <X size={18} />
          </button>
          <div className="mx-auto grid h-16 w-16 place-items-center rounded-2xl bg-white/10 ring-1 ring-white/20 animate-glow-pulse">
            {playerWon ? <PartyPopper size={32} className="text-amber-300" /> : ending === 'resign' ? <Flag size={32} className="text-royal-300" /> : isMate ? <Trophy size={32} className="text-royal-300" /> : <Handshake size={32} className="text-royal-300" />}
          </div>
          {playerWon && (
            <div className="pointer-events-none absolute inset-0 overflow-hidden">
              {[...Array(16)].map((_, i) => (
                <span key={i} className="absolute h-2 w-2 animate-fall" style={{ left: `${(i * 6.3) % 100}%`, top: '-10px', animationDelay: `${i * 0.12}s`, background: ['#81B64C', '#fbbf24', '#34d399', '#f472b6'][i % 4], borderRadius: i % 2 ? '50%' : '2px' }} />
              ))}
            </div>
          )}
          <h2 className="mt-4 font-display text-2xl font-extrabold sm:text-3xl">{title}</h2>
          <p className="mt-1 text-sm text-royal-100">{subtitle}</p>
          <div className="pointer-events-none absolute -bottom-10 left-1/2 h-24 w-24 -translate-x-1/2 rounded-full bg-royal-400/40 blur-2xl" />
        </div>
        <div className="px-6 py-6">
          <div className={`grid grid-cols-2 gap-3 transition-all duration-500 sm:grid-cols-4 ${showStats ? 'translate-y-0 opacity-100' : 'translate-y-4 opacity-0'}`}>
            {stats.map((s) => {
              const Icon = s.icon;
              return (
                <div key={s.label} className="rounded-xl bg-navy-600 p-3 text-center">
                  <Icon size={16} className="mx-auto text-royal-400" />
                  <p className="mt-1.5 font-display text-base font-extrabold text-white">{s.value}</p>
                  <p className="text-[10px] font-semibold uppercase tracking-wide text-navy-400">{s.label}</p>
                </div>
              );
            })}
          </div>
          {playerWon && (
            <div className="mt-4 flex items-center justify-center gap-2 rounded-2xl bg-amber-500/10 py-3">
              <Star size={18} className="text-amber-400" />
              <span className="font-display text-sm font-bold text-amber-400">Victory! {ratingChange > 0 ? `+${ratingChange}` : ratingChange} rating</span>
              <Star size={18} className="text-amber-400" />
            </div>
          )}
          <div className="mt-5 flex gap-2">
            <button onClick={onNewGame} className="btn-primary flex-1"><Trophy size={16} />Play Again</button>
            <button onClick={onClose} className="btn-ghost">Close</button>
          </div>
        </div>
      </div>
      <style>{`@keyframes fall { 0% { transform: translateY(0) rotate(0deg); opacity: 1; } 100% { transform: translateY(400px) rotate(720deg); opacity: 0; } } .animate-fall { animation: fall 2.5s linear forwards; }`}</style>
    </div>
  );
}
