-- Migration: Add RPCs for online game creation and joining, and presence column/index
-- Run this in Supabase SQL editor (as an admin). This script is idempotent where possible.

-- 1) Add last_active column to profiles (if not exists)
DO $$
BEGIN
	IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='profiles' AND column_name='last_active') THEN
		ALTER TABLE public.profiles ADD COLUMN last_active timestamptz;
		COMMENT ON COLUMN public.profiles.last_active IS 'Last heartbeat timestamp from client';
	END IF;
END$$;

-- 2) Create online_games table if not exists (safe guard)
-- Note: if your schema already has online_games, skip this block or remove it.
DO $$
BEGIN
	IF NOT EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name='online_games') THEN
		CREATE TABLE public.online_games (
			id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
			host_id uuid NOT NULL,
			guest_id uuid,
			time_control text,
			status text DEFAULT 'waiting',
			fen text DEFAULT 'startpos',
			moves jsonb DEFAULT '[]',
			payload jsonb DEFAULT '{}',
			created_at timestamptz DEFAULT now(),
			updated_at timestamptz DEFAULT now()
		);
		ALTER TABLE public.online_games OWNER TO postgres;
	END IF;
END$$;

-- 3) Create matchmaking_queue table if not exists (safe guard)
DO $$
BEGIN
	IF NOT EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name='matchmaking_queue') THEN
		CREATE TABLE public.matchmaking_queue (
			id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
			user_id uuid NOT NULL,
			time_control text,
			status text DEFAULT 'searching',
			game_id uuid,
			opponent_id uuid,
			host_id uuid,
			created_at timestamptz DEFAULT now(),
			matched_at timestamptz
		);
		ALTER TABLE public.matchmaking_queue OWNER TO postgres;
	END IF;
END$$;

-- 4) Create RPC: create_online_game(user_id uuid, p_time_control text, p_payload jsonb)
CREATE OR REPLACE FUNCTION public.create_online_game(p_user uuid, p_time_control text DEFAULT NULL, p_payload jsonb DEFAULT '{}'::jsonb)
RETURNS TABLE(id uuid, host_id uuid, guest_id uuid, time_control text, status text, fen text, moves jsonb, payload jsonb, created_at timestamptz, updated_at timestamptz)
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
	new_row RECORD;
BEGIN
	INSERT INTO public.online_games (host_id, guest_id, time_control, status, fen, moves, payload)
	VALUES (p_user, NULL, p_time_control, 'waiting', 'startpos', '[]'::jsonb, COALESCE(p_payload, '{}'::jsonb))
	RETURNING * INTO new_row;

	RETURN QUERY SELECT new_row.*;
END$$;

-- 5) Create RPC: join_online_game(p_game uuid, p_user uuid)
CREATE OR REPLACE FUNCTION public.join_online_game(p_game uuid, p_user uuid)
RETURNS TABLE(id uuid, host_id uuid, guest_id uuid, time_control text, status text, fen text, moves jsonb, payload jsonb, created_at timestamptz, updated_at timestamptz)
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
	g RECORD;
BEGIN
	SELECT * INTO g FROM public.online_games WHERE id = p_game FOR UPDATE;
	IF NOT FOUND THEN
		RAISE EXCEPTION 'game not found';
	END IF;

	IF g.guest_id IS NULL AND g.host_id IS DISTINCT FROM p_user THEN
		UPDATE public.online_games SET guest_id = p_user, status = 'active', updated_at = now() WHERE id = p_game RETURNING * INTO g;
	END IF;

	RETURN QUERY SELECT g.*;
END$$;

-- 6) Trigger to update updated_at
DO $$
BEGIN
	IF NOT EXISTS (SELECT 1 FROM information_schema.triggers WHERE event_object_table = 'online_games' AND trigger_name = 'online_games_updated_at') THEN
		CREATE OR REPLACE FUNCTION public.set_updated_at()
		RETURNS trigger LANGUAGE plpgsql AS $$
		BEGIN
			NEW.updated_at = now();
			RETURN NEW;
		END;$$;
		CREATE TRIGGER online_games_updated_at BEFORE UPDATE ON public.online_games FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();
	END IF;
END$$;

-- 7) Index on profiles.last_active
DO $$
BEGIN
	IF NOT EXISTS (SELECT 1 FROM pg_indexes WHERE tablename='profiles' AND indexname='profiles_last_active_idx') THEN
		CREATE INDEX profiles_last_active_idx ON public.profiles (last_active);
	END IF;
END$$;

-- 8) Grant execute on functions to authenticated role (supabase auth role)
GRANT EXECUTE ON FUNCTION public.create_online_game(uuid, text, jsonb) TO authenticated;
GRANT EXECUTE ON FUNCTION public.join_online_game(uuid, uuid) TO authenticated;

-- DONE

-- Note: adjust OWNER and role names as appropriate for your DB.
