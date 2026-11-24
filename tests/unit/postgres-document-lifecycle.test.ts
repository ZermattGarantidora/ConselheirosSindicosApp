import { createHash } from "node:crypto";
import type { PoolClient } from "pg";
import { expect, it, vi } from "vitest";
import {
  createPostgresDocumentExporter,
  reapplyDocumentPurges
} from "../../apps/api/documents/postgres-document-lifecycle.js";
import { createSyntheticDocumentDecisionApplier } from "../../apps/api/documents/synthetic-document-decisions.js";
import { createCondominiumId } from "../../apps/api/core/condominium-scope.js";
import { createUserId } from "../../apps/api/identity/authorized-condominium-context.js";
import type { AuthorizedCondominiumContext } from "../../apps/api/identity/authorized-condominium-context.js";
const tenant = "11111111-1111-4111-8111-111111111111",
  user = "22222222-2222-4222-8222-222222222222",
  document = "33333333-3333-4333-8333-333333333333",
  version = "44444444-4444-4444-8444-444444444444",
  chatId = "55555555-5555-4555-8555-555555555555";
const context: AuthorizedCondominiumContext = {
  condominiumId: createCondominiumId(tenant),
  userId: createUserId(user),
  membershipRevision: "synthetic",
  roleKey: "manager",
  permissions: ["document:read", "document:upload"]
};
const scope = { context, documentId: document, chatId };
function fixture(mode = "valid") {
  const content = Buffer.from("FICTICIO-ORIGINAL"),
    sha = createHash("sha256").update(content).digest("hex");
  const query = vi.fn(async (sql: string) => {
    let rows: unknown[] = [];
    if (sql.includes("SELECT id FROM app.chats"))
      rows = mode === "foreign-chat" ? [] : [{ id: chatId }];
    else if (sql.includes("SELECT id,title"))
      rows = mode === "removed" ? [] : [{ id: document, title: "FICTICIO", status: "active" }];
    else if (sql.includes("AS originals"))
      rows = [
        {
          total: mode === "oversize" ? String(33 * 1024 * 1024) : String(content.length),
          versions: "1",
          originals: mode === "missing-original" ? "0" : "1"
        }
      ];
    else if (sql.includes("SELECT v.id"))
      rows =
        mode === "empty"
          ? []
          : [
              {
                id: version,
                version_number: 1,
                content,
                content_sha256: mode === "checksum" ? "a".repeat(64) : sha,
                size_bytes: content.length,
                media_type: "image/png"
              }
            ];
    else if (sql.includes("sum(bytes)"))
      rows = [{ total: mode === "large-history" ? String(17 * 1024 * 1024) : "20" }];
    else if (sql.includes("SELECT sequence"))
      rows = [
        {
          sequence: 1,
          created_at: "2026-11-11T00:00:00.000Z",
          messages: [
            {
              role: "user",
              kind: "question_answer",
              text: "FICTICIO-LITERAL",
              hidden: "FICTICIO-SECRET"
            }
          ]
        }
      ];
    else if (sql.includes("ops_control.environment"))
      rows = [
        {
          name: mode === "wrong-target" ? "production" : "alvitra_ops_source_" + "a".repeat(32),
          purpose: "source",
          data_policy: "synthetic-local-only"
        }
      ];
    else if (sql.includes("SELECT id,document_id"))
      rows =
        mode === "absent-version"
          ? []
          : [{ id: version, document_id: document, storage_object_id: chatId }];
    else if (sql.includes("SELECT app.purge_expired")) rows = [{ purged: true }];
    if (mode === "db-failure" && sql.startsWith("DELETE FROM app.document_pages"))
      throw new Error("FICTICIO-SQL-FAILURE");
    return { rows, rowCount: rows.length };
  });
  const release = vi.fn(),
    client = { query, release } as unknown as PoolClient;
  const pool = { connect: async () => client };
  return {
    query,
    release,
    client,
    pool,
    content,
    exporter: createPostgresDocumentExporter({
      pool,
      authorize: async () => true,
      assertRecovered: async () => {}
    })
  };
}
it("AC-7120: exporta bytes/checksum e mensagens literais usando escopo RLS e campos limitados", async () => {
  const f = fixture(),
    result = await f.exporter(scope),
    data = JSON.parse(result.payload);
  expect(Buffer.from(data.versions[0].contentBase64, "base64")).toEqual(f.content);
  expect(result.sha256).toBe(createHash("sha256").update(result.payload).digest("hex"));
  expect(result.payload).toContain("FICTICIO-LITERAL");
  expect(result.payload).not.toContain("FICTICIO-SECRET");
  expect(f.query.mock.calls.some(([sql]) => sql === "SET LOCAL ROLE app_runtime")).toBe(true);
  expect(f.release).toHaveBeenCalledOnce();
});
it.each([
  "foreign-chat",
  "removed",
  "oversize",
  "missing-original",
  "empty",
  "checksum",
  "large-history"
])("AC-7120: %s não entrega exportação parcial", async (mode) => {
  const f = fixture(mode);
  await expect(f.exporter(scope)).rejects.toThrow();
  expect(f.query.mock.calls.some(([sql]) => sql === "ROLLBACK")).toBe(true);
  expect(f.release).toHaveBeenCalledOnce();
});
it("AC-7120: autorização/recovery ausentes ou revogados não entregam bytes", async () => {
  const f = fixture();
  await expect(
    createPostgresDocumentExporter({ pool: f.pool, assertRecovered: async () => {} })(scope)
  ).rejects.toThrow();
  expect(f.query).not.toHaveBeenCalled();
  await expect(
    createPostgresDocumentExporter({
      pool: f.pool,
      authorize: async () => true,
      assertRecovered: async () => {
        throw new Error();
      }
    })(scope)
  ).rejects.toThrow();
  expect(f.query).not.toHaveBeenCalled();
  let decisions = 0;
  await expect(
    createPostgresDocumentExporter({
      pool: f.pool,
      authorize: async () => ++decisions === 1,
      assertRecovered: async () => {}
    })(scope)
  ).rejects.toThrow();
  expect(decisions).toBe(2);
  await expect(
    f.exporter({ ...scope, context: { ...context, permissions: [] } })
  ).rejects.toThrow();
});
const decision = {
  id: chatId,
  action: "purge_document_version" as const,
  condominiumId: tenant,
  documentVersionId: version
};
const apply = createSyntheticDocumentDecisionApplier({
  confirmation: "synthetic-local-only",
  condominiumIds: [tenant],
  documentVersionIds: [version],
  history: "preserve-as-historical"
});
it.each(["valid", "absent-version"])(
  "AC-7126: callback transacional %s invalida resultado sem COMMIT, histórico ou consumo apagados",
  async (mode) => {
    const f = fixture(mode);
    await apply(f.client, decision);
    const statements = f.query.mock.calls.map(([sql]) => sql).join("\n");
    expect(statements).toContain("UPDATE app.hosted_call_records");
    expect(statements).not.toMatch(
      /BEGIN|COMMIT|ROLLBACK|DELETE FROM app\.(?:operation_budget|hosted_call|conversation_entries|questions|answers|citations)/u
    );
    if (mode === "valid") expect(statements).toContain("DELETE FROM app.document_versions");
  }
);
it("AC-7126: tenant/versão/marker divergente e falha SQL negam sem assumir transação", async () => {
  const f = fixture();
  await expect(apply(f.client, { ...decision, condominiumId: user })).rejects.toThrow();
  expect(f.query).not.toHaveBeenCalled();
  await expect(apply(f.client, { ...decision, documentVersionId: user })).rejects.toThrow();
  expect(f.query).not.toHaveBeenCalled();
  await expect(apply(fixture("wrong-target").client, decision)).rejects.toThrow();
  await expect(
    createSyntheticDocumentDecisionApplier({
      confirmation: "synthetic-local-only",
      condominiumIds: [tenant],
      documentVersionIds: [],
      history: "preserve-as-historical"
    })(f.client, { id: chatId, action: "purge_condominium_content", condominiumId: tenant })
  ).rejects.toThrow();
  await expect(apply(fixture("db-failure").client, decision)).rejects.toThrow(
    "FICTICIO-SQL-FAILURE"
  );
});
it("AC-7122: reaplicação negada por padrão e divergência de versões não confirma purga", async () => {
  const f = fixture(),
    journal = {
      read: vi.fn(async () => ({
        version: 1 as const,
        journalId: chatId,
        purges: [
          {
            condominiumId: tenant,
            documentId: document,
            documentVersionIds: [version],
            archivedAt: "2026-01-01T00:00:00.000Z"
          }
        ],
        calls: []
      })),
      initialize: vi.fn(),
      recordPurge: vi.fn(),
      recordDispatch: vi.fn(),
      recordCompletion: vi.fn()
    };
  const ledger = {
    reserve: vi.fn(),
    dispatch: vi.fn(),
    complete: vi.fn(),
    uncertain: vi.fn(),
    cancel: vi.fn(),
    invalidateDocumentVersion: vi.fn(async () => 1)
  };
  await expect(reapplyDocumentPurges({ pool: f.pool, journal, ledger })).rejects.toThrow();
  expect(journal.read).not.toHaveBeenCalled();
  await expect(
    reapplyDocumentPurges({ pool: f.pool, journal, ledger, authorizeQuarantine: async () => true })
  ).resolves.toBe(1);
  expect(ledger.invalidateDocumentVersion).toHaveBeenCalledWith(tenant, version);
});
