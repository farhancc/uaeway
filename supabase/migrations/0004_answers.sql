-- The canned answer bank.
--
-- The chatbot called Gemini on every turn, including for the twenty questions
-- we had already written answers to. This table holds those answers so a common
-- question costs nothing, and makes them editable without a deploy.
--
-- It is the single source for both surfaces that show them: the chatbot, and
-- the "Questions we get" block on each service page. Two copies of the same
-- answer would drift.

create table answers (
  id           uuid primary key default gen_random_uuid(),
  -- Stable id a suggestion chip refers to. Never reused, so an old chip in a
  -- stale browser tab can never resolve to a different answer.
  slug         text not null unique,
  -- Canonical wording: the chip label and the FAQ question.
  question     text not null,
  answer_md    text not null,
  -- Which service this belongs to; drives the CTA and the service page block.
  service_slug text,
  -- Matching vocabulary for typed questions.
  keywords     text[] not null default '{}',
  -- The chips offered after this answer. Slugs, checked at read time rather
  -- than by a foreign key, so retiring an answer cannot block an edit.
  follow_up_slugs text[] not null default '{}',
  -- Shown in the chat's empty state.
  is_opener    boolean not null default false,
  show_on_page boolean not null default true,
  position     integer not null default 0,
  -- Retire an answer without deleting it and breaking existing chips.
  active       boolean not null default true,
  created_at   timestamptz not null default now(),
  updated_at   timestamptz not null default now()
);

create index answers_live_idx on answers (active, service_slug, position);
create index answers_opener_idx on answers (is_opener) where active;

create trigger answers_touch before update on answers
  for each row execute function touch_updated_at();

alter table answers enable row level security;

create policy "active answers are public"
  on answers for select using (active);

create policy "admins manage answers"
  on answers for all using (is_admin()) with check (is_admin());

-- ── Measuring the saving ───────────────────────────────────────────────────
-- Without these we would be guessing at whether the bank is working.

-- How a reply was produced. Null on the visitor's own messages.
alter table chat_messages
  add column source text
  check (source is null or source in ('canned', 'model', 'capped'));

-- Which canned answer was served, when one was. Shows which answers earn their
-- place and which questions people ask that the bank cannot yet cover.
alter table chat_messages
  add column answer_slug text;

-- Model calls made in this session, for the per-session spend cap.
alter table chat_sessions
  add column ai_turns integer not null default 0;
