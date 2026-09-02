import { useCallback, useEffect, useState } from 'react';
import type { WalletState, WalletTransaction } from '../game/types';

const STORAGE_KEY = 'gambit_wallet';
const BONUS_AMOUNT = 50.00;

function loadWallet(): WalletState {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (raw) return JSON.parse(raw);
  } catch {}
  return { balance: 0, transactions: [] };
}

function saveWallet(state: WalletState) {
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(state));
  } catch {}
}

let txCounter = Date.now();

export function useWallet() {
  const [wallet, setWallet] = useState<WalletState>(loadWallet);

  useEffect(() => {
    saveWallet(wallet);
  }, [wallet]);

  const creditBonus = useCallback((description: string = 'Welcome bonus') => {
    const tx: WalletTransaction = {
      id: txCounter++,
      date: Date.now(),
      type: 'bonus',
      amount: BONUS_AMOUNT,
      description,
    };
    setWallet((w) => ({
      balance: +(w.balance + BONUS_AMOUNT).toFixed(2),
      transactions: [tx, ...w.transactions],
    }));
  }, []);

  const debit = useCallback((amount: number, description: string) => {
    const tx: WalletTransaction = {
      id: txCounter++,
      date: Date.now(),
      type: 'debit',
      amount,
      description,
    };
    setWallet((w) => ({
      balance: +(Math.max(0, w.balance - amount)).toFixed(2),
      transactions: [tx, ...w.transactions],
    }));
  }, []);

  const credit = useCallback((amount: number, description: string) => {
    const tx: WalletTransaction = {
      id: txCounter++,
      date: Date.now(),
      type: 'credit',
      amount,
      description,
    };
    setWallet((w) => ({
      balance: +(w.balance + amount).toFixed(2),
      transactions: [tx, ...w.transactions],
    }));
  }, []);

  return { wallet, creditBonus, debit, credit };
}
