import type { ConversationReport } from "../conversations/replay.js";
import { measuredConsumption, type ProcessObservation } from "./protocol.js";
import { answerPriceCard } from "../../apps/api/answers/usage-accounting.js";

export type TechnicalDecision = Readonly<{
  caseId: string;
  turn: number;
  responseSha256: string | null;
  outcome: "pass" | "fail";
  reason: string;
}>;

/** Recebe julgamentos humanos/da auditoria técnica; não atribui acerto pelo modo da resposta. */
export function assessCost30(
  report: ConversationReport,
  observations: readonly ProcessObservation[],
  decisions: readonly TechnicalDecision[]
) {
  const turns = report.results.flatMap((result) =>
    result.turns.map((turn) => ({ caseId: result.case.id, ...turn }))
  );
  const keys = new Set<string>();
  for (const decision of decisions) {
    const key = `${decision.caseId}/${decision.turn}`;
    const turn = turns.find((t) => t.caseId === decision.caseId && t.turn === decision.turn);
    if (
      keys.has(key) ||
      !turn ||
      decision.responseSha256 !== turn.responseSha256 ||
      !decision.reason.trim()
    )
      throw new Error("Auditoria duplicada, estranha à rodada ou sem vínculo/justificativa.");
    if (decision.outcome !== "pass" && decision.outcome !== "fail")
      throw new Error("Resultado de auditoria inválido.");
    if (
      decision.outcome === "pass" &&
      (turn.mechanicalErrors.length > 0 || !turn.response || turn.response.answerMode === "failed")
    )
      throw new Error("Falha mecânica ou resposta indisponível não pode ser aprovada.");
    keys.add(key);
  }
  const approved = decisions.filter((d) => d.outcome === "pass");
  const complete = decisions.length === turns.length;
  const approvedScenarios = report.results.filter((c) =>
    c.turns.every((t) => approved.some((d) => d.caseId === c.case.id && d.turn === t.turn))
  ).length;
  const consumption = measuredConsumption("gpt-6.1-sol", observations);
  const cost = consumption.hypotheticalApiUsd;
  const latencies = turns
    .flatMap((t) => (t.latencyMs === null ? [] : [t.latencyMs]))
    .sort((a, b) => a - b);
  const percentile = (p: number) =>
    latencies.length ? latencies[Math.ceil(latencies.length * p) - 1]! : null;
  return {
    authorType: "technical_ai_review",
    specialistApproved: false,
    reviewedTurns: decisions.length,
    populationTurns: turns.length,
    auditComplete: complete,
    approvedTurns: approved.length,
    approvedScenarios,
    scenarios: report.results.length,
    failures: decisions.filter((d) => d.outcome === "fail"),
    consumption: { ...consumption, priceCardDate: answerPriceCard.date },
    estimatedApiUsdPerApprovedTurn:
      complete && consumption.usageComplete && approved.length ? cost / approved.length : null,
    estimatedApiUsdPerApprovedScenario:
      complete && consumption.usageComplete && approvedScenarios ? cost / approvedScenarios : null,
    estimatedApiUsdPerTurn: consumption.usageComplete && turns.length ? cost / turns.length : null,
    latencyMs: {
      mean: latencies.length ? latencies.reduce((a, b) => a + b, 0) / latencies.length : null,
      median: latencies.length
        ? (latencies[Math.floor((latencies.length - 1) / 2)]! +
            latencies[Math.floor(latencies.length / 2)]!) /
          2
        : null,
      p95: percentile(0.95)
    },
    limitation:
      "Auditoria técnica por IA, não revisão especializada; equivalente de API sobre tokens CLI, excluindo escrita de cache não observada. Latência local inclui geração, reparos e validação."
  };
}
