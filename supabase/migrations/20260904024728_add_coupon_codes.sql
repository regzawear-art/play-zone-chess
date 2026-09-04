/*
# Add Coupon Codes for Wallet Redemption

1. Purpose
   This migration adds a `coupon_codes` table that stores redeemable coupon codes.
   Users can enter a coupon code in the wallet modal to credit their balance.
   Each coupon has a fixed INR amount, a max redemption count, and tracks how
   many times it has been used. A `coupon_redemptions` table records which user
   redeemed which coupon and when, preventing double redemption.

2. New Tables
   a. `coupon_codes` — catalog of redeemable codes
      - code (text, primary key) — the coupon string users enter
      - amount_inr (numeric) — amount credited on redemption
      - max_uses (int) — total times the coupon can be redeemed across all users
      - uses (int) — current redemption count
      - active (boolean) — whether the coupon is still valid
      - description (text) — admin-facing description
      - created_at (timestamptz)
   b. `coupon_redemptions` — one row per user-coupon redemption
      - id (uuid, primary key)
      - user_id (uuid, default auth.uid())
      - coupon_code (text, references coupon_codes)
      - amount_inr (numeric) — amount credited
      - created_at (timestamptz)
      - UNIQUE(user_id, coupon_code) — prevents double redemption

3. Security (RLS)
   - coupon_codes: readable by authenticated users (so they can check validity).
     INSERT/UPDATE/DELETE disabled for authenticated (admin-only via service role).
   - coupon_redemptions: owner can SELECT and INSERT only their own rows.

4. Notes
   - The redemption flow: frontend checks code validity + not-already-redeemed,
     then inserts a redemption row, increments coupon uses, credits wallet, and
     records a transaction. All done client-side since RLS enforces ownership.
   - The transaction type CHECK constraint is updated to include 'coupon'.
*/

-- ===== COUPON CODES =====
CREATE TABLE IF NOT EXISTS coupon_codes (
  code text PRIMARY KEY,
  amount_inr numeric NOT NULL DEFAULT 0,
  max_uses int NOT NULL DEFAULT 1,
  uses int NOT NULL DEFAULT 0,
  active boolean NOT NULL DEFAULT true,
  description text NOT NULL DEFAULT '',
  created_at timestamptz DEFAULT now()
);

ALTER TABLE coupon_codes ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "select_coupon_codes" ON coupon_codes;
CREATE POLICY "select_coupon_codes" ON coupon_codes FOR SELECT
  TO authenticated USING (true);

-- ===== COUPON REDEMPTIONS =====
CREATE TABLE IF NOT EXISTS coupon_redemptions (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL DEFAULT auth.uid() REFERENCES auth.users(id) ON DELETE CASCADE,
  coupon_code text NOT NULL REFERENCES coupon_codes(code),
  amount_inr numeric NOT NULL DEFAULT 0,
  created_at timestamptz DEFAULT now(),
  UNIQUE(user_id, coupon_code)
);

ALTER TABLE coupon_redemptions ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "select_own_redemptions" ON coupon_redemptions;
CREATE POLICY "select_own_redemptions" ON coupon_redemptions FOR SELECT
  TO authenticated USING (auth.uid() = user_id);

DROP POLICY IF EXISTS "insert_own_redemptions" ON coupon_redemptions;
CREATE POLICY "insert_own_redemptions" ON coupon_redemptions FOR INSERT
  TO authenticated WITH CHECK (auth.uid() = user_id);

CREATE INDEX IF NOT EXISTS idx_coupon_redemptions_user_id ON coupon_redemptions(user_id);

-- Add 'coupon' to the transactions type CHECK constraint
DO $$
BEGIN
  IF EXISTS (
    SELECT 1 FROM information_schema.table_constraints
    WHERE constraint_name = 'transactions_type_check'
    AND table_name = 'transactions'
  ) THEN
    ALTER TABLE transactions DROP CONSTRAINT transactions_type_check;
  END IF;
END $$;

ALTER TABLE transactions ADD CONSTRAINT transactions_type_check
  CHECK (type IN ('credit','debit','bonus','referral','subscription','coupon'));

-- Seed a few demo coupons
INSERT INTO coupon_codes (code, amount_inr, max_uses, description) VALUES
  ('WELCOME100', 100, 1000, 'Welcome bonus coupon'),
  ('CHESS500', 500, 100, 'Mid-tier bonus coupon'),
  ('GRANDMASTER', 2000, 10, 'Premium bonus coupon')
ON CONFLICT (code) DO NOTHING;
