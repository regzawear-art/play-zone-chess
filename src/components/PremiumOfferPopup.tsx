import { useEffect, useRef, useState } from 'react';
import { Diamond, X, Check, Clock } from 'lucide-react';

interface Props {
  onClose: () => void;
  onClaim: () => void;
}

function formatTime(ms: number): { h: string; m: string; s: string } {
  const total = Math.max(0, Math.floor(ms / 1000));
  const h = Math.floor(total / 3600);
  const m = Math.floor((total % 3600) / 60);
  const s = total % 60;
  return {
    h: String(h).padStart(2, '0'),
    m: String(m).padStart(2, '0'),
    s: String(s).padStart(2, '0'),
  };
}

const OFFER_DURATION_MS = 15 * 60 * 1000;

const PERKS = [
  'Unlimited multiplayer games',
  'Access to all tournaments',
  'Advanced AI analysis & coaching',
  'Ad-free experience',
];

export function PremiumOfferPopup({ onClose, onClaim }: Props) {
  const [remaining, setRemaining] = useState(OFFER_DURATION_MS);
  const claimedRef = useRef(false);

  useEffect(() => {
    const interval = setInterval(() => {
      setRemaining((r) => {
        if (r <= 1000) {
          clearInterval(interval);
          return 0;
        }
        return r - 1000;
      });
    }, 1000);
    return () => clearInterval(interval);
  }, []);

  const { h, m, s } = formatTime(remaining);
  const expired = remaining <= 0;

  const handleClaim = () => {
    if (claimedRef.current || expired) return;
    claimedRef.current = true;
    onClaim();
  };

  return (
    <div className="fixed inset-0 z-[120] grid place-items-center bg-navy-900/70 p-4 backdrop-blur-sm animate-fade-in">
      <div className="relative w-full max-w-md overflow-hidden rounded-3xl border border-white/10 bg-navy-700 shadow-card-lg animate-pop-in">
        {/* Header with diamond glow */}
        <div className="relative overflow-hidden px-6 pb-6 pt-8 text-center">
          <div className="pointer-events-none absolute inset-0 bg-gradient-to-b from-royal-500/20 via-transparent to-transparent" />
          <div className="pointer-events-none absolute -top-8 left-1/2 h-28 w-28 -translate-x-1/2 rounded-full bg-royal-400/30 blur-3xl" />
          <button
            onClick={onClose}
            aria-label="Close"
            className="absolute right-3 top-3 grid h-9 w-9 place-items-center rounded-full bg-white/10 text-white transition-colors hover:bg-white/20"
          >
            <X size={18} />
          </button>
          <div className="relative mx-auto grid h-16 w-16 place-items-center rounded-2xl bg-gradient-to-br from-royal-400 to-royal-600 ring-2 ring-white/30 shadow-glow-sm animate-glow-pulse">
            <Diamond size={32} className="text-white" />
          </div>
          <h2 className="relative mt-4 font-display text-2xl font-extrabold text-white">Get 1 Month of Premium for Free!</h2>
          <p className="relative mt-1.5 text-sm text-navy-200">
            Unlock the full Gambit Royale experience — limited time sign-up offer.
          </p>
        </div>

        {/* Countdown timer */}
        <div className="px-6">
          <div className="flex items-center justify-center gap-3 rounded-2xl bg-navy-800/80 py-4 ring-1 ring-white/10">
            <Clock size={18} className="text-royal-400" />
            <div className="flex items-center gap-1.5">
              {[
                { v: h, label: 'Hrs' },
                { v: m, label: 'Min' },
                { v: s, label: 'Sec' },
              ].map((unit, i) => (
                <div key={unit.label} className="flex items-center gap-1.5">
                  {i > 0 && <span className="font-display text-lg font-bold text-navy-400">:</span>}
                  <div className="flex flex-col items-center">
                    <span className="font-display text-2xl font-extrabold tabular-nums text-white">{unit.v}</span>
                    <span className="text-[9px] font-semibold uppercase tracking-wide text-navy-400">{unit.label}</span>
                  </div>
                </div>
              ))}
            </div>
          </div>
          {expired && (
            <p className="mt-2 text-center text-sm font-semibold text-red-400">This offer has expired.</p>
          )}
        </div>

        {/* Perks list */}
        <div className="px-6 py-5">
          <ul className="space-y-2.5">
            {PERKS.map((perk) => (
              <li key={perk} className="flex items-center gap-2.5 text-sm text-navy-100">
                <span className="grid h-5 w-5 shrink-0 place-items-center rounded-full bg-emerald-500/20">
                  <Check size={13} className="text-emerald-400" />
                </span>
                {perk}
              </li>
            ))}
          </ul>
        </div>

        {/* CTA */}
        <div className="px-6 pb-6">
          <button
            onClick={handleClaim}
            disabled={expired}
            className="flex w-full items-center justify-center gap-2 rounded-xl bg-blue-grad py-3 text-sm font-bold text-white shadow-glow-sm transition-all hover:translate-y-[-1px] hover:shadow-glow disabled:cursor-not-allowed disabled:opacity-50"
          >
            <Diamond size={18} />
            {expired ? 'Offer Expired' : 'Claim 1 Month Free'}
          </button>
          <button onClick={onClose} className="mt-2 w-full text-center text-xs font-medium text-navy-400 transition-colors hover:text-navy-200">
            No thanks, maybe later
          </button>
        </div>
      </div>
    </div>
  );
}
