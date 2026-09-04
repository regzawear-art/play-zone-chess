import { useEffect, useState } from 'react';
import { Wallet, X, TrendingUp, TrendingDown, Gift, ArrowDownToLine, Coins, CheckCircle2, AlertCircle, Loader2 } from 'lucide-react';
import { formatCurrency, getStoredCurrency } from '@/data/countries';
import type { WalletTx } from '@/hooks/useWalletDB';

interface Props {
  open: boolean;
  onClose: () => void;
  balanceInr: number;
  transactions: WalletTx[];
  onRedeemCoupon: (code: string) => Promise<{ success: boolean; message: string }>;
}

export function WalletModalDB({ open, onClose, balanceInr, transactions, onRedeemCoupon }: Props) {
  const [animateBalance, setAnimateBalance] = useState(false);
  const [couponInput, setCouponInput] = useState('');
  const [couponStatus, setCouponStatus] = useState<{ type: 'idle' | 'success' | 'error' | 'loading'; message: string }>({ type: 'idle', message: '' });
  const currency = getStoredCurrency();

  useEffect(() => {
    if (open) {
      setAnimateBalance(false);
      setCouponInput('');
      setCouponStatus({ type: 'idle', message: '' });
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

  const isCredit = (type: WalletTx['type']) => type === 'bonus' || type === 'credit' || type === 'referral' || type === 'coupon';

  const handleRedeem = async () => {
    if (!couponInput.trim()) return;
    setCouponStatus({ type: 'loading', message: 'Redeeming...' });
    const result = await onRedeemCoupon(couponInput);
    if (result.success) {
      setCouponStatus({ type: 'success', message: result.message });
      setCouponInput('');
    } else {
      setCouponStatus({ type: 'error', message: result.message });
    }
  };

  return (
    <div className="fixed inset-0 z-[100] grid place-items-center bg-navy-900/70 p-4 backdrop-blur-sm animate-fade-in">
      <div className="relative w-full max-w-md overflow-hidden rounded-3xl border border-white/10 bg-navy-700 shadow-card-lg animate-pop-in">
        <div className="relative overflow-hidden bg-navy-grad px-6 pb-6 pt-6 text-white">
          <button onClick={onClose} aria-label="Close" className="absolute right-3 top-3 grid h-9 w-9 place-items-center rounded-full bg-white/10 text-white transition-colors hover:bg-white/20">
            <X size={18} />
          </button>
          <div className="flex items-center gap-3">
            <div className="grid h-12 w-12 place-items-center rounded-2xl bg-gradient-to-br from-royal-400 to-royal-600 shadow-glow-sm">
              <Wallet size={24} className="text-white" />
            </div>
            <div>
              <h2 className="font-display text-xl font-extrabold">My Wallet</h2>
              <p className="text-xs text-royal-100">Balance & transaction history</p>
            </div>
          </div>
          <div className="mt-5 rounded-2xl bg-white/10 p-4 text-center ring-1 ring-white/15">
            <p className="text-xs font-semibold uppercase tracking-wide text-royal-100">Available Balance</p>
            <p className={`mt-1 font-display text-4xl font-extrabold tabular-nums transition-all duration-700 ${animateBalance ? 'scale-100 opacity-100' : 'scale-90 opacity-0'}`}>
              {formatCurrency(balanceInr, currency)}
            </p>
            <p className="mt-1 text-xs text-royal-100">Display currency: {currency}</p>
          </div>
        </div>

        {/* Coupon Redemption Section */}
        <div className="border-b border-white/10 px-6 py-4">
          <div className="mb-2 flex items-center gap-2">
            <Coins size={16} className="text-royal-400" />
            <h3 className="text-sm font-bold text-white">Redeem Coupon Code</h3>
          </div>
          <div className="flex gap-2">
            <input
              type="text"
              value={couponInput}
              onChange={(e) => { setCouponInput(e.target.value.toUpperCase()); setCouponStatus({ type: 'idle', message: '' }); }}
              onKeyDown={(e) => { if (e.key === 'Enter' && couponStatus.type !== 'loading') handleRedeem(); }}
              placeholder="Enter coupon code"
              disabled={couponStatus.type === 'loading'}
              className="flex-1 rounded-xl border border-white/10 bg-navy-600 px-3 py-2.5 text-sm font-semibold uppercase tracking-wide text-white placeholder:text-navy-400 focus:border-royal-500/50 focus:outline-none focus:ring-1 focus:ring-royal-500/30 disabled:opacity-50"
            />
            <button
              onClick={handleRedeem}
              disabled={couponStatus.type === 'loading' || !couponInput.trim()}
              className="flex shrink-0 items-center gap-1.5 rounded-xl bg-blue-grad px-4 py-2.5 text-sm font-bold text-white shadow-glow-sm transition-transform hover:translate-y-[-1px] disabled:opacity-50 disabled:hover:translate-y-0"
            >
              {couponStatus.type === 'loading' ? <Loader2 size={14} className="animate-spin" /> : <Gift size={14} />}
              Redeem
            </button>
          </div>
          {couponStatus.type === 'success' && (
            <div className="mt-2.5 flex items-center gap-2 rounded-lg bg-emerald-500/10 px-3 py-2 text-xs font-semibold text-emerald-400 ring-1 ring-emerald-500/20 animate-fade-in">
              <CheckCircle2 size={14} className="shrink-0" />
              {couponStatus.message}
            </div>
          )}
          {couponStatus.type === 'error' && (
            <div className="mt-2.5 flex items-center gap-2 rounded-lg bg-red-500/10 px-3 py-2 text-xs font-semibold text-red-400 ring-1 ring-red-500/20 animate-fade-in">
              <AlertCircle size={14} className="shrink-0" />
              {couponStatus.message}
            </div>
          )}
        </div>

        <div className="max-h-64 overflow-y-auto px-6 py-5">
          <h3 className="mb-3 text-sm font-bold text-white">Transaction History</h3>
          {transactions.length === 0 ? (
            <div className="py-8 text-center">
              <Gift size={28} className="mx-auto text-navy-500" />
              <p className="mt-2 text-sm text-navy-400">No transactions yet</p>
            </div>
          ) : (
            <ul className="space-y-2">
              {transactions.map((tx) => {
                const credit = isCredit(tx.type);
                const Icon = credit ? TrendingUp : TrendingDown;
                return (
                  <li key={tx.id} className="flex items-center gap-3 rounded-xl bg-navy-600 p-3">
                    <div className={`grid h-9 w-9 shrink-0 place-items-center rounded-lg ${credit ? 'bg-emerald-500/15 text-emerald-400' : 'bg-red-500/15 text-red-400'}`}>
                      <Icon size={16} />
                    </div>
                    <div className="min-w-0 flex-1">
                      <p className="truncate text-sm font-semibold text-white">{tx.description}</p>
                      <p className="text-xs text-navy-400">{new Date(tx.createdAt).toLocaleDateString()}</p>
                    </div>
                    <span className={`font-display text-sm font-extrabold tabular-nums ${credit ? 'text-emerald-400' : 'text-red-400'}`}>
                      {credit ? '+' : '-'}{formatCurrency(tx.amountInr, currency)}
                    </span>
                  </li>
                );
              })}
            </ul>
          )}
        </div>

        <div className="border-t border-white/10 px-6 py-4">
          <button onClick={onClose} className="btn-primary w-full">
            <ArrowDownToLine size={16} /> Done
          </button>
        </div>
      </div>
    </div>
  );
}
