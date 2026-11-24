import type { AnswerGateway, AnswerGatewayInput } from "./answer-gateway.js";
import { contextualQuestion } from "./conversation-memory.js";
import { attachGatewayErrorTelemetry, gatewayErrorTelemetry } from "./answer-gateway.js";

export const routingPolicyVersion = "luna-sol-v1";
export type RoutedModel = "gpt-6-luna" | "gpt-6.1-sol";
export const routedReasoningEfforts = Object.freeze({
  "gpt-6-luna": "high",
  "gpt-6.1-sol": "low"
} as const);

export function answerRoutingMode(
  value: string | undefined,
  settingName: string
): "hybrid" | "single" {
  const mode = value?.trim() || "hybrid";
  if (mode !== "hybrid" && mode !== "single")
    throw new Error(`${settingName} deve ser single ou hybrid.`);
  return mode;
}

export type RoutingReason =
  | "basic_request"
  | "factual_integrity"
  | "high_risk"
  | "document_conflict"
  | "pending_version"
  | "financial_analysis"
  | "cross_source_synthesis";

export function selectAnswerModel(input: AnswerGatewayInput): Readonly<{
  model: RoutedModel;
  reason: RoutingReason;
}> {
  const complex = (reason: RoutingReason) => ({ model: "gpt-6.1-sol" as const, reason });
  if (input.riskClass === "high") return complex("high_risk");
  if (input.task === "document_conflict") return complex("document_conflict");
  if (
    /(?:troque|altere|apague|mude|invente|finja|retire|oculte).{0,90}(?:saldo|valor|mil|resumo|ressalva|cl[aá]usula|document|data|cita[cç][aã]o|pend[eê]ncia)/iu.test(
      input.question
    )
  )
    return complex("factual_integrity");
  if (input.evidence.some((item) => ["pending", "disputed"].includes(item.validityStatus)))
    return complex("pending_version");
  const question = contextualQuestion(input.question, input.conversationContext)
    .normalize("NFD")
    .replaceAll(/[\u0300-\u036f]/gu, "")
    .toLowerCase();
  if (
    /balancete|saldo|receita|despesa|financeir|contas|disponibilidade/u.test(question) &&
    /analis|compare|comparac|evolucao|variacao|percentual|reconcili|concili|raio.x|fechamento|ordinari|reserve?as?/u.test(
      question
    )
  )
    return complex("financial_analysis");
  const sources = new Set(input.evidence.map((item) => item.documentVersionId));
  if (
    sources.size > 1 &&
    /compare|cruz|relacion|conclu|resum|sintet|sintese|tabela|prioridad|checklist|plano|pendenc|revisao|dois|ambos/u.test(
      question
    )
  )
    return complex("cross_source_synthesis");
  return Object.freeze({ model: "gpt-6-luna", reason: "basic_request" });
}

/** A política seleciona uma única geração. Erros permanecem na fronteira do chamador. */
export function createRoutedAnswerGateway(
  gateways: Readonly<Record<RoutedModel, AnswerGateway>>
): AnswerGateway {
  return Object.freeze({
    async generate(input: AnswerGatewayInput) {
      const decision = selectAnswerModel(input);
      let result;
      try {
        result = await gateways[decision.model].generate(input);
      } catch (error) {
        const telemetry = gatewayErrorTelemetry(error);
        if (telemetry && error instanceof Error)
          attachGatewayErrorTelemetry(
            error,
            Object.freeze({
              ...telemetry,
              routingReason: `${routingPolicyVersion}:${decision.reason}`
            })
          );
        throw error;
      }
      if (result.telemetry.modelKey !== decision.model)
        throw new Error("Modelo efetivo divergente da política de roteamento.");
      return Object.freeze({
        ...result,
        telemetry: Object.freeze({
          ...result.telemetry,
          routingReason: `${routingPolicyVersion}:${decision.reason}`
        })
      });
    }
  });
}
