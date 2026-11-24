BEGIN;
ALTER TABLE app.conversation_entries DROP CONSTRAINT conversation_entries_messages_check;
ALTER TABLE app.conversation_entries ADD CONSTRAINT conversation_entries_messages_check CHECK (
  jsonb_typeof(messages)='array' AND (
    jsonb_array_length(messages) BETWEEN 1 AND 2
    OR (jsonb_array_length(messages)=0 AND metadata->>'kind'='setup_creation')
  )
);
COMMIT;
