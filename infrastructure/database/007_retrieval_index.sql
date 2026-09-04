BEGIN;

CREATE TABLE app.document_chunk_embeddings (
  condominium_id uuid NOT NULL,
  id uuid NOT NULL,
  document_chunk_id uuid NOT NULL,
  embedding_profile text NOT NULL CHECK (length(trim(embedding_profile)) > 0),
  provider_key text NOT NULL CHECK (length(trim(provider_key)) > 0),
  model_key text NOT NULL CHECK (length(trim(model_key)) > 0),
  model_version text NOT NULL CHECK (length(trim(model_version)) > 0),
  pipeline_version text NOT NULL CHECK (length(trim(pipeline_version)) > 0),
  dimensions integer NOT NULL CHECK (dimensions > 0),
  embedding vector NOT NULL,
  content_sha256 text NOT NULL CHECK (content_sha256 ~ '^[A-Fa-f0-9]{64}$'),
  created_at timestamptz NOT NULL DEFAULT now(),
  PRIMARY KEY (condominium_id, id),
  UNIQUE (condominium_id, document_chunk_id, embedding_profile),
  FOREIGN KEY (condominium_id, document_chunk_id)
    REFERENCES app.document_chunks (condominium_id, id) ON DELETE CASCADE,
  CHECK (vector_dims(embedding) = dimensions)
);

CREATE INDEX document_chunk_embeddings_by_tenant_profile
  ON app.document_chunk_embeddings (condominium_id, embedding_profile, document_chunk_id);

ALTER TABLE app.document_chunk_embeddings ENABLE ROW LEVEL SECURITY;
ALTER TABLE app.document_chunk_embeddings FORCE ROW LEVEL SECURITY;

GRANT SELECT ON app.document_chunk_embeddings TO app_runtime;
GRANT SELECT, INSERT, UPDATE, DELETE ON app.document_chunk_embeddings TO app_worker;

CREATE POLICY document_chunk_embeddings_runtime_read ON app.document_chunk_embeddings
  FOR SELECT TO app_runtime
  USING (
    condominium_id = app.current_condominium_id()
    AND EXISTS (
      SELECT 1
      FROM app.document_chunks
      WHERE document_chunks.condominium_id = document_chunk_embeddings.condominium_id
        AND document_chunks.id = document_chunk_embeddings.document_chunk_id
    )
  );

CREATE POLICY document_chunk_embeddings_worker_read ON app.document_chunk_embeddings
  FOR SELECT TO app_worker
  USING (
    current_user = 'app_worker'
    AND condominium_id = app.current_condominium_id()
  );

CREATE POLICY document_chunk_embeddings_worker_insert ON app.document_chunk_embeddings
  FOR INSERT TO app_worker
  WITH CHECK (
    current_user = 'app_worker'
    AND condominium_id = app.current_condominium_id()
    AND EXISTS (
      SELECT 1
      FROM app.document_chunks
      WHERE document_chunks.condominium_id = document_chunk_embeddings.condominium_id
        AND document_chunks.id = document_chunk_embeddings.document_chunk_id
    )
  );

CREATE POLICY document_chunk_embeddings_worker_update ON app.document_chunk_embeddings
  FOR UPDATE TO app_worker
  USING (
    current_user = 'app_worker'
    AND condominium_id = app.current_condominium_id()
  )
  WITH CHECK (
    current_user = 'app_worker'
    AND condominium_id = app.current_condominium_id()
  );

CREATE POLICY document_chunk_embeddings_worker_delete ON app.document_chunk_embeddings
  FOR DELETE TO app_worker
  USING (
    current_user = 'app_worker'
    AND condominium_id = app.current_condominium_id()
  );

COMMIT;
