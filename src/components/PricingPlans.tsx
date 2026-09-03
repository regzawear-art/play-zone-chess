import { useEffect, useState } from 'react';
import { Crown, Check, Loader2, Zap, Calendar, CalendarDays, CalendarClock, Sparkles } from 'lucide-react';
import { supabase } from '@/lib/supabase';
import { formatCurrency, getStoredCurrency } from '@/data/countries';

interface Plan {
  id: string;
  name: string;
  price_inr: number;
  duration_days: number;
  description: string;
  features: string[];
}

interface Props {
  userId: string | null;
  onLogin: () => void;
}

export function PricingPlans({ userId, onLogin }: Props) {
  const [plans, setPlans] = useState<Plan[]>([]);
  const [activePlan, setActivePlan] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [subscribing, setSubscribing] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);
  const currency = getStoredCurrency();

  useEffect(() => {
    loadPlans();
  }, []);

  useEffect(() => {
    if (userId) loadActiveSubscription();
    else setActivePlan(null);
  }, [userId]);

  const loadPlans = async () => {
    const { data } = await supabase.from('subscription_plans').select('*').order('price_inr', { ascending: true });
    if (data) setPlans(data as Plan[]);
    setLoading(false);
  };

  const loadActiveSubscription = async () => {
    if (!userId) return;
    const { data } = await supabase
      .from('subscriptions')
      .select('plan_id, status, expires_at')
      .eq('user_id', userId)
      .eq('status', 'active')
      .order('created_at', { ascending: false })
      .limit(1)
      .maybeSingle();
    if (data) setActivePlan(data.plan_id);
  };

  const handleSubscribe = async (plan: Plan) => {
    if (!userId) { onLogin(); return; }
    if (plan.id === 'free') return;
    setError(null);
    setSuccess(null);
    setSubscribing(plan.id);
    try {
      const expiresAt = new Date(Date.now() + plan.duration_days * 86400000).toISOString();
      const { error: subErr } = await supabase.from('subscriptions').insert({
        user_id: userId,
        plan_id: plan.id,
        status: 'active',
        started_at: new Date().toISOString(),
        expires_at: expiresAt,
        price_paid_inr: plan.price_inr,
      });
      if (subErr) throw subErr;
      await supabase.from('transactions').insert({
        user_id: userId,
        type: 'subscription',
        amount_inr: plan.price_inr,
        description: `Subscription: ${plan.name} plan`,
      });
      const { data: wallet } = await supabase.from('wallets').select('balance_inr').eq('user_id', userId).maybeSingle();
      if (wallet) {
        await supabase.from('wallets').update({
          balance_inr: Math.max(0, wallet.balance_inr - plan.price_inr),
          updated_at: new Date().toISOString(),
        }).eq('user_id', userId);
      }
      setActivePlan(plan.id);
      setSuccess(`Successfully subscribed to the ${plan.name} plan!`);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to subscribe. Please try again.');
    } finally {
      setSubscribing(null);
    }
  };

  if (loading) {
    return (
      <div className="flex justify-center py-12">
        <Loader2 size={28} className="animate-spin text-royal-400" />
      </div>
    );
  }

  const planIcons: Record<string, typeof Crown> = {
    free: Sparkles, daily: Zap, weekly: Calendar, monthly: CalendarDays, yearly: Crown,
  };

  return (
    <div>
      {error && (
        <div className="mx-auto mb-6 max-w-md rounded-xl bg-red-500/10 px-4 py-3 text-center text-sm font-semibold text-red-400">{error}</div>
      )}
      {success && (
        <div className="mx-auto mb-6 max-w-md rounded-xl bg-emerald-500/10 px-4 py-3 text-center text-sm font-semibold text-emerald-400">{success}</div>
      )}

      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-5">
        {plans.map((plan) => {
          const Icon = planIcons[plan.id] ?? Crown;
          const isFree = plan.id === 'free';
          const isActive = activePlan === plan.id;
          const isBest = plan.id === 'yearly';
          return (
            <div
              key={plan.id}
              className={`relative flex flex-col rounded-2xl border p-5 transition-all ${
                isActive
                  ? 'border-royal-400 bg-royal-500/10 shadow-glow-sm'
                  : isBest
                    ? 'border-amber-400/40 bg-gradient-to-b from-amber-500/5 to-transparent'
                    : 'border-white/10 bg-navy-700/50 hover:border-white/20'
              }`}
            >
              {isBest && (
                <span className="absolute -top-3 left-1/2 -translate-x-1/2 rounded-full bg-amber-grad px-3 py-1 text-xs font-bold text-white shadow-glow-sm">
                  BEST VALUE
                </span>
              )}
              <div className={`mb-3 grid h-11 w-11 place-items-center rounded-xl ${isFree ? 'bg-navy-600' : isBest ? 'bg-amber-500/15' : 'bg-royal-500/15'}`}>
                <Icon size={22} className={isBest ? 'text-amber-400' : 'text-royal-400'} />
              </div>
              <h3 className="font-display text-lg font-extrabold text-white">{plan.name}</h3>
              <p className="mt-0.5 text-xs text-navy-300">{plan.description}</p>
              <div className="mt-3">
                <span className="font-display text-3xl font-extrabold text-white">
                  {isFree ? 'Free' : formatCurrency(plan.price_inr, currency)}
                </span>
                {!isFree && <span className="text-sm text-navy-400"> /{plan.duration_days === 1 ? 'day' : plan.duration_days === 7 ? 'week' : plan.duration_days === 30 ? 'month' : 'year'}</span>}
              </div>

              <ul className="mt-4 space-y-2 flex-1">
                {plan.features.map((f, i) => (
                  <li key={i} className="flex items-start gap-2 text-sm text-navy-200">
                    <Check size={15} className={`mt-0.5 shrink-0 ${isBest ? 'text-amber-400' : 'text-emerald-400'}`} />
                    <span>{f}</span>
                  </li>
                ))}
              </ul>

              <button
                onClick={() => handleSubscribe(plan)}
                disabled={isFree || isActive || subscribing === plan.id}
                className={`mt-4 w-full rounded-xl py-2.5 text-sm font-bold transition-all disabled:cursor-not-allowed disabled:opacity-60 ${
                  isActive
                    ? 'bg-emerald-500/15 text-emerald-400'
                    : isBest
                      ? 'bg-amber-grad text-white shadow-glow-sm hover:translate-y-[-1px]'
                      : isFree
                        ? 'bg-navy-600 text-navy-300'
                        : 'bg-blue-grad text-white shadow-glow-sm hover:translate-y-[-1px]'
                }`}
              >
                {subscribing === plan.id ? (
                  <><Loader2 size={16} className="animate-spin inline" /> Subscribing...</>
                ) : isActive ? (
                  'Current Plan'
                ) : isFree ? (
                  'Default'
                ) : (
                  `Subscribe ${formatCurrency(plan.price_inr, currency)}`
                )}
              </button>
            </div>
          );
        })}
      </div>
    </div>
  );
}
