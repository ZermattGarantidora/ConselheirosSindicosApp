import type { CondominiumId } from "../../core/condominium-scope.js";
import type { AuthorizedCondominiumContext } from "../../identity/authorized-condominium-context.js";

export type NormativeDocumentKind = "meeting_minutes" | "convention" | "bylaws" | "contract";
export type FindingState = "known" | "unknown" | "needs_review";
export type NormativeCategory =
  | "proposal"
  | "resolution"
  | "vote_result"
  | "registered_quorum"
  | "required_quorum"
  | "responsible"
  | "deadline"
  | "article"
  | "rule"
  | "condition"
  | "exception"
  | "contract_object"
  | "contract_value"
  | "contract_term"
  | "contract_adjustment"
  | "contract_termination"
  | "contract_obligation"
  | "contract_addendum";

export type NormativeSource = Readonly<{
  condominiumId: CondominiumId;
  documentId: string;
  documentVersionId: string;
  documentTitle: string;
  page: number;
  excerpt: string;
  startOffset: number;
  endOffset: number;
  documentDate: string | null;
  extractionMethod: "pdf_text" | "ocr" | "image_vision";
  qualityScore: number;
  uncertainty: "none" | "review_required";
}>;

export type StructuredNormativeFact = Readonly<{
  documentKind: NormativeDocumentKind;
  subjectKey: string;
  category: NormativeCategory;
  state: FindingState;
  value: string | null;
  source: NormativeSource;
}>;

export type NormativeFinding = Readonly<{
  subjectKey: string;
  category: NormativeCategory;
  state: FindingState;
  value: string | null;
  source: NormativeSource;
}>;

export type DocumentConflict = Readonly<{
  subjectKey: string;
  category: NormativeCategory;
  status: "conflicting_sources";
  findings: readonly NormativeFinding[];
  limitation: string;
}>;

export type NormativePage = Readonly<{
  pageNumber: number;
  extractedText: string;
  extractionMethod: NormativeSource["extractionMethod"];
  qualityScore: number;
}>;

export type NormativeAnalysis = Readonly<{
  condominiumId: CondominiumId;
  findings: readonly NormativeFinding[];
  conflicts: readonly DocumentConflict[];
  limitations: readonly string[];
}>;

const allowedCategories: Record<NormativeDocumentKind, readonly NormativeCategory[]> = {
  meeting_minutes: Object.freeze([
    "proposal",
    "resolution",
    "vote_result",
    "registered_quorum",
    "required_quorum",
    "responsible",
    "deadline"
  ]),
  convention: Object.freeze(["article", "rule", "condition", "exception"]),
  bylaws: Object.freeze(["article", "rule", "condition", "exception"]),
  contract: Object.freeze([
    "contract_object",
    "contract_value",
    "contract_term",
    "contract_adjustment",
    "contract_termination",
    "contract_obligation",
    "contract_addendum"
  ])
};

const kindFromExplicitLabel: Readonly<Record<string, NormativeDocumentKind>> = Object.freeze({
  ata: "meeting_minutes",
  convenção: "convention",
  regimento: "bylaws",
  contrato: "contract"
});

const categoryFromExplicitLabel: Readonly<Record<string, NormativeCategory>> = Object.freeze({
  proposta: "proposal",
  deliberação: "resolution",
  resultado_votação: "vote_result",
  quorum_registrado: "registered_quorum",
  quorum_exigido: "required_quorum",
  responsavel: "responsible",
  prazo: "deadline",
  artigo: "article",
  regra: "rule",
  condicao: "condition",
  excecao: "exception",
  objeto: "contract_object",
  valor: "contract_value",
  prazo_contrato: "contract_term",
  reajuste: "contract_adjustment",
  rescisao: "contract_termination",
  obrigacao: "contract_obligation",
  aditivo: "contract_addendum"
});

const explicitFactPattern =
  /^\s*\[tipo:\s*(ata|convenção|regimento|contrato)\s*;\s*assunto:\s*([a-z0-9][a-z0-9_-]{0,127})\s*;\s*categoria:\s*([a-z_]+)(?:\s*;\s*data-documento:\s*(\d{4}-\d{2}-\d{2}))?\s*\]\s*(\S(?:.*\S)?)\s*$/iu;

function isCalendarDate(value: string): boolean {
  const match = /^(\d{4})-(\d{2})-(\d{2})$/u.exec(value);
  if (match === null) return false;
  const year = Number(match[1]);
  const month = Number(match[2]);
  const day = Number(match[3]);
  const parsed = new Date(Date.UTC(year, month - 1, day));
  return (
    parsed.getUTCFullYear() === year &&
    parsed.getUTCMonth() === month - 1 &&
    parsed.getUTCDate() === day
  );
}

function codePointLength(value: string): number {
  return Array.from(value).length;
}

function assertSource(source: NormativeSource, condominiumId: CondominiumId): void {
  if (source.condominiumId !== condominiumId) {
    throw new Error("A evidência normativa pertence a outro condomínio.");
  }
  if (
    source.documentId.trim().length === 0 ||
    source.documentVersionId.trim().length === 0 ||
    source.documentTitle.trim().length === 0 ||
    !Number.isInteger(source.page) ||
    source.page < 1 ||
    source.excerpt.trim().length === 0 ||
    !Number.isInteger(source.startOffset) ||
    source.startOffset < 0 ||
    !Number.isInteger(source.endOffset) ||
    source.endOffset <= source.startOffset ||
    source.endOffset - source.startOffset !== codePointLength(source.excerpt) ||
    !Number.isFinite(source.qualityScore) ||
    source.qualityScore < 0 ||
    source.qualityScore > 1
  ) {
    throw new Error("Todo achado normativo exige fonte verificável completa.");
  }
  if (source.documentDate !== null && !isCalendarDate(source.documentDate)) {
    throw new Error("A data documental deve usar AAAA-MM-DD ou permanecer desconhecida.");
  }
}

function validateFact(fact: StructuredNormativeFact, condominiumId: CondominiumId): void {
  if (fact.subjectKey.trim().length === 0) {
    throw new Error("Todo achado normativo exige uma chave de assunto explícita.");
  }
  if (!allowedCategories[fact.documentKind].includes(fact.category)) {
    throw new Error("A categoria do achado não corresponde ao tipo documental informado.");
  }
  assertSource(fact.source, condominiumId);
  if (fact.state === "known" && (fact.value === null || fact.value.trim().length === 0)) {
    throw new Error("Um achado conhecido exige valor documental.");
  }
  if (
    fact.state === "known" &&
    (fact.source.uncertainty !== "none" || fact.source.qualityScore !== 1)
  ) {
    throw new Error("Um achado conhecido não pode usar fonte que exige revisão.");
  }
  if (fact.state !== "known" && fact.value !== null) {
    throw new Error("Achados desconhecidos ou em revisão não podem afirmar um valor.");
  }
}

function assertPage(page: NormativePage): void {
  if (
    !Number.isInteger(page.pageNumber) ||
    page.pageNumber < 1 ||
    !Number.isFinite(page.qualityScore) ||
    page.qualityScore < 0 ||
    page.qualityScore > 1
  ) {
    throw new Error("A página normativa exige número e qualidade entre 0 e 1.");
  }
}

function pageLines(text: string): readonly Readonly<{ text: string; startOffset: number }>[] {
  const lines: Array<Readonly<{ text: string; startOffset: number }>> = [];
  const expression = /[^\r\n]*(?:\r\n|\n|\r|$)/gu;
  for (const match of text.matchAll(expression)) {
    if (match[0].length === 0) continue;
    const line = match[0].replace(/\r\n|\n|\r$/u, "");
    lines.push(
      Object.freeze({ text: line, startOffset: codePointLength(text.slice(0, match.index)) })
    );
  }
  return Object.freeze(lines);
}

/**
 * Converte apenas linhas autoclassificadas pelo produtor anterior. Texto livre não
 * é classificado: tipo, assunto e categoria precisam estar declarados literalmente.
 */
export function normativeFactsFromPages(
  context: AuthorizedCondominiumContext,
  input: Readonly<{
    documentId: string;
    documentVersionId: string;
    documentTitle: string;
    pages: readonly NormativePage[];
  }>
): readonly StructuredNormativeFact[] {
  if (!context.permissions.includes("document:read")) {
    throw new Error("A adaptação normativa exige permissão documental.");
  }
  if (
    input.documentId.trim().length === 0 ||
    input.documentVersionId.trim().length === 0 ||
    input.documentTitle.trim().length === 0
  ) {
    throw new Error("O documento normativo exige identificadores verificáveis.");
  }
  const facts: StructuredNormativeFact[] = [...naturalFactsFromPages(context, input)];
  for (const page of input.pages) {
    assertPage(page);
    for (const line of pageLines(page.extractedText)) {
      const match = explicitFactPattern.exec(line.text);
      if (match === null) continue;
      const [, kindLabel, subjectKey, categoryLabel, documentDate, value] = match;
      const documentKind = kindFromExplicitLabel[kindLabel!.toLocaleLowerCase("pt-BR")];
      const category = categoryFromExplicitLabel[categoryLabel!.toLocaleLowerCase("pt-BR")];
      if (
        documentKind === undefined ||
        category === undefined ||
        !allowedCategories[documentKind].includes(category)
      ) {
        continue;
      }
      if (documentDate !== undefined && !isCalendarDate(documentDate)) continue;
      const excerpt = line.text;
      const source = Object.freeze({
        condominiumId: context.condominiumId,
        documentId: input.documentId,
        documentVersionId: input.documentVersionId,
        documentTitle: input.documentTitle,
        page: page.pageNumber,
        excerpt,
        startOffset: line.startOffset,
        endOffset: line.startOffset + codePointLength(excerpt),
        documentDate: documentDate ?? null,
        extractionMethod: page.extractionMethod,
        qualityScore: page.qualityScore,
        uncertainty: page.qualityScore === 1 ? ("none" as const) : ("review_required" as const)
      });
      facts.push(
        Object.freeze({
          documentKind,
          subjectKey: subjectKey!,
          category,
          state: page.qualityScore === 1 ? "known" : "needs_review",
          value: page.qualityScore === 1 ? value!.trim() : null,
          source
        })
      );
    }
  }
  return Object.freeze(facts);
}

/** Rótulos literais de documentos comuns; não atribui significado a prosa livre. */
function naturalFactsFromPages(
  context: AuthorizedCondominiumContext,
  input: Readonly<{
    documentId: string;
    documentVersionId: string;
    documentTitle: string;
    pages: readonly NormativePage[];
  }>
): readonly StructuredNormativeFact[] {
  const kinds = new Set<NormativeDocumentKind>();
  for (const page of input.pages) {
    for (const line of page.extractedText.split(/\r?\n/u)) {
      if (/^\s*ATA\s+(?:DA|DE)\s+(?:ASSEMBLEIA|REUNI[ÃA]O)/iu.test(line))
        kinds.add("meeting_minutes");
      if (/^\s*CONVEN[ÇC][ÃA]O\s+(?:CONDOMINIAL|DO\s+CONDOM[ÍI]NIO)/iu.test(line))
        kinds.add("convention");
      if (/^\s*REGIMENTO\s+INTERNO/iu.test(line)) kinds.add("bylaws");
      if (/^\s*CONTRATO\s+(?:DE|PARA)/iu.test(line)) kinds.add("contract");
    }
  }
  if (kinds.size !== 1) return [];
  const documentKind = [...kinds][0]!;
  const categories: Readonly<Record<string, NormativeCategory>> = {
    proposta: "proposal",
    deliberacao: "resolution",
    resultado_da_votacao: "vote_result",
    quorum_registrado: "registered_quorum",
    quorum_exigido: "required_quorum",
    responsavel: "responsible",
    prazo: documentKind === "contract" ? "contract_term" : "deadline",
    regra: "rule",
    condicao: "condition",
    excecao: "exception",
    objeto: "contract_object",
    valor: "contract_value",
    reajuste: "contract_adjustment",
    rescisao: "contract_termination",
    obrigacao: "contract_obligation",
    aditivo: "contract_addendum"
  };
  const facts: StructuredNormativeFact[] = [];
  let subject: string | undefined =
    documentKind === "contract" ? `contrato:${input.documentId}` : undefined;
  const normalize = (value: string) =>
    value
      .normalize("NFD")
      .replaceAll(/[\u0300-\u036f]/gu, "")
      .toLocaleLowerCase("pt-BR")
      .trim()
      .replaceAll(/\s+/gu, "_");
  for (const page of input.pages) {
    assertPage(page);
    for (const line of pageLines(page.extractedText)) {
      const subjectMatch = /^\s*Assunto:\s*(\S.*)$/iu.exec(line.text);
      if (subjectMatch !== null) {
        subject = `assunto:${normalize(subjectMatch[1]!)}`;
        continue;
      }
      const article = /^\s*Art(?:igo|\.)?\s*(\d+[\p{L}º°.-]*)\s+(.+)$/iu.exec(line.text);
      const field = /^\s*([\p{L}\s]+):\s*(\S.*)$/iu.exec(line.text);
      const category =
        article !== null && (documentKind === "convention" || documentKind === "bylaws")
          ? "article"
          : field === null
            ? undefined
            : categories[normalize(field[1]!)];
      const subjectKey =
        article === null ? subject : `documento:${input.documentId}:artigo:${article[1]}`;
      if (
        category === undefined ||
        subjectKey === undefined ||
        !allowedCategories[documentKind].includes(category)
      )
        continue;
      const excerpt = line.text;
      facts.push({
        documentKind,
        subjectKey,
        category,
        state: page.qualityScore === 1 ? "known" : "needs_review",
        value: page.qualityScore === 1 ? excerpt.trim() : null,
        source: {
          condominiumId: context.condominiumId,
          documentId: input.documentId,
          documentVersionId: input.documentVersionId,
          documentTitle: input.documentTitle,
          page: page.pageNumber,
          excerpt,
          startOffset: line.startOffset,
          endOffset: line.startOffset + codePointLength(excerpt),
          documentDate: null,
          extractionMethod: page.extractionMethod,
          qualityScore: page.qualityScore,
          uncertainty: page.qualityScore === 1 ? "none" : "review_required"
        }
      });
    }
  }
  return facts;
}

function asFinding(fact: StructuredNormativeFact): NormativeFinding {
  return Object.freeze({
    subjectKey: fact.subjectKey,
    category: fact.category,
    state: fact.state,
    value: fact.value,
    source: Object.freeze({ ...fact.source })
  });
}

function conflictKey(finding: NormativeFinding): string {
  return `${finding.subjectKey}\u0000${finding.category}`;
}

function isConflictGroup(findings: readonly NormativeFinding[]): boolean {
  const values = new Set(
    findings.filter((finding) => finding.state === "known").map((finding) => finding.value)
  );
  return values.size > 1;
}

/**
 * Analisa somente fatos já estruturados e citáveis. Não interpreta validade jurídica,
 * vigência, quórum atingido ou execução contratual: esses estados exigem evidência e
 * regra aplicável adicionais, que permanecem explícitos para revisão humana.
 */
export function analyzeNormativeDocuments(
  context: AuthorizedCondominiumContext,
  facts: readonly StructuredNormativeFact[]
): NormativeAnalysis {
  if (!context.permissions.includes("document:read")) {
    throw new Error("A análise normativa exige permissão documental.");
  }
  facts.forEach((fact) => validateFact(fact, context.condominiumId));
  const findings = facts.map(asFinding);
  const byKey = new Map<string, NormativeFinding[]>();
  for (const finding of findings) {
    const key = conflictKey(finding);
    const group = byKey.get(key) ?? [];
    group.push(finding);
    byKey.set(key, group);
  }
  const conflicts = [...byKey.values()].filter(isConflictGroup).map((group) =>
    Object.freeze({
      subjectKey: group[0]!.subjectKey,
      category: group[0]!.category,
      status: "conflicting_sources" as const,
      findings: Object.freeze([...group]),
      limitation:
        "As fontes registram valores diferentes; a análise não escolhe qual regra, decisão ou condição prevalece."
    })
  );
  const limitations: string[] = [];
  if (
    findings.some((finding) => finding.state !== "known" || finding.source.uncertainty !== "none")
  ) {
    limitations.push(
      "Há achados desconhecidos ou que exigem revisão; nenhuma conclusão foi completada por inferência."
    );
  }
  if (conflicts.length > 0) {
    limitations.push(
      "Há fontes contraditórias; ambas as versões e suas datas foram preservadas para validação humana."
    );
  }
  return Object.freeze({
    condominiumId: context.condominiumId,
    findings: Object.freeze(findings),
    conflicts: Object.freeze(conflicts),
    limitations: Object.freeze(limitations)
  });
}
