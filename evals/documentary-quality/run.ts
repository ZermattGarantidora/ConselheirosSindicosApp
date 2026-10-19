import {
  compareFinancialPeriods,
  financialAmountsFromStructuredExtraction,
  type FinancialAmount,
  type FinancialPeriod
} from "../../apps/api/analysis/financial-analysis.js";
import { createCondominiumId } from "../../apps/api/core/condominium-scope.js";
import { validateGeneratedAnswer } from "../../apps/api/answers/citation-validator.js";
import { extractStructuredDocument } from "../../apps/api/documents/structured/extract-structured-document.js";
import type { AuthorizedCondominiumContext } from "../../apps/api/identity/authorized-condominium-context.js";
import type { RetrievalEvidence } from "../../apps/api/retrieval/retrieval-contract.js";
import { selectFinancialEvidence } from "../../apps/api/retrieval/financial-retrieval.js";
import { documentaryQualityCases, type DocumentaryQualityCase } from "./dataset.js";
import { integratedExecutors } from "./integrated-executors.js";
import { tableExecutors } from "./tables/executors.js";
import { ocrExecutors } from "./ocr/executors.js";
import { securityExecutors } from "./security/executors.js";

const condominiumA = createCondominiumId("dq-condominium-a");
const condominiumB = createCondominiumId("dq-condominium-b");
const context: AuthorizedCondominiumContext = Object.freeze({
  condominiumId: condominiumA,
  userId: "dq-user" as AuthorizedCondominiumContext["userId"],
  roleKey: "manager",
  membershipRevision: "dq-v1",
  permissions: Object.freeze(["document:read"] as const)
});
function assert(value: unknown, message: string): asserts value {
  if (!value) throw new Error(message);
}

function extract(
  documentId: string,
  version: string,
  month: string,
  label: string,
  value: string
): readonly FinancialAmount[] {
  const result = extractStructuredDocument({
    condominiumId: condominiumA,
    documentId,
    documentVersionId: version,
    pages: [
      {
        pageNumber: 1,
        extractedText: `Balancete ${month} de 2026\n${label}: R$ ${value}`,
        extractionMethod: "pdf_text",
        qualityScore: 1
      }
    ]
  });
  return financialAmountsFromStructuredExtraction(result, `Balancete ${month}`);
}
function compare(
  label: string,
  beforeMonth: string,
  afterMonth: string,
  before: string,
  after: string,
  delta: bigint,
  percent: number | null
): void {
  const amounts = [
    ...extract("dq-before", "dq-before-v1", beforeMonth, label, before),
    ...extract("dq-after", "dq-after-v1", afterMonth, label, after)
  ];
  const result = compareFinancialPeriods(context, {
    currentPeriod: amounts[1]!.period,
    previousPeriod: amounts[0]!.period,
    amounts
  });
  assert(result.rubrics[0]?.status === "compared", `${label}: comparação ausente.`);
  assert(
    result.rubrics[0]?.absoluteChangeMinor === delta,
    `${label}: valor da variação incorreto.`
  );
  assert(result.rubrics[0]?.percentageChange === percent, `${label}: percentual incorreto.`);
  assert(result.rubrics[0]?.sources.length === 2, `${label}: fontes não preservadas.`);
}
function citationEvidence(): RetrievalEvidence {
  return Object.freeze({
    id: "dq-evidence",
    condominiumId: condominiumA,
    documentId: "dq-document-a",
    documentVersionId: "dq-version-a",
    documentVersionNumber: 1,
    documentTitle: "Documento A",
    documentType: "other",
    sourceKind: "user_upload",
    sourceScope: "condominium",
    pageId: "dq-page",
    pageNumber: 1,
    startOffset: 0,
    endOffset: 23,
    content: "Regra: uso permitido.",
    contentSha256: "synthetic",
    lexicalScore: 1,
    semanticScore: 1,
    rerankScore: 1,
    rank: 1,
    extractionMethod: "pdf_text",
    qualityScore: 1,
    processingStatus: "ready",
    validityStatus: "confirmed",
    validFrom: null,
    validUntil: null
  });
}
type Executor = (testCase: DocumentaryQualityCase) => void | Promise<void>;
const executors = new Map<string, Executor>([
  [
    "comparar energia janeiro-fevereiro",
    () => compare("energia", "janeiro", "fevereiro", "1.000,00", "1.250,00", 25_000n, 25)
  ],
  [
    "comparar água com queda",
    () => compare("água", "março", "abril", "900,00", "720,00", -18_000n, -20)
  ],
  [
    "comparar receita de cotas",
    () => compare("receita de cotas", "maio", "junho", "8.000,00", "8.400,00", 40_000n, 5)
  ],
  [
    "comparar saldo ordinário",
    () => compare("saldo ordinário", "julho", "agosto", "10.010,00", "9.990,00", -2_000n, -0.19)
  ],
  [
    "comparar fundo de reserva",
    () => compare("fundo de reserva", "setembro", "outubro", "2.000,00", "2.300,00", 30_000n, 15)
  ],
  [
    "recusar percentual com base zero",
    () => {
      const amounts = [
        ...extract("dq-zero-before", "dq-zero-before-v1", "janeiro", "multa", "0,00"),
        ...extract("dq-zero-after", "dq-zero-after-v1", "fevereiro", "multa", "150,00")
      ];
      const result = compareFinancialPeriods(context, {
        currentPeriod: "2026-02",
        previousPeriod: "2026-01",
        amounts
      });
      assert(
        result.rubrics[0]?.percentageStatus === "zero_denominator",
        "percentual foi inventado."
      );
    }
  ],
  [
    "pedir mês anterior ausente",
    () => {
      const amounts = extract(
        "dq-only-current",
        "dq-only-current-v1",
        "fevereiro",
        "limpeza",
        "500,00"
      );
      const result = compareFinancialPeriods(context, {
        currentPeriod: "2026-02",
        previousPeriod: "2026-01",
        amounts
      });
      assert(
        result.rubrics[0]?.status === "missing_previous",
        "ausência do mês anterior não foi preservada."
      );
    }
  ],
  [
    "recusar rubrica duplicada",
    () => {
      const duplicate = extractStructuredDocument({
        condominiumId: condominiumA,
        documentId: "dq-duplicate",
        documentVersionId: "dq-duplicate-v1",
        pages: [
          {
            pageNumber: 1,
            extractedText: "Balancete fevereiro de 2026\nEnergia: R$ 2,00\nEnergia: R$ 3,00",
            extractionMethod: "pdf_text",
            qualityScore: 1
          }
        ]
      });
      const amounts = [
        ...extract("dq-duplicate-before", "dq-duplicate-before-v1", "janeiro", "energia", "1,00"),
        ...financialAmountsFromStructuredExtraction(duplicate, "Balancete fevereiro")
      ];
      let rejected = false;
      try {
        compareFinancialPeriods(context, {
          currentPeriod: "2026-02",
          previousPeriod: "2026-01",
          amounts
        });
      } catch {
        rejected = true;
      }
      assert(rejected, "rubrica duplicada não exigiu revisão.");
    }
  ],
  [
    "recusar período inválido",
    () => {
      let rejected = false;
      try {
        compareFinancialPeriods(context, {
          currentPeriod: "2026-13" as FinancialPeriod,
          previousPeriod: "2026-01",
          amounts: []
        });
      } catch {
        rejected = true;
      }
      assert(rejected, "período inválido foi aceito.");
    }
  ],
  [
    "filtrar canário de outro condomínio",
    () => {
      const allowed = extract(
        "dq-authorized",
        "dq-authorized-v1",
        "janeiro",
        "energia",
        "100,00"
      )[0]!;
      const canary = Object.freeze({ ...allowed, condominiumId: condominiumB });
      const selected = selectFinancialEvidence(
        { condominiumId: condominiumA, periods: ["2026-01"] },
        [allowed, canary]
      );
      assert(
        selected.length === 1 && selected[0]?.condominiumId === condominiumA,
        "houve recuperação cruzada."
      );
    }
  ],
  [
    "comparação com entrada cruzada",
    () => {
      const allowed = extract(
        "dq-cross-before",
        "dq-cross-before-v1",
        "janeiro",
        "energia",
        "100,00"
      )[0]!;
      const current = extract(
        "dq-cross-current",
        "dq-cross-current-v1",
        "fevereiro",
        "energia",
        "125,00"
      )[0]!;
      const foreign = Object.freeze({
        ...current,
        condominiumId: condominiumB,
        amountMinor: 99999n
      });
      const result = compareFinancialPeriods(context, {
        currentPeriod: "2026-02",
        previousPeriod: "2026-01",
        amounts: [allowed, current, foreign]
      });
      assert(
        result.rubrics[0]?.absoluteChangeMinor === 2500n,
        "valor de outro condomínio entrou na comparação."
      );
    }
  ],
  [
    "citação com versão de B",
    () => {
      const source = citationEvidence();
      let rejected = false;
      try {
        validateGeneratedAnswer(
          {
            answer: "A regra consta no documento.",
            answerMode: "grounded",
            citations: [
              {
                evidenceId: source.id,
                documentId: source.documentId,
                documentVersionId: "dq-version-b",
                title: source.documentTitle,
                page: source.pageNumber,
                excerpt: "Regra: uso permitido."
              }
            ],
            attentionPoints: [],
            suggestedNextStep: null,
            specialist: { required: false, type: null, reason: null }
          },
          [source]
        );
      } catch {
        rejected = true;
      }
      assert(rejected, "citação com versão divergente foi aceita.");
    }
  ],
  [
    "tabela com coluna deslocada",
    () => {
      const result = extractStructuredDocument({
        condominiumId: condominiumA,
        documentId: "dq-table",
        documentVersionId: "dq-table-v1",
        pages: [
          {
            pageNumber: 1,
            extractedText: "Balancete janeiro de 2026\nEnergia R$ 10,00 R$ 20,00",
            extractionMethod: "pdf_text",
            qualityScore: 1
          }
        ]
      });
      assert(
        result.tables[0]?.state === "needs_review" && result.financialEntries.length === 0,
        "colunas ambíguas foram associadas."
      );
    }
  ],
  [
    "tabela com separador ambíguo",
    () => {
      const result = extractStructuredDocument({
        condominiumId: condominiumA,
        documentId: "dq-ambiguous",
        documentVersionId: "dq-ambiguous-v1",
        pages: [
          {
            pageNumber: 1,
            extractedText: "Balancete janeiro de 2026\nEnergia 1.234.567",
            extractionMethod: "pdf_text",
            qualityScore: 1
          }
        ]
      });
      assert(result.financialEntries.length === 0, "número sem formato BRL foi convertido.");
    }
  ],
  [
    "tabela sem período",
    () => {
      const result = extractStructuredDocument({
        condominiumId: condominiumA,
        documentId: "dq-no-period",
        documentVersionId: "dq-no-period-v1",
        pages: [
          {
            pageNumber: 1,
            extractedText: "Balancete\nEnergia: R$ 20,00",
            extractionMethod: "pdf_text",
            qualityScore: 1
          }
        ]
      });
      assert(result.financialPeriod.state === "unknown", "período ausente foi inferido.");
      assert(
        financialAmountsFromStructuredExtraction(result, "Balancete").length === 0,
        "valor sem período entrou na comparação."
      );
    }
  ],
  [
    "sem permissão document:read",
    () => {
      let rejected = false;
      try {
        compareFinancialPeriods(
          { ...context, permissions: Object.freeze([] as const) },
          { currentPeriod: "2026-02", previousPeriod: "2026-01", amounts: [] }
        );
      } catch {
        rejected = true;
      }
      assert(rejected, "análise sem permissão documental foi aceita.");
    }
  ]
]);
function pendingReason(testCase: DocumentaryQualityCase): string {
  if (testCase.segment === "ocr")
    return "Falta o executor que compara imagem/estrutura original com a leitura; o piso de qualidade textual já é aplicado.";
  if (testCase.segment === "isolamento")
    return "O contrato disponível não cobre esta operação de cache, vetor, log ou metadado de arquivo.";
  if (testCase.segment === "instrucao")
    return "Não há caminho de resposta integrado que avalie instruções encontradas no documento.";
  if (testCase.segment === "tabela")
    return "O extrator ainda não representa a semântica de tabela necessária para esta asserção.";
  return "O caminho integrado necessário para esta asserção não está disponível.";
}

for (const [task, executor] of integratedExecutors) executors.set(task, executor);
for (const additions of [tableExecutors, ocrExecutors, securityExecutors]) {
  for (const [task, executor] of additions) {
    assert(!executors.has(task), `Executor duplicado: ${task}`);
    executors.set(task, executor);
  }
}

export async function runDocumentaryQualitySuite() {
  const deterministic = documentaryQualityCases.filter((item) => item.kind === "deterministic");
  const semantic = documentaryQualityCases.filter((item) => item.kind === "semantic");
  assert(
    documentaryQualityCases.length === 100,
    "A bateria deve ter exatamente 100 casos sintéticos."
  );
  assert(
    new Set(documentaryQualityCases.map((item) => item.id)).size === 100,
    "IDs devem ser únicos."
  );
  assert(
    new Set(documentaryQualityCases.map((item) => item.task)).size === 100,
    "Tarefas devem ser distintas."
  );
  assert(
    deterministic.length === 50 && semantic.length === 50,
    "A bateria deve separar 50 casos por método."
  );
  assert(
    documentaryQualityCases.every(
      (item) =>
        item.inputs.length > 0 &&
        item.expectedSources.length > 0 &&
        item.judgingCriteria.length >= 3
    ),
    "Todo caso precisa ser revisável."
  );
  const executed = deterministic.filter((item) => executors.has(item.task));
  for (const testCase of executed) await executors.get(testCase.task)?.(testCase);
  const pendingIntegration = deterministic.filter((item) => !executors.has(item.task));
  assert(pendingIntegration.length === 0, "Existem casos determinísticos sem executor integrado.");
  const perSegment = Object.fromEntries(
    [...new Set(documentaryQualityCases.map((item) => item.segment))].map((segment) => [
      segment,
      {
        total: documentaryQualityCases.filter((item) => item.segment === segment).length,
        deterministicExecuted: executed.filter((item) => item.segment === segment).length,
        deterministicPendingIntegration: pendingIntegration.filter(
          (item) => item.segment === segment
        ).length,
        semanticPendingHumanReview: semantic.filter((item) => item.segment === segment).length
      }
    ])
  );
  return Object.freeze({
    suite: "spec-031-documentary-quality",
    dataPolicy: "synthetic-only",
    totalCases: documentaryQualityCases.length,
    deterministic: {
      planned: deterministic.length,
      executed: executed.length,
      passed: executed.length,
      failed: 0,
      pendingIntegration: pendingIntegration.length
    },
    semantic: {
      planned: semantic.length,
      executed: 0,
      status: "pending_human_and_model_review" as const
    },
    p0: documentaryQualityCases.filter((item) => item.severity === "P0").length,
    providerCalls: 0,
    specialistReview: "pending",
    pendingCases: pendingIntegration.map((item) =>
      Object.freeze({ id: item.id, task: item.task, reason: pendingReason(item) })
    ),
    perSegment
  });
}

if (process.argv[1]?.replaceAll("\\", "/").endsWith("evals/documentary-quality/run.ts")) {
  process.stdout.write(`${JSON.stringify(await runDocumentaryQualitySuite(), null, 2)}\n`);
}
