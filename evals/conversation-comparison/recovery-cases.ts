import type { AnswerGatewayInput } from "../../apps/api/answers/answer-gateway.js";
import {
  withAnswerTaskFocus,
  withGenerationContract,
  isGeneralLaborExplanation
} from "../../apps/api/answers/answer-task-context.js";
import { auditTargets } from "./audit-targets.js";
import { conversationCases } from "../conversations/dataset.js";
import type { Condition } from "./protocol.js";
import type { RetrievableChunk } from "../../apps/api/retrieval/retrieval-contract.js";

export const recoveryConditions: readonly Condition[] = Object.freeze([
  { id: "luna-low", model: "gpt-6-luna", memory: true, reasoningEffort: "low" },
  { id: "luna-high", model: "gpt-6-luna", memory: true, reasoningEffort: "high" },
  { id: "sol-low", model: "gpt-6.1-sol", memory: true, reasoningEffort: "low" }
]);
const affected = [
  0, 6, 12, 14, 15, 17, 18, 21, 22, 24, 25, 26, 27, 30, 31, 32, 37, 57, 66, 75
] as const;
const controls = [40, 42, 43, 45, 46, 55, 56, 63, 68, 77] as const;
const paraphrases = [
  "Redija uma mensagem curta com os números corrigidos e o resultado do mês.",
  "Para a unidade que corrigi, qual identificador e principal devem constar? Responda sobre ela.",
  "Conclua quais etapas da contratação têm respaldo documental e quais seguem pendentes.",
  "Liste os próximos passos da administração, distinguindo prazos documentais de obrigações legais.",
  "Conclua separando o que a ata e a convenção registram do que ainda exige validação jurídica.",
  "Faça um fechamento só com os fatos documentados do Alameda, sem incluir orientação geral.",
  "Conclua a comparação com os valores reais atuais, descartando hipótese e alerta de ilegibilidade anterior.",
  "Resuma as decisões registradas nas duas assembleias, com condições e sem presumir execução.",
  "Feche mostrando os dois conflitos: valores e horários do salão e prazos de locação.",
  "Depois dessa ocorrência, qual providência humana deve vir antes de retomar uso e contratação?"
] as const;
export const recoveryTargets = Object.freeze([
  ...affected.map((index) => ({
    ...auditTargets[index]!,
    id: `affected-${index}`,
    category: "affected" as const
  })),
  ...paraphrases.map((question, index) => ({
    ...auditTargets[affected[index]!]!,
    id: `paraphrase-${affected[index]}`,
    category: "paraphrase" as const,
    question
  })),
  ...controls.map((index) => ({
    ...auditTargets[index]!,
    id: `control-${index}`,
    category: "control" as const
  }))
]);
export type RecoveryTarget = (typeof recoveryTargets)[number] &
  Readonly<{ oracleExcluded?: boolean }>;
export const answerQualityConditions = Object.freeze(
  recoveryConditions.filter((condition) => condition.id !== "luna-low")
);
const qualityAffected = [
  0, 3, 12, 17, 20, 21, 22, 23, 24, 25, 26, 29, 30, 31, 34, 37, 39, 46, 54, 57, 75
] as const;
const qualityControls = [40, 42, 43, 45, 55, 56, 63, 68, 77] as const;
export const answerQualityTargets: readonly RecoveryTarget[] = Object.freeze([
  ...qualityAffected.map((index) => ({
    ...auditTargets[index]!,
    id: `quality-${index}`,
    category: "affected" as const,
    ...(index === 54 ? { oracleExcluded: true } : {})
  })),
  ...qualityControls.map((index) => ({
    ...auditTargets[index]!,
    id: `quality-control-${index}`,
    category: "control" as const
  }))
]);
export function assertRecoverySeed(
  seed: AnswerGatewayInput,
  questions: readonly string[],
  allowedEvidence: readonly Pick<
    RetrievableChunk,
    "id" | "documentId" | "documentVersionId" | "pageNumber" | "content" | "contentSha256"
  >[]
): void {
  if (
    !questions.includes(seed.question) ||
    !seed.conversationContext ||
    seed.conversationContext.turns.some((turn) => !questions.includes(turn.question))
  )
    throw new Error("Pergunta ou histórico fora das fixtures.");
  if (
    seed.evidence.some(
      (source) =>
        !allowedEvidence.some(
          (allowed) =>
            allowed.id === source.id &&
            allowed.documentId === source.documentId &&
            allowed.documentVersionId === source.documentVersionId &&
            allowed.pageNumber === source.pageNumber &&
            allowed.content === source.content &&
            allowed.contentSha256 === source.contentSha256
        )
    )
  )
    throw new Error("Conteúdo não pertence ao corpus autorizado do ensaio.");
}
export function recoveryExpected(target: RecoveryTarget): string {
  return conversationCases.find((item) => item.id === target.caseId)!.turns[target.turn - 1]!
    .expected;
}
export function prepareRecoveryInput(
  seed: AnswerGatewayInput,
  target: RecoveryTarget
): AnswerGatewayInput {
  const question = "question" in target ? target.question : seed.question;
  const evidence = isGeneralLaborExplanation(question, seed.evidence) ? [] : seed.evidence;
  const memory = seed.conversationContext;
  if (!memory || memory.turns.length > 8 || memory.bytes > 12000)
    throw new Error("Memória ausente ou inválida.");
  const turns = memory.turns.map((turn) => ({ question: turn.question }));
  const baseMemory = {
    policyVersion: memory.policyVersion,
    turns,
    bytes: Buffer.byteLength(JSON.stringify(turns)),
    omittedAnswers:
      memory.omittedAnswers + memory.turns.filter((turn) => turn.answer !== undefined).length,
    omittedTurns: memory.omittedTurns,
    ...(memory.windowScope === undefined ? {} : { windowScope: memory.windowScope })
  };
  const conversationContext = withAnswerTaskFocus(
    question,
    baseMemory,
    evidence,
    memory.taskFocus?.referenceDate ?? "2026-10-26"
  )!;
  const input: AnswerGatewayInput = {
    question,
    task: seed.task,
    riskClass: seed.riskClass,
    evidence,
    budget: seed.budget,
    documentaryState: evidence.length ? "available" : "no_candidates",
    conversationContext
  };
  return withGenerationContract(input);
}
