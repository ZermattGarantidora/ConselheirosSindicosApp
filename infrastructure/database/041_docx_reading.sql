BEGIN;

ALTER TABLE app.storage_objects DROP CONSTRAINT storage_objects_media_type_supported,
  ADD CONSTRAINT storage_objects_media_type_supported CHECK (media_type IN ('application/pdf', 'image/jpeg', 'image/png', 'application/vnd.openxmlformats-officedocument.wordprocessingml.document'));
ALTER TABLE app.document_versions DROP CONSTRAINT document_versions_media_type_supported,
  ADD CONSTRAINT document_versions_media_type_supported CHECK (media_type IN ('application/pdf', 'image/jpeg', 'image/png', 'application/vnd.openxmlformats-officedocument.wordprocessingml.document'));
ALTER TABLE app.document_pages DROP CONSTRAINT document_pages_extraction_method_supported,
  ADD CONSTRAINT document_pages_extraction_method_supported CHECK (extraction_method IN ('pdf_text', 'ocr', 'image_vision', 'docx_text'));
ALTER TABLE app.document_version_states DROP CONSTRAINT document_version_states_extraction_method_valid,
  ADD CONSTRAINT document_version_states_extraction_method_valid CHECK (extraction_method IS NULL OR extraction_method IN ('pdf_text', 'ocr', 'image_vision', 'docx_text'));

COMMENT ON CONSTRAINT document_pages_extraction_method_supported ON app.document_pages IS
  'docx_text uses numbered Alvitra reading blocks, not Word page numbers. Unsupported content remains needs_review.';
COMMIT;
