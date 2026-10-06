BEGIN;

DROP POLICY documents_runtime_archive_own_upload ON app.documents;

CREATE POLICY documents_runtime_archive_manager
  ON app.documents
  FOR UPDATE TO app_runtime
  USING (
    condominium_id = app.current_condominium_id()
    AND EXISTS (
      SELECT 1
      FROM app.memberships
      WHERE memberships.condominium_id = documents.condominium_id
        AND memberships.user_id = app.current_user_id()
        AND memberships.status = 'active'
        AND memberships.role_key = 'manager'
        AND memberships.valid_from <= now()
        AND (memberships.valid_until IS NULL OR memberships.valid_until > now())
    )
  )
  WITH CHECK (
    condominium_id = app.current_condominium_id()
    AND (
      (status = 'archived' AND archived_at IS NOT NULL)
      OR (status = 'active' AND archived_at IS NULL)
    )
  );

GRANT DELETE ON app.document_original_contents TO app_worker;

CREATE POLICY documents_worker_read_expired_retention
  ON app.documents
  FOR SELECT TO app_worker
  USING (
    current_user = 'app_worker'
    AND status = 'archived'
    AND archived_at <= now() - interval '30 days'
  );

CREATE POLICY document_versions_worker_read_expired_retention
  ON app.document_versions
  FOR SELECT TO app_worker
  USING (
    current_user = 'app_worker'
    AND EXISTS (
      SELECT 1
      FROM app.documents AS documents
      WHERE documents.condominium_id = document_versions.condominium_id
        AND documents.id = document_versions.document_id
        AND documents.status = 'archived'
        AND documents.archived_at <= now() - interval '30 days'
    )
  );

CREATE POLICY document_original_contents_worker_delete_expired
  ON app.document_original_contents
  FOR DELETE TO app_worker
  USING (
    current_user = 'app_worker'
    AND EXISTS (
      SELECT 1
      FROM app.document_versions AS versions
      JOIN app.documents AS documents
        ON documents.condominium_id = versions.condominium_id
       AND documents.id = versions.document_id
      WHERE versions.condominium_id = document_original_contents.condominium_id
        AND versions.storage_object_id = document_original_contents.storage_object_id
        AND documents.status = 'archived'
        AND documents.archived_at <= now() - interval '30 days'
    )
  );

COMMIT;
