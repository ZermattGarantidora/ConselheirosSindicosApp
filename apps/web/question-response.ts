import type { PublicAnswer } from "../api/answers/answer-contract.js";

/** O aviso depende do servidor, não de adivinhar no navegador qual ferramenta será usada. */
export async function readQuestionResponse(
  response: Response,
  onResearchStarted: () => void
): Promise<PublicAnswer> {
  const progress = response.headers.get("x-alvitra-progress") === "internet";
  if (progress) onResearchStarted();
  const data: unknown = await response.json();
  let status = response.status;
  let body = data;
  if (progress) {
    if (
      !data ||
      typeof data !== "object" ||
      !("statusCode" in data) ||
      !Number.isInteger(data.statusCode) ||
      Number(data.statusCode) < 200 ||
      Number(data.statusCode) > 599 ||
      !("body" in data)
    )
      throw new Error("A pesquisa não retornou uma resposta válida. Tente novamente.");
    status = Number(data.statusCode);
    body = data.body;
  }
  if (status >= 400)
    throw new Error(
      body && typeof body === "object" && "message" in body && typeof body.message === "string"
        ? body.message
        : "Não foi possível processar a pergunta."
    );
  if (
    !body ||
    typeof body !== "object" ||
    !("answer" in body) ||
    typeof body.answer !== "string" ||
    !body.answer.trim() ||
    !("answerId" in body) ||
    typeof body.answerId !== "string" ||
    !("questionId" in body) ||
    typeof body.questionId !== "string"
  )
    throw new Error("A resposta veio incompleta. Tente novamente.");
  return body as PublicAnswer;
}
