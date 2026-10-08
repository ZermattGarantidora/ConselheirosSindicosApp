BEGIN;

CREATE OR REPLACE FUNCTION app.resolve_auth_session(
  p_token_hash text,
  p_now timestamptz
)
RETURNS TABLE (
  user_id uuid,
  email text,
  display_name text
)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = app, pg_catalog
AS $$
BEGIN
  UPDATE app.auth_sessions AS sessions
  SET last_seen_at = GREATEST(sessions.last_seen_at, p_now)
  WHERE sessions.token_hash = p_token_hash
    AND sessions.revoked_at IS NULL
    AND sessions.expires_at > p_now;

  RETURN QUERY
  SELECT users.id, users.email, users.display_name
  FROM app.auth_sessions AS sessions
  JOIN app.users AS users ON users.id = sessions.user_id
  WHERE sessions.token_hash = p_token_hash
    AND sessions.revoked_at IS NULL
    AND sessions.expires_at > p_now
    AND users.status = 'active'
  LIMIT 1;
END;
$$;

REVOKE ALL ON FUNCTION app.resolve_auth_session(text, timestamptz) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION app.resolve_auth_session(text, timestamptz) TO app_runtime;

COMMIT;
