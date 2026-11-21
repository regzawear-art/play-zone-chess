# Project memory

## Product intent & audience

- **khelchess** — a chess web application (domains: `khelchess.com`, `www.khelchess.com`).
- Core features include user profiles and match history tracking.
- Production-oriented; intended for real users (auth + persisted match records).

## Brand personality & voice

- Not yet inferred from design interactions.

## Visual design & UX direction

- Not yet inferred from design interactions.

## Decisions, constraints & rationale

- **Backend:** Supabase for database and authentication.
- **MCP tools** can apply SQL migrations to the Supabase project but **cannot** configure Auth Site URL / redirect URLs — those require manual dashboard setup.
- **Env vars** (e.g. `SUPABASE_URL`) are not exposed to the shell; MCP tools still reach the project.
- **Supabase project ref** could not be retrieved from available tools or env; must be found via dashboard URL or Project Settings > General.
- **DB schema (current):**
  - `public.profiles`: has `last_active` (timestamptz).
  - `public.match_history`: has `user_id`, `client_id` (text), `played_at` (timestamptz), `record` (jsonb).
  - Unique index `match_history_user_client` on `match_history(user_id, client_id)` — enforces one record per user per client session.

## Open questions & assumptions

- Supabase project ref is still unknown — user needs to confirm from dashboard.
- Auth Site URL and redirect URLs (`https://www.khelchess.com/**`, `https://khelchess.com/**`) were requested but not yet verified as applied — user must set manually.
- No existing redirect URLs were auditable via MCP; "keep existing ones" is an unverified assumption.
- Match `record` jsonb shape is not yet defined — structure TBD by app code.