-- Migration: create friends, invites, and games tables with basic RLS policies
-- Run this in Supabase SQL editor or via psql against your project's database

-- FRIENDS table
CREATE TABLE IF NOT EXISTS friends (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL,
  friend_id uuid NOT NULL,
  status text NOT NULL DEFAULT 'pending', -- pending, accepted, blocked
  created_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (user_id, friend_id)
);

-- INVITES table
CREATE TABLE IF NOT EXISTS invites (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  from_user uuid NOT NULL,
  to_user uuid NOT NULL,
  game_id uuid NULL,
  status text NOT NULL DEFAULT 'pending', -- pending, accepted, rejected, expired
  payload jsonb DEFAULT '{}'::jsonb,
  created_at timestamptz NOT NULL DEFAULT now()
);

-- GAMES table
CREATE TABLE IF NOT EXISTS games (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  white_id uuid NOT NULL,
  black_id uuid NOT NULL,
  fen text NOT NULL DEFAULT 'startpos',
  moves jsonb NOT NULL DEFAULT '[]'::jsonb,
  status text NOT NULL DEFAULT 'pending', -- pending, active, finished
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

-- Enable Row Level Security
ALTER TABLE friends ENABLE ROW LEVEL SECURITY;
ALTER TABLE invites ENABLE ROW LEVEL SECURITY;
ALTER TABLE games ENABLE ROW LEVEL SECURITY;

-- Policies: friends - participants may read rows where they are part of the pair
CREATE POLICY "friends_select_participant" ON friends
FOR SELECT USING (user_id = auth.uid() OR friend_id = auth.uid());

CREATE POLICY "friends_insert_self" ON friends
FOR INSERT WITH CHECK (user_id = auth.uid());

CREATE POLICY "friends_update_participant" ON friends
FOR UPDATE USING (user_id = auth.uid() OR friend_id = auth.uid()) WITH CHECK (user_id = auth.uid() OR friend_id = auth.uid());

-- Policies: invites - only sender or recipient can see/modify
CREATE POLICY "invites_select_participant" ON invites
FOR SELECT USING (from_user = auth.uid() OR to_user = auth.uid());

CREATE POLICY "invites_insert_sender" ON invites
FOR INSERT WITH CHECK (from_user = auth.uid());

CREATE POLICY "invites_update_participant" ON invites
FOR UPDATE USING (from_user = auth.uid() OR to_user = auth.uid()) WITH CHECK (from_user = auth.uid() OR to_user = auth.uid());

-- Policies: games - only participants can read/update
CREATE POLICY "games_select_participant" ON games
FOR SELECT USING (white_id = auth.uid() OR black_id = auth.uid());

CREATE POLICY "games_insert_participant" ON games
FOR INSERT WITH CHECK (white_id = auth.uid() OR black_id = auth.uid());

CREATE POLICY "games_update_participant" ON games
FOR UPDATE USING (white_id = auth.uid() OR black_id = auth.uid()) WITH CHECK (white_id = auth.uid() OR black_id = auth.uid());

-- Indexes for quick lookups
CREATE INDEX IF NOT EXISTS idx_invites_to_user ON invites (to_user);
CREATE INDEX IF NOT EXISTS idx_invites_from_user ON invites (from_user);
CREATE INDEX IF NOT EXISTS idx_games_white ON games (white_id);
CREATE INDEX IF NOT EXISTS idx_games_black ON games (black_id);

-- End migration
