import { randomUUID } from "node:crypto";
import { mkdtemp, readFile, rm, writeFile } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { afterEach, describe, expect, it, vi } from "vitest";
import {
  createSyntheticDocumentRecoveryJournal,
  DocumentRecoveryError,
  recoveryDigest
} from "../../apps/api/documents/synthetic-document-recovery-journal.js";
import {
  createDocumentRecoveryGuard,
  createRecoveryGuardedHostedControls,
  reconcileKnownDocumentResult
} from "../../apps/api/documents/document-recovery-controls.js";
import { createSyntheticFileHostedCallLedger } from "../../apps/api/documents/synthetic-file-hosted-call-ledger.js";
import {
  createHostedDocumentExecutor,
  hostedDocumentRequestHash,
  hostedDocumentDestination,
  type HostedDocumentTransferRequest
} from "../../apps/api/documents/hosted-document-execution.js";
import { hostedCallResultHash } from "../../apps/api/documents/hosted-call-ledger.js";
import { createDocumentPurgeObserver } from "../../apps/api/documents/postgres-document-lifecycle.js";

const directories: string[] = [];
afterEach(async () => {
  for (const directory of directories.splice(0))
    await rm(directory, { recursive: true, force: true });
});
const tenant = "11111111-1111-4111-8111-111111111111",
  version = "22222222-2222-4222-8222-222222222222",
  document = "33333333-3333-4333-8333-333333333333";
const request: HostedDocumentTransferRequest = {
  purpose: "photo_ocr",
  destination: hostedDocumentDestination,
  model: "synthetic",
  condominiumId: tenant,
  documentVersions: [{ id: version, contentKind: "original", contentSha256: "a".repeat(64) }],
  payloadSha256: "b".repeat(64),
  inputBytes: 100,
  pageCount: 1,
  maximumOutputTokens: 100
};
const key = {
  condominiumId: tenant,
  requestHash: hostedDocumentRequestHash(request),
  policyRevision: "synthetic",
  documentVersionIds: [version]
};
const budget = {
  currency: "USD" as const,
  tariffVersion: "synthetic",
  maximumCostMicrounits: 10,
  tenantDailyLimitMicrounits: 100,
  globalDailyLimitMicrounits: 100
};
const purge = {
  condominiumId: tenant,
  documentId: document,
  documentVersionIds: [version],
  archivedAt: "2026-01-01T00:00:00.000Z"
};
async function fixture() {
  const directory = await mkdtemp(join(tmpdir(), "alvitra-document-recovery-"));
  directories.push(directory);
  const journalId = randomUUID(),
    options = {
      directory: join(directory, "outside-dump"),
      journalId,
      confirmation: "synthetic-only" as const
    };
  const journal = createSyntheticDocumentRecoveryJournal(options);
  const ledger = createSyntheticFileHostedCallLedger({
    directory: join(directory, "ledger"),
    confirmation: "synthetic-only"
  });
  return {
    directory,
    journal,
    ledger,
    reopen: () => createSyntheticDocumentRecoveryJournal(options)
  };
}
describe("AC-7121–7123 — journal externo, quarentena e reconciliação sem transporte", () => {
  it("ausente não é vazio; inicialização duplicada não apaga decisões", async () => {
    const f = await fixture();
    await expect(f.journal.read()).rejects.toBeInstanceOf(DocumentRecoveryError);
    await f.journal.initialize();
    await f.journal.recordPurge(purge);
    await expect(f.journal.initialize()).rejects.toBeInstanceOf(DocumentRecoveryError);
    expect((await f.reopen().read()).purges).toEqual([purge]);
    await f.journal.recordPurge(purge);
    expect((await f.journal.read()).purges).toHaveLength(1);
    await expect(
      f.journal.recordPurge({ ...purge, archivedAt: "2026-02-01T00:00:00.000Z" })
    ).rejects.toBeInstanceOf(DocumentRecoveryError);
  });
  it("corrupção, outro journal e produção são negados", async () => {
    const f = await fixture();
    await f.journal.initialize();
    await writeFile(join(f.directory, "outside-dump", "recovery.json"), "{broken");
    await expect(f.reopen().read()).rejects.toBeInstanceOf(DocumentRecoveryError);
    expect(() =>
      createSyntheticDocumentRecoveryJournal({
        directory: f.directory,
        journalId: randomUUID(),
        confirmation: "synthetic-only",
        environment: { NODE_ENV: "production" }
      })
    ).toThrow(DocumentRecoveryError);
  });
  it("lock conserva decisões concorrentes e rejeita formato/limites inválidos", async () => {
    const f = await fixture();
    await f.journal.initialize();
    await Promise.all(
      Array.from({ length: 8 }, (_, i) =>
        f.reopen().recordPurge({
          ...purge,
          documentId: `00000000-0000-4000-8000-${String(i).padStart(12, "0")}`
        })
      )
    );
    expect((await f.journal.read()).purges).toHaveLength(8);
    await expect(
      f.journal.recordPurge({ ...purge, documentVersionIds: [] })
    ).rejects.toBeInstanceOf(DocumentRecoveryError);
    await writeFile(
      join(f.directory, "outside-dump", "recovery.json"),
      " ".repeat(8 * 1024 * 1024 + 1)
    );
    await expect(f.journal.read()).rejects.toBeInstanceOf(DocumentRecoveryError);
  });
  it("nega sem verificador, em restore divergente, por versão purgada e preserva outro tenant", async () => {
    const f = await fixture();
    await f.journal.initialize();
    await expect(createDocumentRecoveryGuard({ journal: f.journal })()).rejects.toBeInstanceOf(
      DocumentRecoveryError
    );
    let recovered = false;
    const guard = createDocumentRecoveryGuard({
      journal: f.journal,
      verifyRecoveredState: async () => recovered
    });
    await expect(guard()).rejects.toBeInstanceOf(DocumentRecoveryError);
    recovered = true;
    await guard();
    await f.journal.recordPurge(purge);
    await expect(
      guard({ condominiumId: tenant, documentVersionIds: [version] })
    ).rejects.toBeInstanceOf(DocumentRecoveryError);
    await expect(guard({ condominiumId: tenant, documentId: document })).rejects.toBeInstanceOf(
      DocumentRecoveryError
    );
    await guard({ condominiumId: version, documentVersionIds: [version] });
  });
  it("intenção precede transporte; reinício recupera sem nova chamada, compromisso ou dados no journal", async () => {
    const f = await fixture();
    await f.journal.initialize();
    const controls = () =>
      createRecoveryGuardedHostedControls({
        journal: f.reopen(),
        verifyRecoveredState: async () => true,
        authorize: async (r) => ({
          allowed: true,
          requestHash: hostedDocumentRequestHash(r),
          policyRevision: "synthetic"
        }),
        callControl: { ledger: f.ledger, budget: () => budget }
      });
    const transport = vi.fn(async () => {
      expect((await f.journal.read()).calls).toHaveLength(1);
      return { text: "FICTICIO-CONTEUDO-PRIVADO" };
    });
    await expect(
      createHostedDocumentExecutor(controls()).execute(request, transport)
    ).resolves.toEqual({ text: "FICTICIO-CONTEUDO-PRIVADO" });
    await expect(
      createHostedDocumentExecutor(controls()).execute(request, transport)
    ).resolves.toEqual({ text: "FICTICIO-CONTEUDO-PRIVADO" });
    expect(transport).toHaveBeenCalledOnce();
    const content = await readFile(join(f.directory, "outside-dump", "recovery.json"), "utf8");
    expect(content).not.toContain("FICTICIO-CONTEUDO-PRIVADO");
    expect((await f.journal.read()).calls[0]?.resultSha256).toBe(
      hostedCallResultHash(JSON.stringify({ text: "FICTICIO-CONTEUDO-PRIVADO" }))
    );
  });
  it("falha do journal antes do envio não alcança transporte; verificador pode negar globalmente", async () => {
    const f = await fixture();
    await f.journal.initialize();
    const transport = vi.fn(async () => "never");
    const controls = createRecoveryGuardedHostedControls({
      journal: {
        ...f.journal,
        recordDispatch: async () => {
          throw new Error();
        }
      },
      verifyRecoveredState: async () => true,
      authorize: async (r) => ({
        allowed: true,
        requestHash: hostedDocumentRequestHash(r),
        policyRevision: "synthetic"
      }),
      callControl: { ledger: f.ledger, budget: () => budget }
    });
    await expect(
      createHostedDocumentExecutor(controls).execute(request, transport)
    ).rejects.toThrow();
    expect(transport).not.toHaveBeenCalled();
    const denied = createRecoveryGuardedHostedControls({ ...controls, journal: f.journal });
    expect(await denied.authorize(request)).toEqual({ allowed: false });
  });
  it("falha no banco depois da decisão conserva tombstone e invalidação sem devolver gasto", async () => {
    const f = await fixture();
    await f.journal.initialize();
    const reserved = await f.ledger.reserve(key, budget);
    if (reserved.status !== "reserved") throw new Error();
    await f.ledger.dispatch(key, reserved.owner);
    await f.ledger.complete(key, reserved.owner, { text: "FICTICIO" });
    await createDocumentPurgeObserver(f.journal, f.ledger)(purge);
    // A transaction can now fail: the external decision remains and the old result cannot return.
    expect((await f.reopen().read()).purges).toEqual([purge]);
    await expect(f.ledger.reserve(key, budget)).rejects.toMatchObject({ code: "call_invalidated" });
    const state = JSON.parse(
      await readFile(join(f.directory, "ledger", "synthetic-calls.json"), "utf8")
    );
    expect(state.daily[0].committed).toBe(10);
    expect(state.calls[0].resultJson).toBeUndefined();
  });
  it.each(["absent", "policy", "owner", "checksum", "invalid"])(
    "prova %s mantém unknown e não chama provedor",
    async (variant) => {
      const f = await fixture();
      const reserved = await f.ledger.reserve(key, budget);
      if (reserved.status !== "reserved") throw new Error();
      await f.ledger.dispatch(key, reserved.owner);
      await f.ledger.uncertain(key, reserved.owner);
      const value = { text: "FICTICIO" };
      await expect(
        reconcileKnownDocumentResult({
          ledger: f.ledger,
          key,
          owner: reserved.owner,
          value,
          validateResult: () => variant !== "invalid",
          authorizeProof:
            variant === "absent"
              ? undefined
              : async (candidate) =>
                  candidate.key.policyRevision ===
                    (variant === "policy" ? "other" : key.policyRevision) &&
                  candidate.ownerSha256 ===
                    recoveryDigest(variant === "owner" ? "other" : reserved.owner) &&
                  candidate.resultSha256 ===
                    hostedCallResultHash(JSON.stringify(variant === "checksum" ? {} : value))
        })
      ).rejects.toBeInstanceOf(DocumentRecoveryError);
      await expect(f.ledger.reserve(key, budget)).rejects.toMatchObject({ code: "call_uncertain" });
    }
  );
  it("prova privada exata completa somente resultado conhecido sem novo compromisso", async () => {
    const f = await fixture();
    const reserved = await f.ledger.reserve(key, budget);
    if (reserved.status !== "reserved") throw new Error();
    await f.ledger.dispatch(key, reserved.owner);
    await f.ledger.uncertain(key, reserved.owner);
    await reconcileKnownDocumentResult({
      ledger: f.ledger,
      key,
      owner: reserved.owner,
      value: { text: "FICTICIO" },
      validateResult: (v) => !!v,
      authorizeProof: async (candidate) =>
        candidate.key.requestHash === key.requestHash &&
        candidate.key.policyRevision === key.policyRevision &&
        candidate.ownerSha256 === recoveryDigest(reserved.owner) &&
        candidate.resultSha256 === hostedCallResultHash('{"text":"FICTICIO"}')
    });
    expect(await f.ledger.reserve(key, budget)).toEqual({
      status: "completed",
      value: { text: "FICTICIO" }
    });
    const state = JSON.parse(
      await readFile(join(f.directory, "ledger", "synthetic-calls.json"), "utf8")
    );
    expect(state.daily[0].committed).toBe(10);
  });
});
