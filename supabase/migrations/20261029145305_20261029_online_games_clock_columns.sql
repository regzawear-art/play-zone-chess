/*
# Add clock columns to online_games and replace join_online_game

1. Modified Tables
- `public.online_games`:
  - Adds `white_ms` (integer) — milliseconds remaining for white's clock.
  - Adds `black_ms` (integer) — milliseconds remaining for black's clock.
  - Adds `clock_updated_at` (timestamptz) — last time the clock was updated.

2. Modified Functions
- Replaces `public.join_online_game(uuid, uuid)` with a version that uses
  `#variable_conflict use_column` and aliases `online_games` as `og` so the
  new column references resolve against the table row type without conflicts.
- Grants EXECUTE on the function to `authenticated`.

3. Realtime / API
- Sends `NOTIFY pgrst, 'reload schema'` so PostgREST picks up the schema change.
*/

ALTER TABLE public.online_games
  ADD COLUMN IF NOT EXISTS white_ms integer,
  ADD COLUMN IF NOT EXISTS black_ms integer,
  ADD COLUMN IF NOT EXISTS clock_updated_at timestamptz;
DROP FUNCTION IF EXISTS public.join_online_game(uuid, uuid);
CREATE FUNCTION public.join_online_game(p_game uuid, p_user uuid)
RETURNS TABLE(id uuid, host_id uuid, guest_id uuid, time_control text, status text, fen text, moves jsonb, payload jsonb, created_at timestamptz, updated_at timestamptz)
LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
#variable_conflict use_column
DECLARE g public.online_games%ROWTYPE;
BEGIN
  IF auth.uid() IS NULL OR p_user IS DISTINCT FROM auth.uid() THEN RAISE EXCEPTION 'not authorized'; END IF;
  SELECT og.* INTO g FROM public.online_games og WHERE og.id = p_game FOR UPDATE;
  IF NOT FOUND THEN RAISE EXCEPTION 'game not found'; END IF;
  IF g.host_id = p_user THEN NULL;
  ELSIF g.guest_id IS NULL THEN
    UPDATE public.online_games og SET guest_id = p_user, status = 'active', updated_at = now() WHERE og.id = p_game RETURNING og.* INTO g;
  ELSIF g.guest_id <> p_user THEN RAISE EXCEPTION 'game is already full';
  END IF;
  RETURN QUERY SELECT g.id, g.host_id, g.guest_id, g.time_control, g.status, g.fen, g.moves, g.payload, g.created_at, g.updated_at;
END; $$;
GRANT EXECUTE ON FUNCTION public.join_online_game(uuid, uuid) TO authenticated;
NOTIFY pgrst, 'reload schema';