import { useEffect, useState } from 'react';
import { Wallet, X, TrendingUp, TrendingDown, Gift, ArrowDownToLine } from 'lucide-react';
import { timeAgo } from '../lib/format';
import type { WalletState } from '../game/types';

interface Props {
  open: boolean;
  onClose: () => void;
  wallet: WalletState;
}

export function WalletModal({ open, onClose, wallet }: Props) {
  const [animateBalance, setAnimateBalance] = useState(false);

  useEffect(() => {
    if (open) {
      setAnimateBalance(false);
      const t = setTimeout(() => setAnimateBalance(true), 100);
      return () => clearTimeout(t);
    }
  }, [open]);

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => { if (e.key === 'Escape') onClose(); };
    if (open) window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [open, onClose]);

  if (!open) return null;

  return (
    <div className="fixed inset-0 z-[100] grid place-items-center bg-navy-900/70 p-4 backdrop-blur-sm animate-fade-in">
      <div className="relative w-full max-w-md overflow-hidden rounded-3xl border border-white/10 bg-navy-700 shadow-card-lg animate-pop-in">
        <div className="relative overflow-hidden bg-navy-grad px-6 pb-6 pt-6 text-white">
          <button onClick={onClose} aria-label="Close"
            className="absolute right-3 top-3 grid h-9 w-9 place-items-center rounded-full bg-white/10 text-white transition-colors hover:bg-white/20">
            <X size={18} />
          </button>
          <div className="flex items-center gap-3">
            <div className="grid h-12 w-12 place-items-center rounded-2xl bg-gradient-to-br from-royal-400 to-royal-600 shadow-glow-sm">
              <Wallet size={24} className="text-white" />
            </div>
            <div>
              <h2 className="font-display text-xl font-extrabold">My Wallet</h2>
              <p className="text-xs text-royal-100">Bonus credit balance</p>
            </div>
          </div>
          <div className="mt-5 rounded-2xl bg-white/10 p-4 text-center ring-1 ring-white/15">
            <p className="text-xs font-semibold uppercase tracking-wide text-royal-100">Available Balance</p>
            <p className={`mt-1 font-display text-4xl font-extrabold tabular-nums transition-all duration-700 ${animateBalance ? 'scale-100 opacity-100' : 'scale-90 opacity-0'}`}>
              ${wallet.balance.toFixed(2)}
            </p>
            <p className="mt-1 text-xs text-royal-100">USD</p>
          </div>
        </div>

        <div className="max-h-80 overflow-y-auto px-6 py-5">
          <h3 className="mb-3 text-sm font-bold text-white">Transaction History</h3>
          {wallet.transactions.length === 0 ? (
            <div className="py-8 text-center">
              <Gift size={28} className="mx-auto text-navy-500" />
              <p className="mt-2 text-sm text-navy-400">No transactions yet</p>
            </div>
          ) : (
            <ul className="space-y-2">
              {wallet.transactions.map((tx) => {
                const isCredit = tx.type === 'bonus' || tx.type === 'credit';
                const Icon = isCredit ? TrendingUp : TrendingDown;
                return (
                  <li key={tx.id} className="flex items-center gap-3 rounded-xl bg-navy-600 p-3">
                    <div className={`grid h-9 w-9 shrink-0 place-items-center rounded-lg ${
                      isCredit ? 'bg-emerald-500/15 text-emerald-400' : 'bg-red-500/15 text-red-400'
                    }`}>
                      <Icon size={16} />
                    </div>
                    <div className="min-w-0 flex-1">
                      <p className="truncate text-sm font-semibold text-white">{tx.description}</p>
                      <p className="text-xs text-navy-400">{timeAgo(tx.date)}</p>
                    </div>
                    <span className={`font-display text-sm font-extrabold tabular-nums ${
                      isCredit ? 'text-emerald-400' : 'text-red-400'
                    }`}>
                      {isCredit ? '+' : '-'}${tx.amount.toFixed(2)}
                    </span>
                  </li>
                );
              })}
            </ul>
          )}
        </div>

        <div className="border-t border-white/10 px-6 py-4">
          <button onClick={onClose} className="btn-primary w-full">
            <ArrowDownToLine size={16} />
            Done
          </button>
        </div>
      </div>
    </div>
  );
}
