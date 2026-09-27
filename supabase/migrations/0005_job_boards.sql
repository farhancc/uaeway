-- Employer job boards.
--
-- Greenhouse and Lever publish every customer's board as an open JSON endpoint
-- with no key and no signup. That makes them the only free UAE-capable source
-- that needs nothing from anyone — but they are per-employer, so which
-- employers to follow is data rather than configuration.
--
-- Separate from job_searches because the shape genuinely differs: a search is
-- keywords plus a location against an aggregator, a board is one employer's
-- own listings. Forcing both into one table would mean half the columns are
-- null on every row.

create type ats as enum ('greenhouse', 'lever');

create table job_boards (
  id          uuid primary key default gen_random_uuid(),
  ats         ats  not null,
  -- The employer's identifier in that ATS's URL, e.g. "careem" from
  -- boards-api.greenhouse.io/v1/boards/careem/jobs
  slug        text not null,
  -- What to call them in the admin. The API gives us a name per listing, not
  -- per board, so this is written by hand.
  name        text not null,
  active      boolean not null default true,
  last_run_at timestamptz,
  -- Set when a run finds the board missing or renamed, so a dead board shows
  -- as dead in the admin instead of failing quietly every night.
  last_error  text,
  created_at  timestamptz not null default now(),
  unique (ats, slug)
);

alter table job_boards enable row level security;

-- Same posture as job_searches: no anon policy at all. Reached only through
-- the service role on the server, and by admins in the dashboard.
create policy "admins read boards"  on job_boards for select using (is_admin());
create policy "admins write boards" on job_boards for all    using (is_admin());

-- Verified to return UAE listings at the time of writing. The rest of the list
-- is yours to build in /admin/boards; a board that stops returning UAE work
-- costs one HTTP call a night, not money.
insert into job_boards (ats, slug, name) values
  ('greenhouse', 'careem', 'Careem')
on conflict (ats, slug) do nothing;
