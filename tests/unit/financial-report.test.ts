import { expect, it, vi } from "vitest";
import { randomUUID } from "node:crypto";
import { createFinancialReportService } from "../../apps/api/authoring/financial-report.js";
import { financialFixture } from "../fixtures/financial-dossier.js";
import { managerContext } from "./answer-fixtures.js";
import { authoringHash } from "../../apps/api/authoring/document-authoring-contract.js";
import type { AuthoringOperations } from "../../apps/api/authoring/authoring-operations.js";
it("AC-7357: respeita controle operacional injetado antes de registrar ou despachar", async () => {
  const f = financialFixture();
  const operations: AuthoringOperations = {
    syntheticOnly: true,
    open: vi.fn(async () => {
      throw new Error("quarentena simulada");
    }),
    check: vi.fn(),
    run: vi.fn(),
    export: vi.fn(),
    purge: vi.fn(),
    maintain: vi.fn()
  };
  const service = createFinancialReportService({ ...f.options, operations });
  await expect(service.prepare(managerContext, f.scope, f.id, f.request)).rejects.toThrow(
    "quarentena"
  );
  expect(f.complete).not.toHaveBeenCalled();
  expect((await f.store.list(f.scope, 100)).entries).toHaveLength(0);
});
it("AC-7358: materializa resultados persistidos sem modelo após falha ao salvar rascunho", async () => {
  const f = financialFixture();
  const propose = vi
    .spyOn(f.drafts, "propose")
    .mockRejectedValueOnce(new Error("falha simulada de armazenamento"));
  await expect(f.service.prepare(managerContext, f.scope, f.id, f.request)).rejects.toThrow(
    "armazenamento"
  );
  propose.mockRestore();
  const { model, ...offline } = f.options;
  expect(model.key).toBeTruthy();
  const service = createFinancialReportService(offline);
  expect((await service.available(managerContext, f.scope)).reports[0]?.status).toBe(
    "resumable_without_model"
  );
  const recovered = await service.prepare(managerContext, f.scope, f.id, f.request);
  // Esta fixture reduzida tem oito páginas; a cobertura integral é exercitada no dossiê e no SQL.
  expect(recovered.draft.text).toContain("faltam R$ 9.313,20 de comprovação");
  expect(recovered.draft.text).toContain("8 páginas e 8 documentos integrantes lidos");
  expect((await service.read(managerContext, f.scope, f.id)).draft.hash).toBe(recovered.draft.hash);
  expect(f.complete).toHaveBeenCalledTimes(2);
});
it("AC-7357: pagina o histórico sem perder o relatório anterior e sem gerar novamente", async () => {
  const f = financialFixture();
  await f.service.prepare(managerContext, f.scope, f.id, f.request);
  for (let i = 0; i < 105; i++)
    await f.store.append(f.scope, {
      id: randomUUID(),
      requestKey: `message-${i}`,
      inputHash: authoringHash(i),
      createdAt: new Date(Date.UTC(2026, 10, 19, 0, 0, i)).toISOString(),
      response: {},
      messages: [
        { id: randomUUID(), role: "user", kind: "question_answer", text: `Mensagem sintética ${i}` }
      ],
      metadata: {}
    });
  const page = await f.service.available(managerContext, f.scope);
  expect(page.reports).toHaveLength(0);
  expect(page.nextCursor).toBeTruthy();
  expect(
    (await f.service.available(managerContext, f.scope, [], page.nextCursor!)).reports
  ).toEqual([expect.objectContaining({ id: f.id, status: "ready" })]);
  expect(f.complete).toHaveBeenCalledTimes(2);
});
it("AC-7357/7360: contexto só lê; recuperação sem modelo conserva rascunho e origem legada concluída", async () => {
  const f = financialFixture();
  const context = await f.service.available(managerContext, f.scope, f.request.documentVersionIds);
  expect(context.candidates.map((c) => c.key)).toEqual(["BAL-OUT", "BAL-SET"]);
  expect(f.complete).not.toHaveBeenCalled();
  const result = await f.service.prepare(managerContext, f.scope, f.id, f.request);
  const { model, ...offline } = f.options;
  expect(model.key).toBeTruthy();
  const service = createFinancialReportService(offline);
  expect((await service.read(managerContext, f.scope, f.id)).draft.hash).toBe(result.draft.hash);
  const originalFind = f.store.find.bind(f.store);
  f.store.find = async (scope, key) => {
    const value = await originalFind(scope, key);
    if (value && key.endsWith(":request")) {
      const packet = {
        ...(value.response.packet as Record<string, unknown>),
        version: "financial-dossier-v1"
      };
      return { ...value, inputHash: authoringHash(packet), response: { packet } };
    }
    return value;
  };
  expect((await service.prepare(managerContext, f.scope, f.id, f.request)).draft.hash).toBe(
    result.draft.hash
  );
  expect((await service.available(managerContext, f.scope)).reports[0]?.status).toBe("ready");
  expect(f.complete).toHaveBeenCalledTimes(2);
});
it("AC-7360: lista despacho incerto sem repeti-lo e nega read incompleto", async () => {
  const f = financialFixture();
  f.complete.mockRejectedValueOnce(new Error("timeout simulado"));
  await expect(f.service.prepare(managerContext, f.scope, f.id, f.request)).rejects.toThrow();
  expect((await f.service.available(managerContext, f.scope)).reports[0]?.status).toBe(
    "needs_reconciliation"
  );
  await expect(f.service.read(managerContext, f.scope, f.id)).rejects.toThrow();
  expect(f.complete).toHaveBeenCalledTimes(1);
});
it("AC-7360: pedido v1 incompleto exige reconciliação sem reexecutar as fases", async () => {
  const f = financialFixture();
  f.complete.mockRejectedValueOnce(new Error("despacho incerto simulado"));
  await expect(f.service.prepare(managerContext, f.scope, f.id, f.request)).rejects.toThrow();
  const originalFind = f.store.find.bind(f.store);
  f.store.find = async (scope, key) => {
    const entry = await originalFind(scope, key);
    if (!entry || !key.endsWith(":request")) return entry;
    const packet = {
      ...(entry.response.packet as Record<string, unknown>),
      version: "financial-dossier-v1"
    };
    return { ...entry, inputHash: authoringHash(packet), response: { packet } };
  };
  await expect(f.service.prepare(managerContext, f.scope, f.id, f.request)).rejects.toThrow(
    "anterior incompleto exige reconciliação"
  );
  expect((await f.service.available(managerContext, f.scope)).reports[0]?.status).toBe(
    "needs_reconciliation"
  );
  expect(f.complete).toHaveBeenCalledTimes(1);
});
it("AC-7350/52: redação e conferência separadas; retomada, edição, hash e confirmação no rascunho comum", async () => {
  const f = financialFixture(),
    r = await f.service.prepare(managerContext, f.scope, f.id, f.request);
  expect(r.draft.status).toBe("awaiting_confirmation");
  expect(r.analysis?.inventory).toHaveLength(8);
  expect(f.complete.mock.calls.map((c) => c[0])).toEqual(["write", "review"]);
  await expect(f.drafts.download(managerContext, f.scope, f.id, r.draft.hash)).rejects.toThrow();
  const edit = await f.drafts.propose(
    managerContext,
    f.scope,
    f.id,
    { ...r.draft, text: r.draft.text + "\nConferência humana pendente." },
    r.draft.event
  );
  expect((await f.service.prepare(managerContext, f.scope, f.id, f.request)).draft.hash).toBe(
    edit.hash
  );
  expect(f.complete).toHaveBeenCalledTimes(2);
  await f.drafts.decide(managerContext, f.scope, f.id, edit.event, edit.hash, true, true);
  expect(
    (await f.drafts.download(managerContext, f.scope, f.id, edit.hash))
      .toString("ascii")
      .startsWith("%PDF")
  ).toBe(true);
  f.changePage();
  await expect(f.drafts.read(managerContext, f.scope, f.id)).rejects.toThrow("caderno mudou");
  expect(f.complete).toHaveBeenCalledTimes(2);
});
it.each([
  "no-model",
  "incomplete",
  "unauthorized",
  "bad-request",
  "rejected-plan",
  "rejected-review",
  "unknown"
])("AC-7351: bloqueia %s, sem fallback nem repetição automática", async (kind) => {
  const f = financialFixture();
  let service = f.service;
  let request: unknown = f.request;
  if (kind === "no-model") {
    const { model, ...options } = f.options;
    expect(model.key).toBeTruthy();
    service = createFinancialReportService(options);
  }
  if (kind === "incomplete")
    f.catalog.listAuthorized.mockResolvedValue([{ ...f.row, searchablePageCount: 7 }]);
  if (kind === "unauthorized")
    f.options.authorize.mockResolvedValue({ ...managerContext, permissions: [] });
  if (kind === "bad-request") request = { ...f.request, text: "não aceitar texto injetado" };
  if (kind === "rejected-plan") f.complete.mockResolvedValueOnce({ title: "sem contrato" });
  if (kind === "rejected-review")
    f.complete
      .mockImplementationOnce(async () => ({
        title: "FICTÍCIO",
        overview: "Resumo",
        priorities: ["closing", "arrears", "budget"].map((checkId) => ({
          checkId,
          text: "Conferir."
        })),
        conclusion: "Conferir."
      }))
      .mockResolvedValueOnce({ accepted: false });
  if (kind === "unknown") f.complete.mockRejectedValueOnce(new Error("timeout simulado"));
  await expect(service.prepare(managerContext, f.scope, f.id, request)).rejects.toThrow();
  const count = f.complete.mock.calls.length;
  if (["unknown", "rejected-plan", "rejected-review"].includes(kind)) {
    await expect(service.prepare(managerContext, f.scope, f.id, request)).rejects.toThrow();
    expect(f.complete).toHaveBeenCalledTimes(count);
  } else expect(count).toBe(0);
});
it("AC-7351: não aceita reutilizar identidade com outro balancete, recibo ou fonte", async () => {
  const f = financialFixture();
  await f.service.prepare(managerContext, f.scope, f.id, f.request);
  await expect(
    f.service.prepare(managerContext, f.scope, f.id, {
      ...f.request,
      currentDocumentKey: "BAL-SET"
    })
  ).rejects.toThrow("outra entrada");
  const { model, ...withoutModel } = f.options;
  expect(model.key).toBeTruthy();
  const resumed = createFinancialReportService(withoutModel);
  expect((await resumed.prepare(managerContext, f.scope, f.id, f.request)).draft.id).toBe(f.id);
  f.changePage();
  await expect(resumed.prepare(managerContext, f.scope, f.id, f.request)).rejects.toThrow(
    "caderno mudou"
  );
});
