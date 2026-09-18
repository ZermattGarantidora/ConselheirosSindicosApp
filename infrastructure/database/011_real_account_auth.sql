BEGIN;

ALTER TABLE app.users
  ADD COLUMN IF NOT EXISTS email text,
  ADD COLUMN IF NOT EXISTS display_name text,
  ADD COLUMN IF NOT EXISTS password_hash text;

CREATE UNIQUE INDEX IF NOT EXISTS users_email_unique
  ON app.users (lower(email))
  WHERE email IS NOT NULL;

CREATE TABLE IF NOT EXISTS app.auth_sessions (
  id bigserial PRIMARY KEY,
  user_id uuid NOT NULL REFERENCES app.users (id) ON DELETE CASCADE,
  token_hash text NOT NULL UNIQUE CHECK (length(token_hash) = 64),
  expires_at timestamptz NOT NULL,
  revoked_at timestamptz,
  created_at timestamptz NOT NULL DEFAULT now(),
  CHECK (expires_at > created_at)
);

CREATE INDEX IF NOT EXISTS auth_sessions_active_by_token
  ON app.auth_sessions (token_hash, expires_at)
  WHERE revoked_at IS NULL;

CREATE OR REPLACE FUNCTION app.create_account(
  p_user_id uuid,
  p_auth_subject text,
  p_email text,
  p_display_name text,
  p_password_hash text
)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = app, pg_catalog
AS $$
BEGIN
  INSERT INTO app.users (id, auth_subject, email, display_name, password_hash, status)
  VALUES (p_user_id, p_auth_subject, lower(trim(p_email)), trim(p_display_name), p_password_hash, 'active');
END;
$$;

CREATE OR REPLACE FUNCTION app.find_account_by_email(p_email text)
RETURNS TABLE (
  user_id uuid,
  auth_subject text,
  email text,
  display_name text,
  password_hash text,
  status text
)
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = app, pg_catalog
AS $$
  SELECT id, auth_subject, users.email, users.display_name, users.password_hash, users.status
  FROM app.users AS users
  WHERE lower(users.email) = lower(trim(p_email))
    AND users.status = 'active'
    AND users.password_hash IS NOT NULL
  LIMIT 1;
$$;

CREATE OR REPLACE FUNCTION app.create_auth_session(
  p_user_id uuid,
  p_token_hash text,
  p_expires_at timestamptz
)
RETURNS void
LANGUAGE sql
SECURITY DEFINER
SET search_path = app, pg_catalog
AS $$
  INSERT INTO app.auth_sessions (user_id, token_hash, expires_at)
  SELECT id, p_token_hash, p_expires_at
  FROM app.users
  WHERE id = p_user_id AND status = 'active';
$$;

CREATE OR REPLACE FUNCTION app.resolve_auth_session(
  p_token_hash text,
  p_now timestamptz
)
RETURNS TABLE (
  user_id uuid,
  email text,
  display_name text
)
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = app, pg_catalog
AS $$
  SELECT users.id, users.email, users.display_name
  FROM app.auth_sessions AS sessions
  JOIN app.users AS users ON users.id = sessions.user_id
  WHERE sessions.token_hash = p_token_hash
    AND sessions.revoked_at IS NULL
    AND sessions.expires_at > p_now
    AND users.status = 'active'
  LIMIT 1;
$$;

CREATE OR REPLACE FUNCTION app.revoke_auth_session(p_token_hash text)
RETURNS void
LANGUAGE sql
SECURITY DEFINER
SET search_path = app, pg_catalog
AS $$
  UPDATE app.auth_sessions
  SET revoked_at = now()
  WHERE token_hash = p_token_hash
    AND revoked_at IS NULL;
$$;

REVOKE ALL ON FUNCTION app.create_account(uuid, text, text, text, text) FROM PUBLIC;
REVOKE ALL ON FUNCTION app.find_account_by_email(text) FROM PUBLIC;
REVOKE ALL ON FUNCTION app.create_auth_session(uuid, text, timestamptz) FROM PUBLIC;
REVOKE ALL ON FUNCTION app.resolve_auth_session(text, timestamptz) FROM PUBLIC;
REVOKE ALL ON FUNCTION app.revoke_auth_session(text) FROM PUBLIC;

GRANT EXECUTE ON FUNCTION app.create_account(uuid, text, text, text, text) TO app_runtime;
GRANT EXECUTE ON FUNCTION app.find_account_by_email(text) TO app_runtime;
GRANT EXECUTE ON FUNCTION app.create_auth_session(uuid, text, timestamptz) TO app_runtime;
GRANT EXECUTE ON FUNCTION app.resolve_auth_session(text, timestamptz) TO app_runtime;
GRANT EXECUTE ON FUNCTION app.revoke_auth_session(text) TO app_runtime;

COMMIT;
