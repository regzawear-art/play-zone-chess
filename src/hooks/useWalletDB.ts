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
}

export interface WalletTx {
  id: string;
  type: 'credit' | 'debit' | 'bonus' | 'referral' | 'subscription';
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

  return { balanceInr, currency, transactions, loading, refresh, processReferralBonus };
}
