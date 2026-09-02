BEGIN;

CREATE TABLE app.storage_objects (
  condominium_id uuid NOT NULL REFERENCES app.condominiums (id) ON DELETE RESTRICT,
  id uuid NOT NULL,
  object_kind text NOT NULL CHECK (object_kind IN ('document_original', 'document_derivative')),
  storage_key text NOT NULL CHECK (storage_key !~* '^https?://'),
  content_sha256 text NOT NULL CHECK (content_sha256 ~ '^[A-Fa-f0-9]{64}$'),
  size_bytes bigint NOT NULL CHECK (size_bytes > 0),
  media_type text NOT NULL,
  created_by_user_id uuid NOT NULL REFERENCES app.users (id) ON DELETE RESTRICT,
  created_at timestamptz NOT NULL DEFAULT now(),
  PRIMARY KEY (condominium_id, id),
  UNIQUE (condominium_id, storage_key)
);

CREATE TABLE app.documents (
  condominium_id uuid NOT NULL REFERENCES app.condominiums (id) ON DELETE RESTRICT,
  id uuid NOT NULL,
  title text NOT NULL CHECK (length(trim(title)) > 0),
  document_type text NOT NULL CHECK (document_type IN ('convention', 'internal_rules', 'meeting_minutes', 'contract', 'other')),
  status text NOT NULL CHECK (status IN ('active', 'archived')),
  created_by_user_id uuid NOT NULL REFERENCES app.users (id) ON DELETE RESTRICT,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  archived_at timestamptz,
  PRIMARY KEY (condominium_id, id),
  CHECK ((status = 'archived') = (archived_at IS NOT NULL))
);

CREATE TABLE app.document_versions (
  condominium_id uuid NOT NULL,
  id uuid NOT NULL,
  document_id uuid NOT NULL,
  version_number integer NOT NULL CHECK (version_number > 0),
  storage_object_id uuid NOT NULL,
  content_sha256 text NOT NULL CHECK (content_sha256 ~ '^[A-Fa-f0-9]{64}$'),
  media_type text NOT NULL CHECK (media_type = 'application/pdf'),
  size_bytes bigint NOT NULL CHECK (size_bytes > 0),
  source_kind text NOT NULL CHECK (source_kind IN ('user_upload', 'administrator_import')),
  source_description text,
  issued_by text,
  uploaded_by_user_id uuid NOT NULL REFERENCES app.users (id) ON DELETE RESTRICT,
  created_at timestamptz NOT NULL DEFAULT now(),
  PRIMARY KEY (condominium_id, id),
  UNIQUE (condominium_id, document_id, version_number),
  FOREIGN KEY (condominium_id, document_id)
    REFERENCES app.documents (condominium_id, id) ON DELETE RESTRICT,
  FOREIGN KEY (condominium_id, storage_object_id)
    REFERENCES app.storage_objects (condominium_id, id) ON DELETE RESTRICT
);

CREATE TABLE app.document_version_states (
  condominium_id uuid NOT NULL,
  document_version_id uuid NOT NULL,
  processing_status text NOT NULL CHECK (processing_status IN ('uploaded', 'processing', 'ready', 'needs_review', 'failed')),
  validity_status text NOT NULL CHECK (validity_status IN ('pending', 'confirmed', 'disputed', 'superseded', 'not_applicable')),
  valid_from timestamptz,
  valid_until timestamptz,
  ocr_quality_score numeric(5,4) CHECK (ocr_quality_score BETWEEN 0 AND 1),
  current_processing_job_id uuid,
  updated_at timestamptz NOT NULL DEFAULT now(),
  PRIMARY KEY (condominium_id, document_version_id),
  FOREIGN KEY (condominium_id, document_version_id)
    REFERENCES app.document_versions (condominium_id, id) ON DELETE RESTRICT,
  CHECK (valid_until IS NULL OR valid_from IS NULL OR valid_until > valid_from)
);

CREATE TABLE app.processing_jobs (
  condominium_id uuid NOT NULL,
  id uuid NOT NULL,
  document_version_id uuid NOT NULL,
  job_type text NOT NULL CHECK (job_type IN ('extract_text', 'ocr', 'chunk', 'embed')),
  status text NOT NULL CHECK (status IN ('queued', 'processing', 'completed', 'failed')),
  attempt_count integer NOT NULL DEFAULT 0 CHECK (attempt_count >= 0),
  max_attempts integer NOT NULL CHECK (max_attempts > 0),
  idempotency_key text NOT NULL,
  available_at timestamptz NOT NULL DEFAULT now(),
  leased_at timestamptz,
  lease_expires_at timestamptz,
  finished_at timestamptz,
  error_code text,
  error_metadata jsonb NOT NULL DEFAULT '{}'::jsonb,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  PRIMARY KEY (condominium_id, id),
  UNIQUE (condominium_id, idempotency_key),
  FOREIGN KEY (condominium_id, document_version_id)
    REFERENCES app.document_versions (condominium_id, id) ON DELETE RESTRICT,
  CHECK (lease_expires_at IS NULL OR leased_at IS NOT NULL)
);

ALTER TABLE app.document_version_states
  ADD CONSTRAINT document_version_states_current_job_fk
  FOREIGN KEY (condominium_id, current_processing_job_id)
  REFERENCES app.processing_jobs (condominium_id, id) ON DELETE RESTRICT;

CREATE TABLE app.document_pages (
  condominium_id uuid NOT NULL,
  id uuid NOT NULL,
  document_version_id uuid NOT NULL,
  page_index integer NOT NULL CHECK (page_index >= 0),
  page_number integer NOT NULL CHECK (page_number >= 1),
  printed_label text,
  extracted_text text NOT NULL,
  extraction_method text NOT NULL CHECK (extraction_method IN ('pdf_text', 'ocr')),
  quality_score numeric(5,4) NOT NULL CHECK (quality_score BETWEEN 0 AND 1),
  content_sha256 text NOT NULL CHECK (content_sha256 ~ '^[A-Fa-f0-9]{64}$'),
  created_at timestamptz NOT NULL DEFAULT now(),
  PRIMARY KEY (condominium_id, id),
  UNIQUE (condominium_id, document_version_id, page_index),
  UNIQUE (condominium_id, document_version_id, page_number),
  UNIQUE (condominium_id, document_version_id, id),
  FOREIGN KEY (condominium_id, document_version_id)
    REFERENCES app.document_versions (condominium_id, id) ON DELETE RESTRICT,
  CHECK (page_number = page_index + 1)
);

CREATE TABLE app.document_chunks (
  condominium_id uuid NOT NULL,
  id uuid NOT NULL,
  document_version_id uuid NOT NULL,
  document_page_id uuid NOT NULL,
  chunk_index integer NOT NULL CHECK (chunk_index >= 0),
  start_offset integer NOT NULL CHECK (start_offset >= 0),
  end_offset integer NOT NULL CHECK (end_offset > start_offset),
  content text NOT NULL CHECK (length(content) > 0),
  content_sha256 text NOT NULL CHECK (content_sha256 ~ '^[A-Fa-f0-9]{64}$'),
  token_count integer NOT NULL CHECK (token_count > 0),
  search_vector tsvector NOT NULL,
  created_at timestamptz NOT NULL DEFAULT now(),
  PRIMARY KEY (condominium_id, id),
  UNIQUE (condominium_id, document_version_id, chunk_index),
  FOREIGN KEY (condominium_id, document_version_id, document_page_id)
    REFERENCES app.document_pages (condominium_id, document_version_id, id) ON DELETE RESTRICT
);

CREATE INDEX document_version_states_by_tenant_and_state
  ON app.document_version_states (condominium_id, processing_status, validity_status);
CREATE INDEX processing_jobs_available_by_tenant
  ON app.processing_jobs (condominium_id, status, available_at);
CREATE INDEX document_chunks_search_vector
  ON app.document_chunks USING gin (search_vector);

ALTER TABLE app.storage_objects ENABLE ROW LEVEL SECURITY;
ALTER TABLE app.storage_objects FORCE ROW LEVEL SECURITY;
ALTER TABLE app.documents ENABLE ROW LEVEL SECURITY;
ALTER TABLE app.documents FORCE ROW LEVEL SECURITY;
ALTER TABLE app.document_versions ENABLE ROW LEVEL SECURITY;
ALTER TABLE app.document_versions FORCE ROW LEVEL SECURITY;
ALTER TABLE app.document_version_states ENABLE ROW LEVEL SECURITY;
ALTER TABLE app.document_version_states FORCE ROW LEVEL SECURITY;
ALTER TABLE app.processing_jobs ENABLE ROW LEVEL SECURITY;
ALTER TABLE app.processing_jobs FORCE ROW LEVEL SECURITY;
ALTER TABLE app.document_pages ENABLE ROW LEVEL SECURITY;
ALTER TABLE app.document_pages FORCE ROW LEVEL SECURITY;
ALTER TABLE app.document_chunks ENABLE ROW LEVEL SECURITY;
ALTER TABLE app.document_chunks FORCE ROW LEVEL SECURITY;

GRANT SELECT ON app.storage_objects, app.documents, app.document_versions, app.document_version_states,
  app.processing_jobs, app.document_pages, app.document_chunks TO app_runtime;

CREATE POLICY storage_objects_authorized_tenant ON app.storage_objects
  FOR SELECT USING (
    condominium_id = app.current_condominium_id()
    AND EXISTS (SELECT 1 FROM app.condominiums WHERE id = storage_objects.condominium_id)
  );
CREATE POLICY documents_authorized_tenant ON app.documents
  FOR SELECT USING (
    condominium_id = app.current_condominium_id()
    AND EXISTS (SELECT 1 FROM app.condominiums WHERE id = documents.condominium_id)
  );
CREATE POLICY document_versions_authorized_tenant ON app.document_versions
  FOR SELECT USING (
    condominium_id = app.current_condominium_id()
    AND EXISTS (SELECT 1 FROM app.condominiums WHERE id = document_versions.condominium_id)
  );
CREATE POLICY document_version_states_authorized_tenant ON app.document_version_states
  FOR SELECT USING (
    condominium_id = app.current_condominium_id()
    AND EXISTS (SELECT 1 FROM app.condominiums WHERE id = document_version_states.condominium_id)
  );
CREATE POLICY processing_jobs_authorized_tenant ON app.processing_jobs
  FOR SELECT USING (
    condominium_id = app.current_condominium_id()
    AND EXISTS (SELECT 1 FROM app.condominiums WHERE id = processing_jobs.condominium_id)
  );
CREATE POLICY document_pages_authorized_tenant ON app.document_pages
  FOR SELECT USING (
    condominium_id = app.current_condominium_id()
    AND EXISTS (SELECT 1 FROM app.condominiums WHERE id = document_pages.condominium_id)
  );
CREATE POLICY document_chunks_authorized_tenant ON app.document_chunks
  FOR SELECT USING (
    condominium_id = app.current_condominium_id()
    AND EXISTS (SELECT 1 FROM app.condominiums WHERE id = document_chunks.condominium_id)
  );

COMMIT;
