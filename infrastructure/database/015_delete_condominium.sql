BEGIN;

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
  SELECT id
  INTO database_user_id
  FROM app.users
  WHERE (auth_subject = trim(p_user_identity) OR id::text = trim(p_user_identity))
    AND status = 'active'
  LIMIT 1;

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

REVOKE ALL ON FUNCTION app.delete_condominium_for_user(text, uuid) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION app.delete_condominium_for_user(text, uuid) TO app_runtime;

COMMIT;
