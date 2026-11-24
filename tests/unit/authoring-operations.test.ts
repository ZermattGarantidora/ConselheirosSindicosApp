import { randomUUID } from "node:crypto";
import { createAudioInputService } from "../../apps/api/authoring/audio-inputs.js";
import { createInMemoryChatRepository } from "../../apps/api/chats/chat-repository.js";
import { mkdir, mkdtemp, rm, readFile, writeFile } from "node:fs/promises";
import { resolve, join } from "node:path";
import { expect, it, vi } from "vitest";
import {
  createSyntheticAuthoringOperations,
  createSyntheticAuthoringLifecycleJournal,
  authoringOperationKinds
} from "../../apps/api/authoring/authoring-operations.js";
import { createSyntheticAuthoringBudget } from "../../apps/api/authoring/authoring-budget.js";
import { createDocumentDraftService } from "../../apps/api/authoring/document-drafts.js";
import { createDocumentAuthoringService } from "../../apps/api/authoring/document-authoring.js";
import { createDocumentImprovementService } from "../../apps/api/authoring/document-improvements.js";
import { budgetDigest } from "../../apps/api/security/operation-budget.js";
import type { BudgetPolicy } from "../../apps/api/security/operation-budget.js";
import { createCondominiumId } from "../../apps/api/core/condominium-scope.js";
import {
  createUserId,
  type AuthorizedCondominiumContext
} from "../../apps/api/identity/authorized-condominium-context.js";
import {
  memoryAuthoringArtifacts,
  syntheticAuthoringPolicies
} from "../fixtures/authoring-operations.js";
import { syntheticDocumentAuthoringModel } from "../fixtures/document-authoring.js";
import {
  syntheticAuthoringDocument,
  syntheticAuthoringText
} from "../fixtures/document-authoring.js";
const content = {
  title: "FICTÍCIO. Aviso",
  documentKind: "Comunicado",
  operation: "create" as const,
  text: "FICTÍCIO. Conferir  antes de usar.",
  sources: [],
  pending: "Conferir os fatos.",
  changes: "Criação."
};
async function setup(budgetOverride: Partial<BudgetPolicy> = {}) {
  await mkdir(resolve(".local/authoring-operations"), { recursive: true });
  const directory = await mkdtemp(resolve(".local/authoring-operations/unit-"));
  let clock = new Date("2026-11-16T12:00:00Z"),
    allowed = true;
  const now = () => clock,
    context: AuthorizedCondominiumContext = {
      condominiumId: createCondominiumId(randomUUID()),
      userId: createUserId(randomUUID()),
      roleKey: "manager",
      membershipRevision: "synthetic-member-v1",
      permissions: ["document:read", "document:upload"]
    };
  const scope = {
    kind: "chat" as const,
    userId: context.userId,
    condominiumId: context.condominiumId,
    chatId: randomUUID()
  };
  const memory = memoryAuthoringArtifacts(),
    policies = syntheticAuthoringPolicies(),
    journal = createSyntheticAuthoringLifecycleJournal({
      directory: join(directory, "lifecycle"),
      journalId: randomUUID(),
      confirmation: "synthetic-local-only"
    });
  await journal.initialize();
  Object.assign(policies.budget, budgetOverride);
  const budgetOptions = {
      directory: join(directory, "budget"),
      confirmation: "synthetic-local-only" as const,
      policy: policies.budget,
      now
    },
    budget = createSyntheticAuthoringBudget(budgetOptions);
  await budget.initialize();
  const authorize = async (c: AuthorizedCondominiumContext) => {
    if (!allowed) throw new Error("revoked");
    return c;
  };
  const options = {
    confirmation: "synthetic-local-only" as const,
    journal,
    artifacts: memory.artifacts,
    budget: budget.store,
    policy: policies.authoring,
    now,
    authorize
  };
  const operations = createSyntheticAuthoringOperations(options),
    drafts = createDocumentDraftService({
      store: memory.store,
      catalog: { listAuthorized: async () => [] },
      operations,
      now
    });
  return {
    directory,
    context,
    scope,
    ...memory,
    policies,
    journal,
    budgetOptions,
    budget,
    options,
    operations,
    drafts,
    now,
    expire: () => {
      clock = new Date("2026-11-16T13:00:00Z");
    },
    rollback: () => {
      clock = new Date("2026-11-16T11:59:59Z");
    },
    revoke: () => {
      allowed = false;
    },
    cleanup: () => rm(directory, { recursive: true, force: true }),
    ledger: async () =>
      JSON.parse(await readFile(join(directory, "budget", "operation-budgets.json"), "utf8")) as {
        receipts: {
          state: string;
          request: { kind: string; maximumCostMicrounits: number };
          actualCostMicrounits: number;
        }[];
      }
  };
}
it("AC-7333: seis finalidades compartilham cofre e contabilizam máximo após resultado salvo", async () => {
  const f = await setup();
  try {
    const id = randomUUID();
    await f.operations.open(f.context, f.scope, id);
    for (const kind of authoringOperationKinds)
      await f.operations.run(f.context, f.scope, id, kind, "one", budgetDigest(kind), async () => ({
        synthetic: true
      }));
    const ledger = await f.ledger();
    expect(ledger.receipts).toHaveLength(6);
    expect(
      ledger.receipts.every((r) => r.state === "completed" && r.actualCostMicrounits === 100)
    ).toBe(true);
    const call = vi.fn(async () => "duplicate");
    await expect(
      f.operations.run(
        f.context,
        f.scope,
        id,
        "document_write",
        "one",
        budgetDigest("document_write"),
        call
      )
    ).rejects.toMatchObject({ statusCode: 503 });
    expect(call).not.toHaveBeenCalled();
  } finally {
    await f.cleanup();
  }
});
it("AC-7333/34: concorrência, unknown, reinício e restore anterior não renovam envio ou consumo", async () => {
  const f = await setup();
  try {
    const id = randomUUID(),
      before = f.snapshot();
    await f.operations.open(f.context, f.scope, id);
    let release!: () => void;
    const hold = new Promise<void>((r) => {
      release = r;
    });
    const call = vi.fn(async () => {
      await hold;
      return "FICTÍCIO";
    });
    const first = f.operations.run(
      f.context,
      f.scope,
      id,
      "document_write",
      "write",
      budgetDigest("input"),
      call
    );
    await vi.waitFor(() => expect(call).toHaveBeenCalledTimes(1));
    await expect(
      f.operations.run(
        f.context,
        f.scope,
        id,
        "document_write",
        "write",
        budgetDigest("input"),
        call
      )
    ).rejects.toMatchObject({ statusCode: 503 });
    release();
    await first;
    f.restore(before);
    const restarted = createSyntheticAuthoringOperations({
      ...f.options,
      budget: createSyntheticAuthoringBudget(f.budgetOptions).store
    });
    await expect(
      restarted.run(f.context, f.scope, id, "document_write", "write", budgetDigest("input"), call)
    ).rejects.toMatchObject({ statusCode: 503 });
    expect(call).toHaveBeenCalledTimes(1);
    const fail = vi.fn(async () => {
      throw new Error("uncertain");
    });
    await expect(
      f.operations.run(
        f.context,
        f.scope,
        id,
        "document_review",
        "review",
        budgetDigest("review"),
        fail
      )
    ).rejects.toMatchObject({ statusCode: 503 });
    await expect(
      restarted.run(
        f.context,
        f.scope,
        id,
        "document_review",
        "review",
        budgetDigest("review"),
        fail
      )
    ).rejects.toMatchObject({ statusCode: 503 });
    expect(fail).toHaveBeenCalledTimes(1);
    expect((await f.ledger()).receipts.map((r) => r.state)).toEqual(["completed", "unknown"]);
  } finally {
    await f.cleanup();
  }
});
it("AC-7333: fonte persistida precede complete; replay conserva reserva unknown sem repetir agente", async () => {
  const f = await setup();
  try {
    let calls = 0;
    const original = f.budget.store.mutate.bind(f.budget.store);
    vi.spyOn(f.budget.store, "mutate").mockImplementation(async (action, ...args) => {
      if (action === "complete") {
        expect(
          (await f.store.find(f.scope, `document-authoring:${id}:write-result`))?.response.status
        ).toBe("completed");
        throw new Error("failure after result");
      }
      return original(action, ...args);
    });
    const id = randomUUID(),
      service = createDocumentAuthoringService({
        store: f.store,
        catalog: { listAuthorized: async () => [] },
        drafts: f.drafts,
        operations: f.operations,
        now: f.now,
        authorize: f.options.authorize,
        model: syntheticDocumentAuthoringModel(() => {
          calls++;
        })
      }),
      request = {
        title: content.title,
        documentKind: content.documentKind,
        operation: "create",
        request: "Prepare o aviso a partir do relato.",
        report: "FICTÍCIO. Limpeza prevista.",
        documentVersionIds: []
      };
    await expect(service.prepare(f.context, f.scope, id, request)).rejects.toMatchObject({
      statusCode: 503
    });
    expect(calls).toBe(1);
    vi.mocked(f.budget.store.mutate).mockRestore();
    expect((await service.prepare(f.context, f.scope, id, request)).status).toBe("offered");
    expect(calls).toBe(2);
    expect((await f.ledger()).receipts.map((r) => r.state)).toEqual(["unknown", "completed"]);
  } finally {
    await f.cleanup();
  }
});
it.each(["limit", "disabled", "missing-budget", "corrupt-journal", "revoked"])(
  "AC-7333/34: %s bloqueia chamada sem fallback",
  async (kind) => {
    const f = await setup(
      kind === "limit" ? { scopeDailyCost: 0 } : kind === "disabled" ? { enabled: false } : {}
    );
    try {
      const id = randomUUID();
      await f.operations.open(f.context, f.scope, id);
      const call = vi.fn(async () => "no");
      if (kind === "missing-budget")
        await rm(join(f.directory, "budget", "operation-budgets.json"));
      if (kind === "corrupt-journal")
        await writeFile(join(f.directory, "lifecycle", "index.json"), "{}");
      if (kind === "revoked") f.revoke();
      await expect(
        f.operations.run(
          f.context,
          f.scope,
          id,
          "document_write",
          "write",
          budgetDigest("input"),
          call
        )
      ).rejects.toBeInstanceOf(Error);
      expect(call).not.toHaveBeenCalled();
      if (kind === "limit")
        await expect(
          f.operations.run(
            f.context,
            f.scope,
            id,
            "document_write",
            "write",
            budgetDigest("input"),
            call
          )
        ).rejects.toMatchObject({ statusCode: 429 });
    } finally {
      await f.cleanup();
    }
  }
);
it("AC-7335: edição e confirmação não renovam TTL; expirado nega PDF/exportação e manutenção expurga", async () => {
  const f = await setup();
  try {
    const id = randomUUID();
    const draft = await f.drafts.propose(f.context, f.scope, id, content, 0);
    const edited = await f.drafts.propose(
      f.context,
      f.scope,
      id,
      { ...content, text: content.text + " Conferir." },
      1
    );
    await f.drafts.decide(f.context, f.scope, id, 2, edited.hash, true, true);
    const expires = (await f.journal.read())[0]!.expiresAt;
    expect(await f.drafts.export(f.context, f.scope, id)).toHaveProperty("entries");
    f.expire();
    for (const work of [
      () => f.drafts.read(f.context, f.scope, id),
      () => f.drafts.download(f.context, f.scope, id, edited.hash),
      () => f.drafts.export(f.context, f.scope, id),
      () => f.drafts.propose(f.context, f.scope, id, content, 3),
      () => f.drafts.decide(f.context, f.scope, id, 1, draft.hash, true, true)
    ])
      await expect(work()).rejects.toMatchObject({ statusCode: 404 });
    expect((await f.journal.read())[0]!.expiresAt).toBe(expires);
    expect(await f.operations.maintain(f.context, f.scope, 1)).toEqual({ purged: 1, remaining: 0 });
    expect(f.scopeRows(f.scope).every((e) => e.response.status === "purged")).toBe(true);
    expect(await f.operations.maintain(f.context, f.scope, 1)).toEqual({ purged: 0, remaining: 0 });
  } finally {
    await f.cleanup();
  }
});
it("AC-7336: expurgo segue filhos, conserva pai independente e reaplica após falha/restore", async () => {
  const f = await setup();
  try {
    const parent = randomUUID(),
      child = randomUUID(),
      other = randomUUID();
    for (const id of [parent, child, other]) await f.operations.open(f.context, f.scope, id);
    const append = async (id: string, source?: string) =>
      f.store.append(f.scope, {
        id: randomUUID(),
        createdAt: f.now().toISOString(),
        requestKey: `document-draft:${id}:1`,
        inputHash: budgetDigest(id),
        messages: [
          { id: randomUUID(), role: "user", kind: "question_answer", text: `FICTÍCIO. ${id}` }
        ],
        response: {
          draft: {
            id,
            text: "FICTÍCIO. CONTEÚDO",
            ...(source ? { authoringSource: { proposalId: source } } : {})
          }
        },
        metadata: { documentDraftId: id }
      });
    await append(parent);
    await append(child, parent);
    await append(other);
    const snapshot = f.snapshot();
    vi.spyOn(f.artifacts, "scrub").mockRejectedValueOnce(new Error("failure after tombstone"));
    await expect(f.operations.purge(f.context, f.scope, parent)).rejects.toThrow();
    await expect(f.operations.check(f.context, f.scope, other)).rejects.toMatchObject({
      statusCode: 503
    });
    await f.operations.maintain(f.context, f.scope, 20);
    expect(JSON.stringify(await f.operations.export(f.context, f.scope, other))).toContain(
      "CONTEÚDO"
    );
    expect(
      f
        .scopeRows(f.scope)
        .filter((e) => e.metadata.documentDraftId !== other)
        .every((e) => e.response.status === "purged")
    ).toBe(true);
    f.restore(snapshot);
    await expect(f.operations.check(f.context, f.scope, parent)).rejects.toMatchObject({
      statusCode: 503
    });
    await f.operations.maintain(f.context, f.scope);
    expect(
      f.scopeRows(f.scope).find((e) => e.metadata.documentDraftId === other)?.response
    ).toHaveProperty("draft");
  } finally {
    await f.cleanup();
  }
});
it("AC-7335/36: sem recibo, relógio regressivo e outro escopo negam entrega", async () => {
  const f = await setup();
  try {
    const id = randomUUID();
    await f.drafts.propose(f.context, f.scope, id, content, 0);
    await expect(
      f.operations.export(f.context, { ...f.scope, chatId: randomUUID() }, id)
    ).rejects.toMatchObject({ statusCode: 404 });
    f.rollback();
    await expect(f.operations.check(f.context, f.scope, id)).rejects.toMatchObject({
      statusCode: 503
    });
    const legacy = randomUUID();
    await f.store.append(f.scope, {
      id: randomUUID(),
      createdAt: f.now().toISOString(),
      requestKey: `document-draft:${legacy}:1`,
      inputHash: budgetDigest(legacy),
      messages: [{ id: randomUUID(), role: "user", kind: "question_answer", text: "FICTÍCIO" }],
      response: {},
      metadata: { documentDraftId: legacy }
    });
    await expect(f.operations.open(f.context, f.scope, legacy)).rejects.toMatchObject({
      statusCode: 503
    });
  } finally {
    await f.cleanup();
  }
});
it("AC-7333: melhoria editorial usa reserva própria e replay sem nova avaliação", async () => {
  const f = await setup();
  try {
    const id = randomUUID();
    await f.drafts.propose(f.context, f.scope, id, content, 0);
    const suggest = vi.fn(async () => ({
      message: "Posso ajustar o espaço para revisar?",
      text: content.text.replace("  ", " "),
      changes: "Espaço ajustado."
    }));
    const service = createDocumentImprovementService({
      store: f.store,
      drafts: f.drafts,
      operations: f.operations,
      now: f.now,
      authorize: f.options.authorize,
      agent: { suggest }
    });
    await service.offer(f.context, f.scope, id, 1);
    await service.offer(f.context, f.scope, id, 1);
    expect(suggest).toHaveBeenCalledTimes(1);
    expect((await f.ledger()).receipts[0]?.request.kind).toBe("document_improvement");
  } finally {
    await f.cleanup();
  }
});
it("AC-7336: exportação revalida fontes também das revisões históricas", async () => {
  const f = await setup();
  try {
    let visible = true;
    const doc = syntheticAuthoringDocument(f.context),
      source = {
        documentId: doc.documentId,
        documentVersionId: doc.documentVersionId,
        page: 1,
        excerpt: syntheticAuthoringText
      };
    const drafts = createDocumentDraftService({
        store: f.store,
        operations: f.operations,
        now: f.now,
        catalog: { listAuthorized: async () => (visible ? [doc] : []) },
        sources: {
          getAuthorizedPage: async () => ({
            ...source,
            title: doc.title,
            content: syntheticAuthoringText
          })
        }
      }),
      id = randomUUID();
    await drafts.propose(f.context, f.scope, id, { ...content, sources: [source] }, 0);
    await drafts.propose(f.context, f.scope, id, content, 1);
    visible = false;
    expect((await drafts.read(f.context, f.scope, id)).event).toBe(2);
    await expect(drafts.export(f.context, f.scope, id)).rejects.toMatchObject({ statusCode: 409 });
  } finally {
    await f.cleanup();
  }
});
it("AC-7336: identidade de áudio não pode ser usada como rascunho e apagar seu original", async () => {
  const f = await setup();
  try {
    const id = randomUUID();
    await f.operations.open(f.context, f.scope, id);
    await f.store.append(f.scope, {
      id: randomUUID(),
      createdAt: f.now().toISOString(),
      requestKey: `audio-input:${id}:received`,
      inputHash: budgetDigest("synthetic audio"),
      messages: [
        { id: randomUUID(), role: "user", kind: "question_answer", text: "FICTÍCIO. Áudio" }
      ],
      response: { status: "received" },
      metadata: { audioInputId: id }
    });
    await expect(f.drafts.propose(f.context, f.scope, id, content, 0)).rejects.toMatchObject({
      statusCode: 409
    });
    expect((await f.store.find(f.scope, `audio-input:${id}:received`))?.response.status).toBe(
      "received"
    );
  } finally {
    await f.cleanup();
  }
});
it("AC-7335: áudios recentes omitem título e pedido após expiração operacional", async () => {
  const f = await setup();
  try {
    const id = randomUUID();
    await f.operations.open(f.context, f.scope, id);
    const chats = createInMemoryChatRepository(f.now);
    await chats.create(f.context, { id: f.scope.chatId, title: "FICTÍCIO" });
    for (const stage of ["received", "result"]) {
      await f.store.append(f.scope, {
        id: randomUUID(),
        createdAt: f.now().toISOString(),
        requestKey: `audio-input:${id}:${stage}`,
        inputHash: budgetDigest(id),
        messages: [
          {
            id: randomUUID(),
            role: "user",
            kind: "question_answer",
            text: "FICTÍCIO. PEDIDO PRIVADO"
          }
        ],
        response:
          stage === "received"
            ? { status: "received" }
            : {
                status: "completed",
                input: { id, title: "FICTÍCIO. TÍTULO PRIVADO", mode: "dictation" }
              },
        metadata: { audioInputId: id }
      });
    }
    const audio = createAudioInputService({
      store: f.store,
      operations: f.operations,
      chats,
      storage: {
        storeOriginal: async () => ({ storageKey: "synthetic-only" }),
        removeOriginal: async () => {}
      },
      now: f.now
    });
    expect((await audio.recent(f.context, f.scope)).inputs).toHaveLength(1);
    const find = f.store.find.bind(f.store);
    vi.spyOn(f.store, "find").mockImplementation(async (scope, key) => {
      const entry = await find(scope, key);
      if (key.endsWith(":received")) f.expire();
      return entry;
    });
    await expect(audio.recent(f.context, f.scope)).rejects.toMatchObject({ statusCode: 404 });
    vi.mocked(f.store.find).mockRestore();
    expect((await audio.recent(f.context, f.scope)).inputs).toEqual([]);
    expect((await f.ledger()).receipts).toEqual([]);
  } finally {
    await f.cleanup();
  }
});
it("AC-7335: prazo vencido durante a leitura da fonte impede retornar o rascunho", async () => {
  const f = await setup();
  try {
    const id = randomUUID(),
      doc = syntheticAuthoringDocument(f.context);
    let expireOnRead = false;
    const drafts = createDocumentDraftService({
      store: f.store,
      operations: f.operations,
      now: f.now,
      catalog: { listAuthorized: async () => [doc] },
      sources: {
        getAuthorizedPage: async () => {
          if (expireOnRead) f.expire();
          return {
            documentId: doc.documentId,
            documentVersionId: doc.documentVersionId,
            title: doc.title,
            page: 1,
            content: syntheticAuthoringText
          };
        }
      }
    });
    await drafts.propose(
      f.context,
      f.scope,
      id,
      {
        ...content,
        sources: [
          {
            documentId: doc.documentId,
            documentVersionId: doc.documentVersionId,
            page: 1,
            excerpt: syntheticAuthoringText
          }
        ]
      },
      0
    );
    expireOnRead = true;
    await expect(drafts.read(f.context, f.scope, id)).rejects.toMatchObject({ statusCode: 404 });
  } finally {
    await f.cleanup();
  }
});
it("AC-7336: filho salvo durante a purga mantém quarentena e é recolhido na reaplicação", async () => {
  const f = await setup();
  try {
    const parent = randomUUID(),
      late = randomUUID();
    await f.drafts.propose(f.context, f.scope, parent, content, 0);
    await f.operations.open(f.context, f.scope, late);
    const scrub = f.artifacts.scrub.bind(f.artifacts);
    vi.spyOn(f.artifacts, "scrub").mockImplementationOnce(async (scope, ids) => {
      await scrub(scope, ids);
      await f.store.append(f.scope, {
        id: randomUUID(),
        createdAt: f.now().toISOString(),
        requestKey: `document-draft:${late}:1`,
        inputHash: budgetDigest(late),
        messages: [
          {
            id: randomUUID(),
            role: "user",
            kind: "question_answer",
            text: "FICTÍCIO. Filho concorrente"
          }
        ],
        response: {
          draft: { id: late, text: "FICTÍCIO. Texto", authoringSource: { proposalId: parent } }
        },
        metadata: { documentDraftId: late }
      });
    });
    await expect(f.operations.purge(f.context, f.scope, parent)).rejects.toMatchObject({
      statusCode: 503
    });
    await expect(f.operations.check(f.context, f.scope, late)).rejects.toMatchObject({
      statusCode: 503
    });
    await f.operations.maintain(f.context, f.scope);
    expect(f.scopeRows(f.scope).every((e) => e.response.status === "purged")).toBe(true);
    await expect(f.operations.check(f.context, f.scope, late)).rejects.toMatchObject({
      statusCode: 404
    });
  } finally {
    await f.cleanup();
  }
});
