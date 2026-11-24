function normalize(value: string): string {
  return value.normalize("NFD").replaceAll(/\p{M}/gu, "").toLocaleLowerCase("pt-BR").trim();
}

function isExplicitWebResearchRequest(question: string): boolean {
  return /^(?:por favor[, ]+)?(?:pesquise|pesquisar|busque|buscar|procure|consulte)\s+(?:na|a)\s+(?:internet|web)\b/u.test(
    normalize(question)
  );
}

/** Decide somente pelo pedido atual; nunca usa perfil, histórico ou texto de PDFs. */
export function isDemoWebResearchRequest(question: string): boolean {
  const text = normalize(question);
  if (
    /\b(?:nao (?:pesquis|busqu|procur|consult)|nao (?:quero|precisa|preciso|deve|pode) (?:que voce )?(?:pesquis|busc|consult)|sem (?:pesquis|busc|consult))/u.test(
      text
    )
  )
    return false;
  if (isExplicitWebResearchRequest(question)) return true;
  if (
    /\bbalancetes?\b/u.test(text) &&
    !/\b(?:como|o que e|orientacoes|boas praticas)\b/u.test(text)
  )
    return false;
  if (
    /\b(?:no|nos|na|nas) (?:pdfs?|balancetes?|documentos?|arquivos?|atas?|contratos?|convencao|convencoes|regimentos?)\b|(?:enviad|anexad)|\b(?:saldo|receitas?|despesas?|lancamentos?|pagamentos?|inadimplencia)\b|\b(?:meu|minha|nosso|nossa|deste|desse)\b.{0,40}(?:condominio|convencao|regimento)|\b(?:analise|compare|confira|revise|resuma|leia)\b.{0,70}(?:documento|arquivo|pdf|ata|balancete|convencao|regimento)|(?:diz|preve|determina|estabelece|permite|exige).{0,30}(?:convencao|regimento|balancete)|(?:convencao|regimento).{0,30}(?:diz|preve|determina|estabelece|permite|exige)/u.test(
      text
    )
  )
    return false;
  return publicTopic(question) !== undefined;
}

/** Só constantes públicas atravessam a fronteira; nunca encaminhar o texto livre. */
export function demoWebResearchTopic(question: string): string | undefined {
  if (!isDemoWebResearchRequest(question)) return undefined;
  return publicTopic(question);
}

function publicTopic(question: string): string | undefined {
  const text = normalize(question);
  if (/assembleia/u.test(text) && /virtua[li]|eletron|online|hibrid/u.test(text))
    return "Legislação brasileira sobre assembleias virtuais e híbridas em condomínios, condições e limites atuais.";
  if (/sindico/u.test(text) && /atribuic|dever|responsabilidad|funcao|funcoes/u.test(text))
    return "Atribuições e deveres do síndico no Código Civil brasileiro, em fontes oficiais.";
  if (/prestacao de contas|balancete/u.test(text))
    return "Orientação pública brasileira sobre prestação de contas do síndico e fiscalização das contas em condomínios.";
  if (/convencao|regimento/u.test(text))
    return "Diferenças entre convenção de condomínio e regimento interno na legislação brasileira, sem concluir sobre condomínio específico.";
  if (/manutencao preventiva/u.test(text))
    return "Orientações oficiais brasileiras sobre manutenção preventiva e segurança de edificações residenciais.";
  if (/acessibilidade/u.test(text))
    return "Orientações oficiais brasileiras sobre acessibilidade em áreas comuns de edificações residenciais.";
  if (/lgpd|protecao de dados|dados pessoais/u.test(text))
    return "Orientações públicas da ANPD sobre proteção de dados pessoais e LGPD aplicáveis à administração de condomínios.";
  return undefined;
}

export function officialWebUrl(value: string): string | undefined {
  if (value.length > 2048 || /[\p{Cc}\s]/u.test(value)) return undefined;
  try {
    const url = new URL(value);
    if (url.protocol !== "https:" || url.username || url.password || url.port) return undefined;
    if (!["gov.br", "leg.br", "jus.br"].some((domain) => url.hostname.endsWith("." + domain)))
      return undefined;
    return url.href;
  } catch {
    return undefined;
  }
}

/** Páginas públicas de fontes; recusa endereços locais e endpoints de contato/ação. */
export function publicSourceUrl(value: string): string | undefined {
  if (value.length > 2048 || /[\p{Cc}\s\\]/u.test(value)) return undefined;
  try {
    const url = new URL(value);
    if (url.protocol !== "https:" || url.username || url.password || url.port) return undefined;
    const host = url.hostname.toLowerCase();
    if (
      !/^(?:[a-z0-9](?:[a-z0-9-]*[a-z0-9])?\.)+[a-z]{2,63}$/u.test(host) ||
      /(?:^|\.)(?:localhost|local|internal|test|invalid|example|onion)$/u.test(host) ||
      /^(?:wa\.me|api\.whatsapp\.com|web\.whatsapp\.com)$/u.test(host) ||
      /\b(?:login|logout|signin|signup|checkout|payment|delete|unsubscribe)\b/iu.test(
        url.pathname
      ) ||
      url.searchParams.has("token") ||
      url.searchParams.has("key")
    )
      return undefined;
    return url.href;
  } catch {
    return undefined;
  }
}
