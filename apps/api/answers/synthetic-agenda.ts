import type { AnswerGatewayInput } from "./answer-gateway.js";

/** Apenas o gateway determinístico de teste: preferências recentes não são evidência local. */
export function syntheticAgendaAnswer(input: AnswerGatewayInput): string | undefined {
  const recentTurns = input.conversationContext?.turns ?? [];
  const draftRequest =
    /\b(?:prepare|monte|organize|redija|escreva|faça|feche|finalize|retome|volte|use|acrescente|inclua|adicione|correção|corrigindo|registre|enviar)\b/iu.test(
      input.question
    ) || /qual.{0,40}título/iu.test(input.question);
  const agendaRequest =
    /pauta/iu.test(input.question) ||
    (/rascunho|título|tópico/iu.test(input.question) &&
      recentTurns.some((turn) => /pauta/iu.test(turn.question)));
  if (
    input.evidence.length > 0 ||
    input.task === "setup_turn" ||
    input.riskClass === "high" ||
    !agendaRequest ||
    !draftRequest
  )
    return undefined;

  let title: string | undefined;
  const turns = [...recentTurns, { question: input.question }];
  for (const turn of turns) {
    const correction = turn.question.match(
      /\b(?:(?:use|utilize) (?:apenas|somente)|título (?:corrigido )?[ée])\s+([^\r\n.!?]{1,100})(?:[.!?]|$)/iu
    );
    if (correction) title = correction[1]!.trim();
    else if (
      /correção|corrigindo|altere|troque/iu.test(turn.question) &&
      /título/iu.test(turn.question)
    )
      title = undefined;
    else {
      const previousDraft =
        "answer" in turn && typeof turn.answer === "string"
          ? turn.answer.match(/^Rascunho — ([^\r\n]{1,100})$/mu)
          : null;
      if (previousDraft) title = previousDraft[1]!.trim();
    }
  }
  const versionsRequested =
    /versões/iu.test(input.question) ||
    input.conversationContext?.taskFocus?.requirements?.some((item) => item.key === "versions");
  const versionCheck = versionsRequested
    ? " Inclua a conferência das versões discordantes como pendência."
    : "";
  if (!title)
    return `Para fechar o rascunho, confirme o título que deseja manter. Os tópicos podem organizar documentos a conferir, prioridades e próximos passos propostos.${versionCheck}`;

  return [
    `Rascunho — ${title}`,
    "1. Documentos e evidências a conferir.",
    versionsRequested
      ? "2. Prioridades e pendências, incluindo conferir as versões discordantes antes de concluir."
      : "2. Prioridades e pendências.",
    "3. Próximos passos propostos, com responsável e prazo a combinar.",
    "",
    "O texto é só um rascunho; não comprova reunião, deliberação, aprovação ou envio."
  ].join("\n");
}
