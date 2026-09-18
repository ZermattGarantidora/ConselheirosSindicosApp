BEGIN;

ALTER TABLE app.condominiums
  ADD COLUMN IF NOT EXISTS cnpj text,
  ADD COLUMN IF NOT EXISTS address jsonb NOT NULL DEFAULT '{}'::jsonb,
  ADD COLUMN IF NOT EXISTS administration_company text,
  ADD COLUMN IF NOT EXISTS unit_count integer,
  ADD COLUMN IF NOT EXISTS contact jsonb NOT NULL DEFAULT '{}'::jsonb;

CREATE UNIQUE INDEX IF NOT EXISTS condominiums_cnpj_unique
  ON app.condominiums (cnpj)
  WHERE cnpj IS NOT NULL AND length(trim(cnpj)) > 0;

CREATE OR REPLACE FUNCTION app.list_authorized_condominiums(p_auth_subject text)
RETURNS TABLE (
  condominium_id uuid,
  display_name text,
  role_key text,
  cnpj text,
  address jsonb,
  administration_company text,
  unit_count integer,
  contact jsonb
)
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = app, pg_catalog
AS $$
  SELECT
    condominiums.id,
    condominiums.display_name,
    memberships.role_key,
    condominiums.cnpj,
    condominiums.address,
    condominiums.administration_company,
    condominiums.unit_count,
    condominiums.contact
  FROM app.users AS users
  JOIN app.memberships AS memberships ON memberships.user_id = users.id
  JOIN app.condominiums AS condominiums ON condominiums.id = memberships.condominium_id
  WHERE users.auth_subject = trim(p_auth_subject)
    AND users.status = 'active'
    AND condominiums.status = 'active'
    AND memberships.status = 'active'
    AND memberships.valid_from <= now()
    AND (memberships.valid_until IS NULL OR memberships.valid_until > now())
  ORDER BY condominiums.display_name, condominiums.id;
$$;

CREATE OR REPLACE FUNCTION app.create_condominium_for_user(
  p_auth_subject text,
  p_condominium_id uuid,
  p_membership_id uuid,
  p_display_name text,
  p_cnpj text,
  p_address jsonb,
  p_administration_company text,
  p_unit_count integer,
  p_contact jsonb
)
RETURNS TABLE (
  condominium_id uuid,
  display_name text,
  role_key text,
  cnpj text,
  address jsonb,
  administration_company text,
  unit_count integer,
  contact jsonb
)
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
  WHERE auth_subject = trim(p_auth_subject)
    AND status = 'active'
  LIMIT 1;

  IF database_user_id IS NULL THEN
    RAISE EXCEPTION 'A conta ativa não foi encontrada.' USING ERRCODE = '42501';
  END IF;

  INSERT INTO app.condominiums (
    id,
    display_name,
    status,
    cnpj,
    address,
    administration_company,
    unit_count,
    contact
  )
  VALUES (
    p_condominium_id,
    trim(p_display_name),
    'active',
    NULLIF(trim(p_cnpj), ''),
    COALESCE(p_address, '{}'::jsonb),
    NULLIF(trim(p_administration_company), ''),
    p_unit_count,
    COALESCE(p_contact, '{}'::jsonb)
  );

  INSERT INTO app.memberships (
    condominium_id,
    id,
    user_id,
    role_key,
    status,
    valid_from,
    revision
  )
  VALUES (
    p_condominium_id,
    p_membership_id,
    database_user_id,
    'manager',
    'active',
    now(),
    'membership-' || p_condominium_id::text || '-v1'
  );

  RETURN QUERY
    SELECT
      condominiums.id,
      condominiums.display_name,
      'manager'::text,
      condominiums.cnpj,
      condominiums.address,
      condominiums.administration_company,
      condominiums.unit_count,
      condominiums.contact
    FROM app.condominiums AS condominiums
    WHERE condominiums.id = p_condominium_id;
END;
$$;

REVOKE ALL ON FUNCTION app.list_authorized_condominiums(text) FROM PUBLIC;
REVOKE ALL ON FUNCTION app.create_condominium_for_user(text, uuid, uuid, text, text, jsonb, text, integer, jsonb) FROM PUBLIC;

GRANT EXECUTE ON FUNCTION app.list_authorized_condominiums(text) TO app_runtime;
GRANT EXECUTE ON FUNCTION app.create_condominium_for_user(text, uuid, uuid, text, text, jsonb, text, integer, jsonb) TO app_runtime;

COMMIT;
