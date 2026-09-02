/*
# Chess Platform Schema (retry)

Full schema for chess platform with profiles, welcome bonus, rooms, clubs, chat, match history.
Idempotent — safe to re-run.
*/

-- PROFILES
CREATE TABLE IF NOT EXISTS profiles (
  id uuid PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  username text UNIQUE NOT NULL,
  display_name text NOT NULL DEFAULT '',
  avatar_url text NOT NULL DEFAULT '',
  bio text NOT NULL DEFAULT '',
  country_code text NOT NULL DEFAULT 'US',
  flag_emoji text NOT NULL DEFAULT '🇺🇸',
  rating int NOT NULL DEFAULT 1000,
  bonus_points int NOT NULL DEFAULT 0,
  bonus_claimed boolean NOT NULL DEFAULT false,
  wins int NOT NULL DEFAULT 0,
  draws int NOT NULL DEFAULT 0,
  losses int NOT NULL DEFAULT 0,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

ALTER TABLE profiles ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "profiles_read_all" ON profiles;
CREATE POLICY "profiles_read_all" ON profiles FOR SELECT
  TO authenticated USING (true);

DROP POLICY IF EXISTS "profiles_insert_own" ON profiles;
CREATE POLICY "profiles_insert_own" ON profiles FOR INSERT
  TO authenticated WITH CHECK (auth.uid() = id);

DROP POLICY IF EXISTS "profiles_update_own" ON profiles;
CREATE POLICY "profiles_update_own" ON profiles FOR UPDATE
  TO authenticated USING (auth.uid() = id) WITH CHECK (auth.uid() = id);

-- ROOMS
CREATE TABLE IF NOT EXISTS rooms (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  code text UNIQUE NOT NULL DEFAULT upper(substr(encode(gen_random_bytes(6), 'hex'), 1, 6)),
  host_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  guest_id uuid REFERENCES auth.users(id) ON DELETE SET NULL,
  status text NOT NULL DEFAULT 'waiting',
  time_control text NOT NULL DEFAULT '10min',
  host_color text NOT NULL DEFAULT 'w',
  created_at timestamptz DEFAULT now()
);

ALTER TABLE rooms ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "rooms_select_participants" ON rooms;
CREATE POLICY "rooms_select_participants" ON rooms FOR SELECT
  TO authenticated USING (auth.uid() = host_id OR auth.uid() = guest_id OR status = 'waiting');

DROP POLICY IF EXISTS "rooms_insert_own" ON rooms;
CREATE POLICY "rooms_insert_own" ON rooms FOR INSERT
  TO authenticated WITH CHECK (auth.uid() = host_id);

DROP POLICY IF EXISTS "rooms_update_own" ON rooms;
CREATE POLICY "rooms_update_own" ON rooms FOR UPDATE
  TO authenticated USING (auth.uid() = host_id OR auth.uid() = guest_id) WITH CHECK (auth.uid() = host_id OR auth.uid() = guest_id);

DROP POLICY IF EXISTS "rooms_delete_own" ON rooms;
CREATE POLICY "rooms_delete_own" ON rooms FOR DELETE
  TO authenticated USING (auth.uid() = host_id);

-- CLUBS
CREATE TABLE IF NOT EXISTS clubs (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  name text NOT NULL,
  description text NOT NULL DEFAULT '',
  founder_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  member_count int NOT NULL DEFAULT 1,
  created_at timestamptz DEFAULT now()
);

ALTER TABLE clubs ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "clubs_read_all" ON clubs;
CREATE POLICY "clubs_read_all" ON clubs FOR SELECT
  TO authenticated USING (true);

DROP POLICY IF EXISTS "clubs_insert_own" ON clubs;
CREATE POLICY "clubs_insert_own" ON clubs FOR INSERT
  TO authenticated WITH CHECK (auth.uid() = founder_id);

DROP POLICY IF EXISTS "clubs_update_own" ON clubs;
CREATE POLICY "clubs_update_own" ON clubs FOR UPDATE
  TO authenticated USING (auth.uid() = founder_id) WITH CHECK (auth.uid() = founder_id);

DROP POLICY IF EXISTS "clubs_delete_own" ON clubs;
CREATE POLICY "clubs_delete_own" ON clubs FOR DELETE
  TO authenticated USING (auth.uid() = founder_id);

-- CLUB MEMBERS
CREATE TABLE IF NOT EXISTS club_members (
  club_id uuid NOT NULL REFERENCES clubs(id) ON DELETE CASCADE,
  user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  role text NOT NULL DEFAULT 'member',
  joined_at timestamptz DEFAULT now(),
  PRIMARY KEY (club_id, user_id)
);

ALTER TABLE club_members ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "club_members_read_all" ON club_members;
CREATE POLICY "club_members_read_all" ON club_members FOR SELECT
  TO authenticated USING (true);

DROP POLICY IF EXISTS "club_members_insert_own" ON club_members;
CREATE POLICY "club_members_insert_own" ON club_members FOR INSERT
  TO authenticated WITH CHECK (auth.uid() = user_id);

DROP POLICY IF EXISTS "club_members_delete_own" ON club_members;
CREATE POLICY "club_members_delete_own" ON club_members FOR DELETE
  TO authenticated USING (auth.uid() = user_id);

-- CHAT MESSAGES
CREATE TABLE IF NOT EXISTS chat_messages (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  room_id uuid NOT NULL REFERENCES rooms(id) ON DELETE CASCADE,
  user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  username text NOT NULL,
  avatar_url text NOT NULL DEFAULT '',
  text text NOT NULL,
  message_type text NOT NULL DEFAULT 'text',
  created_at timestamptz DEFAULT now()
);

ALTER TABLE chat_messages ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "chat_read_participants" ON chat_messages;
CREATE POLICY "chat_read_participants" ON chat_messages FOR SELECT
  TO authenticated USING (
    EXISTS (SELECT 1 FROM rooms WHERE rooms.id = chat_messages.room_id AND (rooms.host_id = auth.uid() OR rooms.guest_id = auth.uid()))
  );

DROP POLICY IF EXISTS "chat_insert_participants" ON chat_messages;
CREATE POLICY "chat_insert_participants" ON chat_messages FOR INSERT
  TO authenticated WITH CHECK (
    auth.uid() = user_id AND
    EXISTS (SELECT 1 FROM rooms WHERE rooms.id = chat_messages.room_id AND (rooms.host_id = auth.uid() OR rooms.guest_id = auth.uid()))
  );

-- MATCH HISTORY
CREATE TABLE IF NOT EXISTS match_history (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL DEFAULT auth.uid() REFERENCES auth.users(id) ON DELETE CASCADE,
  opponent_name text NOT NULL,
  opponent_avatar text NOT NULL DEFAULT '',
  result text NOT NULL,
  moves int NOT NULL DEFAULT 0,
  time_control text NOT NULL DEFAULT '',
  rating_change int NOT NULL DEFAULT 0,
  ending text NOT NULL DEFAULT 'checkmate',
  pgn text,
  created_at timestamptz DEFAULT now()
);

ALTER TABLE match_history ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "match_history_select_own" ON match_history;
CREATE POLICY "match_history_select_own" ON match_history FOR SELECT
  TO authenticated USING (auth.uid() = user_id);

DROP POLICY IF EXISTS "match_history_insert_own" ON match_history;
CREATE POLICY "match_history_insert_own" ON match_history FOR INSERT
  TO authenticated WITH CHECK (auth.uid() = user_id);

DROP POLICY IF EXISTS "match_history_delete_own" ON match_history;
CREATE POLICY "match_history_delete_own" ON match_history FOR DELETE
  TO authenticated USING (auth.uid() = user_id);

-- Indexes
CREATE INDEX IF NOT EXISTS idx_rooms_code ON rooms(code);
CREATE INDEX IF NOT EXISTS idx_rooms_host ON rooms(host_id);
CREATE INDEX IF NOT EXISTS idx_chat_room ON chat_messages(room_id, created_at);
CREATE INDEX IF NOT EXISTS idx_match_history_user ON match_history(user_id, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_club_members_user ON club_members(user_id);
