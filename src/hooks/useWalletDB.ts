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
  processReferralBonus: (referredEmail: string, referredId?: string, referralCode?: string) => Promise<void>;
  redeemCoupon: (code: string) => Promise<{ success: boolean; message: string }>;
}

export interface WalletTx {
  id: string;
  type: 'credit' | 'debit' | 'bonus' | 'referral' | 'subscription' | 'coupon';
  amountInr: number;
  description: string;
  createdAt: string;
}

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
      const { data: result } = await supabase.rpc('claim_welcome_bonus');
      if (result?.success) {
        const { data: newWallet } = await supabase
          .from('wallets')
          .select('balance_inr, currency')
          .eq('user_id', authUser.id)
          .maybeSingle();
        if (newWallet) {
          setBalanceInr(Number(newWallet.balance_inr) || 0);
          setCurrency(newWallet.currency || getStoredCurrency());
        }
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

  const processReferralBonus = useCallback(async (referredEmail: string, referredId?: string, referralCode?: string) => {
    if (!authUser) return;
    const { data: result } = await supabase.rpc('process_referral_bonus', {
      p_referred_id: referredId ?? null,
      p_referral_code: referralCode ?? '',
      p_referred_email: referredEmail,
    });
    if (result?.success) {
      await refresh();
    }
  }, [authUser, refresh]);

  const redeemCoupon = useCallback(async (code: string): Promise<{ success: boolean; message: string }> => {
    if (!authUser) return { success: false, message: 'Please sign in to redeem a coupon.' };
    const { data: result } = await supabase.rpc('redeem_coupon', { p_code: code });
    if (result) {
      if (result.success) await refresh();
      return { success: result.success, message: result.message ?? 'Redemption failed.' };
    }
    return { success: false, message: 'Failed to redeem coupon. Please try again.' };
  }, [authUser, refresh]);

  return { balanceInr, currency, transactions, loading, refresh, processReferralBonus, redeemCoupon };
}
