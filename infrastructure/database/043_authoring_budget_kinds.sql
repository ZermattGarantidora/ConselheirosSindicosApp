-- Specs 072/073: finalidades de autoria; política continua negada por padrão.
BEGIN;
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
    OR v_request->>'kind' NOT IN ('setup','upload','question','pdf_ocr','photo_ocr','photo_analysis','batch_synthesis','embedding','document_write','document_review','document_improvement','audio_transcription','audio_minutes_write','audio_minutes_review')
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
        AND (v_request->>'kind' NOT IN ('upload','document_write','document_review','document_improvement','audio_transcription','audio_minutes_write','audio_minutes_review') OR m.role_key='manager')
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


COMMIT;
