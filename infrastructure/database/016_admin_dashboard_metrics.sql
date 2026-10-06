BEGIN;

CREATE OR REPLACE FUNCTION app.read_admin_dashboard_metrics(p_since timestamptz)
RETURNS TABLE (
  active_accounts bigint,
  new_accounts_last_7_days bigint,
  active_users_last_7_days bigint
)
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = app, pg_catalog
AS $$
  SELECT
    COUNT(*) FILTER (WHERE users.status = 'active') AS active_accounts,
    COUNT(*) FILTER (
      WHERE users.status = 'active'
        AND users.created_at >= p_since
    ) AS new_accounts_last_7_days,
    (
      SELECT COUNT(DISTINCT sessions.user_id)
      FROM app.auth_sessions AS sessions
      JOIN app.users AS active_users ON active_users.id = sessions.user_id
      WHERE sessions.created_at >= p_since
        AND active_users.status = 'active'
    ) AS active_users_last_7_days
  FROM app.users AS users;
$$;

REVOKE ALL ON FUNCTION app.read_admin_dashboard_metrics(timestamptz) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION app.read_admin_dashboard_metrics(timestamptz) TO app_runtime;

COMMIT;
