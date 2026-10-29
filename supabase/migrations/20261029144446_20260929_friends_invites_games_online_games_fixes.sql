/*
# Friends, invites, games tables + online_games fixes and realtime

1. New Tables
- `friends` — friend relationships between users (user_id, friend_id, status, created_at) with a unique (user_id, friend_id) constraint.
- `invites` — game invitations between users (from_user, to_user, game_id, status, payload, created_at).
- `games` — recorded games (white_id, black_id, fen, moves, status, created_at, updated_at).

2. Modified Tables
- `public.online_games`:
  - `guest_id` now nullable (DROP NOT NULL).
  - Adds `moves` (jsonb, default '[]'), `payload` (jsonb, default '{}'), `updated_at` (timestamptz, default now()).
- Replaces `create_online_game` and `join_online_game` SECURITY DEFINER functions with new signatures using auth.uid() checks.
- Adds `set_online_games_updated_at()` trigger function and `online_games_updated_at_fix` trigger to auto-refresh updated_at on UPDATE.

3. Security
- RLS enabled on `friends`, `invites`, `games`.
- Policies: participant-scoped SELECT/INSERT/UPDATE on each new table (no DELETE policy — matches the provided SQL).
- Note: the provided SQL does not include explicit GRANT statements on the new tables; Data API access relies on default role privileges. Functions grant EXECUTE to `authenticated`.

4. Indexes
- `idx_invites_to_user`, `idx_invites_from_user` on invites.
- `idx_games_white`, `idx_games_black` on games.

5. Realtime
- Adds `matchmaking_queue`, `online_games`, `invites`, `online_game_moves` to the `supabase_realtime` publication (idempotent DO block).
*/

-- friends & invites
CREATE TABLE IF NOT EXISTS friends (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL,
  friend_id uuid NOT NULL,
  status text NOT NULL DEFAULT 'pending',
  created_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (user_id, friend_id)
);

CREATE TABLE IF NOT EXISTS invites (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  from_user uuid NOT NULL,
  to_user uuid NOT NULL,
  game_id uuid NULL,
  status text NOT NULL DEFAULT 'pending',
  payload jsonb DEFAULT '{}'::jsonb,
  created_at timestamptz NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS games (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  white_id uuid NOT NULL,
  black_id uuid NOT NULL,
  fen text NOT NULL DEFAULT 'startpos',
  moves jsonb NOT NULL DEFAULT '[]'::jsonb,
  status text NOT NULL DEFAULT 'pending',
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE friends ENABLE ROW LEVEL SECURITY;
ALTER TABLE invites ENABLE ROW LEVEL SECURITY;
ALTER TABLE games ENABLE ROW LEVEL SECURITY;

CREATE POLICY "friends_select_participant" ON friends FOR SELECT USING (user_id = auth.uid() OR friend_id = auth.uid());
CREATE POLICY "friends_insert_self" ON friends FOR INSERT WITH CHECK (user_id = auth.uid());
CREATE POLICY "friends_update_participant" ON friends FOR UPDATE USING (user_id = auth.uid() OR friend_id = auth.uid()) WITH CHECK (user_id = auth.uid() OR friend_id = auth.uid());

CREATE POLICY "invites_select_participant" ON invites FOR SELECT USING (from_user = auth.uid() OR to_user = auth.uid());
CREATE POLICY "invites_insert_sender" ON invites FOR INSERT WITH CHECK (from_user = auth.uid());
CREATE POLICY "invites_update_participant" ON invites FOR UPDATE USING (from_user = auth.uid() OR to_user = auth.uid()) WITH CHECK (from_user = auth.uid() OR to_user = auth.uid());

CREATE POLICY "games_select_participant" ON games FOR SELECT USING (white_id = auth.uid() OR black_id = auth.uid());
CREATE POLICY "games_insert_participant" ON games FOR INSERT WITH CHECK (white_id = auth.uid() OR black_id = auth.uid());
CREATE POLICY "games_update_participant" ON games FOR UPDATE USING (white_id = auth.uid() OR black_id = auth.uid()) WITH CHECK (white_id = auth.uid() OR black_id = auth.uid());

CREATE INDEX IF NOT EXISTS idx_invites_to_user ON invites (to_user);
CREATE INDEX IF NOT EXISTS idx_invites_from_user ON invites (from_user);
CREATE INDEX IF NOT EXISTS idx_games_white ON games (white_id);
CREATE INDEX IF NOT EXISTS idx_games_black ON games (black_id);

-- online_games fixes
ALTER TABLE public.online_games ALTER COLUMN guest_id DROP NOT NULL;
ALTER TABLE public.online_games
  ADD COLUMN IF NOT EXISTS moves jsonb NOT NULL DEFAULT '[]'::jsonb,
  ADD COLUMN IF NOT EXISTS payload jsonb NOT NULL DEFAULT '{}'::jsonb,
  ADD COLUMN IF NOT EXISTS updated_at timestamptz NOT NULL DEFAULT now();

DROP FUNCTION IF EXISTS public.create_online_game(uuid, text, jsonb);
DROP FUNCTION IF EXISTS public.join_online_game(uuid, uuid);

CREATE FUNCTION public.create_online_game(p_user uuid, p_time_control text DEFAULT NULL, p_payload jsonb DEFAULT '{}'::jsonb)
RETURNS TABLE(id uuid, host_id uuid, guest_id uuid, time_control text, status text, fen text, moves jsonb, payload jsonb, created_at timestamptz, updated_at timestamptz)
LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE g public.online_games%ROWTYPE;
BEGIN
  IF auth.uid() IS NULL OR p_user IS DISTINCT FROM auth.uid() THEN RAISE EXCEPTION 'not authorized'; END IF;
  INSERT INTO public.online_games (host_id, guest_id, time_control, status, fen, turn, moves, payload)
  VALUES (p_user, NULL, COALESCE(p_time_control, '3min'), 'waiting', 'startpos', 'w', '[]'::jsonb, COALESCE(p_payload, '{}'::jsonb))
  RETURNING * INTO g;
  RETURN QUERY SELECT g.id, g.host_id, g.guest_id, g.time_control, g.status, g.fen, g.moves, g.payload, g.created_at, g.updated_at;
END; $$;
GRANT EXECUTE ON FUNCTION public.create_online_game(uuid, text, jsonb) TO authenticated;

CREATE FUNCTION public.join_online_game(p_game uuid, p_user uuid)
RETURNS TABLE(id uuid, host_id uuid, guest_id uuid, time_control text, status text, fen text, moves jsonb, payload jsonb, created_at timestamptz, updated_at timestamptz)
LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE g public.online_games%ROWTYPE;
BEGIN
  IF auth.uid() IS NULL OR p_user IS DISTINCT FROM auth.uid() THEN RAISE EXCEPTION 'not authorized'; END IF;
  SELECT * INTO g FROM public.online_games WHERE id = p_game FOR UPDATE;
  IF NOT FOUND THEN RAISE EXCEPTION 'game not found'; END IF;
  IF g.host_id = p_user THEN NULL;
  ELSIF g.guest_id IS NULL THEN
    UPDATE public.online_games SET guest_id = p_user, status = 'active', updated_at = now() WHERE id = p_game RETURNING * INTO g;
  ELSIF g.guest_id <> p_user THEN RAISE EXCEPTION 'game is already full';
  END IF;
  RETURN QUERY SELECT g.id, g.host_id, g.guest_id, g.time_control, g.status, g.fen, g.moves, g.payload, g.created_at, g.updated_at;
END; $$;
GRANT EXECUTE ON FUNCTION public.join_online_game(uuid, uuid) TO authenticated;

CREATE OR REPLACE FUNCTION public.set_online_games_updated_at()
RETURNS trigger LANGUAGE plpgsql AS $$
BEGIN NEW.updated_at = now(); RETURN NEW; END; $$;
DROP TRIGGER IF EXISTS online_games_updated_at_fix ON public.online_games;
CREATE TRIGGER online_games_updated_at_fix BEFORE UPDATE ON public.online_games FOR EACH ROW EXECUTE FUNCTION public.set_online_games_updated_at();

-- realtime
DO $$ BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_publication_tables WHERE pubname='supabase_realtime' AND schemaname='public' AND tablename='matchmaking_queue') THEN ALTER PUBLICATION supabase_realtime ADD TABLE public.matchmaking_queue; END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_publication_tables WHERE pubname='supabase_realtime' AND schemaname='public' AND tablename='online_games') THEN ALTER PUBLICATION supabase_realtime ADD TABLE public.online_games; END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_publication_tables WHERE pubname='supabase_realtime' AND schemaname='public' AND tablename='invites') THEN ALTER PUBLICATION supabase_realtime ADD TABLE public.invites; END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_publication_tables WHERE pubname='supabase_realtime' AND schemaname='public' AND tablename='online_game_moves') THEN ALTER PUBLICATION supabase_realtime ADD TABLE public.online_game_moves; END IF;
END $$;