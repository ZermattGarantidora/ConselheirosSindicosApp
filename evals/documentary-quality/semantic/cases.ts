import type { DocumentaryQualityCase } from "../dataset.js";
import { semanticFixtures, type SemanticFixtureSource } from "./fixtures.js";

export type SemanticSource = Readonly<{
  documentId: string;
  documentVersionId: string | null;
  title: string;
  page: number | null;
  content: string;
  limitation: SemanticFixtureSource["limitation"] | null;
  validityStatus: "pending";
}>;

export type SemanticReviewCase = Readonly<{
  id: string;
  sourceCaseId: string;
  segment: DocumentaryQualityCase["segment"];
  task: string;
  question: string;
  hasConflict: boolean;
  sources: readonly SemanticSource[];
  expectedResult: string;
  severity: "P0" | "P1";
  mechanicalChecks: readonly string[];
  semanticRubric: readonly string[];
  requiredReviewers: readonly ("contador" | "jurista" | "síndico")[];
}>;

function sourceFor(testCase: DocumentaryQualityCase): readonly SemanticSource[] {
  const fixture = semanticFixtures[testCase.task];
  if (fixture === undefined) throw new Error(`Fixture semântica ausente: ${testCase.id}`);
  return Object.freeze(
    fixture.sources.map((source, index) =>
      Object.freeze({
        documentId: `semantic-${testCase.id.toLowerCase()}-${fixture.conflict ? "document" : index + 1}`,
        documentVersionId:
          source.version === null ? null : `semantic-${testCase.id.toLowerCase()}-v${index + 1}`,
        title: `Documento fictício ${testCase.id} — ${index + 1}`,
        page: source.page === undefined ? 1 : source.page,
        content: source.content,
        limitation: source.limitation ?? null,
        validityStatus: "pending" as const
      })
    )
  );
}

function reviewersFor(
  testCase: DocumentaryQualityCase
): readonly ("contador" | "jurista" | "síndico")[] {
  if (
    ["pagamento de gás", "reajuste de portaria", "aditivo contraditório"].includes(testCase.task)
  ) {
    return Object.freeze(["contador", "jurista", "síndico"]);
  }
  if (
    testCase.segment === "contrato" ||
    testCase.segment === "normativo" ||
    testCase.segment === "ata"
  )
    return Object.freeze(["jurista", "síndico"]);
  if (testCase.segment === "citacao") return Object.freeze(["contador", "síndico"]);
  if (testCase.task === "citação sustenta número") return Object.freeze(["contador", "síndico"]);
  return Object.freeze(["síndico"]);
}

export function createSemanticReviewCases(
  cases: readonly DocumentaryQualityCase[]
): readonly SemanticReviewCase[] {
  return Object.freeze(
    cases
      .filter((item) => item.kind === "semantic")
      .map((testCase) =>
        Object.freeze({
          id: `SR-${testCase.id.slice(5)}`,
          sourceCaseId: testCase.id,
          segment: testCase.segment,
          task: testCase.task,
          question: semanticFixtures[testCase.task]?.question ?? "",
          hasConflict: semanticFixtures[testCase.task]?.conflict === true,
          sources: sourceFor(testCase),
          expectedResult: testCase.expectedResult,
          severity: testCase.severity,
          mechanicalChecks: Object.freeze([
            "fontes pertencem ao condomínio sintético autorizado",
            "cada citação deve corresponder a documento, versão, página e trecho da fonte",
            "nenhuma fonte externa ou conteúdo instrucional pode alterar o escopo"
          ]),
          semanticRubric: Object.freeze([
            "resposta atende ao resultado esperado sem extrapolar o documento",
            "abstenção, conflito e escalonamento são usados quando exigidos",
            "linguagem distingue fato documentado, limite e próximo passo"
          ]),
          requiredReviewers: reviewersFor(testCase)
        })
      )
  );
}
