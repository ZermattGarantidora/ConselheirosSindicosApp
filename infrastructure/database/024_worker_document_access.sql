BEGIN;

GRANT SELECT, UPDATE ON app.documents TO app_worker;

CREATE POLICY documents_worker_read ON app.documents
  FOR SELECT TO app_worker
  USING (
    current_user = 'app_worker'
    AND condominium_id = app.current_condominium_id()
  );

CREATE POLICY documents_worker_update ON app.documents
  FOR UPDATE TO app_worker
  USING (
    current_user = 'app_worker'
    AND condominium_id = app.current_condominium_id()
  )
  WITH CHECK (
    current_user = 'app_worker'
    AND condominium_id = app.current_condominium_id()
  );

COMMIT;
