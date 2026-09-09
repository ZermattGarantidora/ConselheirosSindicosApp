BEGIN;

CREATE OR REPLACE FUNCTION app.has_active_membership()
RETURNS boolean
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = pg_catalog, app
AS $$
  SELECT EXISTS (
    SELECT 1
    FROM app.memberships
    WHERE memberships.condominium_id = app.current_condominium_id()
      AND memberships.user_id = app.current_user_id()
      AND memberships.status = 'active'
      AND memberships.valid_from <= now()
      AND (memberships.valid_until IS NULL OR memberships.valid_until > now())
  );
$$;

REVOKE ALL ON FUNCTION app.has_active_membership() FROM PUBLIC;
GRANT EXECUTE ON FUNCTION app.has_active_membership() TO app_runtime;

CREATE TABLE app.questions (
  condominium_id uuid NOT NULL REFERENCES app.condominiums (id) ON DELETE RESTRICT,
  id uuid NOT NULL,
  asked_by_user_id uuid NOT NULL REFERENCES app.users (id) ON DELETE RESTRICT,
  content text NOT NULL CHECK (length(trim(content)) > 0),
  language text NOT NULL CHECK (language = 'pt-BR'),
  idempotency_key text NOT NULL CHECK (length(trim(idempotency_key)) > 0),
  request_id text NOT NULL CHECK (length(trim(request_id)) > 0),
  created_at timestamptz NOT NULL DEFAULT now(),
  retention_until timestamptz,
  PRIMARY KEY (condominium_id, id),
  UNIQUE (condominium_id, idempotency_key)
);

CREATE TABLE app.retrieval_runs (
  condominium_id uuid NOT NULL,
  id uuid NOT NULL,
  question_id uuid NOT NULL,
  status text NOT NULL CHECK (status IN ('completed', 'failed')),
  pipeline_version text NOT NULL CHECK (length(trim(pipeline_version)) > 0),
  risk_class text NOT NULL CHECK (risk_class IN ('low', 'medium', 'high')),
  query_hash text NOT NULL CHECK (query_hash ~ '^[A-Fa-f0-9]{64}$'),
  started_at timestamptz NOT NULL,
  finished_at timestamptz NOT NULL,
  candidate_count integer NOT NULL CHECK (candidate_count >= 0),
  selected_count integer NOT NULL CHECK (selected_count >= 0),
  failure_code text,
  PRIMARY KEY (condominium_id, id),
  FOREIGN KEY (condominium_id, question_id)
    REFERENCES app.questions (condominium_id, id) ON DELETE RESTRICT,
  CHECK (finished_at >= started_at),
  CHECK ((status = 'failed') = (failure_code IS NOT NULL))
);

CREATE TABLE app.retrieval_evidence (
  condominium_id uuid NOT NULL,
  retrieval_run_id uuid NOT NULL,
  document_chunk_id uuid NOT NULL,
  rank integer NOT NULL CHECK (rank > 0),
  lexical_score double precision NOT NULL CHECK (lexical_score BETWEEN 0 AND 1),
  semantic_score double precision CHECK (semantic_score IS NULL OR semantic_score BETWEEN 0 AND 1),
  rerank_score double precision NOT NULL CHECK (rerank_score BETWEEN 0 AND 1),
  selected_for_generation boolean NOT NULL,
  sufficiency_flags jsonb NOT NULL DEFAULT '[]'::jsonb,
  created_at timestamptz NOT NULL DEFAULT now(),
  PRIMARY KEY (condominium_id, retrieval_run_id, document_chunk_id),
  FOREIGN KEY (condominium_id, retrieval_run_id)
    REFERENCES app.retrieval_runs (condominium_id, id) ON DELETE RESTRICT,
  FOREIGN KEY (condominium_id, document_chunk_id)
    REFERENCES app.document_chunks (condominium_id, id) ON DELETE RESTRICT,
  CHECK (jsonb_typeof(sufficiency_flags) = 'array')
);

CREATE TABLE app.answers (
  condominium_id uuid NOT NULL,
  id uuid NOT NULL,
  question_id uuid NOT NULL,
  retrieval_run_id uuid NOT NULL,
  schema_version text NOT NULL,
  answer_mode text NOT NULL CHECK (answer_mode IN ('grounded', 'abstained', 'conflict', 'failed')),
  direct_answer text NOT NULL CHECK (length(trim(direct_answer)) > 0),
  attention_points jsonb NOT NULL DEFAULT '[]'::jsonb,
  suggested_next_step text,
  specialist_required boolean NOT NULL,
  specialist_type text,
  specialist_reason text,
  risk_class text NOT NULL CHECK (risk_class IN ('low', 'medium', 'high')),
  validation_status text NOT NULL CHECK (validation_status IN ('passed', 'failed')),
  abstention_reason text,
  created_at timestamptz NOT NULL DEFAULT now(),
  retention_until timestamptz,
  PRIMARY KEY (condominium_id, id),
  FOREIGN KEY (condominium_id, question_id)
    REFERENCES app.questions (condominium_id, id) ON DELETE RESTRICT,
  FOREIGN KEY (condominium_id, retrieval_run_id)
    REFERENCES app.retrieval_runs (condominium_id, id) ON DELETE RESTRICT,
  CHECK (jsonb_typeof(attention_points) = 'array'),
  CHECK ((specialist_required = false AND specialist_type IS NULL AND specialist_reason IS NULL)
    OR (specialist_required = true AND specialist_type IS NOT NULL AND specialist_reason IS NOT NULL)),
  CHECK (answer_mode NOT IN ('grounded', 'conflict') OR validation_status = 'passed'),
  CHECK (answer_mode <> 'failed' OR validation_status = 'failed')
);

CREATE TABLE app.answer_claims (
  condominium_id uuid NOT NULL,
  id uuid NOT NULL,
  answer_id uuid NOT NULL,
  ordinal integer NOT NULL CHECK (ordinal >= 0),
  statement text NOT NULL CHECK (length(trim(statement)) > 0),
  claim_type text NOT NULL CHECK (claim_type IN ('condominium_fact', 'interpretation', 'recommendation')),
  evidence_required boolean NOT NULL,
  citation_evidence_ids jsonb NOT NULL DEFAULT '[]'::jsonb,
  PRIMARY KEY (condominium_id, id),
  UNIQUE (condominium_id, answer_id, ordinal),
  FOREIGN KEY (condominium_id, answer_id)
    REFERENCES app.answers (condominium_id, id) ON DELETE RESTRICT,
  CHECK (jsonb_typeof(citation_evidence_ids) = 'array')
);

CREATE TABLE app.citations (
  condominium_id uuid NOT NULL,
  id uuid NOT NULL,
  answer_id uuid NOT NULL,
  answer_claim_id uuid NOT NULL,
  retrieval_run_id uuid NOT NULL,
  retrieval_evidence_id uuid NOT NULL,
  ordinal integer NOT NULL CHECK (ordinal >= 0),
  document_id uuid NOT NULL,
  document_version_id uuid NOT NULL,
  document_title_snapshot text NOT NULL,
  page_number_snapshot integer NOT NULL CHECK (page_number_snapshot >= 1),
  page_start_offset integer NOT NULL CHECK (page_start_offset >= 0),
  page_end_offset integer NOT NULL CHECK (page_end_offset > page_start_offset),
  excerpt_snapshot text NOT NULL CHECK (length(trim(excerpt_snapshot)) > 0),
  excerpt_sha256 text NOT NULL CHECK (excerpt_sha256 ~ '^[A-Fa-f0-9]{64}$'),
  created_at timestamptz NOT NULL DEFAULT now(),
  PRIMARY KEY (condominium_id, id),
  UNIQUE (condominium_id, answer_id, ordinal),
  FOREIGN KEY (condominium_id, answer_id)
    REFERENCES app.answers (condominium_id, id) ON DELETE RESTRICT,
  FOREIGN KEY (condominium_id, answer_claim_id)
    REFERENCES app.answer_claims (condominium_id, id) ON DELETE RESTRICT,
  FOREIGN KEY (condominium_id, retrieval_run_id, retrieval_evidence_id)
    REFERENCES app.retrieval_evidence (condominium_id, retrieval_run_id, document_chunk_id) ON DELETE RESTRICT,
  FOREIGN KEY (condominium_id, document_version_id)
    REFERENCES app.document_versions (condominium_id, id) ON DELETE RESTRICT,
  FOREIGN KEY (condominium_id, document_id)
    REFERENCES app.documents (condominium_id, id) ON DELETE RESTRICT
);

CREATE TABLE app.feedback (
  condominium_id uuid NOT NULL,
  id uuid NOT NULL,
  answer_id uuid NOT NULL,
  submitted_by_user_id uuid NOT NULL REFERENCES app.users (id) ON DELETE RESTRICT,
  classification text NOT NULL CHECK (classification IN ('correct', 'incorrect', 'incomplete', 'outdated')),
  comment text CHECK (comment IS NULL OR length(comment) <= 2000),
  created_at timestamptz NOT NULL DEFAULT now(),
  retention_until timestamptz,
  PRIMARY KEY (condominium_id, id),
  FOREIGN KEY (condominium_id, answer_id)
    REFERENCES app.answers (condominium_id, id) ON DELETE RESTRICT
);

CREATE TABLE app.model_invocations (
  condominium_id uuid NOT NULL,
  id uuid NOT NULL,
  question_id uuid NOT NULL,
  answer_id uuid NOT NULL,
  retrieval_run_id uuid NOT NULL,
  task_type text NOT NULL CHECK (length(trim(task_type)) > 0),
  risk_class text NOT NULL CHECK (risk_class IN ('low', 'medium', 'high')),
  provider_key text NOT NULL CHECK (length(trim(provider_key)) > 0),
  model_key text NOT NULL CHECK (length(trim(model_key)) > 0),
  model_version text NOT NULL CHECK (length(trim(model_version)) > 0),
  prompt_version text NOT NULL CHECK (length(trim(prompt_version)) > 0),
  pipeline_version text NOT NULL CHECK (length(trim(pipeline_version)) > 0),
  routing_reason text NOT NULL CHECK (length(trim(routing_reason)) > 0),
  status text NOT NULL CHECK (status IN ('completed', 'failed', 'skipped')),
  input_tokens integer NOT NULL CHECK (input_tokens >= 0),
  output_tokens integer NOT NULL CHECK (output_tokens >= 0),
  cached_input_tokens integer NOT NULL CHECK (cached_input_tokens >= 0),
  latency_ms integer NOT NULL CHECK (latency_ms >= 0),
  estimated_cost_microunits bigint NOT NULL CHECK (estimated_cost_microunits >= 0),
  cost_currency text NOT NULL CHECK (cost_currency = 'BRL'),
  input_hash text NOT NULL CHECK (input_hash ~ '^[A-Fa-f0-9]{64}$'),
  output_hash text CHECK (output_hash IS NULL OR output_hash ~ '^[A-Fa-f0-9]{64}$'),
  error_code text,
  created_at timestamptz NOT NULL DEFAULT now(),
  PRIMARY KEY (condominium_id, id),
  FOREIGN KEY (condominium_id, question_id)
    REFERENCES app.questions (condominium_id, id) ON DELETE RESTRICT,
  FOREIGN KEY (condominium_id, answer_id)
    REFERENCES app.answers (condominium_id, id) ON DELETE RESTRICT,
  FOREIGN KEY (condominium_id, retrieval_run_id)
    REFERENCES app.retrieval_runs (condominium_id, id) ON DELETE RESTRICT,
  CHECK ((status = 'failed') = (error_code IS NOT NULL))
);

CREATE TABLE app.model_invocation_evidence (
  condominium_id uuid NOT NULL,
  model_invocation_id uuid NOT NULL,
  retrieval_run_id uuid NOT NULL,
  retrieval_evidence_id uuid NOT NULL,
  ordinal integer NOT NULL CHECK (ordinal >= 0),
  PRIMARY KEY (condominium_id, model_invocation_id, retrieval_run_id, retrieval_evidence_id),
  UNIQUE (condominium_id, model_invocation_id, ordinal),
  FOREIGN KEY (condominium_id, model_invocation_id)
    REFERENCES app.model_invocations (condominium_id, id) ON DELETE RESTRICT,
  FOREIGN KEY (condominium_id, retrieval_run_id, retrieval_evidence_id)
    REFERENCES app.retrieval_evidence (condominium_id, retrieval_run_id, document_chunk_id) ON DELETE RESTRICT
);

CREATE TABLE app.audit_events (
  condominium_id uuid NOT NULL,
  id uuid NOT NULL,
  actor_type text NOT NULL CHECK (actor_type IN ('user', 'system')),
  actor_user_id uuid REFERENCES app.users (id) ON DELETE RESTRICT,
  event_type text NOT NULL CHECK (event_type IN ('question_created', 'answer_created', 'answer_failed', 'feedback_created')),
  subject_type text NOT NULL CHECK (subject_type IN ('question', 'answer', 'feedback')),
  subject_id uuid NOT NULL,
  request_id text NOT NULL CHECK (length(trim(request_id)) > 0),
  correlation_id text NOT NULL CHECK (length(trim(correlation_id)) > 0),
  metadata jsonb NOT NULL DEFAULT '{}'::jsonb,
  created_at timestamptz NOT NULL DEFAULT now(),
  retention_until timestamptz,
  PRIMARY KEY (condominium_id, id),
  CHECK (jsonb_typeof(metadata) = 'object')
);

CREATE INDEX questions_by_tenant_and_created_at
  ON app.questions (condominium_id, created_at DESC);
CREATE INDEX answers_by_tenant_and_created_at
  ON app.answers (condominium_id, created_at DESC);
CREATE INDEX feedback_by_tenant_and_answer
  ON app.feedback (condominium_id, answer_id, created_at DESC);
CREATE INDEX audit_events_by_tenant_and_created_at
  ON app.audit_events (condominium_id, created_at DESC);

ALTER TABLE app.questions ENABLE ROW LEVEL SECURITY;
ALTER TABLE app.questions FORCE ROW LEVEL SECURITY;
ALTER TABLE app.retrieval_runs ENABLE ROW LEVEL SECURITY;
ALTER TABLE app.retrieval_runs FORCE ROW LEVEL SECURITY;
ALTER TABLE app.retrieval_evidence ENABLE ROW LEVEL SECURITY;
ALTER TABLE app.retrieval_evidence FORCE ROW LEVEL SECURITY;
ALTER TABLE app.answers ENABLE ROW LEVEL SECURITY;
ALTER TABLE app.answers FORCE ROW LEVEL SECURITY;
ALTER TABLE app.answer_claims ENABLE ROW LEVEL SECURITY;
ALTER TABLE app.answer_claims FORCE ROW LEVEL SECURITY;
ALTER TABLE app.citations ENABLE ROW LEVEL SECURITY;
ALTER TABLE app.citations FORCE ROW LEVEL SECURITY;
ALTER TABLE app.feedback ENABLE ROW LEVEL SECURITY;
ALTER TABLE app.feedback FORCE ROW LEVEL SECURITY;
ALTER TABLE app.model_invocations ENABLE ROW LEVEL SECURITY;
ALTER TABLE app.model_invocations FORCE ROW LEVEL SECURITY;
ALTER TABLE app.model_invocation_evidence ENABLE ROW LEVEL SECURITY;
ALTER TABLE app.model_invocation_evidence FORCE ROW LEVEL SECURITY;
ALTER TABLE app.audit_events ENABLE ROW LEVEL SECURITY;
ALTER TABLE app.audit_events FORCE ROW LEVEL SECURITY;

GRANT SELECT, INSERT ON app.questions, app.retrieval_runs, app.retrieval_evidence,
  app.answers, app.answer_claims, app.citations, app.feedback,
  app.model_invocations, app.model_invocation_evidence, app.audit_events TO app_runtime;

CREATE POLICY questions_runtime_read ON app.questions
  FOR SELECT TO app_runtime
  USING (condominium_id = app.current_condominium_id() AND app.has_active_membership());
CREATE POLICY questions_runtime_insert ON app.questions
  FOR INSERT TO app_runtime
  WITH CHECK (
    condominium_id = app.current_condominium_id()
    AND app.has_active_membership()
    AND asked_by_user_id = app.current_user_id()
  );

CREATE POLICY retrieval_runs_runtime_read ON app.retrieval_runs
  FOR SELECT TO app_runtime
  USING (condominium_id = app.current_condominium_id() AND app.has_active_membership());
CREATE POLICY retrieval_runs_runtime_insert ON app.retrieval_runs
  FOR INSERT TO app_runtime
  WITH CHECK (
    condominium_id = app.current_condominium_id()
    AND app.has_active_membership()
    AND EXISTS (
      SELECT 1 FROM app.questions
      WHERE questions.condominium_id = retrieval_runs.condominium_id
        AND questions.id = retrieval_runs.question_id
        AND questions.asked_by_user_id = app.current_user_id()
    )
  );

CREATE POLICY retrieval_evidence_runtime_read ON app.retrieval_evidence
  FOR SELECT TO app_runtime
  USING (condominium_id = app.current_condominium_id() AND app.has_active_membership());
CREATE POLICY retrieval_evidence_runtime_insert ON app.retrieval_evidence
  FOR INSERT TO app_runtime
  WITH CHECK (
    condominium_id = app.current_condominium_id()
    AND app.has_active_membership()
    AND EXISTS (
      SELECT 1 FROM app.retrieval_runs
      WHERE retrieval_runs.condominium_id = retrieval_evidence.condominium_id
        AND retrieval_runs.id = retrieval_evidence.retrieval_run_id
    )
  );

CREATE POLICY answers_runtime_read ON app.answers
  FOR SELECT TO app_runtime
  USING (condominium_id = app.current_condominium_id() AND app.has_active_membership());
CREATE POLICY answers_runtime_insert ON app.answers
  FOR INSERT TO app_runtime
  WITH CHECK (
    condominium_id = app.current_condominium_id()
    AND app.has_active_membership()
    AND EXISTS (
      SELECT 1 FROM app.questions
      WHERE questions.condominium_id = answers.condominium_id
        AND questions.id = answers.question_id
        AND questions.asked_by_user_id = app.current_user_id()
    )
    AND EXISTS (
      SELECT 1 FROM app.retrieval_runs
      WHERE retrieval_runs.condominium_id = answers.condominium_id
        AND retrieval_runs.id = answers.retrieval_run_id
    )
  );

CREATE POLICY answer_claims_runtime_read ON app.answer_claims
  FOR SELECT TO app_runtime
  USING (condominium_id = app.current_condominium_id() AND app.has_active_membership());
CREATE POLICY answer_claims_runtime_insert ON app.answer_claims
  FOR INSERT TO app_runtime
  WITH CHECK (
    condominium_id = app.current_condominium_id()
    AND app.has_active_membership()
    AND EXISTS (
      SELECT 1 FROM app.answers
      WHERE answers.condominium_id = answer_claims.condominium_id
        AND answers.id = answer_claims.answer_id
    )
  );

CREATE POLICY citations_runtime_read ON app.citations
  FOR SELECT TO app_runtime
  USING (condominium_id = app.current_condominium_id() AND app.has_active_membership());
CREATE POLICY citations_runtime_insert ON app.citations
  FOR INSERT TO app_runtime
  WITH CHECK (
    condominium_id = app.current_condominium_id()
    AND app.has_active_membership()
    AND EXISTS (
      SELECT 1 FROM app.answers
      WHERE answers.condominium_id = citations.condominium_id
        AND answers.id = citations.answer_id
    )
    AND EXISTS (
      SELECT 1 FROM app.answer_claims
      WHERE answer_claims.condominium_id = citations.condominium_id
        AND answer_claims.id = citations.answer_claim_id
        AND answer_claims.answer_id = citations.answer_id
    )
    AND EXISTS (
      SELECT 1 FROM app.retrieval_evidence
      WHERE retrieval_evidence.condominium_id = citations.condominium_id
        AND retrieval_evidence.retrieval_run_id = citations.retrieval_run_id
        AND retrieval_evidence.document_chunk_id = citations.retrieval_evidence_id
    )
  );

CREATE POLICY feedback_runtime_read ON app.feedback
  FOR SELECT TO app_runtime
  USING (condominium_id = app.current_condominium_id() AND app.has_active_membership());
CREATE POLICY feedback_runtime_insert ON app.feedback
  FOR INSERT TO app_runtime
  WITH CHECK (
    condominium_id = app.current_condominium_id()
    AND app.has_active_membership()
    AND submitted_by_user_id = app.current_user_id()
    AND EXISTS (
      SELECT 1 FROM app.answers
      WHERE answers.condominium_id = feedback.condominium_id
        AND answers.id = feedback.answer_id
    )
  );

CREATE POLICY model_invocations_runtime_read ON app.model_invocations
  FOR SELECT TO app_runtime
  USING (condominium_id = app.current_condominium_id() AND app.has_active_membership());
CREATE POLICY model_invocations_runtime_insert ON app.model_invocations
  FOR INSERT TO app_runtime
  WITH CHECK (
    condominium_id = app.current_condominium_id()
    AND app.has_active_membership()
    AND EXISTS (
      SELECT 1 FROM app.questions
      WHERE questions.condominium_id = model_invocations.condominium_id
        AND questions.id = model_invocations.question_id
    )
    AND EXISTS (
      SELECT 1 FROM app.answers
      WHERE answers.condominium_id = model_invocations.condominium_id
        AND answers.id = model_invocations.answer_id
    )
    AND EXISTS (
      SELECT 1 FROM app.retrieval_runs
      WHERE retrieval_runs.condominium_id = model_invocations.condominium_id
        AND retrieval_runs.id = model_invocations.retrieval_run_id
    )
  );

CREATE POLICY model_invocation_evidence_runtime_read ON app.model_invocation_evidence
  FOR SELECT TO app_runtime
  USING (condominium_id = app.current_condominium_id() AND app.has_active_membership());
CREATE POLICY model_invocation_evidence_runtime_insert ON app.model_invocation_evidence
  FOR INSERT TO app_runtime
  WITH CHECK (
    condominium_id = app.current_condominium_id()
    AND app.has_active_membership()
    AND EXISTS (
      SELECT 1 FROM app.model_invocations
      WHERE model_invocations.condominium_id = model_invocation_evidence.condominium_id
        AND model_invocations.id = model_invocation_evidence.model_invocation_id
    )
    AND EXISTS (
      SELECT 1 FROM app.retrieval_evidence
      WHERE retrieval_evidence.condominium_id = model_invocation_evidence.condominium_id
        AND retrieval_evidence.retrieval_run_id = model_invocation_evidence.retrieval_run_id
        AND retrieval_evidence.document_chunk_id = model_invocation_evidence.retrieval_evidence_id
    )
  );

CREATE POLICY audit_events_runtime_read ON app.audit_events
  FOR SELECT TO app_runtime
  USING (condominium_id = app.current_condominium_id() AND app.has_active_membership());
CREATE POLICY audit_events_runtime_insert ON app.audit_events
  FOR INSERT TO app_runtime
  WITH CHECK (
    condominium_id = app.current_condominium_id()
    AND app.has_active_membership()
    AND actor_type = 'user'
    AND actor_user_id = app.current_user_id()
  );

COMMIT;
