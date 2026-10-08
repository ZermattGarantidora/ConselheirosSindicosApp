BEGIN;

ALTER TABLE app.users
  ADD COLUMN IF NOT EXISTS email_verified_at timestamptz,
  ADD COLUMN IF NOT EXISTS mfa_secret_ciphertext text,
  ADD COLUMN IF NOT EXISTS mfa_enabled_at timestamptz,
  ADD COLUMN IF NOT EXISTS password_changed_at timestamptz;

UPDATE app.users
SET email_verified_at = COALESCE(email_verified_at, created_at)
WHERE email IS NOT NULL;

ALTER TABLE app.auth_sessions
  ADD COLUMN IF NOT EXISTS device_label text NOT NULL DEFAULT 'Navegador',
  ADD COLUMN IF NOT EXISTS last_seen_at timestamptz NOT NULL DEFAULT now();

CREATE TABLE IF NOT EXISTS app.auth_action_tokens (
  id bigserial PRIMARY KEY,
  user_id uuid NOT NULL REFERENCES app.users (id) ON DELETE CASCADE,
  purpose text NOT NULL CHECK (purpose IN ('verify_email', 'reset_password')),
  token_hash text NOT NULL UNIQUE CHECK (length(token_hash) = 64),
  expires_at timestamptz NOT NULL,
  consumed_at timestamptz,
  created_at timestamptz NOT NULL DEFAULT now(),
  CHECK (expires_at > created_at)
);

CREATE INDEX IF NOT EXISTS auth_action_tokens_active
  ON app.auth_action_tokens (token_hash, purpose, expires_at)
  WHERE consumed_at IS NULL;

CREATE TABLE IF NOT EXISTS app.auth_mfa_challenges (
  token_hash text PRIMARY KEY CHECK (length(token_hash) = 64),
  user_id uuid NOT NULL REFERENCES app.users (id) ON DELETE CASCADE,
  device_label text NOT NULL,
  attempts integer NOT NULL DEFAULT 0 CHECK (attempts >= 0),
  expires_at timestamptz NOT NULL,
  consumed_at timestamptz,
  created_at timestamptz NOT NULL DEFAULT now(),
  CHECK (expires_at > created_at)
);

CREATE INDEX IF NOT EXISTS auth_mfa_challenges_active
  ON app.auth_mfa_challenges (token_hash, expires_at)
  WHERE consumed_at IS NULL;

CREATE TABLE IF NOT EXISTS app.auth_mfa_recovery_codes (
  id bigserial PRIMARY KEY,
  user_id uuid NOT NULL REFERENCES app.users (id) ON DELETE CASCADE,
  code_hash text NOT NULL CHECK (length(code_hash) = 64),
  used_at timestamptz,
  created_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (user_id, code_hash)
);

CREATE OR REPLACE FUNCTION app.find_account_security_by_email(p_email text)
RETURNS TABLE (
  user_id uuid,
  auth_subject text,
  email text,
  display_name text,
  password_hash text,
  google_subject text,
  status text,
  email_verified_at timestamptz,
  mfa_secret_ciphertext text,
  mfa_enabled_at timestamptz
)
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = app, pg_catalog
AS $$
  SELECT users.id, users.auth_subject, users.email, users.display_name, users.password_hash,
    users.google_subject, users.status, users.email_verified_at,
    users.mfa_secret_ciphertext, users.mfa_enabled_at
  FROM app.users AS users
  WHERE lower(users.email) = lower(trim(p_email))
    AND users.status = 'active'
  LIMIT 1;
$$;

CREATE OR REPLACE FUNCTION app.create_auth_action(
  p_user_id uuid,
  p_purpose text,
  p_token_hash text,
  p_expires_at timestamptz
)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = app, pg_catalog
AS $$
BEGIN
  IF p_purpose NOT IN ('verify_email', 'reset_password') THEN
    RAISE EXCEPTION 'Finalidade de autenticação inválida.' USING ERRCODE = '22023';
  END IF;

  UPDATE app.auth_action_tokens
  SET consumed_at = now()
  WHERE user_id = p_user_id
    AND purpose = p_purpose
    AND consumed_at IS NULL;

  INSERT INTO app.auth_action_tokens (user_id, purpose, token_hash, expires_at)
  SELECT id, p_purpose, p_token_hash, p_expires_at
  FROM app.users
  WHERE id = p_user_id AND status = 'active';
END;
$$;

CREATE OR REPLACE FUNCTION app.confirm_account_email(p_token_hash text, p_now timestamptz)
RETURNS boolean
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = app, pg_catalog
AS $$
DECLARE
  target_user_id uuid;
BEGIN
  UPDATE app.auth_action_tokens
  SET consumed_at = p_now
  WHERE token_hash = p_token_hash
    AND purpose = 'verify_email'
    AND consumed_at IS NULL
    AND expires_at > p_now
  RETURNING user_id INTO target_user_id;

  IF target_user_id IS NULL THEN
    RETURN false;
  END IF;

  UPDATE app.users
  SET email_verified_at = COALESCE(email_verified_at, p_now), updated_at = p_now
  WHERE id = target_user_id AND status = 'active';
  RETURN FOUND;
END;
$$;

CREATE OR REPLACE FUNCTION app.reset_account_password(
  p_token_hash text,
  p_password_hash text,
  p_now timestamptz
)
RETURNS boolean
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = app, pg_catalog
AS $$
DECLARE
  target_user_id uuid;
BEGIN
  UPDATE app.auth_action_tokens
  SET consumed_at = p_now
  WHERE token_hash = p_token_hash
    AND purpose = 'reset_password'
    AND consumed_at IS NULL
    AND expires_at > p_now
  RETURNING user_id INTO target_user_id;

  IF target_user_id IS NULL THEN
    RETURN false;
  END IF;

  UPDATE app.users
  SET password_hash = p_password_hash, password_changed_at = p_now, updated_at = p_now
  WHERE id = target_user_id AND status = 'active';
  IF NOT FOUND THEN
    RETURN false;
  END IF;

  UPDATE app.auth_action_tokens
  SET consumed_at = COALESCE(consumed_at, p_now)
  WHERE user_id = target_user_id AND purpose = 'reset_password';

  UPDATE app.auth_sessions
  SET revoked_at = COALESCE(revoked_at, p_now)
  WHERE user_id = target_user_id AND revoked_at IS NULL;
  RETURN true;
END;
$$;

CREATE OR REPLACE FUNCTION app.find_account_security_by_session(
  p_token_hash text,
  p_now timestamptz
)
RETURNS TABLE (
  user_id uuid,
  auth_subject text,
  email text,
  display_name text,
  password_hash text,
  google_subject text,
  status text,
  email_verified_at timestamptz,
  mfa_secret_ciphertext text,
  mfa_enabled_at timestamptz
)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = app, pg_catalog
AS $$
BEGIN
  UPDATE app.auth_sessions
  SET last_seen_at = GREATEST(last_seen_at, p_now)
  WHERE token_hash = p_token_hash
    AND revoked_at IS NULL
    AND expires_at > p_now;

  RETURN QUERY
  SELECT users.id, users.auth_subject, users.email, users.display_name, users.password_hash,
    users.google_subject, users.status, users.email_verified_at,
    users.mfa_secret_ciphertext, users.mfa_enabled_at
  FROM app.auth_sessions AS sessions
  JOIN app.users AS users ON users.id = sessions.user_id
  WHERE sessions.token_hash = p_token_hash
    AND sessions.revoked_at IS NULL
    AND sessions.expires_at > p_now
    AND users.status = 'active'
  LIMIT 1;
END;
$$;

CREATE OR REPLACE FUNCTION app.create_auth_session_secure(
  p_user_id uuid,
  p_token_hash text,
  p_expires_at timestamptz,
  p_device_label text
)
RETURNS bigint
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = app, pg_catalog
AS $$
DECLARE
  created_id bigint;
BEGIN
  INSERT INTO app.auth_sessions (user_id, token_hash, expires_at, device_label, last_seen_at)
  SELECT id, p_token_hash, p_expires_at, left(trim(p_device_label), 80), now()
  FROM app.users
  WHERE id = p_user_id AND status = 'active'
  RETURNING id INTO created_id;
  RETURN created_id;
END;
$$;

CREATE OR REPLACE FUNCTION app.change_account_password(
  p_current_token_hash text,
  p_password_hash text
)
RETURNS boolean
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = app, pg_catalog
AS $$
DECLARE
  target_user_id uuid;
BEGIN
  SELECT user_id INTO target_user_id
  FROM app.auth_sessions
  WHERE token_hash = p_current_token_hash
    AND revoked_at IS NULL
    AND expires_at > now()
  LIMIT 1;

  IF target_user_id IS NULL THEN
    RETURN false;
  END IF;

  UPDATE app.users
  SET password_hash = p_password_hash, password_changed_at = now(), updated_at = now()
  WHERE id = target_user_id AND status = 'active';

  UPDATE app.auth_sessions
  SET revoked_at = now()
  WHERE user_id = target_user_id
    AND token_hash <> p_current_token_hash
    AND revoked_at IS NULL;
  RETURN true;
END;
$$;

CREATE OR REPLACE FUNCTION app.create_mfa_challenge(
  p_user_id uuid,
  p_token_hash text,
  p_device_label text,
  p_expires_at timestamptz
)
RETURNS void
LANGUAGE sql
SECURITY DEFINER
SET search_path = app, pg_catalog
AS $$
  INSERT INTO app.auth_mfa_challenges (token_hash, user_id, device_label, expires_at)
  SELECT p_token_hash, id, left(trim(p_device_label), 80), p_expires_at
  FROM app.users
  WHERE id = p_user_id AND status = 'active' AND mfa_enabled_at IS NOT NULL;
$$;

CREATE OR REPLACE FUNCTION app.find_mfa_challenge(p_token_hash text, p_now timestamptz)
RETURNS TABLE (
  user_id uuid,
  auth_subject text,
  email text,
  display_name text,
  password_hash text,
  google_subject text,
  status text,
  email_verified_at timestamptz,
  mfa_secret_ciphertext text,
  mfa_enabled_at timestamptz,
  device_label text,
  attempts integer,
  expires_at timestamptz
)
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = app, pg_catalog
AS $$
  SELECT users.id, users.auth_subject, users.email, users.display_name, users.password_hash,
    users.google_subject, users.status, users.email_verified_at,
    users.mfa_secret_ciphertext, users.mfa_enabled_at,
    challenges.device_label, challenges.attempts, challenges.expires_at
  FROM app.auth_mfa_challenges AS challenges
  JOIN app.users AS users ON users.id = challenges.user_id
  WHERE challenges.token_hash = p_token_hash
    AND challenges.consumed_at IS NULL
    AND challenges.expires_at > p_now
    AND users.status = 'active'
  LIMIT 1;
$$;

CREATE OR REPLACE FUNCTION app.record_mfa_failure(p_token_hash text, p_maximum_attempts integer)
RETURNS void
LANGUAGE sql
SECURITY DEFINER
SET search_path = app, pg_catalog
AS $$
  UPDATE app.auth_mfa_challenges
  SET attempts = attempts + 1,
      consumed_at = CASE WHEN attempts + 1 >= p_maximum_attempts THEN now() ELSE consumed_at END
  WHERE token_hash = p_token_hash AND consumed_at IS NULL;
$$;

CREATE OR REPLACE FUNCTION app.consume_mfa_challenge(p_token_hash text)
RETURNS void
LANGUAGE sql
SECURITY DEFINER
SET search_path = app, pg_catalog
AS $$
  UPDATE app.auth_mfa_challenges
  SET consumed_at = now()
  WHERE token_hash = p_token_hash AND consumed_at IS NULL;
$$;

CREATE OR REPLACE FUNCTION app.set_pending_mfa_secret(
  p_current_token_hash text,
  p_ciphertext text
)
RETURNS boolean
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = app, pg_catalog
AS $$
DECLARE
  target_user_id uuid;
BEGIN
  SELECT sessions.user_id INTO target_user_id
  FROM app.auth_sessions AS sessions
  JOIN app.users AS users ON users.id = sessions.user_id
  WHERE sessions.token_hash = p_current_token_hash
    AND sessions.revoked_at IS NULL
    AND sessions.expires_at > now()
    AND users.mfa_enabled_at IS NULL
  LIMIT 1;
  IF target_user_id IS NULL THEN RETURN false; END IF;
  UPDATE app.users
  SET mfa_secret_ciphertext = p_ciphertext, mfa_enabled_at = NULL, updated_at = now()
  WHERE id = target_user_id;
  DELETE FROM app.auth_mfa_recovery_codes WHERE user_id = target_user_id;
  RETURN true;
END;
$$;

CREATE OR REPLACE FUNCTION app.enable_account_mfa(
  p_current_token_hash text,
  p_recovery_code_hashes text[]
)
RETURNS boolean
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = app, pg_catalog
AS $$
DECLARE
  target_user_id uuid;
BEGIN
  SELECT sessions.user_id INTO target_user_id
  FROM app.auth_sessions AS sessions
  JOIN app.users AS users ON users.id = sessions.user_id
  WHERE sessions.token_hash = p_current_token_hash
    AND sessions.revoked_at IS NULL
    AND sessions.expires_at > now()
    AND users.mfa_secret_ciphertext IS NOT NULL
  LIMIT 1;
  IF target_user_id IS NULL THEN RETURN false; END IF;
  UPDATE app.users SET mfa_enabled_at = now(), updated_at = now() WHERE id = target_user_id;
  DELETE FROM app.auth_mfa_recovery_codes WHERE user_id = target_user_id;
  INSERT INTO app.auth_mfa_recovery_codes (user_id, code_hash)
  SELECT target_user_id, code_hash
  FROM unnest(p_recovery_code_hashes) AS code_hash;
  RETURN true;
END;
$$;

CREATE OR REPLACE FUNCTION app.consume_mfa_recovery_code(p_user_id uuid, p_code_hash text)
RETURNS boolean
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = app, pg_catalog
AS $$
BEGIN
  UPDATE app.auth_mfa_recovery_codes
  SET used_at = now()
  WHERE user_id = p_user_id AND code_hash = p_code_hash AND used_at IS NULL;
  RETURN FOUND;
END;
$$;

CREATE OR REPLACE FUNCTION app.disable_account_mfa(p_current_token_hash text)
RETURNS boolean
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = app, pg_catalog
AS $$
DECLARE
  target_user_id uuid;
BEGIN
  SELECT user_id INTO target_user_id
  FROM app.auth_sessions
  WHERE token_hash = p_current_token_hash AND revoked_at IS NULL AND expires_at > now()
  LIMIT 1;
  IF target_user_id IS NULL THEN RETURN false; END IF;
  UPDATE app.users
  SET mfa_secret_ciphertext = NULL, mfa_enabled_at = NULL, updated_at = now()
  WHERE id = target_user_id;
  DELETE FROM app.auth_mfa_recovery_codes WHERE user_id = target_user_id;
  RETURN true;
END;
$$;

CREATE OR REPLACE FUNCTION app.list_account_sessions(p_current_token_hash text, p_now timestamptz)
RETURNS TABLE (
  session_id bigint,
  device_label text,
  created_at timestamptz,
  last_seen_at timestamptz,
  expires_at timestamptz,
  current boolean
)
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = app, pg_catalog
AS $$
  WITH actor AS (
    SELECT user_id
    FROM app.auth_sessions
    WHERE token_hash = p_current_token_hash
      AND revoked_at IS NULL
      AND expires_at > p_now
    LIMIT 1
  )
  SELECT sessions.id, sessions.device_label, sessions.created_at, sessions.last_seen_at,
    sessions.expires_at, sessions.token_hash = p_current_token_hash
  FROM app.auth_sessions AS sessions
  JOIN actor ON actor.user_id = sessions.user_id
  WHERE sessions.revoked_at IS NULL AND sessions.expires_at > p_now
  ORDER BY (sessions.token_hash = p_current_token_hash) DESC, sessions.last_seen_at DESC;
$$;

CREATE OR REPLACE FUNCTION app.revoke_owned_auth_session(
  p_current_token_hash text,
  p_session_id bigint
)
RETURNS boolean
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = app, pg_catalog
AS $$
DECLARE
  target_user_id uuid;
BEGIN
  SELECT user_id INTO target_user_id
  FROM app.auth_sessions
  WHERE token_hash = p_current_token_hash AND revoked_at IS NULL AND expires_at > now()
  LIMIT 1;
  IF target_user_id IS NULL THEN RETURN false; END IF;
  UPDATE app.auth_sessions
  SET revoked_at = now()
  WHERE id = p_session_id AND user_id = target_user_id AND revoked_at IS NULL;
  RETURN FOUND;
END;
$$;

CREATE OR REPLACE FUNCTION app.revoke_other_auth_sessions(p_current_token_hash text)
RETURNS void
LANGUAGE sql
SECURITY DEFINER
SET search_path = app, pg_catalog
AS $$
  UPDATE app.auth_sessions
  SET revoked_at = now()
  WHERE user_id = (
    SELECT user_id
    FROM app.auth_sessions
    WHERE token_hash = p_current_token_hash AND revoked_at IS NULL AND expires_at > now()
    LIMIT 1
  )
  AND token_hash <> p_current_token_hash
  AND revoked_at IS NULL;
$$;

REVOKE ALL ON TABLE app.auth_action_tokens, app.auth_mfa_challenges,
  app.auth_mfa_recovery_codes FROM PUBLIC, app_runtime;

REVOKE ALL ON FUNCTION app.find_account_security_by_email(text) FROM PUBLIC;
REVOKE ALL ON FUNCTION app.create_auth_action(uuid, text, text, timestamptz) FROM PUBLIC;
REVOKE ALL ON FUNCTION app.confirm_account_email(text, timestamptz) FROM PUBLIC;
REVOKE ALL ON FUNCTION app.reset_account_password(text, text, timestamptz) FROM PUBLIC;
REVOKE ALL ON FUNCTION app.find_account_security_by_session(text, timestamptz) FROM PUBLIC;
REVOKE ALL ON FUNCTION app.create_auth_session_secure(uuid, text, timestamptz, text) FROM PUBLIC;
REVOKE ALL ON FUNCTION app.change_account_password(text, text) FROM PUBLIC;
REVOKE ALL ON FUNCTION app.create_mfa_challenge(uuid, text, text, timestamptz) FROM PUBLIC;
REVOKE ALL ON FUNCTION app.find_mfa_challenge(text, timestamptz) FROM PUBLIC;
REVOKE ALL ON FUNCTION app.record_mfa_failure(text, integer) FROM PUBLIC;
REVOKE ALL ON FUNCTION app.consume_mfa_challenge(text) FROM PUBLIC;
REVOKE ALL ON FUNCTION app.set_pending_mfa_secret(text, text) FROM PUBLIC;
REVOKE ALL ON FUNCTION app.enable_account_mfa(text, text[]) FROM PUBLIC;
REVOKE ALL ON FUNCTION app.consume_mfa_recovery_code(uuid, text) FROM PUBLIC;
REVOKE ALL ON FUNCTION app.disable_account_mfa(text) FROM PUBLIC;
REVOKE ALL ON FUNCTION app.list_account_sessions(text, timestamptz) FROM PUBLIC;
REVOKE ALL ON FUNCTION app.revoke_owned_auth_session(text, bigint) FROM PUBLIC;
REVOKE ALL ON FUNCTION app.revoke_other_auth_sessions(text) FROM PUBLIC;

GRANT EXECUTE ON FUNCTION app.find_account_security_by_email(text) TO app_runtime;
GRANT EXECUTE ON FUNCTION app.create_auth_action(uuid, text, text, timestamptz) TO app_runtime;
GRANT EXECUTE ON FUNCTION app.confirm_account_email(text, timestamptz) TO app_runtime;
GRANT EXECUTE ON FUNCTION app.reset_account_password(text, text, timestamptz) TO app_runtime;
GRANT EXECUTE ON FUNCTION app.find_account_security_by_session(text, timestamptz) TO app_runtime;
GRANT EXECUTE ON FUNCTION app.create_auth_session_secure(uuid, text, timestamptz, text) TO app_runtime;
GRANT EXECUTE ON FUNCTION app.change_account_password(text, text) TO app_runtime;
GRANT EXECUTE ON FUNCTION app.create_mfa_challenge(uuid, text, text, timestamptz) TO app_runtime;
GRANT EXECUTE ON FUNCTION app.find_mfa_challenge(text, timestamptz) TO app_runtime;
GRANT EXECUTE ON FUNCTION app.record_mfa_failure(text, integer) TO app_runtime;
GRANT EXECUTE ON FUNCTION app.consume_mfa_challenge(text) TO app_runtime;
GRANT EXECUTE ON FUNCTION app.set_pending_mfa_secret(text, text) TO app_runtime;
GRANT EXECUTE ON FUNCTION app.enable_account_mfa(text, text[]) TO app_runtime;
GRANT EXECUTE ON FUNCTION app.consume_mfa_recovery_code(uuid, text) TO app_runtime;
GRANT EXECUTE ON FUNCTION app.disable_account_mfa(text) TO app_runtime;
GRANT EXECUTE ON FUNCTION app.list_account_sessions(text, timestamptz) TO app_runtime;
GRANT EXECUTE ON FUNCTION app.revoke_owned_auth_session(text, bigint) TO app_runtime;
GRANT EXECUTE ON FUNCTION app.revoke_other_auth_sessions(text) TO app_runtime;

COMMIT;
