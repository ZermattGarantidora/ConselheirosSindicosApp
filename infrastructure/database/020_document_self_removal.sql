BEGIN;

GRANT UPDATE ON app.documents TO app_runtime;

CREATE POLICY documents_runtime_archive_own_upload
  ON app.documents
  FOR UPDATE TO app_runtime
  USING (
    condominium_id = app.current_condominium_id()
    AND EXISTS (
      SELECT 1
      FROM app.document_versions AS versions
      WHERE versions.condominium_id = documents.condominium_id
        AND versions.document_id = documents.id
        AND versions.uploaded_by_user_id = app.current_user_id()
    )
  )
  WITH CHECK (
    condominium_id = app.current_condominium_id()
    AND status = 'archived'
    AND archived_at IS NOT NULL
  );

COMMIT;
