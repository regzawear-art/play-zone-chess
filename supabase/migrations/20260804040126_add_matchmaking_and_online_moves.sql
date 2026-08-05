/*
# Add matchmaking queue and online game moves tables

## Purpose
Enables real-time online matchmaking between players and broadcasting/receiving
moves during online games. This completes the "Online" game mode functionality.

## New Tables

### matchmaking_queue
- Stores players currently searching for an opponent.
- `id` (uuid, PK) — row identifier.
- `user_id` (uuid, not null, defaults to auth.uid()) — the player searching.
- `time_control` (text) — desired time control (e.g. '3min').
- `status` (text) — 'searching' | 'matched'.
- `game_id` (uuid, nullable) — links to the online_games row once matched.
- `opponent_id` (uuid, nullable) — the matched opponent.
- `created_at` (timestamptz) — when the search started.
- `matched_at` (timestamptz, nullable) — when a match was found.

### online_games
- Stores a live online game session between two matched players.
- `id` (uuid, PK) — game identifier.
- `host_id` (uuid, not null) — white player (first in queue).
- `guest_id` (uuid, not null) — black player (second in queue).
- `time_control` (text) — game time control.
- `status` (text) — 'active' | 'completed'.
- `fen` (text, nullable) — current board FEN (for reconnection support).
- `turn` (text) — 'w' | 'b', whose move it is.
- `winner` (text, nullable) — 'w' | 'b' | null (null = draw/ongoing).
- `created_at` (timestamptz) — game start time.

### online_game_moves
- Stores each move made during an online game.
- `id` (uuid, PK) — move identifier.
- `game_id` (uuid, FK to online_games) — which game this move belongs to.
- `move_number` (int) — sequential move number (1-indexed).
- `from_row` (int), `from_col` (int) — source square.
- `to_row` (int), `to_col` (int) — destination square.
- `promotion` (text, nullable) — promotion piece type if applicable.
- `player_id` (uuid) — which user made the move.
- `san` (text) — algebraic notation for display.
- `created_at` (timestamptz) — when the move was made.

## Security
- RLS enabled on all three tables.
- matchmaking_queue: authenticated users can insert their own search, read
  searching entries (to find opponents), update their own row (to mark matched),
  and delete their own row (to cancel search).
- online_games: authenticated users can read games they're part of, insert is
  handled via the matchmaking flow (host creates the game row).
- online_game_moves: authenticated users can read moves for games they're in,
  and insert moves only for games they're playing.
*/

CREATE TABLE IF NOT EXISTS matchmaking_queue (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL DEFAULT auth.uid(),
  time_control text NOT NULL DEFAULT '3min',
  status text NOT NULL DEFAULT 'searching',
  game_id uuid,
  opponent_id uuid,
  created_at timestamptz DEFAULT now(),
  matched_at timestamptz
);

ALTER TABLE matchmaking_queue ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "mm_select_own" ON matchmaking_queue;
CREATE POLICY "mm_select_own" ON matchmaking_queue FOR SELECT
  TO authenticated USING (auth.uid() = user_id OR status = 'searching');

DROP POLICY IF EXISTS "mm_insert_own" ON matchmaking_queue;
CREATE POLICY "mm_insert_own" ON matchmaking_queue FOR INSERT
  TO authenticated WITH CHECK (auth.uid() = user_id);

DROP POLICY IF EXISTS "mm_update_own" ON matchmaking_queue;
CREATE POLICY "mm_update_own" ON matchmaking_queue FOR UPDATE
  TO authenticated USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);

DROP POLICY IF EXISTS "mm_delete_own" ON matchmaking_queue;
CREATE POLICY "mm_delete_own" ON matchmaking_queue FOR DELETE
  TO authenticated USING (auth.uid() = user_id);

CREATE TABLE IF NOT EXISTS online_games (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  host_id uuid NOT NULL,
  guest_id uuid NOT NULL,
  time_control text NOT NULL DEFAULT '3min',
  status text NOT NULL DEFAULT 'active',
  fen text,
  turn text NOT NULL DEFAULT 'w',
  winner text,
  created_at timestamptz DEFAULT now()
);

ALTER TABLE online_games ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "og_select_players" ON online_games;
CREATE POLICY "og_select_players" ON online_games FOR SELECT
  TO authenticated USING (auth.uid() = host_id OR auth.uid() = guest_id);

DROP POLICY IF EXISTS "og_insert_host" ON online_games;
CREATE POLICY "og_insert_host" ON online_games FOR INSERT
  TO authenticated WITH CHECK (auth.uid() = host_id);

DROP POLICY IF EXISTS "og_update_players" ON online_games;
CREATE POLICY "og_update_players" ON online_games FOR UPDATE
  TO authenticated USING (auth.uid() = host_id OR auth.uid() = guest_id) WITH CHECK (auth.uid() = host_id OR auth.uid() = guest_id);

CREATE TABLE IF NOT EXISTS online_game_moves (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  game_id uuid NOT NULL REFERENCES online_games(id) ON DELETE CASCADE,
  move_number int NOT NULL,
  from_row int NOT NULL,
  from_col int NOT NULL,
  to_row int NOT NULL,
  to_col int NOT NULL,
  promotion text,
  player_id uuid NOT NULL DEFAULT auth.uid(),
  san text,
  created_at timestamptz DEFAULT now()
);

ALTER TABLE online_game_moves ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "ogm_select_players" ON online_game_moves;
CREATE POLICY "ogm_select_players" ON online_game_moves FOR SELECT
  TO authenticated USING (
    EXISTS (SELECT 1 FROM online_games g WHERE g.id = online_game_moves.game_id AND (g.host_id = auth.uid() OR g.guest_id = auth.uid()))
  );

DROP POLICY IF EXISTS "ogm_insert_players" ON online_game_moves;
CREATE POLICY "ogm_insert_players" ON online_game_moves FOR INSERT
  TO authenticated WITH CHECK (
    EXISTS (SELECT 1 FROM online_games g WHERE g.id = online_game_moves.game_id AND (g.host_id = auth.uid() OR g.guest_id = auth.uid()))
  );

CREATE INDEX IF NOT EXISTS idx_mm_searching ON matchmaking_queue (status, created_at);
CREATE INDEX IF NOT EXISTS idx_og_moves_game ON online_game_moves (game_id, move_number);
