BEGIN;

CREATE TABLE IF NOT EXISTS app.access_codes (
  user_id uuid PRIMARY KEY REFERENCES app.users(id) ON DELETE CASCADE,
  revision uuid NOT NULL,
  code_hash text NOT NULL UNIQUE CHECK (code_hash ~ '^[a-f0-9]{64}$')
);
CREATE TABLE IF NOT EXISTS app.device_sessions (
  token_hash text PRIMARY KEY CHECK (token_hash ~ '^[a-f0-9]{64}$'),
  user_id uuid NOT NULL REFERENCES app.access_codes(user_id) ON DELETE CASCADE,
  revision uuid NOT NULL,
  created_at timestamptz NOT NULL DEFAULT now()
);
ALTER TABLE app.access_codes ENABLE ROW LEVEL SECURITY;
ALTER TABLE app.access_codes FORCE ROW LEVEL SECURITY;
ALTER TABLE app.device_sessions ENABLE ROW LEVEL SECURITY;
ALTER TABLE app.device_sessions FORCE ROW LEVEL SECURITY;
REVOKE ALL ON app.access_codes, app.device_sessions FROM PUBLIC, app_runtime;

CREATE OR REPLACE FUNCTION app.find_access_code(p_hash text)
RETURNS TABLE(user_id uuid, revision uuid, code_hash text)
LANGUAGE sql STABLE SECURITY DEFINER SET search_path = app, pg_catalog AS $$
  SELECT codes.user_id, codes.revision, codes.code_hash FROM app.access_codes codes
  JOIN app.users users ON users.id = codes.user_id
  WHERE codes.code_hash = p_hash AND users.status = 'active' AND users.mfa_enabled_at IS NULL;
$$;
CREATE OR REPLACE FUNCTION app.find_user_access_code(p_user_id uuid)
RETURNS TABLE(user_id uuid, revision uuid, code_hash text)
LANGUAGE sql STABLE SECURITY DEFINER SET search_path = app, pg_catalog AS $$
  SELECT codes.user_id, codes.revision, codes.code_hash FROM app.access_codes codes
  JOIN app.users users ON users.id = codes.user_id
  WHERE codes.user_id = p_user_id AND users.status = 'active' AND users.mfa_enabled_at IS NULL;
$$;
CREATE OR REPLACE FUNCTION app.provision_access_code(p_user_id uuid, p_revision uuid, p_hash text)
RETURNS void LANGUAGE plpgsql SECURITY DEFINER SET search_path = app, pg_catalog AS $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM app.users WHERE id = p_user_id AND status = 'active' AND mfa_enabled_at IS NULL) THEN
    RAISE EXCEPTION 'Identidade indisponível para entrada por código';
  END IF;
  INSERT INTO app.access_codes(user_id, revision, code_hash) VALUES(p_user_id, p_revision, p_hash)
    ON CONFLICT(user_id) DO UPDATE SET revision = EXCLUDED.revision, code_hash = EXCLUDED.code_hash;
  DELETE FROM app.device_sessions WHERE user_id = p_user_id;
END;
$$;
CREATE OR REPLACE FUNCTION app.create_device_session(p_user_id uuid, p_revision uuid, p_hash text)
RETURNS void LANGUAGE plpgsql SECURITY DEFINER SET search_path = app, pg_catalog AS $$
BEGIN
  -- O lock da credencial serializa login com rotação; nunca confirma sessão da revisão antiga.
  PERFORM 1 FROM app.access_codes codes JOIN app.users users ON users.id = codes.user_id
    WHERE codes.user_id = p_user_id AND codes.revision = p_revision
      AND users.status = 'active' AND users.mfa_enabled_at IS NULL FOR UPDATE OF codes;
  IF NOT FOUND THEN RAISE EXCEPTION 'Credencial indisponível'; END IF;
  INSERT INTO app.device_sessions(token_hash, user_id, revision) VALUES(p_hash, p_user_id, p_revision);
END;
$$;
CREATE OR REPLACE FUNCTION app.resolve_device_session(p_hash text)
RETURNS TABLE(user_id uuid, revision uuid, code_hash text)
LANGUAGE sql STABLE SECURITY DEFINER SET search_path = app, pg_catalog AS $$
  SELECT codes.user_id, codes.revision, codes.code_hash FROM app.device_sessions sessions
  JOIN app.access_codes codes ON codes.user_id = sessions.user_id AND codes.revision = sessions.revision
  JOIN app.users users ON users.id = codes.user_id
  WHERE sessions.token_hash = p_hash AND users.status = 'active' AND users.mfa_enabled_at IS NULL;
$$;
CREATE OR REPLACE FUNCTION app.revoke_device_session(p_hash text)
RETURNS void LANGUAGE sql SECURITY DEFINER SET search_path = app, pg_catalog AS $$
  DELETE FROM app.device_sessions WHERE token_hash = p_hash;
$$;

REVOKE ALL ON FUNCTION app.find_access_code(text), app.find_user_access_code(uuid),
  app.provision_access_code(uuid,uuid,text), app.create_device_session(uuid,uuid,text),
  app.resolve_device_session(text), app.revoke_device_session(text) FROM PUBLIC;
-- Provisionamento é exclusivo do operador/migration owner, nunca do runtime público.
REVOKE ALL ON FUNCTION app.provision_access_code(uuid,uuid,text) FROM app_runtime;
GRANT EXECUTE ON FUNCTION app.find_access_code(text), app.find_user_access_code(uuid),
  app.create_device_session(uuid,uuid,text), app.resolve_device_session(text),
  app.revoke_device_session(text) TO app_runtime;

COMMIT;
