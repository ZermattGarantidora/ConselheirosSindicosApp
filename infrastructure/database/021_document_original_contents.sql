BEGIN;

CREATE TABLE app.document_original_contents (
  condominium_id uuid NOT NULL REFERENCES app.condominiums (id) ON DELETE CASCADE,
  storage_object_id uuid NOT NULL,
  content bytea NOT NULL CHECK (octet_length(content) BETWEEN 1 AND 26214400),
  created_by_user_id uuid NOT NULL REFERENCES app.users (id) ON DELETE RESTRICT,
  created_at timestamptz NOT NULL DEFAULT now(),
  PRIMARY KEY (condominium_id, storage_object_id)
);

ALTER TABLE app.document_original_contents ENABLE ROW LEVEL SECURITY;
ALTER TABLE app.document_original_contents FORCE ROW LEVEL SECURITY;

GRANT SELECT, INSERT, DELETE ON app.document_original_contents TO app_runtime;
GRANT SELECT ON app.document_original_contents TO app_worker;

CREATE POLICY document_original_contents_runtime_read ON app.document_original_contents
  FOR SELECT TO app_runtime
  USING (
    condominium_id = app.current_condominium_id()
    AND EXISTS (
      SELECT 1
      FROM app.storage_objects
      WHERE storage_objects.condominium_id = document_original_contents.condominium_id
        AND storage_objects.id = document_original_contents.storage_object_id
    )
  );

CREATE POLICY document_original_contents_runtime_insert ON app.document_original_contents
  FOR INSERT TO app_runtime
  WITH CHECK (
    condominium_id = app.current_condominium_id()
    AND created_by_user_id = app.current_user_id()
    AND EXISTS (
      SELECT 1
      FROM app.memberships
      WHERE memberships.condominium_id = document_original_contents.condominium_id
        AND memberships.user_id = app.current_user_id()
        AND memberships.status = 'active'
        AND memberships.role_key = 'manager'
        AND memberships.valid_from <= now()
        AND (memberships.valid_until IS NULL OR memberships.valid_until > now())
    )
  );

CREATE POLICY document_original_contents_runtime_delete ON app.document_original_contents
  FOR DELETE TO app_runtime
  USING (
    condominium_id = app.current_condominium_id()
    AND created_by_user_id = app.current_user_id()
  );

CREATE POLICY document_original_contents_worker_read ON app.document_original_contents
  FOR SELECT TO app_worker
  USING (
    current_user = 'app_worker'
    AND condominium_id = app.current_condominium_id()
  );

COMMIT;
