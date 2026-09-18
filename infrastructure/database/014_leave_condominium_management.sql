BEGIN;

CREATE OR REPLACE FUNCTION app.leave_condominium_for_user(
  p_auth_subject text,
  p_condominium_id uuid
)
RETURNS boolean
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = app, pg_catalog
AS $$
DECLARE
  database_user_id uuid;
BEGIN
  SELECT id
  INTO database_user_id
  FROM app.users
  WHERE (auth_subject = trim(p_auth_subject) OR id::text = trim(p_auth_subject))
    AND status = 'active'
  LIMIT 1;

  IF database_user_id IS NULL THEN
    RAISE EXCEPTION 'A conta ativa não foi encontrada.' USING ERRCODE = '42501';
  END IF;

  UPDATE app.memberships
  SET
    status = 'revoked',
    revoked_at = now(),
    valid_until = now(),
    revision = revision || '-revoked',
    updated_at = now()
  WHERE condominium_id = p_condominium_id
    AND user_id = database_user_id
    AND status = 'active';

  IF NOT FOUND THEN
    RAISE EXCEPTION 'O condomínio não está associado à sua conta.' USING ERRCODE = '42501';
  END IF;

  RETURN true;
END;
$$;

REVOKE ALL ON FUNCTION app.leave_condominium_for_user(text, uuid) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION app.leave_condominium_for_user(text, uuid) TO app_runtime;

COMMIT;
