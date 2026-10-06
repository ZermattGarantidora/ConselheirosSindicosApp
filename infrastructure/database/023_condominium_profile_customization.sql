BEGIN;

ALTER TABLE app.condominiums
  ADD COLUMN IF NOT EXISTS profile_description text
    CHECK (profile_description IS NULL OR char_length(profile_description) <= 500);

CREATE TABLE app.condominium_profile_photos (
  condominium_id uuid NOT NULL REFERENCES app.condominiums (id) ON DELETE CASCADE,
  id uuid NOT NULL,
  media_type text NOT NULL CHECK (media_type IN ('image/jpeg', 'image/png', 'image/webp')),
  content bytea NOT NULL CHECK (octet_length(content) BETWEEN 1 AND 5242880),
  is_cover boolean NOT NULL DEFAULT false,
  created_by_user_id uuid NOT NULL REFERENCES app.users (id) ON DELETE RESTRICT,
  created_at timestamptz NOT NULL DEFAULT now(),
  PRIMARY KEY (condominium_id, id)
);

CREATE UNIQUE INDEX condominium_profile_photos_one_cover
  ON app.condominium_profile_photos (condominium_id)
  WHERE is_cover;

CREATE INDEX condominium_profile_photos_by_tenant
  ON app.condominium_profile_photos (condominium_id, created_at, id);

ALTER TABLE app.condominium_profile_photos ENABLE ROW LEVEL SECURITY;
ALTER TABLE app.condominium_profile_photos FORCE ROW LEVEL SECURITY;

GRANT SELECT ON app.condominium_profile_photos TO app_runtime;

CREATE POLICY condominium_profile_photos_active_member_read
  ON app.condominium_profile_photos
  FOR SELECT
  USING (
    condominium_id = app.current_condominium_id()
    AND EXISTS (
      SELECT 1
      FROM app.memberships
      WHERE memberships.condominium_id = condominium_profile_photos.condominium_id
        AND memberships.user_id = app.current_user_id()
        AND memberships.status = 'active'
        AND memberships.valid_from <= now()
        AND (memberships.valid_until IS NULL OR memberships.valid_until > now())
    )
  );

CREATE POLICY condominium_profile_photos_manager_insert
  ON app.condominium_profile_photos
  FOR INSERT
  WITH CHECK (
    condominium_id = app.current_condominium_id()
    AND created_by_user_id = app.current_user_id()
    AND EXISTS (
      SELECT 1
      FROM app.memberships
      WHERE memberships.condominium_id = condominium_profile_photos.condominium_id
        AND memberships.user_id = app.current_user_id()
        AND memberships.role_key = 'manager'
        AND memberships.status = 'active'
        AND memberships.valid_from <= now()
        AND (memberships.valid_until IS NULL OR memberships.valid_until > now())
    )
  );

CREATE POLICY condominium_profile_photos_manager_update
  ON app.condominium_profile_photos
  FOR UPDATE
  USING (
    condominium_id = app.current_condominium_id()
    AND EXISTS (
      SELECT 1
      FROM app.memberships
      WHERE memberships.condominium_id = condominium_profile_photos.condominium_id
        AND memberships.user_id = app.current_user_id()
        AND memberships.role_key = 'manager'
        AND memberships.status = 'active'
        AND memberships.valid_from <= now()
        AND (memberships.valid_until IS NULL OR memberships.valid_until > now())
    )
  )
  WITH CHECK (condominium_id = app.current_condominium_id());

CREATE POLICY condominium_profile_photos_manager_delete
  ON app.condominium_profile_photos
  FOR DELETE
  USING (
    condominium_id = app.current_condominium_id()
    AND EXISTS (
      SELECT 1
      FROM app.memberships
      WHERE memberships.condominium_id = condominium_profile_photos.condominium_id
        AND memberships.user_id = app.current_user_id()
        AND memberships.role_key = 'manager'
        AND memberships.status = 'active'
        AND memberships.valid_from <= now()
        AND (memberships.valid_until IS NULL OR memberships.valid_until > now())
    )
  );

CREATE POLICY condominiums_profile_manager_update
  ON app.condominiums
  FOR UPDATE
  USING (
    id = app.current_condominium_id()
    AND EXISTS (
      SELECT 1
      FROM app.memberships
      WHERE memberships.condominium_id = condominiums.id
        AND memberships.user_id = app.current_user_id()
        AND memberships.role_key = 'manager'
        AND memberships.status = 'active'
        AND memberships.valid_from <= now()
        AND (memberships.valid_until IS NULL OR memberships.valid_until > now())
    )
  )
  WITH CHECK (id = app.current_condominium_id());

CREATE OR REPLACE FUNCTION app.profile_actor_is_manager(
  p_user_identity text,
  p_condominium_id uuid
)
RETURNS uuid
LANGUAGE plpgsql
STABLE
SECURITY DEFINER
SET search_path = app, pg_catalog
AS $$
DECLARE
  database_user_id uuid;
BEGIN
  SELECT id
  INTO database_user_id
  FROM app.users
  WHERE (auth_subject = trim(p_user_identity) OR id::text = trim(p_user_identity))
    AND status = 'active'
  LIMIT 1;

  IF database_user_id IS NULL
     OR database_user_id <> app.current_user_id()
     OR p_condominium_id <> app.current_condominium_id()
     OR NOT EXISTS (
       SELECT 1
       FROM app.memberships
       WHERE condominium_id = p_condominium_id
         AND user_id = database_user_id
         AND role_key = 'manager'
         AND status = 'active'
         AND valid_from <= now()
         AND (valid_until IS NULL OR valid_until > now())
     ) THEN
    RAISE EXCEPTION 'Acesso ao perfil não autorizado.' USING ERRCODE = '42501';
  END IF;

  RETURN database_user_id;
END;
$$;

CREATE OR REPLACE FUNCTION app.update_condominium_profile(
  p_user_identity text,
  p_condominium_id uuid,
  p_display_name text,
  p_address jsonb,
  p_administration_company text,
  p_unit_count integer,
  p_contact jsonb,
  p_profile_description text
)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = app, pg_catalog
AS $$
BEGIN
  PERFORM app.profile_actor_is_manager(p_user_identity, p_condominium_id);

  IF COALESCE(length(trim(p_display_name)), 0) NOT BETWEEN 2 AND 120
     OR (p_unit_count IS NOT NULL AND p_unit_count NOT BETWEEN 1 AND 100000)
     OR (p_profile_description IS NOT NULL AND char_length(p_profile_description) > 500)
     OR jsonb_typeof(p_address) IS DISTINCT FROM 'object'
     OR jsonb_typeof(p_contact) IS DISTINCT FROM 'object'
     OR length(trim(COALESCE(p_address ->> 'city', ''))) NOT BETWEEN 1 AND 80
     OR upper(trim(COALESCE(p_address ->> 'state', ''))) !~ '^[A-Z]{2}$' THEN
    RAISE EXCEPTION 'Dados do perfil fora dos limites permitidos.' USING ERRCODE = '22023';
  END IF;

  UPDATE app.condominiums
  SET display_name = trim(p_display_name),
      address = p_address,
      administration_company = NULLIF(trim(p_administration_company), ''),
      unit_count = p_unit_count,
      contact = p_contact,
      profile_description = NULLIF(trim(p_profile_description), ''),
      updated_at = now()
  WHERE id = p_condominium_id;

  IF NOT FOUND THEN
    RAISE EXCEPTION 'Condomínio não encontrado.' USING ERRCODE = '42501';
  END IF;
END;
$$;

CREATE OR REPLACE FUNCTION app.add_condominium_profile_photo(
  p_user_identity text,
  p_condominium_id uuid,
  p_photo_id uuid,
  p_media_type text,
  p_content bytea
)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = app, pg_catalog
AS $$
DECLARE
  database_user_id uuid;
  current_count integer;
  first_photo boolean;
BEGIN
  database_user_id := app.profile_actor_is_manager(p_user_identity, p_condominium_id);
  PERFORM 1 FROM app.condominiums WHERE id = p_condominium_id FOR UPDATE;

  SELECT count(*)::integer INTO current_count
  FROM app.condominium_profile_photos
  WHERE condominium_id = p_condominium_id;
  IF current_count >= 5 THEN
    RAISE EXCEPTION 'Este condomínio já tem o limite de cinco fotos.' USING ERRCODE = 'P0001';
  END IF;

  IF octet_length(p_content) NOT BETWEEN 1 AND 5242880
     OR NOT (
       (p_media_type = 'image/jpeg' AND substring(p_content FROM 1 FOR 3) = decode('ffd8ff', 'hex'))
       OR (p_media_type = 'image/png' AND substring(p_content FROM 1 FOR 8) = decode('89504e470d0a1a0a', 'hex'))
       OR (p_media_type = 'image/webp'
           AND substring(p_content FROM 1 FOR 4) = convert_to('RIFF', 'UTF8')
           AND substring(p_content FROM 9 FOR 4) = convert_to('WEBP', 'UTF8'))
     ) THEN
    RAISE EXCEPTION 'Formato ou tamanho de foto inválido.' USING ERRCODE = '22023';
  END IF;

  first_photo := current_count = 0;
  INSERT INTO app.condominium_profile_photos (
    condominium_id, id, media_type, content, is_cover, created_by_user_id
  ) VALUES (
    p_condominium_id, p_photo_id, p_media_type, p_content, first_photo, database_user_id
  );
END;
$$;

CREATE OR REPLACE FUNCTION app.set_condominium_profile_photo_cover(
  p_user_identity text,
  p_condominium_id uuid,
  p_photo_id uuid
)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = app, pg_catalog
AS $$
BEGIN
  PERFORM app.profile_actor_is_manager(p_user_identity, p_condominium_id);
  PERFORM 1 FROM app.condominiums WHERE id = p_condominium_id FOR UPDATE;
  UPDATE app.condominium_profile_photos
  SET is_cover = false
  WHERE condominium_id = p_condominium_id AND is_cover;
  UPDATE app.condominium_profile_photos
  SET is_cover = true
  WHERE condominium_id = p_condominium_id AND id = p_photo_id;
  IF NOT FOUND THEN
    RAISE EXCEPTION 'Foto não encontrada.' USING ERRCODE = 'P0002';
  END IF;
END;
$$;

CREATE OR REPLACE FUNCTION app.delete_condominium_profile_photo(
  p_user_identity text,
  p_condominium_id uuid,
  p_photo_id uuid
)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = app, pg_catalog
AS $$
DECLARE
  removed_cover boolean;
  next_cover_id uuid;
BEGIN
  PERFORM app.profile_actor_is_manager(p_user_identity, p_condominium_id);
  PERFORM 1 FROM app.condominiums WHERE id = p_condominium_id FOR UPDATE;
  DELETE FROM app.condominium_profile_photos
  WHERE condominium_id = p_condominium_id AND id = p_photo_id
  RETURNING is_cover INTO removed_cover;
  IF NOT FOUND THEN
    RAISE EXCEPTION 'Foto não encontrada.' USING ERRCODE = 'P0002';
  END IF;

  IF removed_cover THEN
    SELECT id INTO next_cover_id
    FROM app.condominium_profile_photos
    WHERE condominium_id = p_condominium_id
    ORDER BY created_at, id
    LIMIT 1;
    IF next_cover_id IS NOT NULL THEN
      UPDATE app.condominium_profile_photos
      SET is_cover = true
      WHERE condominium_id = p_condominium_id AND id = next_cover_id;
    END IF;
  END IF;
END;
$$;

REVOKE ALL ON FUNCTION app.profile_actor_is_manager(text, uuid) FROM PUBLIC;
REVOKE ALL ON FUNCTION app.update_condominium_profile(text, uuid, text, jsonb, text, integer, jsonb, text) FROM PUBLIC;
REVOKE ALL ON FUNCTION app.add_condominium_profile_photo(text, uuid, uuid, text, bytea) FROM PUBLIC;
REVOKE ALL ON FUNCTION app.set_condominium_profile_photo_cover(text, uuid, uuid) FROM PUBLIC;
REVOKE ALL ON FUNCTION app.delete_condominium_profile_photo(text, uuid, uuid) FROM PUBLIC;

GRANT EXECUTE ON FUNCTION app.update_condominium_profile(text, uuid, text, jsonb, text, integer, jsonb, text) TO app_runtime;
GRANT EXECUTE ON FUNCTION app.add_condominium_profile_photo(text, uuid, uuid, text, bytea) TO app_runtime;
GRANT EXECUTE ON FUNCTION app.set_condominium_profile_photo_cover(text, uuid, uuid) TO app_runtime;
GRANT EXECUTE ON FUNCTION app.delete_condominium_profile_photo(text, uuid, uuid) TO app_runtime;

COMMIT;
