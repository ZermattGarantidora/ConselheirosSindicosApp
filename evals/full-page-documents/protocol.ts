import { createHash } from "node:crypto";
import type { PublicAnswer } from "../../apps/api/answers/answer-contract.js";
import type { RetrievalEvidence } from "../../apps/api/retrieval/retrieval-contract.js";
import { createFullPageDocumentCorpus } from "../../tests/fixtures/full-page-documents.js";
import type { Condition } from "../conversation-comparison/protocol.js";

export const suiteVersion = "full-page-document-evals-v1";
export const conditions: readonly Condition[] = [
  { id: "luna-high", model: "gpt-6-luna", reasoningEffort: "high", memory: false },
  { id: "sol61-low", model: "gpt-6.1-sol", reasoningEffort: "low", memory: false }
];
export const sha256 = (value: unknown) =>
  createHash("sha256").update(JSON.stringify(value)).digest("hex");
export const normalize = (value: string) =>
  value
    .normalize("NFD")
    .replaceAll(/[\u0300-\u036f]/gu, "")
    .toLowerCase()
    .replaceAll(/\s+/gu, " ")
    .trim();

export type PageEval = Readonly<{
  id: string;
  documentId: string;
  pageCount: 1 | 2 | 8;
  page: number;
  question: string;
  expected: Readonly<{
    time: string;
    capacity: string;
    date: string;
    pending: readonly string[];
    statements: readonly string[];
  }>;
}>;

export function pageEvalCases(): readonly PageEval[] {
  return createFullPageDocumentCorpus().flatMap((document) =>
    document.pages.map((page, index) => {
      const time = /\b\d{1,2}:\d{2}\b/u.exec(page.probes[0]!.statement)?.[0];
      const capacity = /:\s*(\d+\s+.+)\.$/u.exec(page.probes[1]!.statement)?.[1];
      const date = /\d{2}\/\d{2}\/\d{4}/u.exec(page.probes[2]!.statement)?.[0];
      const pending = page.lines
        .filter((line) => line.includes("| Pendente |"))
        .map((line) => line.split("|")[0]!.trim());
      if (!time || !capacity || !date || pending.length !== 2)
        throw new Error("Gabarito da página incompleto.");
      return {
        id: `${document.id}-p${index + 1}`,
        documentId: document.id,
        pageCount: document.pageCount,
        page: index + 1,
        question: `No documento "${document.title}", na seção "${page.lines[2]}": ${page.probes.map((probe) => probe.question).join(" ")} Quais itens do quadro de acompanhamento estão pendentes? O recebimento dos anexos comprova aprovação técnica e autoriza encerrar as pendências? Responda com as fontes e explique esse limite.`,
        expected: {
          time,
          capacity,
          date,
          pending,
          statements: page.probes.map((probe) => probe.statement)
        }
      };
    })
  );
}

function datePresent(text: string, date: string): boolean {
  const [day, month, year] = date.split("/");
  return (
    new RegExp(`(?<!\\d)0?${Number(day)}/0?${Number(month)}/${year}(?!\\d)`, "u").test(text) ||
    text.includes(`${year}-${month}-${day}`) ||
    text.includes(`${Number(day)} de novembro de ${year}`)
  );
}

export function assessPageAnswer(
  testCase: PageEval,
  response: PublicAnswer | null,
  evidence: readonly RetrievalEvidence[],
  mechanicalErrors: readonly string[]
) {
  const text = normalize(response?.answer ?? "");
  const { expected } = testCase;
  const facts = {
    time: (() => {
      const [hour, minute] = expected.time.split(":");
      return new RegExp(
        `(?<!\\d)0?${Number(hour)}\\s*(?::|h\\s*|horas?\\s*(?:e\\s*)?)${minute}(?!\\d)`,
        "u"
      ).test(text);
    })(),
    capacity: (() => {
      const [quantity, ...unit] = normalize(expected.capacity).split(" ");
      return new RegExp(
        `(?<!\\d)${quantity}\\s*(?:\\([^)]{1,60}\\)\\s*)?${unit.join("\\s+")}(?!\\w)`,
        "u"
      ).test(text);
    })(),
    date: datePresent(text, expected.date)
  };
  const pending = expected.pending.map((item) => ({
    item,
    present: text.includes(normalize(item))
  }));
  const qualification =
    /nao.{0,100}(?:aprov|autoriz|encerr|equival)|(?:aprov|autoriz|encerr).{0,100}nao/u.test(text);
  const citations = response?.citations.filter((citation) => citation.page === testCase.page) ?? [];
  const citedText = normalize(citations.map((citation) => citation.excerpt).join(" "));
  const citedFacts = {
    time: citedText.includes(expected.time),
    capacity: citedText.includes(normalize(expected.capacity)),
    date: citedText.includes(expected.date)
  };
  const sourceCoverage = expected.statements.map((statement) => ({
    statement,
    present: evidence.some(
      (source) => source.pageNumber === testCase.page && source.content.includes(statement)
    )
  }));
  const complete =
    response?.answerMode === "grounded" &&
    Object.values(facts).every(Boolean) &&
    pending.every((item) => item.present) &&
    qualification &&
    Object.values(citedFacts).every(Boolean) &&
    sourceCoverage.every((item) => item.present) &&
    mechanicalErrors.length === 0;
  return {
    outcome:
      response === null || response.answerMode === "failed"
        ? "failed"
        : complete
          ? "automatic_complete"
          : "automatic_partial",
    facts,
    pending,
    qualification,
    citedFacts,
    sourceCoverage,
    mechanicalErrors,
    technicalReview: null,
    semanticApproved: null,
    limitation:
      "Checks fechados de presença factual e procedência. Não aprovam associação semântica, clareza ou adequação sem revisão."
  };
}
