import { randomUUID } from "node:crypto";
import { expect, it, vi } from "vitest";
import { createInMemoryConversationStore } from "../../apps/api/answers/conversation-store.js";
import { createDocumentDraftService } from "../../apps/api/authoring/document-drafts.js";
import { createDraftPdf } from "../../apps/api/authoring/draft-pdf.js";
import { extractPdfTextByPage } from "../../apps/api/documents/extract-pdf-text.js";
import {
  maximumDraftTextCharacters,
  type DocumentDraftContent
} from "../../apps/shared/document-draft.js";
import type { RegisteredDocument } from "../../apps/api/documents/document-catalog.js";
import { managerContext, advisorContext, bosque } from "./answer-fixtures.js";

const content: DocumentDraftContent = {
  title: "Convenção sintética — proposta",
  documentKind: "Convenção",
  operation: "revise",
  text: "FICTÍCIO. Ação de manutenção: R$ 12,34. “Revisão” • fim.",
  sources: [],
  changes: "Revisão de redação.",
  pending: "Validar em assembleia e com assessoria jurídica."
};
const scope = {
  kind: "chat" as const,
  userId: managerContext.userId,
  condominiumId: managerContext.condominiumId,
  chatId: randomUUID()
};
it("AC-7304/7324: PDF distingue blocos Word de páginas do original", async () => {
  const pdf = createDraftPdf(
    {
      ...content,
      sources: [
        {
          documentId: "document",
          documentVersionId: "version",
          page: 2,
          excerpt: "FICTÍCIO. Texto do bloco."
        }
      ]
    },
    1
  );
  const text = (await extractPdfTextByPage(pdf)).map((page) => page.extractedText).join(" ");
  expect(text).toContain("Word usa blocos de leitura");
  expect(text).toContain("localizador 2");
  expect(text).not.toContain("página 2. Trecho");
});
function setup() {
  const store = createInMemoryConversationStore();
  const catalog = { listAuthorized: vi.fn(async () => [] as RegisteredDocument[]) };
  const sources = {
    getAuthorizedPage: vi.fn(async () => ({
      documentId: "document",
      documentVersionId: "version",
      title: "Original",
      page: 1,
      content: "FICTÍCIO. Artigo 1. Manutenção autorizada."
    }))
  };
  return {
    store,
    catalog,
    sources,
    service: createDocumentDraftService({
      store,
      catalog,
      sources,
      now: () => new Date("2026-11-12T12:00:00Z")
    })
  };
}
it("AC-7301/02/04: preserva revisões, exige confirmação exata, recusa e retentativas idempotentes", async () => {
  const { service, store } = setup(),
    id = randomUUID();
  const first = await service.propose(managerContext, scope, id, content, 0);
  await expect(service.download(managerContext, scope, id, first.hash)).rejects.toMatchObject({
    statusCode: 409
  });
  await expect(
    service.decide(managerContext, scope, id, 1, "0".repeat(64), true, true)
  ).rejects.toMatchObject({ statusCode: 409 });
  await expect(
    service.decide(managerContext, scope, id, 1, first.hash, true, false)
  ).rejects.toMatchObject({ statusCode: 400 });
  const confirmed = await service.decide(managerContext, scope, id, 1, first.hash, true, true);
  expect(confirmed.status).toBe("confirmed");
  expect(await service.decide(managerContext, scope, id, 1, first.hash, true, true)).toEqual(
    confirmed
  );
  expect(
    (await service.download(managerContext, scope, id, first.hash)).subarray(0, 5).toString()
  ).toBe("%PDF-");
  const revised = await service.propose(
    managerContext,
    scope,
    id,
    { ...content, text: "FICTÍCIO. Outra revisão." },
    2
  );
  expect(revised.revision).toBe(2);
  await expect(service.download(managerContext, scope, id, first.hash)).rejects.toMatchObject({
    statusCode: 409
  });
  const declined = await service.decide(managerContext, scope, id, 3, revised.hash, false, false);
  expect(declined.status).toBe("declined");
  await expect(service.download(managerContext, scope, id, revised.hash)).rejects.toMatchObject({
    statusCode: 409
  });
  expect((await store.list(scope)).entries).toHaveLength(4);
  expect(
    (await store.list(scope)).entries.every((e) => e.messages.every((m) => m.role === "user"))
  ).toBe(true);
});
it("AC-7302/09: concorrência entre edição e confirmação não confirma conteúdo diferente", async () => {
  const { service } = setup(),
    id = randomUUID();
  const draft = await service.propose(managerContext, scope, id, content, 0);
  const results = await Promise.allSettled([
    service.decide(managerContext, scope, id, 1, draft.hash, true, true),
    service.propose(
      managerContext,
      scope,
      id,
      { ...content, text: "FICTÍCIO. Alteração concorrente." },
      1
    )
  ]);
  expect(results.filter((r) => r.status === "fulfilled")).toHaveLength(1);
  expect(results.filter((r) => r.status === "rejected")).toHaveLength(1);
});
it("AC-7303: isola usuário, condomínio, conversa e permissão de escrita", async () => {
  const { service } = setup(),
    id = randomUUID();
  await service.propose(managerContext, scope, id, content, 0);
  await expect(service.read(advisorContext, scope, id)).rejects.toMatchObject({ statusCode: 403 });
  await expect(
    service.read({ ...managerContext, condominiumId: bosque }, scope, id)
  ).rejects.toMatchObject({ statusCode: 403 });
  await expect(
    service.read(managerContext, { ...scope, chatId: randomUUID() }, id)
  ).rejects.toMatchObject({ statusCode: 404 });
});
it("AC-7303: revalida fonte completa e revogação antes de ler, confirmar e baixar", async () => {
  const { service, catalog, sources } = setup(),
    id = randomUUID();
  catalog.listAuthorized.mockResolvedValue([
    {
      condominiumId: managerContext.condominiumId,
      documentId: "document",
      documentVersionId: "version",
      processingStatus: "ready",
      validityStatus: "confirmed"
    } as RegisteredDocument
  ]);
  const draft = await service.propose(
    managerContext,
    scope,
    id,
    {
      ...content,
      sources: [
        { documentId: "document", documentVersionId: "version", page: 1, excerpt: "Artigo 1" }
      ]
    },
    0
  );
  await service.decide(managerContext, scope, id, 1, draft.hash, true, true);
  sources.getAuthorizedPage.mockResolvedValue({
    documentId: "document",
    documentVersionId: "version",
    title: "Original",
    page: 1,
    content: "FICTÍCIO. Artigo 1. Conteúdo diferente fora do trecho."
  });
  await expect(service.download(managerContext, scope, id, draft.hash)).rejects.toMatchObject({
    statusCode: 409
  });
  catalog.listAuthorized.mockResolvedValue([]);
  await expect(service.read(managerContext, scope, id)).rejects.toMatchObject({ statusCode: 409 });
});
it("AC-7308: PDF multipágina conserva acentos, pontuação, fim e palavras longas", async () => {
  const text =
    Array.from(
      { length: 120 },
      (_, i) => `Parágrafo ${i + 1}: ação, manutenção, R$ 12,34 — “revisão”.`
    ).join("\n") +
    "\n" +
    "x".repeat(170) +
    "\nFIM SINTÉTICO";
  const pdf = createDraftPdf({ ...content, text }, 1);
  const pages = await extractPdfTextByPage(pdf);
  expect(pages.length).toBeGreaterThan(2);
  const extracted = pages.map((p) => p.extractedText).join(" ");
  for (let i = 1; i <= 120; i++) expect(extracted).toContain(`Parágrafo ${i}: ação`);
  expect(extracted).toContain("FIM SINTÉTICO");
  expect(extracted).toContain("“revisão”");
  expect(() => createDraftPdf({ ...content, text: "FICTÍCIO. 😀" }, 1)).toThrow(/caracteres/u);
});
it.each([
  null,
  { ...content, text: "" },
  { ...content, text: "x".repeat(maximumDraftTextCharacters + 1) },
  { ...content, sources: [{ page: 0 }] },
  { ...content, title: "a\u0000" },
  { ...content, operation: "send" }
])("AC-7301: rejeita payload inválido %s", async (invalid) => {
  const { service } = setup();
  await expect(
    service.propose(managerContext, scope, randomUUID(), invalid, 0)
  ).rejects.toMatchObject({ statusCode: 400 });
});
