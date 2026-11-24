BEGIN;
CREATE TABLE app.audio_originals (
  condominium_id uuid NOT NULL,
  owner_user_id uuid NOT NULL,
  chat_id uuid NOT NULL,
  id uuid NOT NULL,
  content bytea,
  original_sha256 text NOT NULL CHECK (original_sha256 ~ '^[a-f0-9]{64}$'),
  command_hash text NOT NULL CHECK (command_hash ~ '^[a-f0-9]{64}$'),
  expires_at timestamptz(3) NOT NULL,
  created_at timestamptz(3) NOT NULL DEFAULT now(),
  state text NOT NULL CHECK (state IN ('reserved','started','completed','unknown','purged')),
  execution_state text NOT NULL DEFAULT 'reserved' CHECK (execution_state IN ('reserved','started','completed','unknown')),
  transcript jsonb,
  PRIMARY KEY (condominium_id,owner_user_id,chat_id,id),
  FOREIGN KEY (condominium_id,owner_user_id,chat_id) REFERENCES app.chats(condominium_id,owner_user_id,id) ON DELETE CASCADE,
  CHECK ((state IN ('unknown','purged') AND content IS NULL AND transcript IS NULL) OR
    (state IN ('reserved','started','completed') AND octet_length(content) BETWEEN 44 AND 26214400 AND content IS NOT NULL)),
  CHECK ((state = 'completed') = (transcript IS NOT NULL))
);
ALTER TABLE app.audio_originals ENABLE ROW LEVEL SECURITY;
ALTER TABLE app.audio_originals FORCE ROW LEVEL SECURITY;
GRANT SELECT,INSERT,UPDATE ON app.audio_originals TO app_runtime;
CREATE POLICY audio_owner ON app.audio_originals FOR ALL TO app_runtime
  USING (condominium_id=app.current_condominium_id() AND owner_user_id=app.current_user_id() AND
    EXISTS (SELECT 1 FROM app.chats c WHERE c.condominium_id=audio_originals.condominium_id
      AND c.owner_user_id=audio_originals.owner_user_id AND c.id=audio_originals.chat_id AND c.hidden_at IS NULL) AND
    EXISTS (SELECT 1 FROM app.memberships m WHERE m.condominium_id=audio_originals.condominium_id
      AND m.user_id=app.current_user_id() AND m.role_key='manager' AND m.status='active'
      AND m.valid_from<=now() AND (m.valid_until IS NULL OR m.valid_until>now())))
  WITH CHECK (condominium_id=app.current_condominium_id() AND owner_user_id=app.current_user_id() AND
    EXISTS (SELECT 1 FROM app.chats c WHERE c.condominium_id=audio_originals.condominium_id
      AND c.owner_user_id=audio_originals.owner_user_id AND c.id=audio_originals.chat_id AND c.hidden_at IS NULL) AND
    EXISTS (SELECT 1 FROM app.memberships m WHERE m.condominium_id=audio_originals.condominium_id
      AND m.user_id=app.current_user_id() AND m.role_key='manager' AND m.status='active'
      AND m.valid_from<=now() AND (m.valid_until IS NULL OR m.valid_until>now())));
COMMENT ON TABLE app.audio_originals IS 'Private audio originals, scoped transcript and consumed-attempt tombstones. No production transport or retention policy enabled.';
-- Only aggregate own consumption, including hidden chats. No private content or other user's
-- counters leave the definer. Hiding a conversation must not release an uncertain attempt.
CREATE FUNCTION app.audio_usage_counts(p_day date)
RETURNS TABLE(total bigint, concurrent bigint)
LANGUAGE sql STABLE SECURITY DEFINER SET search_path = pg_catalog, app AS $$
  SELECT count(*) FILTER (WHERE (a.created_at AT TIME ZONE 'UTC')::date=p_day),
    count(*) FILTER (WHERE a.execution_state IN ('reserved','started','unknown'))
  FROM app.audio_originals a
  WHERE a.condominium_id=app.current_condominium_id() AND a.owner_user_id=app.current_user_id()
    AND EXISTS (SELECT 1 FROM app.memberships m WHERE m.condominium_id=app.current_condominium_id()
      AND m.user_id=app.current_user_id() AND m.role_key='manager' AND m.status='active'
      AND m.valid_from<=now() AND (m.valid_until IS NULL OR m.valid_until>now()));
$$;
REVOKE ALL ON FUNCTION app.audio_usage_counts(date) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION app.audio_usage_counts(date) TO app_runtime;
COMMIT;
