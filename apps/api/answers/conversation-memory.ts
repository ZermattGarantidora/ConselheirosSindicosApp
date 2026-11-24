import type { AuthorizedCondominiumContext } from "../identity/authorized-condominium-context.js";
import type { ConversationHistoryEntry } from "./answer-persistence.js";
import { containsHostileInstruction } from "../security/document-instructions/document-instruction-policy.js";
import type { AnswerTaskFocus } from "./answer-task-context.js";
import type { ConfirmedProfileContext } from "./confirmed-profile-context.js";
import { canReplayDocumentaryAnswer } from "./documentary-replay.js";
import type { RetrievalEvidence } from "../retrieval/retrieval-contract.js";
import type { IntegralSumSummary } from "../analysis/integral-document-sum.js";

export class ConversationMemoryError extends Error {
  public constructor(public readonly statusCode: 404 | 409 | 503 = 503) {
    super(
      statusCode === 409
        ? "Há uma resposta em andamento nesta conversa."
        : statusCode === 404
          ? "Conversa indisponível."
          : "Não foi possível carregar o contexto da conversa com segurança."
    );
    this.name = "ConversationMemoryError";
  }
}

export type ConversationContext = Readonly<{
  documentCalculation?: IntegralSumSummary;
  documentCoverageLimitation?: string;
  policyVersion: "recent-chat-v1";
  turns: readonly Readonly<{
    question: string;
    answer?: string;
    basis?: "current_documentary_evidence";
  }>[];
  bytes: number;
  omittedAnswers: number;
  omittedTurns: number;
  windowScope?: "recent_only_start_unknown";
  taskFocus?: AnswerTaskFocus;
  confirmedProfile?: ConfirmedProfileContext;
}>;

export function buildConversationContext(
  context: AuthorizedCondominiumContext,
  chatId: string,
  history: readonly ConversationHistoryEntry[],
  currentEvidence: readonly RetrievalEvidence[] = []
): ConversationContext {
  if (
    history.some(
      (entry) =>
        entry.chatId !== chatId ||
        entry.answer.userId !== context.userId ||
        entry.answer.condominiumId !== context.condominiumId
    )
  )
    throw new ConversationMemoryError();
  const turns: { question: string; answer?: string; basis?: "current_documentary_evidence" }[] = [];
  let omittedAnswers = 0;
  let omittedTurns = Math.max(0, history.length - 8);
  // Recorte contíguo a partir do mais recente; não busca turnos antigos para preencher lacunas.
  const recent = history.slice(-8).toReversed();
  for (const [index, entry] of recent.entries()) {
    if (
      containsHostileInstruction(entry.question) ||
      containsHostileInstruction(entry.answer.answer)
    ) {
      omittedTurns += 1;
      continue;
    }
    const safeGeneralAnswer =
      entry.memoryReplaySafe === true &&
      entry.answer.validationStatus === "passed" &&
      entry.answer.answerMode === "abstained" &&
      entry.answer.citations.length === 0 &&
      !entry.answer.claims.some((claim) => claim.evidenceRequired);
    const safeAnswer =
      safeGeneralAnswer ||
      (entry.answer.validationStatus === "passed" &&
        entry.answer.answerMode === "grounded" &&
        entry.answer.citations.length > 0 &&
        !entry.answer.citations.some((citation) => citation.sourceRemoved) &&
        canReplayDocumentaryAnswer(entry.documentaryReplayLedger, currentEvidence));
    const turn = {
      question: entry.question,
      ...(safeAnswer ? { answer: entry.answer.answer } : {}),
      ...(!safeGeneralAnswer && safeAnswer
        ? { basis: "current_documentary_evidence" as const }
        : {})
    };
    if (Buffer.byteLength(JSON.stringify([turn, ...turns]), "utf8") > 12_000) {
      omittedTurns += recent.length - index;
      break;
    }
    if (!safeAnswer) omittedAnswers += 1;
    turns.unshift(turn);
  }
  return Object.freeze({
    policyVersion: "recent-chat-v1",
    turns: Object.freeze(turns.map((turn) => Object.freeze(turn))),
    bytes: Buffer.byteLength(JSON.stringify(turns), "utf8"),
    omittedAnswers,
    omittedTurns,
    windowScope: "recent_only_start_unknown"
  });
}

/** Orientação geral não recebe uma fala documental sem as fontes no mesmo pedido. */
export function withoutDocumentaryReplay(
  memory: ConversationContext | undefined
): ConversationContext | undefined {
  if (!memory) return memory;
  const removed = memory.turns.filter(
    (turn) => turn.basis === "current_documentary_evidence"
  ).length;
  const turns = memory.turns.map((turn) =>
    turn.basis === "current_documentary_evidence" ? { question: turn.question } : turn
  );
  const taskFocus = memory.taskFocus === undefined ? undefined : { ...memory.taskFocus };
  if (taskFocus !== undefined) delete taskFocus.acceptedAssistantOffer;
  const cleanMemory = { ...memory };
  delete cleanMemory.documentCalculation;
  return {
    ...cleanMemory,
    turns,
    ...(taskFocus === undefined ? {} : { taskFocus }),
    bytes: Buffer.byteLength(JSON.stringify(turns)),
    omittedAnswers: memory.omittedAnswers + removed
  };
}

function isBriefContinuation(question: string): boolean {
  const normalized = question
    .trim()
    .replace(/[.!?,]+$/u, "")
    .replaceAll(/\s+/gu, " ");
  return /^(?:(?:sim|quero)(?:,? por favor| sim| ajuda| sua ajuda)?|(?:pode|quero|preciso)(?: me)? ajudar|pode(?: sim| fazer)?|me ajude|por favor)$/iu.test(
    normalized
  );
}

function documentaryContinuationEntry(
  question: string,
  memory: ConversationContext,
  history: readonly ConversationHistoryEntry[]
): ConversationHistoryEntry | undefined {
  if (!isBriefContinuation(question) || memory.turns.length === 0) return undefined;
  const retained = history
    .slice(-8)
    .filter(
      (entry) =>
        !containsHostileInstruction(entry.question) &&
        !containsHostileInstruction(entry.answer.answer)
    )
    .slice(-memory.turns.length);
  for (const entry of retained.toReversed()) {
    if (
      entry.answer.validationStatus === "passed" &&
      entry.answer.answerMode === "grounded" &&
      entry.answer.citations.length > 0
    ) {
      if (entry.answer.citations.some((citation) => citation.sourceRemoved)) return undefined;
      return entry;
    }
    // Uma nova pergunta, upload ou mudança de assunto encerra a referência anterior.
    if (entry.question.trim() !== "" && !isBriefContinuation(entry.question)) return undefined;
  }
  return undefined;
}

/** Citações antigas orientam somente a busca; nunca entram como evidência ou replay. */
function documentaryContinuationReference(
  question: string,
  memory: ConversationContext,
  history: readonly ConversationHistoryEntry[]
): string | undefined {
  const entry = documentaryContinuationEntry(question, memory, history);
  if (!entry) return undefined;
  const references: string[] = [];
  let remaining = Math.min(4000, 12_000 - memory.bytes - Buffer.byteLength(question, "utf8") - 1);
  for (const citation of entry.answer.citations) {
    if (citation.sourceScope === "legislation") continue;
    const reference = `${citation.title}\n${citation.excerpt}`;
    const size = Buffer.byteLength(reference, "utf8") + 1;
    if (size > remaining || containsHostileInstruction(reference) || references.includes(reference))
      continue;
    references.push(reference);
    remaining -= size;
  }
  return references.length ? [...references, question].join("\n") : undefined;
}

/** Só a oferta interrogativa; fatos antigos continuam fora do contexto sem ledger. */
export function acceptedDocumentaryOffer(
  question: string,
  memory: ConversationContext | undefined,
  history: readonly ConversationHistoryEntry[],
  evidence: readonly RetrievalEvidence[]
): string | undefined {
  if (!memory) return undefined;
  const entry = documentaryContinuationEntry(question, memory, history);
  if (
    !entry ||
    !entry.answer.citations.some((citation) =>
      evidence.some(
        (source) =>
          source.sourceScope !== "legislation" &&
          source.documentId === citation.documentId &&
          source.documentVersionId === citation.documentVersionId &&
          source.pageNumber === citation.page
      )
    )
  )
    return undefined;
  const offer = /(?:^|[.!?\n])\s*([^.!?\n]+\?)\s*$/u.exec(entry.answer.answer)?.[1]?.trim();
  if (
    !offer ||
    Array.from(offer).length > 400 ||
    containsHostileInstruction(offer) ||
    !/^(?:quer(?: ajuda| que eu)|voc[eê] quer|posso(?: te| lhe)? ajudar|gostaria(?: de ajuda)?)/iu.test(
      offer
    )
  )
    return undefined;
  return offer;
}

export function isConversationContinuation(question: string): boolean {
  return (
    isBriefContinuation(question) ||
    /^(?:e\b|agora\b|ent[aã]o\b|explique\b|detalhe\b|compare\b|aqui\b|segue\b|enviei\b|reenviei\b|anexei\b|corrigindo\b|conclua\b|finalize\b|termine\b|resuma\b|feche\b|organize\b|monte\b|prepare\b|posso\b|troque\b|retome\b|volte\b|liste\b|mostre\b|fa[cç]a\b|escreva\b|redija\b|acrescente\b|registre\b|el[ea]s?\b|est[aã]o demorando\b)|\b(?:dess[ea]s?|ness[ea]s?|aquel[ea]s?|mesmos?|anteriores?|anterior|terceir[oa]|segund[oa]|primeir[oa]|[uú]ltim[oa]|melhor|isso|aquilo|pend[eê]ncias?|valida[cç][aã]o humana|duas? vers[oõ]es|aceite integral|evid[eê]ncia faltante|de novo|unidade corrigida|(?:unidade|per[ií]odo|m[eê]s|identificador) que (?:corrigi|ajustei|alterei)|depois da corre[cç][aã]o|pr[oó]xim[oa]s? passos? human[oa]s?|verifica[cç][oõ]es (?:humanas|priorit[aá]rias)|a[cç][aã]o humana priorit[aá]ria)\b/iu.test(
      question
    )
  );
}

export function contextualQuestion(
  question: string,
  memory: ConversationContext | undefined,
  history: readonly ConversationHistoryEntry[] = []
): string {
  if (memory === undefined || !isConversationContinuation(question)) return question;
  const reference = documentaryContinuationReference(question, memory, history);
  if (reference !== undefined) return reference;
  const questions = [...memory.turns.map((turn) => turn.question), question];
  const boundary = questions.findLastIndex((text) =>
    /(?:mudando|mudar|mudei) de assunto|outro assunto|nova pergunta independente|emerg[eê]ncia (?:resolvida|encerrada)|resgate (?:foi )?(?:conclu[ií]do|encerrado)/iu.test(
      text
    )
  );
  const focused = questions.slice(Math.max(0, boundary));
  // Corrigir a competência muda somente a consulta, nunca as mensagens persistidas.
  const correction = focused.findLastIndex((text) =>
    /corrigindo|corrijo|quis dizer|na verdade/iu.test(text)
  );
  const month =
    /\b(?:janeiro|fevereiro|mar[cç]o|abril|maio|junho|julho|agosto|setembro|outubro|novembro|dezembro)\b/giu;
  if (correction >= 0 && month.test(focused[correction]!)) {
    for (let index = 0; index < correction; index++)
      focused[index] = focused[index]!.replaceAll(month, "");
  }
  // Entidades corrigidas não concorrem com a referência antiga na busca.
  if (
    correction >= 0 &&
    !/\b(?:ambas|ambos|cada|compare)\b|(?:liste|mostre|para) (?:as |os )?(?:duas|dois)\b/iu.test(
      question
    )
  ) {
    const identifiers = /\b[\p{L}\p{N}]+-[\p{L}\p{N}]+\b/gu;
    const active: readonly string[] =
      focused[correction]!.split(/\b(?:n[aã]o|antes|anterior)\b/iu)[0]!.match(identifiers) ?? [];
    if (active.length > 0)
      for (let index = 0; index < correction; index++)
        focused[index] = focused[index]!.replaceAll(identifiers, (id) =>
          active.includes(id) ? id : ""
        );
  }
  // Uma consulta explícita de cláusula usa o contexto do instrumento, sem diluir
  // o assunto por oito perguntas antigas sobre preço, seguro ou prestação de contas.
  if (/aviso|den[uú]ncia|multa|encerramento|rescis[aã]o contratual/iu.test(question)) {
    const relevant = focused
      .slice(0, -1)
      .filter((text) => /contrat|aditivo|aviso|den[uú]ncia|multa|encerramento/iu.test(text));
    return [...relevant.slice(-3), question].join("\n");
  }
  return focused.join("\n");
}

/** Emergência encerrada não volta a ser ativa pela simples presença no histórico. */
export function contextualRiskQuestion(
  question: string,
  memory: ConversationContext | undefined,
  history: readonly ConversationHistoryEntry[] = []
): string {
  const contextual = contextualQuestion(question, memory, history);
  let lines = contextual.split("\n");
  const subjects = [
    /sal[aã]o|reserva de [aá]rea/iu,
    /sal[aá]rio|funcion[aá]rio|empregado|jornada|CCT/iu,
    /balancete|saldo|receitas|despesas/iu,
    /elevador|cabine/iu,
    /g[aá]s|GLP/iu
  ];
  const explicitSubjects = subjects.filter((pattern) => pattern.test(question));
  // Um assunto nomeado novo não herda emergência de outro assunto.
  if (explicitSubjects.length > 0)
    lines = lines.filter(
      (line) =>
        explicitSubjects.some((pattern) => pattern.test(line)) ||
        /resolvid|encerrad|resgatad|conclu[ií]d/iu.test(line)
    );
  const resolved = lines.findLastIndex((text) =>
    /(?:resgate|emerg[eê]ncia).{0,25}(?:conclu[ií]d|resolvid|encerrad)|(?:pessoa|morador|ocupante).{0,25}(?:resgatad|j[aá] saiu)|sem (?:vazamento|cheiro de g[aá]s|pessoas? presas?)/iu.test(
      text
    )
  );
  return lines
    .slice(resolved < 0 ? 0 : resolved + 1)
    .concat(question)
    .join("\n");
}

export function createLocalChatTurnGuard() {
  const activeTurns = new Set<string>();
  return async function acquireLocalChatTurn(
    context: AuthorizedCondominiumContext,
    chatId: string
  ): Promise<(() => Promise<void>) | undefined> {
    const key = JSON.stringify([context.condominiumId, context.userId, chatId]);
    if (activeTurns.has(key)) return undefined;
    activeTurns.add(key);
    return async () => {
      activeTurns.delete(key);
    };
  };
}
