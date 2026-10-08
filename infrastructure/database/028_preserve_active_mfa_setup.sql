BEGIN;

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
    AND users.status = 'active'
    AND users.mfa_enabled_at IS NULL
  LIMIT 1;

  IF target_user_id IS NULL THEN
    RETURN false;
  END IF;

  UPDATE app.users
  SET mfa_secret_ciphertext = p_ciphertext, mfa_enabled_at = NULL, updated_at = now()
  WHERE id = target_user_id;

  DELETE FROM app.auth_mfa_recovery_codes WHERE user_id = target_user_id;
  RETURN true;
END;
$$;

REVOKE ALL ON FUNCTION app.set_pending_mfa_secret(text, text) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION app.set_pending_mfa_secret(text, text) TO app_runtime;

COMMIT;
