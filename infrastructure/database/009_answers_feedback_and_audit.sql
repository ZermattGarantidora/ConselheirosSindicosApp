BEGIN;

CREATE TABLE app.answer_traces (
  condominium_id uuid NOT NULL REFERENCES app.condominiums (id) ON DELETE RESTRICT,
  id uuid NOT NULL,
  user_id uuid NOT NULL REFERENCES app.users (id) ON DELETE RESTRICT,
  question_sha256 text NOT NULL CHECK (question_sha256 ~ '^[A-Fa-f0-9]{64}$'),
  response_sha256 text NOT NULL CHECK (response_sha256 ~ '^[A-Fa-f0-9]{64}$'),
  answer_mode text NOT NULL CHECK (answer_mode IN ('grounded', 'abstained', 'conflict', 'failed')),
  retrieval_pipeline_version text NOT NULL CHECK (length(trim(retrieval_pipeline_version)) > 0),
  retrieval_query_hash text NOT NULL CHECK (retrieval_query_hash ~ '^[A-Fa-f0-9]{64}$'),
  candidate_count integer NOT NULL CHECK (candidate_count >= 0),
  selected_count integer NOT NULL CHECK (selected_count >= 0),
  sufficiency_status text NOT NULL CHECK (sufficiency_status IN ('sufficient', 'weak', 'insufficient')),
  task_class text NOT NULL CHECK (task_class IN ('economical', 'intermediate', 'advanced')),
  prompt_version text NOT NULL CHECK (length(trim(prompt_version)) > 0),
  schema_version text NOT NULL CHECK (length(trim(schema_version)) > 0),
  provider_key text NOT NULL CHECK (length(trim(provider_key)) > 0),
  unit_kind text NOT NULL CHECK (length(trim(unit_kind)) > 0),
  input_units integer NOT NULL CHECK (input_units >= 0),
  output_units integer NOT NULL CHECK (output_units >= 0),
  estimated_cost_micros bigint NOT NULL CHECK (estimated_cost_micros >= 0),
  security_answer_mode text NOT NULL CHECK (security_answer_mode IN ('grounded', 'abstained', 'conflict', 'failed')),
  evidence_tenant_checked boolean NOT NULL CHECK (evidence_tenant_checked),
  citation_validation text NOT NULL CHECK (citation_validation = 'performed'),
  latency_ms numeric(12,3) NOT NULL CHECK (latency_ms >= 0),
  created_at timestamptz NOT NULL DEFAULT now(),
  PRIMARY KEY (condominium_id, id)
);

CREATE TABLE app.answer_trace_sources (
  condominium_id uuid NOT NULL,
  answer_id uuid NOT NULL,
  source_index integer NOT NULL CHECK (source_index >= 0),
  document_id uuid NOT NULL,
  document_version_id uuid NOT NULL,
  document_chunk_id uuid NOT NULL,
  page_number integer NOT NULL CHECK (page_number >= 1),
  content_sha256 text NOT NULL CHECK (content_sha256 ~ '^[A-Fa-f0-9]{64}$'),
  PRIMARY KEY (condominium_id, answer_id, source_index),
  FOREIGN KEY (condominium_id, answer_id)
    REFERENCES app.answer_traces (condominium_id, id) ON DELETE RESTRICT,
  FOREIGN KEY (condominium_id, document_id)
    REFERENCES app.documents (condominium_id, id) ON DELETE RESTRICT,
  FOREIGN KEY (condominium_id, document_version_id)
    REFERENCES app.document_versions (condominium_id, id) ON DELETE RESTRICT,
  FOREIGN KEY (condominium_id, document_chunk_id)
    REFERENCES app.document_chunks (condominium_id, id) ON DELETE RESTRICT
);

CREATE TABLE app.answer_feedback (
  condominium_id uuid NOT NULL,
  id uuid NOT NULL,
  answer_id uuid NOT NULL,
  user_id uuid NOT NULL REFERENCES app.users (id) ON DELETE RESTRICT,
  classification text NOT NULL CHECK (classification IN ('correct', 'incorrect', 'incomplete', 'outdated')),
  comment text CHECK (comment IS NULL OR length(comment) <= 2000),
  source_refs jsonb NOT NULL CHECK (jsonb_typeof(source_refs) = 'array'),
  created_at timestamptz NOT NULL DEFAULT now(),
  PRIMARY KEY (condominium_id, id),
  FOREIGN KEY (condominium_id, answer_id)
    REFERENCES app.answer_traces (condominium_id, id) ON DELETE RESTRICT
);

CREATE INDEX answer_traces_by_tenant_and_created_at
  ON app.answer_traces (condominium_id, created_at DESC);
CREATE INDEX answer_feedback_by_tenant_and_created_at
  ON app.answer_feedback (condominium_id, created_at DESC);

ALTER TABLE app.answer_traces ENABLE ROW LEVEL SECURITY;
ALTER TABLE app.answer_traces FORCE ROW LEVEL SECURITY;
ALTER TABLE app.answer_trace_sources ENABLE ROW LEVEL SECURITY;
ALTER TABLE app.answer_trace_sources FORCE ROW LEVEL SECURITY;
ALTER TABLE app.answer_feedback ENABLE ROW LEVEL SECURITY;
ALTER TABLE app.answer_feedback FORCE ROW LEVEL SECURITY;

GRANT SELECT, INSERT ON app.answer_traces, app.answer_trace_sources, app.answer_feedback TO app_runtime;

CREATE POLICY answer_traces_runtime_read ON app.answer_traces
  FOR SELECT TO app_runtime
  USING (condominium_id = app.current_condominium_id());

CREATE POLICY answer_traces_runtime_insert ON app.answer_traces
  FOR INSERT TO app_runtime
  WITH CHECK (
    condominium_id = app.current_condominium_id()
    AND user_id = app.current_user_id()
  );

CREATE POLICY answer_trace_sources_runtime_read ON app.answer_trace_sources
  FOR SELECT TO app_runtime
  USING (condominium_id = app.current_condominium_id());

CREATE POLICY answer_trace_sources_runtime_insert ON app.answer_trace_sources
  FOR INSERT TO app_runtime
  WITH CHECK (condominium_id = app.current_condominium_id());

CREATE POLICY answer_feedback_runtime_read ON app.answer_feedback
  FOR SELECT TO app_runtime
  USING (condominium_id = app.current_condominium_id());

CREATE POLICY answer_feedback_runtime_insert ON app.answer_feedback
  FOR INSERT TO app_runtime
  WITH CHECK (
    condominium_id = app.current_condominium_id()
    AND user_id = app.current_user_id()
  );

COMMIT;
