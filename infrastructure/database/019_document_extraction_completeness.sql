BEGIN;

ALTER TABLE app.document_version_states
  ADD COLUMN expected_page_count integer,
  ADD COLUMN processed_page_count integer,
  ADD COLUMN searchable_page_count integer,
  ADD COLUMN unreadable_page_numbers integer[] NOT NULL DEFAULT '{}'::integer[],
  ADD COLUMN extraction_completeness numeric(5,4),
  ADD COLUMN extraction_method text;

ALTER TABLE app.document_version_states
  ADD CONSTRAINT document_version_states_page_counts_valid CHECK (
    expected_page_count IS NULL OR expected_page_count BETWEEN 1 AND 500
  ),
  ADD CONSTRAINT document_version_states_processed_page_count_valid CHECK (
    processed_page_count IS NULL
    OR (expected_page_count IS NOT NULL AND processed_page_count BETWEEN 0 AND expected_page_count)
  ),
  ADD CONSTRAINT document_version_states_searchable_page_count_valid CHECK (
    searchable_page_count IS NULL
    OR (processed_page_count IS NOT NULL AND searchable_page_count BETWEEN 0 AND processed_page_count)
  ),
  ADD CONSTRAINT document_version_states_unreadable_page_numbers_valid CHECK (
    cardinality(unreadable_page_numbers) <= COALESCE(expected_page_count, 0)
  ),
  ADD CONSTRAINT document_version_states_extraction_completeness_valid CHECK (
    extraction_completeness IS NULL OR extraction_completeness BETWEEN 0 AND 1
  ),
  ADD CONSTRAINT document_version_states_extraction_method_valid CHECK (
    extraction_method IS NULL OR extraction_method IN ('pdf_text', 'ocr')
  ),
  ADD CONSTRAINT document_version_states_ready_only_when_complete CHECK (
    processing_status <> 'ready'
    OR (
      expected_page_count = processed_page_count
      AND expected_page_count = searchable_page_count
      AND cardinality(unreadable_page_numbers) = 0
      AND extraction_completeness = 1
    )
  );

COMMIT;
