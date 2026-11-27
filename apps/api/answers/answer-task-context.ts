import type { GeneratedAnswer } from "./answer-contract.js";
import type { AnswerGatewayInput } from "./answer-gateway.js";
import { contextualQuestion, type ConversationContext } from "./conversation-memory.js";
import type { RetrievalEvidence } from "../retrieval/retrieval-contract.js";
import { normalizeQueryText } from "../retrieval/retrieval-query.js";
import { containsHostileInstruction } from "../security/document-instructions/document-instruction-policy.js";
import { InvalidAnswerValidationError } from "./citation-validator.js";
import type { AnswerValidationCode } from "./citation-validator.js";
import { specialistTypes } from "./answer-contract.js";
import { coversRecordNoteConflict } from "./record-note-conflict.js";
import { coversDocumentedConflict, findDocumentedConflicts } from "./documented-conflict.js";
import { queryEntities } from "../retrieval/retrieval-query.js";
import {
  buildCompletionChecklist,
  completionKeys,
  coversAssemblyDecision,
  coversFinancialResult,
  missingCompletionKeys,
  type CompletionItem
} from "./answer-completion-plan.js";

const topics = [
  {
    key: "financial",
    pattern:
      /balancete|saldo|receita|despesa|financeir|contador|contabil|extrato|comprovante|\bcontas\b|disponibilidade (?:ordinaria|financeira)|conciliacao/u
  },
  {
    key: "labor",
    pattern: /salario|jornada|funcionario|empregado|trabalhist|\bcct\b|piso salarial|rescis/u
  },
  { key: "contracts", pattern: /contrat|fornecedor|orcamento|proposta/u },
  { key: "maintenance", pattern: /manutencao|elevador|laudo|inspecao|tecnic|estrutur|eletric/u },
  { key: "insurance", pattern: /seguro|apolice|sinistro/u },
  { key: "versions", pattern: /versao|versoes|minuta|discordan/u },
  { key: "assemblies", pattern: /assembleia|\bata\b|\bago\b|\bage\b|eleicao|mandato/u },
  { key: "privacy", pattern: /privacidade|dados pessoais|imagens|\blgpd\b/u },
  { key: "handover", pattern: /transicao|inventario|chaves|aceite|entrega de gestao/u },
  { key: "arrears", pattern: /cobranca|inadimpl|unidade|parcelamento|negociacao/u }
] as const;
type TaskTopic = (typeof topics)[number]["key"];
const clauses = [
  { key: "termination_notice", pattern: /aviso|denuncia|antecedencia|comunicacao escrita/u },
  { key: "penalty", pattern: /multa|penalidade/u },
  { key: "financial_result", pattern: /resultado|superavit|deficit|lucro/u },
  { key: "reconciliation", pattern: /conciliacao|extratos?|movimentacao bancaria/u },
  { key: "reserve_binding", pattern: /\breservas?\b|vinculad/u },
  {
    key: "supporting_records",
    pattern: /comprovantes?|nota fiscal|documentos de suporte|detalhamento/u
  },
  { key: "execution_proof", pattern: /relatorio|execucao|comprovante|certificado|realizad/u },
  { key: "ownership", pattern: /titularidade|titular|responsavel pela unidade/u },
  { key: "agreement", pattern: /acordo|parcelamento|negociacao|formaliza/u },
  { key: "hall_rule", pattern: /salao|reserva de area/u },
  { key: "rental_period", pattern: /locacao|temporada/u }
] as const;
type RequirementKey = TaskTopic | (typeof clauses)[number]["key"];
type TaskRequirement = Readonly<{ key: RequirementKey; question: string }>;
const repairInstructions: Partial<Record<AnswerValidationCode, string>> = {
  answer_body_internal_reference:
    "Keep evidence references only in citations and claim citationEvidenceIds. Rewrite the visible answer without internal evidence labels or source markers, preserving all facts, caveats and cited sources. Do not delete a literal label when it is part of the question or quoted source content.",
  mode_citation_mismatch:
    "Rewrite with the same authorized sources: grounded requires at least one valid citation; conflict requires at least two conflicting sources. Abstained requires citations=[] and no documentary claims: only recommendations with evidenceRequired=false and citationEvidenceIds=[]. General guidance, including a supplier recommendation, may use abstained without a refusal in the visible answer. A partial documentary answer uses grounded with cited supported facts and explicit limits. Do not invent a source, add an irrelevant citation or relabel an unsupported local fact as a recommendation.",
  task_coverage_missing:
    "Answer the current question directly and cover every missingCoverageKey with current evidence. For verification_checklist, give the requested human checks instead of repeating the whole history. Identify specific missing support without replacing available facts with a generic refusal.",
  unsupported_monetary_assertion:
    "Keep only amounts necessary for the current question. Each asserted amount needs the cited literal source or an explicit calculation with documented operands and period. Do not introduce old contract prices into a request about technical release.",
  financial_result_scope_mismatch:
    "Label the derived revenue-minus-expenses result as the total period result. Do not label it ordinary or freely available without specific segregated source figures.",
  answer_body_protocol_json:
    "Write the user-facing answer as natural prose, without a serialized protocol envelope.",
  specialist_reason_contradiction:
    "Make the specialist indicator, type and reason consistent; preserve required human review for high-risk questions.",
  pending_source_as_confirmed:
    "For every claim citing pendingEvidenceIds, use claimType=interpretation and evidenceRequired=true, and rewrite the statement and visible prose as an unconfirmed proposal. Descriptions of a draft also use interpretation. Never confirm applicability or change only the claim type while retaining a confirmed assertion."
};
type ValidationContract = Readonly<{
  conditionalConflict?: Readonly<{
    rule: "same_record_distinct_values_with_cited_uncertainty";
    recordIds: readonly string[];
    evidenceIds: readonly string[];
  }>;
  failedConstraint: AnswerValidationCode | null;
  permittedModes: readonly string[];
  availableEvidenceIds: readonly string[];
  conflictEvidenceIds: readonly string[];
  pendingEvidenceIds: readonly string[];
  claims: Readonly<{
    documentary: "evidence_required_and_displayed";
    pending: "interpretation_only";
    general: "recommendation_without_local_fact";
  }>;
  specialistTypes: typeof specialistTypes;
  specialistNotRequired: Readonly<{ type: null; reason: null }>;
  abstained: Readonly<{ citations: readonly []; documentaryClaims: false; localFacts: false }>;
  monetaryClaims: "documented_or_explicit_hypothesis_or_refusal";
  partialDocumentaryAnswer: "grounded_with_cited_facts_and_explicit_limits";
  missingCoverageKeys?: readonly string[];
  repairInstruction?: string;
}>;
export type DocumentaryGap = Readonly<{
  kind: "financial_statement" | "collective_agreement";
  scope: "not_in_retrieved_evidence";
}>;
export type AnswerTaskFocus = Readonly<{
  acceptedAssistantOffer?: Readonly<{ question: string; source: "server_document_comment" }>;
  policyVersion: "task-focus-v1";
  scope: "current_question_and_recent_window";
  kind: "synthesis" | "follow_up";
  requestedItems: readonly string[];
  omittedItems: number;
  explicitTopics: readonly TaskTopic[];
  documentaryGaps: readonly DocumentaryGap[];
  requirements?: readonly TaskRequirement[];
  activeReferences?: readonly string[];
  validationContract?: ValidationContract;
  responseKind?: "verification_checklist" | "documentary_summary" | "acceptance_evidence_checklist";
  supersededReferences?: readonly string[];
  referenceDate?: string;
  factualRevisionRequest?: true;
  completionChecklist?: readonly CompletionItem[];
  omittedCompletionItems?: number;
}>;

function isDefinition(question: string): boolean {
  return /^(?:o que|qual.{0,20}diferenca|como funciona|como calcular)\b/u.test(
    normalizeQueryText(question)
  );
}

function isSynthesis(question: string): boolean {
  if (isDefinition(question)) return false;
  return (
    !/^\s*nao (?:resuma|sintetize|finalize|termine|conclua)\b/u.test(
      normalizeQueryText(question)
    ) &&
    /\b(?:sintese|sintetize|conclusao|quadro|tabela|resuma|resumo|feche|conclua|finalize|termine|checklist|pauta|aceite integral|verificacoes)\b|\b(?:prepare|redija|escreva|monte|faca)\b.{0,45}\b(?:mensagem|informe|rascunho)\b|\b(?:qual|quais)\b.{0,30}(?:proxima acao humana|proximo passo humano)|qual numero.{0,40}(?:constar|trocar|confundir)/u.test(
      normalizeQueryText(question)
    )
  );
}

function selectedTaskQuestions(question: string, questions: readonly string[]): readonly string[] {
  if (!isSynthesis(question)) return [question];
  if (/qual numero.{0,40}(?:constar|trocar|confundir)/u.test(normalizeQueryText(question)))
    return [question];
  const direct = explicitTopics(question);
  const integral = /aceite integral/u.test(normalizeQueryText(question));
  const correctedPeriod = /competencia.{0,25}corrigid|mes que corrigi|numeros corrigid/u.test(
    normalizeQueryText(question)
  );
  const monthPattern =
    /\b(janeiro|fevereiro|marco|abril|maio|junho|julho|agosto|setembro|outubro|novembro|dezembro)\b/gu;
  const correctionMonth = correctedPeriod
    ? questions
        .toReversed()
        .filter((text) =>
          /corrigindo|corrijo|quis dizer|na verdade/u.test(normalizeQueryText(text))
        )
        .map((text) => [...normalizeQueryText(text).matchAll(monthPattern)].at(-1)?.[1])
        .find(Boolean)
    : undefined;
  const recentMonth =
    correctionMonth ??
    (correctedPeriod
      ? questions
          .toReversed()
          .map((text) => [...normalizeQueryText(text).matchAll(monthPattern)].at(-1)?.[1])
          .find(Boolean)
      : undefined);
  return questions.filter(
    (text) =>
      text === question ||
      ((!recentMonth ||
        ![...normalizeQueryText(text).matchAll(monthPattern)].length ||
        [...normalizeQueryText(text).matchAll(monthPattern)].some(
          (match) => match[1] === recentMonth
        )) &&
        !isDefinition(text) &&
        /\b(?:prepare|monte|consolide|compare|confira|conclua|finalize|organize|volte|retome|liste|separe|faca|explique|adicione|inclua|acrescente|qual|quais|quanto|posso chamar)\b/u.test(
          normalizeQueryText(text)
        ) &&
        (direct.length === 0 ||
          integral ||
          (direct.some((topic) => topic.key === "maintenance") &&
            /execucao|realiza.{0,20}servico|comprovante.{0,20}(?:servico|obra)/u.test(
              normalizeQueryText(text)
            )) ||
          (direct.some((topic) => topic.key === "financial") &&
            /resultado|superavit|deficit|lucro|trimestre|trimestral|fechamento|conciliacao|extratos?|reserva vinculada/u.test(
              normalizeQueryText(text)
            ) &&
            explicitTopics(text).length === 0) ||
          (direct.some((topic) => topic.key === "contracts") &&
            /aviso|denuncia|antecedencia|multa|penalidade/u.test(normalizeQueryText(text)) &&
            !/sinistro|seguro|moradores/u.test(normalizeQueryText(text))) ||
          explicitTopics(text).some((topic) =>
            direct.some((current) => current.key === topic.key)
          )))
  );
}

function taskRequirements(
  question: string,
  questions: readonly string[]
): readonly TaskRequirement[] {
  const selected = selectedTaskQuestions(question, questions);
  const requirements: TaskRequirement[] = [];
  for (const text of selected.toReversed()) {
    const normalized = normalizeQueryText(text).replace(
      /\b(?:sem incluir|sem tratar|nao inclua|exclua|exceto)\b.*/u,
      ""
    );
    for (const topic of explicitTopics(text))
      if (!requirements.some((item) => item.key === topic.key))
        requirements.push({ key: topic.key, question: text });
    // Cláusulas são exigidas quando pedidas, não pela mera presença em uma fonte.
    for (const clause of clauses) {
      if (
        clause.key === "termination_notice" &&
        /aviso (?:de |do |aos |para os )?(?:sinistro|seguro|emergencia|moradores)/u.test(normalized)
      )
        continue;
      if (clause.key === "hall_rule" && !/taxa|horario|regra|termina|encerra/u.test(normalized))
        continue;
      if (
        clause.key === "execution_proof" &&
        !/execucao|relatorio|certificado|visita.*(?:aconteceu|realizada)|comprovante.{0,20}(?:servico|obra|realiza)/u.test(
          normalized
        )
      )
        continue;
      if (clause.pattern.test(normalized) && !requirements.some((item) => item.key === clause.key))
        requirements.push({ key: clause.key, question: text });
    }
  }
  const excluded =
    normalizeQueryText(question).split(
      /\b(?:sem incluir|sem tratar|nao inclua|exclua|exceto)\b/u
    )[1] ?? "";
  const excludedKeys = new Set<string>([...explicitTopics(excluded).map((topic) => topic.key)]);
  if (excludedKeys.has("contracts"))
    ["termination_notice", "penalty"].forEach((key) => excludedKeys.add(key));
  if (excludedKeys.has("financial"))
    ["financial_result", "reserve_binding", "reconciliation"].forEach((key) =>
      excludedKeys.add(key)
    );
  return Object.freeze(
    requirements
      .filter((item) => !excludedKeys.has(item.key))
      .slice(0, 10)
      .map((item) => Object.freeze(item))
  );
}

function activeReferences(question: string, memory: ConversationContext): readonly string[] {
  if (
    /\b(?:ambas|ambos|cada|compare)\b|(?:liste|mostre|para) (?:as |os )?(?:duas|dois)\b/u.test(
      normalizeQueryText(question)
    )
  )
    return [];
  const lines = [...memory.turns.map((turn) => turn.question), question];
  const selected = contextualQuestion(question, memory);
  const lastCorrection = lines.findLastIndex((line) =>
    /corrigindo|corrijo|quis dizer|na verdade/u.test(normalizeQueryText(line))
  );
  if (lastCorrection < 0 || selected === question || !selected.includes(lines[lastCorrection]!))
    return [];
  const current = queryEntities(question);
  const corrected = queryEntities(
    lines[lastCorrection]!.split(/\b(?:n[aã]o|antes|anterior)\b/iu)[0]!
  );
  return Object.freeze(current.length > 0 ? current : corrected.slice(0, 1));
}

function explicitTopics(question: string) {
  const requested = normalizeQueryText(question)
    .replace(/\b(?:sem incluir|sem tratar|nao inclua|exclua|exceto)\b.*/u, "")
    .replace(/versao final (?:do |da )?(?:rascunho|texto|mensagem|comunicado)/gu, "redacao");
  return topics.filter((topic) =>
    topic.key === "insurance"
      ? /apolice|sinistro|seguro (?:condominial|predial)|\b(?:o|do|ao|os|dos) seguros?\b/u.test(
          requested
        )
      : topic.pattern.test(requested)
  );
}

function financialSources(evidence: readonly RetrievalEvidence[]): readonly RetrievalEvidence[] {
  return evidence.filter(
    (source) =>
      source.sourceScope !== "legislation" &&
      (/balancete|prestacao de contas|demonstrativo financeiro|fluxo de caixa|extrato bancario/u.test(
        normalizeQueryText(source.documentTitle)
      ) ||
        (normalizeQueryText(source.content).match(
          /\b(?:saldo(?: final| inicial)?|receitas|despesas|recebimentos|pagamentos)\s*:/gu
        )?.length ?? 0) >= 2 ||
        /\bsaldo(?: (?:final|inicial|anterior|bancario))?\s*(?::|de|e)?\s*r\$\s*\d/u.test(
          normalizeQueryText(source.content)
        ))
  );
}

/** Lacunas são da consulta atual; não provam ausência de arquivo em todo o acervo. */
export function documentaryGaps(
  question: string,
  evidence: readonly RetrievalEvidence[]
): readonly DocumentaryGap[] {
  const text = normalizeQueryText(question);
  const gaps: DocumentaryGap[] = [];
  if (
    /saldo|disponibilidade ordinaria/u.test(text) &&
    /\b(?:qual|quanto|calcule|compare|confirme|informe)\b/u.test(text) &&
    !/\bcomo\b|o que (?:e|significa)/u.test(text) &&
    financialSources(evidence).length === 0
  )
    gaps.push({ kind: "financial_statement", scope: "not_in_retrieved_evidence" });
  if (
    /\bpiso\b|regularidade trabalhista/u.test(text) &&
    /acima|confirme|confirmar|adequad|cumpr|regularidade/u.test(text) &&
    (/salari|trabalhist|\bcct\b|empregado|funcionario/u.test(text) ||
      evidence.some(
        (source) =>
          source.documentType === "contract" &&
          /salario|jornada/u.test(normalizeQueryText(source.content))
      )) &&
    !evidence.some((source) =>
      /^(?:cct\b|convencao coletiva|acordo coletivo)/u.test(
        normalizeQueryText(source.documentTitle)
      )
    )
  )
    gaps.push({ kind: "collective_agreement", scope: "not_in_retrieved_evidence" });
  return Object.freeze(gaps.map((gap) => Object.freeze(gap)));
}

export function requiresFinancialEvidence(
  question: string,
  evidence: readonly RetrievalEvidence[]
): boolean {
  // Em pedido composto, conservar fontes úteis para as outras partes.
  return (
    !/contrat|convencao|regimento|salao|seguro|laudo|assembleia|versao|locacao/u.test(
      normalizeQueryText(question)
    ) && documentaryGaps(question, evidence).some((gap) => gap.kind === "financial_statement")
  );
}

export function requiresCollectiveAgreementEvidence(
  question: string,
  evidence: readonly RetrievalEvidence[]
): boolean {
  // A consulta exclusivamente sobre piso não usa o contrato como substituto da CCT.
  // Pedidos compostos conservam as fontes úteis para salário, jornada e contrato.
  return (
    !/jornada|contrato|balancete|seguro|assembleia|laudo|\be tambem\b/u.test(
      normalizeQueryText(question)
    ) && documentaryGaps(question, evidence).some((gap) => gap.kind === "collective_agreement")
  );
}

export function isGeneralLaborExplanation(
  question: string,
  evidence: readonly RetrievalEvidence[]
): boolean {
  const text = normalizeQueryText(question);
  return (
    /\b(?:entender|compreender|explique|o que e|como funciona)\b/u.test(text) &&
    /dispensa|demissao|desligamento|rescisao/u.test(text) &&
    !/contrato|clausula|salario|jornada|calcule|quanto|valor|prazo exato|meu caso|nosso caso/u.test(
      text
    ) &&
    !evidence.some((source) => source.sourceScope === "legislation")
  );
}

/** Foco efêmero: relatos e intenção aceita, sem replay de fatos ou histórico adicional. */
export function withAnswerTaskFocus(
  question: string,
  memory: ConversationContext | undefined,
  evidence: readonly RetrievalEvidence[],
  referenceDate?: string,
  acceptedOffer?: string
): ConversationContext | undefined {
  if (memory === undefined) return undefined;
  const contextual = contextualQuestion(question, memory);
  const gaps = documentaryGaps(question, evidence);
  const offer = acceptedOffer ?? memory.taskFocus?.acceptedAssistantOffer?.question;
  if (contextual === question && !isSynthesis(question) && gaps.length === 0 && offer === undefined)
    return memory;
  const factsOnly = /(?:somente|apenas).{0,25}fatos/u.test(normalizeQueryText(question));
  const candidates = [...memory.turns.map((turn) => turn.question), question].filter(
    (text) =>
      contextual.includes(text) &&
      !containsHostileInstruction(text) &&
      !(factsOnly && /(?:prepare|faca|monte).{0,30}orientacao/u.test(normalizeQueryText(text)))
  );
  const items = [...new Set(candidates)].filter((text) => Array.from(text).length <= 600);
  const verification =
    isSynthesis(question) &&
    /contador|verificacoes.{0,30}(?:humanas|prioritarias)/u.test(normalizeQueryText(question));
  if (
    (verification && explicitTopics(question).length > 0) ||
    /qual numero.{0,40}(?:constar|trocar|confundir)/u.test(normalizeQueryText(question))
  )
    items.splice(0, items.length, question);
  const topicKeys = explicitTopics(question).map((topic) => topic.key);
  const requirements = [...taskRequirements(question, candidates)];
  const renewalFollowUp =
    !isSynthesis(question) &&
    /contrat|minuta|aditivo/u.test(normalizeQueryText(question)) &&
    /renovacao|renovar/u.test(normalizeQueryText(contextual)) &&
    !/quanto|qual (?:preco|valor|clausula|multa|aviso)/u.test(normalizeQueryText(question));
  const references = activeReferences(question, memory);
  let completionChecklist =
    isSynthesis(question) || renewalFollowUp
      ? [
          ...buildCompletionChecklist(
            question,
            renewalFollowUp ? candidates : selectedTaskQuestions(question, candidates),
            requirements.map((item) => item.key),
            evidence,
            financialSources(evidence),
            references
          )
        ]
      : [];
  const completionItemCount = completionChecklist.length;
  completionChecklist = completionChecklist.slice(0, 12);
  const supersededReferences =
    references.length === 1
      ? [...new Set(memory.turns.flatMap((turn) => queryEntities(turn.question)))].filter(
          (id) => id !== references[0] && id.split("-")[0] === references[0]!.split("-")[0]
        )
      : [];
  const date = referenceDate ?? memory.taskFocus?.referenceDate;
  for (let omitted = candidates.length - items.length; ; omitted++) {
    const taskFocus: AnswerTaskFocus = Object.freeze({
      policyVersion: "task-focus-v1",
      scope: "current_question_and_recent_window",
      kind: isSynthesis(question) ? "synthesis" : "follow_up",
      requestedItems: Object.freeze([...items]),
      omittedItems: omitted,
      explicitTopics: Object.freeze(topicKeys),
      documentaryGaps: gaps,
      ...(offer === undefined
        ? {}
        : {
            acceptedAssistantOffer: { question: offer, source: "server_document_comment" as const }
          }),
      ...(verification
        ? { responseKind: "verification_checklist" as const }
        : /aceite integral/u.test(normalizeQueryText(question))
          ? { responseKind: "acceptance_evidence_checklist" as const }
          : isSynthesis(question)
            ? { responseKind: "documentary_summary" as const }
            : {}),
      ...(date === undefined ? {} : { referenceDate: date }),
      ...(/\b(?:troque|altere|mude|substitua|zere|apague)\b/u.test(normalizeQueryText(question)) &&
      /resumo|relatorio|ressalva|divida|saldo/u.test(normalizeQueryText(question))
        ? { factualRevisionRequest: true as const }
        : {}),
      ...(requirements.length === 0 ? {} : { requirements: Object.freeze([...requirements]) }),
      ...(references.length === 0 ? {} : { activeReferences: references }),
      ...(supersededReferences.length === 0 ? {} : { supersededReferences }),
      ...(completionChecklist.length === 0
        ? {}
        : { completionChecklist: Object.freeze([...completionChecklist]) }),
      ...(completionItemCount === completionChecklist.length
        ? {}
        : { omittedCompletionItems: completionItemCount - completionChecklist.length })
    });
    const bytes = Buffer.byteLength(
      JSON.stringify({
        turns: memory.turns,
        taskFocus,
        ...(memory.confirmedProfile === undefined
          ? {}
          : { confirmedProfile: memory.confirmedProfile })
      }),
      "utf8"
    );
    if (bytes <= 12_000) return Object.freeze({ ...memory, taskFocus, bytes });
    if (completionChecklist.length > 0) completionChecklist = completionChecklist.slice(0, -1);
    else if (requirements.length > 0) requirements.pop();
    else if (items.length > 0) items.shift();
    else return memory;
  }
}

/** Detecta somente omissão lexical de tópicos explícitos; não certifica completude ou verdade. */
export function validateTaskCoverage(input: AnswerGatewayInput, generated: GeneratedAnswer): void {
  const focus = input.conversationContext?.taskFocus;
  const requirements = focus?.requirements ?? taskRequirements(input.question, [input.question]);
  // Atenções podem ser removidas na apresentação; a resposta principal deve cobrir os tópicos.
  const output = normalizeQueryText(generated.answer);
  if (
    /quais (?:itens|assuntos|pontos)|repita.{0,30}(?:pedido|itens)|esclareca.{0,30}(?:escopo|itens)|janela.{0,30}(?:incompleta|parcial)/u.test(
      output
    )
  )
    return;
  if (
    focus?.activeReferences?.some((id) => !output.includes(id)) &&
    !/qual unidade|confirme.{0,30}unidade|nao.{0,30}identificar/u.test(output)
  )
    throw new InvalidAnswerValidationError(
      "A resposta perdeu a referência corrigida.",
      "task_entity_missing"
    );
  if (
    /qual (?:unidade|numero|identificador)|nao (?:trocar|confundir)|unidade corrigida/u.test(
      normalizeQueryText(input.question)
    ) &&
    focus?.activeReferences?.length === 1 &&
    focus.supersededReferences?.some((id) => output.includes(id))
  ) {
    const active = focus.activeReferences[0]!;
    const escaped = active.replace(/[.*+?^${}()|[\]\\]/gu, "\\$&");
    const selection = new RegExp(
      `(?:corrigid[oa]|corret[oa]|alvo).{0,60}\\b${escaped}\\b|\\b${escaped}\\b.{0,45}(?:corrigid[oa]|corret[oa]|alvo)|^(?:a unidade (?:e |eh )?)?\\*{0,2}${escaped}\\b`,
      "u"
    );
    const rejectsPrevious = focus.supersededReferences.some(
      (id) => output.includes(`nao ${id}`) || output.includes(`nao com ${id}`)
    );
    if (
      !selection.test(output) &&
      !rejectsPrevious &&
      !/qual unidade|confirme.{0,30}unidade|nao.{0,30}identificar/u.test(output)
    )
      throw new InvalidAnswerValidationError(
        "A resposta não selecionou a referência corrigida.",
        "task_entity_missing"
      );
  }
  const explicitClause = /aviso|denuncia|multa/u.test(normalizeQueryText(input.question));
  if (!isSynthesis(input.question) && !explicitClause && !focus?.completionChecklist?.length)
    return;
  if (requirements.length === 0 && !focus?.completionChecklist?.length) return;
  const missing = requirements
    .filter(
      (item) =>
        ![...topics, ...clauses].find((entry) => entry.key === item.key)!.pattern.test(output) &&
        !(
          ["financial", "financial_result"].includes(item.key) &&
          financialSources(input.evidence).length > 0 &&
          coversFinancialResult(output)
        ) &&
        !(item.key === "assemblies" && coversAssemblyDecision(generated, input.evidence)) &&
        !(
          item.key === "financial" &&
          (coversRecordNoteConflict(input.question, input.evidence, generated) ||
            coversDocumentedConflict(input.question, input.evidence, generated))
        )
    )
    .map((item) => item.key as string);
  missing.push(
    ...missingCompletionKeys(focus?.completionChecklist ?? [], generated, input.evidence)
  );
  if (missing.length > 0)
    throw new InvalidAnswerValidationError(
      "A síntese omitiu um tópico explícito do pedido.",
      "task_coverage_missing",
      Object.freeze([...new Set(missing)].slice(0, 10))
    );
}

/** Contrato da correção é dado da requisição; nunca inclui saída recusada ou fonte nova. */
export function withValidationContract(
  input: AnswerGatewayInput,
  code: AnswerValidationCode | null,
  missingKeys: readonly string[] = [],
  conflictEvidenceIds?: readonly string[]
): AnswerGatewayInput {
  const conditional =
    input.task !== "document_conflict" &&
    ["grounded_answer", "specialist_review"].includes(input.task)
      ? findDocumentedConflicts(input.question, input.evidence)
      : [];
  const memory: ConversationContext | undefined =
    withAnswerTaskFocus(input.question, input.conversationContext, input.evidence) ??
    (code === "mode_citation_mismatch" ||
    (input.task === "document_conflict" && conflictEvidenceIds?.length) ||
    conditional.length > 0
      ? {
          policyVersion: "recent-chat-v1" as const,
          turns: [],
          bytes: 0,
          omittedAnswers: 0,
          omittedTurns: 0,
          windowScope: "recent_only_start_unknown" as const
        }
      : undefined);
  const feedback = code === null ? {} : { validationFeedback: code };
  if (memory === undefined) return { ...input, ...feedback };
  const base =
    memory.taskFocus ??
    ({
      policyVersion: "task-focus-v1",
      scope: "current_question_and_recent_window",
      kind: "follow_up",
      requestedItems: [input.question],
      omittedItems: 0,
      explicitTopics: [],
      documentaryGaps: []
    } as AnswerTaskFocus);
  const repairInstruction = code === null ? undefined : repairInstructions[code];
  const contract: ValidationContract = {
    failedConstraint: code,
    permittedModes:
      input.evidence.length === 0
        ? ["abstained"]
        : input.task === "document_conflict"
          ? ["conflict"]
          : conditional.length > 0
            ? ["grounded", "conflict", "abstained"]
            : ["grounded", "abstained"],
    ...(conditional.length === 0
      ? {}
      : {
          conditionalConflict: {
            rule: "same_record_distinct_values_with_cited_uncertainty" as const,
            recordIds: [...new Set(conditional.map((c) => c.recordId))],
            evidenceIds: [...new Set(conditional.flatMap((c) => c.sides.map((s) => s.source.id)))]
          }
        }),
    availableEvidenceIds: input.evidence.map((source) => source.id),
    conflictEvidenceIds:
      input.task === "document_conflict"
        ? (
            conflictEvidenceIds ??
            input.evidence
              .filter((source) =>
                input.evidence.some(
                  (other) =>
                    other.id !== source.id &&
                    other.documentId === source.documentId &&
                    other.documentVersionId !== source.documentVersionId
                )
              )
              .map((source) => source.id)
          ).filter(
            (id, index, ids) => ids.indexOf(id) === index && input.evidence.some((e) => e.id === id)
          )
        : [],
    pendingEvidenceIds: input.evidence
      .filter((source) => ["pending", "disputed", "superseded"].includes(source.validityStatus))
      .map((source) => source.id),
    claims: {
      documentary: "evidence_required_and_displayed",
      pending: "interpretation_only",
      general: "recommendation_without_local_fact"
    },
    specialistTypes,
    specialistNotRequired: { type: null, reason: null },
    abstained: { citations: [], documentaryClaims: false, localFacts: false },
    monetaryClaims: "documented_or_explicit_hypothesis_or_refusal",
    partialDocumentaryAnswer: "grounded_with_cited_facts_and_explicit_limits",
    ...(repairInstruction === undefined ? {} : { repairInstruction }),
    ...(missingKeys.length === 0
      ? {}
      : {
          missingCoverageKeys: Object.freeze(
            [...new Set(missingKeys)]
              .filter(
                (key) =>
                  [...topics, ...clauses].some((entry) => entry.key === key) ||
                  completionKeys.some((known) => known === key)
              )
              .slice(0, 10)
          )
        })
  };
  let items = [...base.requestedItems],
    requirements = [...(base.requirements ?? [])],
    completionChecklist = [...(base.completionChecklist ?? [])];
  const completionItemCount = completionChecklist.length;
  for (;;) {
    const taskFocus: AnswerTaskFocus = {
      ...base,
      requestedItems: items,
      requirements,
      ...(base.completionChecklist === undefined ? {} : { completionChecklist }),
      ...((base.omittedCompletionItems ?? 0) + completionItemCount - completionChecklist.length ===
      0
        ? {}
        : {
            omittedCompletionItems:
              (base.omittedCompletionItems ?? 0) + completionItemCount - completionChecklist.length
          }),
      validationContract: contract
    };
    const bytes = Buffer.byteLength(
      JSON.stringify({
        turns: memory.turns,
        taskFocus,
        ...(memory.confirmedProfile === undefined
          ? {}
          : { confirmedProfile: memory.confirmedProfile })
      }),
      "utf8"
    );
    if (bytes <= 12000)
      return {
        ...input,
        ...feedback,
        conversationContext: { ...memory, taskFocus, bytes }
      };
    if (items.length > 0) items = items.slice(1);
    else if (completionChecklist.length > 0) completionChecklist = completionChecklist.slice(0, -1);
    else if (requirements.length > 0) requirements = requirements.slice(0, -1);
    else return { ...input, ...feedback };
  }
}

export function withGenerationContract(
  input: AnswerGatewayInput,
  conflictEvidenceIds?: readonly string[]
): AnswerGatewayInput {
  return input.evidence.length > 0 &&
    (input.task === "document_conflict" ||
      input.conversationContext?.taskFocus?.kind === "synthesis" ||
      findDocumentedConflicts(input.question, input.evidence).length > 0)
    ? withValidationContract(input, null, [], conflictEvidenceIds)
    : input;
}
