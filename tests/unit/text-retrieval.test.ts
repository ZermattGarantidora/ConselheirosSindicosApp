import { describe, expect, it } from "vitest";

import { createCondominiumId } from "../../apps/api/core/condominium-scope.js";
import type { AuthorizedCondominiumContext } from "../../apps/api/identity/authorized-condominium-context.js";
import {
  createScopedTextRetriever,
  lexicalScore
} from "../../apps/api/retrieval/text-retrieval.js";
import type { RetrievableChunk } from "../../apps/api/retrieval/retrieval-contract.js";

const alameda = createCondominiumId("alameda");
const bosque = createCondominiumId("bosque");
const context: AuthorizedCondominiumContext = {
  condominiumId: alameda,
  userId: "sindico-1" as AuthorizedCondominiumContext["userId"],
  roleKey: "manager",
  membershipRevision: "membership-1",
  permissions: ["document:read"]
};

function candidate(
  overrides: Partial<RetrievableChunk> & Pick<RetrievableChunk, "id" | "content">
): RetrievableChunk {
  return {
    id: overrides.id,
    condominiumId: overrides.condominiumId ?? alameda,
    documentId: overrides.documentId ?? "document-1",
    documentVersionId: overrides.documentVersionId ?? "version-1",
    documentVersionNumber: overrides.documentVersionNumber ?? 1,
    documentTitle: overrides.documentTitle ?? "Convenção sintética",
    documentType: overrides.documentType ?? "convention",
    sourceKind: overrides.sourceKind ?? "user_upload",
    pageId: overrides.pageId ?? "page-1",
    pageNumber: overrides.pageNumber ?? 1,
    startOffset: overrides.startOffset ?? 0,
    endOffset: overrides.endOffset ?? overrides.content.length,
    content: overrides.content,
    contentSha256: overrides.contentSha256 ?? "a".repeat(64),
    semanticScore: overrides.semanticScore ?? null,
    extractionMethod: overrides.extractionMethod ?? "pdf_text",
    qualityScore: overrides.qualityScore ?? 1,
    processingStatus: overrides.processingStatus ?? "ready",
    validityStatus: overrides.validityStatus ?? "confirmed",
    validFrom: overrides.validFrom ?? null,
    validUntil: overrides.validUntil ?? null
  };
}

describe("retrieval textual escopado", () => {
  it("ranqueia somente depois de filtrar tenant, estado, qualidade e vigência", async () => {
    const retriever = createScopedTextRetriever({
      async findAuthorizedCandidates() {
        return [
          candidate({
            id: "alameda-good",
            content: "A convenção permite uso residencial da vaga."
          }),
          candidate({
            id: "bosque-canary",
            condominiumId: bosque,
            content: "A convenção permite aluguel por temporada."
          }),
          candidate({
            id: "not-ready",
            content: "A convenção permite uso residencial.",
            processingStatus: "needs_review"
          }),
          candidate({
            id: "pending",
            content: "A convenção permite uso residencial.",
            validityStatus: "pending"
          }),
          candidate({
            id: "low-quality",
            content: "A convenção permite uso residencial.",
            qualityScore: 0.3
          })
        ];
      }
    });

    const result = await retriever.search(context, { query: "uso residencial" });

    expect(result.pipelineVersion).toBe("hybrid-v1");
    expect(result.candidateCount).toBe(4);
    expect(result.selectedCount).toBe(1);
    expect(result.evidence.map((item) => item.id)).toEqual(["alameda-good"]);
    expect(result.evidence[0]?.rank).toBe(1);
    expect(result.evidence[0]?.semanticScore).toBeNull();
    expect(result.queryHash).toMatch(/^[a-f0-9]{64}$/u);
  });

  it("considera a data histórica e rejeita entrada inválida", async () => {
    const retriever = createScopedTextRetriever({
      async findAuthorizedCandidates() {
        return [
          candidate({
            id: "old",
            content: "A convenção permite uso residencial.",
            validFrom: new Date("2020-01-01T00:00:00.000Z"),
            validUntil: new Date("2024-01-01T00:00:00.000Z")
          }),
          candidate({
            id: "current",
            content: "A convenção permite uso residencial.",
            documentVersionNumber: 2,
            validFrom: new Date("2024-01-01T00:00:00.000Z")
          })
        ];
      }
    });

    await expect(
      retriever.search(context, {
        query: "uso residencial",
        asOf: new Date("2023-01-01T00:00:00.000Z")
      })
    ).resolves.toMatchObject({ evidence: [{ id: "old" }] });
    await expect(retriever.search(context, { query: "   " })).rejects.toThrow("não pode ser vazia");
    await expect(retriever.search(context, { query: "regra", maxResults: 51 })).rejects.toThrow(
      "entre 1 e 50"
    );
    await expect(
      retriever.search(context, { query: "regra", minimumQualityScore: 2 })
    ).rejects.toThrow("entre 0 e 1");
  });

  it("normaliza acentos e não pontua uma consulta sem termos", () => {
    expect(lexicalScore("locação", "A regra trata de LOCACAO residencial.")).toBeGreaterThan(0);
    expect(lexicalScore("a", "qualquer conteúdo")).toBe(0);
  });

  it("aceita evidência sem coincidência lexical quando o sinal semântico é positivo", async () => {
    const retriever = createScopedTextRetriever({
      async findAuthorizedCandidates() {
        return [
          candidate({
            id: "semantic-only",
            content: "A matéria foi decidida.",
            semanticScore: 0.9
          })
        ];
      }
    });

    const result = await retriever.search(context, { query: "quórum reunião" });

    expect(result.evidence).toMatchObject([
      { id: "semantic-only", lexicalScore: 0, semanticScore: 0.9 }
    ]);
    expect(result.sufficiency.status).toBe("sufficient");
  });

  it("não consulta o índice sem permissão de leitura", async () => {
    let called = false;
    const retriever = createScopedTextRetriever({
      async findAuthorizedCandidates() {
        called = true;
        return [];
      }
    });

    const result = await retriever.search(
      { ...context, permissions: [] },
      { query: "qualquer regra" }
    );

    expect(called).toBe(false);
    expect(result.evidence).toEqual([]);
  });
});
