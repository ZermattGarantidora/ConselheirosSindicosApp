BEGIN;

CREATE OR REPLACE FUNCTION app.read_admin_account_directory(p_limit integer)
RETURNS TABLE (
  display_name text,
  email text
)
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = app, pg_catalog
AS $$
  SELECT users.display_name, users.email
  FROM app.users AS users
  WHERE users.status = 'active'
    AND users.display_name IS NOT NULL
    AND users.email IS NOT NULL
  ORDER BY users.created_at DESC, users.id DESC
  LIMIT LEAST(GREATEST(COALESCE(p_limit, 1), 1), 100);
$$;

REVOKE ALL ON FUNCTION app.read_admin_account_directory(integer) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION app.read_admin_account_directory(integer) TO app_runtime;

COMMIT;
