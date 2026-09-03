/*
# Add Wallet, Subscriptions, Referrals, and Transactions tables

1. Purpose
   This migration adds the financial infrastructure for the chess platform:
   - User wallet with INR balance support
   - Subscription plans and active subscriptions
   - Referral system with ₹999 bonus per successful referral
   - Transaction history for all wallet movements

2. New Tables

   a. `wallets` — one wallet per user with INR balance and display currency
   b. `transactions` — all wallet movements (credit, debit, bonus, referral, subscription)
   c. `subscription_plans` — catalog of 5 plan tiers (free, daily, weekly, monthly, yearly)
   d. `subscriptions` — active/past subscriptions per user
   e. `referrals` — referral records linking referrer and referred users with ₹999 bonus

3. Security (RLS)
   - All tables have RLS enabled.
   - Wallets: owner can SELECT, UPDATE, INSERT only their own row.
   - Transactions: owner can SELECT and INSERT only their own rows.
   - Subscription plans: readable by all (anon + authenticated) — catalog data.
   - Subscriptions: owner can SELECT and INSERT only their own rows.
   - Referrals: referrer or referred can SELECT; INSERT only as referrer.

4. Notes
   - User-facing tables default user_id to auth.uid() for safe inserts.
   - Subscription plans seeded with 5 tiers.
   - All amounts stored in INR; display currency conversion happens client-side.
*/

-- ===== WALLETS =====
CREATE TABLE IF NOT EXISTS wallets (
  user_id uuid PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  balance_inr numeric DEFAULT 0 NOT NULL,
  currency text DEFAULT 'INR' NOT NULL,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

ALTER TABLE wallets ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "select_own_wallet" ON wallets;
CREATE POLICY "select_own_wallet" ON wallets FOR SELECT
  TO authenticated USING (auth.uid() = user_id);

DROP POLICY IF EXISTS "insert_own_wallet" ON wallets;
CREATE POLICY "insert_own_wallet" ON wallets FOR INSERT
  TO authenticated WITH CHECK (auth.uid() = user_id);

DROP POLICY IF EXISTS "update_own_wallet" ON wallets;
CREATE POLICY "update_own_wallet" ON wallets FOR UPDATE
  TO authenticated USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);

-- ===== TRANSACTIONS =====
CREATE TABLE IF NOT EXISTS transactions (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL DEFAULT auth.uid() REFERENCES auth.users(id) ON DELETE CASCADE,
  type text NOT NULL CHECK (type IN ('credit','debit','bonus','referral','subscription')),
  amount_inr numeric NOT NULL DEFAULT 0,
  description text NOT NULL DEFAULT '',
  reference_id uuid,
  created_at timestamptz DEFAULT now()
);

ALTER TABLE transactions ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "select_own_transactions" ON transactions;
CREATE POLICY "select_own_transactions" ON transactions FOR SELECT
  TO authenticated USING (auth.uid() = user_id);

DROP POLICY IF EXISTS "insert_own_transactions" ON transactions;
CREATE POLICY "insert_own_transactions" ON transactions FOR INSERT
  TO authenticated WITH CHECK (auth.uid() = user_id);

CREATE INDEX IF NOT EXISTS idx_transactions_user_id ON transactions(user_id);
CREATE INDEX IF NOT EXISTS idx_transactions_created_at ON transactions(created_at DESC);

-- ===== SUBSCRIPTION PLANS (catalog) =====
CREATE TABLE IF NOT EXISTS subscription_plans (
  id text PRIMARY KEY,
  name text NOT NULL,
  price_inr numeric NOT NULL DEFAULT 0,
  duration_days int NOT NULL DEFAULT 0,
  description text NOT NULL DEFAULT '',
  features text[] NOT NULL DEFAULT '{}'
);

ALTER TABLE subscription_plans ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "read_subscription_plans" ON subscription_plans;
CREATE POLICY "read_subscription_plans" ON subscription_plans FOR SELECT
  TO anon, authenticated USING (true);

-- Seed plans
INSERT INTO subscription_plans (id, name, price_inr, duration_days, description, features) VALUES
  ('free', 'Free', 0, 0, 'Play AI and practice for free', ARRAY['AI gameplay','Practice mode','Basic leaderboards']),
  ('daily', 'Per Day', 49, 1, '24-hour premium access', ARRAY['Everything in Free','Online multiplayer','No ads','Tournament access']),
  ('weekly', 'Per Week', 249, 7, '7-day premium access', ARRAY['Everything in Free','Online multiplayer','No ads','Tournament access','Priority matchmaking']),
  ('monthly', 'Per Month', 499, 30, '30-day premium access', ARRAY['Everything in Free','Online multiplayer','No ads','Tournament access','Priority matchmaking','Exclusive clubs']),
  ('yearly', 'Yearly', 2500, 365, '365-day premium access — best value', ARRAY['Everything in Free','Online multiplayer','No ads','Tournament access','Priority matchmaking','Exclusive clubs','Custom board themes','2x referral bonus'])
ON CONFLICT (id) DO NOTHING;

-- ===== SUBSCRIPTIONS =====
CREATE TABLE IF NOT EXISTS subscriptions (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL DEFAULT auth.uid() REFERENCES auth.users(id) ON DELETE CASCADE,
  plan_id text NOT NULL REFERENCES subscription_plans(id),
  status text NOT NULL DEFAULT 'active' CHECK (status IN ('active','expired','cancelled')),
  started_at timestamptz DEFAULT now(),
  expires_at timestamptz,
  price_paid_inr numeric NOT NULL DEFAULT 0,
  created_at timestamptz DEFAULT now()
);

ALTER TABLE subscriptions ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "select_own_subscriptions" ON subscriptions;
CREATE POLICY "select_own_subscriptions" ON subscriptions FOR SELECT
  TO authenticated USING (auth.uid() = user_id);

DROP POLICY IF EXISTS "insert_own_subscriptions" ON subscriptions;
CREATE POLICY "insert_own_subscriptions" ON subscriptions FOR INSERT
  TO authenticated WITH CHECK (auth.uid() = user_id);

CREATE INDEX IF NOT EXISTS idx_subscriptions_user_id ON subscriptions(user_id);

-- ===== REFERRALS =====
CREATE TABLE IF NOT EXISTS referrals (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  referrer_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  referred_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  referral_code text NOT NULL DEFAULT '',
  bonus_inr numeric NOT NULL DEFAULT 999,
  status text NOT NULL DEFAULT 'completed' CHECK (status IN ('pending','completed')),
  created_at timestamptz DEFAULT now()
);

ALTER TABLE referrals ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "select_own_referrals" ON referrals;
CREATE POLICY "select_own_referrals" ON referrals FOR SELECT
  TO authenticated USING (auth.uid() = referrer_id OR auth.uid() = referred_id);

DROP POLICY IF EXISTS "insert_own_referrals" ON referrals;
CREATE POLICY "insert_own_referrals" ON referrals FOR INSERT
  TO authenticated WITH CHECK (auth.uid() = referrer_id);

CREATE INDEX IF NOT EXISTS idx_referrals_referrer_id ON referrals(referrer_id);
