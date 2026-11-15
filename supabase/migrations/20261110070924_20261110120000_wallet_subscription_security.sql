-- v51: Wallet & subscription security
DROP POLICY IF EXISTS "update_own_wallet" ON wallets;
DROP POLICY IF EXISTS "insert_own_wallet" ON wallets;
CREATE POLICY "insert_own_wallet" ON wallets FOR INSERT
  TO authenticated WITH CHECK (auth.uid() = user_id AND balance_inr = 0);

DROP POLICY IF EXISTS "insert_own_transactions" ON transactions;
DROP POLICY IF EXISTS "insert_own_subscriptions" ON subscriptions;
DROP POLICY IF EXISTS "insert_own_referrals" ON referrals;
DROP POLICY IF EXISTS "insert_own_redemptions" ON coupon_redemptions;

REVOKE UPDATE, DELETE ON wallets FROM anon, authenticated;
REVOKE INSERT, UPDATE, DELETE ON transactions, subscriptions, referrals, coupon_redemptions FROM anon, authenticated;
REVOKE INSERT, UPDATE, DELETE ON coupon_codes FROM anon, authenticated;

CREATE OR REPLACE FUNCTION redeem_coupon(p_code text)
RETURNS json
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_uid uuid := auth.uid();
  v_code text := upper(trim(coalesce(p_code, '')));
  v_coupon coupon_codes%ROWTYPE;
BEGIN
  IF v_uid IS NULL THEN
    RETURN json_build_object('success', false, 'message', 'Please sign in to redeem a coupon.');
  END IF;
  IF v_code = '' THEN
    RETURN json_build_object('success', false, 'message', 'Please enter a coupon code.');
  END IF;
  SELECT * INTO v_coupon FROM coupon_codes WHERE code = v_code FOR UPDATE;
  IF NOT FOUND THEN
    RETURN json_build_object('success', false, 'message', 'Invalid coupon code.');
  END IF;
  IF NOT v_coupon.active THEN
    RETURN json_build_object('success', false, 'message', 'This coupon is no longer active.');
  END IF;
  IF v_coupon.uses >= v_coupon.max_uses THEN
    RETURN json_build_object('success', false, 'message', 'This coupon has reached its redemption limit.');
  END IF;
  IF EXISTS (SELECT 1 FROM coupon_redemptions WHERE user_id = v_uid AND coupon_code = v_code) THEN
    RETURN json_build_object('success', false, 'message', 'You have already redeemed this coupon.');
  END IF;
  INSERT INTO coupon_redemptions (user_id, coupon_code, amount_inr) VALUES (v_uid, v_code, v_coupon.amount_inr);
  UPDATE coupon_codes SET uses = uses + 1 WHERE code = v_code;
  INSERT INTO wallets (user_id, balance_inr) VALUES (v_uid, 0) ON CONFLICT (user_id) DO NOTHING;
  UPDATE wallets SET balance_inr = balance_inr + v_coupon.amount_inr, updated_at = now() WHERE user_id = v_uid;
  INSERT INTO transactions (user_id, type, amount_inr, description)
  VALUES (v_uid, 'coupon', v_coupon.amount_inr, 'Coupon redeemed: ' || v_code);
  RETURN json_build_object('success', true, 'amount', v_coupon.amount_inr,
    'message', 'Coupon redeemed successfully! ' || v_coupon.amount_inr || ' credited to your wallet.');
END;
$$;

CREATE OR REPLACE FUNCTION subscribe_with_wallet(p_plan text)
RETURNS json
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_uid uuid := auth.uid();
  v_plan subscription_plans%ROWTYPE;
  v_balance numeric;
  v_expires timestamptz;
BEGIN
  IF v_uid IS NULL THEN
    RETURN json_build_object('success', false, 'message', 'Please sign in first.');
  END IF;
  SELECT * INTO v_plan FROM subscription_plans WHERE id = p_plan;
  IF NOT FOUND OR v_plan.price_inr <= 0 THEN
    RETURN json_build_object('success', false, 'message', 'Invalid plan.');
  END IF;
  INSERT INTO wallets (user_id, balance_inr) VALUES (v_uid, 0) ON CONFLICT (user_id) DO NOTHING;
  SELECT balance_inr INTO v_balance FROM wallets WHERE user_id = v_uid FOR UPDATE;
  IF v_balance < v_plan.price_inr THEN
    RETURN json_build_object('success', false, 'code', 'insufficient',
      'message', 'Not enough wallet balance. Online payment is coming soon.');
  END IF;
  v_expires := now() + make_interval(days => v_plan.duration_days);
  UPDATE wallets SET balance_inr = balance_inr - v_plan.price_inr, updated_at = now() WHERE user_id = v_uid;
  INSERT INTO subscriptions (user_id, plan_id, status, started_at, expires_at, price_paid_inr)
  VALUES (v_uid, v_plan.id, 'active', now(), v_expires, v_plan.price_inr);
  INSERT INTO transactions (user_id, type, amount_inr, description)
  VALUES (v_uid, 'subscription', v_plan.price_inr, 'Subscription: ' || v_plan.name || ' plan');
  RETURN json_build_object('success', true, 'expires_at', v_expires,
    'message', 'Successfully subscribed to the ' || v_plan.name || ' plan!');
END;
$$;

REVOKE ALL ON FUNCTION redeem_coupon(text) FROM PUBLIC, anon;
REVOKE ALL ON FUNCTION subscribe_with_wallet(text) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION redeem_coupon(text) TO authenticated;
GRANT EXECUTE ON FUNCTION subscribe_with_wallet(text) TO authenticated;