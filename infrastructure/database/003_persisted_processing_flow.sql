BEGIN;

DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_roles WHERE rolname = 'app_worker') THEN
    CREATE ROLE app_worker NOLOGIN NOSUPERUSER NOCREATEDB NOCREATEROLE NOINHERIT NOBYPASSRLS;
  END IF;

  IF EXISTS (
    SELECT 1
    FROM pg_roles AS r
    WHERE r.rolname = 'app_worker'
      AND (
        r.rolcanlogin
        OR r.rolsuper
        OR r.rolcreatedb
        OR r.rolcreaterole
        OR r.rolinherit
        OR r.rolbypassrls
        OR r.rolreplication
        OR r.rolconfig IS NOT NULL
        OR EXISTS (
          SELECT 1
          FROM pg_auth_members AS m
          WHERE m.member = r.oid
        )
        OR EXISTS (
          SELECT 1
          FROM pg_class AS c
          JOIN pg_namespace AS n ON n.oid = c.relnamespace
          WHERE c.relowner = r.oid
            AND n.nspname NOT IN ('pg_catalog', 'information_schema', 'pg_toast')
        )
        OR EXISTS (
          SELECT 1
          FROM pg_namespace AS n
          WHERE n.nspowner = r.oid
            AND n.nspname NOT IN ('pg_catalog', 'information_schema', 'pg_toast')
        )
      )
  ) THEN
    RAISE EXCEPTION 'O papel app_worker não corresponde à configuração mínima e segura esperada';
  END IF;
END
$$;

GRANT app_worker TO CURRENT_USER;
GRANT USAGE ON SCHEMA app TO app_worker;

GRANT INSERT ON app.storage_objects, app.documents, app.document_versions,
  app.document_version_states, app.processing_jobs TO app_runtime;
GRANT UPDATE ON app.document_version_states TO app_runtime;

GRANT SELECT ON app.storage_objects, app.document_versions, app.document_version_states TO app_worker;
GRANT SELECT, UPDATE ON app.processing_jobs, app.document_version_states TO app_worker;
GRANT SELECT, INSERT, DELETE ON app.document_pages, app.document_chunks TO app_worker;

CREATE POLICY storage_objects_runtime_insert ON app.storage_objects
  FOR INSERT TO app_runtime
  WITH CHECK (
    condominium_id = app.current_condominium_id()
    AND created_by_user_id = app.current_user_id()
    AND EXISTS (
      SELECT 1
      FROM app.memberships
      WHERE memberships.condominium_id = storage_objects.condominium_id
        AND memberships.user_id = app.current_user_id()
        AND memberships.status = 'active'
        AND memberships.role_key = 'manager'
        AND memberships.valid_from <= now()
        AND (memberships.valid_until IS NULL OR memberships.valid_until > now())
    )
  );

CREATE POLICY documents_runtime_insert ON app.documents
  FOR INSERT TO app_runtime
  WITH CHECK (
    condominium_id = app.current_condominium_id()
    AND created_by_user_id = app.current_user_id()
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
  );

CREATE POLICY document_versions_runtime_insert ON app.document_versions
  FOR INSERT TO app_runtime
  WITH CHECK (
    condominium_id = app.current_condominium_id()
    AND uploaded_by_user_id = app.current_user_id()
    AND EXISTS (
      SELECT 1
      FROM app.memberships
      WHERE memberships.condominium_id = document_versions.condominium_id
        AND memberships.user_id = app.current_user_id()
        AND memberships.status = 'active'
        AND memberships.role_key = 'manager'
        AND memberships.valid_from <= now()
        AND (memberships.valid_until IS NULL OR memberships.valid_until > now())
    )
  );

CREATE POLICY document_version_states_runtime_insert ON app.document_version_states
  FOR INSERT TO app_runtime
  WITH CHECK (
    condominium_id = app.current_condominium_id()
    AND EXISTS (
      SELECT 1
      FROM app.memberships
      WHERE memberships.condominium_id = document_version_states.condominium_id
        AND memberships.user_id = app.current_user_id()
        AND memberships.status = 'active'
        AND memberships.role_key = 'manager'
        AND memberships.valid_from <= now()
        AND (memberships.valid_until IS NULL OR memberships.valid_until > now())
    )
  );

CREATE POLICY document_version_states_runtime_update ON app.document_version_states
  FOR UPDATE TO app_runtime
  USING (
    condominium_id = app.current_condominium_id()
    AND EXISTS (
      SELECT 1
      FROM app.memberships
      WHERE memberships.condominium_id = document_version_states.condominium_id
        AND memberships.user_id = app.current_user_id()
        AND memberships.status = 'active'
        AND memberships.role_key = 'manager'
        AND memberships.valid_from <= now()
        AND (memberships.valid_until IS NULL OR memberships.valid_until > now())
    )
  )
  WITH CHECK (condominium_id = app.current_condominium_id());

CREATE POLICY processing_jobs_runtime_insert ON app.processing_jobs
  FOR INSERT TO app_runtime
  WITH CHECK (
    condominium_id = app.current_condominium_id()
    AND EXISTS (
      SELECT 1
      FROM app.memberships
      WHERE memberships.condominium_id = processing_jobs.condominium_id
        AND memberships.user_id = app.current_user_id()
        AND memberships.status = 'active'
        AND memberships.role_key = 'manager'
        AND memberships.valid_from <= now()
        AND (memberships.valid_until IS NULL OR memberships.valid_until > now())
    )
  );

CREATE POLICY processing_jobs_worker_claim ON app.processing_jobs
  FOR SELECT TO app_worker
  USING (current_user = 'app_worker');

CREATE POLICY processing_jobs_worker_update ON app.processing_jobs
  FOR UPDATE TO app_worker
  USING (current_user = 'app_worker')
  WITH CHECK (current_user = 'app_worker');

CREATE POLICY storage_objects_worker_read ON app.storage_objects
  FOR SELECT TO app_worker
  USING (
    current_user = 'app_worker'
    AND condominium_id = app.current_condominium_id()
  );

CREATE POLICY document_versions_worker_read ON app.document_versions
  FOR SELECT TO app_worker
  USING (
    current_user = 'app_worker'
    AND condominium_id = app.current_condominium_id()
  );

CREATE POLICY document_version_states_worker_read ON app.document_version_states
  FOR SELECT TO app_worker
  USING (
    current_user = 'app_worker'
    AND condominium_id = app.current_condominium_id()
  );

CREATE POLICY document_version_states_worker_update ON app.document_version_states
  FOR UPDATE TO app_worker
  USING (
    current_user = 'app_worker'
    AND condominium_id = app.current_condominium_id()
  )
  WITH CHECK (
    current_user = 'app_worker'
    AND condominium_id = app.current_condominium_id()
  );

CREATE POLICY document_pages_worker_insert ON app.document_pages
  FOR INSERT TO app_worker
  WITH CHECK (
    current_user = 'app_worker'
    AND condominium_id = app.current_condominium_id()
  );

CREATE POLICY document_pages_worker_read ON app.document_pages
  FOR SELECT TO app_worker
  USING (
    current_user = 'app_worker'
    AND condominium_id = app.current_condominium_id()
  );

CREATE POLICY document_pages_worker_delete ON app.document_pages
  FOR DELETE TO app_worker
  USING (
    current_user = 'app_worker'
    AND condominium_id = app.current_condominium_id()
  );

CREATE POLICY document_chunks_worker_insert ON app.document_chunks
  FOR INSERT TO app_worker
  WITH CHECK (
    current_user = 'app_worker'
    AND condominium_id = app.current_condominium_id()
  );

CREATE POLICY document_chunks_worker_delete ON app.document_chunks
  FOR DELETE TO app_worker
  USING (
    current_user = 'app_worker'
    AND condominium_id = app.current_condominium_id()
  );

COMMIT;
