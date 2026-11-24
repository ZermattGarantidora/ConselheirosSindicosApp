export function normalizeQueryText(value: string): string {
  return value
    .normalize("NFD")
    .replaceAll(/[\u0300-\u036f]/gu, "")
    .toLocaleLowerCase("pt-BR");
}

const months = [
  "janeiro",
  "fevereiro",
  "marco",
  "abril",
  "maio",
  "junho",
  "julho",
  "agosto",
  "setembro",
  "outubro",
  "novembro",
  "dezembro"
];

/** Expansões locais e limitadas; não interpreta conteúdo documental como instrução. */
export function expandRetrievalQuery(query: string): string {
  const normalized = normalizeQueryText(query);
  const extra: string[] = [];
  const monthPattern = months.join("|");
  for (const match of normalized.matchAll(
    new RegExp(`\\b(${monthPattern})\\s+(?:a|ate|ao)\\s+(${monthPattern})\\b`, "gu")
  )) {
    const start = months.indexOf(match[1]!);
    const end = months.indexOf(match[2]!);
    if (end >= start) extra.push(...months.slice(start, end + 1));
  }
  if (/(?:sub)?sindic/u.test(normalized) && /mandato|periodo/u.test(normalized))
    extra.push(/subsindic/u.test(normalized) ? "subsíndico mandato" : "síndica mandato");
  if (/multa|cobranca|processar|contesta/u.test(normalized))
    extra.push("notificação manifestação contestação cobrança cotas");
  if (/parede|estrutur|retirada|obra|intervencao/u.test(normalized))
    extra.push("intervenções documentação técnica aprovações segurança");
  if (/checklist|inventario|recebimento|transicao|entrega de gestao/u.test(normalized))
    extra.push("transição recebidos pendentes entrega chaves acessos documentos");
  if (
    /balancetes?|saldos?|financeir|disponibilidade ordinaria|rateio|emissao|cotas?|inadimpl/u.test(
      normalized
    )
  )
    extra.push("balancete receitas despesas saldo");
  if (/disponibilidade ordinaria|dinheiro livre|saldo livre/u.test(normalized))
    extra.push("recursos ordinários fundo de reserva vinculado");
  if (/mandato|eleicao|eleit[ao]/u.test(normalized) && /sindic|conselho|gestao/u.test(normalized))
    extra.push("ata assembleia eleição mandato");
  if (/salario|jornada|encargos|funcionario|empregado/u.test(normalized))
    extra.push("contrato trabalho salário jornada encargos");
  if (/\b(?:alterar|mudar)\b/u.test(normalized) && /convencao/u.test(normalized))
    extra.push("alteração mudança aprovação");
  return [query, ...extra].join(" ");
}

export function queryEntities(query: string): readonly string[] {
  return [...new Set(normalizeQueryText(query).match(/\b[\p{L}\p{N}]+-[\p{L}\p{N}]+\b/gu) ?? [])];
}

/** Desempata cláusulas pelo assunto, sem confundir nome/estado da versão com conteúdo. */
export function documentSubjectQuery(query: string): string {
  const subject = normalizeQueryText(query)
    .replaceAll(
      /\b(?:convencao|convencoes|regimento|contrato|documento|arquivo|versao|minuta|aprovad[oa]|vigente|nov[oa]|anexei|enviei|aqui|agora|esta|este|esse|essa|ate|tenho|so|vale|quero|preciso)\b/gu,
      " "
    )
    .trim();
  return subject.length === 0 ? query : subject;
}

/** Categorias explicitamente pedidas ajudam a não gastar o orçamento com duplicatas. */
export function requestedDocumentGroups(query: string): readonly string[] {
  const text = normalizeQueryText(query);
  return [
    /\b(?:atas?|ago|age)\b|assembleia|mandato|eleicao|eleit[ao]|votacao/u.test(text) ? "ata" : "",
    /contratos?|aviso|denuncia|multa contratual/u.test(text) ? "contrato" : "",
    /propostas?|orcamentos?/u.test(text) ? "proposta" : "",
    /balancetes?|saldos?|despesas|conciliacao|contador/u.test(text) ? "balancete" : ""
  ].filter(Boolean);
}

export function documentMatchesGroup(title: string, group: string): boolean {
  const text = normalizeQueryText(title).replaceAll(/[_-]/gu, " ");
  return group === "proposta"
    ? /propostas?|orcamentos?/u.test(text)
    : new RegExp(`\\b${group}s?\\b`, "u").test(text);
}
