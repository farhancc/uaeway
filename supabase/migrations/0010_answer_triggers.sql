-- Exact triggers, and answers that ask a question back.
--
-- `keywords` is scored and deliberately cautious: it weighs a match, compares
-- it against the runner-up, and gives up when two answers fit equally well. It
-- is right for "what did they probably mean", and useless when you know
-- exactly what you want to catch.
--
-- trigger_groups is the other thing: every word in a group must be present, and
-- then that answer is served. No scoring, no runner-up, no maybe. Several
-- groups because one list would demand every word at once — (visa, cost) and
-- (visa, price) and (visa, fee) are the same question typed three ways, not one
-- question needing six words.
--
--   [["visa","cost"], ["visa","price"], ["visa","fee"]]
--
-- choices lets an answer ask before it answers. "How do I attest my
-- certificate" has no single true reply — it depends which certificate — so the
-- answer offers the cases and each one leads to its own answer.
--
--   [{"label":"Degree certificate","answer_slug":"attestation-degree"}, …]
--
-- jsonb rather than text[][]: Postgres array literals must be rectangular, and
-- these are ragged by nature.

alter table answers
  add column trigger_groups jsonb not null default '[]'::jsonb,
  add column choices        jsonb not null default '[]'::jsonb;

comment on column answers.trigger_groups is
  'string[][] — served when every word of ANY group is present. Exact, unscored.';
comment on column answers.choices is
  '{label, answer_slug}[] — offered instead of leaving the visitor to guess.';
