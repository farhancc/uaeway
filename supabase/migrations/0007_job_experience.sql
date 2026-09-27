-- Experience required.
--
-- Stored as the minimum years the listing asks for, because that is the
-- question a jobseeker actually has: "will they look at me?" A candidate with
-- three years wants everything asking for three or fewer, which is one
-- comparison against one number.
--
-- 0 means the listing explicitly welcomes people with none — a fresher role,
-- which is a real and searched-for category here. NULL means the listing did
-- not say, which is different from zero and must not be filtered as if it were.

alter table jobs
  add column experience_years integer
    check (experience_years is null or (experience_years >= 0 and experience_years <= 40));

create index jobs_experience_idx on jobs (experience_years)
  where status = 'approved' and experience_years is not null;

comment on column jobs.experience_years is
  'Minimum years the listing asks for. 0 = open to freshers. NULL = not stated.';
