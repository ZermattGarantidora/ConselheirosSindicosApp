BEGIN;

CREATE OR REPLACE FUNCTION app.resolve_user_id(auth_subject text)
RETURNS uuid
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = app, pg_catalog
AS $$
  SELECT id
  FROM app.users
  WHERE app.users.auth_subject = $1
    AND app.users.status = 'active'
  LIMIT 1;
$$;

REVOKE ALL ON FUNCTION app.resolve_user_id(text) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION app.resolve_user_id(text) TO app_runtime;

ALTER POLICY processing_jobs_worker_update ON app.processing_jobs
  USING (
    current_user = 'app_worker'
    AND condominium_id = app.current_condominium_id()
    AND id = NULLIF(current_setting('app.processing_job_id', true), '')::uuid
  )
  WITH CHECK (
    current_user = 'app_worker'
    AND condominium_id = app.current_condominium_id()
    AND id = NULLIF(current_setting('app.processing_job_id', true), '')::uuid
  );

COMMIT;
