import type { GeneratedAnswer } from "./answer-contract.js";
import type { RetrievalEvidence } from "../retrieval/retrieval-contract.js";
import { normalizeQueryText } from "../retrieval/retrieval-query.js";
import { literalSentences } from "./literal-sentences.js";
import { documentaryDates, monthNames } from "./documentary-dates.js";
import { financialResultRows } from "./financial-result-table.js";
import { monetaryAmounts } from "./answer-fidelity.js";
import { queryEntities } from "../retrieval/retrieval-query.js";

const checks = {
  financial_result: "Explicitar o resultado do período, distinguindo-o do saldo acumulado.",
  quarter_result:
    "Preservar o fechamento trimestral pedido, calculado a partir das competências disponíveis, sem somar saldos; se faltar suporte, identificar a competência necessária.",
  reserve_binding: "Separar recursos vinculados à reserva da disponibilidade ordinária.",
  reconciliation:
    "Conferir saldos e movimentos com extratos e comprovantes, sem certificar auditoria.",
  supporting_records: "Identificar os comprovantes ou documentos de suporte ainda necessários.",
  termination_notice: "Retomar o aviso e a forma de comunicação pedidos para encerrar o contrato.",
  penalty: "Distinguir a multa prevista, suas condições e eventual hipótese não confirmada.",
  validity: "Conferir a vigência documentada antes de concluir sobre renovação.",
  contract_price:
    "Informar o preço mensal desta versão e distinguir preço confirmado de proposta, sem presumir aprovação.",
  collection_charges:
    "Distinguir encargos, multa, juros e correção do principal e do valor negociado, indicando a base ou a verificação pendente.",
  collection_principal:
    "Identificar a unidade corrigida e seu principal documentado; não substituir o valor por um número de apartamento inexistente.",
  agreement_status:
    "Distinguir proposta, aceite e pagamento de cada unidade; negociação não comprova aprovação ou quitação.",
  assembly_decisions:
    "Resumir separadamente as decisões deste instrumento, com condições, ressalvas e execução não comprovada.",
  assembly_reserve_conditions:
    "Preservar o limite de uso da reserva e suas condições documentadas, sem presumir saque ou pagamento.",
  assembly_mandate:
    "Informar o mandato efetivamente eleito, distinguindo-o da regra geral, ou pedir a página da eleição que falta.",
  assembly_voting:
    "Informar a votação registrada ou pedir o registro específico que falta, sem inferir quórum válido.",
  labor_aggregation:
    "Distinguir rubricas agregadas do balancete de salário ou pagamento individual do contrato.",
  execution_proof:
    "Indicar a comprovação das execuções ou a avaliação e liberação técnica ainda pendentes.",
  ownership: "Conferir a titularidade antes de definir destinatário de cobrança.",
  agreement:
    "Separar por unidade proposta, aceite e pagamento; conferir ou formalizar a negociação privada.",
  handover_acceptance: "Distinguir entrega, conferência e aceite formal da gestão que recebe.",
  insurance_validity:
    "Conferir renovação e vigência com prova atual, sem prometer cobertura ou indenização.",
  documented_context:
    "Identificar o condomínio e sua quantidade de unidades quando documentados nos trechos.",
  operational_release:
    "Confirmar o estado da ocorrência e registrar avaliação e liberação técnica antes de retomar o uso; contratação é uma etapa distinta."
} as const;

export type CompletionKey = keyof typeof checks;
export type CompletionItem = Readonly<{
  key: CompletionKey;
  check: string;
  evidenceIds: readonly string[];
  reference?: string;
}>;
export const completionKeys = Object.freeze(Object.keys(checks) as CompletionKey[]);

/** Metadados hifenizados não identificam unidades nem criam obrigações de acordo. */
function collectionSourceReferences(source: RetrievalEvidence): readonly string[] {
  const text = normalizeQueryText(source.content);
  return queryEntities(text).filter((reference) => {
    const escaped = reference.replace(/[.*+?^${}()|[\]\\]/gu, "\\$&");
    return new RegExp(
      `\\b(?:unidades?|apartamentos?|blocos?)(?:\\s+fictici[oa]s?)?\\s+${escaped}\\b|\\b${escaped}\\s*:\\s*(?:principal|saldo|proposta|parcelamento|cotas?)\\b`,
      "u"
    ).test(text);
  });
}

/** Rótulos internos, sem copiar valores, frases da fonte ou respostas anteriores. */
export function buildCompletionChecklist(
  question: string,
  questions: readonly string[],
  requirementKeys: readonly string[],
  evidence: readonly RetrievalEvidence[],
  financialEvidence: readonly RetrievalEvidence[],
  activeReferences: readonly string[] = []
): readonly CompletionItem[] {
  const scoped = (value: string) =>
    normalizeQueryText(value).replace(
      /\b(?:sem incluir|sem tratar|nao inclua|exclua|exceto)\b.*/u,
      ""
    );
  const text = [question, ...questions].map(scoped).join("\n");
  const current = scoped(question);
  const excluded =
    normalizeQueryText(question).split(
      /\b(?:sem incluir|sem tratar|nao inclua|exclua|exceto)\b/u
    )[1] ?? "";
  const local = evidence.filter((source) => source.sourceScope !== "legislation");
  const title = (source: RetrievalEvidence) => normalizeQueryText(source.documentTitle);
  const contracts = local.filter((source) => /contrat/u.test(title(source)));
  const minutes = local.filter((source) => /\batas?\b|assembleia/u.test(title(source)));
  const collections = local.filter((source) =>
    /cotas|inadimpl|acordos|cobranca/u.test(title(source))
  );
  const handover = local.filter((source) => /transicao|entrega de gestao/u.test(title(source)));
  const technical = local.filter((source) =>
    /manutencao|tecnic|inspecao|calendario/u.test(title(source))
  );
  const insurance = local.filter((source) => /apolice|seguro|calendario/u.test(title(source)));
  const items: CompletionItem[] = [];
  function add(
    key: CompletionKey,
    sources: readonly RetrievalEvidence[],
    detail = "",
    reference?: string
  ) {
    if (sources.length === 0) return;
    const evidenceIds = [...new Set(sources.map((source) => source.id))].slice(0, 8);
    if (
      items.some(
        (item) =>
          item.key === key &&
          item.reference === reference &&
          item.evidenceIds.join("|") === evidenceIds.join("|")
      )
    )
      return;
    items.push(
      Object.freeze({
        key,
        check: checks[key] + detail,
        evidenceIds: Object.freeze(evidenceIds),
        ...(reference ? { reference } : {})
      })
    );
  }
  const acceptance = /aceite integral/u.test(current);
  const financial =
    !/financeir|balancete|contas|extratos/u.test(excluded) &&
    (acceptance ||
      requirementKeys.includes("financial") ||
      requirementKeys.includes("financial_result") ||
      /financeir|contador|contabil|balancete|saldo/u.test(current));
  if (financial && financialEvidence.length > 0) {
    if (requirementKeys.includes("financial_result")) add("financial_result", financialEvidence);
    if (/trimestre|trimestral/u.test(text) && !/trimestre|trimestral|fechamento/u.test(excluded))
      add("quarter_result", financialEvidence);
    const restricted = financialEvidence.filter((source) =>
      /\breservas?\b|vinculad|disponibilidade ordinaria/u.test(normalizeQueryText(source.content))
    );
    const laborComparison =
      /contrat/u.test(current) &&
      /balancete/u.test(current) &&
      !/saldo|reserva|disponibilidade|concili/u.test(current) &&
      contracts.some((source) => /salario.base|jornada/u.test(normalizeQueryText(source.content)));
    if (!laborComparison) add("reserve_binding", restricted);
    if (
      acceptance ||
      /\b(?:confira|conferir|conferencia|conferencias|verifique|verificar|verificacao|verificacoes|contador|conciliar|conciliacao)\b/u.test(
        current
      )
    ) {
      add("reconciliation", financialEvidence);
      add("supporting_records", financialEvidence);
    }
  }
  if (/contrat|renov|encerr|denuncia|aviso|multa/u.test(text) && !/contrat/u.test(excluded)) {
    if (/preco|valor mensal|mensalidade|reajuste|compare/u.test(text))
      for (const version of new Set(contracts.map((source) => source.documentVersionId))) {
        const pages = contracts.filter(
          (source) =>
            source.documentVersionId === version &&
            /(?:pre[cç]o|valor)\s+mensal|mensalidade/iu.test(source.content)
        );
        add("contract_price", pages);
      }
    if (/renov|vigencia|vencimento/u.test(text)) add("validity", contracts);
    if (requirementKeys.includes("termination_notice")) add("termination_notice", contracts);
    if (requirementKeys.includes("penalty")) add("penalty", contracts);
  }
  if (
    /decisoes|deliberacoes|assembleia|atas|\bago\b|\bage\b|eleicao|mandato|votacao/u.test(
      current
    ) &&
    !/assembleia|atas|eleicao|mandato/u.test(excluded)
  ) {
    for (const version of new Set(minutes.map((source) => source.documentVersionId))) {
      const pages = minutes.filter((source) => source.documentVersionId === version);
      const content = normalizeQueryText(pages.map((source) => source.content).join("\n"));
      const facets = [
        [/contas.{0,100}aprov|aprov.{0,100}contas/u, "contas e ressalvas"],
        [/contribuicao ordinaria|cota ordinaria/u, "cota"],
        [/eleit|eleicao|mandato/u, "eleição e mandato"],
        [/teto|orcamento maximo/u, "teto condicionado"],
        [/\breservas?\b/u, "condições da reserva"],
        [/laudo/u, "laudo antes da obra"],
        [/nao.{0,30}aprov|nao foi votad/u, "itens não aprovados"]
      ] as const;
      const labels = facets.filter(([pattern]) => pattern.test(content)).map(([, label]) => label);
      add(
        "assembly_decisions",
        pages,
        labels.length ? ` Aspectos presentes nos trechos: ${labels.join(", ")}.` : ""
      );
      if (
        !/reserva/u.test(excluded) &&
        !/\b(?:somente|apenas|so)\b.{0,30}(?:eleicao|mandato|votacao)/u.test(current) &&
        literalSentences(content).some(
          ({ text: sentence }) =>
            /\breserva\b/u.test(sentence) && /apos|condicionad|depende|mediante/u.test(sentence)
        )
      )
        add("assembly_reserve_conditions", pages);
      if (
        /eleicao|eleit|mandato/u.test(text) &&
        /eleit|eleicao/u.test(content) &&
        /mandato/u.test(content)
      )
        add("assembly_mandate", pages);
      if (
        /votacao|votos|presenca|quorum|eleicao/u.test(text) &&
        /votacao|votos/u.test(content) &&
        !/votacao|votos/u.test(excluded)
      )
        add("assembly_voting", pages);
    }
  }
  if (/contrat/u.test(current) && /balancete/u.test(current)) {
    const labor = contracts.filter(
      (source) =>
        /trabalh|empregado|funcionario/u.test(title(source)) ||
        /salario.base|jornada/u.test(normalizeQueryText(source.content))
    );
    if (labor.length > 0 && financialEvidence.length > 0)
      add("labor_aggregation", [...labor, ...financialEvidence]);
  }
  if (acceptance) {
    add("execution_proof", technical);
    add("handover_acceptance", handover);
    if (/seguro|apolice|renov/u.test(text)) add("insurance_validity", insurance);
  }
  if (
    /retomar.{0,20}uso|proxima acao humana|proximo passo humano/u.test(current) &&
    /ocorrencia|elevador/u.test(text)
  ) {
    add(
      "operational_release",
      local.filter((source) => /elevador|emergencia|manutencao|assembleia/u.test(title(source)))
    );
  }
  if (
    /numero|identificador/u.test(current) &&
    /constar|trocar|confundir|corrigid/u.test(current) &&
    activeReferences.length === 1
  ) {
    const reference = activeReferences[0]!;
    const pages = collections.filter((source) => principalValues(source, reference).length > 0);
    add("collection_principal", pages, "", reference);
  }
  if (
    /unidades|cobranca|negociacao/u.test(current) &&
    /cada|ambas|ambos|duas|dois/u.test(current)
  ) {
    add("ownership", collections);
    add("agreement", collections);
  }
  if (
    (/cobranca|negociacao|acordo|parcelamento/u.test(text) ||
      (/cada|ambas|ambos|duas|dois/u.test(current) && /unidade/u.test(current))) &&
    !/cobranca|acordo|negociacao/u.test(excluded)
  ) {
    const references = queryEntities(current).length
      ? queryEntities(current)
      : queryEntities(text).length
        ? queryEntities(text)
        : /cada|ambas|ambos|duas|dois/u.test(current)
          ? [...new Set(collections.flatMap(collectionSourceReferences))].slice(0, 8)
          : [];
    for (const reference of references) {
      const pages = collections.filter((source) =>
        queryEntities(source.content).includes(reference)
      );
      if (
        /acordo|negociacao|parcelamento|proposta|aceite/u.test(text) ||
        (/cada|ambas|ambos|duas|dois/u.test(current) &&
          pages.some((source) =>
            /proposta|parcelamento|acordo|aceite|assinatur|pagamento|recebimento/iu.test(
              source.content
            )
          ))
      )
        add("agreement_status", pages, "", reference);
      if (/encargo|multa|juros|correcao/u.test(text))
        add("collection_charges", pages, "", reference);
    }
  }
  if (
    /(?:somente|apenas|so).{0,30}fatos/u.test(current) &&
    !/unidades|apartamentos|quantidade/u.test(excluded)
  ) {
    add(
      "documented_context",
      local.filter((source) =>
        /\b\d+\s+unidades|quantidade (?:de unidades|de apartamentos|e)/u.test(
          normalizeQueryText(source.content)
        )
      )
    );
  }
  return Object.freeze(items);
}

function linkedSources(
  generated: GeneratedAnswer,
  evidence: readonly RetrievalEvidence[],
  ids?: readonly string[]
) {
  return evidence.filter(
    (source) =>
      (!ids || ids.includes(source.id)) &&
      generated.citations.some(
        (citation) =>
          citation.evidenceId === source.id &&
          citation.documentId === source.documentId &&
          citation.documentVersionId === source.documentVersionId
      )
  );
}

export function coversAssemblyDecision(
  generated: GeneratedAnswer,
  evidence: readonly RetrievalEvidence[],
  ids?: readonly string[]
): boolean {
  const body = normalizeQueryText(generated.answer);
  return (
    /aprov|deliber|eleit|elegeu|elegeram|fixad|condicionad|autoriz|ressalva/u.test(body) &&
    linkedSources(generated, evidence, ids).some((source) =>
      /\batas?\b|assembleia/u.test(normalizeQueryText(source.documentTitle))
    )
  );
}

function coversDateAspect(
  text: string,
  sources: readonly RetrievalEvidence[],
  kind: "validity" | "assembly_mandate"
): boolean {
  const gap = /nao.{0,30}(?:confirmar|identificar|determinar)|falta|preciso/u;
  const subject = kind === "validity" ? /vigencia|vencimento|data|aditivo/u : /mandato|eleicao/u;
  if (
    literalSentences(text).some(
      ({ text: sentence }) => gap.test(sentence) && subject.test(sentence)
    )
  )
    return true;
  const pattern =
    kind === "validity"
      ? /\b(?:vigencia|vencimento|validade|termino)\b[^.;\n]{0,100}/gu
      : /\bmandato\b[^.;\n]{0,100}/gu;
  const dates = sources.flatMap((source) =>
    [...normalizeQueryText(source.content).matchAll(pattern)].flatMap((match) => {
      const found = documentaryDates(match[0]);
      return kind === "validity" ? found.slice(-1) : found;
    })
  );
  if (dates.length > 0) return dates.every((date) => documentaryDates(text).includes(date));
  return kind === "validity"
    ? /vigencia|vencimento|validade|termina|encerra|vence/u.test(text)
    : /mandato/u.test(text) &&
        /\b(?:\d+|um|dois|tres|quatro|cinco|seis)\s*(?:anos|meses)/u.test(text);
}

function coversReserveConditions(text: string, sources: readonly RetrievalEvidence[]): boolean {
  const clauses = literalSentences(text)
    .map(({ text }) => text)
    .filter((sentence) => /\breserva\b/u.test(sentence));
  if (!clauses.some((sentence) => /apos|condicionad|depende|mediante/u.test(sentence)))
    return false;
  const conditions = sources
    .flatMap((source) => literalSentences(normalizeQueryText(source.content)))
    .filter(({ text }) => /\breserva\b/u.test(text))
    .map(({ text }) => /(?:apos|condicionad[ao]|depende|mediante)(.*)/u.exec(text)?.[1] ?? "")
    .join("\n");
  return [
    [/selec|escolh/u, /selec|escolh/u],
    [/assin|formaliz/u, /assin|formaliz|contrato/u],
    [/laudo/u, /laudo|avaliacao tecnica/u]
  ].every(
    ([sourcePattern, bodyPattern]) =>
      !sourcePattern!.test(conditions) || clauses.some((clause) => bodyPattern!.test(clause))
  );
}

export function coversFinancialResult(text: string): boolean {
  return (
    literalSentences(text).some(
      ({ text: sentence }) =>
        /diferenca/u.test(sentence) &&
        /receita|recebiment|recebemos|entrada/u.test(sentence) &&
        /despesa|pagament|pagamos|saida/u.test(sentence) &&
        monetaryAmounts(sentence).length > 0
    ) ||
    financialResultRows(text).some((row) => /r\$\s*\d/iu.test(row.cells[row.resultColumn]!)) ||
    literalSentences(text).some(
      ({ text: sentence }) =>
        /resultado|superavit|deficit|aumento.{0,20}(?:saldo|caixa)|caixa (?:positivo|negativo)/u.test(
          sentence
        ) &&
        (/\d/u.test(sentence) ||
          /nao.{0,35}(?:calcular|identificar|confirmar)|falta.{0,30}(?:receita|despesa)/u.test(
            sentence
          ))
    )
  );
}

function principalValues(source: RetrievalEvidence, reference: string): readonly number[] {
  return literalSentences(source.content).flatMap(({ text }) => {
    const entities = queryEntities(text);
    if (entities.length !== 1 || entities[0] !== reference) return [];
    const value = /\bprincipal(?:\s+em aberto)?\s*(?:de|:)?\s*(R\$\s*[\d.,]+(?:\s+mil)?)/iu.exec(
      text
    )?.[1];
    return value ? monetaryAmounts(value) : [];
  });
}

function coversQuarterResult(text: string): boolean {
  const months = new RegExp(`\\b(?:${monthNames.join("|")})\\b`, "gu");
  return (
    financialResultRows(text).some(
      (row) =>
        /r\$\s*\d/u.test(row.cells[row.resultColumn]!) &&
        (/trimestre|trimestral/u.test(row.label) ||
          (/fechamento|total/u.test(row.label) && [...row.label.matchAll(months)].length === 2))
    ) ||
    literalSentences(text).some(
      ({ text: sentence }) =>
        /trimestre|trimestral/u.test(sentence) &&
        ((/resultado|superavit|deficit/u.test(sentence) && /\d|\bzero\b/u.test(sentence)) ||
          /nao.{0,35}(?:calcular|confirmar|fechar)|falta.{0,40}(?:mes|competencia|balancete|documento)/u.test(
            sentence
          ))
    )
  );
}

/** Detecta omissões selecionadas; não é juiz semântico nem certificação de verdade. */
export function missingCompletionKeys(
  checklist: readonly CompletionItem[],
  generated: GeneratedAnswer,
  evidence: readonly RetrievalEvidence[]
): readonly CompletionKey[] {
  const text = normalizeQueryText(generated.answer);
  const patterns: Record<
    Exclude<
      CompletionKey,
      | "financial_result"
      | "quarter_result"
      | "assembly_decisions"
      | "validity"
      | "assembly_mandate"
      | "contract_price"
      | "collection_principal"
    >,
    RegExp
  > = {
    reserve_binding: /\breservas?\b|vinculad|disponibilidade ordinaria/u,
    reconciliation: /concili|extratos?|movimentacao bancaria/u,
    supporting_records: /comprovante|nota fiscal|documentos de suporte|detalhamento/u,
    termination_notice: /aviso|denuncia|antecedencia|comunicacao escrita/u,
    penalty: /multa|penalidade/u,
    collection_charges: /encargo|multa|juros|correcao/u,
    agreement_status: /aceit|assin|formaliz|quita|pagamento|nao.{0,30}(?:acordo|comprov|confirm)/u,
    assembly_reserve_conditions: /\breserva\b/u,
    assembly_voting: /votacao|votos/u,
    labor_aggregation:
      /agregad|rubricas? de pessoal|rubricas? do balancete|(?:despesa|custo).{0,35}pessoal|nao.{0,40}(?:salario individual|pagamento individual)|valores individuais/u,
    execution_proof: /execucao|executad|realizad|relatorio|certificado|laudo|liberacao tecnica/u,
    ownership: /titular|cadastro|responsavel pela unidade/u,
    agreement: /acordo|negociacao|parcelamento|proposta/u,
    handover_acceptance: /aceite|receb|assinatur|assinar|termo/u,
    insurance_validity: /renov|vigencia|cobertura|endosso|apolice/u,
    documented_context: /unidades|apartamentos/u,
    operational_release:
      /(?:uso|operar|operacao|liberacao).{0,70}(?:tecnic|habilitad)|(?:tecnic|habilitad).{0,70}(?:uso|operar|liberacao)|registr.{0,30}ocorrencia/u
  };
  return Object.freeze([
    ...new Set(
      checklist
        .filter((item) => {
          const sources = evidence.filter((source) => item.evidenceIds.includes(source.id));
          if (item.key === "collection_principal") {
            if (!item.reference) return true;
            const values = sources.flatMap((source) => principalValues(source, item.reference!));
            return !literalSentences(text).some(
              ({ text: clause }) =>
                queryEntities(clause).includes(item.reference!) &&
                monetaryAmounts(clause).some((value) => values.includes(value))
            );
          }
          if (item.key === "contract_price") {
            const prices = sources
              .flatMap((source) => literalSentences(source.content))
              .filter((part) => /(?:pre[cç]o|valor)\s+mensal|mensalidade/iu.test(part.text))
              .flatMap((part) => monetaryAmounts(part.text));
            return (
              !prices.length ||
              !prices.every((price) => monetaryAmounts(generated.answer).includes(price))
            );
          }
          if (item.reference) {
            const clauses = literalSentences(text)
              .map((part) => part.text)
              .filter((part) => queryEntities(part).includes(item.reference!));
            return !clauses.some((clause) =>
              patterns[item.key as "collection_charges" | "agreement_status"].test(clause)
            );
          }
          if (item.key === "validity" || item.key === "assembly_mandate")
            return !coversDateAspect(text, sources, item.key);
          if (item.key === "assembly_reserve_conditions")
            return !coversReserveConditions(text, sources);
          if (item.key === "assembly_voting")
            return !literalSentences(text).some(
              ({ text: sentence }) =>
                /votacao|votos/u.test(sentence) &&
                (/\d/u.test(sentence) ||
                  /falta|nao.{0,25}(?:confirmar|identificar)|solicite|peca/u.test(sentence))
            );
          if (item.key === "financial_result") return !coversFinancialResult(text);
          if (item.key === "quarter_result") return !coversQuarterResult(text);
          if (item.key === "assembly_decisions")
            return (
              !coversAssemblyDecision(generated, evidence, item.evidenceIds) &&
              !(
                /nao.{0,35}(?:confirmar|identificar)|falta/u.test(text) &&
                /ata|assembleia|deliber|eleicao|votacao/u.test(text)
              )
            );
          return !patterns[item.key].test(text);
        })
        .map((item) => item.key)
    )
  ]);
}
