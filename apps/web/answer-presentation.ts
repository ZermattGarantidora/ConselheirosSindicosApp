export type AnswerMode = "grounded" | "abstained" | "conflict" | "failed";

export type AnswerStatusPresentation = Readonly<{
  label: string;
  tone: "conflict" | "failed";
}>;

const automaticDocumentaryLimitationPatterns = [
  /não encontrei (?:essa|a) informação nos documentos do condomínio/iu,
  /não foi possível consultar os documentos do condomínio/iu,
  /a resposta (?:abaixo )?é uma orientação geral/iu
];

export function getAnswerStatusPresentation(
  answerMode: AnswerMode
): AnswerStatusPresentation | null {
  if (answerMode === "conflict") {
    return { label: "Fontes em conflito", tone: "conflict" };
  }

  if (answerMode === "failed") {
    return { label: "Falha temporária", tone: "failed" };
  }

  return null;
}

export function isAutomaticDocumentaryLimitation(point: string): boolean {
  return automaticDocumentaryLimitationPatterns.some((pattern) => pattern.test(point));
}
