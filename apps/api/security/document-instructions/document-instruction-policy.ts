import { createHash } from "node:crypto";
import type { RetrievalEvidence } from "../../retrieval/retrieval-contract.js";
import { literalSentences } from "../../answers/literal-sentences.js";
import { lexicalScore } from "../../retrieval/text-retrieval.js";

export type DocumentInstructionScreening = Readonly<{
  safeEvidence: readonly RetrievalEvidence[];
  blockedEvidenceIds: readonly string[];
  protectedLiterals: readonly string[];
}>;

const hostileInstructions = [
  /\bignore\s+(?:(?:as|o)\s+)?(?:regras|instrucoes|permissoes|sistema)\b/u,
  /\b(?:revele|divulgue|exponha)\b[\s\S]{0,100}\b(?:segredo|senha|token|chave)\b/u,
  /\b(?:apague|exclua|delete)\b[\s\S]{0,100}\bhistorico\s+(?:de\s+|das?\s+)?(?:respostas|conversas?|chat)\b/u,
  /\b(?:alvitra|assistente|modelo|chatgpt|assistant|system)\b[\s\S]{0,100}\b(?:envie|contate|chame|execute|apague|exclua|delete)\b/u,
  /\b(?:envie|contate|chame|execute|apague|exclua|delete)\b[\s\S]{0,100}\b(?:alvitra|assistente|modelo|chatgpt|assistant|system)\b/u
];

export function containsHostileInstruction(content: string): boolean {
  const normalized = content
    .normalize("NFD")
    .replaceAll(/[\u0300-\u036f]/gu, "")
    .toLocaleLowerCase("pt-BR");
  return hostileInstructions.some((pattern) => pattern.test(normalized));
}

/** Preserva somente fatias literais independentes; nunca monta uma nova fonte. */
function declarativeFragments(
  item: RetrievalEvidence,
  question: string
): readonly RetrievalEvidence[] {
  const fragments: RetrievalEvidence[] = [];
  for (const match of literalSentences(item.content)) {
    const content = match.text;
    // Em fonte mista, a recuperação parcial é deliberadamente mais restrita.
    if (
      content.length === 0 ||
      containsHostileInstruction(content) ||
      /\b(?:ignore|revele|divulgue|exponha|apague|exclua|delete|envie|contate|chame|execute|segredo|senha|token|chave|alvitra|assistente|modelo|system|assistant)\b/iu.test(
        content
      )
    )
      continue;
    const relativeStart = match.start;
    const startOffset = item.startOffset + Array.from(item.content.slice(0, relativeStart)).length;
    const endOffset = startOffset + Array.from(content).length;
    fragments.push(
      Object.freeze({
        ...item,
        content,
        contentSha256: createHash("sha256").update(content).digest("hex"),
        startOffset,
        endOffset
      })
    );
  }
  // O id continua sendo o chunk autorizado existente (FK da persistência).
  // Uma única visão literal por chunk evita duplicar sua identidade na resposta.
  const selected = fragments.sort(
    (left, right) =>
      lexicalScore(question, right.content) - lexicalScore(question, left.content) ||
      left.startOffset - right.startOffset
  )[0];
  return Object.freeze(selected === undefined ? [] : [selected]);
}

/** Documentos recuperados são dados; comandos neles nunca chegam ao gateway. */
export function screenDocumentInstructions(
  evidence: readonly RetrievalEvidence[],
  question = ""
): DocumentInstructionScreening {
  const blocked = evidence.filter(
    (item) =>
      containsHostileInstruction(item.content) || containsHostileInstruction(item.documentTitle)
  );
  const safeEvidence = evidence.flatMap((item) =>
    containsHostileInstruction(item.documentTitle)
      ? []
      : blocked.includes(item)
        ? declarativeFragments(item, question)
        : [item]
  );
  const protectedLiterals = blocked
    .flatMap((item) => [item.content, item.documentTitle])
    .flatMap((content) =>
      [
        ...content.matchAll(
          /\b(?:segredo|senha|token|chave)\s*[:=]\s*(?:"([^"\r\n]{1,256})"|'([^'\r\n]{1,256})'|([\p{L}\p{N}_-]{1,256}))/giu
        )
      ]
        .map((match) => match[1] ?? match[2] ?? match[3] ?? "")
        .filter((literal) => literal.length > 0)
    );
  return Object.freeze({
    safeEvidence: Object.freeze(safeEvidence),
    blockedEvidenceIds: Object.freeze(blocked.map((item) => item.id)),
    protectedLiterals: Object.freeze([...new Set(protectedLiterals)])
  });
}

/** Defesa final por pedido: estes literais nunca são enviados ao gateway ou persistidos. */
export function containsProtectedDocumentLiteral(
  value: unknown,
  literals: readonly string[]
): boolean {
  const normalize = (text: string) =>
    text.normalize("NFKC").toLocaleLowerCase("pt-BR").replaceAll(/\s+/gu, " ").trim();
  if (typeof value === "string")
    return literals.some((literal) => normalize(value).includes(normalize(literal)));
  if (Array.isArray(value))
    return value.some((item: unknown) => containsProtectedDocumentLiteral(item, literals));
  if (value !== null && typeof value === "object")
    return Object.values(value).some((item: unknown) =>
      containsProtectedDocumentLiteral(item, literals)
    );
  return false;
}
