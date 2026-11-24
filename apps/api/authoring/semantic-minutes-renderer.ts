import type { AudioInput } from "./audio-inputs.js";
import { audioSourceReference } from "./audio-source.js";
import { formatAudioTime } from "../../shared/audio-minutes.js";
import type { DocumentDraftContent } from "../../shared/document-draft.js";
import { validateDraftContent } from "./document-drafts.js";
import type { MinutesClaim, MinutesPlan } from "./semantic-minutes-contract.js";

/** Renderiza exclusivamente um plano que passou pelas verificações, nunca a transcrição bruta. */
export function renderSemanticMinutes(input: AudioInput, plan: MinutesPlan): DocumentDraftContent {
  const claim = (value: MinutesClaim) =>
    `${value.text} [${[...new Set(value.references.map((ref) => ref.segmentIndex))]
      .map((index) => {
        const s = input.segments[index]!;
        return `${formatAudioTime(s.startSeconds)} a ${formatAudioTime(s.endSeconds)}`;
      })
      .join("; ")}]`;
  const labels = {
    condominium: "Condomínio",
    date: "Data relatada",
    location: "Local relatado",
    start_time: "Início relatado",
    end_time: "Encerramento relatado",
    chair: "Presidência relatada",
    secretary: "Secretaria relatada",
    attendees: "Participação relatada"
  };
  const status = {
    approved: "Aprovação relatada",
    rejected: "Rejeição relatada",
    deferred: "Deliberação adiada"
  };
  const pendingLabels = {
    unclear_audio: "Conferir trecho incerto no áudio",
    missing_vote: "Confirmar votação e seu resultado",
    conflict: "Esclarecer informações conflitantes",
    meeting_details: "Confirmar dados da reunião",
    attendance: "Confirmar participantes e presença",
    deadline: "Confirmar responsável ou prazo",
    other: "Conferir informação pendente"
  };
  const pending = plan.unresolved.map(
    (value) =>
      `${pendingLabels[value.kind]}${value.segmentIndexes.length ? ` (${value.segmentIndexes.map((i) => formatAudioTime(input.segments[i]!.startSeconds)).join(", ")})` : ""}.`
  );
  const missing = Object.keys(labels).filter(
    (field) => !plan.meeting.some((value) => value.field === field)
  );
  const text = [
    "ATA DA REUNIÃO — RASCUNHO PARA REVISÃO",
    "",
    "1. Identificação e origem",
    ...plan.meeting.map((value) => `${labels[value.field]}: ${claim(value.claim)}`),
    ...(missing.length
      ? [
          `Dados não identificados com segurança na transcrição: ${missing.map((key) => labels[key as keyof typeof labels].toLowerCase()).join(", ")}.`
        ]
      : []),
    input.mode === "dictation"
      ? "Redação baseada no relato do síndico, sujeita à conferência com os registros da reunião."
      : "Redação baseada na gravação da reunião, sujeita à conferência dos participantes e dos registros disponíveis.",
    "",
    "2. Assuntos tratados",
    ...plan.topics.flatMap((topic, index) => [
      `2.${index + 1}. ${topic.title}`,
      ...topic.discussion.map(claim),
      ...topic.proposals.map((value) => `Proposta apresentada: ${claim(value)}`),
      ...topic.decisions.map((value) => `${status[value.outcome]}: ${claim(value.claim)}`),
      ...topic.actions.map(
        (value) =>
          `Encaminhamento: ${claim(value.description)}${value.owner ? ` Responsável relatado: ${claim(value.owner)}` : " Responsável a confirmar."}${value.deadline ? ` Prazo relatado: ${claim(value.deadline)}` : " Prazo a confirmar."}`
      ),
      ""
    ]),
    "3. Pendências para revisão",
    ...pending,
    "Conferir identificação, participantes, votos, quórum e validade das deliberações antes de consolidar a ata. O áudio e o relato não substituem essa conferência.",
    "",
    "4. Encerramento",
    "Rascunho redigido para revisão do síndico. Não foi assinado, registrado, publicado ou aprovado por este aplicativo."
  ].join("\n");
  const draft: DocumentDraftContent = {
    title: "Ata — rascunho redigido para revisão",
    documentKind: "Ata",
    operation: "create",
    text,
    sources: [],
    audioSource: audioSourceReference(input),
    changes: `Redação resumida e organizada em ${plan.topics.length} assunto(s), com referências à gravação e conferência de suporte.`,
    pending: [
      ...pending,
      "Confirmar os dados ausentes e conferir deliberações antes do PDF. A conferência por modelo não substitui revisão humana."
    ].join("\n")
  };
  validateDraftContent(draft);
  return draft;
}
