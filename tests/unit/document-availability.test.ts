import { describe, expect, it, vi } from "vitest";
import type { GeneratedAnswer } from "../../apps/api/answers/answer-contract.js";
import type { AnswerGatewayInput } from "../../apps/api/answers/answer-gateway.js";
import { createAnswerUseCase } from "../../apps/api/answers/answer-use-case.js";
import { validateGeneratedAnswer } from "../../apps/api/answers/citation-validator.js";
import { createInMemoryAnswerPersistence } from "../../apps/api/answers/in-memory-answer-persistence.js";
import { generalAnswer } from "../../apps/api/answers/openai-answer-gateway.js";
import { createInMemoryScopedRetrievalIndex } from "../../apps/api/retrieval/in-memory-scoped-retrieval.js";
import { createScopedTextRetriever } from "../../apps/api/retrieval/text-retrieval.js";
import { createEvidence, managerContext } from "./answer-fixtures.js";
import { createAnswerTelemetry } from "./answer-use-case.test-support.js";

const statements = Array.from({ length: 5 }, (_, index) =>
  createEvidence({
    id: `statement-${index}`,
    documentId: `document-${index}`,
    documentVersionId: `version-${index}`,
    documentTitle: `balancete-sintetico-2026-0${index + 1}.pdf`,
    documentType: "other",
    content: "FICTÍCIO. Receitas: R$ 9.000,00. Despesas: R$ 7.000,00. Saldo final: R$ 2.000,00."
  })
);
const refusal =
  "Os cinco balancetes não estão disponíveis para mim nesta conversa. Envie os arquivos por aqui.";

describe("Spec 046 — disponibilidade documental", () => {
  it("recusa a ausência inventada dos cinco documentos recuperados", () => {
    expect(() => validateGeneratedAnswer(generalAnswer(refusal), statements)).toThrowError(
      expect.objectContaining({ code: "document_availability_mismatch" })
    );
  });

  it("recupera os cinco arquivos e repara a recusa com as mesmas fontes", async () => {
    const persistence = createInMemoryAnswerPersistence();
    const generate = vi.fn(async (input: AnswerGatewayInput) => ({
      output:
        input.validationFeedback === undefined
          ? generalAnswer(refusal)
          : ({
              answer:
                "Os balancetes recuperados apresentam receitas, despesas e saldo final; a conciliação depende dos extratos.",
              answerMode: "grounded",
              citations: input.evidence.map((source) => ({
                evidenceId: source.id,
                documentId: source.documentId,
                documentVersionId: source.documentVersionId,
                title: source.documentTitle,
                page: source.pageNumber,
                excerpt: source.content
              })),
              attentionPoints: [],
              suggestedNextStep: null,
              specialist: { required: false, type: null, reason: null },
              claims: []
            } as GeneratedAnswer),
      telemetry: createAnswerTelemetry()
    }));
    const answer = await createAnswerUseCase({
      persistence,
      gateway: { generate },
      retriever: createScopedTextRetriever(createInMemoryScopedRetrievalIndex(statements))
    }).ask(managerContext, {
      question: "Faça uma análise detalhada dos cinco balancetes enviados.",
      requestId: "available-statements"
    });
    expect(answer.answerMode).toBe("grounded");
    expect(answer.citations).toHaveLength(5);
    expect(generate).toHaveBeenCalledTimes(2);
    expect(generate.mock.calls[1]![0]).toMatchObject({
      question: generate.mock.calls[0]![0].question,
      evidence: generate.mock.calls[0]![0].evidence,
      validationFeedback: "document_availability_mismatch"
    });
    expect(
      persistence.getInteraction(answer.answerId)!.invocations.map((item) => item.errorCode)
    ).toEqual(["document_availability_mismatch", null]);
  });

  it.each([
    "Não recebi documentos.",
    "Não tenho acesso aos arquivos do condomínio.",
    "Gestor, os cinco balancetes não estão disponíveis para mim nesta conversa.",
    "Os 5 balancetes que você enviou não estão acessíveis aqui.",
    "Não consigo consultar os balancetes.",
    "Não consigo acessar o arquivo para conferir a convenção; anexe o PDF aqui.",
    "Não localizei nenhum anexo.",
    "O arquivo não foi recebido.",
    "Não tenho um balancete.",
    "Não tenho dois balancetes.",
    "Não tenho três balancetes.",
    "Não tenho quatro balancetes."
  ])("recusa negação explícita: %s", (text) => {
    expect(() => validateGeneratedAnswer(generalAnswer(text), statements)).toThrowError(
      expect.objectContaining({ code: "document_availability_mismatch" })
    );
  });

  it.each([
    "Não recebi os extratos para conciliar os balancetes.",
    "Não encontrei o saldo inicial nos balancetes.",
    "Não tenho os balancetes de junho.",
    "Os balancetes de junho não estão disponíveis.",
    "Os cinco balancetes não estão disponíveis em versão legível.",
    "Não tenho os cinco balancetes aprovados.",
    "Não consegui validar a análise dos cinco balancetes.",
    "Não recebi os seis balancetes.",
    "Não recebi 12 arquivos.",
    "Se não recebi os documentos, preciso verificar o envio.",
    "Você disse: 'Não recebi documentos'.",
    "Os balancetes foram recebidos; não foi possível verificar a conciliação.",
    "Os trechos dos balancetes não sustentam a conclusão solicitada."
  ])("preserva lacuna ou abstenção legítima: %s", (text) => {
    expect(() => validateGeneratedAnswer(generalAnswer(text), statements)).not.toThrow();
  });

  it("não confunde páginas ou versões com cinco documentos distintos", () => {
    const pages = statements.map((source) => ({ ...source, documentId: "one-document" }));
    expect(() => validateGeneratedAnswer(generalAnswer(refusal), pages)).not.toThrow();
    expect(() => validateGeneratedAnswer(generalAnswer(refusal), [statements[0]!])).not.toThrow();
  });

  it("não infere arquivo local recebido de lei ou de evidência ausente", () => {
    const legal = statements.map((source) => ({ ...source, sourceScope: "legislation" as const }));
    for (const evidence of [[], legal])
      expect(() =>
        validateGeneratedAnswer(generalAnswer("Não recebi documentos."), evidence)
      ).not.toThrow();
    expect(() => validateGeneratedAnswer(generalAnswer(refusal), [createEvidence()])).not.toThrow();
  });

  it.each(["attentionPoints", "suggestedNextStep"] as const)(
    "verifica contradição em %s",
    (field) => {
      const output = {
        ...generalAnswer("Não foi possível validar esta análise."),
        [field]: field === "attentionPoints" ? [refusal] : refusal
      };
      expect(() => validateGeneratedAnswer(output, statements)).toThrowError(
        expect.objectContaining({ code: "document_availability_mismatch" })
      );
    }
  );

  it("duas recusas conservam o limite de validação sem novo pedido de upload", async () => {
    const generate = vi.fn(async () => ({
      output: generalAnswer(refusal),
      telemetry: createAnswerTelemetry()
    }));
    const answer = await createAnswerUseCase({
      gateway: { generate },
      persistence: createInMemoryAnswerPersistence(),
      retriever: createScopedTextRetriever(createInMemoryScopedRetrievalIndex(statements))
    }).ask(managerContext, {
      question: "Analise os cinco balancetes enviados.",
      requestId: "repeated-refusal"
    });
    expect(generate).toHaveBeenCalledTimes(2);
    expect(answer.answerMode).toBe("abstained");
    expect(answer.answer).toContain("Tenho os documentos disponíveis");
    expect(answer.answer).toContain("não consegui concluir esta resposta");
    expect(answer.answer).not.toContain("Envie os arquivos");
    expect(answer.suggestedNextStep).toBeNull();
    expect(answer.attentionPoints).toEqual([]);
  });
});
