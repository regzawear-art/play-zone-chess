/*
# Add razorpay_subscription_id to subscriptions

1. Modified Tables
- `subscriptions`: adds `razorpay_subscription_id` text column (nullable, unique)
  so the webhook can upsert by the Razorpay subscription id without creating
  duplicate rows for the same recurring subscription.

2. Security
- No new tables. No policy changes.
- The column is nullable so existing wallet-based subscription rows are unaffected.
- A UNIQUE constraint prevents duplicate rows per Razorpay subscription.

3. Notes
- The `razorpay-webhook` edge function upserts on this column using the
  service role key (bypasses RLS).
- Frontend `create-subscription` edge function only creates the Razorpay
  subscription; it does not write to this table.
*/

ALTER TABLE subscriptions
  ADD COLUMN IF NOT EXISTS razorpay_subscription_id text;

-- Unique constraint so upserts by razorpay_subscription_id are safe.
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint
    WHERE conname = 'subscriptions_razorpay_subscription_id_key'
  ) THEN
    ALTER TABLE subscriptions
      ADD CONSTRAINT subscriptions_razorpay_subscription_id_key
      UNIQUE (razorpay_subscription_id);
  END IF;
END $$;
