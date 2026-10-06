export type SimpleConversationIntent = "greeting" | "capability";

function normalizeMessage(message: string): string {
  return message
    .trim()
    .normalize("NFD")
    .replaceAll(/[\u0300-\u036f]/gu, "")
    .toLocaleLowerCase("pt-BR")
    .replaceAll(/[!.,?¿¡]/gu, "")
    .replaceAll(/\s+/gu, " ");
}

export function classifySimpleConversation(message: string): SimpleConversationIntent | null {
  const normalized = normalizeMessage(message);

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

  return null;
}

export function isSimpleConversationMessage(message: string): boolean {
  return classifySimpleConversation(message) !== null;
}
