import { randomUUID } from "node:crypto";
import { expect, it, vi } from "vitest";
import { createInMemoryConversationStore } from "../../apps/api/answers/conversation-store.js";
import { createDocumentDraftService } from "../../apps/api/authoring/document-drafts.js";
import { createDocumentImprovementService } from "../../apps/api/authoring/document-improvements.js";
import { managerContext } from "./answer-fixtures.js";
async function setup() {
  const store = createInMemoryConversationStore(),
    id = randomUUID();
  const scope = {
    kind: "chat" as const,
    userId: managerContext.userId,
    condominiumId: managerContext.condominiumId,
    chatId: randomUUID()
  };
  const now = () => new Date("2026-11-16T12:00:00Z");
  const drafts = createDocumentDraftService({
    store,
    catalog: { listAuthorized: async () => [] },
    now
  });
  const draft = await drafts.propose(
    managerContext,
    scope,
    id,
    {
      title: "Comunicado sintético",
      documentKind: "Comunicado",
      operation: "create",
      text: "FICTÍCIO. Manutenção  programada.\nValor informado: R$ 12,34.",
      changes: "Criação.",
      pending: "Conferir fatos antes de usar.",
      sources: []
    },
    0
  );
  const suggest = vi.fn(async () => ({
    message:
      "Posso separar os assuntos e ajustar os espaços deste comunicado. Quer conferir essa versão?",
    text: "FICTÍCIO. Manutenção programada.\n\nValor informado: R$ 12,34.",
    changes: "Espaços e separação de parágrafos; fatos preservados."
  }));
  const options = { store, drafts, now, authorize: async () => managerContext, agent: { suggest } };
  return {
    store,
    id,
    scope,
    draft,
    drafts,
    suggest,
    options,
    service: createDocumentImprovementService(options)
  };
}
it("AC-7322: oferta contextual, aceite revisável e confirmação separada, sem repetir agente", async () => {
  const f = await setup();
  const offer = await f.service.offer(managerContext, f.scope, f.id, 1);
  expect(offer?.changes).toContain("fatos preservados");
  expect(await f.service.offer(managerContext, f.scope, f.id, 1)).toEqual(offer);
  const revised = await f.service.decide(managerContext, f.scope, f.id, 1, f.draft.hash, true);
  expect(revised).toMatchObject({
    revision: 2,
    status: "awaiting_confirmation",
    pending: f.draft.pending,
    sources: []
  });
  expect(revised.hash).not.toBe(f.draft.hash);
  expect(await f.service.decide(managerContext, f.scope, f.id, 1, f.draft.hash, true)).toEqual(
    revised
  );
  await expect(
    f.drafts.download(managerContext, f.scope, f.id, revised.hash)
  ).rejects.toMatchObject({ statusCode: 409 });
  expect(f.suggest).toHaveBeenCalledTimes(1);
});
it("AC-7322: recusa encerra oferta sem nova sugestão nem revisão", async () => {
  const f = await setup();
  await f.service.offer(managerContext, f.scope, f.id, 1);
  await f.service.decide(managerContext, f.scope, f.id, 1, f.draft.hash, false);
  expect((await f.service.offer(managerContext, f.scope, f.id, 1))?.status).toBe("declined");
  expect((await f.drafts.read(managerContext, f.scope, f.id)).event).toBe(1);
  await expect(
    f.service.decide(managerContext, f.scope, f.id, 1, f.draft.hash, true)
  ).rejects.toMatchObject({ statusCode: 409 });
  expect(f.suggest).toHaveBeenCalledTimes(1);
});
it.each([
  "FICTÍCIO. Manutenção aprovada. Valor informado: R$ 12,34.",
  "FICTÍCIO. Manutenção programada. Valor informado: R$ 12.34.",
  "FICTÍCIO. Manutenção programada."
])("AC-7323: rejeita alteração de fatos ou números: %s", async (text) => {
  const f = await setup();
  f.suggest.mockResolvedValue({
    message: "Proposta inválida sintética",
    text,
    changes: "Mudança."
  });
  await expect(f.service.offer(managerContext, f.scope, f.id, 1)).rejects.toMatchObject({
    statusCode: 422
  });
  expect((await f.drafts.read(managerContext, f.scope, f.id)).hash).toBe(f.draft.hash);
});
it("AC-7323: concorrência e falha incerta conservam uma chamada", async () => {
  const f = await setup();
  f.suggest.mockRejectedValue(new Error("synthetic-unknown"));
  const results = await Promise.allSettled([
    f.service.offer(managerContext, f.scope, f.id, 1),
    f.service.offer(managerContext, f.scope, f.id, 1)
  ]);
  expect(results.every((r) => r.status === "rejected")).toBe(true);
  await expect(f.service.offer(managerContext, f.scope, f.id, 1)).rejects.toMatchObject({
    statusCode: 503
  });
  expect(f.suggest).toHaveBeenCalledTimes(1);
});
it("AC-7323: edição, confirmação e contexto cruzado invalidam oferta", async () => {
  const f = await setup();
  await f.service.offer(managerContext, f.scope, f.id, 1);
  await f.drafts.decide(managerContext, f.scope, f.id, 1, f.draft.hash, true, true);
  await expect(
    f.service.decide(managerContext, f.scope, f.id, 1, f.draft.hash, true)
  ).rejects.toMatchObject({ statusCode: 409 });
  await expect(
    f.service.offer(managerContext, { ...f.scope, chatId: randomUUID() }, f.id, 1)
  ).rejects.toMatchObject({ statusCode: 404 });
  await expect(
    f.service.offer(
      managerContext,
      { ...f.scope, userId: "foreign" as typeof managerContext.userId },
      f.id,
      1
    )
  ).rejects.toMatchObject({ statusCode: 403 });
});
it("AC-7311/7322: agente ausente não fabrica oferta nem grava tentativa", async () => {
  const f = await setup();
  expect(
    await createDocumentImprovementService({
      store: f.store,
      drafts: f.drafts,
      now: f.options.now,
      authorize: f.options.authorize
    }).offer(managerContext, f.scope, f.id, 1)
  ).toBeNull();
  expect((await f.store.list(f.scope)).entries).toHaveLength(1);
});

it("AC-7323: aceite concorrente não atribui outra edição à melhoria na recuperação", async () => {
  const f = await setup();
  await f.service.offer(managerContext, f.scope, f.id, 1);
  const append = f.store.append;
  f.store.append = async (scope, entry) => {
    if (entry.requestKey.endsWith(":decision")) {
      f.store.append = append;
      await f.drafts.propose(
        managerContext,
        f.scope,
        f.id,
        { ...f.draft, text: "FICTÍCIO. Outra edição humana concorrente." },
        1
      );
    }
    return append(scope, entry);
  };
  await expect(
    f.service.decide(managerContext, f.scope, f.id, 1, f.draft.hash, true)
  ).rejects.toMatchObject({ statusCode: 409 });
  await expect(
    f.service.decide(managerContext, f.scope, f.id, 1, f.draft.hash, true)
  ).rejects.toMatchObject({ statusCode: 409 });
  expect((await f.drafts.read(managerContext, f.scope, f.id)).text).toContain(
    "Outra edição humana"
  );
});
