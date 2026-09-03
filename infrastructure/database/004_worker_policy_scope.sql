BEGIN;

-- As policies genéricas pertencem ao runtime. O worker possui políticas
-- próprias e não deve avaliar a árvore de autorização do usuário ao
-- reivindicar jobs ou carregar conteúdo já escopado pelo tenant.
ALTER POLICY storage_objects_authorized_tenant ON app.storage_objects TO app_runtime;
ALTER POLICY documents_authorized_tenant ON app.documents TO app_runtime;
ALTER POLICY document_versions_authorized_tenant ON app.document_versions TO app_runtime;
ALTER POLICY document_version_states_authorized_tenant ON app.document_version_states TO app_runtime;
ALTER POLICY processing_jobs_authorized_tenant ON app.processing_jobs TO app_runtime;
ALTER POLICY document_pages_authorized_tenant ON app.document_pages TO app_runtime;
ALTER POLICY document_chunks_authorized_tenant ON app.document_chunks TO app_runtime;

COMMIT;
