BEGIN;

-- Operational pre-authentication counters: no user, tenant, IP, credential or document content.
CREATE TABLE IF NOT EXISTS app.access_login_attempts (
  key text PRIMARY KEY CHECK (key = 'global' OR key ~ '^[a-f0-9]{64}$'),
  count integer NOT NULL CHECK (count BETWEEN 0 AND 1000),
  until_at timestamptz NOT NULL
);
ALTER TABLE app.access_login_attempts ENABLE ROW LEVEL SECURITY;
ALTER TABLE app.access_login_attempts FORCE ROW LEVEL SECURITY;
REVOKE ALL ON app.access_login_attempts FROM PUBLIC, app_runtime;

CREATE OR REPLACE FUNCTION app.consume_access_login_attempt(p_origin_hash text)
RETURNS TABLE(allowed boolean, retry_after_seconds integer)
LANGUAGE plpgsql SECURITY DEFINER SET search_path = app, pg_catalog AS $$
DECLARE
  v_time timestamptz;
  v_global app.access_login_attempts%ROWTYPE;
  v_origin app.access_login_attempts%ROWTYPE;
  v_blocked_until timestamptz;
BEGIN
  IF p_origin_hash IS NULL OR p_origin_hash !~ '^[a-f0-9]{64}$' THEN
    RAISE EXCEPTION 'Reserva de acesso inválida';
  END IF;
  INSERT INTO app.access_login_attempts(key, count, until_at)
    VALUES ('global', 0, clock_timestamp()) ON CONFLICT (key) DO NOTHING;
  -- The single global row serializes both counters across processes/hosts and survives restart.
  SELECT * INTO STRICT v_global FROM app.access_login_attempts WHERE key = 'global' FOR UPDATE;
  v_time := clock_timestamp();
  DELETE FROM app.access_login_attempts WHERE key <> 'global' AND until_at <= v_time;
  IF v_global.until_at <= v_time THEN
    v_global.count := 0;
    v_global.until_at := v_time + interval '15 minutes';
  END IF;
  SELECT * INTO v_origin FROM app.access_login_attempts WHERE key = p_origin_hash;
  IF NOT FOUND THEN
    v_origin.key := p_origin_hash;
    v_origin.count := 0;
    v_origin.until_at := v_time + interval '15 minutes';
  END IF;
  v_blocked_until := GREATEST(
    CASE WHEN v_global.count >= 1000 THEN v_global.until_at END,
    CASE WHEN v_origin.count >= 10 THEN v_origin.until_at END
  );
  IF v_blocked_until IS NOT NULL THEN
    RETURN QUERY SELECT false, GREATEST(1, ceil(extract(epoch FROM (v_blocked_until - v_time)))::integer);
    RETURN;
  END IF;
  UPDATE app.access_login_attempts SET count = v_global.count + 1, until_at = v_global.until_at
    WHERE key = 'global';
  INSERT INTO app.access_login_attempts(key, count, until_at)
    VALUES (p_origin_hash, v_origin.count + 1, v_origin.until_at)
    ON CONFLICT (key) DO UPDATE SET count = EXCLUDED.count, until_at = EXCLUDED.until_at;
  RETURN QUERY SELECT true, 0;
END;
$$;
REVOKE ALL ON FUNCTION app.consume_access_login_attempt(text) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION app.consume_access_login_attempt(text) TO app_runtime;

-- Spec 072: minimal durable consumption/claim ledger. Never stores documents or model output.
CREATE TABLE IF NOT EXISTS app.operation_budget_policy (
  singleton boolean PRIMARY KEY DEFAULT true CHECK (singleton),
  enabled boolean NOT NULL DEFAULT false,
  revision text NOT NULL CHECK (revision ~ '^[a-f0-9]{64}$'),
  currency text NOT NULL CHECK (currency IN ('BRL','USD')),
  scope_daily_cost bigint NOT NULL CHECK (scope_daily_cost BETWEEN 0 AND 1000000000000),
  global_daily_cost bigint NOT NULL CHECK (global_daily_cost BETWEEN 0 AND 1000000000000),
  scope_daily_operations bigint NOT NULL CHECK (scope_daily_operations BETWEEN 0 AND 1000000000000),
  global_daily_operations bigint NOT NULL CHECK (global_daily_operations BETWEEN 0 AND 1000000000000),
  scope_concurrent bigint NOT NULL CHECK (scope_concurrent BETWEEN 0 AND 1000000000000),
  global_concurrent bigint NOT NULL CHECK (global_concurrent BETWEEN 0 AND 1000000000000)
);
INSERT INTO app.operation_budget_policy(singleton,enabled,revision,currency,scope_daily_cost,
  global_daily_cost,scope_daily_operations,global_daily_operations,scope_concurrent,global_concurrent)
VALUES(true,false,repeat('0',64),'BRL',0,0,0,0,0,0) ON CONFLICT DO NOTHING;

CREATE TABLE IF NOT EXISTS app.operation_budget_receipts (
  scope_key text NOT NULL,
  operation_id uuid NOT NULL,
  -- Operational UUIDs outlive domain deletion: cascade must not reset quotas/idempotency.
  -- No content is retained. Retention of these pseudonymous IDs needs approved data policy.
  owner_user_id uuid NOT NULL,
  condominium_id uuid,
  request jsonb NOT NULL,
  fingerprint text NOT NULL CHECK (fingerprint ~ '^[a-f0-9]{64}$'),
  state text NOT NULL CHECK (state IN ('reserved','started','completed','cancelled','unknown')),
  day date NOT NULL,
  created_at timestamptz NOT NULL,
  updated_at timestamptz NOT NULL,
  token_hash text CHECK (token_hash ~ '^[a-f0-9]{64}$'),
  output_hash text CHECK (output_hash ~ '^[a-f0-9]{64}$'),
  actual_cost bigint CHECK (actual_cost BETWEEN 0 AND 1000000000000),
  currency text NOT NULL CHECK (currency IN ('BRL','USD')),
  PRIMARY KEY(scope_key,operation_id),
  CHECK ((condominium_id IS NULL AND scope_key='account:'||owner_user_id::text AND request->>'kind'='setup')
    OR (condominium_id IS NOT NULL AND scope_key='tenant:'||condominium_id::text)),
  CHECK ((state IN ('reserved','cancelled')) = (token_hash IS NULL)),
  CHECK ((state='completed') = (output_hash IS NOT NULL AND actual_cost IS NOT NULL))
);
CREATE INDEX IF NOT EXISTS operation_budget_receipts_day ON app.operation_budget_receipts(day,scope_key);
CREATE INDEX IF NOT EXISTS operation_budget_receipts_pending ON app.operation_budget_receipts(scope_key)
  WHERE state IN ('reserved','started','unknown');
ALTER TABLE app.operation_budget_policy ENABLE ROW LEVEL SECURITY;
ALTER TABLE app.operation_budget_policy FORCE ROW LEVEL SECURITY;
ALTER TABLE app.operation_budget_receipts ENABLE ROW LEVEL SECURITY;
ALTER TABLE app.operation_budget_receipts FORCE ROW LEVEL SECURITY;
REVOKE ALL ON app.operation_budget_policy,app.operation_budget_receipts FROM PUBLIC,app_runtime,app_worker;

CREATE OR REPLACE FUNCTION app.mutate_operation_budget(
  p_action text, p_request_text text, p_token_hash text, p_output_hash text, p_actual_cost bigint
) RETURNS jsonb LANGUAGE plpgsql SECURITY DEFINER SET search_path = pg_catalog, app AS $$
DECLARE
  v_request jsonb := p_request_text::jsonb;
  v_scope jsonb := v_request->'scope';
  v_user uuid := app.current_user_id();
  v_condo uuid := app.current_condominium_id();
  v_key text;
  v_id uuid;
  v_fingerprint text;
  v_policy app.operation_budget_policy%ROWTYPE;
  v_row app.operation_budget_receipts%ROWTYPE;
  v_time timestamptz;
  v_day date;
  v_amount bigint;
  v_count bigint;
  v_local_count bigint;
  v_cost numeric;
  v_local_cost numeric;
  v_active bigint;
  v_local_active bigint;
  v_claimed boolean := false;
BEGIN
  IF p_action IS NULL OR p_request_text IS NULL OR p_action NOT IN ('reserve','start','complete','cancel','unknown') OR v_user IS NULL
    OR jsonb_typeof(v_request) IS DISTINCT FROM 'object' OR jsonb_typeof(v_scope) IS DISTINCT FROM 'object'
    OR jsonb_typeof(v_request->'kind') IS DISTINCT FROM 'string'
    OR jsonb_typeof(v_request->'payloadHash') IS DISTINCT FROM 'string'
    OR jsonb_typeof(v_request->'policyRevision') IS DISTINCT FROM 'string'
    OR jsonb_typeof(v_request->'operationId') IS DISTINCT FROM 'string'
    OR jsonb_typeof(v_request->'maximumCostMicrounits') IS DISTINCT FROM 'number'
    OR v_request->'scope'->>'userId' IS DISTINCT FROM v_user::text
    OR NOT (v_request ?& ARRAY['scope','operationId','kind','payloadHash','policyRevision','maximumCostMicrounits'])
    OR EXISTS(SELECT 1 FROM jsonb_object_keys(v_request) k WHERE k NOT IN ('scope','operationId','kind','payloadHash','policyRevision','maximumCostMicrounits'))
    OR v_request->>'kind' NOT IN ('setup','upload','question','pdf_ocr','photo_ocr','photo_analysis','batch_synthesis','embedding')
    OR v_request->>'payloadHash' !~ '^[a-f0-9]{64}$' OR v_request->>'policyRevision' !~ '^[a-f0-9]{64}$'
    OR v_request->>'operationId' !~ '^[a-f0-9]{8}(-[a-f0-9]{4}){3}-[a-f0-9]{12}$'
    OR v_request->>'maximumCostMicrounits' !~ '^[0-9]+$' THEN RAISE EXCEPTION 'budget_denied'; END IF;
  v_id := (v_request->>'operationId')::uuid;
  v_amount := (v_request->>'maximumCostMicrounits')::bigint;
  IF v_amount NOT BETWEEN 0 AND 1000000000000 THEN RAISE EXCEPTION 'budget_denied'; END IF;
  IF v_scope->>'kind'='account' AND v_condo IS NULL AND v_request->>'kind'='setup'
    AND v_scope ?& ARRAY['kind','userId'] AND NOT EXISTS(SELECT 1 FROM jsonb_object_keys(v_scope) k WHERE k NOT IN ('kind','userId')) THEN
    v_key := 'account:'||v_user::text;
  ELSIF v_scope->>'kind'='tenant' AND v_condo IS NOT NULL AND v_scope->>'condominiumId'=v_condo::text
    AND v_scope ?& ARRAY['kind','userId','condominiumId','membershipRevision']
    AND length(v_scope->>'membershipRevision') BETWEEN 1 AND 160
    AND NOT EXISTS(SELECT 1 FROM jsonb_object_keys(v_scope) k WHERE k NOT IN ('kind','userId','condominiumId','membershipRevision')) THEN
    v_key := 'tenant:'||v_condo::text;
  ELSE RAISE EXCEPTION 'budget_denied'; END IF;

  -- All mutations share this lock: no independent replica can oversubscribe or claim twice.
  SELECT * INTO STRICT v_policy FROM app.operation_budget_policy WHERE singleton FOR UPDATE;
  v_time := clock_timestamp();
  v_day := (v_time AT TIME ZONE 'UTC')::date;
  IF EXISTS(SELECT 1 FROM app.operation_budget_receipts WHERE updated_at>v_time) THEN RAISE EXCEPTION 'budget_unavailable'; END IF;
  IF p_action NOT IN ('complete','unknown') THEN
    IF NOT EXISTS(SELECT 1 FROM app.users WHERE id=v_user AND status='active') THEN RAISE EXCEPTION 'budget_denied'; END IF;
    IF v_condo IS NOT NULL AND NOT EXISTS(
      SELECT 1 FROM app.memberships m JOIN app.condominiums c ON c.id=m.condominium_id
      WHERE m.user_id=v_user AND m.condominium_id=v_condo AND m.status='active' AND c.status='active'
        AND m.valid_from<=v_time AND (m.valid_until IS NULL OR m.valid_until>v_time)
        AND m.revision=v_scope->>'membershipRevision'
        AND (v_request->>'kind'<>'upload' OR m.role_key='manager')
    ) THEN RAISE EXCEPTION 'budget_denied'; END IF;
  END IF;
  IF p_action IN ('reserve','start') AND (NOT v_policy.enabled OR v_request->>'policyRevision'<>v_policy.revision
    OR LEAST(v_policy.scope_daily_operations,v_policy.global_daily_operations,v_policy.scope_concurrent,v_policy.global_concurrent)<1
    OR EXISTS(SELECT 1 FROM app.operation_budget_receipts WHERE currency<>v_policy.currency))
    THEN RAISE EXCEPTION 'budget_denied'; END IF;
  v_fingerprint := encode(sha256(convert_to(p_request_text,'UTF8')),'hex');
  SELECT * INTO v_row FROM app.operation_budget_receipts WHERE scope_key=v_key AND operation_id=v_id;
  IF FOUND AND (v_row.owner_user_id<>v_user OR v_row.fingerprint<>v_fingerprint) THEN RAISE EXCEPTION 'budget_conflict'; END IF;
  IF NOT FOUND AND p_action='reserve' THEN
    SELECT count(*) FILTER(WHERE day=v_day),
      count(*) FILTER(WHERE day=v_day AND scope_key=v_key),
      COALESCE(sum((request->>'maximumCostMicrounits')::bigint) FILTER(WHERE day=v_day AND state<>'cancelled'),0),
      COALESCE(sum((request->>'maximumCostMicrounits')::bigint) FILTER(WHERE day=v_day AND scope_key=v_key AND state<>'cancelled'),0),
      count(*) FILTER(WHERE state IN ('reserved','started','unknown')),
      count(*) FILTER(WHERE scope_key=v_key AND state IN ('reserved','started','unknown'))
    INTO v_count,v_local_count,v_cost,v_local_cost,v_active,v_local_active FROM app.operation_budget_receipts;
    IF v_count>=v_policy.global_daily_operations OR v_local_count>=v_policy.scope_daily_operations
      OR v_cost+v_amount>v_policy.global_daily_cost OR v_local_cost+v_amount>v_policy.scope_daily_cost
      OR v_active>=v_policy.global_concurrent OR v_local_active>=v_policy.scope_concurrent
      THEN RAISE EXCEPTION 'budget_limit'; END IF;
    INSERT INTO app.operation_budget_receipts(scope_key,operation_id,owner_user_id,condominium_id,request,fingerprint,state,day,created_at,updated_at,currency)
      VALUES(v_key,v_id,v_user,v_condo,v_request,v_fingerprint,'reserved',v_day,v_time,v_time,v_policy.currency) RETURNING * INTO v_row;
  ELSIF v_row.operation_id IS NULL THEN RAISE EXCEPTION 'budget_denied'; END IF;

  IF p_action='start' AND v_row.state='reserved' THEN
    IF v_row.day<>v_day OR p_token_hash IS NULL OR p_token_hash !~ '^[a-f0-9]{64}$' THEN RAISE EXCEPTION 'budget_denied'; END IF;
    v_row.state := 'started'; v_row.token_hash := p_token_hash; v_claimed := true;
  ELSIF p_action='cancel' THEN
    IF v_row.state NOT IN ('reserved','cancelled') THEN RAISE EXCEPTION 'budget_conflict'; END IF;
    v_row.state := 'cancelled';
  ELSIF p_action IN ('complete','unknown') THEN
    IF p_token_hash IS NULL OR v_row.token_hash IS DISTINCT FROM p_token_hash THEN RAISE EXCEPTION 'budget_denied'; END IF;
    IF p_action='unknown' THEN
      IF v_row.state NOT IN ('started','unknown') THEN RAISE EXCEPTION 'budget_conflict'; END IF;
      v_row.state := 'unknown';
    ELSE
      IF p_output_hash IS NULL OR p_output_hash !~ '^[a-f0-9]{64}$' OR p_actual_cost IS NULL
        OR p_actual_cost NOT BETWEEN 0 AND (v_row.request->>'maximumCostMicrounits')::bigint THEN RAISE EXCEPTION 'budget_conflict'; END IF;
      IF v_row.state='completed' THEN
        IF v_row.output_hash<>p_output_hash OR v_row.actual_cost<>p_actual_cost THEN RAISE EXCEPTION 'budget_conflict'; END IF;
      ELSIF v_row.state='started' THEN
        v_row.state := 'completed'; v_row.output_hash := p_output_hash; v_row.actual_cost := p_actual_cost;
      ELSE RAISE EXCEPTION 'budget_conflict'; END IF;
    END IF;
  END IF;
  UPDATE app.operation_budget_receipts SET state=v_row.state,token_hash=v_row.token_hash,
    output_hash=v_row.output_hash,actual_cost=v_row.actual_cost,updated_at=v_time
    WHERE scope_key=v_key AND operation_id=v_id;
  RETURN jsonb_build_object('claimed',v_claimed,'receipt',jsonb_build_object(
    'currency',v_row.currency,'request',v_row.request,'fingerprint',v_row.fingerprint,'state',v_row.state,
    'day',to_char(v_row.day,'YYYY-MM-DD'),
    'createdAt',to_char(v_row.created_at AT TIME ZONE 'UTC','YYYY-MM-DD"T"HH24:MI:SS.MS"Z"'),
    'updatedAt',to_char(v_time AT TIME ZONE 'UTC','YYYY-MM-DD"T"HH24:MI:SS.MS"Z"'),
    'outputHash',v_row.output_hash,'actualCostMicrounits',v_row.actual_cost));
END;
$$;
REVOKE ALL ON FUNCTION app.mutate_operation_budget(text,text,text,text,bigint) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION app.mutate_operation_budget(text,text,text,text,bigint) TO app_runtime,app_worker;

-- Spec 068 / AC-6821: device sessions carry the canonical UUID, independently of a legacy subject.
-- UUID-shaped input never falls back to another account's auth_subject, including blocked/missing IDs.
CREATE OR REPLACE FUNCTION app.resolve_user_id(auth_subject text)
RETURNS uuid LANGUAGE sql STABLE SECURITY DEFINER SET search_path = app, pg_catalog AS $$
  SELECT id FROM app.users
  WHERE status='active' AND (
    id = (CASE WHEN $1 ~* '^[a-f0-9]{8}(-[a-f0-9]{4}){3}-[a-f0-9]{12}$' THEN $1 END)::uuid
    OR ($1 !~* '^[a-f0-9]{8}(-[a-f0-9]{4}){3}-[a-f0-9]{12}$' AND app.users.auth_subject=$1)
  )
  LIMIT 1;
$$;
REVOKE ALL ON FUNCTION app.resolve_user_id(text) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION app.resolve_user_id(text) TO app_runtime;

-- Canonical identity for existing condominium operations. Existing grants/domain rules are preserved.
CREATE OR REPLACE FUNCTION app.list_authorized_condominiums(p_auth_subject text)
RETURNS TABLE (
  condominium_id uuid,
  display_name text,
  role_key text,
  cnpj text,
  address jsonb,
  administration_company text,
  unit_count integer,
  contact jsonb
)
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = app, pg_catalog
AS $$
  SELECT
    condominiums.id,
    condominiums.display_name,
    memberships.role_key,
    condominiums.cnpj,
    condominiums.address,
    condominiums.administration_company,
    condominiums.unit_count,
    condominiums.contact
  FROM app.users AS users
  JOIN app.memberships AS memberships ON memberships.user_id = users.id
  JOIN app.condominiums AS condominiums ON condominiums.id = memberships.condominium_id
  WHERE users.id = app.resolve_user_id(trim(p_auth_subject))
    AND users.status = 'active'
    AND condominiums.status = 'active'
    AND memberships.status = 'active'
    AND memberships.valid_from <= now()
    AND (memberships.valid_until IS NULL OR memberships.valid_until > now())
  ORDER BY condominiums.display_name, condominiums.id;
$$;

CREATE OR REPLACE FUNCTION app.create_condominium_for_user(
  p_auth_subject text,
  p_condominium_id uuid,
  p_membership_id uuid,
  p_display_name text,
  p_cnpj text,
  p_address jsonb,
  p_administration_company text,
  p_unit_count integer,
  p_contact jsonb
)
RETURNS TABLE (
  condominium_id uuid,
  display_name text,
  role_key text,
  cnpj text,
  address jsonb,
  administration_company text,
  unit_count integer,
  contact jsonb
)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = app, pg_catalog
AS $$
DECLARE
  database_user_id uuid;
BEGIN
  database_user_id := app.resolve_user_id(trim(p_auth_subject));

  IF database_user_id IS NULL THEN
    RAISE EXCEPTION 'A conta ativa não foi encontrada.' USING ERRCODE = '42501';
  END IF;

  INSERT INTO app.condominiums (
    id,
    display_name,
    status,
    cnpj,
    address,
    administration_company,
    unit_count,
    contact
  )
  VALUES (
    p_condominium_id,
    trim(p_display_name),
    'active',
    NULLIF(trim(p_cnpj), ''),
    COALESCE(p_address, '{}'::jsonb),
    NULLIF(trim(p_administration_company), ''),
    p_unit_count,
    COALESCE(p_contact, '{}'::jsonb)
  );

  INSERT INTO app.memberships (
    condominium_id,
    id,
    user_id,
    role_key,
    status,
    valid_from,
    revision
  )
  VALUES (
    p_condominium_id,
    p_membership_id,
    database_user_id,
    'manager',
    'active',
    now(),
    'membership-' || p_condominium_id::text || '-v1'
  );

  RETURN QUERY
    SELECT
      condominiums.id,
      condominiums.display_name,
      'manager'::text,
      condominiums.cnpj,
      condominiums.address,
      condominiums.administration_company,
      condominiums.unit_count,
      condominiums.contact
    FROM app.condominiums AS condominiums
    WHERE condominiums.id = p_condominium_id;
END;
$$;

CREATE OR REPLACE FUNCTION app.leave_condominium_for_user(
  p_auth_subject text,
  p_condominium_id uuid
)
RETURNS boolean
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = app, pg_catalog
AS $$
DECLARE
  database_user_id uuid;
BEGIN
  database_user_id := app.resolve_user_id(trim(p_auth_subject));

  IF database_user_id IS NULL THEN
    RAISE EXCEPTION 'A conta ativa não foi encontrada.' USING ERRCODE = '42501';
  END IF;

  UPDATE app.memberships
  SET
    status = 'revoked',
    revoked_at = now(),
    valid_until = now(),
    revision = revision || '-revoked',
    updated_at = now()
  WHERE condominium_id = p_condominium_id
    AND user_id = database_user_id
    AND status = 'active';

  IF NOT FOUND THEN
    RAISE EXCEPTION 'O condomínio não está associado à sua conta.' USING ERRCODE = '42501';
  END IF;

  RETURN true;
END;
$$;

CREATE OR REPLACE FUNCTION app.delete_condominium_for_user(
  p_user_identity text,
  p_condominium_id uuid
)
RETURNS boolean
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = app, pg_catalog
AS $$
DECLARE
  database_user_id uuid;
BEGIN
  database_user_id := app.resolve_user_id(trim(p_user_identity));

  IF database_user_id IS NULL THEN
    RAISE EXCEPTION 'A conta ativa não foi encontrada.' USING ERRCODE = '42501';
  END IF;

  IF NOT EXISTS (
    SELECT 1
    FROM app.memberships
    WHERE condominium_id = p_condominium_id
      AND user_id = database_user_id
      AND role_key = 'manager'
      AND status = 'active'
      AND valid_from <= now()
      AND (valid_until IS NULL OR valid_until > now())
  ) THEN
    RAISE EXCEPTION 'Somente o síndico responsável pode apagar o condomínio.' USING ERRCODE = '42501';
  END IF;

  -- A exclusão é feita em ordem de dependência. Usuários permanecem globais.
  -- O serviço de storage deve remover os objetos físicos antes de usar esta rotina em produção.
  DELETE FROM app.answer_feedback WHERE condominium_id = p_condominium_id;
  DELETE FROM app.answer_trace_sources WHERE condominium_id = p_condominium_id;
  DELETE FROM app.answer_traces WHERE condominium_id = p_condominium_id;
  DELETE FROM app.model_invocation_evidence WHERE condominium_id = p_condominium_id;
  DELETE FROM app.citations WHERE condominium_id = p_condominium_id;
  DELETE FROM app.feedback WHERE condominium_id = p_condominium_id;
  DELETE FROM app.model_invocations WHERE condominium_id = p_condominium_id;
  DELETE FROM app.retrieval_evidence WHERE condominium_id = p_condominium_id;
  DELETE FROM app.answer_claims WHERE condominium_id = p_condominium_id;
  DELETE FROM app.answers WHERE condominium_id = p_condominium_id;
  DELETE FROM app.retrieval_runs WHERE condominium_id = p_condominium_id;
  DELETE FROM app.questions WHERE condominium_id = p_condominium_id;
  DELETE FROM app.audit_events WHERE condominium_id = p_condominium_id;
  DELETE FROM app.document_chunk_embeddings WHERE condominium_id = p_condominium_id;
  DELETE FROM app.document_chunks WHERE condominium_id = p_condominium_id;
  DELETE FROM app.document_pages WHERE condominium_id = p_condominium_id;
  DELETE FROM app.document_version_states WHERE condominium_id = p_condominium_id;
  DELETE FROM app.processing_jobs WHERE condominium_id = p_condominium_id;
  DELETE FROM app.document_versions WHERE condominium_id = p_condominium_id;
  DELETE FROM app.documents WHERE condominium_id = p_condominium_id;
  DELETE FROM app.storage_objects WHERE condominium_id = p_condominium_id;
  DELETE FROM app.memberships WHERE condominium_id = p_condominium_id;
  DELETE FROM app.condominiums WHERE id = p_condominium_id;

  RETURN true;
END;
$$;

CREATE OR REPLACE FUNCTION app.profile_actor_is_manager(
  p_user_identity text,
  p_condominium_id uuid
)
RETURNS uuid
LANGUAGE plpgsql
STABLE
SECURITY DEFINER
SET search_path = app, pg_catalog
AS $$
DECLARE
  database_user_id uuid;
BEGIN
  database_user_id := app.resolve_user_id(trim(p_user_identity));

  IF database_user_id IS NULL
     OR database_user_id <> app.current_user_id()
     OR p_condominium_id <> app.current_condominium_id()
     OR NOT EXISTS (
       SELECT 1
       FROM app.memberships
       WHERE condominium_id = p_condominium_id
         AND user_id = database_user_id
         AND role_key = 'manager'
         AND status = 'active'
         AND valid_from <= now()
         AND (valid_until IS NULL OR valid_until > now())
     ) THEN
    RAISE EXCEPTION 'Acesso ao perfil não autorizado.' USING ERRCODE = '42501';
  END IF;

  RETURN database_user_id;
END;
$$;

COMMIT;
