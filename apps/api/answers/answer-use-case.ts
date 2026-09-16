import { createHash, randomUUID } from "node:crypto";

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
import { type AnswerGateway, type AnswerGatewayTelemetry } from "./answer-gateway.js";
import { detectDocumentConflict } from "./conflict-detection.js";
import { validateGeneratedAnswer } from "./citation-validator.js";
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

export type AnswerRetriever = Readonly<{
  search(
    context: AuthorizedCondominiumContext,
    input: RetrievalSearchInput
  ): Promise<ScopedRetrievalResult>;
}>;

export type AskQuestionInput = Readonly<{
  question: string;
  requestId: string;
  idempotencyKey?: string;
}>;

export type AnswerUseCase = Readonly<{
  ask(context: AuthorizedCondominiumContext, input: AskQuestionInput): Promise<AnswerRecord>;
  listConversationHistory(
    context: AuthorizedCondominiumContext,
    limit?: number
  ): Promise<readonly ConversationHistoryEntry[]>;
  submitFeedback(
    context: AuthorizedCondominiumContext,
    input: SubmitFeedbackInput
  ): Promise<FeedbackRecord>;
}>;

export type AnswerUseCaseOptions = Readonly<{
  retriever: AnswerRetriever;
  gateway: AnswerGateway;
  persistence: AnswerPersistence;
  now?: () => Date;
  idFactory?: () => string;
  maximumOutputTokens?: number;
  maximumCostMicrounits?: number;
}>;

const defaultMaximumOutputTokens = 800;
const defaultMaximumCostMicrounits = 100_000;

function hash(value: string): string {
  return createHash("sha256").update(value).digest("hex");
}

function validateQuestion(input: AskQuestionInput): Readonly<{
  question: string;
  requestId: string;
  idempotencyKey: string;
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
  return Object.freeze({ question, requestId, idempotencyKey });
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

function specialistFromAssessment(assessment: RiskAssessment): AnswerPayload["specialist"] {
  return Object.freeze({
    required: assessment.riskClass === "high",
    type: assessment.riskClass === "high" ? assessment.specialistType : null,
    reason: assessment.riskClass === "high" ? assessment.reason : null
  });
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
  const lowQuality = result.candidateCount > 0 && result.evidence.length === 0;
  const attentionPoints = lowQuality
    ? [
        "O reconhecimento do documento é incerto ou os trechos recuperados não atingiram o piso de qualidade.",
        "Confira o original ou corrija o OCR antes de usar a informação."
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

function isProtectedContextRequest(question: string): boolean {
  return /frase-canário|código interno|outro condomínio|ignore\s+as\s+permissões|reveal?\s+document/iu.test(
    question
  );
}

function isDocumentaryQuestion(question: string): boolean {
  return /convenção|convencao|regimento|ata\b|assembleia|contrato|cláusula|clausula|documento|regra|norma|página|pagina|quórum|quorum|vigência|vigencia|prazo|vencimento/iu.test(
    question
  );
}

function isConversationalMessage(question: string): boolean {
  const normalized = question.trim();
  return (
    normalized.length > 0 &&
    normalized.length <= 1_200 &&
    !isDocumentaryQuestion(normalized) &&
    !isProtectedContextRequest(normalized)
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

function enforceHighRiskSpecialist(
  generated: GeneratedAnswer,
  assessment: RiskAssessment
): GeneratedAnswer {
  if (assessment.riskClass !== "high" || generated.specialist.required) {
    return generated;
  }

  return Object.freeze({
    ...generated,
    attentionPoints: Object.freeze([
      ...generated.attentionPoints,
      assessment.reason ?? "O caso exige validação de um especialista."
    ]),
    specialist: specialistFromAssessment(assessment)
  });
}

function expectedTask(conflict: boolean, assessment: RiskAssessment): AnswerPromptTask {
  if (conflict) {
    return "document_conflict";
  }
  return assessment.riskClass === "high" ? "specialist_review" : "grounded_answer";
}

function expectedMode(task: AnswerPromptTask, conversationOnly = false): AnswerMode {
  if (conversationOnly) {
    return "abstained";
  }
  return task === "document_conflict" ? "conflict" : "grounded";
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
        claimType: "condominium_fact" as const,
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
  createdAt: Date
): QuestionRecord {
  return Object.freeze({
    id,
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

  return Object.freeze({
    async ask(context, input): Promise<AnswerRecord> {
      const { question, requestId, idempotencyKey } = validateQuestion(input);
      const persistedIdempotencyKey = hash(
        `${context.condominiumId}|${context.userId}|${idempotencyKey}|${question}`
      );
      const existingAnswer = await options.persistence.findAnswerByIdempotencyKey(
        context,
        persistedIdempotencyKey
      );
      if (existingAnswer !== undefined) {
        return existingAnswer;
      }
      const startedAt = now();
      const questionId = idFactory();
      const retrievalRunId = idFactory();
      const answerId = idFactory();
      const questionRecord = createQuestion(
        questionId,
        context,
        question,
        requestId,
        persistedIdempotencyKey,
        startedAt
      );
      const assessment = classifyQuestionRisk(question);
      let retrievalResult: ScopedRetrievalResult | undefined;
      let retrievalFailureCode: string | null = null;
      let retrievalFinishedAt = startedAt;

      if (isProtectedContextRequest(question)) {
        retrievalResult = emptyRetrievalResult(question);
        retrievalFinishedAt = now();
      } else {
        try {
          retrievalResult = await options.retriever.search(context, {
            query: question,
            asOf: referenceDate(question, startedAt)
          });
          retrievalFinishedAt = now();
        } catch {
          retrievalFailureCode = "retrieval_unavailable";
          retrievalFinishedAt = now();
        }
      }

      let payload: AnswerPayload;
      let telemetry: AnswerGatewayTelemetry;
      let claims: readonly AnswerClaim[];

      if (retrievalResult === undefined) {
        payload = failedPayload("A busca documental está indisponível no momento.", assessment);
        telemetry = policyTelemetry(
          question,
          assessment,
          "failed",
          "retrieval indisponível; geração bloqueada",
          retrievalFailureCode
        );
        claims = Object.freeze([]);
      } else if (retrievalResult.sufficiency.status !== "sufficient") {
        if (!isConversationalMessage(question)) {
          payload = abstainedPayload(retrievalResult, assessment, question);
          telemetry = policyTelemetry(
            question,
            assessment,
            "skipped",
            "evidência insuficiente; geração não executada",
            null
          );
          claims = Object.freeze([]);
        } else {
          const gatewayInput = {
            question,
            task: "grounded_answer" as const,
            riskClass: assessment.riskClass,
            evidence: Object.freeze([]),
            budget: Object.freeze({ maximumOutputTokens, maximumCostMicrounits })
          };
          try {
            const generated = await options.gateway.generate(gatewayInput);
            const enforced = enforceHighRiskSpecialist(generated.output, assessment);
            if (enforced.answerMode !== expectedMode(gatewayInput.task, true)) {
              throw new Error("O gateway retornou um modo incompatível para conversa sem fonte.");
            }
            const validated = validateGeneratedAnswer(enforced, gatewayInput.evidence);
            payload = freezeAnswerPayload(validated);
            claims = makeClaims(idFactory, validated.claims, validated);
            telemetry = generated.telemetry;
          } catch (error: unknown) {
            const reason =
              error instanceof Error ? error.message : "A Gemini não respondeu à solicitação.";
            payload = freezeAnswerPayload({
              answer: "Não consegui obter a orientação da Gemini nesta tentativa.",
              answerMode: "abstained",
              citations: Object.freeze([]),
              attentionPoints: Object.freeze([reason]),
              suggestedNextStep:
                "Confira a conexão da Gemini e tente novamente em alguns instantes.",
              specialist: specialistFromAssessment(assessment)
            });
            telemetry = policyTelemetry(
              question,
              assessment,
              "failed",
              "conversa inicial indisponível; resposta documental preservada",
              "conversation_unavailable"
            );
            claims = Object.freeze([]);
          }
        }
      } else {
        const conflict = detectDocumentConflict(question, retrievalResult.evidence);
        const task = expectedTask(conflict !== null, assessment);
        const gatewayInput = {
          question,
          task,
          riskClass: assessment.riskClass,
          evidence: retrievalResult.evidence,
          budget: Object.freeze({ maximumOutputTokens, maximumCostMicrounits })
        } as const;

        try {
          const generated = await options.gateway.generate(gatewayInput);
          const enforced = enforceHighRiskSpecialist(generated.output, assessment);
          if (enforced.answerMode !== expectedMode(task)) {
            throw new Error("O gateway retornou um modo incompatível com a decisão de roteamento.");
          }
          const validated = validateGeneratedAnswer(enforced, retrievalResult.evidence);
          payload = freezeAnswerPayload(validated);
          claims = makeClaims(idFactory, validated.claims, validated);
          telemetry = generated.telemetry;
        } catch (error: unknown) {
          payload = failedPayload(
            "A resposta gerada não passou pela validação de segurança.",
            assessment
          );
          telemetry = policyTelemetry(
            question,
            assessment,
            "failed",
            "geração ou validação pós-geração falhou",
            error instanceof Error ? "answer_validation_failed" : "answer_generation_failed"
          );
          claims = Object.freeze([]);
        }
      }

      const finishedAt = now();
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
        retrievalFinishedAt,
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
        evidence.map((item) => item.id),
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
        invocations: Object.freeze([invocation]),
        auditEvents
      });

      try {
        await options.persistence.saveInteraction(interaction);
        return answer;
      } catch (error: unknown) {
        const concurrentAnswer = await options.persistence.findAnswerByIdempotencyKey(
          context,
          persistedIdempotencyKey
        );
        if (concurrentAnswer !== undefined) {
          return concurrentAnswer;
        }
        throw error;
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

    async listConversationHistory(context, limit = 50) {
      return options.persistence.listConversationHistory(context, limit);
    }
  });
}
