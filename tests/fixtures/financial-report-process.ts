/** Processo recuperador novo: somente PostgreSQL local sintético e nenhum modelo injetado. */
import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import { createHash } from "node:crypto";
import { Pool } from "pg";
import { localRecoveryConnection } from "../../scripts/pilot-recovery.js";
import { createApi } from "../../apps/api/app/create-api.js";
import { createPostgresMembershipRepository } from "../../apps/api/identity/postgres-identity-repository.js";
import { createPostgresChatRepository } from "../../apps/api/chats/postgres-chat-repository.js";
import { createPostgresConversationStore } from "../../apps/api/answers/postgres-conversation-store.js";
import { createPostgresDocumentUploadRepository } from "../../apps/api/documents/postgres-document-upload-repository.js";
import { createPostgresPrivateDocumentStorage } from "../../apps/api/documents/postgres-private-document-storage.js";
import { createPostgresDocumentSourceReader } from "../../apps/api/documents/document-source.js";
import { createPostgresDocumentAnalysisReader } from "../../apps/api/analysis/document-analysis-reader.js";
let phase = "guards";
try {
  const config = JSON.parse(await readFile(process.env.FINANCIAL_PROCESS_CONFIG!, "utf8")) as {
    purpose: "source" | "restore";
    tenant: string;
    user: string;
    other: string;
    foreign: string;
    chat: string;
    id: string;
    version: string;
    request: { documentVersionIds: string[]; currentDocumentKey: string };
    draftHash: string;
    pdfHash: string;
    sourceHash: string;
    mode: "ready" | "changed" | "revoked";
  };
  const url = localRecoveryConnection(
    process.env.FINANCIAL_PROCESS_DATABASE_URL,
    config.purpose,
    process.env.FINANCIAL_PROCESS_CONFIRMATION
  );
  const pool = new Pool({ connectionString: url.toString(), max: 4 });
  const app = createApi({
    membershipRepository: createPostgresMembershipRepository(pool),
    chatRepository: createPostgresChatRepository(pool),
    conversationStore: createPostgresConversationStore(pool),
    documentCatalogRepository: createPostgresDocumentUploadRepository(pool),
    documentUploadRepository: createPostgresDocumentUploadRepository(pool),
    documentStorage: createPostgresPrivateDocumentStorage(pool),
    documentSourceReader: createPostgresDocumentSourceReader(pool),
    documentAnalysisReader: createPostgresDocumentAnalysisReader(pool)
  });
  try {
    const headers = { "x-development-user-id": config.user },
      base = `/v1/condominiums/${config.tenant}/chats/${config.chat}`,
      path = `${base}/document-drafts/${config.id}`,
      report = `${base}/financial-reports/${config.id}`;
    phase = config.mode;
    if (config.mode !== "ready") {
      const expected = config.mode === "revoked" ? 403 : 409;
      for (const url of [path, report, `${path}/pdf?hash=${config.draftHash}`])
        assert.equal((await app.inject({ method: "GET", url, headers })).statusCode, expected);
      assert.equal(
        (await app.inject({ method: "POST", url: report, headers, payload: config.request }))
          .statusCode,
        expected
      );
    } else {
      const recovered = await app.inject({ method: "GET", url: report, headers });
      assert.equal(recovered.statusCode, 200, recovered.body);
      assert.equal(recovered.json().draft.hash, config.draftHash);
      assert.equal(recovered.json().draft.status, "confirmed");
      assert.match(recovered.json().draft.text, /Edição humana persistente/);
      assert.equal(
        (await app.inject({ method: "POST", url: report, headers, payload: config.request })).json()
          .draft.hash,
        config.draftHash
      );
      const file = await app.inject({
        method: "GET",
        url: `${path}/pdf?hash=${config.draftHash}`,
        headers
      });
      assert.equal(file.statusCode, 200);
      assert.equal(createHash("sha256").update(file.rawPayload).digest("hex"), config.pdfHash);
      const original = await app.inject({
        method: "GET",
        url: `/v1/condominiums/${config.tenant}/documents/${config.version}/file`,
        headers
      });
      assert.equal(original.statusCode, 200);
      assert.equal(
        createHash("sha256").update(original.rawPayload).digest("hex"),
        config.sourceHash
      );
      assert.equal(
        (
          await app.inject({
            method: "GET",
            url: path,
            headers: { "x-development-user-id": config.other }
          })
        ).statusCode,
        404
      );
      assert.equal(
        (
          await app.inject({
            method: "GET",
            url: path.replace(config.tenant, config.foreign),
            headers
          })
        ).statusCode,
        404
      );
      assert.equal(
        (await app.inject({ method: "GET", url: `${base}/financial-reports`, headers })).json()
          .enabled,
        false
      );
    }
  } finally {
    await app.close();
    await pool.end();
  }
  console.log(
    JSON.stringify({
      passed: true,
      phase,
      processId: process.pid,
      modelConfigured: false,
      providerCalls: 0
    })
  );
} catch {
  console.error(JSON.stringify({ passed: false, phase, providerCalls: 0 }));
  process.exitCode = 1;
}
