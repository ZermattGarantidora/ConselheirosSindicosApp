BEGIN;

-- Prepared only. No login, credentials, provider activation or runtime role membership is created.
DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_roles WHERE rolname = 'app_ai_executor') THEN
    CREATE ROLE app_ai_executor NOLOGIN NOSUPERUSER NOBYPASSRLS NOCREATEDB NOCREATEROLE NOREPLICATION;
  END IF;
  IF EXISTS (SELECT 1 FROM pg_roles WHERE rolname = 'app_ai_executor' AND
      (rolcanlogin OR rolsuper OR rolbypassrls OR rolcreatedb OR rolcreaterole OR rolreplication)) THEN
    RAISE EXCEPTION 'Papel do ledger incompatível com o contrato de menor privilégio';
  END IF;
END;
$$;
GRANT USAGE ON SCHEMA app TO app_ai_executor;

CREATE TABLE app.hosted_call_control (
  singleton boolean PRIMARY KEY DEFAULT true CHECK (singleton),
  last_seen_at bigint NOT NULL CHECK (last_seen_at >= 0)
);
INSERT INTO app.hosted_call_control(singleton, last_seen_at) VALUES (true, 0);
CREATE TABLE app.hosted_call_daily (
  period date PRIMARY KEY,
  committed bigint NOT NULL CHECK (committed >= 0 AND committed <= 9007199254740991)
);
-- Global rows carry totals/clock only: no tenant, user, document, prompt or result content.
ALTER TABLE app.hosted_call_control ENABLE ROW LEVEL SECURITY;
ALTER TABLE app.hosted_call_control FORCE ROW LEVEL SECURITY;
ALTER TABLE app.hosted_call_daily ENABLE ROW LEVEL SECURITY;
ALTER TABLE app.hosted_call_daily FORCE ROW LEVEL SECURITY;
CREATE POLICY hosted_call_control_executor ON app.hosted_call_control TO app_ai_executor USING (true) WITH CHECK (true);
CREATE POLICY hosted_call_daily_executor ON app.hosted_call_daily TO app_ai_executor USING (true) WITH CHECK (true);

CREATE TABLE app.hosted_call_records (
  -- Operational identity survives domain deletion; content is invalidated transactionally below.
  condominium_id uuid NOT NULL,
  request_hash text NOT NULL CHECK (request_hash ~ '^[a-f0-9]{64}$'),
  record jsonb NOT NULL CHECK ((
    jsonb_typeof(record) = 'object'
    AND record->>'condominiumId' = condominium_id::text
    AND record->>'requestHash' = request_hash
    AND record->>'currency' = 'USD'
    AND jsonb_typeof(record->'documentVersionIds') = 'array'
    AND record->>'status' IN ('reserved', 'dispatched', 'completed', 'uncertain', 'cancelled', 'invalidated')
    AND octet_length(record::text) <= 1100000
  ) IS TRUE),
  PRIMARY KEY (condominium_id, request_hash)
);
ALTER TABLE app.hosted_call_records ENABLE ROW LEVEL SECURITY;
ALTER TABLE app.hosted_call_records FORCE ROW LEVEL SECURITY;
CREATE FUNCTION app.hosted_call_scope_active(p_condominium_id uuid)
RETURNS boolean LANGUAGE sql STABLE SECURITY DEFINER
SET search_path = pg_catalog, app SET row_security = off AS $$
  SELECT p_condominium_id = app.current_condominium_id() AND EXISTS (
    SELECT 1 FROM app.condominiums WHERE id=p_condominium_id AND status='active'
  );
$$;
REVOKE ALL ON FUNCTION app.hosted_call_scope_active(uuid) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION app.hosted_call_scope_active(uuid) TO app_ai_executor;
CREATE POLICY hosted_call_records_executor ON app.hosted_call_records TO app_ai_executor
  USING (condominium_id = app.current_condominium_id() AND app.hosted_call_scope_active(condominium_id))
  WITH CHECK (condominium_id = app.current_condominium_id() AND app.hosted_call_scope_active(condominium_id));

REVOKE ALL ON app.hosted_call_control, app.hosted_call_daily, app.hosted_call_records FROM PUBLIC, app_runtime, app_worker;
GRANT SELECT, UPDATE ON app.hosted_call_control TO app_ai_executor;
GRANT SELECT, INSERT, UPDATE ON app.hosted_call_daily, app.hosted_call_records TO app_ai_executor;
-- A future operator must explicitly grant this role to the dedicated ledger connection.
-- Neither app_runtime nor app_worker inherits it. No real startup connects this adapter yet.

CREATE FUNCTION app.invalidate_deleted_hosted_document_content()
RETURNS trigger LANGUAGE plpgsql SECURITY DEFINER
SET search_path = pg_catalog, app SET row_security = off AS $$
DECLARE tenant_id uuid;
BEGIN
  IF TG_TABLE_NAME='condominiums' THEN tenant_id := OLD.id;
  ELSE tenant_id := OLD.condominium_id;
  END IF;
  -- Same serialization order as dispatch. Late finalization cannot resurrect an invalidated result.
  PERFORM singleton FROM app.hosted_call_control WHERE singleton FOR UPDATE;
  UPDATE app.hosted_call_records SET record =
    (record - 'resultJson' - 'resultSha256') || jsonb_build_object(
      'invalidatedFrom',record->>'status','status','invalidated',
      'commitment',CASE WHEN record->>'status'='cancelled' THEN 0 ELSE (record->>'commitment')::bigint END)
  WHERE condominium_id=tenant_id AND record->>'status'<>'invalidated'
    AND (TG_TABLE_NAME='condominiums' OR record->'documentVersionIds' ? OLD.id::text);
  RETURN OLD;
END;
$$;
REVOKE ALL ON FUNCTION app.invalidate_deleted_hosted_document_content() FROM PUBLIC;
CREATE TRIGGER invalidate_hosted_content_before_condominium_delete BEFORE DELETE ON app.condominiums
FOR EACH ROW EXECUTE FUNCTION app.invalidate_deleted_hosted_document_content();
CREATE TRIGGER invalidate_hosted_content_before_version_delete BEFORE DELETE ON app.document_versions
FOR EACH ROW EXECUTE FUNCTION app.invalidate_deleted_hosted_document_content();

COMMIT;
