BEGIN;

CREATE TABLE app.legal_sources (
  id uuid PRIMARY KEY,
  title text NOT NULL CHECK (length(trim(title)) > 0),
  source_type text NOT NULL CHECK (source_type = 'legislation'),
  jurisdiction text NOT NULL CHECK (jurisdiction = 'BR'),
  issuing_authority text NOT NULL CHECK (length(trim(issuing_authority)) > 0),
  official_url text NOT NULL CHECK (official_url ~* '^https://'),
  status text NOT NULL CHECK (status IN ('active', 'archived')),
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

CREATE TABLE app.legal_source_versions (
  id uuid PRIMARY KEY,
  legal_source_id uuid NOT NULL REFERENCES app.legal_sources (id) ON DELETE RESTRICT,
  version_number integer NOT NULL CHECK (version_number > 0),
  version_label text NOT NULL CHECK (length(trim(version_label)) > 0),
  content_sha256 text NOT NULL CHECK (content_sha256 ~ '^[A-Fa-f0-9]{64}$'),
  media_type text NOT NULL CHECK (media_type = 'application/pdf'),
  size_bytes bigint NOT NULL CHECK (size_bytes > 0),
  effective_through text NOT NULL CHECK (length(trim(effective_through)) > 0),
  is_current boolean NOT NULL,
  imported_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (legal_source_id, version_number),
  UNIQUE (legal_source_id, content_sha256)
);

CREATE UNIQUE INDEX legal_source_versions_one_current
  ON app.legal_source_versions (legal_source_id)
  WHERE is_current;

CREATE TABLE app.legal_source_pages (
  id uuid PRIMARY KEY,
  legal_source_version_id uuid NOT NULL
    REFERENCES app.legal_source_versions (id) ON DELETE RESTRICT,
  page_index integer NOT NULL CHECK (page_index >= 0),
  page_number integer NOT NULL CHECK (page_number >= 1),
  extracted_text text NOT NULL,
  extraction_method text NOT NULL CHECK (extraction_method = 'pdf_text'),
  quality_score numeric(5,4) NOT NULL CHECK (quality_score BETWEEN 0 AND 1),
  content_sha256 text NOT NULL CHECK (content_sha256 ~ '^[A-Fa-f0-9]{64}$'),
  created_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (legal_source_version_id, page_index),
  UNIQUE (legal_source_version_id, page_number),
  UNIQUE (legal_source_version_id, id),
  CHECK (page_number = page_index + 1)
);

CREATE TABLE app.legal_source_chunks (
  id uuid PRIMARY KEY,
  legal_source_version_id uuid NOT NULL,
  legal_source_page_id uuid NOT NULL,
  chunk_index integer NOT NULL CHECK (chunk_index >= 0),
  start_offset integer NOT NULL CHECK (start_offset >= 0),
  end_offset integer NOT NULL CHECK (end_offset > start_offset),
  content text NOT NULL CHECK (length(trim(content)) > 0),
  content_sha256 text NOT NULL CHECK (content_sha256 ~ '^[A-Fa-f0-9]{64}$'),
  token_count integer NOT NULL CHECK (token_count > 0),
  search_vector tsvector NOT NULL,
  embedding_profile text NOT NULL CHECK (length(trim(embedding_profile)) > 0),
  embedding vector(128) NOT NULL,
  created_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (legal_source_version_id, legal_source_page_id, chunk_index),
  FOREIGN KEY (legal_source_version_id, legal_source_page_id)
    REFERENCES app.legal_source_pages (legal_source_version_id, id) ON DELETE RESTRICT
);

CREATE INDEX legal_source_chunks_search_vector
  ON app.legal_source_chunks USING gin (search_vector);
CREATE INDEX legal_source_chunks_embedding
  ON app.legal_source_chunks USING hnsw (embedding vector_cosine_ops);

ALTER TABLE app.legal_sources ENABLE ROW LEVEL SECURITY;
ALTER TABLE app.legal_source_versions ENABLE ROW LEVEL SECURITY;
ALTER TABLE app.legal_source_pages ENABLE ROW LEVEL SECURITY;
ALTER TABLE app.legal_source_chunks ENABLE ROW LEVEL SECURITY;

GRANT SELECT ON app.legal_sources, app.legal_source_versions,
  app.legal_source_pages, app.legal_source_chunks TO app_runtime;

CREATE POLICY legal_sources_runtime_read ON app.legal_sources
  FOR SELECT TO app_runtime
  USING (app.has_active_membership());
CREATE POLICY legal_source_versions_runtime_read ON app.legal_source_versions
  FOR SELECT TO app_runtime
  USING (app.has_active_membership());
CREATE POLICY legal_source_pages_runtime_read ON app.legal_source_pages
  FOR SELECT TO app_runtime
  USING (app.has_active_membership());
CREATE POLICY legal_source_chunks_runtime_read ON app.legal_source_chunks
  FOR SELECT TO app_runtime
  USING (app.has_active_membership());

ALTER TABLE app.retrieval_evidence
  ADD COLUMN source_scope text NOT NULL DEFAULT 'condominium'
    CHECK (source_scope IN ('condominium', 'legislation'));
ALTER TABLE app.citations
  ADD COLUMN source_scope text NOT NULL DEFAULT 'condominium'
    CHECK (source_scope IN ('condominium', 'legislation'));
ALTER TABLE app.answer_trace_sources
  ADD COLUMN source_scope text NOT NULL DEFAULT 'condominium'
    CHECK (source_scope IN ('condominium', 'legislation'));

DO $$
DECLARE
  item record;
BEGIN
  FOR item IN
    SELECT conname
    FROM pg_constraint
    WHERE conrelid = 'app.retrieval_evidence'::regclass
      AND confrelid = 'app.document_chunks'::regclass
  LOOP
    EXECUTE format('ALTER TABLE app.retrieval_evidence DROP CONSTRAINT %I', item.conname);
  END LOOP;

  FOR item IN
    SELECT conname
    FROM pg_constraint
    WHERE conrelid = 'app.citations'::regclass
      AND confrelid IN (
        'app.documents'::regclass,
        'app.document_versions'::regclass
      )
  LOOP
    EXECUTE format('ALTER TABLE app.citations DROP CONSTRAINT %I', item.conname);
  END LOOP;

  FOR item IN
    SELECT conname
    FROM pg_constraint
    WHERE conrelid = 'app.answer_trace_sources'::regclass
      AND confrelid IN (
        'app.documents'::regclass,
        'app.document_versions'::regclass,
        'app.document_chunks'::regclass
      )
  LOOP
    EXECUTE format('ALTER TABLE app.answer_trace_sources DROP CONSTRAINT %I', item.conname);
  END LOOP;
END
$$;

CREATE FUNCTION app.validate_retrieval_evidence_source()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = pg_catalog, app
AS $$
BEGIN
  IF NEW.source_scope = 'condominium' THEN
    IF NOT EXISTS (
      SELECT 1
      FROM app.document_chunks
      WHERE condominium_id = NEW.condominium_id
        AND id = NEW.document_chunk_id
    ) THEN
      RAISE EXCEPTION 'tenant document evidence does not exist'
        USING ERRCODE = 'foreign_key_violation';
    END IF;
  ELSIF NOT EXISTS (
    SELECT 1
    FROM app.legal_source_chunks AS chunk
    JOIN app.legal_source_versions AS version
      ON version.id = chunk.legal_source_version_id
    JOIN app.legal_sources AS source
      ON source.id = version.legal_source_id
    WHERE chunk.id = NEW.document_chunk_id
      AND version.is_current
      AND source.status = 'active'
  ) THEN
    RAISE EXCEPTION 'active legal evidence does not exist'
      USING ERRCODE = 'foreign_key_violation';
  END IF;
  RETURN NEW;
END
$$;

CREATE TRIGGER retrieval_evidence_source_guard
BEFORE INSERT OR UPDATE ON app.retrieval_evidence
FOR EACH ROW EXECUTE FUNCTION app.validate_retrieval_evidence_source();

CREATE FUNCTION app.validate_citation_source()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = pg_catalog, app
AS $$
BEGIN
  IF NOT EXISTS (
    SELECT 1
    FROM app.retrieval_evidence
    WHERE condominium_id = NEW.condominium_id
      AND retrieval_run_id = NEW.retrieval_run_id
      AND document_chunk_id = NEW.retrieval_evidence_id
      AND source_scope = NEW.source_scope
  ) THEN
    RAISE EXCEPTION 'citation retrieval evidence does not exist'
      USING ERRCODE = 'foreign_key_violation';
  END IF;

  IF NEW.source_scope = 'condominium' THEN
    IF NOT EXISTS (
      SELECT 1
      FROM app.document_versions AS version
      JOIN app.documents AS document
        ON document.condominium_id = version.condominium_id
        AND document.id = version.document_id
      WHERE version.condominium_id = NEW.condominium_id
        AND document.id = NEW.document_id
        AND version.id = NEW.document_version_id
    ) THEN
      RAISE EXCEPTION 'tenant citation source does not exist'
        USING ERRCODE = 'foreign_key_violation';
    END IF;
  ELSIF NOT EXISTS (
    SELECT 1
    FROM app.legal_source_versions AS version
    JOIN app.legal_sources AS source
      ON source.id = version.legal_source_id
    WHERE source.id = NEW.document_id
      AND version.id = NEW.document_version_id
      AND version.is_current
      AND source.status = 'active'
  ) THEN
    RAISE EXCEPTION 'legal citation source does not exist'
      USING ERRCODE = 'foreign_key_violation';
  END IF;
  RETURN NEW;
END
$$;

CREATE TRIGGER citations_source_guard
BEFORE INSERT OR UPDATE ON app.citations
FOR EACH ROW EXECUTE FUNCTION app.validate_citation_source();

CREATE FUNCTION app.validate_answer_trace_source()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = pg_catalog, app
AS $$
BEGIN
  IF NEW.source_scope = 'condominium' THEN
    IF NOT EXISTS (
      SELECT 1
      FROM app.document_chunks AS chunk
      JOIN app.document_versions AS version
        ON version.condominium_id = chunk.condominium_id
        AND version.id = chunk.document_version_id
      JOIN app.documents AS document
        ON document.condominium_id = version.condominium_id
        AND document.id = version.document_id
      WHERE chunk.condominium_id = NEW.condominium_id
        AND chunk.id = NEW.document_chunk_id
        AND document.id = NEW.document_id
        AND version.id = NEW.document_version_id
    ) THEN
      RAISE EXCEPTION 'tenant trace source does not exist'
        USING ERRCODE = 'foreign_key_violation';
    END IF;
  ELSIF NOT EXISTS (
    SELECT 1
    FROM app.legal_source_chunks AS chunk
    JOIN app.legal_source_versions AS version
      ON version.id = chunk.legal_source_version_id
    JOIN app.legal_sources AS source
      ON source.id = version.legal_source_id
    WHERE chunk.id = NEW.document_chunk_id
      AND source.id = NEW.document_id
      AND version.id = NEW.document_version_id
      AND version.is_current
      AND source.status = 'active'
  ) THEN
    RAISE EXCEPTION 'legal trace source does not exist'
      USING ERRCODE = 'foreign_key_violation';
  END IF;
  RETURN NEW;
END
$$;

CREATE TRIGGER answer_trace_sources_guard
BEFORE INSERT OR UPDATE ON app.answer_trace_sources
FOR EACH ROW EXECUTE FUNCTION app.validate_answer_trace_source();

REVOKE ALL ON FUNCTION app.validate_retrieval_evidence_source() FROM PUBLIC;
REVOKE ALL ON FUNCTION app.validate_citation_source() FROM PUBLIC;
REVOKE ALL ON FUNCTION app.validate_answer_trace_source() FROM PUBLIC;

COMMIT;
