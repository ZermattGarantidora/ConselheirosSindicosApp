BEGIN;

-- Reforça os privilégios necessários ao fluxo persistente em bancos baselineados.
GRANT SELECT ON app.storage_objects, app.documents, app.document_versions,
  app.document_version_states, app.processing_jobs, app.document_pages, app.document_chunks
  TO app_runtime;

COMMIT;
