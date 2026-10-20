import type { AnswerGateway } from "./answer-gateway.js";

export const setupTurnStages = [
  "manager_name",
  "condominium_count",
  "condominium_name",
  "unit_count"
] as const;

export type SetupTurnStage = (typeof setupTurnStages)[number];
export type SetupTurnIntent = "answer" | "correction" | "question" | "small_talk" | "unclear";
export type SetupTurnField =
  "manager_name" | "condominium_count" | "condominium_name" | "unit_count";

export type SetupTurnHistoryMessage = Readonly<{
  role: "assistant" | "user";
  text: string;
}>;

export type SetupTurnRequest = Readonly<{
  stage: SetupTurnStage;
  message: string;
  history: readonly SetupTurnHistoryMessage[];
  managerName?: string;
  condominiumName?: string;
  condominiumCount?: number;
  condominiumIndex?: number;
  hasExistingContext?: boolean;
}>;

export type SetupTurnUpdate =
  | Readonly<{ field: "manager_name" | "condominium_name"; value: string }>
  | Readonly<{ field: "condominium_count" | "unit_count"; value: number }>;

export type SetupTurnResult = Readonly<{
  message: string;
  intent: SetupTurnIntent;
  update: SetupTurnUpdate | null;
}>;

export class InvalidSetupInterpretationError extends Error {
  public constructor(message: string) {
    super(message);
    this.name = "InvalidSetupInterpretationError";
  }
}

const intents: readonly SetupTurnIntent[] = [
  "answer",
  "correction",
  "question",
  "small_talk",
  "unclear"
];
const fields: readonly SetupTurnField[] = [
  "manager_name",
  "condominium_count",
  "condominium_name",
  "unit_count"
];

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}

function isBoundedText(value: unknown, maximumLength: number): value is string {
  return (
    typeof value === "string" &&
    value.trim().length > 0 &&
    value.length <= maximumLength &&
    !/\p{Cc}/u.test(value)
  );
}

function isOptionalBoundedText(value: unknown, maximumLength: number): boolean {
  return value === undefined || (typeof value === "string" && value.length <= maximumLength);
}

function isOptionalInteger(value: unknown, maximum: number): boolean {
  return (
    value === undefined ||
    (typeof value === "number" && Number.isInteger(value) && value >= 1 && value <= maximum)
  );
}

export function isSetupTurnRequest(value: unknown): value is SetupTurnRequest {
  if (!isRecord(value)) return false;
  if (!setupTurnStages.includes(value.stage as SetupTurnStage)) return false;
  if (!isBoundedText(value.message, 1_000)) return false;
  if (!Array.isArray(value.history) || value.history.length > 12) return false;
  if (
    !value.history.every(
      (item) =>
        isRecord(item) &&
        (item.role === "assistant" || item.role === "user") &&
        isBoundedText(item.text, 800)
    )
  )
    return false;
  if (!isOptionalBoundedText(value.managerName, 60)) return false;
  if (!isOptionalBoundedText(value.condominiumName, 120)) return false;
  if (!isOptionalInteger(value.condominiumCount, 100)) return false;
  if (!isOptionalInteger(value.condominiumIndex, 100)) return false;
  return value.hasExistingContext === undefined || typeof value.hasExistingContext === "boolean";
}

function parsedProviderOutput(output: string): Record<string, unknown> {
  const trimmed = output.trim();
  const fenced = /^```(?:json)?\s*([\s\S]*?)\s*```$/iu.exec(trimmed);
  const candidate = fenced?.[1] ?? trimmed;
  let parsed: unknown;
  try {
    parsed = JSON.parse(candidate);
  } catch {
    throw new Error("A interpretação da conversa não retornou JSON válido.");
  }
  if (!isRecord(parsed)) throw new Error("A interpretação da conversa é inválida.");
  const keys = Object.keys(parsed).sort();
  if (keys.join(",") !== "field,intent,reply,value")
    throw new Error("A interpretação da conversa não respeitou o contrato.");
  return parsed;
}

function plainReply(value: unknown): string {
  if (!isBoundedText(value, 800)) throw new Error("A fala interpretada é inválida.");
  const reply = value.replaceAll("**", "").replaceAll("__", "").trim();
  if (reply.length === 0 || reply.length > 800) throw new Error("A fala interpretada é inválida.");
  return reply;
}

function normalizedPersonName(value: unknown): string {
  if (typeof value !== "string") throw new Error("O nome interpretado é inválido.");
  const name = value.trim().replaceAll(/\s+/gu, " ");
  if (
    name.length < 2 ||
    name.length > 60 ||
    /\p{Cc}/u.test(value) ||
    !/\p{L}/u.test(name) ||
    !/^[\p{L}\p{M}\p{N}]+(?:[ '\-’][\p{L}\p{M}\p{N}]+)*$/u.test(name)
  )
    throw new Error("O nome interpretado é inválido.");
  return /\p{N}/u.test(name)
    ? name
    : `${name.charAt(0).toLocaleUpperCase("pt-BR")}${name.slice(1)}`;
}

function normalizedCondominiumName(value: unknown): string {
  if (typeof value !== "string") throw new Error("O nome do condomínio interpretado é inválido.");
  const name = value.trim().replaceAll(/\s+/gu, " ");
  if (name.length < 2 || name.length > 120 || /\p{Cc}/u.test(name))
    throw new Error("O nome do condomínio interpretado é inválido.");
  return name;
}

function normalizedInteger(value: unknown, maximum: number): number {
  if (!Number.isInteger(value) || (value as number) < 1 || (value as number) > maximum)
    throw new Error("A quantidade interpretada é inválida.");
  return value as number;
}

function fieldAllowedAtStage(field: SetupTurnField, stage: SetupTurnStage): boolean {
  if (field === "manager_name") return true;
  if (stage === "manager_name") return false;
  if (field === "condominium_count") return true;
  if (field === "condominium_name") return stage === "condominium_name" || stage === "unit_count";
  return stage === "unit_count";
}

function validatedUpdate(
  output: Record<string, unknown>,
  intent: SetupTurnIntent,
  stage: SetupTurnStage
): SetupTurnUpdate | null {
  const field = output.field;
  const value = output.value;
  if (field === null && value === null) return null;
  if (intent !== "answer" && intent !== "correction")
    throw new Error("A intenção não permite atualizar o cadastro.");
  if (typeof field !== "string" || !fields.includes(field as SetupTurnField))
    throw new Error("O campo interpretado é inválido.");
  const typedField = field as SetupTurnField;
  if (!fieldAllowedAtStage(typedField, stage))
    throw new Error("O campo interpretado não corresponde à etapa atual.");
  switch (typedField) {
    case "manager_name":
      return Object.freeze({ field: typedField, value: normalizedPersonName(value) });
    case "condominium_name":
      return Object.freeze({ field: typedField, value: normalizedCondominiumName(value) });
    case "condominium_count":
      return Object.freeze({ field: typedField, value: normalizedInteger(value, 100) });
    case "unit_count":
      return Object.freeze({ field: typedField, value: normalizedInteger(value, 100_000) });
  }
}

export async function interpretSetupTurn(
  gateway: AnswerGateway | undefined,
  request: SetupTurnRequest
): Promise<SetupTurnResult> {
  if (gateway === undefined) throw new Error("A Alvitra está indisponível no momento.");
  const result = await gateway.generate({
    question: JSON.stringify({
      stage: request.stage,
      expectedField: request.stage,
      currentMessage: request.message,
      recentHistory: request.history,
      confirmedData: {
        managerName: request.managerName ?? null,
        condominiumName: request.condominiumName ?? null,
        condominiumCount: request.condominiumCount ?? null,
        condominiumIndex: request.condominiumIndex ?? null,
        hasExistingContext: request.hasExistingContext ?? false
      }
    }),
    task: "setup_turn",
    riskClass: "low",
    evidence: [],
    budget: { maximumOutputTokens: 500, maximumCostMicrounits: 100_000 }
  });
  try {
    const output = parsedProviderOutput(result.output.answer);
    if (typeof output.intent !== "string" || !intents.includes(output.intent as SetupTurnIntent))
      throw new Error("A intenção interpretada é inválida.");
    const intent = output.intent as SetupTurnIntent;
    if ((output.field === null) !== (output.value === null))
      throw new Error("A atualização interpretada está incompleta.");
    const update = validatedUpdate(output, intent, request.stage);
    return Object.freeze({ message: plainReply(output.reply), intent, update });
  } catch (error: unknown) {
    throw new InvalidSetupInterpretationError(
      error instanceof Error ? error.message : "A interpretação da conversa é inválida."
    );
  }
}
