export type AnswerMode = "grounded" | "abstained" | "conflict" | "failed";

export type AnswerStatusPresentation = Readonly<{
  label: string;
  tone: "conflict" | "failed";
}>;

const automaticDocumentaryLimitationPatterns = [
  /não encontrei (?:essa|a) informação nos documentos do condomínio/iu,
  /não foi possível consultar os documentos do condomínio/iu,
  /a resposta (?:abaixo )?é uma orientação geral/iu,
  /Os trechos encontrados não sustentam uma resposta documental segura\. A orientação abaixo é geral e não confirma uma regra do condomínio\./u
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
