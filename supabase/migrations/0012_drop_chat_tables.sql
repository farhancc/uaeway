-- Removes the tables the chat no longer reads.
--
-- DESTRUCTIVE, and deliberately not part of the deploy. Apply it only after
-- `npm run move:chat-to-mongo` has run and /admin/answers and the savings
-- figure on /admin both look right — at which point this is the copy that is
-- no longer read, and keeping it invites an edit landing in the store nothing
-- serves from.
--
-- Order matters: chat_messages references chat_sessions.

drop table if exists chat_messages;
drop table if exists chat_sessions;
drop table if exists answers;
