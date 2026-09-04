import type { AiGateway, AiGatewayInput, AiGatewayOutput } from "./answer-service.js";

function isUntrustedInstruction(sentence: string): boolean {
  return /\b(ignore|ignore as regras|revele|reveal|system prompt|instruc(?:ao|oes) do sistema)\b/iu.test(
    sentence
  );
}

function questionTerms(question: string): readonly string[] {
  return Object.freeze(
    question
      .normalize("NFD")
      .replaceAll(/[\u0300-\u036f]/gu, "")
      .toLowerCase()
      .split(/[^\p{L}\p{N}]+/u)
      .filter((term) => term.length >= 3)
  );
}

function selectExtractiveSentence(input: AiGatewayInput, content: string): string {
  const safeSentences = content
    .split(/(?<=[.!?])\s+/u)
    .map((sentence) => sentence.trim())
    .filter((sentence) => sentence.length > 0 && !isUntrustedInstruction(sentence));
  const terms = questionTerms(input.question);
  const matched = safeSentences.find((sentence) => {
    const normalized = sentence
      .normalize("NFD")
      .replaceAll(/[\u0300-\u036f]/gu, "")
      .toLowerCase();
    return terms.some((term) => normalized.includes(term));
  });

  return matched ?? safeSentences[0] ?? "";
}

/**
 * Adaptador exclusivamente local para desenvolvimento com corpus sintético.
 * Ele não interpreta nem amplia a evidência: devolve o primeiro trecho
 * autorizado como resposta e como citação verificável.
 */
export function createLocalExtractiveGateway(): AiGateway {
  return Object.freeze({
    async generate(input: AiGatewayInput): Promise<AiGatewayOutput> {
      const evidence = input.evidence[0];
      if (evidence === undefined) {
        throw new Error("O gateway extrativo exige ao menos uma evidência.");
      }

      const excerpt = selectExtractiveSentence(input, evidence.content);
      if (excerpt.length === 0) {
        throw new Error("Nenhum trecho seguro pôde ser extraído da evidência.");
      }

      return Object.freeze({
        mode: "grounded",
        citations: Object.freeze([{ evidenceId: evidence.id, excerpt }]),
        claims: Object.freeze([{ statement: excerpt, citationEvidenceIds: [evidence.id] }])
      });
    }
  });
}
