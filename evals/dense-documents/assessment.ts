import type { PublicAnswer } from "../../apps/api/answers/answer-contract.js";
import type { RetrievalEvidence } from "../../apps/api/retrieval/retrieval-contract.js";
import type { DenseCase } from "./oracle.js";
import type { DenseKind } from "./corpus.js";

const normalize = (text: string) =>
  text
    .normalize("NFD")
    .replaceAll(/[\u0300-\u036f]/gu, "")
    .toLowerCase()
    .replaceAll(/\s/gu, "");
export function assessDenseAnswer(
  testCase: DenseCase,
  response: PublicAnswer | null,
  evidence: readonly RetrievalEvidence[],
  documents: readonly { kind: DenseKind; documentVersionId: string }[],
  mechanicalErrors: readonly string[]
) {
  const sourceCoverage = testCase.sources.map((source) => {
    const doc = documents.find((d) => d.kind === source.document);
    if (!doc) throw new Error("Documento do gabarito nao foi preparado.");
    return {
      ...source,
      retrieved: evidence.some(
        (e) =>
          e.documentVersionId === doc.documentVersionId &&
          e.pageNumber === source.page &&
          normalize(e.content).includes(normalize(source.anchor))
      ),
      cited:
        response?.citations.some(
          (c) =>
            c.documentVersionId === doc.documentVersionId &&
            c.page === source.page &&
            normalize(c.excerpt).includes(normalize(source.anchor))
        ) ?? false
    };
  });
  const facts = testCase.atoms.map((atom) => ({
    atom,
    present: normalize(response?.answer ?? "").includes(normalize(atom).replace(/^r\$/u, ""))
  }));
  const qualification =
    !testCase.qualify ||
    /n[aã]o|falt|ausen|penden|sem |diverg|conflit|limit|precis|minuta|propost/iu.test(
      response?.answer ?? ""
    );
  return {
    mechanicalErrors,
    sourceCoverage,
    facts,
    qualification,
    retrievedSources: sourceCoverage.filter((s) => s.retrieved).length,
    requiredSources: sourceCoverage.length,
    automaticCoverageComplete:
      !!response &&
      response.answerMode !== "failed" &&
      mechanicalErrors.length === 0 &&
      facts.every((f) => f.present) &&
      qualification &&
      sourceCoverage.every((s) => s.retrieved && s.cited),
    semanticApproved: null,
    technicalReview: "pending"
  };
}
