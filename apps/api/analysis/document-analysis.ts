import type { AuthorizedCondominiumContext } from "../identity/authorized-condominium-context.js";
import type { AnswerCitation } from "../answers/answer-contract.js";
import { extractStructuredDocument } from "../documents/structured/extract-structured-document.js";
import {
  compareFinancialPeriods,
  financialAmountsFromStructuredExtraction,
  type FinancialPeriod,
  type FinancialSource
} from "./financial-analysis.js";
import { assertAnalysisLimits, type AnalysisDocument } from "./document-analysis-reader.js";
import { validateDocumentAnalysisSources } from "./document-analysis-validation.js";
import { containsHostileInstruction } from "../security/document-instructions/document-instruction-policy.js";
import {
  analyzeNormativeDocuments,
  normativeFactsFromPages
} from "./normative/normative-document-analysis.js";

export type DocumentAnalysisRow = Readonly<{
  label: string;
  detail: string;
  citations: readonly AnswerCitation[];
}>;
export type DocumentAnalysisReport = Readonly<{
  status: "available" | "limited" | "unavailable";
  title: string;
  rows: readonly DocumentAnalysisRow[];
  limitations: readonly string[];
}>;

export function isDocumentAnalysisRequest(question: string): boolean {
  return /balancete|presta[cç][aã]o de contas|(?:analis|analise|analisa|compare|comparar|avalie|avaliar).*(?:ata\b|conven[cç][aã]o|regimento|contrato)/iu.test(
    question
  );
}

export function unavailableDocumentAnalysis(): DocumentAnalysisReport {
  return {
    status: "unavailable",
    title: "Análise documental",
    rows: [],
    limitations: [
      "Não foi possível calcular a análise nesta tentativa. A resposta da conversa não confirma esta conferência."
    ]
  };
}

function citation(source: FinancialSource): AnswerCitation {
  return {
    id: `analysis:${source.documentVersionId}:${source.page}:${source.startOffset}`,
    evidenceId: `analysis:${source.documentVersionId}:${source.page}:${source.startOffset}`,
    documentId: source.documentId,
    documentVersionId: source.documentVersionId,
    title: source.documentTitle,
    page: source.page,
    excerpt: source.excerpt,
    startOffset: source.startOffset,
    endOffset: source.endOffset,
    sourceScope: "condominium"
  };
}

function money(minor: bigint): string {
  const sign = minor < 0n ? "-" : "";
  const absolute = minor < 0n ? -minor : minor;
  return `${sign}R$ ${absolute / 100n},${String(absolute % 100n).padStart(2, "0")}`;
}

/** Meses precisam ser explícitos: nunca infere o ano ou o mês anterior. */
export function requestedFinancialPeriods(question: string): readonly FinancialPeriod[] {
  return [
    ...new Set(
      [...question.matchAll(/\b(\d{4}-(?:0[1-9]|1[0-2]))\b/gu)].map(
        (match) => match[1] as FinancialPeriod
      )
    )
  ].sort();
}

export function analyzeDocumentRequest(
  context: AuthorizedCondominiumContext,
  question: string,
  documents: readonly AnalysisDocument[]
): DocumentAnalysisReport {
  if (!context.permissions.includes("document:read")) throw new Error("Acesso não autorizado.");
  if (documents.some((document) => document.condominiumId !== context.condominiumId)) {
    throw new Error("Fonte de outro condomínio na análise documental.");
  }
  assertAnalysisLimits(documents);
  if (
    documents.some(
      (document) =>
        containsHostileInstruction(document.documentTitle) ||
        document.pages.some((page) => containsHostileInstruction(page.extractedText))
    )
  ) {
    throw new Error("Não foi possível concluir a conferência com segurança documental.");
  }
  const rows: DocumentAnalysisRow[] = [];
  const limitations: string[] = [];
  const extractions = documents.map((document) => ({
    document,
    extraction: extractStructuredDocument(document)
  }));
  const periods = requestedFinancialPeriods(question);
  if (/balancete|presta[cç][aã]o de contas/iu.test(question)) {
    if (periods.length !== 2) {
      limitations.push(
        "Informe dois meses no formato AAAA-MM para comparar os balancetes sem presumir o período."
      );
    } else {
      const amounts = extractions.flatMap(({ document, extraction }) =>
        financialAmountsFromStructuredExtraction(extraction, document.documentTitle)
      );
      const comparison = compareFinancialPeriods(context, {
        currentPeriod: periods[1]!,
        previousPeriod: periods[0]!,
        amounts
      });
      limitations.push(...comparison.limitations);
      for (const item of comparison.rubrics) {
        if (
          item.status !== "compared" ||
          item.current === null ||
          item.previous === null ||
          item.absoluteChangeMinor === null
        ) {
          limitations.push(
            `Rubrica ${item.rubric}: falta valor comparável ou a leitura exige revisão (${periods.join(" e ")}).`
          );
          continue;
        }
        rows.push({
          label: item.current.rubric,
          detail: `${comparison.previousPeriod}: ${money(item.previous.amountMinor)}; ${comparison.currentPeriod}: ${money(item.current.amountMinor)}; diferença: ${money(item.absoluteChangeMinor)}; ${item.percentageChange === null ? (item.percentageStatus === "precision_limit" ? "percentual indisponível: limite de precisão numérica" : "percentual indisponível: base anterior zero") : `variação: ${item.percentageChange}%`}.`,
          citations: item.sources.map(citation)
        });
      }
    }
    limitations.push(
      "Variação não comprova irregularidade. Conciliação bancária e avaliação contábil exigem extratos e validação do responsável."
    );
  }
  for (const { document, extraction } of extractions) {
    if (extraction.tables.some((table) => table.state === "needs_review")) {
      limitations.push(
        `${document.documentTitle}: há colunas ou valores ambíguos; envie uma versão legível com rubricas inequívocas.`
      );
    }
    limitations.push(
      ...extraction.warnings.map((warning) => `${document.documentTitle}: ${warning}`)
    );
  }
  if (!/balancete|presta[cç][aã]o de contas/iu.test(question)) {
    const requestedKinds = new Set<string>();
    if (/ata\b/iu.test(question)) requestedKinds.add("meeting_minutes");
    if (/conven[cç][aã]o/iu.test(question)) requestedKinds.add("convention");
    if (/regimento/iu.test(question)) requestedKinds.add("bylaws");
    if (/contrato/iu.test(question)) requestedKinds.add("contract");
    const normative = analyzeNormativeDocuments(
      context,
      documents
        .flatMap((document) => normativeFactsFromPages(context, document))
        .filter((fact) => requestedKinds.has(fact.documentKind))
    );
    for (const finding of normative.findings) {
      if (finding.state !== "known" || finding.value === null) continue;
      rows.push({
        label: finding.source.documentTitle,
        detail: finding.value,
        citations: [citation(finding.source)]
      });
    }
    limitations.push(...normative.limitations);
    if (normative.findings.length === 0) {
      limitations.push(
        "Não foram localizados campos com rótulos explícitos para esta conferência automática. A consulta textual continua disponível; não é uma análise integral do documento."
      );
    }
    limitations.push(
      "A conferência não confirma validade jurídica, vigência, quórum atingido ou execução de obrigação. Decisões de risco exigem validação profissional."
    );
  }
  if (rows.length > 200) {
    return {
      status: "limited",
      title: "Conferência documental calculada",
      rows: [],
      limitations: [
        "O conjunto contém achados demais para um turno. Delimite os documentos antes de prosseguir."
      ]
    };
  }
  validateDocumentAnalysisSources(context, documents, rows);
  return {
    status: rows.length > 0 ? "available" : "limited",
    title: "Conferência documental calculada",
    rows,
    limitations: [...new Set(limitations)]
  };
}
