export type SimpleConversationIntent =
  "greeting" | "capability" | "document_upload_notice" | "service_decline";

function normalizeMessage(message: string): string {
  return message
    .trim()
    .normalize("NFD")
    .replaceAll(/[\u0300-\u036f]/gu, "")
    .toLocaleLowerCase("pt-BR")
    .replaceAll(/[!.,?¿¡]/gu, "")
    .replaceAll(/\s+/gu, " ");
}

/** Aviso do usuário, sem pergunta, pedido de análise ou afirmação sobre o conteúdo. */
export function isDocumentUploadNotice(message: string): boolean {
  if (message.length > 240 || /[?¿\p{Cc}]/u.test(message)) return false;
  return /^(?:(?:ok|certo|agora) )?(?:eu )?(?:vou (?:te )?(?:enviar|reenviar|mandar|anexar)|estou (?:enviando|reenviando|mandando|anexando)|enviei|reenviei|anexei|segue|seguem|aqui esta|aqui estao)(?: (?:(?:(?:o|a|os|as|um|uma) )?(?:arquivos?|documentos?|pdfs?|balancetes?|convencao|convencoes|atas?|regimentos?|anexos?)|el[ea]s?))?(?: (?:complet[oa]s?|inteir[oa]s?|por completo|na integra|em anexo|novamente|de novo|agora)){0,3}$/u.test(
    normalizeMessage(message)
  );
}

export function classifySimpleConversation(message: string): SimpleConversationIntent | null {
  const normalized = normalizeMessage(message);

  if (
    message.length <= 180 &&
    !/[?¿\p{Cc}]/u.test(message) &&
    /^(?:nao quero(?: mais)?|nao tenho interesse|nao obrigad[oa]|nao quero(?: contratar)? (?:esse|este|o) servico|nao tenho interesse (?:nesse|neste|no) servico|nao quero(?: contratar)? (?:uma |a |essa |esta )?garantidora|nao tenho interesse (?:nessa|nesta|na) garantidora|nao quero (?:mais )?(?:receber )?(?:indicacoes|recomendacoes)(?: (?:de empresas|comerciais))?)(?: obrigad[oa])?$/u.test(
      normalized
    )
  )
    return "service_decline";

  if (
    /^(?:oi|ola|bom dia|boa tarde|boa noite|obrigad[oa]|muito obrigad[oa]|como vai|como voce esta|tudo bem)$/u.test(
      normalized
    )
  ) {
    return "greeting";
  }

  if (
    /^(?:como|de que forma) (?:(?:a|o) )?(?:alvitra|voce|ele|ela) (?:pode|poderia|consegue|conseguiria) (?:me )?ajudar$/u.test(
      normalized
    ) ||
    /^(?:com o que|em que) (?:(?:a|o) )?(?:alvitra|voce|ele|ela) (?:pode|poderia|consegue|conseguiria) (?:me )?ajudar$/u.test(
      normalized
    ) ||
    /^(?:o que|quais tarefas) (?:(?:a|o) )?(?:alvitra|voce) (?:pode fazer|faz|consegue fazer|consegue resolver)$/u.test(
      normalized
    )
  ) {
    return "capability";
  }

  return isDocumentUploadNotice(message) ? "document_upload_notice" : null;
}

export function isSimpleConversationMessage(message: string): boolean {
  return classifySimpleConversation(message) !== null;
}
