-- The apply link becomes optional.
--
-- It was required because the site's whole posture is "apply at the source,
-- never here", and a listing with nowhere to apply is a dead end. That is still
-- true, and the page now says so plainly instead of the row being impossible.
-- The case it makes room for is a listing typed in by hand from a source that
-- gave no URL — a vacancy heard about directly, a notice with a phone number.
--
-- The unique constraint stays. Postgres does not treat two NULLs as equal, so
-- any number of link-less listings can coexist while the ingest keeps relying
-- on the URL as the identity that makes a re-run idempotent. Link-less rows
-- simply cannot be deduplicated, which is correct: there is nothing to compare.

alter table jobs alter column source_url drop not null;

comment on column jobs.source_url is
  'Where to apply. NULL when the listing gave no link — the ingest always sets it; only hand-entered rows can omit it.';
