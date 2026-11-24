-- Inspeção somente leitura. Executar futuramente com cada login do ambiente autorizado.
-- O operador compara API, worker e migrador; não publicar a saída em endpoint ou logs da aplicação.
BEGIN ISOLATION LEVEL REPEATABLE READ READ ONLY;
SET LOCAL statement_timeout = '5s';

SELECT rolname, rolcanlogin, rolsuper, rolcreatedb, rolcreaterole, rolreplication, rolbypassrls,
  rolinherit FROM pg_roles WHERE rolname IN (session_user, 'app_runtime', 'app_worker') ORDER BY rolname;

-- Qualquer privilégio elevado alcançável por um login de aplicação é bloqueante.
WITH RECURSIVE reachable(oid) AS (
  SELECT oid FROM pg_roles WHERE rolname = session_user
  UNION
  SELECT m.roleid FROM pg_auth_members m JOIN reachable r ON r.oid = m.member
)
SELECT count(*) AS reachable_elevated_roles
FROM reachable JOIN pg_roles r USING (oid)
WHERE r.rolsuper OR r.rolbypassrls OR r.rolcreatedb OR r.rolcreaterole OR r.rolreplication;

SELECT pg_has_role(session_user, 'app_runtime', 'MEMBER') AS runtime_membership,
  pg_has_role(session_user, 'app_worker', 'MEMBER') AS worker_membership,
  has_schema_privilege(session_user, 'app', 'CREATE') AS can_change_app_schema,
  -- Resolver por OID permite inspecionar logins NOINHERIT sem assumir papel ou conceder USAGE.
  has_table_privilege('app_runtime', (SELECT c.oid FROM pg_class c JOIN pg_namespace n ON n.oid=c.relnamespace
    WHERE n.nspname='app' AND c.relname='access_codes'), 'SELECT') AS runtime_can_read_access_codes,
  has_table_privilege('app_runtime', (SELECT c.oid FROM pg_class c JOIN pg_namespace n ON n.oid=c.relnamespace
    WHERE n.nspname='app' AND c.relname='device_sessions'), 'SELECT') AS runtime_can_read_device_sessions,
  has_function_privilege('app_runtime', (SELECT p.oid FROM pg_proc p JOIN pg_namespace n ON n.oid=p.pronamespace
    WHERE n.nspname='app' AND p.proname='provision_access_code'), 'EXECUTE')
    AS runtime_can_provision_access;

SELECT c.relname AS table_name, c.relrowsecurity AS rls_enabled, c.relforcerowsecurity AS rls_forced
FROM pg_class c JOIN pg_namespace n ON n.oid = c.relnamespace
WHERE n.nspname = 'app' AND c.relkind IN ('r','p') AND EXISTS (
  SELECT 1 FROM pg_attribute a WHERE a.attrelid = c.oid AND a.attname = 'condominium_id'
)
ORDER BY c.relname;

SELECT p.proname AS function_name, pg_get_userbyid(p.proowner) AS owner, p.proconfig AS fixed_settings
FROM pg_proc p JOIN pg_namespace n ON n.oid = p.pronamespace
WHERE n.nspname = 'app' AND p.prosecdef ORDER BY p.proname;

COMMIT;
