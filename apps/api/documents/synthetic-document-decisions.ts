import type { PoolClient } from "pg";
import type { SyntheticDocumentDecision } from "../security/synthetic-data-controls.js";
import { DocumentRecoveryError } from "./synthetic-document-recovery-journal.js";

/** Callback for the authenticated maintenance plan. No BEGIN/COMMIT, connection or environment lookup. */
export function createSyntheticDocumentDecisionApplier(options: {
  confirmation: "synthetic-local-only";
  condominiumIds: readonly string[];
  documentVersionIds: readonly string[];
  history: "preserve-as-historical";
}) {
  const policy = structuredClone(options);
  return async (client: PoolClient, decision: SyntheticDocumentDecision): Promise<void> => {
    if (
      policy.confirmation !== "synthetic-local-only" ||
      policy.history !== "preserve-as-historical" ||
      !decision.condominiumId ||
      !policy.condominiumIds.includes(decision.condominiumId) ||
      !["purge_document_version", "purge_condominium_content"].includes(decision.action) ||
      (decision.action === "purge_document_version" &&
        (!decision.documentVersionId ||
          !policy.documentVersionIds.includes(decision.documentVersionId)))
    )
      throw new DocumentRecoveryError();
    const marker = (
      await client.query(
        "SELECT current_database() AS name,purpose,data_policy FROM ops_control.environment"
      )
    ).rows;
    if (
      marker.length !== 1 ||
      !/^alvitra_ops_(source|restore)_[a-f0-9]{32}$/u.test(marker[0].name) ||
      !["source", "restore"].includes(marker[0].purpose) ||
      marker[0].data_policy !== "synthetic-local-only"
    )
      throw new DocumentRecoveryError();
    const versions = await client.query<{
      id: string;
      document_id: string;
      storage_object_id: string;
    }>(
      `SELECT id,document_id,storage_object_id FROM app.document_versions WHERE condominium_id=$1
       AND ($2::uuid IS NULL OR id=$2) ORDER BY id FOR UPDATE`,
      [
        decision.condominiumId,
        decision.action === "purge_document_version" ? decision.documentVersionId : null
      ]
    );
    if (versions.rows.some((row) => !policy.documentVersionIds.includes(row.id)))
      throw new DocumentRecoveryError();
    const ids = versions.rows.map((row) => row.id),
      documents = [...new Set(versions.rows.map((row) => row.document_id))],
      objects = versions.rows.map((row) => row.storage_object_id);
    await client.query("SELECT singleton FROM app.hosted_call_control WHERE singleton FOR UPDATE");
    await client.query(
      `UPDATE app.hosted_call_records SET record=(record-'resultJson'-'resultSha256') ||
      jsonb_build_object('invalidatedFrom',record->>'status','status','invalidated','commitment',CASE WHEN record->>'status'='cancelled' THEN 0 ELSE (record->>'commitment')::bigint END)
      WHERE condominium_id=$1 AND record->>'status'<>'invalidated' AND
      ($2::text='purge_condominium_content' OR record->'documentVersionIds' ? $3::text)`,
      [decision.condominiumId, decision.action, decision.documentVersionId ?? ""]
    );
    if (decision.action === "purge_condominium_content")
      await client.query(
        `DELETE FROM app.documents d WHERE condominium_id=$1
      AND NOT EXISTS(SELECT 1 FROM app.document_versions v WHERE v.condominium_id=d.condominium_id AND v.document_id=d.id)`,
        [decision.condominiumId]
      );
    const purgeOrphans = async () => {
      if (decision.action !== "purge_condominium_content") return;
      // Interrupted uploads can leave bytes before storage/version registration. A whole-tenant
      // content decision covers these too; an individual-version decision never broadens its scope.
      await client.query("DELETE FROM app.document_original_contents WHERE condominium_id=$1", [
        decision.condominiumId
      ]);
      await client.query("DELETE FROM app.storage_objects WHERE condominium_id=$1", [
        decision.condominiumId
      ]);
    };
    if (!ids.length) {
      await purgeOrphans();
      return;
    }
    const parameters = [decision.condominiumId, ids];
    await client.query(
      "UPDATE app.citations SET source_removed_at=COALESCE(source_removed_at,clock_timestamp()) WHERE condominium_id=$1 AND document_version_id=ANY($2::uuid[]) AND source_scope='condominium'",
      parameters
    );
    await client.query(
      "DELETE FROM app.answer_trace_sources WHERE condominium_id=$1 AND document_version_id=ANY($2::uuid[]) AND source_scope='condominium'",
      parameters
    );
    await client.query(
      `DELETE FROM app.model_invocation_evidence WHERE condominium_id=$1
      AND retrieval_evidence_id IN (SELECT id FROM app.document_chunks WHERE condominium_id=$1 AND document_version_id=ANY($2::uuid[]))`,
      parameters
    );
    await client.query(
      `DELETE FROM app.retrieval_evidence WHERE condominium_id=$1 AND source_scope='condominium'
      AND document_chunk_id IN (SELECT id FROM app.document_chunks WHERE condominium_id=$1 AND document_version_id=ANY($2::uuid[]))`,
      parameters
    );
    await client.query(
      `DELETE FROM app.document_chunk_embeddings WHERE condominium_id=$1 AND document_chunk_id IN
      (SELECT id FROM app.document_chunks WHERE condominium_id=$1 AND document_version_id=ANY($2::uuid[]))`,
      parameters
    );
    await client.query(
      "DELETE FROM app.document_chunks WHERE condominium_id=$1 AND document_version_id=ANY($2::uuid[])",
      parameters
    );
    await client.query(
      "DELETE FROM app.document_pages WHERE condominium_id=$1 AND document_version_id=ANY($2::uuid[])",
      parameters
    );
    await client.query(
      "UPDATE app.document_version_states SET current_processing_job_id=NULL WHERE condominium_id=$1 AND document_version_id=ANY($2::uuid[])",
      parameters
    );
    await client.query(
      "DELETE FROM app.processing_jobs WHERE condominium_id=$1 AND document_version_id=ANY($2::uuid[])",
      parameters
    );
    await client.query(
      "DELETE FROM app.document_version_states WHERE condominium_id=$1 AND document_version_id=ANY($2::uuid[])",
      parameters
    );
    // Migration 039 invalidates the result atomically BEFORE deleting each version; daily cost stays.
    await client.query(
      "DELETE FROM app.document_versions WHERE condominium_id=$1 AND id=ANY($2::uuid[])",
      parameters
    );
    await client.query(
      "DELETE FROM app.document_original_contents WHERE condominium_id=$1 AND storage_object_id=ANY($2::uuid[])",
      [decision.condominiumId, objects]
    );
    await client.query(
      "DELETE FROM app.storage_objects WHERE condominium_id=$1 AND id=ANY($2::uuid[])",
      [decision.condominiumId, objects]
    );
    await client.query(
      `DELETE FROM app.documents d WHERE condominium_id=$1 AND id=ANY($2::uuid[])
      AND NOT EXISTS(SELECT 1 FROM app.document_versions v WHERE v.condominium_id=d.condominium_id AND v.document_id=d.id)`,
      [decision.condominiumId, documents]
    );
    await purgeOrphans();
  };
}
