-- Leitura agregada pelo operador autorizado; nunca executar como health check público.
-- Não contém nomes, IDs de pessoas/condomínios, conteúdo, paths privados ou segredos.
BEGIN ISOLATION LEVEL REPEATABLE READ READ ONLY;
SET LOCAL statement_timeout = '5s';

SELECT
  count(*) FILTER (WHERE status = 'queued') AS queued_jobs,
  count(*) FILTER (WHERE status = 'processing') AS processing_jobs,
  count(*) FILTER (WHERE status = 'failed') AS failed_jobs,
  count(*) FILTER (WHERE status = 'processing' AND lease_expires_at <= now()) AS expired_leases,
  COALESCE(extract(epoch FROM now() - min(created_at) FILTER (WHERE status = 'queued')), 0)::bigint
    AS oldest_queued_seconds,
  count(*) FILTER (WHERE status = 'completed' AND finished_at > now() - interval '10 minutes')
    AS completed_last_ten_minutes
FROM app.processing_jobs;

SELECT processing_status, count(*) AS versions
FROM app.document_version_states GROUP BY processing_status ORDER BY processing_status;

SELECT pg_database_size(current_database()) AS database_bytes,
  (SELECT count(*) FROM pg_stat_activity WHERE datname = current_database()) AS database_connections;

-- Zero divergência é condição de recuperação; não publica conteúdo do original.
SELECT count(*) AS originals_with_hash_or_size_mismatch
FROM app.document_original_contents o
JOIN app.storage_objects s ON s.condominium_id = o.condominium_id AND s.id = o.storage_object_id
WHERE encode(sha256(o.content), 'hex') <> lower(s.content_sha256)
   OR octet_length(o.content) <> s.size_bytes;

COMMIT;
