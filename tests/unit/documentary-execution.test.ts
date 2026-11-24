import { describe, it, expect } from "vitest";
import type { GeneratedAnswer } from "../../apps/api/answers/answer-contract.js";
import {
  hasUnprovenExecution,
  cleanTrailingSourceMarker
} from "../../apps/api/answers/documentary-execution.js";
import { answerFidelityFailure } from "../../apps/api/answers/answer-fidelity.js";
import { validateGeneratedAnswer } from "../../apps/api/answers/citation-validator.js";
import { createEvidence, createRetrievalResult, managerContext } from "./answer-fixtures.js";
import { createAnswerUseCase } from "../../apps/api/answers/answer-use-case.js";
import { createInMemoryAnswerPersistence } from "../../apps/api/answers/in-memory-answer-persistence.js";
import { createAnswerTelemetry } from "./answer-use-case.test-support.js";
const generated = (
  answer: string,
  excerpt = "Foi aprovado um piloto de reservas. O piloto está previsto para setembro. A ata não comprova que as providências foram executadas."
): GeneratedAnswer => ({
  answer,
  answerMode: "grounded",
  citations: [
    {
      evidenceId: "synthetic",
      documentId: "synthetic-document",
      documentVersionId: "synthetic-version",
      title: "Ata fictícia",
      page: 1,
      excerpt
    }
  ],
  attentionPoints: [],
  suggestedNextStep: null,
  specialist: { required: false, type: null, reason: null }
});
describe("AC-5620 — planejamento e execução", () => {
  it.each(["345,67", "980,00", "1.500,00"])(
    "AC-5622: negação de multa proposta não afirma valor vigente: %s",
    (value) => {
      const source = "A convenção não fixa valor de multa e não permite penalidade automática.";
      expect(
        answerFidelityFailure(
          generated(
            "**Estes arquivos não autorizam aplicar automaticamente uma multa de R$ " +
              value +
              ".**",
            source
          )
        )
      ).toBeUndefined();
      expect(
        answerFidelityFailure(
          generated(
            "Os arquivos não sustentam aplicação automática de multa de R$ " + value + ".",
            source
          )
        )
      ).toBeUndefined();
      expect(
        answerFidelityFailure(
          generated("Estes arquivos autorizam aplicar uma multa de R$ " + value + ".", source)
        )
      ).toBe("unsupported_monetary_assertion");
      expect(
        answerFidelityFailure(
          generated(
            "Estes arquivos não autorizam aplicar uma multa de R$ " +
              value +
              ", mas a multa vigente é de R$ 750,00.",
            source
          )
        )
      ).toBe("unsupported_monetary_assertion");
      expect(
        answerFidelityFailure(
          generated(
            "Estes arquivos não autorizam aplicar uma multa de R$ " +
              value +
              ", que é o valor vigente.",
            source
          )
        )
      ).toBe("unsupported_monetary_assertion");
    }
  );
  it("recusa a primeira saída e usa somente o reparo existente", async () => {
    const excerpt = "O piloto está previsto para setembro. A ata não comprova execução.";
    const evidence = createEvidence({
      id: "synthetic",
      documentId: "synthetic-document",
      documentVersionId: "synthetic-version",
      documentTitle: "Ata fictícia",
      content: excerpt
    });
    let attempts = 0;
    const useCase = createAnswerUseCase({
      retriever: {
        async search() {
          return createRetrievalResult([evidence]);
        }
      },
      persistence: createInMemoryAnswerPersistence(),
      gateway: {
        async generate(input) {
          attempts++;
          if (attempts === 2) expect(input.validationFeedback).toBe("unproven_execution_assertion");
          return {
            output: generated(
              attempts === 1
                ? "O piloto ocorreu em setembro."
                : "O piloto está previsto para setembro.",
              excerpt
            ),
            telemetry: createAnswerTelemetry()
          };
        }
      }
    });
    const answer = await useCase.ask(managerContext, {
      question: "Qual o período previsto do piloto?",
      requestId: "synthetic-execution-repair"
    });
    expect(answer.answerMode).toBe("grounded");
    expect(answer.answer).toBe("O piloto está previsto para setembro.");
    expect(attempts).toBe(2);
  });
  it("limpa a saída validada sem alterar as citações", () => {
    const excerpt = "O piloto está previsto para setembro.";
    const evidence = createEvidence({
      id: "synthetic",
      documentId: "synthetic-document",
      documentVersionId: "synthetic-version",
      documentTitle: "Ata fictícia",
      content: excerpt
    });
    const answer = validateGeneratedAnswer(
      generated("O piloto está previsto para setembro. 【Ata da assembleia】", excerpt),
      [evidence]
    );
    expect(answer.answer).toBe("O piloto está previsto para setembro.");
    expect(answer.citations[0]?.excerpt).toBe(excerpt);
  });
  it.each([
    "O piloto ocorreu de setembro a novembro.",
    "O piloto foi realizado em setembro.",
    "A obra foi concluída em junho."
  ])("recusa ocorrência sem comprovação: %s", (answer) => {
    const source = answer.startsWith("A obra")
      ? "A obra foi aprovada. A execução está prevista para junho."
      : "O piloto foi aprovado. O início está previsto para setembro.";
    expect(hasUnprovenExecution(generated(answer, source))).toBe(true);
    expect(answerFidelityFailure(generated(answer, source))).toBe("unproven_execution_assertion");
  });
  it.each([
    "O piloto está previsto de setembro a novembro.",
    "A ata não comprova que o piloto ocorreu.",
    "Se o piloto ocorreu, confira o relatório.",
    "Para confirmar se o piloto ocorreu, solicite o relatório.",
    "O piloto foi aprovado para setembro.",
    "A assembleia ocorreu em janeiro."
  ])("preserva limite, hipótese e aprovação: %s", (answer) => {
    expect(hasUnprovenExecution(generated(answer))).toBe(false);
  });
  it("permite execução comprovada e não usa aprovação como comprovação", () => {
    expect(
      hasUnprovenExecution(
        generated(
          "O piloto foi realizado em setembro.",
          "O piloto foi aprovado em agosto. O piloto foi realizado em setembro, conforme relatório anexado."
        )
      )
    ).toBe(false);
    expect(
      hasUnprovenExecution(
        generated(
          "O piloto ocorreu em setembro.",
          "O piloto foi aprovado. Não há comprovação de que o piloto ocorreu em setembro."
        )
      )
    ).toBe(true);
  });
});
describe("AC-5718 — fonte decorativa", () => {
  it("retira marcador solto sem tocar nos fatos", () => {
    expect(
      cleanTrailingSourceMarker("A decisão recebeu votos favoráveis. 【Ata da assembleia】", true)
    ).toBe("A decisão recebeu votos favoráveis.");
  });
  it.each([
    ["O título 【Ata da assembleia】 aparece no documento.", true],
    ["A decisão recebeu votos favoráveis. 【Ata da assembleia】", false],
    ["O campo literal é 【valor aprovado】", true],
    ["O documento não comprova execução.", true]
  ] as const)("preserva conteúdo literal ou sem fontes", (text, citations) => {
    expect(cleanTrailingSourceMarker(text, citations)).toBe(text);
  });
});
