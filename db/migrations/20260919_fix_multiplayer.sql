
/*
  Multiplayer reliability fix - 2026-09-19
*/

-- ============================================================
-- 1. ONLINE GAMES SCHEMA
-- ============================================================

ALTER TABLE public.online_games
  ALTER COLUMN guest_id DROP NOT NULL;

ALTER TABLE public.online_games
  ADD COLUMN IF NOT EXISTS moves jsonb NOT NULL DEFAULT '[]'::jsonb,
  ADD COLUMN IF NOT EXISTS payload jsonb NOT NULL DEFAULT '{}'::jsonb,
  ADD COLUMN IF NOT EXISTS updated_at timestamptz NOT NULL DEFAULT now();


-- ============================================================
-- 2. DROP OLD FUNCTIONS BEFORE CHANGING THEIR RETURN TYPES
-- ============================================================

DROP FUNCTION IF EXISTS public.create_online_game(uuid, text, jsonb);

DROP FUNCTION IF EXISTS public.join_online_game(uuid, uuid);


-- ============================================================
-- 3. CREATE ONLINE GAME
-- ============================================================

CREATE FUNCTION public.create_online_game(
  p_user uuid,
  p_time_control text DEFAULT NULL,
  p_payload jsonb DEFAULT '{}'::jsonb
)
RETURNS TABLE(
  id uuid,
  host_id uuid,
  guest_id uuid,
  time_control text,
  status text,
  fen text,
  moves jsonb,
  payload jsonb,
  created_at timestamptz,
  updated_at timestamptz
)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  g public.online_games%ROWTYPE;
BEGIN

  IF auth.uid() IS NULL OR p_user IS DISTINCT FROM auth.uid() THEN
    RAISE EXCEPTION 'not authorized';
  END IF;

  INSERT INTO public.online_games (
    host_id,
    guest_id,
    time_control,
    status,
    fen,
    turn,
    moves,
    payload
  )
  VALUES (
    p_user,
    NULL,
    COALESCE(p_time_control, '3min'),
    'waiting',
    'startpos',
    'w',
    '[]'::jsonb,
    COALESCE(p_payload, '{}'::jsonb)
  )
  RETURNING * INTO g;

  RETURN QUERY
  SELECT
    g.id,
    g.host_id,
    g.guest_id,
    g.time_control,
    g.status,
    g.fen,
    g.moves,
    g.payload,
    g.created_at,
    g.updated_at;

END;
$$;

GRANT EXECUTE
ON FUNCTION public.create_online_game(uuid, text, jsonb)
TO authenticated;


-- ============================================================
-- 4. JOIN ONLINE GAME
-- ============================================================

CREATE FUNCTION public.join_online_game(
  p_game uuid,
  p_user uuid
)
RETURNS TABLE(
  id uuid,
  host_id uuid,
  guest_id uuid,
  time_control text,
  status text,
  fen text,
  moves jsonb,
  payload jsonb,
  created_at timestamptz,
  updated_at timestamptz
)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  g public.online_games%ROWTYPE;
BEGIN

  IF auth.uid() IS NULL OR p_user IS DISTINCT FROM auth.uid() THEN
    RAISE EXCEPTION 'not authorized';
  END IF;

  SELECT *
  INTO g
  FROM public.online_games
  WHERE id = p_game
  FOR UPDATE;

  IF NOT FOUND THEN
    RAISE EXCEPTION 'game not found';
  END IF;

  IF g.host_id = p_user THEN

    NULL;

  ELSIF g.guest_id IS NULL THEN

    UPDATE public.online_games
    SET
      guest_id = p_user,
      status = 'active',
      updated_at = now()
    WHERE id = p_game
    RETURNING * INTO g;

  ELSIF g.guest_id <> p_user THEN

    RAISE EXCEPTION 'game is already full';

  END IF;

  RETURN QUERY
  SELECT
    g.id,
    g.host_id,
    g.guest_id,
    g.time_control,
    g.status,
    g.fen,
    g.moves,
    g.payload,
    g.created_at,
    g.updated_at;

END;
$$;

GRANT EXECUTE
ON FUNCTION public.join_online_game(uuid, uuid)
TO authenticated;


-- ============================================================
-- 5. UPDATED_AT TRIGGER
-- ============================================================

CREATE OR REPLACE FUNCTION public.set_online_games_updated_at()
RETURNS trigger
LANGUAGE plpgsql
AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS online_games_updated_at_fix
ON public.online_games;

CREATE TRIGGER online_games_updated_at_fix
BEFORE UPDATE ON public.online_games
FOR EACH ROW
EXECUTE FUNCTION public.set_online_games_updated_at();


-- ============================================================
-- 6. REALTIME
-- ============================================================

DO $$
BEGIN

  IF NOT EXISTS (
    SELECT 1
    FROM pg_publication_tables
    WHERE pubname = 'supabase_realtime'
      AND schemaname = 'public'
      AND tablename = 'matchmaking_queue'
  ) THEN
    ALTER PUBLICATION supabase_realtime
      ADD TABLE public.matchmaking_queue;
  END IF;


  IF NOT EXISTS (
    SELECT 1
    FROM pg_publication_tables
    WHERE pubname = 'supabase_realtime'
      AND schemaname = 'public'
      AND tablename = 'online_games'
  ) THEN
    ALTER PUBLICATION supabase_realtime
      ADD TABLE public.online_games;
  END IF;


  IF NOT EXISTS (
    SELECT 1
    FROM pg_publication_tables
    WHERE pubname = 'supabase_realtime'
      AND schemaname = 'public'
      AND tablename = 'invites'
  ) THEN
    ALTER PUBLICATION supabase_realtime
      ADD TABLE public.invites;
  END IF;

END;
$$;

