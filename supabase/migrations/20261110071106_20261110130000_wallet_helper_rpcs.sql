-- Wallet helper RPCs for welcome bonus and referral processing

CREATE OR REPLACE FUNCTION claim_welcome_bonus()
RETURNS json
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_uid uuid := auth.uid();
BEGIN
  IF v_uid IS NULL THEN
    RETURN json_build_object('success', false, 'message', 'Please sign in first.');
  END IF;
  INSERT INTO wallets (user_id, balance_inr, currency)
  VALUES (v_uid, 50, 'INR')
  ON CONFLICT (user_id) DO NOTHING;
  INSERT INTO transactions (user_id, type, amount_inr, description)
  VALUES (v_uid, 'bonus', 50, 'Welcome bonus');
  RETURN json_build_object('success', true, 'message', 'Welcome bonus credited!');
END;
$$;

CREATE OR REPLACE FUNCTION process_referral_bonus(p_referred_id uuid, p_referral_code text, p_referred_email text)
RETURNS json
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_uid uuid := auth.uid();
  v_bonus numeric := 999;
BEGIN
  IF v_uid IS NULL THEN
    RETURN json_build_object('success', false, 'message', 'Please sign in first.');
  END IF;
  IF p_referred_id IS NULL THEN
    RETURN json_build_object('success', false, 'message', 'Invalid referred user.');
  END IF;
  IF p_referred_id = v_uid THEN
    RETURN json_build_object('success', false, 'message', 'You cannot refer yourself.');
  END IF;
  IF EXISTS (SELECT 1 FROM referrals WHERE referrer_id = v_uid AND referred_id = p_referred_id) THEN
    RETURN json_build_object('success', false, 'message', 'You have already referred this user.');
  END IF;
  INSERT INTO referrals (referrer_id, referred_id, referral_code, bonus_inr, status)
  VALUES (v_uid, p_referred_id, p_referral_code, v_bonus, 'completed');
  INSERT INTO wallets (user_id, balance_inr, currency)
  VALUES (v_uid, 0, 'INR')
  ON CONFLICT (user_id) DO NOTHING;
  UPDATE wallets SET balance_inr = balance_inr + v_bonus, updated_at = now() WHERE user_id = v_uid;
  INSERT INTO transactions (user_id, type, amount_inr, description)
  VALUES (v_uid, 'referral', v_bonus, 'Referral bonus for inviting ' || COALESCE(p_referred_email, p_referred_id::text));
  RETURN json_build_object('success', true, 'message', 'Referral bonus credited!');
END;
$$;

REVOKE ALL ON FUNCTION claim_welcome_bonus() FROM PUBLIC, anon;
REVOKE ALL ON FUNCTION process_referral_bonus(uuid, text, text) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION claim_welcome_bonus() TO authenticated;
GRANT EXECUTE ON FUNCTION process_referral_bonus(uuid, text, text) TO authenticated;