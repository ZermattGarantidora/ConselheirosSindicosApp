import { mkdtemp, readFile, rm, writeFile } from "node:fs/promises";
import { tmpdir } from "node:os";
import { basename, dirname, join, resolve } from "node:path";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { createSyntheticFileHostedCallLedger } from "../../apps/api/documents/synthetic-file-hosted-call-ledger.js";
import {
  createHostedDocumentExecutor,
  hostedDocumentDestination,
  hostedDocumentRequestHash,
  type HostedDocumentTransferRequest
} from "../../apps/api/documents/hosted-document-execution.js";

let directory: string;
beforeEach(async () => {
  directory = await mkdtemp(join(tmpdir(), "alvitra-policy-continuity-"));
});
afterEach(async () => {
  if (
    resolve(dirname(directory)) !== resolve(tmpdir()) ||
    !basename(directory).startsWith("alvitra-policy-continuity-")
  )
    throw new Error("Temporário fora do escopo sintético.");
  await rm(directory, { recursive: true, force: true });
});
const request: HostedDocumentTransferRequest = {
  purpose: "pdf_ocr",
  destination: hostedDocumentDestination,
  model: "synthetic-only",
  condominiumId: "synthetic-policy-tenant",
  documentVersions: [
    { id: "synthetic-v1", contentKind: "original", contentSha256: "a".repeat(64) }
  ],
  payloadSha256: "b".repeat(64),
  inputBytes: 1,
  pageCount: 1,
  maximumOutputTokens: 1
};
const budget = {
  currency: "USD" as const,
  tariffVersion: "synthetic-tariff",
  maximumCostMicrounits: 1,
  tenantDailyLimitMicrounits: 10,
  globalDailyLimitMicrounits: 10
};
const ledger = () =>
  createSyntheticFileHostedCallLedger({ directory, confirmation: "synthetic-only" });
const key = (policyRevision: string) => ({
  condominiumId: request.condominiumId,
  requestHash: hostedDocumentRequestHash(request),
  policyRevision
});
const executor = (policyRevision: string) =>
  createHostedDocumentExecutor({
    authorize: async (value) => ({
      allowed: true,
      requestHash: hostedDocumentRequestHash(value),
      policyRevision
    }),
    callControl: { ledger: ledger(), budget: () => budget }
  });

describe("AC-7117 — continuidade da política no recibo durável", () => {
  it("recriar sob B não entrega resultado de A nem gera de novo; voltar a A recupera", async () => {
    const operation = vi.fn(async () => ({ createdUnder: "synthetic-policy-a" }));
    expect(await executor("synthetic-policy-a").execute(request, operation)).toEqual({
      createdUnder: "synthetic-policy-a"
    });
    await expect(executor("synthetic-policy-b").execute(request, operation)).rejects.toMatchObject({
      code: "call_policy_conflict"
    });
    expect(await executor("synthetic-policy-a").execute(request, operation)).toEqual({
      createdUnder: "synthetic-policy-a"
    });
    expect(operation).toHaveBeenCalledOnce();
  });

  it.each(["reserved", "dispatched", "uncertain", "cancelled"] as const)(
    "política B não contorna recibo %s de A",
    async (status) => {
      const store = ledger();
      const a = key("synthetic-policy-a");
      const reservation = await store.reserve(a, budget);
      if (reservation.status !== "reserved") throw new Error("Reserva sintética esperada.");
      if (status === "dispatched" || status === "uncertain")
        await store.dispatch(a, reservation.owner);
      if (status === "uncertain") await store.uncertain(a, reservation.owner);
      if (status === "cancelled") await store.cancel(a, reservation.owner);
      const operation = vi.fn();
      await expect(
        executor("synthetic-policy-b").execute(request, operation)
      ).rejects.toMatchObject({ code: "call_policy_conflict" });
      expect(operation).not.toHaveBeenCalled();
    }
  );

  it("recibo legado sem política não recebe política nova por inferência", async () => {
    const operation = vi.fn(async () => "resultado-sintetico");
    await executor("synthetic-policy-a").execute(request, operation);
    const file = join(directory, "synthetic-calls.json");
    const state = JSON.parse(await readFile(file, "utf8")) as {
      calls: Array<{ policyRevision?: string }>;
    };
    for (const row of state.calls) delete row.policyRevision;
    await writeFile(file, JSON.stringify(state));
    await expect(executor("synthetic-policy-a").execute(request, operation)).rejects.toMatchObject({
      code: "call_policy_conflict"
    });
    expect(operation).toHaveBeenCalledOnce();
  });

  it("token de A não autoriza finalizar sob B", async () => {
    const store = ledger();
    const a = key("synthetic-policy-a");
    const reservation = await store.reserve(a, budget);
    if (reservation.status !== "reserved") throw new Error("Reserva sintética esperada.");
    await store.dispatch(a, reservation.owner);
    await expect(
      store.complete(key("synthetic-policy-b"), reservation.owner, "sintetico")
    ).rejects.toMatchObject({ code: "call_policy_conflict" });
    await store.complete(a, reservation.owner, "sintetico");
    expect(await ledger().reserve(a, budget)).toEqual({ status: "completed", value: "sintetico" });
  });
});
