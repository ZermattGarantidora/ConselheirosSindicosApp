import { describe, it, expect } from "vitest";
import { hasContradictoryTemporalOrder } from "../../apps/api/answers/answer-temporal-order.js";
import { createEvidence, createRetrievalResult, managerContext } from "./answer-fixtures.js";
import { createAnswerUseCase } from "../../apps/api/answers/answer-use-case.js";
import { createInMemoryAnswerPersistence } from "../../apps/api/answers/in-memory-answer-persistence.js";
import { createAnswerTelemetry } from "./answer-use-case.test-support.js";
import type { GeneratedAnswer } from "../../apps/api/answers/answer-contract.js";
const payload = (
  text: string,
  excerpt = "Assembleia em 08/03/2028. Início do mandato em 01/04/2028."
) => ({
  answer: text,
  citations: [
    {
      id: "synthetic",
      evidenceId: "synthetic",
      documentId: "synthetic",
      documentVersionId: "synthetic",
      title: "Ata fictícia",
      page: 1,
      excerpt,
      startOffset: 0,
      endOffset: excerpt.length
    }
  ]
});
describe("AC-5621 — veredito e datas", () => {
  it("mantém o reparo limitado ao receber veredito contraditório", async () => {
    const excerpt = "Assembleia em 08/03/2028. Início do mandato em 01/04/2028.";
    const source = createEvidence({
      id: "synthetic",
      documentId: "synthetic",
      documentVersionId: "synthetic",
      documentTitle: "Ata fictícia",
      content: excerpt
    });
    let attempts = 0;
    const useCase = createAnswerUseCase({
      retriever: {
        async search() {
          return createRetrievalResult([source]);
        }
      },
      persistence: createInMemoryAnswerPersistence(),
      gateway: {
        async generate(input) {
          attempts++;
          if (attempts === 2) expect(input.validationFeedback).toBe("temporal_order_mismatch");
          const output: GeneratedAnswer = {
            ...payload(
              (attempts === 1 ? "Sim." : "Não.") +
                " A assembleia foi em 08/03/2028, e o mandato começa em 01/04/2028.",
              excerpt
            ),
            answerMode: "grounded",
            attentionPoints: [],
            suggestedNextStep: null,
            specialist: { required: false, type: null, reason: null }
          };
          return { output, telemetry: createAnswerTelemetry() };
        }
      }
    });
    const answer = await useCase.ask(managerContext, {
      question: "O mandato começa antes da assembleia?",
      requestId: "synthetic-temporal-order"
    });
    expect(answer.answerMode).toBe("grounded");
    expect(answer.answer.startsWith("Não.")).toBe(true);
    expect(attempts).toBe(2);
  });
  it("recusa sim quando o mandato começa depois da assembleia", () => {
    expect(
      hasContradictoryTemporalOrder(
        "O mandato começa antes da assembleia?",
        payload("Sim. A assembleia foi em 08/03/2028, e o mandato começa em 01/04/2028.")
      )
    ).toBe(true);
    expect(
      hasContradictoryTemporalOrder(
        "O mandato começa antes da assembleia?",
        payload("Síndico, sim. A assembleia foi em 08/03/2028, e o mandato começa em 01/04/2028.")
      )
    ).toBe(true);
  });
  it.each([
    [
      "O mandato começa antes da assembleia?",
      "Não. A assembleia foi em 08/03/2028, e o mandato começa em 01/04/2028.",
      false
    ],
    [
      "O mandato começa depois da assembleia?",
      "Sim. A assembleia foi em 08/03/2028, e o mandato começa em 01/04/2028.",
      false
    ],
    [
      "O mandato começa depois da assembleia?",
      "Não. A assembleia foi em 08/03/2028, e o mandato começa em 01/04/2028.",
      true
    ],
    [
      "O mandato começa antes da assembleia?",
      "A assembleia foi em 08/03/2028, e o mandato começa em 01/04/2028.",
      false
    ],
    [
      "Qual a duração do mandato?",
      "Sim. A assembleia foi em 08/03/2028, e o mandato começa em 01/04/2028.",
      false
    ],
    ["O mandato começa antes da assembleia?", "Sim, mas preciso conferir as datas.", false],
    [
      "O mandato começa antes da assembleia?",
      "Sim. A assembleia foi em 8 de março de 2028, e o mandato começa em 1º de abril de 2028.",
      true
    ]
  ] as const)("controla comparação explícita e evita inferência", (question, text, expected) => {
    expect(hasContradictoryTemporalOrder(question, payload(text))).toBe(expected);
  });
  it("não usa data não citada e não considera data igual como antes", () => {
    expect(
      hasContradictoryTemporalOrder(
        "O mandato começa antes da assembleia?",
        payload(
          "Sim. A assembleia foi em 08/03/2028, e o mandato começa em 01/04/2028.",
          "Sem datas explícitas."
        )
      )
    ).toBe(false);
    expect(
      hasContradictoryTemporalOrder(
        "O mandato começa antes da assembleia?",
        payload("Sim. A assembleia foi em 08/03/2028, e o mandato começa em 08/03/2028.")
      )
    ).toBe(true);
  });
});
