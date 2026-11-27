import type { RetrievalEvidence } from "../retrieval/retrieval-contract.js";
import type { GeneratedAnswer } from "./answer-contract.js";
import { containsExactRecordId, explicitRecordIds } from "../retrieval/exact-identifiers.js";
import { containsHostileInstruction } from "../security/document-instructions/document-instruction-policy.js";

const clean = (s: string) =>
  s
    .normalize("NFD")
    .replaceAll(/[\u0300-\u036f]/gu, "")
    .toLowerCase();
const escape = (s: string) => s.replaceAll(/[.*+?^${}()|[\]\\]/gu, "\\$&");
const number = String.raw`\d+(?:\.\d{3})*(?:,\d{1,2})?`;
type Fact = Readonly<{ kind: string; key: string; numeric: string }>;
type Side = Readonly<{ source: RetrievalEvidence; text: string; facts: readonly Fact[] }>;
export type DocumentedConflict = Readonly<{
  recordId: string;
  kind: string;
  sides: readonly Side[];
}>;

function scaled(text: string): bigint {
  const [whole, fraction = ""] = text.replaceAll(".", "").split(",");
  return BigInt(whole!) * 100n + BigInt(fraction.padEnd(2, "0"));
}
function facts(text: string): readonly Fact[] {
  const normalized = clean(text).replaceAll(/\s+/gu, " "),
    result: Fact[] = [];
  const collect = (
    pattern: RegExp,
    kind: (m: RegExpMatchArray) => string,
    value: (m: RegExpMatchArray) => string
  ) => {
    for (const m of normalized.matchAll(pattern))
      result.push({
        kind: kind(m),
        key: value(m),
        numeric: /^[\d.,]+$/u.test(m[1]!) ? scaled(m[1]!).toString() : ""
      });
  };
  collect(
    new RegExp(`r\\$\\s*(${number})(?!\\d|[.,]\\d)`, "gu"),
    (m) => {
      const before = normalized
        .slice(Math.max(0, m.index! - 40), m.index)
        .split(/[;|\n]/u)
        .at(-1)!;
      const after = normalized
        .slice(m.index! + m[0].length, m.index! + m[0].length + 25)
        .split(/[;|\n]/u)[0]!;
      const scope = /\b(bruto|liquido|retencao)\b/u.exec(before + " " + after)?.[1];
      return scope ? `money_${scope}` : "money";
    },
    (m) =>
      `${scaled(m[1]!) !== 0n && /[-−]\s*$/u.test(normalized.slice(Math.max(0, m.index! - 3), m.index)) ? "-" : ""}${scaled(m[1]!)}`
  );
  collect(
    new RegExp(`\\b(${number})\\s+pessoas\\b`, "gu"),
    () => "capacity",
    (m) => `${scaled(m[1]!)}`
  );
  collect(
    new RegExp(`\\b(${number})\\s+(mes(?:es)?|dias(?:\\s+(?:corridos|uteis))?)\\b`, "gu"),
    (m) =>
      `duration_${m[2]!.startsWith("mes") ? "month" : m[2]!.includes("uteis") ? "business_day" : "day"}`,
    (m) => `${scaled(m[1]!)}`
  );
  collect(
    /\b(\d{1,2})h(\d{2})?\b/gu,
    () => "clock",
    (m) => `${Number(m[1]) * 60 + Number(m[2] ?? 0)}`
  );
  collect(
    /(?<![\d/])((?:0[1-9]|1[0-2])\/20\d{2})(?![\d/])/gu,
    () => "period",
    (m) => m[1]!
  );
  collect(
    new RegExp(`\\b(${number})\\s*(bar|kpa)\\b`, "gu"),
    () => "pressure",
    (m) =>
      `${scaled(m[1]!) * (m[2] === "bar" ? 100n : 1n) * (/[-−]\s*$/u.test(normalized.slice(Math.max(0, m.index! - 3), m.index)) ? -1n : 1n)}`
  );
  collect(
    new RegExp(`\\b(${number})\\s+(favoraveis|contrarios|abstencoes)\\b`, "gu"),
    (m) => `votes_${m[2]}`,
    (m) => `${scaled(m[1]!)}`
  );
  if (/\bpago\b/u.test(normalized) && !/\bnao (?:foi )?pago\b/u.test(normalized))
    result.push({ kind: "payment_status", key: "paid", numeric: "" });
  if (/transferencia.{0,35}agendad|sem liquidacao|\bnao (?:foi )?pago\b/u.test(normalized))
    result.push({ kind: "payment_status", key: "unconfirmed", numeric: "" });
  return result;
}

/** Limita valores à entrada do registro; referências tangenciais não são a linha de origem. */
function scopedText(content: string, id: string): string | undefined {
  const lines = content.split(/\r?\n/u),
    entries: string[] = [];
  for (const [i, line] of lines.entries()) {
    if (!containsExactRecordId(line, id)) continue;
    const begins = new RegExp(`^\\s*(?:\\|\\s*)?${escape(id)}\\s*[|:]`, "iu").test(line);
    if (!begins && !new RegExp(`${escape(id)}\\s*:`, "iu").test(line)) continue;
    const part = [line];
    for (const next of lines.slice(i + 1, i + 5)) {
      if (/^\s*(?:\|\s*)?[\p{L}]{2,12}-[\p{L}\p{N}]*\d[\p{L}\p{N}]*\s*[|:]|^FIM\b/iu.test(next))
        break;
      part.push(next);
    }
    entries.push(part.join("\n").slice(0, 1200));
  }
  return entries.length === 1 ? entries[0] : undefined;
}
function unresolved(text: string): boolean {
  const s = clean(text)
    .replaceAll(/\s+/gu, " ")
    .replace(
      /(?:nao (?:ha|existe)|sem)\s+(?:qualquer\s+)?(?:divergencia|diferenca|incompatibilidade|conflito)/gu,
      ""
    );
  return /diverg|diferenca|incompatib|contradit|precedencia.{0,65}nao comprov|autenticidade.{0,50}nao verificad|falta.{0,40}(?:comprovar|explicar|esclarecer|conciliar|validacao tecnica)|nao (?:comprova|apresenta) aprovacao da mudanca|sem liquidacao/u.test(
    s
  );
}
function resolved(text: string): boolean {
  return /(?:diferenca|divergencia|conflito)\s+(?:(?:ja|foi|esta|ficou)\s+){0,3}(?:conciliad|resolvid|explicad|esclarecid)/u.test(
    clean(text).replaceAll(/\s+/gu, " ")
  );
}

/** Candidatos literais, sem escolher vencedor, reclassificar tarefa ou acrescentar fontes. */
export function findDocumentedConflicts(
  question: string,
  evidence: readonly RetrievalEvidence[]
): readonly DocumentedConflict[] {
  if (new Set(evidence.map((e) => e.condominiumId)).size !== 1) return [];
  const eligible = evidence.filter(
    (e) =>
      e.sourceScope !== "legislation" &&
      e.processingStatus === "ready" &&
      ["confirmed", "not_applicable"].includes(e.validityStatus) &&
      Number.isFinite(e.qualityScore) &&
      e.qualityScore >= 0.7 &&
      !containsHostileInstruction(e.content)
  );
  const result: DocumentedConflict[] = [];
  for (const recordId of explicitRecordIds(question).slice(0, 8)) {
    const seen = new Set<string>();
    const sides: Side[] = [];
    for (const source of eligible) {
      const text = scopedText(source.content, recordId);
      const origin = `${source.documentVersionId}:${source.pageNumber}:${source.startOffset}:${source.endOffset}`;
      if (!text || seen.has(origin)) continue;
      seen.add(origin);
      sides.push({ source, text, facts: facts(text) });
    }
    if (sides.some((s) => resolved(s.text))) continue;
    const referredCaveat =
      sides.some((s) => /ver (?:ressalva|nota|correcao|retificacao)/u.test(clean(s.text))) &&
      !sides.some((s) =>
        /excecao|sem retroatividade|etapas distintas|campos distintos|equivalente/u.test(
          clean(s.text)
        )
      );
    if (sides.length < 2 || (!sides.some((s) => unresolved(s.text)) && !referredCaveat)) continue;
    for (const kind of new Set(sides.flatMap((s) => s.facts.map((f) => f.kind)))) {
      const compared = sides.filter((s) => s.facts.some((f) => f.kind === kind));
      const keys = compared.map((s) =>
        [...new Set(s.facts.filter((f) => f.kind === kind).map((f) => f.key))].sort().join("|")
      );
      if (compared.length < 2 || new Set(keys).size < 2) continue;
      result.push({ recordId, kind, sides: compared });
    }
  }
  return result.slice(0, 4);
}

/** Apenas após a validação comum de citações/claims: exige todos os lados no corpo e nas fontes. */
export function coversDocumentedConflict(
  question: string,
  evidence: readonly RetrievalEvidence[],
  answer: GeneratedAnswer
): boolean {
  const body = clean(answer.answer);
  if (
    !/diverg|conflit|incompativ|penden|nao.{0,45}(?:comprov|confirm|possivel|permite|defin)|sem.{0,35}(?:comprov|confirm|precedenc)/u.test(
      body
    ) &&
    !(/diferenca/u.test(body) && /nao|sem|falta|aguarda|penden|necessari|precis/u.test(body))
  )
    return false;
  if (
    /(?:o valor|o prazo|a capacidade|o horario) (?:correto|definitivo) (?:e|sera)|(?:conflito|divergencia) (?:ja )?(?:esta|foi) (?:resolvid|conciliad)/u.test(
      body
    ) ||
    /(?:^|[.!?\n]\s*)(?:portanto,?\s*)?(?:prevalece|deve prevalecer|considere como correto)\b/u.test(
      body
    )
  )
    return false;
  const bodyFacts = facts(body);
  const numeric = [
    ...body
      .replaceAll(/\b[\p{L}]{2,12}-[\p{L}\p{N}]*\d[\p{L}\p{N}]*\b/gu, "")
      .matchAll(new RegExp(`\\b(${number})(?!\\d|[.,]\\d)`, "gu"))
  ].map((m) => scaled(m[1]!).toString());
  const groups = findDocumentedConflicts(question, evidence);
  return (
    groups.length > 0 &&
    groups.every(
      (group) =>
        (containsExactRecordId(answer.answer, group.recordId) ||
          (new Set(groups.map((g) => g.recordId)).size === 1 &&
            explicitRecordIds(answer.answer).length === 0)) &&
        group.sides.every(
          (side) =>
            side.facts
              .filter((f) => f.kind === group.kind)
              .every(
                (f) =>
                  bodyFacts.some((b) => b.kind === f.kind && b.key === f.key) ||
                  (/^(?:capacity|duration_|votes_)/u.test(f.kind) && numeric.includes(f.numeric))
              ) &&
            answer.citations.some(
              (c) =>
                c.evidenceId === side.source.id &&
                (() => {
                  const recordStart = side.source.content.indexOf(side.text);
                  const citationStart = side.source.content.indexOf(c.excerpt);
                  const start = Math.max(recordStart, citationStart),
                    end = Math.min(
                      recordStart + side.text.length,
                      citationStart + c.excerpt.length
                    );
                  const text =
                    recordStart < 0 || citationStart < 0 || start >= end
                      ? undefined
                      : side.source.content.slice(start, end);
                  return (
                    text !== undefined &&
                    side.facts
                      .filter((f) => f.kind === group.kind)
                      .every((f) => facts(text).some((v) => v.kind === f.kind && v.key === f.key))
                  );
                })()
            )
        )
    )
  );
}
