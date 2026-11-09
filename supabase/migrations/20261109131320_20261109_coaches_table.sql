/*
# Coaches table

1. New Tables
- `public.coaches`
  - `id` (uuid, primary key, default gen_random_uuid())
  - `user_id` (uuid, not null, unique, references auth.users(id) on delete cascade) — the coach's account
  - `created_at` (timestamptz, default now())
  - `name` (text, 2..60 chars) — display name
  - `city` (text, max 40 chars)
  - `fide_id` (text, max 15 chars) — FIDE player identifier
  - `rating` (int, 0..3000)
  - `experience_years` (int, 0..60)
  - `languages` (text[], default '{}') — spoken languages
  - `levels` (text[], default '{}') — taught skill levels
  - `price_per_hour` (int, 0..100000) — hourly rate
  - `free_demo` (boolean, default true) — offers a free demo lesson
  - `bio` (text, max 600 chars)
  - `whatsapp` (text, 10..13 digits, regex validated) — contact number
  - `is_active` (boolean, default true) — publicly visible listing

2. Security
- RLS enabled on `coaches`.
- Public read: `anon, authenticated` SELECT on active rows only (`is_active`).
- Owner read: `authenticated` SELECT on own row (`auth.uid() = user_id`).
- Owner insert/update/delete: `authenticated`, scoped to `auth.uid() = user_id`.
- Grants: SELECT to anon + authenticated; INSERT, UPDATE, DELETE to authenticated.

3. Important Notes
- Idempotent: CREATE TABLE IF NOT EXISTS, DROP POLICY IF EXISTS before CREATE POLICY.
- No app code or other files are modified.
*/

create table if not exists public.coaches (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null unique references auth.users(id) on delete cascade,
  created_at timestamptz not null default now(),
  name text not null check (char_length(name) between 2 and 60),
  city text check (char_length(city) <= 40),
  fide_id text check (char_length(fide_id) <= 15),
  rating int check (rating between 0 and 3000),
  experience_years int check (experience_years between 0 and 60),
  languages text[] not null default '{}',
  levels text[] not null default '{}',
  price_per_hour int not null check (price_per_hour between 0 and 100000),
  free_demo boolean not null default true,
  bio text check (char_length(bio) <= 600),
  whatsapp text not null check (whatsapp ~ '^[0-9]{10,13}$'),
  is_active boolean not null default true
);
alter table public.coaches enable row level security;
drop policy if exists "coaches public read" on public.coaches;
create policy "coaches public read" on public.coaches for select to anon, authenticated using (is_active);
drop policy if exists "coach own read" on public.coaches;
create policy "coach own read" on public.coaches for select to authenticated using (auth.uid() = user_id);
drop policy if exists "coach own insert" on public.coaches;
create policy "coach own insert" on public.coaches for insert to authenticated with check (auth.uid() = user_id);
drop policy if exists "coach own update" on public.coaches;
create policy "coach own update" on public.coaches for update to authenticated using (auth.uid() = user_id) with check (auth.uid() = user_id);
drop policy if exists "coach own delete" on public.coaches;
create policy "coach own delete" on public.coaches for delete to authenticated using (auth.uid() = user_id);
grant select on public.coaches to anon, authenticated;
grant insert, update, delete on public.coaches to authenticated;
