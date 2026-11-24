import type { AnswerCitation } from "../answers/answer-contract.js";
import type { AuthorizedCondominiumContext } from "../identity/authorized-condominium-context.js";
import { extractStructuredDocument } from "../documents/structured/extract-structured-document.js";
import type {
  StructuredFinancialEntry,
  StructuredSourceReference
} from "../documents/structured/structured-document-contract.js";
import type { AnalysisDocument } from "./document-analysis-reader.js";
import type { DocumentAnalysisReport, FinancialReviewCheck } from "./document-analysis.js";
import {
  compareFinancialPeriods,
  financialAmountsFromStructuredExtraction,
  normalizeFinancialRubric,
  type FinancialPeriod
} from "./financial-analysis.js";
import { validateDocumentAnalysisSources } from "./document-analysis-validation.js";
import { containsHostileInstruction } from "../security/document-instructions/document-instruction-policy.js";
import { literalFinancialDeclarations, realizedHistoryEntries } from "./financial-history-scope.js";

const normalize = (value: string) => (value.trim() === "" ? "" : normalizeFinancialRubric(value));
const unknown = "não foi possível verificar" as const;

function money(value: bigint): string {
  const absolute = value < 0n ? -value : value;
  return `${value < 0n ? "-" : ""}R$ ${(absolute / 100n).toString().replace(/\B(?=(\d{3})+(?!\d))/gu, ".")},${String(absolute % 100n).padStart(2, "0")}`;
}

/** Datas de vencimento não se tornam competência do documento. */
function prepare(document: AnalysisDocument) {
  const extraction = extractStructuredDocument(document);
  const periods: (typeof extraction.financialPeriod)[] = [];
  for (const page of document.pages) {
    let offset = 0;
    for (const line of page.extractedText.split("\n")) {
      if (
        /^\s*(?:balancete|presta[cç][aã]o de contas|compet[eê]ncia|per[ií]odo|extrato banc[aá]rio|or[cç]amento mensal|nota fiscal|recibo|comprovante|rela[cç][aã]o de obriga[cç][oõ]es|obriga[cç][oõ]es a pagar)\b/iu.test(
          line
        )
      ) {
        let result = extractStructuredDocument({
          ...document,
          pages: [{ ...page, extractedText: line }]
        }).financialPeriod;
        const isoPeriods = [...line.matchAll(/\b(20\d{2})-(0[1-9]|1[0-2])\b/gu)];
        if (isoPeriods.length > 0) {
          const match = isoPeriods[0]!;
          const conflicting =
            result.state === "needs_review" ||
            new Set(isoPeriods.map((item) => item[0])).size > 1 ||
            (result.state === "known" &&
              (result.year !== Number(match[1]) || result.month !== Number(match[2])));
          result = {
            state:
              conflicting || page.qualityScore < 0.7 || !Number.isFinite(page.qualityScore)
                ? "needs_review"
                : "known",
            year: Number(match[1]),
            month: Number(match[2]),
            source: {
              condominiumId: document.condominiumId,
              documentId: document.documentId,
              documentVersionId: document.documentVersionId,
              pageNumber: page.pageNumber,
              startOffset: Array.from(line.slice(0, match.index)).length,
              endOffset: Array.from(line.slice(0, match.index! + match[0].length)).length,
              excerpt: match[0],
              extractionMethod: page.extractionMethod,
              uncertainty: []
            }
          };
        }
        if (result.state !== "unknown") {
          const base = Array.from(page.extractedText.slice(0, offset)).length;
          periods.push({
            ...result,
            source:
              result.source === null
                ? null
                : {
                    ...result.source,
                    startOffset: result.source.startOffset + base,
                    endOffset: result.source.endOffset + base
                  }
          });
        }
      }
      offset += line.length + 1;
    }
  }
  const first = periods[0];
  const periodKnown =
    first?.state === "known" &&
    periods.every(
      (item) => item.state === "known" && item.year === first.year && item.month === first.month
    );
  const period = periodKnown
    ? (`${first.year}-${String(first.month).padStart(2, "0")}` as FinancialPeriod)
    : null;
  const counts = new Map<string, number>();
  const duplicateLabels: string[] = [];
  for (const entry of extraction.financialEntries) {
    const label = normalize(entry.originalLabel);
    const count = counts.get(label) ?? 0;
    if (count === 1) duplicateLabels.push(entry.originalLabel);
    counts.set(label, count + 1);
  }
  const preparedExtraction = {
    ...extraction,
    warnings: [
      ...extraction.warnings,
      ...duplicateLabels.map(
        (label) =>
          `Rubrica duplicada: ${label}; esclareça os lançamentos antes de comparar ou vincular suportes.`
      )
    ],
    financialPeriod: periodKnown
      ? first
      : { state: "unknown" as const, year: null, month: null, source: null }
  };
  const lines = document.pages
    .filter((page) => Number.isFinite(page.qualityScore) && page.qualityScore >= 0.7)
    .flatMap((page) => page.extractedText.split("\n"));
  const fields = new Map<string, string[]>();
  for (const line of lines) {
    for (const declaration of literalFinancialDeclarations(line)) {
      const values = fields.get(declaration.field) ?? [];
      values.push(normalize(declaration.value));
      fields.set(declaration.field, values);
    }
    const separator = line.indexOf(":");
    if (separator < 1) continue;
    const label = normalize(line.slice(0, separator));
    const values = fields.get(label) ?? [];
    values.push(normalize(line.slice(separator + 1)));
    fields.set(label, values);
  }
  const fieldValues = (name: string) => fields.get(name) ?? [];
  const field = (name: string) => {
    const values = fieldValues(name);
    return new Set(values).size === 1 ? values[0] : undefined;
  };
  const headings = lines.map((line) => line.trim()).filter(Boolean);
  const hasHeading = (pattern: RegExp) => headings.some((line) => pattern.test(line));
  return {
    document,
    extraction: preparedExtraction,
    historyExtraction: {
      ...preparedExtraction,
      financialEntries: realizedHistoryEntries(document, period, extraction.financialEntries)
    },
    period,
    periodSource: periodKnown ? first.source : null,
    entries: extraction.financialEntries.filter((entry) => entry.source.uncertainty.length === 0),
    isStatement:
      extraction.documentKind.value === "financial_statement" &&
      extraction.documentKind.state === "known",
    isBank: hasHeading(/^extrato banc[aá]rio\b/iu),
    isBudget: hasHeading(/^or[cç]amento mensal\b/iu),
    isSupport: hasHeading(/^(?:nota fiscal|recibo|comprovante de pagamento|contrato de)\b/iu),
    isCommitments: hasHeading(
      /^(?:rela[cç][aã]o de obriga[cç][oõ]es|obriga[cç][oõ]es a pagar)\b/iu
    ),
    basis: field("regime"),
    plan: field("plano de contas"),
    responsible: field("responsavel"),
    ambiguousBasis: ["regime", "plano de contas"].some(
      (name) => new Set(fieldValues(name)).size > 1
    ),
    monthly:
      !hasHeading(/^balancete\b.*\b(?:anual|acumulado)\b/iu) &&
      (field("escopo") === undefined || field("escopo") === "mensal"),
    field,
    duplicateRubrics: new Set(duplicateLabels.map(normalize)),
    unsafe:
      preparedExtraction.warnings.length > 0 ||
      extraction.tables.some((table) => table.state === "needs_review")
  };
}

type Prepared = ReturnType<typeof prepare>;

function one(document: Prepared, labels: readonly string[]): StructuredFinancialEntry | undefined {
  const entries = document.entries.filter((entry) =>
    labels.includes(normalize(entry.originalLabel))
  );
  return entries.length === 1 ? entries[0] : undefined;
}

function citation(document: Prepared, source: StructuredSourceReference): AnswerCitation {
  return {
    id: `review:${source.documentVersionId}:${source.pageNumber}:${source.startOffset}`,
    evidenceId: `review:${source.documentVersionId}:${source.pageNumber}:${source.startOffset}`,
    documentId: source.documentId,
    documentVersionId: source.documentVersionId,
    title: document.document.documentTitle,
    page: source.pageNumber,
    excerpt: source.excerpt,
    startOffset: source.startOffset,
    endOffset: source.endOffset,
    sourceScope: "condominium"
  };
}

function proof(
  document: Prepared,
  entries: readonly StructuredFinancialEntry[] = []
): AnswerCitation[] {
  return [document.periodSource, ...entries.map((entry) => entry.source)]
    .filter((source): source is StructuredSourceReference => source !== null)
    .map((source) => citation(document, source));
}

function previousMonth(period: FinancialPeriod): FinancialPeriod {
  const date = new Date(`${period}-01T00:00:00Z`);
  date.setUTCMonth(date.getUTCMonth() - 1);
  return date.toISOString().slice(0, 7) as FinancialPeriod;
}

function nextMonth(period: FinancialPeriod): FinancialPeriod {
  const date = new Date(`${period}-01T00:00:00Z`);
  date.setUTCMonth(date.getUTCMonth() + 1);
  return date.toISOString().slice(0, 7) as FinancialPeriod;
}

const titles = {
  closing: "Fechamento e liquidez",
  arrears: "Inadimplência",
  budget: "Orçamento",
  extraordinary: "Despesas extraordinárias",
  bank: "Conferência bancária",
  reserve: "Fundo de reserva",
  support: "Documentos de suporte",
  history: "Comparação com o histórico",
  commitments: "Obrigações do próximo mês",
  transparency: "Qualidade e transparência"
} as const;

/** Conferência conservadora: cada ponto é resolvido ou indica precisamente o que falta. */
export function buildFinancialReview(
  context: AuthorizedCondominiumContext,
  currentVersionId: string,
  documents: readonly AnalysisDocument[]
): DocumentAnalysisReport {
  validateDocumentAnalysisSources(context, documents, []);
  if (
    documents.some(
      (document) =>
        containsHostileInstruction(document.documentTitle) ||
        document.pages.some((page) => containsHostileInstruction(page.extractedText))
    )
  )
    throw new Error("Não foi possível conferir com segurança documental.");
  const prepared = documents.map(prepare);
  const received = prepared.find((item) => item.document.documentVersionId === currentVersionId);
  if (received === undefined || !received.isStatement)
    throw new Error("Balancete recebido indisponível.");
  const current = received;
  const checks: FinancialReviewCheck[] = [];
  const rows: DocumentAnalysisReport["rows"][number][] = [];
  const limitations = [
    "Conferência dos dez pontos com base nos rótulos e vínculos explícitos dos documentos consultados. Ok descreve a verificação indicada; não representa aprovação das contas ou auditoria.",
    "Variação não comprova irregularidade ou sua causa. Decisões financeiras relevantes exigem validação do síndico e do responsável contábil."
  ];
  const add = (
    id: keyof typeof titles,
    status: FinancialReviewCheck["status"],
    detail: string,
    citations: readonly AnswerCitation[] = [],
    missingDocuments: readonly string[] = [],
    nextSteps: readonly string[] = [],
    summary?: string
  ) => {
    checks.push({
      id,
      title: titles[id],
      status,
      detail,
      citations,
      missingDocuments,
      nextSteps,
      ...(summary === undefined ? {} : { summary })
    });
  };
  const samePeriod = prepared.filter(
    (item) => item.period !== null && item.period === current.period
  );
  const statements = prepared.filter((item) => item.isStatement);
  const conflicts = statements.filter(
    (item) => item.period !== null && item.period === current.period
  );
  const comparable = (item: Prepared) =>
    current.monthly &&
    item.monthly &&
    !current.ambiguousBasis &&
    !item.ambiguousBasis &&
    !(current.basis !== undefined && item.basis !== undefined && current.basis !== item.basis) &&
    !(current.plan !== undefined && item.plan !== undefined && current.plan !== item.plan);
  const history = statements
    .filter(
      (item) => item.period !== null && current.period !== null && item.period < current.period
    )
    .sort((a, b) => b.period!.localeCompare(a.period!));
  const missingPrevious =
    current.period !== null &&
    !history.some((item) => item.period === previousMonth(current.period!));
  if (current.period !== null)
    rows.push({ label: "Competência recebida", detail: current.period, citations: proof(current) });
  for (const entry of current.entries)
    rows.push({
      label: entry.originalLabel,
      detail: money(BigInt(entry.amountMinor)),
      citations: proof(current, [entry])
    });
  if (current.entries.length === 0) {
    const page = current.document.pages.find(
      (item) =>
        Number.isFinite(item.qualityScore) &&
        item.qualityScore >= 0.7 &&
        item.extractedText.trim() !== ""
    );
    if (page !== undefined) {
      const excerpt = Array.from(page.extractedText).slice(0, 900).join("");
      rows.push({
        label: "Trecho para conferência — valores não estruturados",
        detail: excerpt,
        citations: [
          citation(current, {
            condominiumId: current.document.condominiumId,
            documentId: current.document.documentId,
            documentVersionId: current.document.documentVersionId,
            pageNumber: page.pageNumber,
            startOffset: 0,
            endOffset: Array.from(excerpt).length,
            excerpt,
            extractionMethod: page.extractionMethod,
            uncertainty: []
          })
        ]
      });
      limitations.push(
        "Os valores não puderam ser associados a rubricas inequívocas. O trecho exibido é parcial; envie o original com linhas e colunas legíveis para calcular."
      );
    }
  }

  const opening = one(current, ["saldo inicial", "saldo anterior", "saldo inicial consolidado"]);
  const income = one(current, [
    "receitas",
    "entradas",
    "receitas totais",
    "receitas totais do mes"
  ]);
  const expenses = one(current, [
    "despesas",
    "saidas",
    "despesas totais",
    "despesas totais do mes"
  ]);
  const closing = one(current, ["saldo final", "saldo atual", "saldo final consolidado informado"]);
  const available = one(current, ["saldo disponivel", "caixa disponivel"]);
  const commitmentDocuments = prepared.filter(
    (item) =>
      item.isCommitments &&
      !item.unsafe &&
      current.period !== null &&
      item.period === nextMonth(current.period)
  );
  const obligationTotals = [current, ...commitmentDocuments].flatMap((item) => {
    const entry = one(
      item,
      item === current ? ["obrigacoes do proximo mes"] : ["obrigacoes a pagar", "obrigacoes"]
    );
    return entry === undefined ? [] : [{ document: item, entry }];
  });
  const obligations =
    new Set(obligationTotals.map((item) => item.entry.amountMinor)).size === 1
      ? obligationTotals[0]?.entry
      : undefined;
  const obligationProof = obligationTotals.flatMap((item) => proof(item.document, [item.entry]));
  let liquidity =
    "Não foi possível verificar o fôlego do caixa: faltam saldo disponível e/ou total das obrigações do próximo mês, sem presumir que saldo final seja caixa livre.";
  const liquidityProof = [
    ...proof(current, available === undefined ? [] : [available]),
    ...obligationProof
  ];
  const liquidityMissing =
    available === undefined || obligations === undefined
      ? ["Saldo disponível para operação e relação completa das obrigações do próximo mês."]
      : [];
  const insufficient =
    available !== undefined &&
    obligations !== undefined &&
    BigInt(available.amountMinor) < BigInt(obligations.amountMinor);
  if (available !== undefined && obligations !== undefined)
    liquidity = `Saldo disponível ${money(BigInt(available.amountMinor))}; obrigações declaradas do próximo mês ${money(BigInt(obligations.amountMinor))}. ${insufficient ? "As obrigações declaradas excedem o disponível." : "O disponível cobre esse total declarado; obrigações não documentadas permanecem desconhecidas."}`;
  if (
    opening !== undefined &&
    income !== undefined &&
    expenses !== undefined &&
    closing !== undefined
  ) {
    const calculated =
      BigInt(opening.amountMinor) + BigInt(income.amountMinor) - BigInt(expenses.amountMinor);
    const difference = BigInt(closing.amountMinor) - calculated;
    add(
      "closing",
      difference !== 0n || insufficient
        ? "atenção"
        : current.unsafe || current.period === null || liquidityMissing.length > 0
          ? unknown
          : "ok",
      `Saldo inicial ${money(BigInt(opening.amountMinor))} + receitas ${money(BigInt(income.amountMinor))} − despesas ${money(BigInt(expenses.amountMinor))} = ${money(calculated)}; saldo final informado ${money(BigInt(closing.amountMinor))}; diferença (informado − calculado) ${money(difference)}. ${liquidity}`,
      [...proof(current, [opening, income, expenses, closing]), ...liquidityProof],
      liquidityMissing,
      difference !== 0n || insufficient
        ? [
            "Peça ao responsável contábil a memória do fechamento e a revisão da disponibilidade antes de aprovar as contas."
          ]
        : [],
      `Diferença no fechamento: ${money(difference)}. ${liquidity}`
    );
  } else
    add(
      "closing",
      insufficient ? "atenção" : unknown,
      `Faltam totais únicos e legíveis para conferir saldo inicial + receitas − despesas = saldo final. ${liquidity}`,
      liquidityProof,
      [
        "Balancete com saldo inicial, receitas, despesas e saldo final inequívocos.",
        ...liquidityMissing
      ],
      ["Solicite os totais ausentes ou esclareça rubricas duplicadas com o responsável contábil."]
    );

  const arrearsLabels = [
    "inadimplencia",
    "valor em aberto",
    "cotas em atraso",
    "principal em aberto no fim"
  ];
  const arrears = one(current, arrearsLabels);
  const nearest = history[0];
  const priorArrears =
    conflicts.length === 1 &&
    nearest !== undefined &&
    history.filter((item) => item.period === nearest.period).length === 1 &&
    comparable(nearest)
      ? one(nearest, arrearsLabels)
      : undefined;
  if (arrears === undefined)
    add(
      "arrears",
      unknown,
      "O material não fornece um total inequívoco de inadimplência; ausência de dado não significa zero.",
      [],
      [
        "Relatório de inadimplência da competência recebida, com valor em aberto e unidades afetadas."
      ],
      ["Peça a posição de inadimplência ao responsável pela cobrança."]
    );
  else {
    const increased =
      priorArrears !== undefined && BigInt(arrears.amountMinor) > BigInt(priorArrears.amountMinor);
    add(
      "arrears",
      increased ? "atenção" : current.period === null ? unknown : "ok",
      `Valor em aberto informado: ${money(BigInt(arrears.amountMinor))}.${priorArrears === undefined ? " Evolução ainda não verificável por falta de base anterior inequívoca." : ` Em ${nearest!.period}: ${money(BigInt(priorArrears.amountMinor))}; diferença ${money(BigInt(arrears.amountMinor) - BigInt(priorArrears.amountMinor))}.`}`,
      [
        ...proof(current, [arrears]),
        ...(priorArrears === undefined ? [] : proof(nearest!, [priorArrears]))
      ],
      [],
      increased
        ? [
            "Confira a evolução e os encaminhamentos de cobrança com o responsável, sem executar contato automático."
          ]
        : []
    );
  }

  const crossCheck = (
    id: "budget" | "bank",
    candidates: Prepared[],
    actual: StructuredFinancialEntry | undefined,
    labels: string[],
    missing: string,
    success: string
  ) => {
    const candidate = candidates.length === 1 ? candidates[0] : undefined;
    const reference = candidate === undefined ? undefined : one(candidate, labels);
    const sameAccount =
      id !== "bank" ||
      (current.field("conta bancaria") !== undefined &&
        current.field("conta bancaria") === candidate?.field("conta bancaria"));
    if (
      current.period === null ||
      actual === undefined ||
      reference === undefined ||
      candidate!.unsafe ||
      !comparable(candidate!) ||
      !sameAccount
    ) {
      add(
        id,
        unknown,
        "O cruzamento exige valores únicos, período e escopo correspondentes; a presença de um arquivo não confirma a conferência.",
        [],
        [missing],
        ["Envie ou esclareça a base correspondente ao período recebido."]
      );
      return;
    }
    const difference = BigInt(actual.amountMinor) - BigInt(reference.amountMinor);
    add(
      id,
      (id === "budget" ? difference > 0n : difference !== 0n) ? "atenção" : "ok",
      `${success}: balancete ${money(BigInt(actual.amountMinor))}; referência ${money(BigInt(reference.amountMinor))}; diferença ${money(difference)}. ${id === "bank" ? "Confronto apenas do saldo bancário informado, sem certificar conciliação de todos os movimentos ou contas." : "Comparação dos totais mensais explícitos; não confirma cumprimento de cada rubrica ou aprovação do orçamento."}`,
      [
        ...proof(current, [actual]),
        ...proof(candidate!, [reference]),
        ...(id === "bank"
          ? [
              ...literalFieldProof(current, "Conta bancária"),
              ...literalFieldProof(candidate!, "Conta bancária")
            ]
          : [])
      ],
      [],
      difference !== 0n
        ? ["Peça a memória da diferença e a justificativa documentada ao responsável contábil."]
        : []
    );
  };
  crossCheck(
    "budget",
    samePeriod.filter((item) => item.isBudget),
    expenses,
    ["despesas", "despesas previstas", "orcamento de despesas"],
    `Orçamento mensal de ${current.period ?? "competência a confirmar"}, com despesas comparáveis.`,
    "Despesas versus orçamento mensal"
  );

  const expenseEntries = current.entries.filter((entry) =>
    /^(?:despesa\s*[-–:]|despesa extraordinaria\b|obra\b|reparo emergencial\b|agua$|energia$|limpeza$|manutencao$)/u.test(
      normalize(entry.originalLabel)
    )
  );
  const supports = samePeriod.filter((item) => item.isSupport);
  type Support = {
    state: "complete" | "partial" | "missing" | "ambiguous" | "excess";
    amount: bigint;
    pending: bigint;
    citations: AnswerCitation[];
  };
  const supportCache = new Map<StructuredFinancialEntry, Support>();
  function supportOf(entry: StructuredFinancialEntry): Support {
    const cached = supportCache.get(entry);
    if (cached) return cached;
    const result = calculateSupport(entry);
    supportCache.set(entry, result);
    return result;
  }
  function calculateSupport(entry: StructuredFinancialEntry): Support {
    const unavailable = (state: Support["state"]): Support => ({
      state,
      amount: 0n,
      pending: 0n,
      citations: []
    });
    if (current.duplicateRubrics.has(normalize(entry.originalLabel)))
      return unavailable("ambiguous");
    const linked = supports.filter(
      (support) => support.field("lancamento") === normalize(entry.originalLabel)
    );
    if (!linked.length) return unavailable("missing");
    const amounts = linked.map((support) =>
      one(support, ["valor", normalize(entry.originalLabel)])
    );
    const identifiers = linked.map(
      (support) =>
        support.field("identificador do comprovante") ?? support.document.documentVersionId
    );
    if (
      new Set(identifiers).size !== identifiers.length ||
      linked.some((s) => s.unsafe) ||
      amounts.some((amount) => amount === undefined || BigInt(amount.amountMinor) < 0n) ||
      BigInt(entry.amountMinor) < 0n
    )
      return unavailable("ambiguous");
    const amount = amounts.reduce((sum, v) => sum + BigInt(v!.amountMinor), 0n),
      expected = BigInt(entry.amountMinor);
    return {
      state: amount === expected ? "complete" : amount > expected ? "excess" : "partial",
      amount,
      pending: amount < expected ? expected - amount : 0n,
      citations: linked.flatMap((support, index) => [
        ...proof(support, [amounts[index]!]),
        ...literalFieldProof(support, "Lançamento")
      ])
    };
  }
  const supportFor = (entry: StructuredFinancialEntry) => supportOf(entry).citations;
  const fullySupported = (entry: StructuredFinancialEntry) => supportOf(entry).state === "complete";
  const supportDescription = (entry: StructuredFinancialEntry) => {
    const support = supportOf(entry);
    if (support.state === "complete") return "suporte vinculado localizado";
    if (support.state === "partial")
      return `suporte parcial de ${money(support.amount)}; faltam ${money(support.pending)} de comprovação`;
    if (support.state === "ambiguous") return "suporte ambíguo; soma não confirmada";
    if (support.state === "excess")
      return `comprovantes vinculados somam ${money(support.amount)} e excedem o lançamento; confira o vínculo`;
    return "suporte vinculado não localizado no material consultado";
  };
  const missingSupport = (entry: StructuredFinancialEntry) => {
    const s = supportOf(entry);
    return s.state === "partial"
      ? `Comprovante para a parcela de ${money(s.pending)} de ${entry.originalLabel}, competência ${current.period ?? "a confirmar"}, com vínculo explícito ao lançamento.`
      : `Comprovante de ${entry.originalLabel}, ${money(BigInt(entry.amountMinor))}, competência ${current.period ?? "a confirmar"}, com vínculo explícito ao lançamento.`;
  };
  const extraordinary = expenseEntries.filter((entry) =>
    /^(?:despesa extraordinaria|obra|reparo emergencial)\b/u.test(normalize(entry.originalLabel))
  );
  if (extraordinary.length === 0)
    add(
      "extraordinary",
      unknown,
      "Não foi identificado lançamento extraordinário explícito; isso não comprova ausência desse tipo de gasto.",
      [],
      ["Detalhamento das despesas extraordinárias e justificativas da competência recebida."],
      ["Confira o detalhamento antes de concluir que não houve gasto extraordinário."]
    );
  else
    add(
      "extraordinary",
      "atenção",
      extraordinary
        .map(
          (entry) =>
            `${entry.originalLabel}: ${money(BigInt(entry.amountMinor))}; ${supportDescription(entry)}`
        )
        .join(". ") +
        ". A necessidade de aprovação e sua existência ainda precisam ser verificadas nos documentos aplicáveis.",
      [...proof(current, extraordinary), ...extraordinary.flatMap(supportFor)],
      extraordinary
        .filter((entry) => !fullySupported(entry))
        .map(
          (entry) =>
            `Nota, recibo ou contrato vinculado a ${entry.originalLabel}, ${money(BigInt(entry.amountMinor))}, ${current.period ?? "competência a confirmar"}.`
        ),
      [
        "Confira a justificativa e a autorização aplicável a cada gasto extraordinário com o síndico e o responsável contábil."
      ],
      `${extraordinary.length} lançamento(s) extraordinário(s) identificado(s). Confira os suportes e a autorização aplicável antes de validar esses gastos.`
    );
  crossCheck(
    "bank",
    samePeriod.filter((item) => item.isBank && item.field("finalidade") !== "fundo de reserva"),
    one(current, ["saldo bancario", "saldo conta corrente"]),
    ["saldo final", "saldo bancario"],
    `Extrato bancário de ${current.period ?? "competência a confirmar"}, identificando a conta e o saldo bancário correspondente no balancete.`,
    "Saldo bancário informado versus extrato"
  );

  const reserve = one(current, [
    "fundo de reserva",
    "saldo do fundo de reserva",
    "saldo final do fundo de reserva"
  ]);
  const reserveUse = one(current, ["uso do fundo de reserva"]);
  const reserveBanks = samePeriod.filter(
    (item) => item.isBank && !item.unsafe && item.field("finalidade") === "fundo de reserva"
  );
  const reserveBank = reserveBanks.length === 1 ? reserveBanks[0] : undefined;
  const reserveBankBalance =
    reserveBank === undefined ? undefined : one(reserveBank, ["saldo final"]);
  const reserveBankMatches =
    reserveBank !== undefined &&
    reserveBankBalance !== undefined &&
    reserve !== undefined &&
    current.field("conta do fundo de reserva") !== undefined &&
    current.field("conta do fundo de reserva") === reserveBank.field("conta bancaria");
  const reserveDifference = reserveBankMatches
    ? BigInt(reserve!.amountMinor) - BigInt(reserveBankBalance!.amountMinor)
    : null;
  const reserveUsed = reserveUse !== undefined && BigInt(reserveUse.amountMinor) > 0n;
  const reserveVerified = reserveDifference === 0n && reserveUse !== undefined && !reserveUsed;
  add(
    "reserve",
    reserveUsed || (reserveDifference !== null && reserveDifference !== 0n)
      ? "atenção"
      : reserveVerified
        ? "ok"
        : unknown,
    `${reserve === undefined ? "Não há saldo único e legível do fundo de reserva." : `Saldo informado do fundo: ${money(BigInt(reserve.amountMinor))}.`}${reserveUse === undefined ? "" : ` Uso informado: ${money(BigInt(reserveUse.amountMinor))}.`}${reserveDifference === null ? " A segregação bancária não foi confirmada." : ` Extrato da conta identificada para o fundo: ${money(BigInt(reserveBankBalance!.amountMinor))}; diferença ${money(reserveDifference)}.`} A conferência numérica não certifica finalidade ou autorização de utilização.`,
    [
      ...proof(
        current,
        [reserve, reserveUse].filter((entry) => entry !== undefined)
      ),
      ...literalFieldProof(current, "Conta do fundo de reserva"),
      ...(reserveBankMatches
        ? [
            ...proof(reserveBank!, [reserveBankBalance!]),
            ...literalFieldProof(reserveBank!, "Finalidade"),
            ...literalFieldProof(reserveBank!, "Conta bancária")
          ]
        : [])
    ],
    [
      ...(reserveUse === undefined
        ? ["Movimentação do fundo com o valor de uso explicitamente informado."]
        : []),
      ...(reserveBankMatches
        ? []
        : [
            "Movimentação e extrato segregado do fundo de reserva, identificando a conta correspondente."
          ]),
      ...(reserveUsed
        ? ["Regra de finalidade e autorização vinculada ao uso informado do fundo de reserva."]
        : [])
    ],
    reserveVerified
      ? []
      : [
          "Confira saldo, finalidade e autorização nos documentos do fundo antes de validar sua utilização."
        ]
  );

  const unsupported = expenseEntries.filter((entry) => !fullySupported(entry));
  add(
    "support",
    expenseEntries.length === 0 || unsupported.length > 0 ? unknown : "ok",
    expenseEntries.length === 0
      ? "Não foi possível identificar despesas individualizadas para vincular aos comprovantes."
      : expenseEntries
          .map(
            (entry) =>
              `${entry.originalLabel} (${money(BigInt(entry.amountMinor))}): ${supportDescription(entry)}`
          )
          .join(". ") + ". O vínculo não certifica pagamento, execução ou adequação contábil.",
    [...proof(current, expenseEntries), ...expenseEntries.flatMap(supportFor)],
    expenseEntries.length === 0
      ? ["Relação individualizada dos lançamentos e seus comprovantes."]
      : unsupported.map(missingSupport),
    unsupported.length > 0
      ? [
          "Solicite os comprovantes das parcelas pendentes indicadas e confira sua correspondência com os lançamentos; esclareça vínculos ambíguos ou excessivos."
        ]
      : [],
    expenseEntries.length === 0
      ? "Não foi possível identificar despesas individualizadas para conferir os comprovantes."
      : `${unsupported.length} de ${expenseEntries.length} despesa(s) sem suporte integral confirmado. ${unsupported.map((e) => `${e.originalLabel}: ${supportDescription(e)}`).join(". ")}. O vínculo não certifica pagamento ou execução.`
  );

  const historyLimits: string[] = [];
  const comparedProof: AnswerCitation[] = [];
  const historyChanges: string[] = [];
  if (conflicts.length > 1)
    historyLimits.push(
      "Há mais de um balancete para a competência recebida; confirme qual se aplica antes de comparar."
    );
  if (current.period === null)
    historyLimits.push("Confirme uma única competência no cabeçalho do balancete recebido.");
  if (conflicts.length <= 1 && current.period !== null) {
    for (const period of [...new Set(history.map((item) => item.period!))]) {
      const versions = history.filter((item) => item.period === period);
      if (versions.length !== 1 || !comparable(versions[0]!)) {
        historyLimits.push(
          `${period}: versões concorrentes ou regime/plano de contas divergente ou escopo não mensal; comparação suspensa.`
        );
        continue;
      }
      const previous = versions[0]!;
      try {
        const comparison = compareFinancialPeriods(context, {
          currentPeriod: current.period,
          previousPeriod: period,
          amounts: [
            ...financialAmountsFromStructuredExtraction(
              current.historyExtraction,
              current.document.documentTitle
            ),
            ...financialAmountsFromStructuredExtraction(
              previous.historyExtraction,
              previous.document.documentTitle
            )
          ]
        });
        for (const item of comparison.rubrics) {
          if (item.status !== "compared") {
            historyLimits.push(
              `${period}: ${item.rubric} sem valores comparáveis inequívocos; ausência não equivale a zero.`
            );
            continue;
          }
          const sources = [
            ...proof(current),
            ...proof(previous),
            ...[current, previous].flatMap((document) =>
              ["Regime", "Plano de contas", "Escopo"].flatMap((field) =>
                literalFieldProof(document, field)
              )
            ),
            ...item.sources.map((source) => ({
              id: `history:${source.documentVersionId}:${source.startOffset}`,
              evidenceId: `history:${source.documentVersionId}:${source.startOffset}`,
              documentId: source.documentId,
              documentVersionId: source.documentVersionId,
              title: source.documentTitle,
              page: source.page,
              excerpt: source.excerpt,
              startOffset: source.startOffset,
              endOffset: source.endOffset,
              sourceScope: "condominium" as const
            }))
          ];
          comparedProof.push(...sources);
          rows.push({
            label: `Histórico — ${item.current!.rubric}`,
            detail: `${period}: ${money(item.previous!.amountMinor)}; ${current.period}: ${money(item.current!.amountMinor)}; diferença ${money(item.absoluteChangeMinor!)}; ${item.percentageChange === null ? "percentual indisponível (base zero ou limite de precisão)" : `variação ${item.percentageChange}%`}.`,
            citations: sources
          });
          if (
            (/^(?:despesas|inadimplencia|valor em aberto|cotas em atraso)$/u.test(item.rubric) &&
              item.absoluteChangeMinor! > 0n) ||
            (/^(?:receitas|saldo disponivel)$/u.test(item.rubric) && item.absoluteChangeMinor! < 0n)
          )
            historyChanges.push(
              `${item.current!.rubric}: ${period} ${money(item.previous!.amountMinor)} → ${current.period} ${money(item.current!.amountMinor)}`
            );
        }
      } catch {
        historyLimits.push(
          `${period}: rubrica duplicada ou valor fora do contrato de cálculo; peça esclarecimento sem escolher um lançamento.`
        );
      }
    }
  }
  if (missingPrevious)
    historyLimits.push(
      `Não foi localizado balancete elegível de ${previousMonth(current.period!)} no material consultado.`
    );
  if (current.basis === undefined || history.some((item) => item.basis === undefined))
    historyLimits.push(
      "Regime de caixa/competência não está explícito em toda a base; diferenças de regime ainda exigem conferência humana."
    );
  if (current.plan === undefined || history.some((item) => item.plan === undefined))
    historyLimits.push(
      "Plano de contas não está explícito em toda a base; as comparações se limitam a rótulos iguais e exigem confirmação de equivalência."
    );
  limitations.push(...historyLimits);
  add(
    "history",
    historyChanges.length > 0
      ? "atenção"
      : comparedProof.length > 0 && historyLimits.length === 0
        ? "ok"
        : unknown,
    comparedProof.length > 0
      ? `${historyChanges.length > 0 ? `Variações para conferir: ${historyChanges.join("; ")}. ` : ""}As linhas de histórico mostram as diferenças calculadas entre rubricas de mesmo rótulo e moeda. Confira as limitações de comparabilidade indicadas.`
      : "Não há base histórica inequívoca para calcular variações neste recebimento.",
    [
      ...comparedProof,
      ...conflicts.flatMap((item) => proof(item)),
      ...history.flatMap((item) => proof(item))
    ],
    current.period === null
      ? ["Balancete com competência única e inequívoca no cabeçalho."]
      : missingPrevious
        ? [`Balancete de ${previousMonth(current.period)}.`]
        : [],
    historyLimits.length > 0
      ? ["Confira os conflitos e períodos indicados antes de interpretar a evolução."]
      : [],
    comparedProof.length === 0
      ? "Não há base histórica inequívoca para calcular variações neste recebimento."
      : `${historyChanges.length} variação(ões) de receitas, despesas, inadimplência ou saldo disponível para conferir. As comparações e seus limites estão no detalhamento; variação não comprova irregularidade.`
  );

  const commitmentEntries = [current, ...commitmentDocuments].flatMap((document) =>
    document.entries
      .filter((entry) => /^obriga[cç][aã]o\s*[-–:]/iu.test(entry.originalLabel))
      .map((entry) => ({ document, entry }))
  );
  const dueNextMonth = commitmentEntries.filter(({ entry }) => {
    const date = /\bvencimento\s+(\d{2})\/(\d{2})\/(20\d{2})$/iu.exec(entry.originalLabel);
    if (date === null || current.period === null) return false;
    const parsed = new Date(Date.UTC(Number(date[3]), Number(date[2]) - 1, Number(date[1])));
    return (
      parsed.getUTCDate() === Number(date[1]) &&
      parsed.getUTCMonth() + 1 === Number(date[2]) &&
      parsed.getUTCFullYear() === Number(date[3]) &&
      parsed.toISOString().slice(0, 7) === nextMonth(current.period)
    );
  });
  const declaredComplete =
    commitmentDocuments.length === 1 && commitmentDocuments[0]!.field("abrangencia") === "completa";
  const commitmentSum = dueNextMonth.reduce(
    (sum, item) => sum + BigInt(item.entry.amountMinor),
    0n
  );
  const obligationsConflict =
    new Set(obligationTotals.map((item) => item.entry.amountMinor)).size > 1;
  const allCommitmentsKnown =
    declaredComplete &&
    dueNextMonth.length === commitmentEntries.length &&
    obligations !== undefined &&
    dueNextMonth.length > 0;
  const commitmentsMatch =
    allCommitmentsKnown && commitmentSum === BigInt(obligations!.amountMinor);
  add(
    "commitments",
    obligationsConflict || (allCommitmentsKnown && !commitmentsMatch)
      ? "atenção"
      : commitmentsMatch
        ? "ok"
        : unknown,
    `${obligations === undefined ? "Não há total inequívoco das obrigações do próximo mês." : `Total declarado para o próximo mês: ${money(BigInt(obligations.amountMinor))}.`} ${dueNextMonth.map(({ entry }) => `${entry.originalLabel}: ${money(BigInt(entry.amountMinor))}`).join(". ")}${obligationsConflict ? " Há totais conflitantes nas fontes." : ""}${allCommitmentsKnown ? ` A relação foi declarada completa; soma dos vencimentos ${money(commitmentSum)}${commitmentsMatch ? ", correspondente ao total declarado." : ", divergente do total declarado."}` : " A completude e os vencimentos ainda precisam ser confirmados."} Obrigações não documentadas permanecem desconhecidas.`,
    [
      ...obligationProof,
      ...dueNextMonth.flatMap(({ document, entry }) => proof(document, [entry])),
      ...commitmentDocuments.flatMap((item) => literalFieldProof(item, "Abrangência"))
    ],
    commitmentsMatch
      ? []
      : [
          "Relação completa das obrigações do próximo mês, com valores, vencimentos, folha, tributos, seguros e contratos aplicáveis."
        ],
    commitmentsMatch
      ? []
      : [
          "Confirme os compromissos e vencimentos com o responsável contábil e planeje a disponibilidade de caixa."
        ],
    `${obligations === undefined ? "Total do próximo mês não confirmado." : `Total declarado para o próximo mês: ${money(BigInt(obligations.amountMinor))}.`} ${obligationsConflict ? "Há totais conflitantes nas fontes." : allCommitmentsKnown ? `Soma dos vencimentos: ${money(commitmentSum)}; ${commitmentsMatch ? "corresponde ao total declarado" : "diverge do total declarado"}.` : "A completude e os vencimentos ainda precisam ser confirmados."}`
  );

  const warnings = prepared.flatMap((item) =>
    item.extraction.warnings.map((warning) => `${item.document.documentTitle}: ${warning}`)
  );
  limitations.push(...warnings);
  add(
    "transparency",
    current.unsafe || conflicts.length > 1
      ? "atenção"
      : current.period === null || current.responsible === undefined
        ? unknown
        : "ok",
    `${current.period === null ? "Competência não confirmada." : `Competência ${current.period} identificada.`} ${current.responsible === undefined ? "Responsável não identificado em campo explícito." : "Campo de responsável localizado."} ${current.unsafe ? "Há valores ou páginas que exigem revisão; os cálculos usam apenas entradas aceitas." : "A extração não sinalizou ambiguidade nos valores aceitos; isso não certifica completude do original."}${conflicts.length > 1 ? " Há balancetes concorrentes para o mesmo mês." : ""}`,
    [
      ...proof(current),
      ...literalFieldProof(current, "Responsável"),
      ...conflicts.flatMap((item) => proof(item))
    ],
    current.unsafe || current.period === null || current.responsible === undefined
      ? ["Original completo e legível com competência, versão e responsável identificados."]
      : [],
    current.unsafe || conflicts.length > 1
      ? ["Esclareça a leitura e as versões concorrentes antes de aprovar as contas."]
      : []
  );

  // Fontes vazias são permitidas apenas para lacunas operacionais, nunca para fatos calculados.
  validateDocumentAnalysisSources(context, documents, [
    ...rows,
    ...checks.filter((check) => check.citations.length > 0)
  ]);
  const priorityCheckIds = [...checks]
    .sort(
      (a, b) =>
        ({ atenção: 0, "não foi possível verificar": 1, ok: 2 })[a.status] -
        { atenção: 0, "não foi possível verificar": 1, ok: 2 }[b.status]
    )
    .slice(0, 3)
    .map((check) => check.id);
  return {
    status: current.period === null ? "limited" : "available",
    title: "Conferência do balancete",
    rows,
    limitations: [...new Set(limitations)],
    financialReview: { checks, priorityCheckIds }
  };
}

function literalFieldProof(document: Prepared, field: string): AnswerCitation[] {
  const results: AnswerCitation[] = [];
  for (const page of document.document.pages) {
    if (!Number.isFinite(page.qualityScore) || page.qualityScore < 0.7) continue;
    let offset = 0;
    for (const line of page.extractedText.split("\n")) {
      if (
        normalize(line || " ").startsWith(`${normalize(field)}:`) ||
        literalFinancialDeclarations(line).some(
          (declaration) => declaration.field === normalize(field)
        )
      ) {
        const startOffset = Array.from(page.extractedText.slice(0, offset)).length;
        results.push(
          citation(document, {
            condominiumId: document.document.condominiumId,
            documentId: document.document.documentId,
            documentVersionId: document.document.documentVersionId,
            pageNumber: page.pageNumber,
            startOffset,
            endOffset: startOffset + Array.from(line).length,
            excerpt: line,
            extractionMethod: page.extractionMethod,
            uncertainty: []
          })
        );
      }
      offset += line.length + 1;
    }
  }
  return results;
}
