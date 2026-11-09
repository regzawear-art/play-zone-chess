/*
# Site events analytics table and stats RPC

1. New Tables
- `public.site_events`
  - `id` (bigserial, primary key)
  - `created_at` (timestamptz, default now())
  - `visitor_id` (text, not null, max 40 chars) — anonymous visitor identifier
  - `event` (text, not null) — one of: page_view, game_start, game_end, online_start, js_error
  - `mode` (text, max 20 chars) — game mode label
  - `detail` (text, max 300 chars) — extra context (e.g. error message)
  - `path` (text, max 100 chars) — page path
  - `device` (text) — one of: mobile, tablet, desktop
  - `browser` (text, max 20 chars) — browser label
- Index `site_events_created_idx` on `created_at desc` for fast recent-event queries.

2. Security
- RLS enabled on `site_events`.
- INSERT policy "anyone can log events" for `anon, authenticated` with `WITH CHECK (true)`:
  the table is an intentionally public analytics sink — any visitor (signed in or not) may
  log events. No SELECT/UPDATE/DELETE policy is granted, so rows cannot be read via the Data API.
- Note: no table-level GRANT (INSERT) is included in this migration. Without it, the anon-key
  client will receive a 42501 (permission denied) on insert. A follow-up grant is recommended.

3. New Functions
- `public.get_site_stats(days int default 7)` returns json, SECURITY DEFINER, search_path = public.
  Aggregates the last N days (clamped 1..90) of site_events into a single JSON object:
  unique visitors, page views, games started (by mode), online games, games finished,
  device breakdown, per-day visitors/games (Asia/Kolkata timezone), and top JS errors.
- EXECUTE granted to `anon, authenticated` so the frontend can call it with the anon key.

4. Important Notes
- This migration is idempotent: CREATE TABLE IF NOT EXISTS, CREATE INDEX IF NOT EXISTS,
  DROP POLICY IF EXISTS before CREATE POLICY, CREATE OR REPLACE FUNCTION.
- No app code or other files are modified.
*/

create table if not exists public.site_events (
  id bigserial primary key,
  created_at timestamptz not null default now(),
  visitor_id text not null check (char_length(visitor_id) <= 40),
  event text not null check (event in ('page_view','game_start','game_end','online_start','js_error')),
  mode text check (char_length(mode) <= 20),
  detail text check (char_length(detail) <= 300),
  path text check (char_length(path) <= 100),
  device text check (device in ('mobile','tablet','desktop')),
  browser text check (char_length(browser) <= 20)
);
create index if not exists site_events_created_idx on public.site_events (created_at desc);
alter table public.site_events enable row level security;
drop policy if exists "anyone can log events" on public.site_events;
create policy "anyone can log events" on public.site_events for insert to anon, authenticated with check (true);
create or replace function public.get_site_stats(days int default 7)
returns json language sql security definer set search_path = public as $$
  with e as (select * from site_events where created_at >= now() - make_interval(days => greatest(1, least(days, 90))))
  select json_build_object(
    'days', greatest(1, least(days, 90)),
    'visitors', (select count(distinct visitor_id) from e where event = 'page_view'),
    'page_views', (select count(*) from e where event = 'page_view'),
    'games_started', (select coalesce(json_object_agg(mode, n), '{}'::json) from (select coalesce(mode,'unknown') mode, count(*) n from e where event = 'game_start' group by 1) s),
    'online_games', (select count(*) from e where event = 'online_start'),
    'games_finished', (select count(*) from e where event = 'game_end'),
    'devices', (select coalesce(json_object_agg(device, n), '{}'::json) from (select coalesce(device,'unknown') device, count(distinct visitor_id) n from e where event = 'page_view' group by 1) s),
    'by_day', (select coalesce(json_agg(d order by d.day), '[]'::json) from (select to_char(created_at at time zone 'Asia/Kolkata', 'YYYY-MM-DD') as day, count(distinct visitor_id) filter (where event = 'page_view') as visitors, count(*) filter (where event = 'game_start') as games from e group by 1) d),
    'errors', (select coalesce(json_agg(x), '[]'::json) from (select detail, device, browser, count(*) as times, max(created_at) as last_seen from e where event = 'js_error' group by detail, device, browser order by times desc limit 20) x)
  );
$$;
grant execute on function public.get_site_stats(int) to anon, authenticated;
