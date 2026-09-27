-- Salary.
--
-- The feeds have carried this all along — Jooble and Careerjet both return a
-- salary string — and the ingest passed it to the summariser and then dropped
-- it. Three columns rather than one, because the string and the filter want
-- different things.
--
-- salary_text is what the source said, shown verbatim. Never rewritten: a
-- salary is the fact a jobseeker is most likely to act on, and paraphrasing it
-- is how you end up asserting a number nobody quoted.
--
-- salary_min / salary_max are for comparing, normalised to AED per month
-- because that is how UAE job ads are written. They are null whenever we could
-- not be certain — another currency, an unparseable phrase, "competitive" —
-- and a null is the honest answer, not a zero.

alter table jobs
  add column salary_text text,
  add column salary_min  integer,
  add column salary_max  integer;

-- Range filters read these and nothing else.
create index jobs_salary_idx on jobs (salary_min, salary_max)
  where status = 'approved' and salary_min is not null;

comment on column jobs.salary_text is 'Verbatim from the source. Display only.';
comment on column jobs.salary_min  is 'AED per month, normalised. Null when not certain.';
comment on column jobs.salary_max  is 'AED per month, normalised. Null when not certain.';
