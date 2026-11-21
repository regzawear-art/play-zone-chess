/*
# Add activity tracking columns to profiles and match_history

1. Modified Tables
- `profiles`: adds `last_active` (timestamptz, nullable) to track when a user was last active.
- `match_history`: adds `client_id` (text) for client-side deduplication, `played_at` (timestamptz) for when the game was played, and `record` (jsonb) for flexible per-match metadata.

2. Indexes
- Unique index `match_history_user_client` on `(user_id, client_id)` so the same client-side game cannot be inserted twice.

3. Security
- No new tables. No policy or grant changes.
- All new columns are nullable so existing rows are unaffected.
*/

ALTER TABLE public.profiles
  ADD COLUMN IF NOT EXISTS last_active timestamptz;

ALTER TABLE public.match_history
  ADD COLUMN IF NOT EXISTS client_id text,
  ADD COLUMN IF NOT EXISTS played_at timestamptz,
  ADD COLUMN IF NOT EXISTS record jsonb;

CREATE UNIQUE INDEX IF NOT EXISTS match_history_user_client
  ON public.match_history (user_id, client_id);
