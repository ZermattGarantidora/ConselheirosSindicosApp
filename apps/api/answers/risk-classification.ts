import type { RiskClass, SpecialistType } from "./answer-contract.js";

export type RiskAssessment = Readonly<{
  riskClass: RiskClass;
  specialistType: SpecialistType | null;
  reason: string | null;
}>;

type RiskRule = Readonly<{
  pattern: RegExp;
  specialistType: SpecialistType;
  reason: string;
}>;

function normalize(value: string): string {
  return value
    .normalize("NFD")
    .replaceAll(/[\u0300-\u036f]/gu, "")
    .toLocaleLowerCase("pt-BR");
}

const highRiskRules: readonly RiskRule[] = Object.freeze([
  {
    pattern: /parede|estrutura|fachada|obra estrutural|intervencao.*seguranca/u,
    specialistType: "engenheiro",
    reason: "A decisão pode afetar estrutura, segurança ou responsabilidade técnica."
  },
  {
    pattern: /multa|ameaca.*process|processar|disputa juridica|cobranca contestada/u,
    specialistType: "advogado",
    reason: "O tema pode gerar disputa ou responsabilidade jurídica."
  },
  {
    pattern: /tribut|imposto|obrigacao contabil|questao contab/u,
    specialistType: "contador",
    reason: "O tema pode envolver obrigação tributária ou contábil."
  },
  {
    pattern: /fraude|desvio|suspeita criminal/u,
    specialistType: "advogado",
    reason: "Há indício de fraude ou responsabilidade relevante."
  },
  {
    pattern: /sinistro|apolice|cobertura securitaria/u,
    specialistType: "seguradora",
    reason: "A análise pode alterar a interpretação de cobertura ou sinistro."
  },
  {
    pattern: /dados pessoais|lgpd|protecao de dados|privacidade/u,
    specialistType: "especialista em proteção de dados",
    reason: "A análise pode envolver dados pessoais e obrigações de proteção de dados."
  }
]);

export function classifyQuestionRisk(question: string): RiskAssessment {
  const normalized = normalize(question.trim());
  if (normalized.length === 0) {
    throw new Error("A pergunta não pode ser vazia.");
  }

  const highRiskRule = highRiskRules.find((rule) => rule.pattern.test(normalized));
  if (highRiskRule !== undefined) {
    return Object.freeze({
      riskClass: "high" as const,
      specialistType: highRiskRule.specialistType,
      reason: highRiskRule.reason
    });
  }

  if (/contrato|rescisao|vigencia|reajuste|multa/u.test(normalized)) {
    return Object.freeze({
      riskClass: "medium" as const,
      specialistType: null,
      reason: "A resposta depende da leitura cuidadosa da versão documental aplicável."
    });
  }

  return Object.freeze({ riskClass: "low" as const, specialistType: null, reason: null });
}
