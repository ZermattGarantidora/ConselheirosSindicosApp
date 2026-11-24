import type { AnswerPayload, GeneratedAnswer } from "./answer-contract.js";
import type { RiskAssessment } from "./risk-classification.js";
import { InvalidAnswerValidationError, validateSpecialist } from "./citation-validator.js";

export function specialistFromAssessment(assessment: RiskAssessment): AnswerPayload["specialist"] {
  return Object.freeze({
    required: assessment.riskClass === "high",
    type: assessment.riskClass === "high" ? assessment.specialistType : null,
    reason: assessment.riskClass === "high" ? assessment.reason : null
  });
}

/** A recomendação de revisão humana é política do produto; não confirma fatos documentais. */
export function enforceHighRiskSpecialist(
  generated: GeneratedAnswer,
  assessment: RiskAssessment
): GeneratedAnswer {
  const specialist = validateSpecialist(generated?.specialist);
  if (assessment.riskClass !== "high" || specialist.required) return generated;
  if (!Array.isArray(generated.attentionPoints))
    throw new InvalidAnswerValidationError("Os pontos de atenção da resposta são inválidos.");
  return Object.freeze({
    ...generated,
    attentionPoints: Object.freeze([
      ...generated.attentionPoints,
      assessment.reason ?? "O caso exige validação de um especialista."
    ]),
    specialist: specialistFromAssessment(assessment)
  });
}
