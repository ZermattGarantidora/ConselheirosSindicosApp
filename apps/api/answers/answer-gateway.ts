import { createHash } from "node:crypto";

import type { RetrievalEvidence } from "../retrieval/retrieval-contract.js";
import {
  answerPipelineVersion,
  type GeneratedAnswer,
  type GeneratedCitation,
  type RiskClass,
  type SpecialistType
} from "./answer-contract.js";
import { answerPromptVersion, buildAnswerPrompt, type AnswerPromptTask } from "./prompt-catalog.js";

export type AnswerGatewayInput = Readonly<{
  question: string;
  task: AnswerPromptTask;
  riskClass: RiskClass;
  evidence: readonly RetrievalEvidence[];
  budget: Readonly<{
    maximumOutputTokens: number;
    maximumCostMicrounits: number;
  }>;
}>;

export type AnswerGatewayTelemetry = Readonly<{
  providerKey: string;
  modelKey: string;
  modelVersion: string;
  promptVersion: string;
  pipelineVersion: string;
  taskType: AnswerPromptTask;
  riskClass: RiskClass;
  routingReason: string;
  status: "completed" | "failed" | "skipped";
  inputTokens: number;
  outputTokens: number;
  cachedInputTokens: number;
  latencyMs: number;
  estimatedCostMicrounits: number;
  costCurrency: "BRL";
  inputHash: string;
  outputHash: string | null;
  errorCode: string | null;
}>;

export type AnswerGatewayResult = Readonly<{
  output: GeneratedAnswer;
  telemetry: AnswerGatewayTelemetry;
}>;

export interface AnswerGateway {
  generate(input: AnswerGatewayInput): Promise<AnswerGatewayResult>;
}

export class AnswerGatewayUnavailableError extends Error {
  public constructor(message = "O gateway de respostas está indisponível.") {
    super(message);
    this.name = "AnswerGatewayUnavailableError";
  }
}

export function createFallbackAnswerGateway(
  primary: AnswerGateway,
  fallback: AnswerGateway
): AnswerGateway {
  return Object.freeze({
    async generate(input: AnswerGatewayInput): Promise<AnswerGatewayResult> {
      try {
        return await primary.generate(input);
      } catch (error: unknown) {
        if (!(error instanceof AnswerGatewayUnavailableError)) {
          throw error;
        }

        const result = await fallback.generate(input);
        return Object.freeze({
          output: Object.freeze({
            ...result.output,
            attentionPoints: Object.freeze([
              ...result.output.attentionPoints,
              "A resposta foi extraída localmente dos documentos porque o provedor de IA está temporariamente indisponível."
            ])
          }),
          telemetry: Object.freeze({
            ...result.telemetry,
            routingReason: "fallback documental local após indisponibilidade do provedor primário"
          })
        });
      }
    }
  });
}

const modelKey = "deterministic-synthetic-answer";
const modelVersion = "1";

function hash(value: string): string {
  return createHash("sha256").update(value).digest("hex");
}

function tokenEstimate(value: string): number {
  return Math.max(1, value.trim().split(/\s+/u).filter(Boolean).length);
}

function isInstructionLike(sentence: string): boolean {
  return /ignore\s+as\s+regras|releve\s+documentos|revele\s+documentos|revelar\s+documentos|conteúdo\s+malicioso|instruções?\s+do\s+sistema/iu.test(
    sentence
  );
}

function sentenceCandidates(content: string): readonly string[] {
  const sentences = content.match(/[^.!?]+(?:[.!?]+|$)/gu) ?? [content];
  return sentences.map((sentence) => sentence.trim()).filter((sentence) => sentence.length > 0);
}

const excerptStopWords = new Set([
  "qual",
  "quais",
  "quem",
  "quantas",
  "quantos",
  "quando",
  "como",
  "para",
  "pela",
  "pelo",
  "das",
  "dos",
  "uma",
  "foram",
  "deve",
  "sobre"
]);

function relevantTerms(question: string): readonly string[] {
  return Object.freeze(
    question
      .toLocaleLowerCase("pt-BR")
      .split(/[^\p{L}\p{N}]+/gu)
      .filter((term) => term.length >= 3 && !excerptStopWords.has(term))
  );
}

function termMatchesContent(term: string, content: string): boolean {
  if (content.includes(term)) return true;
  const prefix = term.slice(0, Math.min(7, term.length));
  return (
    prefix.length >= 6 && content.split(/[^\p{L}\p{N}]+/gu).some((word) => word.startsWith(prefix))
  );
}

function evidenceQuestionScore(question: string, evidence: RetrievalEvidence): number {
  const normalized = evidence.content.toLocaleLowerCase("pt-BR");
  const terms = relevantTerms(question);
  let score = terms.filter((term) => termMatchesContent(term, normalized)).length;
  if (
    /nome.*condom[íi]nio/iu.test(question) &&
    /uso do nome\s+condom[íi]nio|denomina(?:ç|c)[aã]o|identifica(?:ç|c)[aã]o administrativa/iu.test(
      evidence.content
    )
  ) {
    score += 5;
  }
  if (
    /(?:quem.*(?:sub)?s[íi]ndic|per[íi]odo.*mandato.*s[íi]ndic)/iu.test(question) &&
    /(?:sub)?s[íi]ndic[ao]?\s+[\p{L}\s]+\d{2}\/\d{2}\/\d{4}\s+a\s+\d{2}\/\d{2}\/\d{4}/iu.test(
      evidence.content
    )
  ) {
    score += 5;
  }
  return score;
}

function compactExcerpt(candidate: string, question: string): string {
  const maximumLength = 650;
  if (candidate.length <= maximumLength) return candidate;

  const normalized = candidate.toLocaleLowerCase("pt-BR");
  const positions = relevantTerms(question)
    .map((term) => normalized.indexOf(term))
    .filter((position) => position >= 0)
    .sort((left, right) => left - right);
  const anchor = positions[0] ?? 0;
  let start = Math.max(0, anchor - 120);
  let end = Math.min(candidate.length, start + maximumLength);
  if (end - start < maximumLength) start = Math.max(0, end - maximumLength);
  while (start > 0 && !/\s/u.test(candidate[start - 1] ?? "")) start -= 1;
  while (end < candidate.length && !/\s/u.test(candidate[end] ?? "")) end += 1;
  return candidate.slice(start, end).trim();
}

function safeExcerpt(
  evidence: RetrievalEvidence,
  question: string
): Readonly<{
  text: string;
  startOffset: number;
  endOffset: number;
}> | null {
  const sentences = sentenceCandidates(evidence.content);
  const safeSentences = sentences.filter((sentence) => !isInstructionLike(sentence));
  const candidate = [...safeSentences].sort(
    (left, right) =>
      relevantTerms(question).filter((term) =>
        termMatchesContent(term, right.toLocaleLowerCase("pt-BR"))
      ).length -
        relevantTerms(question).filter((term) =>
          termMatchesContent(term, left.toLocaleLowerCase("pt-BR"))
        ).length || left.length - right.length
  )[0];
  if (candidate === undefined || candidate.length === 0) {
    return null;
  }
  const excerpt = compactExcerpt(candidate, question);
  const utf16Offset = evidence.content.indexOf(excerpt);
  const localStart =
    utf16Offset < 0 ? 0 : Array.from(evidence.content.slice(0, utf16Offset)).length;
  const startOffset = evidence.startOffset + localStart;
  return Object.freeze({
    text: excerpt,
    startOffset,
    endOffset: startOffset + Array.from(excerpt).length
  });
}

function citationFor(evidence: RetrievalEvidence, question: string): GeneratedCitation | null {
  const excerpt = safeExcerpt(evidence, question);
  if (excerpt === null) {
    return null;
  }
  return Object.freeze({
    evidenceId: evidence.id,
    documentId: evidence.documentId,
    documentVersionId: evidence.documentVersionId,
    title: evidence.documentTitle,
    page: evidence.pageNumber,
    excerpt: excerpt.text,
    startOffset: excerpt.startOffset,
    endOffset: excerpt.endOffset
  });
}

function specialistForRisk(
  riskClass: RiskClass,
  specialist: SpecialistType | null
): Readonly<{
  required: boolean;
  type: SpecialistType | null;
  reason: string | null;
}> {
  if (riskClass !== "high" || specialist === null) {
    return Object.freeze({ required: false, type: null, reason: null });
  }

  const reasons: Readonly<Record<SpecialistType, string>> = {
    advogado: "O tema pode gerar disputa ou responsabilidade jurídica.",
    contador: "O tema pode envolver obrigação tributária ou contábil.",
    engenheiro: "A decisão pode afetar estrutura, segurança ou responsabilidade técnica.",
    "responsável técnico":
      "A decisão pode afetar estrutura, segurança ou responsabilidade técnica.",
    seguradora: "A análise pode alterar a interpretação de cobertura ou sinistro.",
    "especialista em proteção de dados":
      "A análise pode envolver dados pessoais e obrigações de proteção de dados."
  };

  return Object.freeze({ required: true, type: specialist, reason: reasons[specialist] });
}

function inferSpecialistFromEvidence(
  riskClass: RiskClass,
  question: string
): SpecialistType | null {
  if (riskClass !== "high") {
    return null;
  }

  if (/parede|estrutura|fachada|\bobra\b|segurança|intervenção/iu.test(question)) {
    return "engenheiro";
  }
  if (/multa|process|cobrança|disputa|rescisão|contrato/iu.test(question)) {
    return "advogado";
  }
  if (/tribut|imposto|contáb/iu.test(question)) {
    return "contador";
  }
  if (/sinistro|apólice|cobertura/iu.test(question)) {
    return "seguradora";
  }
  if (/lgpd|dados pessoais|privacidade/iu.test(question)) {
    return "especialista em proteção de dados";
  }

  return "advogado";
}

function conflictAnswer(
  question: string,
  evidence: readonly RetrievalEvidence[],
  riskClass: RiskClass
): GeneratedAnswer {
  const convention = evidence.find(
    (item) => item.documentType === "convention" && /noventa|90/iu.test(item.content)
  );
  const rules = evidence.find(
    (item) => item.documentType === "internal_rules" && /trinta|30/iu.test(item.content)
  );
  const citations = Object.freeze(
    (convention === undefined && rules === undefined ? evidence : [convention, rules])
      .filter((item): item is RetrievalEvidence => item !== undefined)
      .map((item) => citationFor(item, question))
      .filter((citation): citation is GeneratedCitation => citation !== null)
  );
  const specialist = specialistForRisk(riskClass, inferSpecialistFromEvidence(riskClass, question));

  return Object.freeze({
    answer:
      "Há um conflito documental: a convenção vigente informa prazo mínimo de noventa dias, " +
      "enquanto o regimento informa trinta dias. Os documentos precisam ser conciliados ou validados; " +
      "não é seguro escolher uma regra silenciosamente.",
    answerMode: "conflict" as const,
    citations,
    attentionPoints: Object.freeze([
      "As fontes recuperadas apresentam orientações incompatíveis.",
      ...(specialist.required ? [specialist.reason ?? "Valide o caso com um especialista."] : [])
    ]),
    suggestedNextStep:
      "Confirme a relação entre a convenção e o regimento antes de aplicar o prazo.",
    specialist,
    claims: Object.freeze([
      Object.freeze({
        statement: "As fontes recuperadas apresentam prazos incompatíveis.",
        claimType: "interpretation" as const,
        evidenceRequired: true,
        citationEvidenceIds: Object.freeze(citations.map((citation) => citation.evidenceId))
      })
    ])
  });
}

function groundedAnswer(
  question: string,
  evidence: readonly RetrievalEvidence[],
  riskClass: RiskClass
): GeneratedAnswer {
  const selected = [...evidence]
    .sort(
      (left, right) =>
        evidenceQuestionScore(question, right) - evidenceQuestionScore(question, left) ||
        right.rerankScore - left.rerankScore
    )
    .slice(0, 1);
  const citations = Object.freeze(
    selected
      .map((item) => citationFor(item, question))
      .filter((citation): citation is GeneratedCitation => citation !== null)
  );
  const excerpts = citations.map((citation) => citation.excerpt).join(" ");
  const specialist = specialistForRisk(riskClass, inferSpecialistFromEvidence(riskClass, question));
  const structuralRisk = /parede|estrutura|fachada|obra estrutural|intervenção/iu.test(question);
  const historicalYear = /\b(20\d{2})\b/u.exec(question)?.[1];
  const historicalNote =
    historicalYear === undefined ? "" : ` A resposta se refere a ${historicalYear}.`;
  const answer = structuralRisk
    ? `${excerpts} A documentação técnica e as aprovações aplicáveis devem ser obtidas antes de qualquer intervenção; a citação não representa autorização definitiva para executar a obra.${historicalNote}`
    : `${excerpts}${specialist.required ? " A informação documental não substitui a validação do especialista para o caso concreto." : ""}${historicalNote}`;

  return Object.freeze({
    answer,
    answerMode: "grounded" as const,
    citations,
    attentionPoints: Object.freeze(
      specialist.required ? [specialist.reason ?? "O caso exige validação profissional."] : []
    ),
    suggestedNextStep: specialist.required
      ? "Separe os documentos citados e valide o caso concreto com o especialista indicado."
      : "Confira as citações e registre o próximo passo aplicável ao condomínio.",
    specialist,
    claims: Object.freeze([
      Object.freeze({
        statement: answer,
        claimType: "condominium_fact" as const,
        evidenceRequired: true,
        citationEvidenceIds: Object.freeze(citations.map((citation) => citation.evidenceId))
      })
    ])
  });
}

export function createLocalSyntheticAnswerGateway(
  now: () => number = () => Date.now()
): AnswerGateway {
  return Object.freeze({
    async generate(input: AnswerGatewayInput): Promise<AnswerGatewayResult> {
      if (input.evidence.length === 0) {
        const answer = Object.freeze({
          answer:
            "Olá! Sou a Cora, sua conselheira documental. Posso ajudar a consultar regras, atas e contratos quando você escolher um assunto.",
          answerMode: "abstained" as const,
          citations: Object.freeze([]),
          attentionPoints: Object.freeze([]),
          suggestedNextStep: "Pergunte sobre uma regra, ata ou contrato do condomínio.",
          specialist: Object.freeze({ required: false, type: null, reason: null }),
          claims: Object.freeze([])
        });
        const prompt = buildAnswerPrompt(input);
        const serializedOutput = JSON.stringify(answer);
        return Object.freeze({
          output: answer,
          telemetry: Object.freeze({
            providerKey: "local",
            modelKey,
            modelVersion,
            promptVersion: answerPromptVersion,
            pipelineVersion: answerPipelineVersion,
            taskType: input.task,
            riskClass: input.riskClass,
            routingReason: "cumprimento sem alegação documental",
            status: "completed" as const,
            inputTokens: tokenEstimate(prompt),
            outputTokens: tokenEstimate(serializedOutput),
            cachedInputTokens: 0,
            latencyMs: 0,
            estimatedCostMicrounits: 0,
            costCurrency: "BRL" as const,
            inputHash: hash(prompt),
            outputHash: hash(serializedOutput),
            errorCode: null
          })
        });
      }

      const prompt = buildAnswerPrompt({
        question: input.question,
        task: input.task,
        riskClass: input.riskClass,
        evidence: input.evidence
      });
      const startedAt = now();
      const output =
        input.task === "document_conflict"
          ? conflictAnswer(input.question, input.evidence, input.riskClass)
          : groundedAnswer(input.question, input.evidence, input.riskClass);
      if (
        (output.answerMode === "grounded" || output.answerMode === "conflict") &&
        output.citations.length === 0
      ) {
        throw new AnswerGatewayUnavailableError(
          "Não há trecho seguro para sustentar a resposta gerada."
        );
      }
      const finishedAt = now();
      const serializedOutput = JSON.stringify(output);

      return Object.freeze({
        output,
        telemetry: Object.freeze({
          providerKey: "local",
          modelKey,
          modelVersion,
          promptVersion: answerPromptVersion,
          pipelineVersion: answerPipelineVersion,
          taskType: input.task,
          riskClass: input.riskClass,
          routingReason:
            input.task === "document_conflict"
              ? "conflito documental detectado deterministicamente"
              : input.riskClass === "high"
                ? "tema de alto risco encaminhado para resposta com ressalva"
                : "pergunta sintética respondida pelo caminho econômico local",
          status: "completed" as const,
          inputTokens: tokenEstimate(prompt),
          outputTokens: tokenEstimate(serializedOutput),
          cachedInputTokens: 0,
          latencyMs: Math.max(0, finishedAt - startedAt),
          estimatedCostMicrounits: 0,
          costCurrency: "BRL" as const,
          inputHash: hash(prompt),
          outputHash: hash(serializedOutput),
          errorCode: null
        })
      });
    }
  });
}
