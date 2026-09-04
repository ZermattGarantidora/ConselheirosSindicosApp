BEGIN;

CREATE POLICY document_chunks_worker_read ON app.document_chunks
  FOR SELECT TO app_worker
  USING (
    current_user = 'app_worker'
    AND condominium_id = app.current_condominium_id()
  );

COMMIT;
