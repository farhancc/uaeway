-- Lets admins add a job by hand.
--
-- 0001 gave admins select and update on jobs, because every listing was
-- expected to come from the Careerjet ingest. An employer who sends a vacancy
-- directly needs a way in that does not involve the SQL editor. Manual entries
-- land as 'pending' like ingested ones, so there is one review queue and one
-- route to publication.

create policy "admins create jobs"
  on jobs for insert with check (is_admin());
