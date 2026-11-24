import type { SetupTurnField, SetupTurnRequest } from "./setup-turn.js";

/** Mirrors the client's validated transitions; never infers values from the user's prose. */
export function nextSetupField(
  request: SetupTurnRequest,
  updatedField: SetupTurnField
): SetupTurnField | null {
  switch (updatedField) {
    case "manager_name":
      return request.stage === "manager_name"
        ? request.hasExistingContext
          ? null
          : "condominium_count"
        : request.stage;
    case "condominium_count":
      return request.stage === "condominium_count" ? "condominium_name" : request.stage;
    case "condominium_name":
      return "unit_count";
    case "unit_count":
      return (request.condominiumIndex ?? 1) < (request.condominiumCount ?? 1)
        ? "condominium_name"
        : null;
  }
}

function normalizedReply(reply: string): string {
  return reply.normalize("NFD").replaceAll(/\p{M}/gu, "").toLowerCase();
}

function announcesCompletion(reply: string): boolean {
  return reply.split(/[.!?;]/u).some((sentence) => {
    if (/\b(?:nao|ainda|falta|faltam|quando|depois|apos|antes|para)\b/u.test(sentence))
      return false;
    return (
      /\b(?:contexto|cadastro|configuracao)\b/u.test(sentence) &&
      /\b(?:salvei|salvamos|salv[oa]s?|conclui|concluimos|concluid[oa]s?|finalizei|finalizamos|finalizad[oa]s?|complet[oa]s?|pront[oa]s?)\b/u.test(
        sentence
      )
    );
  });
}

function asksForField(question: string, field: SetupTurnField): boolean {
  const asksQuantity = /\b(?:quantos|quantas|quantidade|numero|total)\b/u.test(question);
  switch (field) {
    case "manager_name":
      return /\b(?:nome|chame|chamar|chamado|chamada)\b/u.test(question);
    case "condominium_count":
      return asksQuantity && /\bcondominios?\b/u.test(question);
    case "condominium_name":
      return /\b(?:nome|chama|chamam|chamado)\b/u.test(question);
    case "unit_count":
      return asksQuantity && /\b(?:apartamentos?|unidades?|aptos?)\b/u.test(question);
  }
}

/** A narrow output guard for pending setup questions, not a general semantic classifier. */
export function setupReplyIssue(reply: string, nextField: SetupTurnField | null): string | null {
  if (nextField === null) return null;
  const normalized = normalizedReply(reply);
  if (announcesCompletion(normalized)) return "premature_completion";
  const questions = normalized.match(/[^.!?]*\?/gu) ?? [];
  return questions.some((question) => asksForField(question, nextField))
    ? null
    : "missing_next_question";
}
