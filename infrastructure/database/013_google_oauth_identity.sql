BEGIN;

ALTER TABLE app.users
  ADD COLUMN IF NOT EXISTS google_subject text;

CREATE UNIQUE INDEX IF NOT EXISTS users_google_subject_unique
  ON app.users (google_subject)
  WHERE google_subject IS NOT NULL;

CREATE OR REPLACE FUNCTION app.find_or_create_google_account(
  p_user_id uuid,
  p_auth_subject text,
  p_google_subject text,
  p_email text,
  p_display_name text
)
RETURNS TABLE (
  user_id uuid,
  auth_subject text,
  google_subject text,
  email text,
  display_name text,
  password_hash text,
  status text
)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = app, pg_catalog
AS $$
DECLARE
  existing app.users%ROWTYPE;
BEGIN
  SELECT *
  INTO existing
  FROM app.users
  WHERE users.google_subject = trim(p_google_subject)
    AND users.status = 'active'
  LIMIT 1;

  IF FOUND THEN
    RETURN QUERY
      SELECT existing.id, existing.auth_subject, existing.google_subject,
        existing.email, existing.display_name, existing.password_hash, existing.status;
    RETURN;
  END IF;

  SELECT *
  INTO existing
  FROM app.users
  WHERE lower(users.email) = lower(trim(p_email))
  LIMIT 1;

  IF FOUND THEN
    IF existing.status <> 'active' THEN
      RAISE EXCEPTION 'A conta não está disponível.' USING ERRCODE = '42501';
    END IF;

    UPDATE app.users
    SET google_subject = trim(p_google_subject),
        display_name = COALESCE(NULLIF(trim(p_display_name), ''), display_name),
        updated_at = now()
    WHERE id = existing.id;

    RETURN QUERY
      SELECT users.id, users.auth_subject, users.google_subject,
        users.email, users.display_name, users.password_hash, users.status
      FROM app.users AS users
      WHERE users.id = existing.id;
    RETURN;
  END IF;

  INSERT INTO app.users (
    id,
    auth_subject,
    google_subject,
    email,
    display_name,
    password_hash,
    status
  )
  VALUES (
    p_user_id,
    trim(p_auth_subject),
    trim(p_google_subject),
    lower(trim(p_email)),
    trim(p_display_name),
    NULL,
    'active'
  )
  RETURNING id, auth_subject, google_subject,
    email, display_name, password_hash, status
  INTO user_id, auth_subject, google_subject, email, display_name, password_hash, status;

  RETURN NEXT;
END;
$$;

REVOKE ALL ON FUNCTION app.find_or_create_google_account(uuid, text, text, text, text) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION app.find_or_create_google_account(uuid, text, text, text, text) TO app_runtime;

COMMIT;
