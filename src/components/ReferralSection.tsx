import { useCallback, useEffect, useState } from 'react';
import { Gift, Copy, Check, Users, Loader2, Share2, TrendingUp } from 'lucide-react';
import { supabase } from '@/lib/supabase';
import { formatCurrency, getStoredCurrency } from '@/data/countries';

interface Props {
  userId: string | null;
  onLogin: () => void;
  onReferralComplete: (referredEmail: string) => void;
}

const REFERRAL_BONUS = 999;

export function ReferralSection({ userId, onLogin, onReferralComplete }: Props) {
  const [referralCode, setReferralCode] = useState('');
  const [referrals, setReferrals] = useState<{ referred_id: string; bonus_inr: number; created_at: string }[]>([]);
  const [totalEarned, setTotalEarned] = useState(0);
  const [loading, setLoading] = useState(true);
  const [copied, setCopied] = useState(false);
  const [inviteEmail, setInviteEmail] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);
  const currency = getStoredCurrency();

  useEffect(() => {
    if (!userId) { setLoading(false); return; }
    loadData();
  }, [userId]);

  const loadData = useCallback(async () => {
    if (!userId) return;
    setLoading(true);
    const { data: profile } = await supabase
      .from('profiles')
      .select('username')
      .eq('id', userId)
      .maybeSingle();
    const username = profile?.username ?? userId.slice(0, 8);
    setReferralCode(`GAMBIT-${username.toUpperCase()}`);

    const { data: refs } = await supabase
      .from('referrals')
      .select('referred_id, bonus_inr, created_at')
      .eq('referrer_id', userId)
      .order('created_at', { ascending: false });

    if (refs) {
      setReferrals(refs as typeof referrals);
      setTotalEarned(refs.reduce((sum, r) => sum + Number(r.bonus_inr), 0));
    }
    setLoading(false);
  }, [userId]);

  const copyCode = () => {
    navigator.clipboard.writeText(referralCode).then(() => {
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    });
  };

  const shareLink = `https://${window.location.host}?ref=${referralCode}`;

  const copyShareLink = () => {
    navigator.clipboard.writeText(shareLink).then(() => {
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    });
  };

  const submitReferral = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!userId) { onLogin(); return; }
    setError(null);
    setSuccess(null);
    if (!inviteEmail.trim()) { setError('Please enter an email address.'); return; }
    setSubmitting(true);
    try {
      const { data: referredUser } = await supabase
        .from('profiles')
        .select('id')
        .eq('username', inviteEmail.trim().split('@')[0])
        .maybeSingle();

      if (!referredUser) {
        setError('User not found. They need to sign up first using your referral link.');
        setSubmitting(false);
        return;
      }
      if (referredUser.id === userId) {
        setError('You cannot refer yourself!');
        setSubmitting(false);
        return;
      }

      const { data: existing } = await supabase
        .from('referrals')
        .select('id')
        .eq('referrer_id', userId)
        .eq('referred_id', referredUser.id)
        .maybeSingle();
      if (existing) {
        setError('You have already referred this user.');
        setSubmitting(false);
        return;
      }

      const { error: refErr } = await supabase.from('referrals').insert({
        referrer_id: userId,
        referred_id: referredUser.id,
        referral_code: referralCode,
        bonus_inr: REFERRAL_BONUS,
        status: 'completed',
      });
      if (refErr) throw refErr;

      onReferralComplete(inviteEmail.trim());
      setSuccess(`Referral successful! ${formatCurrency(REFERRAL_BONUS, currency)} bonus credited to your wallet.`);
      setInviteEmail('');
      await loadData();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Referral failed. Please try again.');
    } finally {
      setSubmitting(false);
    }
  };

  if (loading) {
    return <div className="flex justify-center py-12"><Loader2 size={28} className="animate-spin text-royal-400" /></div>;
  }

  if (!userId) {
    return (
      <div className="mx-auto max-w-lg rounded-2xl border border-white/10 bg-navy-700/50 p-8 text-center">
        <Gift size={40} className="mx-auto text-royal-400" />
        <h3 className="mt-4 font-display text-xl font-extrabold text-white">Earn {formatCurrency(REFERRAL_BONUS, currency)} per Referral</h3>
        <p className="mt-2 text-sm text-navy-300">Sign in to get your unique referral code and start earning bonuses for every friend you invite.</p>
        <button onClick={onLogin} className="btn-primary mt-5">Sign In to Get Started</button>
      </div>
    );
  }

  return (
    <div className="mx-auto max-w-3xl space-y-6">
      {/* Bonus highlight */}
      <div className="relative overflow-hidden rounded-2xl bg-gradient-to-br from-royal-500/20 via-navy-700 to-navy-700 p-6 ring-1 ring-royal-400/20">
        <div className="pointer-events-none absolute -right-8 -top-8 h-32 w-32 rounded-full bg-royal-500/20 blur-3xl" />
        <div className="relative flex flex-col items-center gap-4 sm:flex-row sm:justify-between">
          <div className="flex items-center gap-4">
            <div className="grid h-14 w-14 place-items-center rounded-2xl bg-gradient-to-br from-royal-400 to-royal-600 shadow-glow-sm">
              <Gift size={28} className="text-white" />
            </div>
            <div>
              <h3 className="font-display text-2xl font-extrabold text-white">Referral Bonus</h3>
              <p className="text-sm text-royal-100">Earn {formatCurrency(REFERRAL_BONUS, currency)} for every friend who joins!</p>
            </div>
          </div>
          <div className="text-center">
            <p className="text-xs font-semibold uppercase tracking-wide text-royal-100">Total Earned</p>
            <p className="font-display text-3xl font-extrabold text-emerald-400">{formatCurrency(totalEarned, currency)}</p>
          </div>
        </div>
      </div>

      <div className="grid gap-4 lg:grid-cols-2">
        {/* Referral code & share */}
        <div className="rounded-2xl border border-white/10 bg-navy-700/50 p-5">
          <h4 className="mb-3 flex items-center gap-2 text-sm font-bold text-white">
            <Share2 size={16} className="text-royal-400" /> Your Referral Code
          </h4>
          <div className="flex items-center gap-2">
            <div className="flex-1 rounded-xl border border-dashed border-royal-400/40 bg-royal-500/5 px-4 py-3 text-center font-mono text-lg font-bold text-royal-300">
              {referralCode}
            </div>
            <button onClick={copyCode} className="grid h-11 w-11 shrink-0 place-items-center rounded-xl bg-navy-600 text-white transition-colors hover:bg-navy-500" title="Copy code">
              {copied ? <Check size={18} className="text-emerald-400" /> : <Copy size={18} />}
            </button>
          </div>
          <div className="mt-3">
            <p className="mb-1.5 text-xs font-semibold text-navy-300">Share this link:</p>
            <div className="flex items-center gap-2">
              <div className="flex-1 truncate rounded-xl bg-navy-600 px-3 py-2.5 text-sm text-navy-200">{shareLink}</div>
              <button onClick={copyShareLink} className="grid h-10 w-10 shrink-0 place-items-center rounded-xl bg-navy-600 text-white transition-colors hover:bg-navy-500" title="Copy link">
                {copied ? <Check size={16} className="text-emerald-400" /> : <Copy size={16} />}
              </button>
            </div>
          </div>
        </div>

        {/* Invite by email */}
        <div className="rounded-2xl border border-white/10 bg-navy-700/50 p-5">
          <h4 className="mb-3 flex items-center gap-2 text-sm font-bold text-white">
            <Users size={16} className="text-royal-400" /> Invite a Friend
          </h4>
          <form onSubmit={submitReferral} className="space-y-3">
            <input
              type="email"
              placeholder="friend@example.com"
              value={inviteEmail}
              onChange={(e) => setInviteEmail(e.target.value)}
              className="w-full rounded-xl border border-white/10 bg-navy-600 px-4 py-3 text-sm font-medium text-white outline-none transition-all placeholder:text-navy-400 focus:border-royal-400 focus:ring-2 focus:ring-royal-400/20"
            />
            {error && <p className="text-sm text-red-400">{error}</p>}
            {success && <p className="text-sm text-emerald-400">{success}</p>}
            <button type="submit" disabled={submitting} className="btn-primary w-full disabled:opacity-60">
              {submitting ? <><Loader2 size={16} className="animate-spin" /> Processing...</> : <>Invite & Earn {formatCurrency(REFERRAL_BONUS, currency)}</>}
            </button>
          </form>
        </div>
      </div>

      {/* Referral history */}
      {referrals.length > 0 && (
        <div className="rounded-2xl border border-white/10 bg-navy-700/50 p-5">
          <h4 className="mb-3 flex items-center gap-2 text-sm font-bold text-white">
            <TrendingUp size={16} className="text-emerald-400" /> Referral History
          </h4>
          <ul className="space-y-2">
            {referrals.map((r, i) => (
              <li key={i} className="flex items-center gap-3 rounded-xl bg-navy-600 p-3">
                <div className="grid h-9 w-9 place-items-center rounded-lg bg-emerald-500/15 text-emerald-400">
                  <Gift size={16} />
                </div>
                <div className="flex-1">
                  <p className="text-sm font-semibold text-white">Referral #{i + 1}</p>
                  <p className="text-xs text-navy-400">{new Date(r.created_at).toLocaleDateString()}</p>
                </div>
                <span className="font-display text-sm font-extrabold text-emerald-400">+{formatCurrency(Number(r.bonus_inr), currency)}</span>
              </li>
            ))}
          </ul>
        </div>
      )}
    </div>
  );
}
