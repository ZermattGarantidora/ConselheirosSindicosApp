import type { AuthorizedCondominiumContext } from "../identity/authorized-condominium-context.js";
import { normalizeQueryText } from "../retrieval/retrieval-query.js";
import { ConversationMemoryError, type ConversationContext } from "./conversation-memory.js";

/** Projeção interna do servidor; nunca recebida do corpo HTTP da pergunta. */
export type RegisteredProfileInput = Readonly<{
  condominiumId: string;
  name: string;
  unitCount: number | null;
}>;

export type ConfirmedProfileContext = RegisteredProfileInput &
  Readonly<{
    source: "registered_profile";
    documentaryProof: false;
  }>;

export function withConfirmedProfile(
  context: AuthorizedCondominiumContext,
  profile: RegisteredProfileInput | undefined,
  memory: ConversationContext | undefined
): ConversationContext | undefined {
  if (profile === undefined) return memory;
  if (
    profile.condominiumId !== context.condominiumId ||
    typeof profile.name !== "string" ||
    profile.name.trim().length === 0 ||
    profile.name.length > 120 ||
    (profile.unitCount !== null &&
      (!Number.isInteger(profile.unitCount) ||
        profile.unitCount < 1 ||
        profile.unitCount > 100_000))
  )
    throw new ConversationMemoryError();
  const confirmedProfile: ConfirmedProfileContext = Object.freeze({
    source: "registered_profile",
    documentaryProof: false,
    condominiumId: context.condominiumId,
    name: profile.name,
    unitCount: profile.unitCount
  });
  const base: ConversationContext = memory ?? {
    policyVersion: "recent-chat-v1",
    turns: [],
    bytes: 2,
    omittedAnswers: 0,
    omittedTurns: 0
  };
  const turns = [...base.turns];
  let omittedTurns = base.omittedTurns;
  for (;;) {
    const bytes = Buffer.byteLength(
      JSON.stringify({
        turns,
        ...(base.taskFocus === undefined ? {} : { taskFocus: base.taskFocus }),
        confirmedProfile
      }),
      "utf8"
    );
    if (bytes <= 12_000)
      return Object.freeze({
        ...base,
        confirmedProfile,
        turns: Object.freeze(turns),
        omittedTurns,
        bytes
      });
    if (turns.length === 0) throw new ConversationMemoryError();
    turns.shift();
    omittedTurns += 1;
  }
}

/** Só dispensa o aviso documental em consultas explícitas ao cadastro básico. */
export function isRegisteredProfileQuestion(question: string): boolean {
  const text = normalizeQueryText(question);
  if (
    /documento|convencao|regimento|\bata\b|contrato|balancete|saldo|receita|despesa|regras?|laudo|aprovad|legal|rateio|emiss[aã]o|cotas?|reserva|inadimpl|recebiment|caixa|rendimento|encargo|atraso/u.test(
      text
    )
  )
    return false;
  return /(?:qual|como).{0,30}nome.{0,35}condominio|(?:quantas?|quantidade|numero|total).{0,45}(?:unidades|apartamentos)|(?:o que|quais (?:dados|informacoes)).{0,45}(?:sabe|lembra|informei|cadastrad).{0,45}(?:condominio|cadastro)/u.test(
    text
  );
}

/** Exceção restrita à quantidade literalmente registrada; não libera outras regras locais. */
export function supportsRegisteredUnitsStatement(
  sentence: string,
  profile: ConfirmedProfileContext | undefined
): boolean {
  if (profile?.unitCount === null || profile === undefined) return false;
  const name = normalizeQueryText(profile.name).replaceAll(/[.*+?^${}()|[\]\\]/gu, "\\$&");
  return new RegExp(
    `^o condominio(?: ${name}| cadastrado| informado)? (?:tem|possui|conta com) ${profile.unitCount} (?:unidades|apartamentos)[.!]?$`,
    "u"
  ).test(normalizeQueryText(sentence.replaceAll("**", "").trim()));
}
