import type { CondominiumId } from "../core/condominium-scope.js";
import type { AuthorizedCondominiumContext } from "../identity/authorized-condominium-context.js";
import type { RetrievalEvidence, ScopedRetrievalResult } from "../retrieval/retrieval-contract.js";

export const answerPromptVersion = "answer-evidence-v1" as const;

export type AnswerMode = "grounded" | "abstained" | "conflict" | "failed";

export type SpecialistRecommendation = Readonly<{
  required: boolean;
  type: string | null;
  reason: string | null;
}>;

export type AnswerCitation = Readonly<{
  documentId: string;
  documentVersionId: string;
  title: string;
  page: number;
  excerpt: string;
}>;

export type AnswerClaim = Readonly<{
  statement: string;
  citationIndexes: readonly number[];
}>;

export type GroundedAnswer = Readonly<{
  answer: string;
  answerMode: AnswerMode;
  citations: readonly AnswerCitation[];
  claims: readonly AnswerClaim[];
  attentionPoints: readonly string[];
  suggestedNextStep: string | null;
  specialist: SpecialistRecommendation;
}>;

export type AiTaskClass = "economical" | "intermediate" | "advanced";

export type AiGatewayInput = Readonly<{
  taskClass: AiTaskClass;
  promptVersion: typeof answerPromptVersion;
  schemaVersion: "grounded-answer-v1";
  question: string;
  condominiumId: CondominiumId;
  evidence: readonly Readonly<{
    id: string;
    documentId: string;
    documentVersionId: string;
    page: number;
    content: string;
  }>[];
}>;

export type AiGatewayOutput = Readonly<{
  mode: "grounded" | "conflict";
  citations: readonly Readonly<{ evidenceId: string; excerpt: string }>[];
  claims: readonly Readonly<{
    statement: string;
    citationEvidenceIds: readonly string[];
  }>[];
}>;

/**
 * Adaptadores de modelo só recebem evidências já autorizadas. O conteúdo de
 * cada evidência é dado não confiável: o adaptador não pode tratá-lo como
 * instrução ou ampliar a sua autorização.
 */
export interface AiGateway {
  generate(input: AiGatewayInput): Promise<AiGatewayOutput>;
}

export type AnswerService = Readonly<{
  answer(
    context: AuthorizedCondominiumContext,
    input: Readonly<{ question: string; retrieval: ScopedRetrievalResult }>
  ): Promise<GroundedAnswer>;
}>;

const noSpecialist = Object.freeze({ required: false, type: null, reason: null });

function classifySpecialist(question: string): SpecialistRecommendation {
  const normalized = question
    .normalize("NFD")
    .replaceAll(/[\u0300-\u036f]/gu, "")
    .toLowerCase();

  if (
    /\b(processo|disputa|contest\w*|acao judicial|responsabilidade civil|interpretacao legal)\b/u.test(
      normalized
    )
  ) {
    return Object.freeze({
      required: true,
      type: "advogado",
      reason: "A pergunta envolve possível disputa ou responsabilidade jurídica."
    });
  }
  if (/\b(obra estrutural|risco estrutural|acidente|seguranca)\b/u.test(normalized)) {
    return Object.freeze({
      required: true,
      type: "engenheiro ou especialista em segurança",
      reason: "A pergunta envolve obra, acidente ou segurança."
    });
  }
  if (/\b(multa controvertida|contrato de alto valor|rescis\w* relevante)\b/u.test(normalized)) {
    return Object.freeze({
      required: true,
      type: "advogado",
      reason: "A pergunta envolve multa controvertida ou contrato relevante."
    });
  }
  if (/\b(tribut|trabalhist)\w*/u.test(normalized)) {
    return Object.freeze({
      required: true,
      type: "contador ou advogado especializado",
      reason: "A pergunta envolve matéria tributária ou trabalhista."
    });
  }
  if (/\b(fraude|desvio)\b/u.test(normalized)) {
    return Object.freeze({
      required: true,
      type: "advogado e contador",
      reason: "A pergunta envolve suspeita de fraude ou desvio."
    });
  }
  if (/\b(sinistro|cobertura securit)\w*/u.test(normalized)) {
    return Object.freeze({
      required: true,
      type: "corretor ou especialista em seguros",
      reason: "A pergunta envolve sinistro ou cobertura securitária."
    });
  }
  if (/\b(lgpd|dados pessoais|protecao de dados)\b/u.test(normalized)) {
    return Object.freeze({
      required: true,
      type: "especialista em proteção de dados",
      reason: "A pergunta envolve proteção de dados pessoais."
    });
  }

  return noSpecialist;
}

function abstainedAnswer(reason: string): GroundedAnswer {
  return Object.freeze({
    answer: "Não há evidência documental suficiente para responder a essa pergunta com segurança.",
    answerMode: "abstained",
    citations: Object.freeze([]),
    claims: Object.freeze([]),
    attentionPoints: Object.freeze([reason]),
    suggestedNextStep: "Envie ou confirme o documento aplicável e sua vigência antes de decidir.",
    specialist: noSpecialist
  });
}

function failedAnswer(): GroundedAnswer {
  return Object.freeze({
    answer: "Não foi possível gerar uma resposta fundamentada com segurança. Tente novamente.",
    answerMode: "failed",
    citations: Object.freeze([]),
    claims: Object.freeze([]),
    attentionPoints: Object.freeze(["A resposta não foi exibida sem validação das evidências."]),
    suggestedNextStep: "Tente novamente ou revise os documentos processados.",
    specialist: noSpecialist
  });
}

function taskClassFor(evidence: readonly RetrievalEvidence[]): AiTaskClass {
  return evidence.length > 1 ? "intermediate" : "economical";
}

function toCitation(
  citation: Readonly<{ evidenceId: string; excerpt: string }>,
  evidenceById: ReadonlyMap<string, RetrievalEvidence>
): AnswerCitation | undefined {
  const evidence = evidenceById.get(citation.evidenceId);
  const excerpt = citation.excerpt.trim();

  if (evidence === undefined || excerpt.length === 0 || !evidence.content.includes(excerpt)) {
    return undefined;
  }

  return Object.freeze({
    documentId: evidence.documentId,
    documentVersionId: evidence.documentVersionId,
    title: evidence.documentTitle,
    page: evidence.pageNumber,
    excerpt
  });
}

function validatedCitations(
  generated: AiGatewayOutput,
  evidence: readonly RetrievalEvidence[]
): readonly AnswerCitation[] | undefined {
  const evidenceById = new Map(evidence.map((item) => [item.id, item]));
  const citations = generated.citations.map((citation) => toCitation(citation, evidenceById));

  if (citations.some((citation) => citation === undefined)) {
    return undefined;
  }

  const verified = citations as AnswerCitation[];
  if (
    verified.length === 0 ||
    (generated.mode === "conflict" &&
      (verified.length < 2 ||
        new Set(verified.map((citation) => citation.documentVersionId)).size < 2))
  ) {
    return undefined;
  }

  return Object.freeze(verified);
}

function hasValidGatewaySchema(output: AiGatewayOutput): boolean {
  return (
    (output.mode === "grounded" || output.mode === "conflict") &&
    Array.isArray(output.citations) &&
    output.citations.every(
      (citation) => typeof citation.evidenceId === "string" && typeof citation.excerpt === "string"
    ) &&
    Array.isArray(output.claims) &&
    output.claims.every(
      (claim) =>
        typeof claim.statement === "string" &&
        Array.isArray(claim.citationEvidenceIds) &&
        claim.citationEvidenceIds.every((evidenceId: unknown) => typeof evidenceId === "string")
    )
  );
}

function validatedClaims(
  generated: AiGatewayOutput,
  evidence: readonly RetrievalEvidence[]
): readonly AnswerClaim[] | undefined {
  const evidenceById = new Map(evidence.map((item) => [item.id, item]));
  const citationIndexesByEvidenceId = new Map<string, number[]>();
  generated.citations.forEach((citation, index) => {
    const indexes = citationIndexesByEvidenceId.get(citation.evidenceId) ?? [];
    indexes.push(index);
    citationIndexesByEvidenceId.set(citation.evidenceId, indexes);
  });

  const claims = generated.claims.map((claim) => {
    const statement = claim.statement.trim();
    const citationIndexes = claim.citationEvidenceIds.flatMap(
      (evidenceId) => citationIndexesByEvidenceId.get(evidenceId) ?? []
    );
    const supportingEvidence = claim.citationEvidenceIds
      .map((evidenceId) => evidenceById.get(evidenceId))
      .filter((item): item is RetrievalEvidence => item !== undefined);

    if (
      statement.length === 0 ||
      citationIndexes.length === 0 ||
      supportingEvidence.length !== claim.citationEvidenceIds.length ||
      !supportingEvidence.some((item) => item.content.includes(statement))
    ) {
      return undefined;
    }

    return Object.freeze({ statement, citationIndexes: Object.freeze(citationIndexes) });
  });

  if (claims.length === 0 || claims.some((claim) => claim === undefined)) {
    return undefined;
  }

  return Object.freeze(claims as AnswerClaim[]);
}

function hasOnlyContextEvidence(
  condominiumId: CondominiumId,
  evidence: readonly RetrievalEvidence[]
): boolean {
  return evidence.every((item) => item.condominiumId === condominiumId);
}

export function createAnswerService(gateway: AiGateway): AnswerService {
  return Object.freeze({
    async answer(context, input) {
      if (input.question.trim().length === 0) {
        throw new Error("A pergunta não pode ser vazia.");
      }

      const { retrieval } = input;
      if (!hasOnlyContextEvidence(context.condominiumId, retrieval.evidence)) {
        return failedAnswer();
      }

      if (retrieval.sufficiency.status !== "sufficient") {
        return abstainedAnswer(
          retrieval.sufficiency.status === "weak"
            ? "Os trechos encontrados são incompletos ou pouco relevantes."
            : "Nenhum trecho autorizado respondeu diretamente à pergunta."
        );
      }

      try {
        const generated = await gateway.generate({
          taskClass: taskClassFor(retrieval.evidence),
          promptVersion: answerPromptVersion,
          schemaVersion: "grounded-answer-v1",
          question: input.question,
          condominiumId: context.condominiumId,
          evidence: retrieval.evidence.map((item) =>
            Object.freeze({
              id: item.id,
              documentId: item.documentId,
              documentVersionId: item.documentVersionId,
              page: item.pageNumber,
              content: item.content
            })
          )
        });
        const citations = hasValidGatewaySchema(generated)
          ? validatedCitations(generated, retrieval.evidence)
          : undefined;
        const claims =
          citations === undefined ? undefined : validatedClaims(generated, retrieval.evidence);
        if (citations === undefined || claims === undefined) {
          return failedAnswer();
        }

        return Object.freeze({
          answer: claims.map((claim) => claim.statement).join("\n\n"),
          answerMode: generated.mode,
          citations,
          claims,
          attentionPoints: Object.freeze([]),
          suggestedNextStep: null,
          specialist: classifySpecialist(input.question)
        });
      } catch {
        return failedAnswer();
      }
    }
  });
}
