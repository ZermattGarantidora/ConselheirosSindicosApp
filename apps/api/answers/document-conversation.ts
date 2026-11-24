import type { AnswerGateway } from "./answer-gateway.js";
import type { RegisteredDocument } from "../documents/document-catalog.js";

export type DocumentConversationEvent = "received" | "status" | "confirmed" | "cancelled";

export function documentConversationState(
  document: RegisteredDocument,
  event: DocumentConversationEvent
): string | undefined {
  if (event === "received") return "received";
  const check = document.condominiumCheck;
  if (event === "cancelled") return check?.status === "pending" ? "cancelled" : undefined;
  if (event === "confirmed" && check?.status !== "confirmed") return undefined;
  if (check?.status === "pending") return "confirmation_required";
  return `${check?.status === "confirmed" ? "confirmed_" : ""}${document.processingStatus}_${document.validityStatus}`;
}

export async function generateDocumentConversation(
  gateway: AnswerGateway | undefined,
  document: RegisteredDocument,
  event: DocumentConversationEvent,
  condominiumName: string,
  hasSnapshot = false
): Promise<string> {
  if (gateway === undefined) throw new Error("A Alvitra está indisponível no momento.");
  const state = documentConversationState(document, event);
  if (state === undefined) throw new Error("O estado do documento mudou.");
  // Only operational enums leave this process. Names and filenames are inserted locally,
  // after generation, and never become provider input or executable instructions.
  const result = await gateway.generate({
    question: [
      "Converse com o síndico sobre o estado de um anexo. Escreva somente a próxima fala da Alvitra, curta e natural, sem título, aviso de sistema ou lista.",
      "Fale como uma consultora acessível e proativa: explique o que falta e o próximo passo com palavras comuns, sem prefixos como ATENÇÃO ou jargão contábil.",
      "Use literalmente [[DOCUMENT]] para o arquivo e [[CONDOMINIUM]] para o condomínio selecionado, em todas as respostas. São marcadores substituídos localmente; não invente nomes nem fatos do arquivo.",
      "Se received, confirme o recebimento e diga que vai trazer uma leitura inicial na conversa. Ainda não afirme ter lido ou analisado o conteúdo, nem pergunte o que a pessoa quer fazer.",
      "Se hasSnapshot, confirme o recebimento/autorização e apresente o raio-X inicial que acompanha esta fala. Os dados serão inseridos localmente; não invente fatos e não exija uma nova pergunta para entregar o resumo.",
      "Se confirmation_required, use também [[DETECTED]] para os nomes identificados no arquivo, pergunte se pode usá-lo no condomínio selecionado e explique que o nome cadastrado será preservado. Ainda não use o documento.",
      "Uma divergência de nome, por si só, não significa falha ou leitura ilegível. Nesse estado, priorize a pergunta de autorização, sem pedir outro PDF quando a extração estiver pronta.",
      "Se cancelled, diga que manteve o arquivo fora das consultas e que a pessoa pode enviá-lo no condomínio correto.",
      "Se confirmado, comunique apenas a autorização de uso, nunca uma renomeação ou verificação de propriedade. O nome cadastrado permanece o mesmo.",
      "Se ready e vigência confirmed ou not_applicable, diga que o arquivo está disponível. Se needs_review, explique que a leitura ainda precisa de revisão e peça o PDF original completo e legível. Se failed, explique que a leitura falhou e peça outro envio. Se uploaded ou processing, ainda está em preparação.",
      "Se a vigência for pending, não diga que já pode fundamentar consultas: explique que ela ainda precisa ser validada. Não confunda confirmação de uso com vigência ou qualidade de leitura.",
      "Se a vigência for disputed ou superseded, explique que há uma divergência ou outra versão e que é preciso conferir qual se aplica antes de concluir; não resolva isso silenciosamente.",
      JSON.stringify({
        state,
        hasSnapshot,
        processingStatus:
          document.condominiumCheck?.resumeProcessingStatus ?? document.processingStatus,
        validityStatus: document.validityStatus
      })
    ].join("\n"),
    task: "grounded_answer",
    riskClass: "low",
    evidence: [],
    budget: { maximumOutputTokens: 350, maximumCostMicrounits: 100_000 }
  });
  const template = result.output.answer.trim();
  const substitutions: Readonly<Record<string, string>> = {
    "[[DOCUMENT]]": `“${document.title}”`,
    "[[CONDOMINIUM]]": `“${condominiumName}”`,
    "[[DETECTED]]":
      document.condominiumCheck?.detectedNames.map((name) => `“${name}”`).join(", ") ?? ""
  };
  if (
    template.length === 0 ||
    template.length > 1600 ||
    result.output.answerMode === "failed" ||
    result.output.citations.length > 0 ||
    !template.includes("[[DOCUMENT]]") ||
    !template.includes("[[CONDOMINIUM]]") ||
    (state === "confirmation_required" && !template.includes("[[DETECTED]]")) ||
    /\[\[(?!DOCUMENT\]\]|CONDOMINIUM\]\]|DETECTED\]\])/u.test(template)
  )
    throw new Error("Fala documental inválida.");
  // Single pass: placeholder-like strings in an untrusted name are never interpolated again.
  return template.replaceAll(
    /\[\[(?:DOCUMENT|CONDOMINIUM|DETECTED)\]\]/gu,
    (token) => substitutions[token]!
  );
}
