import { createHash, randomUUID } from "node:crypto";
import { coversRecordNoteConflict } from "./record-note-conflict.js";
import {
  computeIntegralSum,
  integralReceipt,
  isIntegralSumQuestion,
  assertIntegralAnswer,
  type IntegralDocumentSet,
  type IntegralSumSummary
} from "../analysis/integral-document-sum.js";
import { documentaryReplayLedger } from "./documentary-replay.js";
import { chatIdPattern, type HistoryFilter } from "../chats/chat-repository.js";
import {
  createLocalChatTurnGuard,
  buildConversationContext,
  withoutDocumentaryReplay,
  contextualQuestion,
  contextualRiskQuestion,
  acceptedDocumentaryOffer,
  ConversationMemoryError,
  type ConversationContext
} from "./conversation-memory.js";
import { literalSentences } from "./literal-sentences.js";
import {
  requiresFinancialEvidence,
  requiresCollectiveAgreementEvidence,
  isGeneralLaborExplanation,
  validateTaskCoverage,
  withValidationContract,
  withGenerationContract,
  withAnswerTaskFocus
} from "./answer-task-context.js";
import { documentSubjectQuery } from "../retrieval/retrieval-query.js";
import {
  withConfirmedProfile,
  isRegisteredProfileQuestion,
  supportsRegisteredUnitsStatement,
  type ConfirmedProfileContext,
  type RegisteredProfileInput
} from "./confirmed-profile-context.js";
import { lexicalScore } from "../retrieval/text-retrieval.js";
import { CodexAnswerGatewayUnavailableError } from "./codex-answer-gateway.js";
import { hasContradictoryTemporalOrder } from "./answer-temporal-order.js";
import { routingPolicyVersion } from "./answer-model-routing.js";
import { isBareWebResearchRequest, publicWebResearchPlan } from "./public-service-research.js";

import {
  isSimpleConversationMessage,
  isDocumentUploadNotice
} from "../../shared/conversation-intent.js";
import type { AuthorizedCondominiumContext } from "../identity/authorized-condominium-context.js";
import type {
  RetrievalSearchInput,
  ScopedRetrievalResult
} from "../retrieval/retrieval-contract.js";
import { evaluateEvidenceSufficiency } from "../retrieval/retrieval-ranking.js";
import {
  answerPipelineVersion,
  answerSchemaVersion,
  freezeAnswerPayload,
  type AnswerClaim,
  type AnswerMode,
  type AnswerPayload,
  type AnswerRecord,
  type GeneratedAnswer,
  type RiskClass
} from "./answer-contract.js";
import {
  AnswerGatewayUnavailableError,
  gatewayErrorTelemetry,
  type AnswerGateway,
  type AnswerGatewayTelemetry,
  type AnswerGatewayInput
} from "./answer-gateway.js";
import { detectDocumentConflict } from "./conflict-detection.js";
import {
  InvalidAnswerValidationError,
  validateGeneratedAnswer,
  answerValidationCodes,
  type AnswerValidationCode
} from "./citation-validator.js";
import {
  type AnswerPersistence,
  type AuditEventRecord,
  type ConversationHistoryEntry,
  type ModelInvocationRecord,
  type PersistedInteraction,
  type QuestionRecord,
  type RetrievalRunRecord,
  retrievalEvidenceRecordFromResult,
  type SubmitFeedbackInput,
  type FeedbackRecord,
  validateFeedbackInput
} from "./answer-persistence.js";
import { answerPromptVersion, type AnswerPromptTask } from "./prompt-catalog.js";
import { classifyQuestionRisk, type RiskAssessment } from "./risk-classification.js";
import { enforceHighRiskSpecialist, specialistFromAssessment } from "./answer-risk-policy.js";
import {
  screenDocumentInstructions,
  containsProtectedDocumentLiteral
} from "../security/document-instructions/document-instruction-policy.js";

export type AnswerRetriever = Readonly<{
  search(
    context: AuthorizedCondominiumContext,
    input: RetrievalSearchInput
  ): Promise<ScopedRetrievalResult>;
}>;

export type AskQuestionInput = Readonly<{
  /** Leitura interna autorizada; nunca aceita do corpo HTTP. */
  readIntegralDocuments?: () => Promise<IntegralDocumentSet>;
  chatId?: string;
  question: string;
  requestId: string;
  idempotencyKey?: string;
  preferredName?: string;
  /** Perfil lido pelo servidor no condomínio autorizado, não pelo corpo HTTP. */
  registeredProfile?: RegisteredProfileInput;
  /** Callback interno do servidor; nunca aceito do corpo HTTP. */
  revalidateConversation?: () => Promise<void>;
  /** Progresso operacional interno; nunca aceito do corpo HTTP. */
  onWebResearchStarted?: () => void;
  /** Leitor interno autenticado do journal; nunca aceito do corpo HTTP. */
  readAuxiliaryHistory?: () => Promise<readonly ConversationHistoryEntry[]>;
}>;

export type AnswerUseCase = Readonly<{
  findValidatedAnswer?(
    context: AuthorizedCondominiumContext,
    answerId: string
  ): Promise<AnswerRecord | undefined>;
  ask(context: AuthorizedCondominiumContext, input: AskQuestionInput): Promise<AnswerRecord>;
  listConversationHistory(
    context: AuthorizedCondominiumContext,
    limit?: number,
    filter?: HistoryFilter
  ): Promise<readonly ConversationHistoryEntry[]>;
  submitFeedback(
    context: AuthorizedCondominiumContext,
    input: SubmitFeedbackInput
  ): Promise<FeedbackRecord>;
}>;

export type AnswerUseCaseOptions = Readonly<{
  retriever: AnswerRetriever;
  gateway: AnswerGateway;
  demoWebResearchGateway?: AnswerGateway;
  persistence: AnswerPersistence;
  now?: () => Date;
  idFactory?: () => string;
  maximumOutputTokens?: number;
  maximumCostMicrounits?: number;
  chatMemoryEnabled?: boolean;
  onValidationFailure?: (
    diagnostic: Readonly<{ code: AnswerValidationCode | "unknown"; attemptCount: number }>
  ) => void;
}>;

const defaultMaximumOutputTokens = 800;
const defaultMaximumCostMicrounits = 100_000;

class ProtectedDocumentOutputError extends Error {}

type AnswerAttempt = { telemetry: AnswerGatewayTelemetry; evidenceIds: readonly string[] };

function gatewayErrorCode(error: unknown, fallback: string): string {
  if (error instanceof ProtectedDocumentOutputError) return "protected_document_literal";
  if (error instanceof CodexAnswerGatewayUnavailableError) return error.code;
  if (error instanceof InvalidAnswerValidationError) return error.code;
  return fallback;
}

function hash(value: string): string {
  return createHash("sha256").update(value).digest("hex");
}

function validateQuestion(input: AskQuestionInput): Readonly<{
  question: string;
  requestId: string;
  idempotencyKey: string;
  preferredName?: string;
}> {
  const question = input.question.trim();
  if (question.length === 0 || question.length > 4_000) {
    throw new Error("A pergunta deve ter entre 1 e 4.000 caracteres.");
  }
  const requestId = input.requestId.trim();
  if (requestId.length === 0 || requestId.length > 200) {
    throw new Error("O identificador da requisição é inválido.");
  }
  const idempotencyKey =
    input.idempotencyKey === undefined ? requestId : input.idempotencyKey.trim();
  if (idempotencyKey.length === 0 || idempotencyKey.length > 200) {
    throw new Error("A chave de idempotência é inválida.");
  }
  const preferredName = input.preferredName?.trim().replaceAll(/\s+/gu, " ");
  return Object.freeze({
    question,
    requestId,
    idempotencyKey,
    ...(preferredName === undefined ||
    preferredName.length < 2 ||
    preferredName.length > 60 ||
    /\p{Cc}/u.test(preferredName)
      ? {}
      : { preferredName })
  });
}

function addressGeneratedAnswer(
  generated: GeneratedAnswer,
  preferredName: string | undefined
): GeneratedAnswer {
  if (typeof generated?.answer !== "string")
    throw new InvalidAnswerValidationError("O texto da resposta é inválido.");
  if (
    preferredName === undefined ||
    generated.answer.toLocaleLowerCase("pt-BR").includes(preferredName.toLocaleLowerCase("pt-BR"))
  ) {
    return generated;
  }
  const addressedAnswer = /^ol[áa][!.]/iu.test(generated.answer)
    ? generated.answer.replace(/^ol[áa]/iu, `Olá, ${preferredName}`)
    : `${preferredName}, ${generated.answer.charAt(0).toLocaleLowerCase("pt-BR")}${generated.answer.slice(1)}`;
  return Object.freeze({
    ...generated,
    answer: addressedAnswer,
    claims: Object.freeze(
      (generated.claims ?? []).map((claim) =>
        claim.statement === generated.answer
          ? Object.freeze({ ...claim, statement: addressedAnswer })
          : claim
      )
    )
  });
}

function addressPayload(
  payload: AnswerPayload,
  claims: readonly AnswerClaim[],
  preferredName: string | undefined
): Readonly<{ payload: AnswerPayload; claims: readonly AnswerClaim[] }> {
  if (
    preferredName === undefined ||
    payload.answer.toLocaleLowerCase("pt-BR").includes(preferredName.toLocaleLowerCase("pt-BR"))
  ) {
    return Object.freeze({ payload, claims });
  }
  const answer = `${preferredName}, ${payload.answer.charAt(0).toLocaleLowerCase("pt-BR")}${payload.answer.slice(1)}`;
  return Object.freeze({
    payload: freezeAnswerPayload({ ...payload, answer }),
    claims: Object.freeze(
      claims.map((claim) =>
        claim.statement === payload.answer ? Object.freeze({ ...claim, statement: answer }) : claim
      )
    )
  });
}

function historicalReferenceDate(question: string, fallback: Date): Date {
  const match = /(?:vigente|válid[ao]|segundo|em)\s+(?:em\s+)?(20\d{2})/iu.exec(question);
  if (match?.[1] === undefined) {
    return fallback;
  }

  const year = Number(match[1]);
  const date = new Date(Date.UTC(year, 11, 31, 23, 59, 59, 999));
  return Number.isNaN(date.getTime()) ? fallback : date;
}

function referenceDate(question: string, now: Date): Date {
  return historicalReferenceDate(question, now);
}

function failedPayload(reason: string, assessment: RiskAssessment): AnswerPayload {
  return freezeAnswerPayload({
    answer: "Não foi possível concluir a consulta com segurança.",
    answerMode: "failed",
    citations: Object.freeze([]),
    attentionPoints: Object.freeze([reason]),
    suggestedNextStep:
      "Tente novamente; se o problema persistir, verifique a disponibilidade do serviço.",
    specialist: specialistFromAssessment(assessment)
  });
}

function abstainedPayload(
  result: ScopedRetrievalResult,
  assessment: RiskAssessment,
  question: string
): AnswerPayload {
  const lowQuality = (result.diagnostics?.lowQualityCount ?? 0) > 0 && result.evidence.length === 0;
  const attentionPoints = lowQuality
    ? [
        "O reconhecimento do documento é incerto ou os trechos recuperados não atingiram o piso de qualidade. Confira o original ou corrija o OCR antes de usar a informação."
      ]
    : ["Não encontrei evidência documental suficiente para afirmar uma regra do condomínio."];

  const suggestedNextStep = lowQuality
    ? "Confira o original ou corrija o OCR antes de usar a informação."
    : /animal|cachorro|gato/iu.test(question)
      ? "Anexe, confirme ou corrija o regimento ou a convenção com a regra sobre animais."
      : "Anexe, confirme ou corrija o documento que trata diretamente desse assunto.";

  return freezeAnswerPayload({
    answer: lowQuality
      ? "Não posso confirmar essa informação porque o reconhecimento do documento é incerto."
      : "Não encontrei base documental suficiente para responder sem inventar uma regra local.",
    answerMode: "abstained",
    citations: Object.freeze([]),
    attentionPoints: Object.freeze(attentionPoints),
    suggestedNextStep,
    specialist: specialistFromAssessment(assessment)
  });
}

function documentInstructionAbstainedPayload(assessment: RiskAssessment): AnswerPayload {
  return freezeAnswerPayload({
    answer:
      "Não posso usar esse trecho como base para responder, porque ele contém instruções não confiáveis.",
    answerMode: "abstained",
    citations: Object.freeze([]),
    attentionPoints: Object.freeze([
      "O conteúdo documental foi tratado como dado não confiável e não acionou nenhuma ação."
    ]),
    suggestedNextStep:
      "Envie ou indique a cláusula, regra ou decisão relevante sem instruções operacionais.",
    specialist: specialistFromAssessment(assessment)
  });
}

function isProtectedContextRequest(question: string): boolean {
  return /frase-canário|código interno|outro condomínio|ignore\s+as\s+permissões|reveal?\s+document/iu.test(
    question
  );
}

function emptyRetrievalResult(question: string): ScopedRetrievalResult {
  return Object.freeze({
    pipelineVersion: "hybrid-v1" as const,
    queryHash: hash(question),
    candidateCount: 0,
    selectedCount: 0,
    evidence: Object.freeze([]),
    sufficiency: evaluateEvidenceSufficiency([])
  });
}

function expectedTask(conflict: boolean, assessment: RiskAssessment): AnswerPromptTask {
  if (conflict) {
    return "document_conflict";
  }
  return assessment.riskClass === "high" ? "specialist_review" : "grounded_answer";
}

function conflictFallback(
  conflict: NonNullable<ReturnType<typeof detectDocumentConflict>>,
  assessment: RiskAssessment,
  evidence: ScopedRetrievalResult["evidence"],
  notice: string,
  question: string
) {
  const subject = documentSubjectQuery(question);
  const excerpts = conflict.evidence.map(
    (source) =>
      literalSentences(source.content)
        .filter((span) => !/^p[aá]gina\s+\d+\.?$/iu.test(span.text))
        .filter((span) =>
          /\d|R\$|\b(?:depende|prev[eê]|prop[oõ]e|indica|est[aá]|permite|exige)\b/iu.test(span.text)
        )
        .toSorted(
          (a, b) =>
            lexicalScore(subject, b.text) +
            (/R\$/u.test(b.text) ? 0.2 : 0) -
            (lexicalScore(subject, a.text) + (/R\$/u.test(a.text) ? 0.2 : 0))
        )[0]?.text ?? source.content
  );
  const sources = [...conflict.evidence];
  let supplementary = "";
  if (conflict.evidence[0]?.documentType === "contract") {
    const requestedDetail = /renova|vig[eê]ncia|vencimento|vence/iu.test(question)
      ? /vig[eê]ncia.*\d{2}\/\d{2}\/\d{4}/iu
      : /pre[cç]o|valor|reajuste/iu.test(question)
        ? /(?:pre[cç]o|valor)\s+mensal/iu
        : null;
    if (requestedDetail !== null) {
      for (const source of evidence.filter(
        (item) =>
          item.documentVersionId === conflict.evidence[0]!.documentVersionId &&
          ["confirmed", "not_applicable"].includes(item.validityStatus)
      )) {
        const span = literalSentences(source.content).find((item) =>
          requestedDetail.test(item.text)
        );
        if (span === undefined || excerpts.includes(span.text)) continue;
        supplementary = ` Dado contratual: “${span.text}”`;
        if (!sources.some((item) => item.id === source.id)) sources.push(source);
        break;
      }
    }
  }
  const pending = conflict.evidence.some((source) =>
    ["pending", "disputed"].includes(source.validityStatus)
  );
  const answer = pending
    ? `Há uma versão confirmada e outra pendente; confirme a aprovação antes de aplicar a mudança. Fonte confirmada: “${excerpts[0]}”${supplementary} Versão pendente: “${excerpts[1]}” ${notice}`
    : `${conflict.reason} ${notice} Confira as fontes citadas antes de aplicar qualquer regra.`;
  return validateGeneratedAnswer(
    {
      answer,
      answerMode: "conflict",
      citations: sources.map((source) => ({
        evidenceId: source.id,
        documentId: source.documentId,
        documentVersionId: source.documentVersionId,
        title: source.documentTitle,
        page: source.pageNumber,
        excerpt: source.content,
        startOffset: source.startOffset,
        endOffset: source.endOffset
      })),
      attentionPoints: [conflict.reason],
      suggestedNextStep:
        "Confirme a aprovação e a relação entre as versões com o responsável competente.",
      specialist: specialistFromAssessment(assessment),
      claims: [
        {
          statement: conflict.reason,
          claimType: "interpretation",
          evidenceRequired: true,
          citationEvidenceIds: sources.map((source) => source.id)
        }
      ]
    },
    evidence
  );
}

function expectedMode(task: AnswerPromptTask, conversationOnly = false): AnswerMode {
  if (conversationOnly) {
    return "abstained";
  }
  return task === "document_conflict" ? "conflict" : "grounded";
}

function acceptsGeneratedMode(task: AnswerPromptTask, mode: AnswerMode): boolean {
  if (task === "document_conflict") {
    return mode === "conflict";
  }
  return mode === "grounded" || mode === "abstained";
}

function documentaryLimitation(
  result: ScopedRetrievalResult | undefined,
  retrievalFailureCode: string | null
): string {
  if (retrievalFailureCode !== null || result === undefined) {
    return "Não foi possível consultar os documentos do condomínio nesta tentativa. A resposta abaixo é uma orientação geral.";
  }
  if ((result.diagnostics?.lowQualityCount ?? 0) > 0 && result.evidence.length === 0) {
    return "O reconhecimento do documento é incerto ou os trechos encontrados não têm qualidade suficiente para confirmar a resposta. Confira o original ou corrija o OCR. A orientação abaixo é geral e não substitui a conferência do documento.";
  }
  if (result.evidence.length > 0) {
    return "Os trechos encontrados não sustentam uma resposta documental segura. A orientação abaixo é geral e não confirma uma regra do condomínio.";
  }
  if (
    (result.diagnostics?.pendingValidityCount ?? 0) > 0 ||
    (result.diagnostics?.temporallyExcludedCount ?? 0) > 0
  )
    return "Há material com vigência ou confirmação pendente; ele não confirma uma regra aplicável nesta consulta.";
  return "Não encontrei essa informação nos documentos do condomínio. A resposta abaixo é uma orientação geral.";
}

const safeGuidanceFallback =
  "Confirme a informação no documento aplicável ou com o responsável competente antes de decidir.";

function documentaryState(
  result: ScopedRetrievalResult | undefined
): AnswerGatewayInput["documentaryState"] {
  if (result === undefined) return "retrieval_unavailable";
  if (result.evidence.length > 0) return "available";
  if ((result.diagnostics?.lowQualityCount ?? 0) > 0) return "quality_below_floor";
  if (
    (result.diagnostics?.pendingValidityCount ?? 0) > 0 ||
    (result.diagnostics?.temporallyExcludedCount ?? 0) > 0
  )
    return "validity_pending";
  return result.candidateCount > 0 ? "no_relevant_excerpt" : "no_candidates";
}

function isUnsupportedLocalAssertion(sentence: string): boolean {
  const plain = sentence.replaceAll("**", "").trim().normalize("NFC");
  return (
    /^(?:(?:segundo|conforme)\s+)?(?:o|a|este|esta|esse|essa)\s+(?:condom[íi]nio|conven[çc][aã]o|regimento|ata|documentos?|legisla[çc][aã]o)\b.{0,180}\b(?:n[aã]o\s+)?(?:possui|tem|prev[eê]|permite|pro[íi]be|determina|estabelece|informa|registra)\b/iu.test(
      plain
    ) ||
    /^(?:n[aã]o\s+(?:h[aá]|existe)|inexiste|nenhum[a]?)\b.{0,180}\b(?:regra|protocolo|decis[aã]o|delibera[çc][aã]o|previs[aã]o|autoriza[çc][aã]o|proibi[çc][aã]o|obriga[çc][aã]o|registro)\b/iu.test(
      plain
    )
  );
}

function safeAbstainedGuidance(answer: string, profile?: ConfirmedProfileContext): string {
  const sentences = literalSentences(answer).map((span) => span.text);
  const safeSentences = sentences
    .map((sentence) => sentence.trim())
    .filter(
      (sentence) =>
        sentence.length > 0 &&
        (!isUnsupportedLocalAssertion(sentence) ||
          supportsRegisteredUnitsStatement(sentence, profile))
    );
  return (
    (safeSentences.length === sentences.length ? answer.trim() : safeSentences.join(" ").trim()) ||
    safeGuidanceFallback
  );
}

function isRelevantServiceDegradation(point: string): boolean {
  return /(?:extraída localmente dos documentos porque o provedor de IA está temporariamente indisponível|modo documental local)/iu.test(
    point
  );
}

function keepOnlyEssentialGuidance(
  payload: AnswerPayload,
  assessment: RiskAssessment
): AnswerPayload {
  const specialistReason = payload.specialist.reason?.trim() ?? "";
  const distinctAttentionPoints = payload.attentionPoints.filter(
    (point) => point.trim() !== "" && point.trim() !== specialistReason
  );
  const degradationNotice = distinctAttentionPoints.find(isRelevantServiceDegradation);
  const requiresExceptionalGuidance =
    payload.answerMode !== "grounded" ||
    assessment.riskClass === "high" ||
    payload.specialist.required;
  const attentionPoints = requiresExceptionalGuidance
    ? distinctAttentionPoints.slice(0, 1)
    : degradationNotice === undefined
      ? []
      : [degradationNotice];

  return freezeAnswerPayload({
    ...payload,
    attentionPoints: Object.freeze(attentionPoints),
    suggestedNextStep: requiresExceptionalGuidance ? payload.suggestedNextStep : null
  });
}

function policyTelemetry(
  question: string,
  assessment: RiskAssessment,
  status: "skipped" | "failed",
  routingReason: string,
  errorCode: string | null
): AnswerGatewayTelemetry {
  return Object.freeze({
    providerKey: "local",
    modelKey: "answer-policy",
    modelVersion: "1",
    promptVersion: answerPromptVersion,
    pipelineVersion: answerPipelineVersion,
    taskType: "grounded_answer" as const,
    riskClass: assessment.riskClass,
    routingReason,
    status,
    inputTokens: 0,
    outputTokens: 0,
    cachedInputTokens: 0,
    latencyMs: 0,
    estimatedCostMicrounits: 0,
    costCurrency: "BRL" as const,
    inputHash: hash(question),
    outputHash: null,
    errorCode
  });
}

function toInvocation(
  id: string,
  context: AuthorizedCondominiumContext,
  questionId: string,
  retrievalRunId: string,
  answerId: string,
  telemetry: AnswerGatewayTelemetry,
  evidenceIds: readonly string[],
  createdAt: Date
): ModelInvocationRecord {
  return Object.freeze({
    id,
    condominiumId: context.condominiumId,
    questionId,
    retrievalRunId,
    answerId,
    taskType: telemetry.taskType,
    riskClass: telemetry.riskClass,
    providerKey: telemetry.providerKey,
    modelKey: telemetry.modelKey,
    modelVersion: telemetry.modelVersion,
    promptVersion: telemetry.promptVersion,
    pipelineVersion: telemetry.pipelineVersion,
    routingReason: telemetry.routingReason,
    status: telemetry.status,
    inputTokens: telemetry.inputTokens,
    outputTokens: telemetry.outputTokens,
    cachedInputTokens: telemetry.cachedInputTokens,
    latencyMs: telemetry.latencyMs,
    estimatedCostMicrounits: telemetry.estimatedCostMicrounits,
    costCurrency: telemetry.costCurrency,
    inputHash: telemetry.inputHash,
    outputHash: telemetry.outputHash,
    errorCode: telemetry.errorCode,
    evidenceIds: Object.freeze([...evidenceIds]),
    createdAt
  });
}

function makeClaims(
  idFactory: () => string,
  claims: readonly NonNullable<GeneratedAnswer["claims"]>[number][] | undefined,
  payload: AnswerPayload
): readonly AnswerClaim[] {
  if (claims !== undefined && claims.length > 0) {
    return Object.freeze(
      claims.map((claim) =>
        Object.freeze({
          id: idFactory(),
          statement: claim.statement,
          claimType: claim.claimType,
          evidenceRequired: claim.evidenceRequired,
          citationEvidenceIds: Object.freeze([...claim.citationEvidenceIds])
        })
      )
    );
  }

  if (payload.answerMode === "grounded" || payload.answerMode === "conflict") {
    return Object.freeze([
      Object.freeze({
        id: idFactory(),
        statement: payload.answer,
        claimType: payload.citations.every((citation) => citation.sourceScope === "legislation")
          ? ("interpretation" as const)
          : ("condominium_fact" as const),
        evidenceRequired: true,
        citationEvidenceIds: Object.freeze(payload.citations.map((citation) => citation.evidenceId))
      })
    ]);
  }

  return Object.freeze([]);
}

function auditEvent(
  id: string,
  context: AuthorizedCondominiumContext,
  eventType: AuditEventRecord["eventType"],
  subjectType: AuditEventRecord["subjectType"],
  subjectId: string,
  requestId: string,
  correlationId: string,
  metadata: AuditEventRecord["metadata"],
  createdAt: Date
): AuditEventRecord {
  return Object.freeze({
    id,
    condominiumId: context.condominiumId,
    actorType: "user" as const,
    actorUserId: context.userId,
    eventType,
    subjectType,
    subjectId,
    requestId,
    correlationId,
    metadata: Object.freeze({ ...metadata }),
    createdAt
  });
}

function createQuestion(
  id: string,
  context: AuthorizedCondominiumContext,
  question: string,
  requestId: string,
  idempotencyKey: string,
  createdAt: Date,
  chatId?: string
): QuestionRecord {
  return Object.freeze({
    id,
    ...(chatId === undefined ? {} : { chatId }),
    condominiumId: context.condominiumId,
    userId: context.userId,
    content: question,
    language: "pt-BR",
    idempotencyKey,
    requestId,
    createdAt
  });
}

function createRetrievalRun(
  id: string,
  context: AuthorizedCondominiumContext,
  questionId: string,
  question: string,
  riskClass: RiskClass,
  result: ScopedRetrievalResult | undefined,
  startedAt: Date,
  finishedAt: Date,
  failureCode: string | null
): RetrievalRunRecord {
  return Object.freeze({
    id,
    condominiumId: context.condominiumId,
    questionId,
    status: failureCode === null ? ("completed" as const) : ("failed" as const),
    pipelineVersion: result?.pipelineVersion ?? "hybrid-v1",
    riskClass,
    queryHash: result?.queryHash ?? hash(question),
    startedAt,
    finishedAt,
    candidateCount: result?.candidateCount ?? 0,
    selectedCount: result?.selectedCount ?? 0,
    failureCode
  });
}

function createAnswerRecord(
  context: AuthorizedCondominiumContext,
  answerId: string,
  questionId: string,
  requestId: string,
  assessment: RiskAssessment,
  payload: AnswerPayload,
  claims: readonly AnswerClaim[],
  createdAt: Date
): AnswerRecord {
  return Object.freeze({
    ...payload,
    answerId,
    questionId,
    condominiumId: context.condominiumId,
    userId: context.userId,
    riskClass: assessment.riskClass,
    schemaVersion: answerSchemaVersion,
    promptVersion: answerPromptVersion,
    pipelineVersion: answerPipelineVersion,
    validationStatus: payload.answerMode === "failed" ? ("failed" as const) : ("passed" as const),
    claims: Object.freeze([...claims]),
    createdAt,
    requestId
  });
}

export function createAnswerUseCase(options: AnswerUseCaseOptions): AnswerUseCase {
  const now = options.now ?? (() => new Date());
  const idFactory = options.idFactory ?? randomUUID;
  const maximumOutputTokens = options.maximumOutputTokens ?? defaultMaximumOutputTokens;
  const maximumCostMicrounits = options.maximumCostMicrounits ?? defaultMaximumCostMicrounits;
  const fallbackChatGuard = createLocalChatTurnGuard();
  const memoryEnabled =
    options.chatMemoryEnabled ??
    process.env.ALVITRA_CHAT_MEMORY_ENABLED?.trim().toLowerCase() !== "false";

  async function generateGeneralGuidance(
    attempts: AnswerAttempt[],
    question: string,
    assessment: RiskAssessment,
    limitation: string,
    routingReason: string,
    includeDocumentaryLimitation = true,
    preferredName?: string,
    protectedLiterals: readonly string[] = [],
    conversationContext?: ConversationContext,
    state: AnswerGatewayInput["documentaryState"] = "no_candidates",
    revalidateConversation?: () => Promise<void>,
    onWebResearchStarted?: () => void,
    webResearchQuestion?: string
  ): Promise<
    Readonly<{
      payload: AnswerPayload;
      telemetry: AnswerGatewayTelemetry;
      claims: readonly AnswerClaim[];
      validationFailureCode: string | null;
    }>
  > {
    conversationContext = withoutDocumentaryReplay(conversationContext);
    const gatewayInput = {
      question: webResearchQuestion ?? question,
      task: "grounded_answer" as const,
      riskClass: assessment.riskClass,
      evidence: Object.freeze([]),
      ...(conversationContext === undefined ? {} : { conversationContext }),
      documentaryState: state,
      budget: Object.freeze({ maximumOutputTokens, maximumCostMicrounits })
    };
    let feedback: AnswerGatewayInput["validationFeedback"];
    let missingCoverageKeys: readonly string[] = [];
    for (let index = 0; index < 2; index++) {
      const generationInput: AnswerGatewayInput =
        feedback === undefined
          ? gatewayInput
          : withValidationContract(gatewayInput, feedback, missingCoverageKeys);
      let generated;
      try {
        await revalidateConversation?.();
        const gateway =
          options.demoWebResearchGateway && webResearchQuestion !== undefined
            ? options.demoWebResearchGateway
            : options.gateway;
        if (gateway === options.demoWebResearchGateway) onWebResearchStarted?.();
        generated = await gateway.generate(generationInput);
      } catch (error) {
        attempts.push({
          telemetry:
            gatewayErrorTelemetry(error) ??
            policyTelemetry(
              question,
              assessment,
              "failed",
              "orientação geral sem telemetria concluída",
              gatewayErrorCode(error, "general_guidance_unavailable")
            ),
          evidenceIds: []
        });
        throw error;
      }
      const attempt: AnswerAttempt = {
        telemetry: Object.freeze({
          ...generated.telemetry,
          routingReason: generated.telemetry.routingReason.startsWith(`${routingPolicyVersion}:`)
            ? generated.telemetry.routingReason
            : routingReason
        }),
        evidenceIds: []
      };
      attempts.push(attempt);
      try {
        if (containsProtectedDocumentLiteral(generated.output, protectedLiterals))
          throw new ProtectedDocumentOutputError(
            "A resposta foi bloqueada por segurança documental."
          );
        const enforced = enforceHighRiskSpecialist(
          addressGeneratedAnswer(generated.output, preferredName),
          assessment
        );
        if (enforced.answerMode !== expectedMode(gatewayInput.task, true))
          throw new InvalidAnswerValidationError(
            "O gateway retornou um modo incompatível para orientação geral.",
            "mode_incompatible"
          );
        const validated = validateGeneratedAnswer(enforced, gatewayInput.evidence);
        const safeAnswer =
          includeDocumentaryLimitation || conversationContext?.confirmedProfile !== undefined
            ? safeAbstainedGuidance(
                validated.answer,
                isRegisteredProfileQuestion(question)
                  ? conversationContext?.confirmedProfile
                  : undefined
              )
            : validated.answer;
        validateTaskCoverage(generationInput, { ...validated, answer: safeAnswer });
        const attentionPoints = includeDocumentaryLimitation
          ? Object.freeze([
              limitation,
              ...validated.attentionPoints.filter((point) => point !== limitation).slice(0, 1)
            ])
          : Object.freeze([]);
        return Object.freeze({
          payload: freezeAnswerPayload({
            answer: safeAnswer,
            answerMode: "abstained",
            citations: Object.freeze([]),
            attentionPoints,
            suggestedNextStep: includeDocumentaryLimitation ? validated.suggestedNextStep : null,
            specialist: validated.specialist
          }),
          telemetry: attempt.telemetry,
          claims: makeClaims(idFactory, validated.claims, validated),
          validationFailureCode: feedback ?? null
        });
      } catch (error) {
        attempt.telemetry = Object.freeze({
          ...attempt.telemetry,
          status: "failed",
          errorCode: gatewayErrorCode(error, "general_guidance_unavailable"),
          ...(error instanceof ProtectedDocumentOutputError ? { outputHash: null } : {})
        });
        if (index === 0 && error instanceof InvalidAnswerValidationError) {
          feedback = error.code;
          missingCoverageKeys = error.missingCoverageKeys;
          continue;
        }
        throw error;
      }
    }
    throw new InvalidAnswerValidationError("Não foi possível validar a orientação geral.");
  }

  async function askUnlocked(
    context: AuthorizedCondominiumContext,
    input: AskQuestionInput
  ): Promise<AnswerRecord> {
    if (input.chatId !== undefined && !chatIdPattern.test(input.chatId))
      throw new Error("O identificador da conversa é inválido.");
    const { question, requestId, idempotencyKey, preferredName } = validateQuestion(input);
    const persistedIdempotencyKey = hash(
      `${context.condominiumId}|${context.userId}|${idempotencyKey}|${question}${input.chatId === undefined ? "" : `|chat:${input.chatId}`}`
    );
    const existingAnswer = await options.persistence.findAnswerByIdempotencyKey(
      context,
      persistedIdempotencyKey
    );
    if (existingAnswer !== undefined) {
      await input.revalidateConversation?.();
      return existingAnswer;
    }
    let webResearchQuestion: string | undefined;
    if (options.demoWebResearchGateway !== undefined) {
      if (publicWebResearchPlan(question)) webResearchQuestion = question;
      else if (memoryEnabled && input.chatId && isBareWebResearchRequest(question)) {
        await input.revalidateConversation?.();
        try {
          const normal = await options.persistence.listConversationHistory(context, 1, {
            chatId: input.chatId
          });
          const auxiliary = (await input.readAuxiliaryHistory?.()) ?? [];
          const history = [...normal, ...auxiliary].sort(
            (a, b) =>
              a.createdAt.getTime() - b.createdAt.getTime() ||
              a.questionId.localeCompare(b.questionId)
          );
          // Valida tenant, usuário e chat antes de interpretar o último pedido localmente.
          buildConversationContext(context, input.chatId, history);
          const previousQuestion = history.at(-1)?.question;
          if (previousQuestion && publicWebResearchPlan(previousQuestion))
            webResearchQuestion = previousQuestion;
        } catch {
          throw new ConversationMemoryError();
        }
      }
    }
    const webRequest = webResearchQuestion !== undefined;
    let conversationContext: ConversationContext | undefined;
    let recentHistory: readonly ConversationHistoryEntry[] = [];
    let previousTurnTime = -1;
    if (!webRequest && memoryEnabled && input.chatId !== undefined) {
      await input.revalidateConversation?.();
      try {
        const normal = await options.persistence.listConversationHistory(context, 9, {
          chatId: input.chatId
        });
        const auxiliary = (await input.readAuxiliaryHistory?.()) ?? [];
        const recent = [...normal, ...auxiliary]
          .sort(
            (a, b) =>
              a.createdAt.getTime() - b.createdAt.getTime() ||
              a.questionId.localeCompare(b.questionId)
          )
          .slice(-9);
        conversationContext = buildConversationContext(context, input.chatId, recent);
        recentHistory = recent;
        previousTurnTime = Math.max(-1, ...recent.map((entry) => entry.createdAt.getTime()));
      } catch {
        throw new ConversationMemoryError();
      }
    }
    conversationContext = webRequest
      ? undefined
      : withConfirmedProfile(context, input.registeredProfile, conversationContext);
    const profileQuestion =
      conversationContext?.confirmedProfile !== undefined && isRegisteredProfileQuestion(question);
    const searchQuestion = contextualQuestion(question, conversationContext, recentHistory);
    const referenceInstant = now();
    const startedAt = new Date(Math.max(referenceInstant.getTime(), previousTurnTime + 1));
    const questionId = idFactory();
    const retrievalRunId = idFactory();
    const answerId = idFactory();
    const questionRecord = createQuestion(
      questionId,
      context,
      question,
      requestId,
      persistedIdempotencyKey,
      startedAt,
      input.chatId
    );
    const currentAssessment = classifyQuestionRisk(webResearchQuestion ?? question);
    const contextualAssessment = classifyQuestionRisk(
      contextualRiskQuestion(question, conversationContext, recentHistory)
    );
    const assessment =
      !isDocumentUploadNotice(question) &&
      ["low", "medium", "high"].indexOf(contextualAssessment.riskClass) >
        ["low", "medium", "high"].indexOf(currentAssessment.riskClass)
        ? contextualAssessment
        : currentAssessment;
    const protectedContextRequest = isProtectedContextRequest(question);
    const simpleConversation = webRequest || isSimpleConversationMessage(question);
    let retrievalResult: ScopedRetrievalResult | undefined;
    let blockedDocumentInstructions = false;
    let protectedDocumentLiterals: readonly string[] = [];
    let retrievalFailureCode: string | null = null;
    let retrievalFinishedAt = startedAt;
    let documentCalculation: IntegralSumSummary | undefined;
    let integralLimitation: string | undefined;

    if (protectedContextRequest || simpleConversation || profileQuestion) {
      retrievalResult = emptyRetrievalResult(question);
      retrievalFinishedAt = now();
    } else {
      try {
        retrievalResult = await options.retriever.search(context, {
          query: searchQuestion,
          asOf: referenceDate(question, referenceInstant)
        });
        if (retrievalResult.evidence.some((item) => item.condominiumId !== context.condominiumId))
          throw new Error("Escopo de evidência inválido.");
        const screening = screenDocumentInstructions(retrievalResult.evidence, searchQuestion);
        blockedDocumentInstructions = screening.blockedEvidenceIds.length > 0;
        protectedDocumentLiterals = screening.protectedLiterals;
        if (blockedDocumentInstructions) {
          retrievalResult = Object.freeze({
            ...retrievalResult,
            candidateCount: screening.safeEvidence.length,
            selectedCount: screening.safeEvidence.length,
            evidence: screening.safeEvidence,
            sufficiency: evaluateEvidenceSufficiency(screening.safeEvidence)
          });
        }
        retrievalFinishedAt = now();
      } catch {
        retrievalFailureCode = "retrieval_unavailable";
        retrievalFinishedAt = now();
      }
    }

    if (
      !protectedContextRequest &&
      isIntegralSumQuestion(question) &&
      input.readIntegralDocuments
    ) {
      try {
        await input.revalidateConversation?.();
        const computed = computeIntegralSum(context, question, await input.readIntegralDocuments());
        documentCalculation = computed.summary;
        retrievalResult = {
          ...emptyRetrievalResult(question),
          candidateCount: computed.summary.rowsVerified,
          selectedCount: computed.evidence.length,
          evidence: computed.evidence,
          sufficiency: evaluateEvidenceSufficiency(computed.evidence)
        };
      } catch {
        retrievalResult = emptyRetrievalResult(question);
        integralLimitation =
          "A conferência integral do material disponível não foi concluída. Não há total confirmado; é preciso esclarecer a origem ou corrigir a página/linha pendente, não presumir arquivo ausente.";
        conversationContext = {
          ...(conversationContext ?? {
            policyVersion: "recent-chat-v1",
            turns: [],
            bytes: 0,
            omittedAnswers: 0,
            omittedTurns: 0
          }),
          documentCoverageLimitation: integralLimitation
        };
      }
    }

    if (input.chatId && recentHistory.length) {
      conversationContext = withConfirmedProfile(
        context,
        input.registeredProfile,
        buildConversationContext(
          context,
          input.chatId,
          recentHistory,
          retrievalResult?.evidence ?? []
        )
      );
    }
    retrievalFinishedAt = now();
    const financialEvidenceMissing = requiresFinancialEvidence(
      question,
      retrievalResult?.evidence ?? []
    );
    const requiredEvidenceMissing =
      financialEvidenceMissing ||
      requiresCollectiveAgreementEvidence(question, retrievalResult?.evidence ?? []) ||
      isGeneralLaborExplanation(question, retrievalResult?.evidence ?? []);
    conversationContext = webRequest
      ? undefined
      : withAnswerTaskFocus(
          question,
          conversationContext,
          retrievalResult?.evidence ?? [],
          referenceInstant.toISOString().slice(0, 10),
          acceptedDocumentaryOffer(
            question,
            conversationContext,
            recentHistory,
            retrievalResult?.evidence ?? []
          )
        );
    if (documentCalculation)
      conversationContext = {
        ...(conversationContext ?? {
          policyVersion: "recent-chat-v1",
          turns: [],
          bytes: 0,
          omittedAnswers: 0,
          omittedTurns: 0
        }),
        documentCalculation
      };
    if (integralLimitation && conversationContext)
      conversationContext = {
        ...conversationContext,
        documentCoverageLimitation: integralLimitation
      };
    let payload: AnswerPayload;
    let telemetry: AnswerGatewayTelemetry;
    let claims: readonly AnswerClaim[];
    let invocationEvidenceIds: readonly string[] = Object.freeze([]);
    const attempts: AnswerAttempt[] = [];
    let validationFailureCode: string | null = null;
    await input.revalidateConversation?.();

    if (retrievalResult === undefined) {
      try {
        const guidance = await generateGeneralGuidance(
          attempts,
          question,
          assessment,
          documentaryLimitation(retrievalResult, retrievalFailureCode),
          "busca documental indisponível; orientação geral sem fontes",
          true,
          preferredName,
          protectedDocumentLiterals,
          conversationContext,
          documentaryState(retrievalResult),
          input.revalidateConversation
        );
        payload = guidance.payload;
        telemetry = guidance.telemetry;
        claims = guidance.claims;
        validationFailureCode = guidance.validationFailureCode;
      } catch (error) {
        if (error instanceof InvalidAnswerValidationError) validationFailureCode = error.code;
        payload = failedPayload("A busca documental está indisponível no momento.", assessment);
        telemetry = policyTelemetry(
          question,
          assessment,
          "failed",
          "busca e orientação geral indisponíveis",
          gatewayErrorCode(error, retrievalFailureCode ?? "general_guidance_unavailable")
        );
        claims = Object.freeze([]);
      }
    } else if (blockedDocumentInstructions && retrievalResult.evidence.length === 0) {
      payload = documentInstructionAbstainedPayload(assessment);
      telemetry = policyTelemetry(
        question,
        assessment,
        "skipped",
        "instruções documentais não confiáveis bloqueadas antes da geração",
        null
      );
      claims = Object.freeze([]);
    } else if (retrievalResult.sufficiency.status !== "sufficient" || requiredEvidenceMissing) {
      if (protectedContextRequest) {
        payload = abstainedPayload(retrievalResult, assessment, question);
        telemetry = policyTelemetry(
          question,
          assessment,
          "skipped",
          "solicitação de contexto protegido; geração bloqueada",
          null
        );
        claims = Object.freeze([]);
      } else {
        try {
          const guidance = await generateGeneralGuidance(
            attempts,
            question,
            assessment,
            documentaryLimitation(retrievalResult, null),
            simpleConversation
              ? "conversa simples sem busca documental"
              : "evidência insuficiente; orientação geral sem fontes",
            !simpleConversation && !profileQuestion,
            preferredName,
            protectedDocumentLiterals,
            conversationContext,
            requiredEvidenceMissing && retrievalResult.evidence.length > 0
              ? "no_relevant_excerpt"
              : documentaryState(retrievalResult),
            input.revalidateConversation,
            input.onWebResearchStarted,
            webResearchQuestion
          );
          payload = guidance.payload;
          telemetry = guidance.telemetry;
          claims = guidance.claims;
          validationFailureCode = guidance.validationFailureCode;
        } catch (error: unknown) {
          if (error instanceof InvalidAnswerValidationError) validationFailureCode = error.code;
          const reason = "Não foi possível gerar uma orientação segura nesta tentativa.";
          payload = failedPayload(reason, assessment);
          telemetry = policyTelemetry(
            question,
            assessment,
            "failed",
            "orientação geral indisponível",
            gatewayErrorCode(error, "general_guidance_unavailable")
          );
          claims = Object.freeze([]);
        }
      }
    } else {
      const conflict = detectDocumentConflict(searchQuestion, retrievalResult.evidence);
      const task = expectedTask(conflict !== null, assessment);
      const gatewayInput = withGenerationContract(
        {
          question,
          task,
          riskClass: assessment.riskClass,
          evidence: retrievalResult.evidence,
          ...(conversationContext === undefined ? {} : { conversationContext }),
          documentaryState: "available" as const,
          budget: Object.freeze({ maximumOutputTokens, maximumCostMicrounits })
        } as const,
        conflict?.evidence.map((source) => source.id)
      );
      invocationEvidenceIds = Object.freeze(retrievalResult.evidence.map((item) => item.id));

      try {
        const generateValidated = async (generationInput: AnswerGatewayInput) => {
          await input.revalidateConversation?.();
          let generated;
          try {
            generated = await options.gateway.generate(generationInput);
          } catch (error) {
            attempts.push({
              telemetry:
                gatewayErrorTelemetry(error) ??
                policyTelemetry(
                  question,
                  assessment,
                  "failed",
                  "invocação sem telemetria concluída",
                  gatewayErrorCode(error, "answer_gateway_unavailable")
                ),
              evidenceIds: invocationEvidenceIds
            });
            throw error;
          }
          const attempt = { telemetry: generated.telemetry, evidenceIds: invocationEvidenceIds };
          attempts.push(attempt);
          try {
            if (containsProtectedDocumentLiteral(generated.output, protectedDocumentLiterals)) {
              throw new ProtectedDocumentOutputError(
                "A resposta foi bloqueada por segurança documental."
              );
            }
            const enforced = enforceHighRiskSpecialist(
              addressGeneratedAnswer(generated.output, preferredName),
              assessment
            );
            if (!acceptsGeneratedMode(task, enforced.answerMode)) {
              throw new InvalidAnswerValidationError(
                "O gateway retornou um modo incompatível com a decisão de roteamento.",
                "mode_incompatible"
              );
            }
            const validated = validateGeneratedAnswer(
              enforced,
              retrievalResult.evidence,
              documentCalculation
            );
            if (documentCalculation) {
              try {
                assertIntegralAnswer(documentCalculation, enforced);
              } catch {
                throw new InvalidAnswerValidationError(
                  "Total ou cobertura integral incompatível com o recibo.",
                  "task_coverage_missing"
                );
              }
            }
            if (hasContradictoryTemporalOrder(question, validated))
              throw new InvalidAnswerValidationError(
                "Veredito contradiz a ordem das datas citadas.",
                "temporal_order_mismatch"
              );
            const safeValidated =
              validated.answerMode === "abstained"
                ? { ...validated, answer: safeAbstainedGuidance(validated.answer) }
                : validated;
            if (
              conflict?.kind === "record_note" &&
              !coversRecordNoteConflict(searchQuestion, retrievalResult.evidence, safeValidated)
            )
              throw new InvalidAnswerValidationError(
                "A divergência exige ID, ambos os valores, pendência e fontes.",
                "task_coverage_missing",
                ["financial", "reconciliation"]
              );
            validateTaskCoverage(generationInput, safeValidated);
            if (
              conflict !== null &&
              conflict.evidence.some(
                (source) =>
                  !validated.citations.some((citation) => citation.evidenceId === source.id)
              )
            )
              throw new InvalidAnswerValidationError(
                "As fontes conflitantes precisam ser exibidas.",
                "conflict_sources_missing"
              );
            return { generated, validated: safeValidated };
          } catch (error) {
            if (error instanceof InvalidAnswerValidationError) {
              validationFailureCode = error.code;
              attempt.telemetry = Object.freeze({
                ...attempt.telemetry,
                status: "failed",
                errorCode: error.code
              });
            }
            throw error;
          }
        };
        let result;
        try {
          result = await generateValidated(gatewayInput);
        } catch (error) {
          if (!(error instanceof InvalidAnswerValidationError)) throw error;
          result = await generateValidated(
            withValidationContract(
              {
                ...gatewayInput,
                documentaryState: "answer_not_validated"
              },
              error.code,
              error.missingCoverageKeys,
              conflict?.evidence.map((source) => source.id)
            )
          );
        }
        const { generated, validated } = result;
        payload =
          validated.answerMode === "abstained"
            ? freezeAnswerPayload({
                answer: safeAbstainedGuidance(validated.answer),
                answerMode: "abstained",
                citations: Object.freeze([]),
                attentionPoints: Object.freeze([
                  documentaryLimitation(retrievalResult, null),
                  ...validated.attentionPoints
                ]),
                suggestedNextStep: validated.suggestedNextStep,
                specialist: validated.specialist
              })
            : freezeAnswerPayload(validated);
        claims = makeClaims(idFactory, validated.claims, validated);
        telemetry = generated.telemetry;
      } catch (error: unknown) {
        if (error instanceof InvalidAnswerValidationError) {
          validationFailureCode = error.code;
          try {
            options.onValidationFailure?.(
              Object.freeze({
                code: answerValidationCodes.includes(error.code) ? error.code : "unknown",
                attemptCount: Math.max(1, Math.min(2, attempts.length))
              })
            );
          } catch {
            // O observador não recebe texto privado nem pode impedir a resposta segura.
          }
          payload = freezeAnswerPayload({
            answer:
              "Tenho os documentos disponíveis, mas não consegui concluir esta resposta. Tente novamente.",
            answerMode: "abstained",
            citations: [],
            attentionPoints: [],
            suggestedNextStep: null,
            specialist: specialistFromAssessment(assessment)
          });
          if (conflict !== null) {
            const local = conflictFallback(
              conflict,
              assessment,
              retrievalResult.evidence,
              "Não consegui concluir a explicação gerada; confira a divergência nas fontes citadas.",
              searchQuestion
            );
            payload = freezeAnswerPayload(local);
          }
          telemetry = policyTelemetry(
            question,
            assessment,
            "skipped",
            "resposta documental não validada; fontes preservadas",
            error.code
          );
          claims = makeClaims(
            idFactory,
            payload.citations.length === 0
              ? []
              : [
                  {
                    statement: payload.answer,
                    claimType: "interpretation",
                    evidenceRequired: true,
                    citationEvidenceIds: payload.citations.map((citation) => citation.evidenceId)
                  }
                ],
            payload
          );
        } else {
          const failureReason =
            error instanceof AnswerGatewayUnavailableError
              ? error.message
              : "Não foi possível concluir a geração com segurança.";
          payload = failedPayload(failureReason, assessment);
          telemetry = policyTelemetry(
            question,
            assessment,
            "failed",
            "geração documental falhou",
            gatewayErrorCode(
              error,
              error instanceof AnswerGatewayUnavailableError
                ? "answer_gateway_unavailable"
                : "answer_generation_failed"
            )
          );
          claims = Object.freeze([]);
          if (conflict !== null && error instanceof AnswerGatewayUnavailableError) {
            const local = conflictFallback(
              conflict,
              assessment,
              retrievalResult.evidence,
              "O serviço de geração está indisponível; esta indicação foi preservada localmente.",
              searchQuestion
            );
            payload = freezeAnswerPayload(local);
            claims = makeClaims(idFactory, local.claims, payload);
            telemetry = Object.freeze({
              ...telemetry,
              taskType: "document_conflict",
              status: "skipped"
            });
          }
        }
        if (error instanceof ProtectedDocumentOutputError) {
          for (const attempt of attempts)
            attempt.telemetry = Object.freeze({
              ...attempt.telemetry,
              status: "failed",
              outputHash: null,
              errorCode: "protected_document_literal"
            });
        }
      }
    }

    payload = keepOnlyEssentialGuidance(payload, assessment);
    const addressed = addressPayload(payload, claims, preferredName);
    payload = addressed.payload;
    claims = addressed.claims;
    if (containsProtectedDocumentLiteral({ payload, claims }, protectedDocumentLiterals)) {
      payload = failedPayload(
        "Não foi possível concluir a resposta com segurança. Confira a fonte original.",
        assessment
      );
      claims = Object.freeze([]);
      telemetry = Object.freeze({
        ...telemetry,
        status: "failed",
        outputHash: null,
        errorCode: "protected_document_literal"
      });
    }
    const finishedAt = new Date(Math.max(startedAt.getTime(), now().getTime()));
    if (documentCalculation && input.readIntegralDocuments) {
      await input.revalidateConversation?.();
      try {
        const checked = computeIntegralSum(context, question, await input.readIntegralDocuments());
        if (checked.summary.receiptSha256 !== documentCalculation.receiptSha256)
          throw new Error("Origem alterada.");
      } catch {
        payload = failedPayload(
          "Os documentos mudaram durante a conferência. O total não foi confirmado; refaça a consulta.",
          assessment
        );
        claims = [];
        telemetry = { ...telemetry, status: "failed", errorCode: "document_sources_changed" };
      }
    }
    const answer = createAnswerRecord(
      context,
      answerId,
      questionId,
      requestId,
      assessment,
      payload,
      claims,
      finishedAt
    );
    const retrieval = createRetrievalRun(
      retrievalRunId,
      context,
      questionId,
      question,
      assessment.riskClass,
      retrievalResult,
      startedAt,
      new Date(Math.max(startedAt.getTime(), retrievalFinishedAt.getTime())),
      retrievalFailureCode
    );
    const evidence =
      retrievalResult === undefined
        ? Object.freeze([])
        : retrievalEvidenceRecordFromResult(retrievalRunId, retrievalResult);
    const invocation = toInvocation(
      idFactory(),
      context,
      questionId,
      retrievalRunId,
      answerId,
      telemetry,
      invocationEvidenceIds,
      finishedAt
    );
    const answerEventType = answer.answerMode === "failed" ? "answer_failed" : "answer_created";
    const auditEvents = Object.freeze([
      auditEvent(
        idFactory(),
        context,
        "question_created",
        "question",
        questionId,
        requestId,
        answerId,
        Object.freeze({ language: "pt-BR" }),
        startedAt
      ),
      auditEvent(
        idFactory(),
        context,
        answerEventType,
        "answer",
        answerId,
        requestId,
        questionId,
        Object.freeze({
          answerMode: answer.answerMode,
          citationCount: answer.citations.length,
          candidateCount: retrieval.candidateCount,
          selectedCount: retrieval.selectedCount,
          riskClass: answer.riskClass,
          pipelineVersion: answer.pipelineVersion,
          validationFailureCode,
          integralComputationReceipt: documentCalculation
            ? JSON.stringify(integralReceipt(documentCalculation))
            : null,
          providerAccountingReceipts: JSON.stringify(
            attempts.flatMap(({ telemetry: attempt }) =>
              attempt.usageAccounting
                ? [
                    {
                      providerKey: attempt.providerKey,
                      modelKey: attempt.modelKey,
                      status: attempt.status,
                      inputHash: attempt.inputHash,
                      outputHash: attempt.outputHash,
                      latencyMs: attempt.latencyMs,
                      errorCode: attempt.errorCode,
                      accounting: attempt.usageAccounting
                    }
                  ]
                : []
            )
          ),
          memoryPolicyVersion: "recent-chat-v1",
          documentaryReplayLedger:
            answer.validationStatus === "passed" &&
            answer.answerMode === "grounded" &&
            telemetry.status === "completed" &&
            !blockedDocumentInstructions &&
            !documentCalculation
              ? JSON.stringify(documentaryReplayLedger(retrievalResult?.evidence ?? []) ?? null)
              : null,
          memoryReplaySafe:
            !webRequest &&
            answer.answerMode === "abstained" &&
            telemetry.status === "completed" &&
            (retrievalResult?.evidence.length ?? 0) === 0 &&
            !blockedDocumentInstructions &&
            claims.every((claim) => !claim.evidenceRequired),
          memoryTurns: conversationContext?.turns.length ?? 0,
          memoryBytes: conversationContext?.bytes ?? 0,
          memoryOmittedAnswers: conversationContext?.omittedAnswers ?? 0,
          memoryOmittedTurns: conversationContext?.omittedTurns ?? 0,
          promptVersion: answer.promptVersion
        }),
        finishedAt
      )
    ]);
    const interaction: PersistedInteraction = Object.freeze({
      question: questionRecord,
      retrieval,
      evidence,
      answer,
      claims,
      invocations: Object.freeze([
        ...attempts.map((attempt) =>
          toInvocation(
            idFactory(),
            context,
            questionId,
            retrievalRunId,
            answerId,
            attempt.telemetry,
            attempt.evidenceIds,
            finishedAt
          )
        ),
        ...(attempts.at(-1)?.telemetry === telemetry ? [] : [invocation])
      ]),
      auditEvents
    });

    await input.revalidateConversation?.();
    try {
      await options.persistence.saveInteraction(interaction);
      return answer;
    } catch (error: unknown) {
      const concurrentAnswer = await options.persistence.findAnswerByIdempotencyKey(
        context,
        persistedIdempotencyKey
      );
      if (concurrentAnswer !== undefined) {
        await input.revalidateConversation?.();
        return concurrentAnswer;
      }
      throw error;
    }
  }

  return Object.freeze({
    async findValidatedAnswer(context: AuthorizedCondominiumContext, answerId: string) {
      if (!context.permissions.includes("document:read")) return undefined;
      const answer = await options.persistence.findAnswer(context, answerId);
      return answer?.validationStatus === "passed" &&
        answer.userId === context.userId &&
        answer.condominiumId === context.condominiumId
        ? answer
        : undefined;
    },
    async ask(context, input): Promise<AnswerRecord> {
      if (input.chatId !== undefined && !chatIdPattern.test(input.chatId))
        throw new Error("O identificador da conversa é inválido.");
      if (input.chatId === undefined) return askUnlocked(context, input);
      if (input.revalidateConversation === undefined) throw new ConversationMemoryError();
      await input.revalidateConversation();
      let release;
      try {
        release = await (options.persistence.acquireChatTurn ?? fallbackChatGuard)(
          context,
          input.chatId
        );
      } catch {
        throw new ConversationMemoryError();
      }
      if (release === undefined) throw new ConversationMemoryError(409);
      try {
        return await askUnlocked(context, input);
      } finally {
        await release();
      }
    },

    async submitFeedback(context, input): Promise<FeedbackRecord> {
      validateFeedbackInput(input);
      const record = await options.persistence.createFeedback(context, input);
      if (record === undefined) {
        throw new Error("A resposta não foi encontrada no condomínio autorizado.");
      }
      return record;
    },

    async listConversationHistory(context, limit = 50, filter) {
      return options.persistence.listConversationHistory(context, limit, filter);
    }
  });
}
