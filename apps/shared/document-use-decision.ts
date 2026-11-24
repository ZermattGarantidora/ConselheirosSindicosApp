export type DocumentUseDecision = "confirm" | "cancel";

/** Só uma decisão inequívoca digitada pelo usuário pode responder à pendência atual. */
export function readDocumentUseDecision(message: string): DocumentUseDecision | undefined {
  if (message.length > 200 || /[?\p{Cc}]/u.test(message)) return undefined;
  // A pausa de “não, pode usar” muda o sentido; não descartá-la como mera pontuação.
  if (/^\s*n[aã]o\s*[.,;:!]\s*(?:pode|use|usar|sim)\b/iu.test(message)) return undefined;
  const text = message
    .normalize("NFD")
    .replaceAll(/\p{M}/gu, "")
    .toLocaleLowerCase("pt-BR")
    .replaceAll(/[.,!]+/gu, " ")
    .replaceAll(/\s+/gu, " ")
    .trim();
  if (
    /^(?:nao|nao (?:usar|use|pode usar|quero usar)|cancelar|cancele)(?: (?:este|esse|o) (?:arquivo|documento))?(?: (?:aqui|neste condominio))?$/u.test(
      text
    ) ||
    text === "nao e deste condominio"
  )
    return "cancel";
  if (
    /^(?:sim|sim (?:pode )?usar|pode usar|confirmo(?: o uso)?|autorizo(?: o uso)?)(?: (?:este|esse|o|deste|desse|do) (?:arquivo|documento))?(?: (?:aqui|neste condominio))?$/u.test(
      text
    ) ||
    text === "e deste condominio" ||
    text === "pertence a este condominio"
  )
    return "confirm";
  return undefined;
}
