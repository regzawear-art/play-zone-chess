import { useCallback, useEffect, useState } from 'react';
import { supabase } from '@/lib/supabase';
import type { AppUser } from '@/lib/supabase';
import { getStoredCurrency } from '@/data/countries';

export interface WalletDB {
  balanceInr: number;
  currency: string;
  transactions: WalletTx[];
  loading: boolean;
  refresh: () => Promise<void>;
  processReferralBonus: (referredEmail: string) => Promise<void>;
  redeemCoupon: (code: string) => Promise<{ success: boolean; message: string }>;
}

export interface WalletTx {
  id: string;
  type: 'credit' | 'debit' | 'bonus' | 'referral' | 'subscription' | 'coupon';
  amountInr: number;
  description: string;
  createdAt: string;
}

const REFERRAL_BONUS = 999;

export function useWalletDB(authUser: AppUser | null): WalletDB {
  const [balanceInr, setBalanceInr] = useState(0);
  const [currency, setCurrency] = useState(getStoredCurrency());
  const [transactions, setTransactions] = useState<WalletTx[]>([]);
  const [loading, setLoading] = useState(true);

  const refresh = useCallback(async () => {
    if (!authUser) {
      setBalanceInr(0);
      setTransactions([]);
      setLoading(false);
      return;
    }
    setLoading(true);
    const { data: wallet } = await supabase
      .from('wallets')
      .select('balance_inr, currency')
      .eq('user_id', authUser.id)
      .maybeSingle();

    if (wallet) {
      setBalanceInr(Number(wallet.balance_inr) || 0);
      setCurrency(wallet.currency || getStoredCurrency());
    } else {
      const { data: created } = await supabase
        .from('wallets')
        .insert({ user_id: authUser.id, balance_inr: 50, currency: getStoredCurrency() })
        .select()
        .maybeSingle();
      if (created) {
        setBalanceInr(Number(created.balance_inr) || 50);
        setCurrency(created.currency);
        await supabase.from('transactions').insert({
          user_id: authUser.id,
          type: 'bonus',
          amount_inr: 50,
          description: 'Welcome bonus',
        });
      }
    }

    const { data: txData } = await supabase
      .from('transactions')
      .select('id, type, amount_inr, description, created_at')
      .eq('user_id', authUser.id)
      .order('created_at', { ascending: false })
      .limit(50);

    if (txData) {
      setTransactions(txData.map((t) => ({
        id: t.id,
        type: t.type,
        amountInr: Number(t.amount_inr) || 0,
        description: t.description,
        createdAt: t.created_at,
      })));
    }
    setLoading(false);
  }, [authUser]);

  useEffect(() => {
    refresh();
  }, [refresh]);

  const processReferralBonus = useCallback(async (referredEmail: string) => {
    if (!authUser) return;
    const { data: wallet } = await supabase
      .from('wallets')
      .select('balance_inr')
      .eq('user_id', authUser.id)
      .maybeSingle();
    if (!wallet) return;
    await supabase.from('wallets').update({
      balance_inr: Number(wallet.balance_inr) + REFERRAL_BONUS,
      updated_at: new Date().toISOString(),
    }).eq('user_id', authUser.id);
    await supabase.from('transactions').insert({
      user_id: authUser.id,
      type: 'referral',
      amount_inr: REFERRAL_BONUS,
      description: `Referral bonus for inviting ${referredEmail}`,
    });
    await refresh();
  }, [authUser, refresh]);

  const redeemCoupon = useCallback(async (code: string): Promise<{ success: boolean; message: string }> => {
    if (!authUser) return { success: false, message: 'Please sign in to redeem a coupon.' };
    const normalized = code.trim().toUpperCase();
    if (!normalized) return { success: false, message: 'Please enter a coupon code.' };

    // Check if already redeemed
    const { data: existing } = await supabase
      .from('coupon_redemptions')
      .select('id')
      .eq('user_id', authUser.id)
      .eq('coupon_code', normalized)
      .maybeSingle();
    if (existing) return { success: false, message: 'You have already redeemed this coupon.' };

    // Look up the coupon
    const { data: coupon, error: couponErr } = await supabase
      .from('coupon_codes')
      .select('code, amount_inr, max_uses, uses, active')
      .eq('code', normalized)
      .maybeSingle();
    if (couponErr || !coupon) return { success: false, message: 'Invalid coupon code.' };
    if (!coupon.active) return { success: false, message: 'This coupon is no longer active.' };
    if (coupon.uses >= coupon.max_uses) return { success: false, message: 'This coupon has reached its redemption limit.' };

    // Credit the wallet
    const { data: wallet } = await supabase
      .from('wallets')
      .select('balance_inr')
      .eq('user_id', authUser.id)
      .maybeSingle();
    if (!wallet) return { success: false, message: 'Wallet not found. Please try again.' };

    const newBalance = Number(wallet.balance_inr) + Number(coupon.amount_inr);
    const { error: updateErr } = await supabase.from('wallets').update({
      balance_inr: newBalance,
      updated_at: new Date().toISOString(),
    }).eq('user_id', authUser.id);
    if (updateErr) return { success: false, message: 'Failed to update wallet balance.' };

    // Record the redemption
    const { error: redeemErr } = await supabase.from('coupon_redemptions').insert({
      user_id: authUser.id,
      coupon_code: normalized,
      amount_inr: Number(coupon.amount_inr),
    });
    if (redeemErr) {
      // Refund the wallet if redemption record failed
      await supabase.from('wallets').update({
        balance_inr: Number(wallet.balance_inr),
        updated_at: new Date().toISOString(),
      }).eq('user_id', authUser.id);
      if (redeemErr.code === '23505') return { success: false, message: 'You have already redeemed this coupon.' };
      return { success: false, message: 'Failed to record redemption.' };
    }

    // Increment the coupon uses count
    await supabase.from('coupon_codes')
      .update({ uses: coupon.uses + 1 })
      .eq('code', normalized);

    // Record the transaction
    await supabase.from('transactions').insert({
      user_id: authUser.id,
      type: 'coupon',
      amount_inr: Number(coupon.amount_inr),
      description: `Coupon redeemed: ${normalized}`,
    });

    await refresh();
    return { success: true, message: `Coupon redeemed successfully! ${coupon.amount_inr} credited to your wallet.` };
  }, [authUser, refresh]);

  return { balanceInr, currency, transactions, loading, refresh, processReferralBonus, redeemCoupon };
}
