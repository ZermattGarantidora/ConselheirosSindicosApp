import type { RetrievalEvidence } from "../retrieval/retrieval-contract.js";
import type { GeneratedAnswer } from "./answer-contract.js";
import { explicitRecordIds } from "../retrieval/exact-identifiers.js";
import { containsHostileInstruction } from "../security/document-instructions/document-instruction-policy.js";

const moneyPattern = String.raw`(?:-\s*)?R\$\s*(?:\d{1,3}(?:\.\d{3})+|\d+),\d{2}(?!\d)`;
const money = (text: string) =>
  [...text.matchAll(new RegExp(moneyPattern, "giu"))].map((m) => {
    const digits = m[0].replaceAll(/\D/gu, "").replace(/^0+(?=\d)/u, "");
    return {
      literal: m[0].replace(/r\$/iu, "R$"),
      key: /^-/u.test(m[0]) && digits !== "0" ? `-${digits}` : digits
    };
  });
const escape = (text: string) => text.replaceAll(/[.*+?^${}()|[\]\\]/gu, "\\$&");

export type RecordNoteConflict = Readonly<{
  kind: "record_note";
  recordId: string;
  tableValue: ReturnType<typeof money>[number];
  noteValue: ReturnType<typeof money>[number];
  evidence: readonly [RetrievalEvidence, RetrievalEvidence];
  reason: string;
}>;

/** Reconhece declaração explícita de valor divergente ainda não conciliado, sem eleger um valor. */
export function detectRecordNoteConflict(
  question: string,
  evidence: readonly RetrievalEvidence[]
): RecordNoteConflict | null {
  const eligible = evidence.filter(
    (e) =>
      e.sourceScope !== "legislation" &&
      e.processingStatus === "ready" &&
      ["confirmed", "not_applicable"].includes(e.validityStatus) &&
      Number.isFinite(e.qualityScore) &&
      e.qualityScore >= 0.7 &&
      !containsHostileInstruction(e.content)
  );
  for (const id of explicitRecordIds(question).slice(0, 8)) {
    const rowPattern = new RegExp(`^\\s*(?:\\|\\s*)?${escape(id)}\\s*\\|`, "iu");
    const notePattern = new RegExp(
      `(?<![\\p{L}\\p{N}-])${escape(id)}(?![\\p{L}\\p{N}-])\\s+(?:(?:tem|apresenta|possui)\\s+)?valor\\s+divergente\\s+(?:de\\s+)?(${moneyPattern})(.{0,120}?(?:conflito\\s+)?n[aã]o\\s+conciliad[oa])`,
      "giu"
    );
    for (const table of eligible) {
      const rows = table.content.split(/\r?\n/u).filter((line) => rowPattern.test(line));
      if (rows.length !== 1) continue;
      const tableValues = money(rows[0]!);
      if (tableValues.length !== 1) continue;
      for (const note of eligible) {
        if (
          note.id === table.id ||
          note.condominiumId !== table.condominiumId ||
          note.documentId !== table.documentId ||
          note.documentVersionId !== table.documentVersionId
        )
          continue;
        const spans = [...note.content.replaceAll(/\s+/gu, " ").matchAll(notePattern)].filter((m) =>
          explicitRecordIds(m[0]).every((found) => found === id)
        );
        if (spans.length !== 1) continue;
        const noteValues = money(spans[0]![1]!);
        if (noteValues.length !== 1 || noteValues[0]!.key === tableValues[0]!.key) continue;
        const tableValue = tableValues[0]!,
          noteValue = noteValues[0]!;
        return Object.freeze({
          kind: "record_note",
          recordId: id,
          tableValue,
          noteValue,
          evidence: Object.freeze([table, note] as const),
          reason: `O registro ${id} indica ${tableValue.literal} na tabela, mas a nota da mesma versão informa valor divergente de ${noteValue.literal} e conflito não conciliado. Ambos precisam ser conferidos antes de confirmar o valor. Nenhum deles foi escolhido como correto.`
        });
      }
    }
  }
  return null;
}

/** Cobertura limitada ao vínculo explícito: ID, dois valores, pendência e suas fontes reais. */
export function coversRecordNoteConflict(
  question: string,
  evidence: readonly RetrievalEvidence[],
  answer: GeneratedAnswer
): boolean {
  const conflict = detectRecordNoteConflict(question, evidence);
  if (!conflict) return false;
  const values = money(answer.answer).map((m) => m.key);
  const text = answer.answer
    .normalize("NFD")
    .replaceAll(/[\u0300-\u036f]/gu, "")
    .toLowerCase();
  const resolved = [
    ...text.matchAll(/(?:esta|foi|ficou|ja)\s+(?:totalmente\s+)?(?:conciliad|resolvid)/gu)
  ].some((m) => !/nao|sem/u.test(text.slice(Math.max(0, m.index! - 20), m.index)));
  return (
    !resolved &&
    explicitRecordIds(answer.answer).includes(conflict.recordId) &&
    values.includes(conflict.tableValue.key) &&
    values.includes(conflict.noteValue.key) &&
    /diverg|conflit|penden|nao.{0,25}conciliad/u.test(text) &&
    conflict.evidence.every((source, i) =>
      answer.citations.some(
        (c) =>
          c.evidenceId === source.id &&
          explicitRecordIds(c.excerpt).includes(conflict.recordId) &&
          money(c.excerpt).some(
            (m) => m.key === (i === 0 ? conflict.tableValue.key : conflict.noteValue.key)
          )
      )
    )
  );
}
