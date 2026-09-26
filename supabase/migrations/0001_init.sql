-- UAE Gateway initial schema.
--
-- Two invariants the whole application depends on:
--   1. Content is invisible to the public until a human sets status = 'approved'.
--      Enforced here by RLS, not only in application code, so a mistake in a
--      query cannot leak an unreviewed AI draft that invents visa fees.
--   2. A lead row cannot exist without a consent timestamp (UAE PDPL).
--      Enforced by NOT NULL on leads.consent_at.

create extension if not exists pgcrypto;

create type content_status as enum ('pending', 'approved', 'rejected');
create type lead_status as enum ('new', 'contacted', 'qualified', 'won', 'lost');
create type lead_origin as enum ('chat', 'form', 'whatsapp', 'import');
create type article_kind as enum ('news', 'guide', 'blog');

-- Keeps updated_at honest without the application having to remember.
create or replace function touch_updated_at() returns trigger
language plpgsql as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

-- Members of this table may use the admin review queue. Adding a row is a
-- deliberate act by someone with database access; there is no self-signup.
create table admins (
  user_id    uuid primary key references auth.users (id) on delete cascade,
  email      text,
  created_at timestamptz not null default now()
);

create or replace function is_admin() returns boolean
language sql security definer stable set search_path = public as $$
  select exists (select 1 from admins where user_id = auth.uid());
$$;

-- ---------------------------------------------------------------- jobs

-- The keyword/location pairs the Careerjet ingest runs. In a table rather than
-- a code constant so the team can retarget the ingest without a deploy.
create table job_searches (
  id         uuid primary key default gen_random_uuid(),
  keywords   text not null,
  location   text not null,
  active     boolean not null default true,
  last_run_at timestamptz,
  created_at timestamptz not null default now(),
  unique (keywords, location)
);

create table jobs (
  id               uuid primary key default gen_random_uuid(),
  slug             text not null unique,
  title            text not null,
  company          text,
  -- Unique so re-running the ingest is idempotent.
  source_url       text not null unique,
  source_name      text not null,
  emirate          text,
  category         text,
  -- AI-written, reviewed before publication. Never a copy of the source.
  summary          text,
  documents_needed text[] not null default '{}',
  posted_at        timestamptz not null default now(),
  expires_at       timestamptz,
  status           content_status not null default 'pending',
  reviewed_by      uuid references auth.users (id) on delete set null,
  reviewed_at      timestamptz,
  reject_reason    text,
  created_at       timestamptz not null default now(),
  updated_at       timestamptz not null default now(),
  search           tsvector generated always as (
    to_tsvector('english',
      coalesce(title, '') || ' ' ||
      coalesce(company, '') || ' ' ||
      coalesce(emirate, '') || ' ' ||
      coalesce(category, '') || ' ' ||
      coalesce(summary, ''))
  ) stored
);

create index jobs_search_idx on jobs using gin (search);
create index jobs_live_idx on jobs (status, posted_at desc);
create index jobs_emirate_idx on jobs (emirate) where status = 'approved';
create trigger jobs_touch before update on jobs
  for each row execute function touch_updated_at();

-- ------------------------------------------------------------ articles

create table articles (
  id            uuid primary key default gen_random_uuid(),
  slug          text not null,
  locale        text not null default 'en',
  kind          article_kind not null default 'guide',
  title         text not null,
  excerpt       text,
  body_md       text not null,
  hero_image_url text,
  -- Every source the draft was built from: [{title, url, publisher, retrieved_at}].
  -- An article with no citations must not be approved.
  citations     jsonb not null default '[]'::jsonb,
  -- Which service line this article is meant to feed, if any.
  service_slug  text,
  status        content_status not null default 'pending',
  reviewed_by   uuid references auth.users (id) on delete set null,
  reviewed_at   timestamptz,
  reject_reason text,
  published_at  timestamptz,
  created_at    timestamptz not null default now(),
  updated_at    timestamptz not null default now(),
  search        tsvector generated always as (
    to_tsvector('english',
      coalesce(title, '') || ' ' ||
      coalesce(excerpt, '') || ' ' ||
      coalesce(body_md, ''))
  ) stored,
  unique (slug, locale)
);

create index articles_search_idx on articles using gin (search);
create index articles_live_idx on articles (status, kind, published_at desc);
create trigger articles_touch before update on articles
  for each row execute function touch_updated_at();

-- ----------------------------------------------------------------- chat

create table chat_sessions (
  id         uuid primary key default gen_random_uuid(),
  -- Hashed, never the raw address: enough to rate-limit, not personal data we
  -- have no reason to keep.
  ip_hash    text,
  user_agent text,
  page_path  text,
  turn_count integer not null default 0,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create trigger chat_sessions_touch before update on chat_sessions
  for each row execute function touch_updated_at();

create table chat_messages (
  id         uuid primary key default gen_random_uuid(),
  session_id uuid not null references chat_sessions (id) on delete cascade,
  role       text not null check (role in ('user', 'model')),
  content    text not null,
  created_at timestamptz not null default now()
);

create index chat_messages_session_idx on chat_messages (session_id, created_at);

-- ---------------------------------------------------------------- leads

create table leads (
  id             uuid primary key default gen_random_uuid(),
  service_slug   text not null,
  name           text,
  -- Phone or email, whichever they gave. Normalised by the application.
  contact        text not null,
  email          text,
  need           text,
  origin         lead_origin not null default 'form',
  chat_session_id uuid references chat_sessions (id) on delete set null,
  page_path      text,
  utm            jsonb not null default '{}'::jsonb,
  status         lead_status not null default 'new',
  notes          text,
  -- PDPL: no lead exists without a recorded moment of consent to be contacted.
  consent_at     timestamptz not null,
  created_at     timestamptz not null default now(),
  updated_at     timestamptz not null default now()
);

create index leads_triage_idx on leads (status, created_at desc);
-- Supports the 24-hour duplicate check in captureLead().
create index leads_dedupe_idx on leads (contact, service_slug, created_at desc);
create trigger leads_touch before update on leads
  for each row execute function touch_updated_at();

-- ------------------------------------------------------------ prospects

-- Outbound B2B list, seeded from the Dubai business CSV. For researched,
-- individual outreach — not bulk unsolicited messaging.
create table prospects (
  id            uuid primary key default gen_random_uuid(),
  business_name text not null,
  category      text,
  phone         text,
  website       text,
  area          text,
  street        text,
  maps_link     text,
  status        text not null default 'new',
  notes         text,
  created_at    timestamptz not null default now(),
  unique (business_name, phone)
);

-- ------------------------------------------------------------------ RLS

alter table admins        enable row level security;
alter table job_searches  enable row level security;
alter table jobs          enable row level security;
alter table articles      enable row level security;
alter table chat_sessions enable row level security;
alter table chat_messages enable row level security;
alter table leads         enable row level security;
alter table prospects     enable row level security;

-- The public sees approved content and nothing else. Note there is no anon
-- policy at all on leads, chat, prospects or job_searches: those are reached
-- only through the service role on the server.
create policy "approved jobs are public"
  on jobs for select using (status = 'approved');

create policy "approved articles are public"
  on articles for select
  using (status = 'approved' and published_at is not null and published_at <= now());

-- Admins read and write everything through the dashboard.
create policy "admins read jobs"    on jobs      for select using (is_admin());
create policy "admins write jobs"   on jobs      for update using (is_admin());
create policy "admins read articles" on articles  for select using (is_admin());
create policy "admins write articles" on articles for update using (is_admin());
create policy "admins read leads"   on leads     for select using (is_admin());
create policy "admins write leads"  on leads     for update using (is_admin());
create policy "admins read searches" on job_searches for select using (is_admin());
create policy "admins write searches" on job_searches for all using (is_admin());
create policy "admins read prospects" on prospects for select using (is_admin());
create policy "admins write prospects" on prospects for update using (is_admin());
create policy "admins read chat"    on chat_sessions for select using (is_admin());
create policy "admins read messages" on chat_messages for select using (is_admin());
create policy "admins see admins"   on admins    for select using (is_admin());

-- --------------------------------------------------------------- seeds

insert into job_searches (keywords, location) values
  ('sales',        'Dubai'),
  ('accountant',   'Dubai'),
  ('receptionist', 'Abu Dhabi'),
  ('driver',       'Sharjah'),
  ('nurse',        'Dubai'),
  ('engineer',     'Abu Dhabi'),
  ('teacher',      'Dubai'),
  ('hr',           'Dubai');
