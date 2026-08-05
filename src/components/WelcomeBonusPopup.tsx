import { Trophy, X, Gift, DollarSign } from 'lucide-react';

interface Props {
  onClose: () => void;
  onClaim: () => void;
}

export function WelcomeBonusPopup({ onClose, onClaim }: Props) {
  return (
    <div className="fixed inset-0 z-[110] grid place-items-center bg-navy-900/70 p-4 backdrop-blur-sm animate-fade-in">
      <div className="relative w-full max-w-sm overflow-hidden rounded-3xl border border-white/10 bg-navy-700 shadow-card-lg animate-pop-in">
        <div className="relative overflow-hidden bg-navy-grad px-6 pb-8 pt-8 text-center text-white">
          <button
            onClick={onClose}
            aria-label="Close"
            className="absolute right-3 top-3 grid h-9 w-9 place-items-center rounded-full bg-white/10 text-white transition-colors hover:bg-white/20"
          >
            <X size={18} />
          </button>
          <div className="mx-auto grid h-16 w-16 place-items-center rounded-2xl bg-gradient-to-br from-amber-400 to-orange-500 ring-2 ring-white/30 shadow-glow-sm animate-glow-pulse">
            <Gift size={32} className="text-white" />
          </div>
          <h2 className="mt-4 font-display text-2xl font-extrabold">Welcome Bonus!</h2>
          <p className="mt-1 text-sm text-royal-100">You've received a $50 USD welcome bonus</p>
          <div className="pointer-events-none absolute -bottom-10 left-1/2 h-24 w-24 -translate-x-1/2 rounded-full bg-amber-400/40 blur-2xl" />
        </div>
        <div className="px-6 py-6">
          <div className="mb-4 flex items-center justify-center gap-2 rounded-2xl bg-gradient-to-r from-amber-500/15 to-orange-500/15 py-4">
            <DollarSign size={28} className="text-amber-400" />
            <span className="font-display text-3xl font-extrabold text-amber-400">50.00</span>
            <span className="text-sm font-semibold text-amber-400">USD</span>
          </div>
          <p className="mb-5 text-center text-sm text-navy-300">
            Use your bonus to enter tournaments, unlock premium features, and challenge players worldwide!
          </p>
          <div className="flex gap-2">
            <button onClick={onClaim} className="btn-primary flex-1">
              <Trophy size={16} />
              Claim Bonus
            </button>
            <button onClick={onClose} className="btn-ghost">
              Later
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
