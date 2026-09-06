-- Migration: create online_games and online_game_moves tables
-- Run this in Supabase SQL editor or via psql against your project's database

CREATE TABLE IF NOT EXISTS online_games (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  host_id uuid NOT NULL,
  guest_id uuid NULL,
  time_control text NOT NULL DEFAULT '3min',
  turn text NULL,
  status text NOT NULL DEFAULT 'pending',
  winner text NULL,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS online_game_moves (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  game_id uuid NOT NULL,
  player_id uuid NOT NULL,
  from_row int NOT NULL,
  from_col int NOT NULL,
  to_row int NOT NULL,
  to_col int NOT NULL,
  promotion text NULL,
  san text NULL,
  created_at timestamptz NOT NULL DEFAULT now()
);

-- Indexes
CREATE INDEX IF NOT EXISTS idx_online_games_host ON online_games (host_id);
CREATE INDEX IF NOT EXISTS idx_online_games_guest ON online_games (guest_id);
CREATE INDEX IF NOT EXISTS idx_online_game_moves_game ON online_game_moves (game_id);

-- Note: add RLS policies as needed in Supabase console to allow authenticated access.
