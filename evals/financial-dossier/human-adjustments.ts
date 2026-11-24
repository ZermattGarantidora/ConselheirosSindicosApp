import assert from "node:assert/strict";
import { randomUUID } from "node:crypto";
import { writeFile } from "node:fs/promises";
import { join } from "node:path";
import { createInMemoryConversationStore } from "../../apps/api/answers/conversation-store.js";
import { createDocumentAuthoringService } from "../../apps/api/authoring/document-authoring.js";
import { createDocumentDraftService } from "../../apps/api/authoring/document-drafts.js";
import type { createLocalCodexAuthoringModels } from "../../apps/api/authoring/codex-authoring-model.js";
import { syntheticAuthoringDocument } from "../../tests/fixtures/document-authoring.js";
import { managerContext } from "../../tests/unit/answer-fixtures.js";
export async function proveHumanAdjustments(
  models: ReturnType<typeof createLocalCodexAuthoringModels>,
  directory: string
) {
  const results = [];
  for (const [id, text, kind] of [
    [
      "H073-001",
      "FICTÍCIO. A reserva do salão deve ser solicitada com antecedência de 24 horas.",
      "Comunicado"
    ],
    [
      "H073-002",
      "FICTÍCIO. O síndico relata umidade no corredor e suspeita de vazamento. A causa não foi apurada.",
      "Relato"
    ]
  ] as const) {
    const document = syntheticAuthoringDocument(managerContext),
      store = createInMemoryConversationStore();
    const catalog = {
      async listAuthorized() {
        return id === "H073-001" ? [document] : [];
      }
    };
    const sources = {
      async getAuthorizedPage() {
        return {
          documentId: document.documentId,
          documentVersionId: document.documentVersionId,
          title: document.title,
          page: 1,
          content: text
        };
      }
    };
    const now = () => new Date("2026-11-18T12:00:00Z"),
      scope = {
        kind: "chat" as const,
        condominiumId: managerContext.condominiumId,
        userId: managerContext.userId,
        chatId: randomUUID()
      };
    const drafts = createDocumentDraftService({
      store,
      catalog,
      sources,
      now,
      authoringSource: (c, s, i) => service.reference(c, s, i)
    });
    const service: ReturnType<typeof createDocumentAuthoringService> =
      createDocumentAuthoringService({
        store,
        catalog,
        sources,
        drafts,
        now,
        model: models.document,
        authorize: async () => managerContext,
        timeoutMs: 60000
      });
    const request = {
      title: `FICTÍCIO - ${kind}`,
      documentKind: kind,
      operation: "create" as const,
      request:
        "Reproduza integralmente a fonte em um único parágrafo, sem ampliar seu significado. É texto simples para conferência do síndico. Não exigir revisão especializada da redação. Quando houver suspeita de vazamento, conservar em pendência a apuração da causa por responsável técnico.",
      report: id === "H073-002" ? text : "",
      documentVersionIds: id === "H073-001" ? [document.documentVersionId] : []
    };
    const proposal = await service.prepare(managerContext, scope, randomUUID(), request);
    assert.equal(proposal.plan.requiresSpecialist, false);
    assert.equal(proposal.plan.paragraphs.map((p) => p.text).join("\n"), text);
    if (id === "H073-002") assert.match(proposal.plan.pending.join(" "), /técnic|tecnic/iu);
    const result = {
      id,
      passed: true,
      source: text,
      result: proposal.plan,
      sourceHash: proposal.sourceHash,
      proposalHash: proposal.hash,
      humanRevalidated: false,
      technicalInvestigationPreserved: id === "H073-002",
      meaning: "Correção técnica e por modelo; decisões humanas originais preservadas."
    };
    await writeFile(join(directory, `${id}-corrected.json`), JSON.stringify(result, null, 2));
    results.push(result);
  }
  return results;
}
