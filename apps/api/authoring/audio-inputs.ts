import { randomUUID, createHash } from "node:crypto";
import { chatIdPattern } from "../chats/chat-repository.js";
import {
  conversationHash,
  type ConversationStore,
  type ConversationScope
} from "../answers/conversation-store.js";
import type { AuthorizedCondominiumContext } from "../identity/authorized-condominium-context.js";
import type {
  PrivateDocumentStorage,
  PrivateDocumentReader
} from "../documents/private-document-storage.js";
import type { ChatRepository } from "../chats/chat-repository.js";
import { DocumentDraftError } from "./document-drafts.js";
import {
  transcribeAuthorizedAudio,
  type AudioMode,
  type AudioTranscriber
} from "./audio-transcription.js";
import { audioLimits, inspectPcmWav } from "./audio-transcription.js";
import type { DurableAudioStorage } from "./postgres-audio-storage.js";
import type { AuthoringOperations } from "./authoring-operations.js";

type Scope = Extract<ConversationScope, { kind: "chat" }>;
export type AudioInput = Awaited<ReturnType<typeof transcribeAuthorizedAudio>> & {
  id: string;
  title: string;
};
/** Recibos separados impedem uma retentativa HTTP de repetir transcrição após falha incerta. */
export function createAudioInputService(options: {
  store: ConversationStore;
  operations?: AuthoringOperations;
  validateDerivedDraft?: (
    context: AuthorizedCondominiumContext,
    scope: Scope,
    id: string
  ) => Promise<unknown>;
  storage: PrivateDocumentStorage;
  reader?: PrivateDocumentReader;
  chats: ChatRepository;
  transcriber?: AudioTranscriber;
  durableAudio?: DurableAudioStorage;
  now: () => Date;
}) {
  async function authorized(context: AuthorizedCondominiumContext, scope: Scope) {
    if (
      context.userId !== scope.userId ||
      context.condominiumId !== scope.condominiumId ||
      !context.permissions.includes("document:upload") ||
      !context.permissions.includes("document:read")
    )
      throw new DocumentDraftError(403, "Acesso não autorizado.");
    if (!(await options.chats.find(context, scope.chatId)))
      throw new DocumentDraftError(404, "Conversa indisponível.");
  }
  async function read(
    context: AuthorizedCondominiumContext,
    scope: Scope,
    id: string
  ): Promise<AudioInput> {
    await authorized(context, scope);
    await options.operations?.check(context, scope, id);
    if (options.store.durable && !options.durableAudio)
      throw new DocumentDraftError(
        503,
        "Áudio persistente aguarda integração própria de storage, retenção e consumo. Nenhum envio foi habilitado."
      );
    const receipt = await options.store.find(scope, `audio-input:${id}:result`);
    const durable = options.store.durable ? await options.durableAudio!.read(scope, id) : undefined;
    if ((!receipt || receipt.response.status !== "completed") && !durable?.input)
      throw new DocumentDraftError(
        receipt ? 503 : 404,
        "Transcrição indisponível. Nenhuma ata foi gerada."
      );
    const result = (durable?.input ?? receipt!.response.input) as AudioInput;
    if (
      durable?.input &&
      receipt?.response.input &&
      conversationHash(durable.input) !== conversationHash(receipt.response.input)
    )
      throw new DocumentDraftError(409, "A transcrição persistida mudou.");
    if (!options.reader && !durable)
      throw new DocumentDraftError(503, "Leitura do original de áudio indisponível.");
    const original =
      durable?.content ??
      (await options.reader!.readOriginal({
        condominiumId: context.condominiumId,
        objectId: id,
        userId: context.userId
      }));
    if (createHash("sha256").update(original).digest("hex") !== result.originalSha256)
      throw new DocumentDraftError(409, "Original de áudio ausente ou alterado.");
    await authorized(context, scope);
    await options.operations?.check(context, scope, id);
    return result;
  }
  return {
    durableSupported: !options.store.durable || options.durableAudio?.syntheticOnly === true,
    enabled:
      (!options.store.durable || options.durableAudio?.syntheticOnly === true) &&
      options.transcriber !== undefined &&
      (options.reader !== undefined || options.durableAudio !== undefined),
    read,
    async purge(context: AuthorizedCondominiumContext, scope: Scope, id: string) {
      await authorized(context, scope);
      if (!options.durableAudio)
        throw new DocumentDraftError(503, "Exclusão durável de áudio indisponível.");
      await options.operations?.purge(context, scope, id);
      await options.durableAudio.purge(scope, id);
    },
    async export(context: AuthorizedCondominiumContext, scope: Scope, id: string) {
      await authorized(context, scope);
      await options.operations?.check(context, scope, id);
      if (!options.durableAudio)
        throw new DocumentDraftError(503, "Exportação durável de áudio indisponível.");
      const result = await options.durableAudio.export(scope, id);
      if (
        options.validateDerivedDraft &&
        result &&
        typeof result === "object" &&
        "entries" in result &&
        Array.isArray(result.entries)
      ) {
        const ids = new Set<string>();
        for (const entry of result.entries) {
          const draft = entry?.response?.draft as { id?: string } | undefined;
          if (draft?.id) ids.add(draft.id);
        }
        for (const draftId of ids) await options.validateDerivedDraft(context, scope, draftId);
      }
      await authorized(context, scope);
      await options.durableAudio.read(scope, id);
      await options.operations?.check(context, scope, id);
      return result;
    },
    async capabilities(context: AuthorizedCondominiumContext, scope: Scope) {
      await authorized(context, scope);
      return {
        enabled:
          (!options.store.durable || options.durableAudio?.syntheticOnly === true) &&
          options.transcriber !== undefined &&
          (options.reader !== undefined || options.durableAudio !== undefined)
      };
    },
    async recent(context: AuthorizedCondominiumContext, scope: Scope, before?: string) {
      await authorized(context, scope);
      const page = await options.store.list(scope, 50, before);
      const ids = [
        ...new Set(
          page.entries
            .map((entry) => entry.metadata.audioInputId)
            .filter((id): id is string => typeof id === "string" && chatIdPattern.test(id))
        )
      ];
      const inputs = [];
      for (const id of ids) {
        try {
          await options.operations?.check(context, scope, id);
        } catch (error) {
          if (error instanceof DocumentDraftError && error.statusCode === 404) continue;
          throw error;
        }
        let durableInput: AudioInput | undefined;
        if (options.store.durable) {
          if (!options.durableAudio) continue;
          try {
            durableInput = (await options.durableAudio.read(scope, id)).input;
          } catch (error) {
            if (error instanceof DocumentDraftError && error.statusCode === 404) continue;
            throw error;
          }
        }
        const completed = await options.store.find(scope, `audio-input:${id}:result`);
        const received = await options.store.find(scope, `audio-input:${id}:received`);
        if (!received) continue;
        const input = (completed?.response.input ?? durableInput) as AudioInput | undefined;
        const lastEvent = page.entries
          .filter(
            (entry) =>
              entry.metadata.audioInputId === id &&
              ((typeof entry.metadata.minutesRequestId === "string" &&
                chatIdPattern.test(entry.metadata.minutesRequestId)) ||
                (typeof entry.response.draftId === "string" &&
                  chatIdPattern.test(entry.response.draftId)))
          )
          .at(-1);
        const lastRequest =
          typeof lastEvent?.metadata.minutesRequestId === "string"
            ? await options.store.find(
                scope,
                `audio-minutes:${lastEvent.metadata.minutesRequestId}:request`
              )
            : lastEvent;
        inputs.push({
          id,
          title: input?.title ?? "Áudio recebido",
          mode: input?.mode ?? null,
          status: input ? "transcribed" : "uncertain",
          request:
            typeof lastRequest?.response.request === "string"
              ? lastRequest.response.request
              : (received.messages[0]?.text ?? ""),
          ...(lastRequest
            ? {
                draftId: lastRequest.response.draftId as string,
                generationKind:
                  typeof lastRequest.response.generationKind === "string"
                    ? lastRequest.response.generationKind
                    : null
              }
            : {})
        });
      }
      await authorized(context, scope);
      for (const input of inputs) await options.operations?.check(context, scope, input.id);
      return { inputs, nextCursor: page.nextCursor };
    },
    async receive(
      context: AuthorizedCondominiumContext,
      scope: Scope,
      id: string,
      title: string,
      mode: AudioMode,
      content: Buffer,
      request?: string
    ): Promise<AudioInput> {
      await authorized(context, scope);
      if (options.store.durable && !options.durableAudio)
        throw new DocumentDraftError(
          503,
          "Áudio persistente aguarda integração própria de storage, retenção e consumo. Nenhum envio foi habilitado."
        );
      if (!title.trim() || title.length > 200 || /[\p{Cc}]/u.test(title))
        throw new DocumentDraftError(400, "Nome de áudio inválido.");
      if (
        request !== undefined &&
        (typeof request !== "string" ||
          !request.trim() ||
          request.length > 2000 ||
          /\p{Cc}/u.test(request.replace(/[\t\r\n]/gu, "")))
      )
        throw new DocumentDraftError(400, "Pedido de ata inválido.");
      const hash = conversationHash([
        title,
        mode,
        createHash("sha256").update(content).digest("hex"),
        ...(request === undefined ? [] : [request])
      ]);
      const existing = await options.store.find(scope, `audio-input:${id}:received`);
      if (
        !existing &&
        ((await options.store.find(scope, `document-draft:${id}:1`)) ||
          (await options.store.find(scope, `document-authoring:${id}:request`)) ||
          (await options.store.find(scope, `audio-minutes:${id}:request`)))
      )
        throw new DocumentDraftError(
          409,
          "Identidade já pertence a um documento. Use outro identificador para o áudio."
        );
      if (existing) await options.operations?.check(context, scope, id);
      else await options.operations?.open(context, scope, id);
      if (existing) {
        if (existing.inputHash !== hash)
          throw new DocumentDraftError(409, "O identificador já foi usado para outro áudio.");
        const receipt = await options.store.find(scope, `audio-input:${id}:result`);
        if (receipt?.response.status === "completed") return read(context, scope, id);
        if (options.store.durable && (await options.durableAudio!.read(scope, id)).input)
          return read(context, scope, id);
        throw new DocumentDraftError(
          503,
          "Tentativa de transcrição já registrada. Requer verificação antes de repetir; nenhum novo envio foi feito."
        );
      }
      // O startup não fornece adaptador. Não armazenar nem fingir transcrição quando indisponível.
      if (!options.transcriber || (!options.reader && !options.durableAudio))
        throw new DocumentDraftError(
          503,
          "Transcrição não habilitada. Nenhum áudio foi enviado ou armazenado."
        );
      if (
        !["dictation", "meeting"].includes(mode) ||
        content.length > audioLimits[mode].maximumBytes ||
        inspectPcmWav(content).durationSeconds > audioLimits[mode].maximumSeconds
      )
        throw new DocumentDraftError(
          422,
          "Áudio fora dos limites; nenhum trecho foi armazenado, cortado ou enviado."
        );
      const execute = async (): Promise<AudioInput> => {
        const claimId = randomUUID();
        const received = await options.store.append(scope, {
          id: claimId,
          createdAt: options.now().toISOString(),
          requestKey: `audio-input:${id}:received`,
          inputHash: hash,
          messages: [
            {
              id: randomUUID(),
              role: "user",
              kind: "question_answer",
              text:
                request ??
                `Enviei o áudio “${title}” no modo ${mode === "dictation" ? "relato do síndico" : "gravação de reunião"}.`
            }
          ],
          response: { status: "received" },
          metadata: { audioInputId: id }
        });
        if (received.id !== claimId)
          throw new DocumentDraftError(
            503,
            "Áudio já recebido. Aguarde a tentativa original; nenhum novo envio foi feito."
          );
        {
          if (options.store.durable) {
            await options.durableAudio!.reserve(scope, id, hash, content);
            await options.durableAudio!.start(scope, id);
          } else
            await options.storage.storeOriginal({
              condominiumId: context.condominiumId,
              objectId: id,
              uploadedByUserId: context.userId,
              content
            });
          const result = await transcribeAuthorizedAudio({
            context,
            chatId: scope.chatId,
            mode,
            content,
            transcriber: options.transcriber!,
            authorizeChat: async (ctx, chatId) => Boolean(await options.chats.find(ctx, chatId))
          });
          await authorized(context, scope);
          const input: AudioInput = { ...result, id, title };
          if (Buffer.byteLength(JSON.stringify(input)) > 175_000)
            throw new DocumentDraftError(
              422,
              "Transcrição excede o tamanho seguro. Nenhuma parte foi descartada para gerar ata."
            );
          if (options.store.durable) await options.durableAudio!.complete(scope, id, input);
          await options.store.append(scope, {
            id: randomUUID(),
            createdAt: options.now().toISOString(),
            requestKey: `audio-input:${id}:result`,
            inputHash: hash,
            messages: [
              {
                id: randomUUID(),
                role: "user",
                kind: "question_answer",
                text: `Transcrição recebida para minha revisão: “${title}”.`
              }
            ],
            response: { status: "completed", input },
            metadata: { audioInputId: id }
          });
          return input;
        }
      };
      return options.operations
        ? options.operations.run(
            context,
            scope,
            id,
            "audio_transcription",
            "transcribe",
            hash,
            execute
          )
        : execute();
    }
  };
}
