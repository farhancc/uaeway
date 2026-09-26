-- Lets admins write articles from the dashboard.
--
-- 0001 gave admins select and update on articles, because every article was
-- expected to arrive from the ingest. Writing a blog post by hand needs insert
-- as well. Posts still land as 'pending' and go through the same review queue
-- as an AI draft — the author approves their own post as a separate, deliberate
-- act, which keeps one path to publication rather than two.

create policy "admins create articles"
  on articles for insert with check (is_admin());

-- Finding an article by slug within its section is the read every article page
-- performs.
create index if not exists articles_slug_idx on articles (slug, locale);
