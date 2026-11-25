BEGIN;

-- Spec 078: policy remains disabled until an operator applies a reviewed manifest and budget.
-- No new table grant, no policy change, no login or credential provisioning.
CREATE OR REPLACE FUNCTION app.persistent_execution_is_current(p_revision text, p_currency text)
RETURNS boolean
LANGUAGE sql STABLE SECURITY DEFINER SET search_path = app, pg_catalog
AS $$
  SELECT COALESCE((SELECT enabled AND revision = p_revision AND currency = p_currency
    AND scope_daily_operations > 0 AND global_daily_operations > 0
    AND scope_concurrent > 0 AND global_concurrent > 0
    FROM app.operation_budget_policy WHERE singleton), false);
$$;
REVOKE ALL ON FUNCTION app.persistent_execution_is_current(text,text) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION app.persistent_execution_is_current(text,text) TO app_runtime,app_worker;

COMMIT;
