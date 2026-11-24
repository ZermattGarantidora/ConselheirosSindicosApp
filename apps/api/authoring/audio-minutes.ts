import { randomUUID } from "node:crypto";
import type { ConversationScope, ConversationStore } from "../answers/conversation-store.js";
import type { AuthorizedCondominiumContext } from "../identity/authorized-condominium-context.js";
import type { createAudioInputService } from "./audio-inputs.js";
import { DocumentDraftError, type createDocumentDraftService } from "./document-drafts.js";
import { audioSourceReference } from "./audio-source.js";
import {
  minutesLimits,
  semanticHash,
  semanticMinutesVersion,
  validateMinutesPlan,
  validateMinutesReview
} from "./semantic-minutes-contract.js";
import type { SemanticMinutesModel } from "./semantic-minutes-model.js";
import { renderSemanticMinutes } from "./semantic-minutes-renderer.js";
import type { AuthoringOperations } from "./authoring-operations.js";
type Scope = Extract<ConversationScope, { kind: "chat" }>;
export function createAudioMinutesService(options: {
  store: ConversationStore;
  operations?: AuthoringOperations;
  audio: ReturnType<typeof createAudioInputService>;
  drafts: ReturnType<typeof createDocumentDraftService>;
  model?: SemanticMinutesModel;
  now: () => Date;
  authorize: (
    context: AuthorizedCondominiumContext,
    scope: Scope
  ) => Promise<AuthorizedCondominiumContext>;
}) {
  return {
    enabled: options.model?.enabled === true && options.audio.durableSupported,
    async prepare(
      context: AuthorizedCondominiumContext,
      scope: Scope,
      inputId: string,
      draftId: string,
      request: unknown,
      signal?: AbortSignal
    ) {
      if (
        typeof request !== "string" ||
        !request.trim() ||
        request.length > 2000 ||
        /\p{Cc}/u.test(request.replace(/[\t\r\n]/gu, ""))
      )
        throw new DocumentDraftError(
          400,
          "Escreva o pedido de ata antes de enviar, com até 2.000 caracteres."
        );
      const current = await options.authorize(context, scope);
      if (await options.store.find(scope, `audio-input:${draftId}:received`))
        throw new DocumentDraftError(
          409,
          "A ata precisa de identidade própria, distinta do áudio."
        );
      const input = await options.audio.read(current, scope, inputId),
        reference = audioSourceReference(input),
        sourceHash = semanticHash(reference);
      const source = {
        mode: input.mode,
        durationSeconds: input.durationSeconds,
        segments: input.segments.map((segment, segmentIndex) => ({ segmentIndex, ...segment })),
        provenance: input.provenance
      };
      const baseData = { request, sourceHash, source };
      if (
        input.segments.length > 2000 ||
        Buffer.byteLength(JSON.stringify(baseData)) > minutesLimits.inputBytes
      )
        throw new DocumentDraftError(
          422,
          "A transcrição excede o limite da redação. Nenhum trecho foi cortado ou enviado ao redator."
        );
      const commandHash = semanticHash([semanticMinutesVersion, inputId, reference, request]),
        key = `audio-minutes:${draftId}:request`;
      const existing = await options.store.find(scope, key);
      if (existing) await options.operations?.check(current, scope, draftId);
      else await options.operations?.open(current, scope, draftId);
      if (
        existing &&
        (existing.inputHash !== commandHash ||
          existing.response.generationKind !== semanticMinutesVersion)
      )
        throw new DocumentDraftError(
          409,
          "Este pedido pertence a outra versão ou instrução. Peça uma nova redação da transcrição, sem reenviar o áudio."
        );
      if (existing) {
        try {
          return await options.drafts.read(current, scope, draftId);
        } catch (error) {
          if (!(error instanceof DocumentDraftError) || error.statusCode !== 404) throw error;
        }
      }
      signal?.throwIfAborted();
      if (!existing && !options.model?.enabled)
        throw new DocumentDraftError(
          503,
          "Redação e conferência de atas não estão habilitadas. Nenhuma ata foi fabricada."
        );
      const received = await options.store.find(scope, `audio-input:${inputId}:received`);
      await options.store.append(scope, {
        id: randomUUID(),
        createdAt: options.now().toISOString(),
        requestKey: key,
        inputHash: commandHash,
        messages: [
          {
            id: randomUUID(),
            role: "user",
            kind: "question_answer",
            text: received?.messages.some((m) => m.text === request)
              ? "Solicitei a redação da ata a partir do áudio enviado, com resumo e conferência antes do PDF."
              : request
          }
        ],
        response: { draftId, inputId, request, generationKind: semanticMinutesVersion },
        metadata: { audioInputId: inputId, minutesRequestId: draftId }
      });
      const ensureCurrent = async () => {
        signal?.throwIfAborted();
        const fresh = await options.authorize(context, scope);
        const audio = await options.audio.read(fresh, scope, inputId);
        if (semanticHash(audioSourceReference(audio)) !== sourceHash)
          throw new DocumentDraftError(
            409,
            "O áudio ou a transcrição mudou durante a redação. Nenhuma ata foi liberada."
          );
        return fresh;
      };
      async function phase<T>(
        name: "write" | "review",
        data: Readonly<Record<string, unknown>>,
        validate: (value: unknown) => T
      ): Promise<T> {
        const inputHash = semanticHash([semanticMinutesVersion, name, data]),
          prefix = `audio-minutes:${draftId}:${name}`;
        const saved = await options.store.find(scope, `${prefix}:result`);
        const readSaved = (entry: NonNullable<typeof saved>): T => {
          if (entry.inputHash !== inputHash)
            throw new DocumentDraftError(409, "Recibo da redação incompatível com esta versão.");
          if (entry.response.status !== "completed")
            throw new DocumentDraftError(
              422,
              "Esta redação foi rejeitada pela conferência. Nenhuma ata foi liberada. Revise a fonte ou faça novo pedido."
            );
          return validate(entry.response.value);
        };
        if (saved) return readSaved(saved);
        const dispatched = await options.store.find(scope, `${prefix}:dispatch`);
        if (dispatched)
          throw new DocumentDraftError(
            503,
            "A etapa de redação/conferência tem envio sem resultado salvo. Aguarde reconciliação; não houve novo envio automático."
          );
        if (!options.model?.enabled)
          throw new DocumentDraftError(
            503,
            "Redação e conferência indisponíveis. Não há fallback para transcrição organizada."
          );
        const execute = async (): Promise<T> => {
          const actor = await ensureCurrent(),
            claimId = randomUUID();
          const claim = await options.store.append(scope, {
            id: claimId,
            createdAt: options.now().toISOString(),
            requestKey: `${prefix}:dispatch`,
            inputHash,
            messages: [
              {
                id: randomUUID(),
                role: "user",
                kind: "question_answer",
                text:
                  name === "write"
                    ? "Solicitei a redação resumida da ata."
                    : "Solicitei a conferência da redação contra a gravação."
              }
            ],
            response: { status: "dispatched", phase: name, modelKey: options.model!.key },
            metadata: { audioInputId: inputId, minutesRequestId: draftId }
          });
          if (claim.id !== claimId) {
            const completed = await options.store.find(scope, `${prefix}:result`);
            if (completed) return readSaved(completed);
            throw new DocumentDraftError(
              503,
              "Esta etapa já está em andamento. Nenhuma chamada adicional foi feita."
            );
          }
          let value: T;
          try {
            const raw = await options.model!.complete({
              phase: name,
              operationId: semanticHash([
                scope.userId,
                scope.condominiumId,
                scope.chatId,
                draftId,
                name
              ]),
              condominiumId: scope.condominiumId,
              userId: actor.userId,
              chatId: scope.chatId,
              data,
              ...(signal ? { signal } : {})
            });
            value = validate(raw);
          } catch (error) {
            if (error instanceof DocumentDraftError && error.statusCode === 422) {
              await options.store.append(scope, {
                id: randomUUID(),
                createdAt: options.now().toISOString(),
                requestKey: `${prefix}:result`,
                inputHash,
                messages: [
                  {
                    id: randomUUID(),
                    role: "user",
                    kind: "question_answer",
                    text: "A redação solicitada não foi liberada pelos controles de conferência."
                  }
                ],
                response: { status: "rejected" },
                metadata: { audioInputId: inputId, minutesRequestId: draftId }
              });
              throw error;
            }
            throw new DocumentDraftError(
              503,
              "A redação/conferência não tem resultado confirmado. Recupere o mesmo pedido; nenhuma etapa será repetida automaticamente."
            );
          }
          await options.store.append(scope, {
            id: randomUUID(),
            createdAt: options.now().toISOString(),
            requestKey: `${prefix}:result`,
            inputHash,
            messages: [
              {
                id: randomUUID(),
                role: "user",
                kind: "question_answer",
                text:
                  name === "write"
                    ? "Recebi a redação para conferência."
                    : "Recebi o resultado da conferência da redação."
              }
            ],
            response: { status: "completed", value, modelKey: options.model!.key },
            metadata: { audioInputId: inputId, minutesRequestId: draftId }
          });
          return value;
        };
        return options.operations
          ? options.operations.run(
              context,
              scope,
              draftId,
              name === "write" ? "audio_minutes_write" : "audio_minutes_review",
              name,
              inputHash,
              execute
            )
          : execute();
      }
      const plan = await phase("write", baseData, (raw) => validateMinutesPlan(raw, input));
      await ensureCurrent();
      await phase("review", { ...baseData, plan, planHash: semanticHash(plan) }, (raw) =>
        validateMinutesReview(raw, plan, input, sourceHash)
      );
      const actor = await ensureCurrent();
      return options.drafts.propose(actor, scope, draftId, renderSemanticMinutes(input, plan), 0);
    }
  };
}
