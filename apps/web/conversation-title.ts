const untitledConversation = "Nova conversa";
const maximumTitleLength = 52;

const conversationalOnlyMessage =
  /^(?:oi|olá|ola|bom dia|boa tarde|boa noite|obrigad[oa]|valeu|tudo bem|como vai)[!.?\s]*$/iu;

const removablePrefixes = [
  /^(?:oi|olá|ola|bom dia|boa tarde|boa noite)[,!.:\s-]+/iu,
  /^alvitra[,!?:\s-]+/iu,
  /^por favor[,!?:\s-]*/iu,
  /^(?:você|voce) (?:pode|consegue)(?: me)? (?:ajudar a|explicar|mostrar|dizer|informar)\s+/iu,
  /^(?:pode|consegue)(?: me)? (?:ajudar a|explicar|mostrar|dizer|informar)\s+/iu,
  /^(?:me ajude a|ajude-me a|preciso de ajuda (?:para|com)|gostaria de|quero)\s+/iu,
  /^(?:saber|entender)\s+/iu,
  /^(?:qual(?: é| seria)?|quais(?: são)?)\s+(?:(?:o|a|os|as)\s+)?/iu,
  /^(?:como (?:eu )?(?:posso|devo|faço para|faco para|fazer para)|o que (?:eu )?(?:faço|faco|devo fazer) para)\s+/iu,
  /^(?:como funciona|o que (?:diz|fala|determina))\s+/iu,
  /^(?:tem|há|ha|existe)\s+(?:uma?|algum(?:a)?)?\s*/iu
] as const;

function removeRequestLanguage(value: string): string {
  let result = value;
  for (let pass = 0; pass < 3; pass += 1) {
    const previous = result;
    for (const pattern of removablePrefixes) result = result.replace(pattern, "");
    if (result === previous) break;
  }
  return result;
}

function truncateAtWord(value: string): string {
  if (value.length <= maximumTitleLength) return value;
  const candidate = value.slice(0, maximumTitleLength + 1);
  const lastSpace = candidate.lastIndexOf(" ");
  const shortened =
    lastSpace >= 24 ? candidate.slice(0, lastSpace) : value.slice(0, maximumTitleLength);
  return `${shortened.trim()}…`;
}

export function buildConversationTitle(message: string | undefined): string {
  if (message === undefined) return untitledConversation;

  const normalized = message
    .replaceAll(/[\r\n\t]+/gu, " ")
    .replaceAll(/\s+/gu, " ")
    .trim()
    .replaceAll(/^["'“”‘’]+|["'“”‘’]+$/gu, "")
    .replaceAll(/[?!.,;:]+$/gu, "")
    .trim();

  if (normalized.length === 0 || conversationalOnlyMessage.test(normalized)) {
    return untitledConversation;
  }

  const mainClause = normalized.replace(
    /\s*[,;—]\s*(?:o que (?:eu )?(?:faço|faco|devo fazer)|como (?:eu )?(?:posso|devo) agir).*$/iu,
    ""
  );
  const analyzed = removeRequestLanguage(mainClause)
    .replace(/^(?:o|a|os|as)\s+/iu, "")
    .replace(/\s+(?:neste|nesse|no meu|do meu|aqui no|aqui do) condomínio(?: atual)?$/iu, "")
    .trim();

  if (analyzed.length < 3) return untitledConversation;
  const sentenceCase = `${analyzed.charAt(0).toLocaleUpperCase("pt-BR")}${analyzed.slice(1)}`;
  return truncateAtWord(sentenceCase);
}

export function buildConversationTitleFromQuestions(questions: readonly string[]): string {
  for (const question of questions) {
    const title = buildConversationTitle(question);
    if (title !== untitledConversation) return title;
  }
  return untitledConversation;
}
