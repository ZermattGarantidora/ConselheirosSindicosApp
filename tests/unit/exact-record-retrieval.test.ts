import { describe, it, expect } from "vitest";
import {
  containsExactRecordId,
  definesRecord
} from "../../apps/api/retrieval/exact-identifiers.js";
import { createScopedTextRetriever } from "../../apps/api/retrieval/text-retrieval.js";
import { createInMemoryScopedRetrievalIndex } from "../../apps/api/retrieval/in-memory-scoped-retrieval.js";
import { createEvidence, managerContext, bosque } from "./answer-fixtures.js";
describe("Spec 076 — ID exato", () => {
  it("AC7601: segue anexo referido pela cláusula sem dica na pergunta", async () => {
    const primary = createEvidence({
      id: "clause",
      documentVersionId: "contract",
      documentTitle: "Contrato de manutencao",
      content: "CLA-017: valor R$10,00. Consultar o anexo final."
    });
    const annex = createEvidence({
      id: "annex",
      documentVersionId: "contract",
      documentTitle: "Contrato de manutencao",
      pageNumber: 4,
      content: "ANEXO-ABC: o valor depende de aceite; excecao expressa."
    });
    const junk = Array.from({ length: 10 }, (_, i) =>
      createEvidence({
        id: `other${i}`,
        documentVersionId: `v${i}`,
        documentTitle: "Outro contrato",
        content: "Valor previsto no outro contrato."
      })
    );
    const result = await createScopedTextRetriever({
      async findAuthorizedCandidates() {
        return [primary, ...junk, annex];
      }
    }).search(managerContext, {
      query: "Qual o valor de CLA-017 no contrato de manutencao?",
      maxResults: 2
    });
    expect(result.evidence.map((e) => e.id)).toEqual(expect.arrayContaining(["clause", "annex"]));
  });
  it("AC7601: ID completo não é prefixo e linha própria precede referência", async () => {
    expect(containsExactRecordId("ART-00590", "ART-0059")).toBe(false);
    expect(containsExactRecordId("ART-0059A", "ART-0059")).toBe(false);
    expect(containsExactRecordId("art-0059|valor", "ART-0059")).toBe(true);
    expect(definesRecord("MIN-0059|proposta|ART-0059", "ART-0059")).toBe(false);
    expect(definesRecord("ART-0059|R$990,83", "ART-0059")).toBe(true);
    const own = createEvidence({
      id: "own",
      documentVersionId: "approved",
      content: "ART-0059|R$990,83|18dias|aprovado"
    });
    const chunks = [
      ...Array.from({ length: 15 }, (_, i) =>
        createEvidence({
          id: `draft${i}`,
          documentVersionId: "draft",
          validityStatus: "pending",
          content: `MIN-00${i}|ART-0059|proposta R$1.480,83`
        })
      ),
      createEvidence({
        id: "foreign",
        condominiumId: bosque,
        content: "ART-0059|CANARIO_BOSQUE_7Q9"
      }),
      own
    ];
    const found = await createScopedTextRetriever(
      createInMemoryScopedRetrievalIndex(chunks)
    ).search(managerContext, {
      query: "Na convenção aprovada, valor e prazo de ART-0059?",
      maxResults: 2
    });
    expect(found.evidence[0]!.id).toBe("own");
    expect(found.evidence.some((e) => e.condominiumId !== managerContext.condominiumId)).toBe(
      false
    );
  });
});
