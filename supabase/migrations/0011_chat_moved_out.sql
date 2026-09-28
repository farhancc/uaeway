-- The chat moved to MongoDB.
--
-- Apply this one *before* deploying. It does not touch any data: it only lets a
-- lead reference a conversation that no longer has a row here.
--
-- A lead captured by the chatbot records which conversation produced it, and
-- that column was a foreign key into `chat_sessions`. Once sessions are created
-- in Mongo there is no matching row for the constraint to find, so the very
-- first chat lead after the deploy would fail its insert — and lead capture is
-- deliberately the one thing in that route that must not fail.
--
-- The column stays a uuid, and session ids stay uuids on the other side, so it
-- still identifies the conversation exactly as it did. What it loses is the
-- cascade: deleting a conversation no longer nulls the lead's reference. That
-- is the right trade — a lead outliving the transcript it came from is the
-- behaviour we want anyway.

alter table leads
  drop constraint if exists leads_chat_session_id_fkey;

comment on column leads.chat_session_id is
  'Conversation in the chat database (MongoDB chat_sessions._id). Not a foreign key.';
