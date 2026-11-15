/*
# Online game rating (ELO) + profile stats guard

1. Modified Tables
- `public.online_games`
  - `rated_at` (timestamptz) — when the game's rating was applied (null = unrated)
  - `white_delta` (int) — rating change applied to the white/host player
  - `black_delta` (int) — rating change applied to the black/guest player
  - All columns use ADD COLUMN IF NOT EXISTS (idempotent, non-destructive).

2. New Functions
- `public.guard_profile_stats()` — BEFORE UPDATE trigger function on `profiles`.
  Unless the session setting `khel.rating_ok = '1'` is set, it freezes rating/wins/draws/losses
  to their existing values, preventing direct client edits to ranked stats. Only the rating RPC
  (which sets `khel.rating_ok` during its updates) can change those columns.
- `public.rate_online_game(p_game uuid)` — SECURITY DEFINER, search_path = public.
  Applies an ELO rating update to the host (white) and guest (black) profiles for a completed
  online game, exactly once (guarded by `rated_at`). Rules:
    - Caller must be signed in and be a player of the game.
    - Game must be `completed` with a real, distinct guest.
    - Games with fewer than 4 moves are marked rated with zero delta (too_short).
    - K-factor is 40 for players with <30 games, else 20; rating floored at 100.
    - Deltas are stored on the game row and returned to the caller.
  EXECUTE revoked from PUBLIC/anon; granted to authenticated only.

3. New Triggers
- `guard_profile_stats` BEFORE UPDATE ON public.profiles, calling guard_profile_stats().

4. Security
- `rate_online_game` is SECURITY DEFINER and the only path that can mutate ranked stats,
  because the trigger blocks direct profile updates unless `khel.rating_ok = '1'`.
- EXECUTE on `rate_online_game` limited to `authenticated`.

5. Important Notes
- Idempotent: ADD COLUMN IF NOT EXISTS, CREATE OR REPLACE FUNCTION, DROP TRIGGER IF EXISTS.
- No app code or other files are modified.
*/

alter table public.online_games add column if not exists rated_at timestamptz;
alter table public.online_games add column if not exists white_delta int;
alter table public.online_games add column if not exists black_delta int;

create or replace function public.guard_profile_stats()
returns trigger language plpgsql as $$
begin
  if coalesce(current_setting('khel.rating_ok', true), '') <> '1' then
    new.rating := old.rating;
    new.wins := old.wins;
    new.draws := old.draws;
    new.losses := old.losses;
  end if;
  return new;
end $$;

drop trigger if exists guard_profile_stats on public.profiles;
create trigger guard_profile_stats before update on public.profiles
  for each row execute function public.guard_profile_stats();

create or replace function public.rate_online_game(p_game uuid)
returns json
language plpgsql
security definer
set search_path = public
as $$
declare
  g public.online_games%rowtype;
  w public.profiles%rowtype;
  b public.profiles%rowtype;
  me uuid := auth.uid();
  score_w numeric;
  exp_w numeric;
  k_w int; k_b int;
  dw int; db int;
  n_moves int;
begin
  if me is null then return json_build_object('rated', false, 'reason', 'not_signed_in'); end if;

  select * into g from online_games where id = p_game for update;
  if not found then return json_build_object('rated', false, 'reason', 'no_game'); end if;
  if me <> g.host_id and me is distinct from g.guest_id then
    return json_build_object('rated', false, 'reason', 'not_player');
  end if;

  if g.rated_at is not null then
    return json_build_object('rated', true,
      'delta', case when me = g.host_id then g.white_delta else g.black_delta end);
  end if;

  if g.status <> 'completed' or g.guest_id is null or g.guest_id = g.host_id then
    return json_build_object('rated', false, 'reason', 'not_ratable');
  end if;

  select count(*) into n_moves from online_game_moves where game_id = p_game;
  if n_moves < 4 then
    update online_games set rated_at = now(), white_delta = 0, black_delta = 0 where id = p_game;
    return json_build_object('rated', false, 'reason', 'too_short', 'delta', 0);
  end if;

  select * into w from profiles where id = g.host_id for update;
  select * into b from profiles where id = g.guest_id for update;
  if w.id is null or b.id is null then
    return json_build_object('rated', false, 'reason', 'no_profile');
  end if;

  score_w := case g.winner when 'w' then 1 when 'b' then 0 else 0.5 end;
  exp_w := 1 / (1 + power(10, (b.rating - w.rating) / 400.0));
  k_w := case when (w.wins + w.draws + w.losses) < 30 then 40 else 20 end;
  k_b := case when (b.wins + b.draws + b.losses) < 30 then 40 else 20 end;
  dw := round(k_w * (score_w - exp_w));
  db := round(k_b * ((1 - score_w) - (1 - exp_w)));

  perform set_config('khel.rating_ok', '1', true);
  update profiles set
    rating = greatest(100, rating + dw),
    wins = wins + (score_w = 1)::int,
    losses = losses + (score_w = 0)::int,
    draws = draws + (score_w = 0.5)::int,
    updated_at = now()
  where id = w.id;
  update profiles set
    rating = greatest(100, rating + db),
    wins = wins + (score_w = 0)::int,
    losses = losses + (score_w = 1)::int,
    draws = draws + (score_w = 0.5)::int,
    updated_at = now()
  where id = b.id;
  perform set_config('khel.rating_ok', '', true);

  update online_games set rated_at = now(), white_delta = dw, black_delta = db where id = p_game;

  return json_build_object('rated', true,
    'delta', case when me = g.host_id then dw else db end);
end $$;

revoke all on function public.rate_online_game(uuid) from public, anon;
grant execute on function public.rate_online_game(uuid) to authenticated;
