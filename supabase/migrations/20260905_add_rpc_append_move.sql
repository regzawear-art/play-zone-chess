-- RPC to append a move into the games.moves JSONB array and update fen/updated_at
CREATE OR REPLACE FUNCTION append_move_to_game(p_game_id uuid, p_move jsonb)
RETURNS void AS $$
BEGIN
  UPDATE games SET moves = COALESCE(moves, '[]'::jsonb) || jsonb_build_array(p_move), updated_at = now() WHERE id = p_game_id;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Grant execute to authenticated role
GRANT EXECUTE ON FUNCTION append_move_to_game(uuid, jsonb) TO authenticated;
