import { describe, expect, it, vi } from "vitest";
import {
  documentConversationState,
  generateDocumentConversation
} from "../../apps/api/answers/document-conversation.js";
import {
  createLocalSyntheticAnswerGateway,
  type AnswerGateway
} from "../../apps/api/answers/answer-gateway.js";
import type { RegisteredDocument } from "../../apps/api/documents/document-catalog.js";
import { createCondominiumId } from "../../apps/api/core/condominium-scope.js";

const document: RegisteredDocument = {
  condominiumId: createCondominiumId("alameda"),
  documentId: "d1",
  documentVersionId: "v1",
  title: "Ata confidencial sintética.pdf",
  documentType: "meeting_minutes",
  versionNumber: 1,
  sizeBytes: 100,
  processingStatus: "needs_review",
  validityStatus: "confirmed",
  createdAt: "2026-10-27T00:00:00.000Z",
  expectedPageCount: 1,
  processedPageCount: 1,
  searchablePageCount: 1,
  unreadablePageNumbers: [],
  extractionCompleteness: 1,
  extractionMethod: "pdf_text",
  ocrQualityScore: null,
  condominiumCheck: {
    status: "pending",
    expectedName: "Residencial Alameda",
    detectedNames: ["Condomínio Bosque"],
    sources: [],
    resumeProcessingStatus: "ready"
  }
};
const template =
  "Vi [[DOCUMENT]] com o nome [[DETECTED]]. Posso usá-lo em [[CONDOMINIUM]], preservando o nome cadastrado?";
function gateway(answer = template): AnswerGateway {
  return {
    generate: vi.fn(async (input) => {
      const result = await createLocalSyntheticAnswerGateway().generate(input);
      return { ...result, output: { ...result.output, answer, citations: [] } };
    })
  };
}

describe("falas documentais — RQ-3703/AC-3706", () => {
  it("gera a fala sem enviar título, nomes ou identificadores ao provedor", async () => {
    const provider = gateway();
    const result = await generateDocumentConversation(
      provider,
      document,
      "status",
      "Residencial Alameda"
    );
    expect(result).toBe(
      "Vi “Ata confidencial sintética.pdf” com o nome “Condomínio Bosque”. Posso usá-lo em “Residencial Alameda”, preservando o nome cadastrado?"
    );
    const input = JSON.stringify(vi.mocked(provider.generate).mock.calls);
    for (const privateValue of [
      document.title,
      "Residencial Alameda",
      "Condomínio Bosque",
      "alameda"
    ])
      expect(input).not.toContain(privateValue);
    expect(input).toContain("confirmation_required");
    expect(vi.mocked(provider.generate).mock.calls[0]?.[0].evidence).toEqual([]);
    const metadata = JSON.parse(
      vi.mocked(provider.generate).mock.calls[0]![0].question.split("\n").at(-1)!
    );
    expect(metadata.processingStatus).toBe("ready");
  });

  it("insere dados não confiáveis uma vez, depois da geração", async () => {
    const result = await generateDocumentConversation(
      gateway(),
      { ...document, title: "[[CONDOMINIUM]] <script>alert(1)</script>" },
      "status",
      "Residencial Alameda"
    );
    expect(result).toContain("“[[CONDOMINIUM]] <script>alert(1)</script>”");
  });

  it.each([
    "",
    "Inventei uma resposta.",
    "[[DOCUMENT]] [[CONDOMINIUM]]",
    "[[DOCUMENT]] [[CONDOMINIUM]] [[DETECTED]] [[UNKNOWN]]",
    "x".repeat(1601)
  ])("recusa saída incompleta ou inválida: %s", async (answer) => {
    await expect(
      generateDocumentConversation(gateway(answer), document, "status", "Alameda")
    ).rejects.toThrow("Fala documental inválida");
  });

  it("recusa indisponibilidade, citações inventadas e confirmação sem decisão", async () => {
    await expect(
      generateDocumentConversation(undefined, document, "status", "Alameda")
    ).rejects.toThrow("indisponível");
    await expect(
      generateDocumentConversation(gateway(), document, "confirmed", "Alameda")
    ).rejects.toThrow("estado");
    const provider = gateway();
    const base = await provider.generate({
      question: "teste",
      task: "grounded_answer",
      riskClass: "low",
      evidence: [],
      budget: { maximumOutputTokens: 100, maximumCostMicrounits: 1 }
    });
    await expect(
      generateDocumentConversation(
        {
          generate: async () => ({ ...base, output: { ...base.output, citations: [{} as never] } })
        },
        document,
        "status",
        "Alameda"
      )
    ).rejects.toThrow("Fala documental inválida");
  });

  it("distingue decisão, leitura e vigência sem executar mudanças", async () => {
    const confirmed = {
      ...document,
      condominiumCheck: { ...document.condominiumCheck!, status: "confirmed" as const }
    };
    expect(documentConversationState(document, "status")).toBe("confirmation_required");
    expect(documentConversationState(document, "cancelled")).toBe("cancelled");
    expect(documentConversationState(confirmed, "cancelled")).toBeUndefined();
    expect(documentConversationState(confirmed, "confirmed")).toBe(
      "confirmed_needs_review_confirmed"
    );
    const { condominiumCheck, ...withoutCheck } = document;
    expect(documentConversationState(withoutCheck, "status")).toBe("needs_review_confirmed");
    await expect(
      generateDocumentConversation(gateway(), confirmed, "confirmed", "Alameda")
    ).resolves.toContain("Alameda");
    await expect(
      generateDocumentConversation(
        gateway("[[DOCUMENT]] continua bloqueado em [[CONDOMINIUM]]."),
        document,
        "cancelled",
        "Alameda"
      )
    ).resolves.toContain("bloqueado");
    expect(condominiumCheck?.status).toBe("pending");
  });
});
