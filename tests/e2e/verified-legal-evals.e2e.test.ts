import { describe, expect, it } from "vitest";
import { createCondominiumId } from "../../apps/api/core/condominium-scope.js";
import type { AuthorizedCondominiumContext } from "../../apps/api/identity/authorized-condominium-context.js";
import { createDevelopmentIdentityRepository } from "../../apps/api/identity/development-identity-repository.js";
import { createVerifiedLegalLibrary } from "../../apps/api/legislation/verified-legal-library.js";
import { createScopedTextRetriever } from "../../apps/api/retrieval/text-retrieval.js";
import { createDevelopmentDocumentSourceReader } from "../../apps/api/documents/document-source.js";
import { createApi } from "../../apps/api/app/create-api.js";
import { createAnswerUseCase } from "../../apps/api/answers/answer-use-case.js";
import { createLocalSyntheticAnswerGateway } from "../../apps/api/answers/answer-gateway.js";
import { createInMemoryAnswerPersistence } from "../../apps/api/answers/in-memory-answer-persistence.js";
import { legalContentHash } from "../../apps/api/legislation/legal-edition-contract.js";

const library = createVerifiedLegalLibrary();
const emptyIndex = { findAuthorizedCandidates: async () => [] };
const retriever = createScopedTextRetriever(library.composeIndex(emptyIndex));
const currentDate = new Date("2026-10-22T12:00:00Z");
const context: AuthorizedCondominiumContext = {
  condominiumId: createCondominiumId("alameda"),
  userId: "sindico-demo" as AuthorizedCondominiumContext["userId"],
  roleKey: "manager",
  membershipRevision: "v1",
  permissions: ["document:read"]
};

const cases = [
  [
    "Assembleia eletrônica deve preservar voz debate voto?",
    "civil-code-condominium",
    "direitos de voz, de debate e de voto"
  ],
  [
    "Qual quórum para alteração da convenção e mudança da destinação?",
    "civil-code-condominium",
    "2/3 (dois terços)"
  ],
  [
    "Quais juros moratórios multa contribuição em atraso?",
    "civil-code-condominium",
    "juros estabelecidos no art. 406"
  ],
  [
    "Como é calculada a taxa legal de juros Selic?",
    "civil-code-condominium",
    "deduzido o índice de atualização monetária"
  ],
  [
    "Obras úteis e voluptuárias dependem de qual aprovação?",
    "civil-code-condominium",
    "se úteis, de voto da maioria"
  ],
  [
    "Seguro obrigatório da edificação contra incêndio destruição?",
    "civil-code-condominium",
    "É obrigatório o seguro"
  ],
  [
    "Qual obrigação de prestar contas anualmente e elaborar orçamento?",
    "civil-code-condominium",
    "prestar contas à assembléia, anualmente"
  ],
  [
    "Despesas extraordinárias pintura fachadas fundo de reserva: locador?",
    "lease-expenses",
    "pagar as despesas extraordinárias"
  ],
  [
    "Locatário paga despesas ordinárias manutenção elevadores?",
    "lease-expenses",
    "manutenção e conservação de elevadores"
  ],
  [
    "Dados pessoais: princípio necessidade mínimo necessário?",
    "personal-data-protection",
    "necessidade: limitação do tratamento"
  ],
  [
    "Agentes de tratamento medidas segurança dados pessoais acessos não autorizados?",
    "personal-data-protection",
    "Os agentes de tratamento devem adotar"
  ],
  [
    "Contribuições ordinárias extraordinárias títulos executivos documentalmente comprovadas?",
    "civil-procedure-condominium",
    "desde que documentalmente comprovadas"
  ],
  [
    "Contratos de seguro seguradora pagamento prêmio riscos predeterminados?",
    "insurance-law",
    "riscos predeterminados"
  ],
  [
    "Lei de seguro revogação arts. 757 a 802 vigência?",
    "insurance-law",
    "após decorrido 1 (um) ano"
  ],
  [
    "Piscinas dispositivos segurança sucção cabelos?",
    "pool-safety",
    "sucção de partes do corpo humano"
  ]
] as const;

describe("AC-3907 — evals legais sintéticos sem provedor", () => {
  it.each(cases)("recupera fonte conferível: %s", async (query, key, excerpt) => {
    const result = await retriever.search(context, { query, asOf: currentDate });
    expect(result.sufficiency.status).toBe("sufficient");
    const source = library.sources.find(
      (item) =>
        item.officialUrl ===
        {
          "civil-code-condominium":
            "https://www.planalto.gov.br/ccivil_03/leis/2002/l10406compilada.htm",
          "lease-expenses": "https://www.planalto.gov.br/ccivil_03/leis/l8245.htm",
          "personal-data-protection":
            "https://www.planalto.gov.br/ccivil_03/_ato2015-2018/2018/lei/l13709compilado.htm",
          "civil-procedure-condominium":
            "https://www.planalto.gov.br/ccivil_03/_ato2015-2018/2015/lei/l13105.htm",
          "insurance-law":
            "https://www.planalto.gov.br/ccivil_03/_ato2023-2026/2024/lei/l15040.htm",
          "pool-safety": "https://www.planalto.gov.br/ccivil_03/_ato2019-2022/2022/lei/l14327.htm"
        }[key]
    )!;
    // Quebras físicas do PDF não alteram a frase; offsets continuam conferidos literalmente abaixo.
    const evidence = result.evidence.find(
      (item) =>
        item.documentId === source.id && item.content.replace(/\s+/gu, " ").includes(excerpt)
    );
    expect(evidence).toBeDefined();
    expect(evidence!.sourceScope).toBe("legislation");
    const page = source.pages.find((item) => item.pageNumber === evidence!.pageNumber)!;
    expect(Array.from(page.text).slice(evidence!.startOffset, evidence!.endOffset).join("")).toBe(
      evidence!.content
    );
  });

  it.each([
    "Quem é o síndico?",
    "Lei municipal de ruído em Campinas",
    "Qual foi a empresa eleita para o contrato?"
  ])("abstém da conclusão documental sem fonte: %s", async (query) => {
    expect((await retriever.search(context, { query, asOf: currentDate })).evidence).toEqual([]);
  });

  it.each(["2026-10-21", "2026-11-21"])(
    "não usa conferência fora do intervalo: %s",
    async (date) => {
      expect(
        (await retriever.search(context, { query: cases[0][0], asOf: new Date(date) })).evidence
      ).toEqual([]);
    }
  );

  it("HTTP: cita legislação, abre a página e o PDF, revalida autorização a cada acesso", async () => {
    const repository = createDevelopmentIdentityRepository();
    let revoked = false;
    const app = createApi({
      membershipRepository: {
        async findMembership(input) {
          const membership = await repository.findMembership(input);
          return membership === undefined || !revoked
            ? membership
            : { ...membership, status: "revoked" };
        }
      },
      now: () => currentDate,
      retriever,
      legalCopyReader: library,
      documentSourceReader: library.composeReader(createDevelopmentDocumentSourceReader([])),
      answerUseCase: createAnswerUseCase({
        retriever,
        gateway: {
          async generate(input) {
            // Fixture extrativa: verifica o contrato HTTP/citação, sem simular qualidade de interpretação de IA.
            const base = await createLocalSyntheticAnswerGateway().generate(input);
            const evidence = input.evidence[0]!;
            const output = {
              answer: `Texto legal recuperado para conferência: ${evidence.content}`,
              answerMode: "grounded" as const,
              citations: [
                {
                  evidenceId: evidence.id,
                  documentId: evidence.documentId,
                  documentVersionId: evidence.documentVersionId,
                  title: evidence.documentTitle,
                  page: evidence.pageNumber,
                  excerpt: evidence.content,
                  sourceScope: evidence.sourceScope ?? "condominium",
                  startOffset: evidence.startOffset,
                  endOffset: evidence.endOffset
                }
              ],
              attentionPoints: ["Cópia de consulta parcial; não confirma fatos locais."],
              suggestedNextStep: null,
              specialist: { required: false, type: null, reason: null },
              claims: [
                {
                  statement: evidence.content,
                  claimType: "interpretation" as const,
                  evidenceRequired: true,
                  citationEvidenceIds: [evidence.id]
                }
              ]
            };
            return {
              output,
              telemetry: { ...base.telemetry, outputHash: legalContentHash(JSON.stringify(output)) }
            };
          }
        },
        persistence: createInMemoryAnswerPersistence(),
        now: () => currentDate
      })
    });
    try {
      const headers = { "x-development-user-id": "sindico-demo" };
      const answer = await app.inject({
        method: "POST",
        url: "/v1/condominiums/alameda/questions",
        headers,
        payload: { question: cases[0][0] }
      });
      expect(answer.statusCode).toBe(200);
      expect(answer.json().answerMode).toBe("grounded");
      const citation = answer.json().citations[0];
      expect(citation).toMatchObject({
        sourceScope: "legislation",
        title: expect.stringContaining("copia de consulta")
      });
      const source = library.sources.find((item) => item.id === citation.documentId)!;
      const pageUrl = `/v1/condominiums/alameda/documents/${source.id}/versions/${source.versionId}/pages/${citation.page}`;
      const page = await app.inject({ method: "GET", url: pageUrl, headers });
      expect(page.statusCode).toBe(200);
      expect(page.json().content).toContain(citation.excerpt);
      expect(page.json().officialUrl).toBe(source.officialUrl);
      const url = `/v1/condominiums/alameda/legal-sources/${source.id}/versions/${source.versionId}/copy`;
      const copy = await app.inject({ method: "GET", url, headers });
      expect(copy.statusCode).toBe(200);
      expect(copy.headers["content-type"]).toContain("application/pdf");
      expect(copy.headers["cache-control"]).toBe("private, no-store");
      expect(legalContentHash(copy.rawPayload)).toBe(source.pdfSha256);
      expect((await app.inject({ method: "GET", url })).statusCode).toBe(401);
      expect(
        (
          await app.inject({
            method: "GET",
            url: url.replace("alameda", "bosque"),
            headers: { "x-development-user-id": "morador-alameda-demo" }
          })
        ).statusCode
      ).toBe(403);
      expect(
        (
          await app.inject({
            method: "GET",
            url: url.replace(source.versionId, "versao-inexistente"),
            headers
          })
        ).statusCode
      ).toBe(404);
      revoked = true;
      expect((await app.inject({ method: "GET", url, headers })).statusCode).toBe(403);
      expect((await app.inject({ method: "GET", url: pageUrl, headers })).statusCode).toBe(403);
    } finally {
      await app.close();
    }
  });
});
