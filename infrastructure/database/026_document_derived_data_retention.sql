BEGIN;

CREATE TABLE app.document_purge_receipts (
  condominium_id uuid NOT NULL REFERENCES app.condominiums (id) ON DELETE CASCADE,
  document_id uuid NOT NULL,
  purged_at timestamptz NOT NULL DEFAULT clock_timestamp(),
  retention_until timestamptz NOT NULL DEFAULT (clock_timestamp() + interval '30 days'),
  deleted_artifact_count integer NOT NULL CHECK (deleted_artifact_count >= 0),
  PRIMARY KEY (condominium_id, document_id),
  CHECK (retention_until > purged_at)
);

ALTER TABLE app.document_purge_receipts ENABLE ROW LEVEL SECURITY;
ALTER TABLE app.document_purge_receipts FORCE ROW LEVEL SECURITY;

GRANT SELECT ON app.document_purge_receipts TO app_runtime;

CREATE POLICY document_purge_receipts_runtime_read
  ON app.document_purge_receipts
  FOR SELECT TO app_runtime
  USING (
    condominium_id = app.current_condominium_id()
    AND app.has_active_membership()
  );

CREATE INDEX document_purge_receipts_by_expiry
  ON app.document_purge_receipts (retention_until);

COMMENT ON TABLE app.document_purge_receipts IS
  'Recibo sem conteúdo do documento, mantido por 30 dias após a purga definitiva.';

ALTER TABLE app.citations
  ADD COLUMN source_removed_at timestamptz;

COMMENT ON COLUMN app.citations.source_removed_at IS
  'Marca uma citação histórica cujo arquivo original e índice documental foram removidos; o texto da conversa permanece.';

DO $$
DECLARE
  item record;
BEGIN
  FOR item IN
    SELECT conname
    FROM pg_constraint
    WHERE conrelid = 'app.citations'::regclass
      AND confrelid = 'app.retrieval_evidence'::regclass
  LOOP
    EXECUTE format('ALTER TABLE app.citations DROP CONSTRAINT %I', item.conname);
  END LOOP;
END
$$;

CREATE FUNCTION app.purge_expired_document_data(
  p_condominium_id uuid,
  p_document_id uuid
)
RETURNS boolean
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = pg_catalog, app
SET row_security = off
AS $$
DECLARE
  archived_at_value timestamptz;
  document_version_ids uuid[];
  storage_object_ids uuid[];
  document_chunk_ids uuid[];
  deleted_artifact_count integer := 0;
  changed_count integer;
BEGIN
  IF p_condominium_id IS DISTINCT FROM app.current_condominium_id()
     OR p_document_id IS NULL THEN
    RAISE EXCEPTION 'O contexto de purga documental é inválido.'
      USING ERRCODE = '42501';
  END IF;

  SELECT documents.archived_at
  INTO archived_at_value
  FROM app.documents AS documents
  WHERE documents.condominium_id = p_condominium_id
    AND documents.id = p_document_id
    AND documents.status = 'archived'
  FOR UPDATE;

  IF NOT FOUND OR archived_at_value > clock_timestamp() - interval '30 days' THEN
    RETURN false;
  END IF;

  SELECT
    COALESCE(array_agg(versions.id), ARRAY[]::uuid[]),
    COALESCE(array_agg(versions.storage_object_id), ARRAY[]::uuid[])
  INTO document_version_ids, storage_object_ids
  FROM app.document_versions AS versions
  WHERE versions.condominium_id = p_condominium_id
    AND versions.document_id = p_document_id;

  SELECT COALESCE(array_agg(chunks.id), ARRAY[]::uuid[])
  INTO document_chunk_ids
  FROM app.document_chunks AS chunks
  WHERE chunks.condominium_id = p_condominium_id
    AND chunks.document_version_id = ANY(document_version_ids);

  UPDATE app.citations AS citations
  SET source_removed_at = clock_timestamp()
  WHERE citations.condominium_id = p_condominium_id
    AND citations.document_id = p_document_id
    AND citations.source_scope = 'condominium'
    AND citations.source_removed_at IS NULL;

  DELETE FROM app.answer_trace_sources AS sources
  WHERE sources.condominium_id = p_condominium_id
    AND sources.document_id = p_document_id
    AND sources.source_scope = 'condominium';
  GET DIAGNOSTICS changed_count = ROW_COUNT;
  deleted_artifact_count := deleted_artifact_count + changed_count;

  DELETE FROM app.model_invocation_evidence AS evidence
  WHERE evidence.condominium_id = p_condominium_id
    AND evidence.retrieval_run_id IN (
      SELECT retrieval_run_id
      FROM app.retrieval_evidence
      WHERE condominium_id = p_condominium_id
        AND document_chunk_id = ANY(document_chunk_ids)
        AND source_scope = 'condominium'
    )
    AND evidence.retrieval_evidence_id = ANY(document_chunk_ids);
  GET DIAGNOSTICS changed_count = ROW_COUNT;
  deleted_artifact_count := deleted_artifact_count + changed_count;

  DELETE FROM app.retrieval_evidence AS evidence
  WHERE evidence.condominium_id = p_condominium_id
    AND evidence.document_chunk_id = ANY(document_chunk_ids)
    AND evidence.source_scope = 'condominium';
  GET DIAGNOSTICS changed_count = ROW_COUNT;
  deleted_artifact_count := deleted_artifact_count + changed_count;

  DELETE FROM app.document_chunk_embeddings AS embeddings
  WHERE embeddings.condominium_id = p_condominium_id
    AND embeddings.document_chunk_id = ANY(document_chunk_ids);
  GET DIAGNOSTICS changed_count = ROW_COUNT;
  deleted_artifact_count := deleted_artifact_count + changed_count;

  DELETE FROM app.document_chunks AS chunks
  WHERE chunks.condominium_id = p_condominium_id
    AND chunks.id = ANY(document_chunk_ids);
  GET DIAGNOSTICS changed_count = ROW_COUNT;
  deleted_artifact_count := deleted_artifact_count + changed_count;

  DELETE FROM app.document_pages AS pages
  WHERE pages.condominium_id = p_condominium_id
    AND pages.document_version_id = ANY(document_version_ids);
  GET DIAGNOSTICS changed_count = ROW_COUNT;
  deleted_artifact_count := deleted_artifact_count + changed_count;

  UPDATE app.document_version_states AS states
  SET current_processing_job_id = NULL,
      updated_at = clock_timestamp()
  WHERE states.condominium_id = p_condominium_id
    AND states.document_version_id = ANY(document_version_ids);

  DELETE FROM app.processing_jobs AS jobs
  WHERE jobs.condominium_id = p_condominium_id
    AND jobs.document_version_id = ANY(document_version_ids);
  GET DIAGNOSTICS changed_count = ROW_COUNT;
  deleted_artifact_count := deleted_artifact_count + changed_count;

  DELETE FROM app.document_version_states AS states
  WHERE states.condominium_id = p_condominium_id
    AND states.document_version_id = ANY(document_version_ids);
  GET DIAGNOSTICS changed_count = ROW_COUNT;
  deleted_artifact_count := deleted_artifact_count + changed_count;

  DELETE FROM app.document_versions AS versions
  WHERE versions.condominium_id = p_condominium_id
    AND versions.id = ANY(document_version_ids);
  GET DIAGNOSTICS changed_count = ROW_COUNT;
  deleted_artifact_count := deleted_artifact_count + changed_count;

  DELETE FROM app.document_original_contents AS contents
  WHERE contents.condominium_id = p_condominium_id
    AND contents.storage_object_id = ANY(storage_object_ids);
  GET DIAGNOSTICS changed_count = ROW_COUNT;
  deleted_artifact_count := deleted_artifact_count + changed_count;

  DELETE FROM app.documents AS documents
  WHERE documents.condominium_id = p_condominium_id
    AND documents.id = p_document_id;
  GET DIAGNOSTICS changed_count = ROW_COUNT;
  deleted_artifact_count := deleted_artifact_count + changed_count;

  DELETE FROM app.storage_objects AS objects
  WHERE objects.condominium_id = p_condominium_id
    AND objects.id = ANY(storage_object_ids);
  GET DIAGNOSTICS changed_count = ROW_COUNT;
  deleted_artifact_count := deleted_artifact_count + changed_count;

  IF EXISTS (
    SELECT 1 FROM app.documents AS documents
    WHERE documents.condominium_id = p_condominium_id
      AND documents.id = p_document_id
  ) OR EXISTS (
    SELECT 1 FROM app.document_versions AS versions
    WHERE versions.condominium_id = p_condominium_id
      AND versions.id = ANY(document_version_ids)
  ) OR EXISTS (
    SELECT 1 FROM app.document_original_contents AS contents
    WHERE contents.condominium_id = p_condominium_id
      AND contents.storage_object_id = ANY(storage_object_ids)
  ) OR EXISTS (
    SELECT 1 FROM app.document_pages AS pages
    WHERE pages.condominium_id = p_condominium_id
      AND pages.document_version_id = ANY(document_version_ids)
  ) OR EXISTS (
    SELECT 1 FROM app.document_version_states AS states
    WHERE states.condominium_id = p_condominium_id
      AND states.document_version_id = ANY(document_version_ids)
  ) OR EXISTS (
    SELECT 1 FROM app.document_chunks AS chunks
    WHERE chunks.condominium_id = p_condominium_id
      AND chunks.id = ANY(document_chunk_ids)
  ) OR EXISTS (
    SELECT 1 FROM app.document_chunk_embeddings AS embeddings
    WHERE embeddings.condominium_id = p_condominium_id
      AND embeddings.document_chunk_id = ANY(document_chunk_ids)
  ) OR EXISTS (
    SELECT 1 FROM app.processing_jobs AS jobs
    WHERE jobs.condominium_id = p_condominium_id
      AND jobs.document_version_id = ANY(document_version_ids)
  ) OR EXISTS (
    SELECT 1 FROM app.retrieval_evidence AS evidence
    WHERE evidence.condominium_id = p_condominium_id
      AND evidence.document_chunk_id = ANY(document_chunk_ids)
      AND evidence.source_scope = 'condominium'
  ) OR EXISTS (
    SELECT 1 FROM app.model_invocation_evidence AS evidence
    WHERE evidence.condominium_id = p_condominium_id
      AND evidence.retrieval_evidence_id = ANY(document_chunk_ids)
  ) OR EXISTS (
    SELECT 1 FROM app.citations AS citations
    WHERE citations.condominium_id = p_condominium_id
      AND citations.document_id = p_document_id
      AND citations.source_scope = 'condominium'
      AND citations.source_removed_at IS NULL
  ) OR EXISTS (
    SELECT 1 FROM app.answer_trace_sources AS sources
    WHERE sources.condominium_id = p_condominium_id
      AND sources.document_id = p_document_id
      AND sources.source_scope = 'condominium'
  ) OR EXISTS (
    SELECT 1 FROM app.storage_objects AS objects
    WHERE objects.condominium_id = p_condominium_id
      AND objects.id = ANY(storage_object_ids)
  ) THEN
    RAISE EXCEPTION 'A purga documental deixou artefatos vinculados no banco ativo.'
      USING ERRCODE = 'integrity_constraint_violation';
  END IF;

  INSERT INTO app.document_purge_receipts (
    condominium_id, document_id, purged_at, retention_until, deleted_artifact_count
  )
  VALUES (
    p_condominium_id,
    p_document_id,
    clock_timestamp(),
    clock_timestamp() + interval '30 days',
    deleted_artifact_count
  )
  ON CONFLICT (condominium_id, document_id)
  DO UPDATE SET
    purged_at = EXCLUDED.purged_at,
    retention_until = EXCLUDED.retention_until,
    deleted_artifact_count = EXCLUDED.deleted_artifact_count;

  RETURN true;
END;
$$;

REVOKE ALL ON FUNCTION app.purge_expired_document_data(uuid, uuid) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION app.purge_expired_document_data(uuid, uuid) TO app_worker;

CREATE FUNCTION app.purge_expired_document_purge_receipts()
RETURNS integer
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = pg_catalog, app
SET row_security = off
AS $$
DECLARE
  deleted_count integer;
BEGIN
  DELETE FROM app.document_purge_receipts
  WHERE retention_until <= clock_timestamp();
  GET DIAGNOSTICS deleted_count = ROW_COUNT;
  RETURN deleted_count;
END;
$$;

REVOKE ALL ON FUNCTION app.purge_expired_document_purge_receipts() FROM PUBLIC;
GRANT EXECUTE ON FUNCTION app.purge_expired_document_purge_receipts() TO app_worker;

COMMIT;
