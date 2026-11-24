import { randomUUID } from "node:crypto";
import { expect, it, vi } from "vitest";
import { createInMemoryConversationStore } from "../../apps/api/answers/conversation-store.js";
import { createDocumentDraftService } from "../../apps/api/authoring/document-drafts.js";
import { DocumentDraftError } from "../../apps/api/authoring/document-drafts.js";
type Mutable<T> = T extends object ? { -readonly [K in keyof T]: Mutable<T[K]> } : T;
type MutablePlan = Mutable<ReturnType<typeof syntheticDocumentPlan>>;
import { createDocumentAuthoringService } from "../../apps/api/authoring/document-authoring.js";
import {
  authoringHash,
  validateAuthoringRequest,
  validateDocumentPlan,
  validateDocumentReview
} from "../../apps/api/authoring/document-authoring-contract.js";
import type { RegisteredDocument } from "../../apps/api/documents/document-catalog.js";
import type {
  DocumentAuthoringRequest,
  DocumentAuthoringSource
} from "../../apps/shared/document-proposal.js";
import { AccessDeniedError } from "../../apps/api/identity/authorized-condominium-context.js";
import { managerContext } from "./answer-fixtures.js";
import {
  approvedDocumentReview,
  syntheticDocumentAuthoringModel,
  syntheticDocumentPlan
} from "../fixtures/document-authoring.js";

export const request: DocumentAuthoringRequest = {
  title: "FICTÍCIO. Revisão de comunicado",
  documentKind: "Comunicado",
  operation: "revise",
  request: "Reorganize a redação preservando os fatos documentados.",
  report: "",
  documentVersionIds: ["synthetic-version"]
};
const source: DocumentAuthoringSource = {
  id: "document:synthetic-version:1",
  kind: "document",
  title: "FICTÍCIO. Regimento",
  text: "FICTÍCIO. Para usar o salão, solicite reserva com antecedência de 24 horas.",
  documentId: "synthetic-document",
  documentVersionId: "synthetic-version",
  page: 1,
  documentType: "internal_rules"
};
it.each(["rule", "reported_leak"])(
  "AC-7353/54: texto literal simples não exige revisão especializada; preserva investigação: %s",
  (kind) => {
    const r = {
      ...request,
      operation: "create" as const,
      documentKind: kind === "rule" ? "Comunicado" : "Relato"
    };
    const s =
      kind === "rule"
        ? source
        : {
            id: "user-report",
            kind: "user_report" as const,
            title: "Relato declarado",
            text: "FICTÍCIO. O síndico relata umidade no corredor e suspeita de vazamento. A causa não foi apurada."
          };
    const p = structuredClone(syntheticDocumentPlan(r, [s])) as MutablePlan;
    p.paragraphs[0]!.text = s.text;
    p.changes[0]!.after = s.text;
    p.requiresSpecialist = false;
    if (kind === "reported_leak") p.pending = ["Apurar a causa com responsável técnico."];
    expect(validateDocumentPlan(p, r, [s]).requiresSpecialist).toBe(false);
    expect(validateDocumentPlan(p, r, [s]).pending).toEqual(p.pending);
    p.requiresSpecialist = true;
    const classified = validateDocumentPlan(p, r, [s]);
    expect(classified.requiresSpecialist).toBe(false);
    expect(classified.paragraphs).toEqual(p.paragraphs);
    expect(classified.pending).toEqual(p.pending);
    expect(p.requiresSpecialist).toBe(true); // Entrada bruta não é alterada.
    p.requiresSpecialist = false;
    p.changes[0]!.kind = "substantive";
    expect(() => validateDocumentPlan(p, r, [s])).toThrow("revisão especializada");
  }
);
async function setup() {
  const store = createInMemoryConversationStore(),
    id = randomUUID(),
    scope = {
      kind: "chat" as const,
      userId: managerContext.userId,
      condominiumId: managerContext.condominiumId,
      chatId: randomUUID()
    },
    now = () => new Date("2026-11-16T12:00:00Z");
  let text = source.text,
    visible = true,
    authorized = true;
  const document: RegisteredDocument = {
    condominiumId: managerContext.condominiumId,
    documentId: source.documentId!,
    documentVersionId: source.documentVersionId!,
    title: source.title,
    documentType: "internal_rules",
    versionNumber: 1,
    sizeBytes: 100,
    processingStatus: "ready",
    validityStatus: "confirmed",
    createdAt: now().toISOString(),
    expectedPageCount: 1,
    processedPageCount: 1,
    searchablePageCount: 1,
    extractionCompleteness: 1,
    unreadablePageNumbers: [],
    extractionMethod: "pdf_text",
    ocrQualityScore: null
  };
  const catalog = { listAuthorized: vi.fn(async () => (visible ? [document] : [])) },
    sources = {
      getAuthorizedPage: vi.fn(async () => ({
        documentId: source.documentId!,
        documentVersionId: source.documentVersionId!,
        title: source.title,
        page: 1,
        content: text
      }))
    };
  const complete = vi.fn(syntheticDocumentAuthoringModel().complete),
    model = { enabled: true, key: "synthetic-document-authoring-v1", complete };
  const authorize = vi.fn(async () => {
    if (!authorized) throw new AccessDeniedError();
    return managerContext;
  });
  const drafts = createDocumentDraftService({
    store,
    catalog,
    sources,
    now,
    authoringSource: (c, s, i) => service.reference(c, s, i)
  });
  const options = { store, catalog, sources, drafts, model, now, authorize };
  const service: ReturnType<typeof createDocumentAuthoringService> =
    createDocumentAuthoringService(options);
  return {
    store,
    id,
    scope,
    drafts,
    service,
    options,
    complete,
    model,
    document,
    sources,
    authorize,
    changeSource: () => {
      text += " Alteração posterior.";
    },
    hide: () => {
      visible = false;
    },
    revoke: () => {
      authorized = false;
    }
  };
}
it("AC-7327/30: redação + conferência, proposta íntegra, aceite idempotente e PDF separado", async () => {
  const f = await setup();
  const proposal = await f.service.prepare(managerContext, f.scope, f.id, request);
  expect(proposal.plan.paragraphs[0]!.text).not.toBe(source.text);
  expect(proposal.plan.changes[0]!.before?.quote).toBe(source.text);
  expect(proposal.plan.requiresSpecialist).toBe(true);
  expect(proposal.status).toBe("offered");
  expect(await f.service.prepare(managerContext, f.scope, f.id, request)).toEqual(proposal);
  expect(f.complete).toHaveBeenCalledTimes(2);
  const accepted = await f.service.decide(managerContext, f.scope, f.id, proposal.hash, true),
    draft = accepted.draft!;
  expect(draft).toMatchObject({
    status: "awaiting_confirmation",
    authoringSource: {
      proposalId: f.id,
      proposalHash: proposal.hash,
      sourceHash: proposal.sourceHash,
      hasUserReport: false
    }
  });
  await expect(f.drafts.download(managerContext, f.scope, f.id, draft.hash)).rejects.toMatchObject({
    statusCode: 409
  });
  const edited = await f.drafts.propose(
    managerContext,
    f.scope,
    f.id,
    { ...draft, text: draft.text + "\nConferir antes de usar." },
    draft.event
  );
  const confirmed = await f.drafts.decide(
    managerContext,
    f.scope,
    f.id,
    edited.event,
    edited.hash,
    true,
    true
  );
  expect(
    (await f.service.decide(managerContext, f.scope, f.id, proposal.hash, true)).draft
  ).toEqual(confirmed);
  expect(
    (await f.drafts.download(managerContext, f.scope, f.id, confirmed.hash))
      .subarray(0, 4)
      .toString()
  ).toBe("%PDF");
  f.model.enabled = false;
  expect(
    (await createDocumentAuthoringService(f.options).read(managerContext, f.scope, f.id)).status
  ).toBe("accepted");
  expect(f.complete).toHaveBeenCalledTimes(2);
});
it("AC-7327: relato é declarado, preservado na origem e separado da prova documental", async () => {
  const f = await setup(),
    r = {
      ...request,
      operation: "create" as const,
      report: "FICTÍCIO. O síndico solicita aviso sobre a limpeza.",
      documentVersionIds: []
    };
  const p = await f.service.prepare(managerContext, f.scope, f.id, r);
  expect(p.plan.paragraphs[0]!.provenance).toBe("user_report");
  const d = (await f.service.decide(managerContext, f.scope, f.id, p.hash, true)).draft!;
  expect(d.sources).toEqual([]);
  expect(d.authoringSource?.hasUserReport).toBe(true);
  expect(d.pending).toContain("não comprova fatos");
  await expect(
    f.drafts.propose(managerContext, f.scope, f.id, { ...d, authoringSource: undefined }, 1)
  ).rejects.toMatchObject({ statusCode: 409 });
});
it("AC-7329: sem base pede contexto e não cria rascunho", async () => {
  const f = await setup(),
    p = await f.service.prepare(managerContext, f.scope, f.id, {
      ...request,
      documentVersionIds: []
    });
  expect(p.status).toBe("needs_context");
  expect(p.plan.paragraphs).toEqual([]);
  await expect(f.service.decide(managerContext, f.scope, f.id, p.hash, true)).rejects.toMatchObject(
    { statusCode: 409 }
  );
  await expect(f.drafts.read(managerContext, f.scope, f.id)).rejects.toMatchObject({
    statusCode: 404
  });
});
it("AC-7330: recusa não cria rascunho; decisão oposta e pedido divergente falham", async () => {
  const f = await setup(),
    p = await f.service.prepare(managerContext, f.scope, f.id, request);
  await expect(
    f.service.decide(managerContext, f.scope, f.id, "f".repeat(64), true)
  ).rejects.toMatchObject({ statusCode: 409 });
  expect(
    (await f.service.decide(managerContext, f.scope, f.id, p.hash, false)).proposal.status
  ).toBe("declined");
  expect(
    (await f.service.decide(managerContext, f.scope, f.id, p.hash, false)).proposal.status
  ).toBe("declined");
  await expect(f.service.decide(managerContext, f.scope, f.id, p.hash, true)).rejects.toMatchObject(
    { statusCode: 409 }
  );
  await expect(
    f.service.prepare(managerContext, f.scope, f.id, { ...request, request: "Outro pedido" })
  ).rejects.toMatchObject({ statusCode: 409 });
  await expect(f.drafts.read(managerContext, f.scope, f.id)).rejects.toMatchObject({
    statusCode: 404
  });
});
it.each(["source", "archive", "membership"])(
  "AC-7331: %s revogado bloqueia proposta e derivado",
  async (kind) => {
    const f = await setup(),
      p = await f.service.prepare(managerContext, f.scope, f.id, request),
      d = (await f.service.decide(managerContext, f.scope, f.id, p.hash, true)).draft!;
    if (kind === "source") f.changeSource();
    else if (kind === "archive") f.hide();
    else f.revoke();
    await expect(f.service.read(managerContext, f.scope, f.id)).rejects.toBeInstanceOf(Error);
    await expect(f.drafts.read(managerContext, f.scope, f.id)).rejects.toBeInstanceOf(Error);
    await expect(
      f.drafts.decide(managerContext, f.scope, f.id, 1, d.hash, true, true)
    ).rejects.toBeInstanceOf(Error);
    expect(f.complete).toHaveBeenCalledTimes(2);
  }
);
it("AC-7330: concorrência faz uma chamada por etapa e não repete após resultado incerto", async () => {
  const f = await setup();
  let release!: () => void;
  const wait = new Promise<void>((resolve) => {
    release = resolve;
  });
  f.complete.mockImplementation(
    syntheticDocumentAuthoringModel(async (input) => {
      if (input.phase === "write") await wait;
    }).complete
  );
  const first = f.service.prepare(managerContext, f.scope, f.id, request);
  await vi.waitFor(() => expect(f.complete).toHaveBeenCalledTimes(1));
  await expect(f.service.prepare(managerContext, f.scope, f.id, request)).rejects.toMatchObject({
    statusCode: 503
  });
  release();
  await first;
  expect(f.complete).toHaveBeenCalledTimes(2);
  const uncertain = await setup();
  uncertain.complete.mockRejectedValue(new Error("simulated network failure"));
  await expect(
    uncertain.service.prepare(managerContext, uncertain.scope, uncertain.id, request)
  ).rejects.toMatchObject({ statusCode: 503 });
  await expect(
    uncertain.service.prepare(managerContext, uncertain.scope, uncertain.id, request)
  ).rejects.toMatchObject({ statusCode: 503 });
  expect(uncertain.complete).toHaveBeenCalledTimes(1);
});
it("AC-7330: retoma revisão após persistir escrita sem chamar redator novamente", async () => {
  const f = await setup(),
    append = f.store.append.bind(f.store);
  let fail = true;
  vi.spyOn(f.store, "append").mockImplementation(async (s, e) => {
    if (e.requestKey.endsWith(":review-dispatch") && fail) {
      fail = false;
      throw new Error("simulated storage failure before dispatch");
    }
    return append(s, e);
  });
  await expect(f.service.prepare(managerContext, f.scope, f.id, request)).rejects.toThrow();
  expect(f.complete).toHaveBeenCalledTimes(1);
  await createDocumentAuthoringService(f.options).prepare(managerContext, f.scope, f.id, request);
  expect(f.complete).toHaveBeenCalledTimes(2);
});
it("AC-7330: falha após aceite retoma criação sem sobrescrever rascunho alheio", async () => {
  const f = await setup(),
    p = await f.service.prepare(managerContext, f.scope, f.id, request);
  await f.drafts.propose(
    managerContext,
    f.scope,
    f.id,
    {
      title: "Outro",
      documentKind: "Aviso",
      operation: "create",
      text: "FICTÍCIO. Texto manual.",
      sources: [],
      changes: "",
      pending: ""
    },
    0
  );
  await expect(f.service.decide(managerContext, f.scope, f.id, p.hash, true)).rejects.toMatchObject(
    { statusCode: 409 }
  );
  expect((await f.drafts.read(managerContext, f.scope, f.id)).text).toBe("FICTÍCIO. Texto manual.");
});
it("AC-7330: falha antes de salvar rascunho retoma decisão aceita sem nova chamada", async () => {
  const f = await setup(),
    p = await f.service.prepare(managerContext, f.scope, f.id, request);
  vi.spyOn(f.drafts, "propose").mockRejectedValueOnce(new Error("simulated storage failure"));
  await expect(f.service.decide(managerContext, f.scope, f.id, p.hash, true)).rejects.toThrow(
    "simulated storage failure"
  );
  expect((await f.service.decide(managerContext, f.scope, f.id, p.hash, true)).draft?.event).toBe(
    1
  );
  expect(f.complete).toHaveBeenCalledTimes(2);
});
it("AC-7330: resultado não persistido deixa envio incerto e não repete etapa", async () => {
  const f = await setup(),
    append = f.store.append.bind(f.store);
  vi.spyOn(f.store, "append").mockImplementation(async (s, e) => {
    if (e.requestKey.endsWith(":write-result")) throw new Error("simulated result storage failure");
    return append(s, e);
  });
  await expect(f.service.prepare(managerContext, f.scope, f.id, request)).rejects.toThrow(
    "simulated result storage failure"
  );
  await expect(f.service.prepare(managerContext, f.scope, f.id, request)).rejects.toMatchObject({
    statusCode: 503
  });
  expect(f.complete).toHaveBeenCalledTimes(1);
});
it.each(["incomplete", "unconfirmed", "too-many-pages", "oversized", "wrong-page"])(
  "AC-7328: recusa entrada %s integralmente antes do modelo",
  async (kind) => {
    const f = await setup();
    let catalog = f.options.catalog,
      sources = f.options.sources;
    if (kind === "incomplete")
      catalog = {
        listAuthorized: vi.fn(async () => [{ ...f.document, extractionCompleteness: 0.5 }])
      };
    if (kind === "unconfirmed")
      catalog = {
        listAuthorized: vi.fn(async () => [
          {
            ...f.document,
            validityStatus: "pending" as const
          }
        ])
      };
    if (kind === "too-many-pages")
      catalog = {
        listAuthorized: vi.fn(async () => [
          { ...f.document, expectedPageCount: 21, processedPageCount: 21, searchablePageCount: 21 }
        ])
      };
    if (kind === "oversized")
      sources = {
        getAuthorizedPage: vi.fn(async () => ({
          documentId: source.documentId!,
          documentVersionId: source.documentVersionId!,
          title: source.title,
          page: 1,
          content: "A".repeat(80001)
        }))
      };
    if (kind === "wrong-page")
      sources = {
        getAuthorizedPage: vi.fn(async () => ({
          documentId: source.documentId!,
          documentVersionId: source.documentVersionId!,
          title: source.title,
          page: 2,
          content: source.text
        }))
      };
    await expect(
      createDocumentAuthoringService({ ...f.options, catalog, sources }).prepare(
        managerContext,
        f.scope,
        f.id,
        request
      )
    ).rejects.toMatchObject({ statusCode: kind === "wrong-page" ? 409 : 422 });
    expect(f.complete).not.toHaveBeenCalled();
  }
);
it("AC-7331: versões conflitantes não são selecionadas silenciosamente; contexto e referência falsos são negados", async () => {
  const f = await setup(),
    catalog = {
      listAuthorized: async () => [
        f.document,
        { ...f.document, documentVersionId: "other-version", versionNumber: 2 }
      ]
    };
  await expect(
    createDocumentAuthoringService({ ...f.options, catalog }).prepare(
      managerContext,
      f.scope,
      f.id,
      { ...request, documentVersionIds: ["synthetic-version", "other-version"] }
    )
  ).rejects.toMatchObject({ statusCode: 409 });
  await expect(
    f.service.prepare(
      managerContext,
      { ...f.scope, chatId: randomUUID(), userId: "foreign" as typeof f.scope.userId },
      f.id,
      request
    )
  ).rejects.toBeInstanceOf(AccessDeniedError);
  const p = await f.service.prepare(managerContext, f.scope, f.id, request),
    d = (await f.service.decide(managerContext, f.scope, f.id, p.hash, true)).draft!;
  await expect(
    f.drafts.propose(
      managerContext,
      f.scope,
      randomUUID(),
      { ...d, authoringSource: { ...d.authoringSource, proposalHash: "f".repeat(64) } },
      0
    )
  ).rejects.toMatchObject({ statusCode: 409 });
  await expect(
    f.drafts.propose(
      managerContext,
      f.scope,
      randomUUID(),
      { ...d, authoringSource: { ...d.authoringSource, proposalHash: "invalid" } },
      0
    )
  ).rejects.toMatchObject({ statusCode: 400 });
});
it("AC-7329/32: modelo desabilitado, timeout, revogação durante escrita e conferência rejeitada falham fechados", async () => {
  const disabled = await setup();
  disabled.model.enabled = false;
  await expect(
    disabled.service.prepare(managerContext, disabled.scope, disabled.id, request)
  ).rejects.toMatchObject({ statusCode: 503 });
  expect(disabled.complete).not.toHaveBeenCalled();
  const timeout = await setup();
  timeout.complete.mockImplementation(() => new Promise(() => {}));
  await expect(
    createDocumentAuthoringService({ ...timeout.options, timeoutMs: 5 }).prepare(
      managerContext,
      timeout.scope,
      timeout.id,
      request
    )
  ).rejects.toMatchObject({ statusCode: 503 });
  await expect(
    timeout.service.prepare(managerContext, timeout.scope, timeout.id, request)
  ).rejects.toMatchObject({ statusCode: 503 });
  expect(timeout.complete).toHaveBeenCalledTimes(1);
  const revoked = await setup();
  revoked.complete.mockImplementation(
    syntheticDocumentAuthoringModel(() => {
      revoked.revoke();
    }).complete
  );
  await expect(
    revoked.service.prepare(managerContext, revoked.scope, revoked.id, request)
  ).rejects.toBeInstanceOf(AccessDeniedError);
  expect(revoked.complete).toHaveBeenCalledTimes(1);
  const rejected = await setup();
  rejected.complete.mockImplementation(
    syntheticDocumentAuthoringModel((input) => (input.phase === "review" ? {} : undefined)).complete
  );
  await expect(
    rejected.service.prepare(managerContext, rejected.scope, rejected.id, request)
  ).rejects.toMatchObject({ statusCode: 422 });
  await expect(
    rejected.service.prepare(managerContext, rejected.scope, rejected.id, request)
  ).rejects.toMatchObject({ statusCode: 422 });
  expect(rejected.complete).toHaveBeenCalledTimes(2);
});
const validPlan = () => syntheticDocumentPlan(request, [source]);
it.each([
  [
    "número inventado",
    (p: MutablePlan) => {
      p.paragraphs[0]!.text += " Multa de 500 reais.";
    }
  ],
  [
    "citação inexistente",
    (p: MutablePlan) => {
      p.paragraphs[0]!.references[0]!.quote = "Fonte inventada";
    }
  ],
  [
    "offset divergente",
    (p: MutablePlan) => {
      p.changes[0]!.before!.startOffset = 1;
    }
  ],
  [
    "parágrafo nulo",
    (p: MutablePlan) => {
      Object.assign(p, { paragraphs: [null] });
    }
  ],
  [
    "mudança nula",
    (p: MutablePlan) => {
      Object.assign(p, { changes: [null] });
    }
  ],
  [
    "cobertura nula",
    (p: MutablePlan) => {
      Object.assign(p, { coverage: [null] });
    }
  ],
  [
    "cobertura omitida",
    (p: MutablePlan) => {
      p.coverage = [];
    }
  ],
  [
    "texto diferente do depois",
    (p: MutablePlan) => {
      p.changes[0]!.after = "Outro texto";
    }
  ],
  [
    "sem original",
    (p: MutablePlan) => {
      p.changes[0]!.before = null;
    }
  ],
  [
    "sem especialista",
    (p: MutablePlan) => {
      p.requiresSpecialist = false;
    }
  ],
  [
    "pendência aplicável",
    (p: MutablePlan) => {
      p.status = "needs_context";
      p.pending = ["Conferir fonte."];
    }
  ],
  [
    "mensagem com número inventado",
    (p: MutablePlan) => {
      p.message = "Aprovado com 500 votos.";
    }
  ],
  [
    "justificativa com número inventado",
    (p: MutablePlan) => {
      p.changes[0]!.reason = "Aprovado com 500 votos.";
    }
  ]
])("AC-7328: rejeita %s", (_, mutate) => {
  const plan = structuredClone(validPlan()) as MutablePlan;
  mutate(plan);
  expect(() => validateDocumentPlan(plan, request, [source])).toThrowError(DocumentDraftError);
});
it("AC-7329: revisor deve conferir cada parágrafo, alteração, fonte e proveniência", () => {
  const plan = validPlan(),
    review = approvedDocumentReview(plan, [source]);
  expect(validateDocumentReview(review, plan, [source], authoringHash([source]))).toEqual(review);
  for (const bad of [
    { ...review, paragraphs: [] },
    { ...review, changes: [null] },
    { ...review, sources: [] },
    { ...review, accepted: false },
    { ...review, sourceHash: "f".repeat(64) },
    { ...review, issues: ["Fato sem fonte."] }
  ])
    expect(() => validateDocumentReview(bad, plan, [source], authoringHash([source]))).toThrow();
  expect(() =>
    validateAuthoringRequest({ ...request, sourceText: "Texto não autorizado" })
  ).toThrow();
});
