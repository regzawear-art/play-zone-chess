-- Add game_id column to rooms so the online game can be linked
-- When the guest joins, they create the online_games row and store its id here
-- The host reads this column to find the game

ALTER TABLE rooms ADD COLUMN IF NOT EXISTS game_id uuid REFERENCES online_games(id) ON DELETE SET NULL;

-- Allow both host and guest to update game_id (guest sets it, host reads it)
DROP POLICY IF EXISTS "rooms_update_own" ON rooms;
CREATE POLICY "rooms_update_own" ON rooms FOR UPDATE
  TO authenticated USING (auth.uid() = host_id OR auth.uid() = guest_id) WITH CHECK (auth.uid() = host_id OR auth.uid() = guest_id);
