-- The employer's application deadline.
--
-- Distinct from expires_at, which is ours: a shelf life we apply so a listing
-- nobody refreshed does not sit here forever. apply_by is a fact the employer
-- stated, and when it passes the listing is dead regardless of our shelf life.
--
-- Nullable, like every other field added here. Most listings do not state one,
-- and "not stated" must never be shown as a date or filtered as if it were.

alter table jobs add column apply_by date;

create index jobs_apply_by_idx on jobs (apply_by)
  where status = 'approved' and apply_by is not null;

comment on column jobs.apply_by is
  'Employer''s stated deadline. NULL = not stated. Ours is expires_at.';
