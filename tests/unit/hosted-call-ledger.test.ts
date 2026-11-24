import { spawn } from "node:child_process";
import { mkdtemp, readFile, rm, writeFile } from "node:fs/promises";
import { tmpdir } from "node:os";
import { basename, dirname, join, resolve } from "node:path";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { createSyntheticFileHostedCallLedger } from "../../apps/api/documents/synthetic-file-hosted-call-ledger.js";
import {
  validateHostedCallState,
  type HostedCallBudget,
  type HostedCallLedger
} from "../../apps/api/documents/hosted-call-ledger.js";
import {
  createHostedDocumentExecutor,
  hostedDocumentDestination,
  hostedDocumentRequestHash,
  type HostedDocumentTransferRequest
} from "../../apps/api/documents/hosted-document-execution.js";

let directory: string;
beforeEach(async () => {
  directory = await mkdtemp(join(tmpdir(), "alvitra-hosted-calls-"));
});
afterEach(async () => {
  if (
    dirname(resolve(directory)) !== resolve(tmpdir()) ||
    !basename(directory).startsWith("alvitra-hosted-calls-")
  )
    throw new Error("Temporário fora do escopo.");
  await rm(directory, { recursive: true, force: true });
});
const budget: HostedCallBudget = {
  currency: "USD",
  tariffVersion: "synthetic-v1",
  maximumCostMicrounits: 10,
  tenantDailyLimitMicrounits: 20,
  globalDailyLimitMicrounits: 30
};
const key = {
  condominiumId: "synthetic-a",
  requestHash: "a".repeat(64),
  policyRevision: "synthetic-only"
};
const request: HostedDocumentTransferRequest = {
  purpose: "pdf_ocr",
  destination: hostedDocumentDestination,
  model: "synthetic-model",
  condominiumId: "synthetic-a",
  documentVersions: [{ id: "v1", contentKind: "original", contentSha256: "a".repeat(64) }],
  payloadSha256: "a".repeat(64),
  inputBytes: 100,
  pageCount: 1,
  maximumOutputTokens: 100
};
const allow = async (input: HostedDocumentTransferRequest) => ({
  allowed: true as const,
  requestHash: hostedDocumentRequestHash(input),
  policyRevision: "synthetic-only"
});
function store(now?: () => number) {
  return createSyntheticFileHostedCallLedger({
    directory,
    confirmation: "synthetic-only",
    ...(now ? { now } : {})
  });
}
async function owner(ledger: HostedCallLedger, input = key) {
  const result = await ledger.reserve(input, budget);
  if (result.status !== "reserved") throw new Error("Reserva sintética não disponível.");
  return result.owner;
}
async function child(
  mode: string,
  tenant = "synthetic-a",
  suffix = "a",
  policyRevision = "synthetic-only"
) {
  return new Promise<Record<string, unknown>>((accept, reject) => {
    const process = spawn(
      globalThis.process.execPath,
      [
        "--require",
        resolve("scripts/safe-os-user-info.cjs"),
        "--import",
        "tsx",
        "tests/fixtures/hosted-call-ledger-process.ts",
        directory,
        mode,
        tenant,
        suffix,
        policyRevision
      ],
      {
        cwd: globalThis.process.cwd(),
        windowsHide: true,
        stdio: ["ignore", "pipe", "pipe"],
        env: Object.fromEntries(
          ["PATH", "Path", "SystemRoot", "SYSTEMROOT", "TEMP", "TMP"].flatMap((key) =>
            globalThis.process.env[key] ? [[key, globalThis.process.env[key]!]] : []
          )
        )
      }
    );
    let output = "";
    process.stdout.on("data", (chunk) => {
      output += String(chunk);
    });
    process.stderr.resume();
    process.on("error", reject);
    process.on("close", (code) => {
      try {
        if (code !== 0) throw new Error("Processo sintético falhou.");
        accept(JSON.parse(output) as Record<string, unknown>);
      } catch (error) {
        reject(error);
      }
    });
  });
}

describe("Spec 071 — chamadas e compromissos duráveis", () => {
  it("AC-7114: invalidação durante geração impede gravação e publicação tardia", async () => {
    const ledger = store(),
      gate = Promise.withResolvers<void>();
    const executor = createHostedDocumentExecutor({
      authorize: allow,
      callControl: { ledger, budget: () => budget }
    });
    const operation = vi.fn(async () => {
      await gate.promise;
      return "não publicar fonte removida";
    });
    const pending = executor.execute(request, operation),
      assertion = expect(pending).rejects.toThrow();
    await vi.waitFor(() => expect(operation).toHaveBeenCalledOnce());
    expect(await ledger.invalidateDocumentVersion(request.condominiumId, "v1")).toBe(1);
    gate.resolve();
    await assertion;
    await expect(executor.execute(request, operation)).rejects.toMatchObject({
      code: "call_invalidated"
    });
    expect(operation).toHaveBeenCalledOnce();
    const saved = JSON.parse(await readFile(join(directory, "synthetic-calls.json"), "utf8"));
    expect(saved.calls[0].resultJson).toBeUndefined();
    expect(saved.daily[0].committed).toBe(10);
  });

  it("AC-7114: invalidação de reserva cancelada não restitui nem acrescenta compromisso", async () => {
    const ledger = store(),
      linked = { ...key, documentVersionIds: ["synthetic-v1"] };
    const reserved = await ledger.reserve(linked, budget);
    if (reserved.status !== "reserved") throw new Error("Reserva ausente.");
    await ledger.cancel(linked, reserved.owner);
    expect(await ledger.invalidateDocumentVersion(key.condominiumId, "synthetic-v1")).toBe(1);
    await expect(ledger.reserve(linked, budget)).rejects.toMatchObject({
      code: "call_invalidated"
    });
    expect(
      JSON.parse(await readFile(join(directory, "synthetic-calls.json"), "utf8")).daily[0].committed
    ).toBe(0);
  });

  it("AC-7114: invalidar uma versão remove derivado sem reabrir orçamento ou outro tenant", async () => {
    const ledger = store(),
      linked = { ...key, documentVersionIds: ["synthetic-v1"] };
    const reservation = await ledger.reserve(linked, budget);
    if (reservation.status !== "reserved") throw new Error("Reserva ausente.");
    await ledger.dispatch(linked, reservation.owner);
    await ledger.complete(linked, reservation.owner, { text: "DERIVADO_SINTETICO_REMOVIDO" });
    expect(await ledger.invalidateDocumentVersion("synthetic-b", "synthetic-v1")).toBe(0);
    expect(await ledger.invalidateDocumentVersion(key.condominiumId, "outra-v")).toBe(0);
    expect(await ledger.invalidateDocumentVersion(key.condominiumId, "synthetic-v1")).toBe(1);
    expect(await ledger.invalidateDocumentVersion(key.condominiumId, "synthetic-v1")).toBe(0);
    await expect(store().reserve(linked, budget)).rejects.toMatchObject({
      code: "call_invalidated"
    });
    const raw = await readFile(join(directory, "synthetic-calls.json"), "utf8");
    expect(raw).not.toContain("DERIVADO_SINTETICO_REMOVIDO");
    expect(JSON.parse(raw).daily[0].committed).toBe(10);
  });

  it("AC-7114: política revogada entre reserva e envio cancela compromisso sem chamar provedor", async () => {
    const ledger = store();
    let checks = 0;
    const executor = createHostedDocumentExecutor({
      authorize: async (input) => (++checks >= 3 ? { allowed: false } : allow(input)),
      callControl: { ledger, budget: () => budget }
    });
    const operation = vi.fn(async () => "não enviar");
    await expect(executor.execute(request, operation)).rejects.toMatchObject({
      code: "transfer_denied"
    });
    expect(operation).not.toHaveBeenCalled();
    const saved = JSON.parse(await readFile(join(directory, "synthetic-calls.json"), "utf8"));
    expect(saved.calls[0].status).toBe("cancelled");
    expect(saved.daily[0].committed).toBe(0);
  });

  it("AC-7111: duas instâncias respeitam limite por tenant e global", async () => {
    const a = store(),
      b = store();
    const reservations = await Promise.allSettled(
      Array.from({ length: 5 }, (_, i) =>
        (i % 2 ? a : b).reserve(
          {
            condominiumId: i < 3 ? "synthetic-a" : "synthetic-b",
            policyRevision: "synthetic-only",
            requestHash: String(i).repeat(64)
          },
          budget
        )
      )
    );
    expect(reservations.filter((row) => row.status === "fulfilled")).toHaveLength(3);
    expect(
      reservations
        .filter((row) => row.status === "rejected")
        .every((row) => row.status === "rejected" && row.reason.code === "budget_exceeded")
    ).toBe(true);
    const saved = JSON.parse(await readFile(join(directory, "synthetic-calls.json"), "utf8"));
    expect(saved.daily[0].committed).toBe(30);
    expect(
      saved.calls.filter((row: { condominiumId: string }) => row.condominiumId === "synthetic-a")
        .length
    ).toBeLessThanOrEqual(2);
  });

  it("AC-7112: resultado confirmado é retomado por processo novo sem outra chamada", async () => {
    expect((await child("execute")).status).toBe("completed");
    expect(await child("execute")).toEqual(await child("execute"));
    expect((await readFile(join(directory, "synthetic-provider-count"), "utf8")).trim()).toBe("1");
  }, 30_000);

  it("AC-7111: reserva global é atômica entre processos distintos", async () => {
    const results = await Promise.all([
      child("reserve", "synthetic-a", "a"),
      child("reserve", "synthetic-a", "b"),
      child("reserve", "synthetic-b", "c"),
      child("reserve", "synthetic-b", "d")
    ]);
    expect(results.filter((row) => row.status === "reserved")).toHaveLength(3);
    expect(results.filter((row) => row.code === "budget_exceeded")).toHaveLength(1);
  }, 30_000);

  it("AC-7113: processo interrompido depois de marcar envio não gera chamada ao retomar", async () => {
    expect(await child("stop-after-dispatch")).toEqual({ status: "stopped" });
    expect(await child("execute")).toMatchObject({ status: "blocked", code: "call_in_progress" });
    await expect(readFile(join(directory, "synthetic-provider-count"))).rejects.toMatchObject({
      code: "ENOENT"
    });
  }, 30_000);

  it("AC-7113: desconhecido continua bloqueado depois do prazo e da virada do dia", async () => {
    let time = Date.UTC(2026, 10, 9, 23, 59);
    const ledger = store(() => time),
      token = await owner(ledger);
    await ledger.dispatch(key, token);
    time += 86_400_000;
    await expect(store(() => time).reserve(key, budget)).rejects.toMatchObject({
      code: "call_uncertain"
    });
    const saved = JSON.parse(await readFile(join(directory, "synthetic-calls.json"), "utf8"));
    expect(saved.daily[0].committed).toBe(10);
  });

  it("AC-7117: novo processo sob B não reutiliza resultado concluído ou envio incerto de A", async () => {
    expect((await child("execute", "synthetic-a", "a", "synthetic-policy-a")).status).toBe(
      "completed"
    );
    expect(await child("execute", "synthetic-a", "a", "synthetic-policy-b")).toEqual({
      status: "blocked",
      code: "call_policy_conflict"
    });
    expect((await child("execute", "synthetic-a", "a", "synthetic-policy-a")).status).toBe(
      "completed"
    );
    expect(await child("stop-after-dispatch", "synthetic-a", "b", "synthetic-policy-a")).toEqual({
      status: "stopped"
    });
    expect(await child("execute", "synthetic-a", "b", "synthetic-policy-b")).toEqual({
      status: "blocked",
      code: "call_policy_conflict"
    });
    expect((await readFile(join(directory, "synthetic-provider-count"), "utf8")).trim()).toBe("1");
  });

  it("AC-7114: cancelamento antes do envio libera orçamento, depois do envio é recusado", async () => {
    const ledger = store(),
      token = await owner(ledger);
    await ledger.cancel(key, token);
    const next = await owner(ledger);
    await ledger.dispatch(key, next);
    await expect(ledger.dispatch(key, next)).rejects.toMatchObject({ code: "ledger_unavailable" });
    await expect(ledger.cancel(key, next)).rejects.toMatchObject({ code: "ledger_unavailable" });
    await ledger.uncertain(key, next);
    await expect(ledger.reserve(key, budget)).rejects.toMatchObject({ code: "call_uncertain" });
  });

  it("AC-7114: reserva não enviada expirada respeita orçamento do novo dia", async () => {
    let time = Date.UTC(2026, 10, 9, 23, 59);
    const ledger = store(() => time);
    const previous = await owner(ledger);
    time += 86_400_000;
    const next = await owner(ledger);
    expect(next).not.toBe(previous);
    const saved = JSON.parse(await readFile(join(directory, "synthetic-calls.json"), "utf8"));
    expect(saved.daily.map((row: { committed: number }) => row.committed)).toEqual([0, 10]);
    await expect(ledger.dispatch(key, previous)).rejects.toMatchObject({
      code: "ledger_unavailable"
    });
  });

  it("AC-7112: resultado só é confirmado depois da gravação e falha impede nova geração", async () => {
    const underlying = store();
    const ledger = {
      ...underlying,
      complete: vi.fn(async () => {
        throw new Error("DETALHE_PRIVADO");
      })
    };
    const operation = vi.fn(async () => ({ text: "sintético" }));
    const first = createHostedDocumentExecutor({
      authorize: allow,
      callControl: { ledger, budget: () => budget }
    });
    await expect(first.execute(request, operation)).rejects.toMatchObject({
      code: "execution_failed"
    });
    const next = createHostedDocumentExecutor({
      authorize: allow,
      callControl: { ledger: underlying, budget: () => budget }
    });
    await expect(next.execute(request, operation)).rejects.toMatchObject({
      code: "call_uncertain"
    });
    expect(operation).toHaveBeenCalledOnce();
  });

  it("AC-7113: erro remoto conserva compromisso e bloqueia retry", async () => {
    const ledger = store(),
      operation = vi.fn(async () => {
        throw new Error("erro sintético");
      });
    const executor = createHostedDocumentExecutor({
      authorize: allow,
      callControl: { ledger, budget: () => budget }
    });
    await expect(executor.execute(request, operation)).rejects.toThrow();
    await expect(executor.execute(request, operation)).rejects.toMatchObject({
      code: "call_uncertain"
    });
    expect(operation).toHaveBeenCalledOnce();
    const saved = JSON.parse(await readFile(join(directory, "synthetic-calls.json"), "utf8"));
    expect(saved.daily[0].committed).toBe(10);
  });

  it("AC-7111: tenant ou fingerprint diferentes não recebem resultado salvo", async () => {
    const ledger = store(),
      token = await owner(ledger);
    await ledger.dispatch(key, token);
    await ledger.complete(key, token, { text: "somente A" });
    expect(await ledger.reserve(key, budget)).toEqual({
      status: "completed",
      value: { text: "somente A" }
    });
    expect(await ledger.reserve({ ...key, condominiumId: "synthetic-b" }, budget)).toMatchObject({
      status: "reserved"
    });
    expect(await ledger.reserve({ ...key, requestHash: "b".repeat(64) }, budget)).toMatchObject({
      status: "reserved"
    });
  });

  it("AC-7111/7114: corrupção não reinicia limite nem é encoberta pelo cache", async () => {
    const ledger = store(),
      operation = vi.fn(async () => "ok");
    const executor = createHostedDocumentExecutor({
      authorize: allow,
      callControl: { ledger, budget: () => budget }
    });
    expect(await executor.execute(request, operation)).toBe("ok");
    await writeFile(join(directory, "synthetic-calls.json"), "CORROMPIDO");
    await expect(executor.execute(request, operation)).rejects.toMatchObject({
      code: "ledger_unavailable"
    });
    expect(operation).toHaveBeenCalledOnce();
    expect(await readFile(join(directory, "synthetic-calls.json"), "utf8")).toBe("CORROMPIDO");
  });

  it("AC-7114: lock abandonado, relógio regressivo e produção negam execução", async () => {
    await writeFile(join(directory, "synthetic-calls.lock"), "sintético");
    await expect(store().reserve(key, budget)).rejects.toMatchObject({
      code: "ledger_unavailable"
    });
    await rm(join(directory, "synthetic-calls.lock"));
    await owner(store(() => 1000));
    await expect(store(() => 999).reserve(key, budget)).rejects.toMatchObject({
      code: "ledger_unavailable"
    });
    expect(() =>
      createSyntheticFileHostedCallLedger({
        directory,
        confirmation: "synthetic-only",
        environment: { NODE_ENV: "production" }
      })
    ).toThrow("sintético");
  });

  it.each([0, -1, 0.1, Number.NaN, Number.POSITIVE_INFINITY])(
    "AC-7111: orçamento inválido %s não reserva",
    async (amount) => {
      await expect(
        store().reserve(key, { ...budget, maximumCostMicrounits: amount })
      ).rejects.toMatchObject({ code: "ledger_unavailable" });
    }
  );

  it("AC-7114: metadados, checksum e resultado fora do contrato são recusados", async () => {
    await expect(
      store().reserve({ ...key, requestHash: "inválido" }, budget)
    ).rejects.toMatchObject({ code: "ledger_unavailable" });
    const ledger = store(),
      token = await owner(ledger);
    await expect(ledger.complete(key, token, "antes de enviar")).rejects.toThrow();
    await ledger.dispatch(key, token);
    await expect(ledger.complete(key, token, "a".repeat(1_000_001))).rejects.toThrow();
    await ledger.complete(key, token, "válido");
    const saved = JSON.parse(await readFile(join(directory, "synthetic-calls.json"), "utf8"));
    expect(() =>
      validateHostedCallState({ ...saved, calls: [{ ...saved.calls[0], status: "cancelled" }] })
    ).toThrow();
    saved.calls[0].resultJson = '"alterado"';
    expect(() => validateHostedCallState(saved)).toThrow();
    expect(() => validateHostedCallState({ ...saved, version: 2 })).toThrow();
  });
});
