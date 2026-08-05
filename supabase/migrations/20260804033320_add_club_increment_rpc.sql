-- Add RPC to increment club member count
CREATE OR REPLACE FUNCTION increment_club_members(club_id uuid)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
  UPDATE clubs SET member_count = member_count + 1 WHERE id = club_id;
END;
$$;

GRANT EXECUTE ON FUNCTION increment_club_members TO authenticated;
