import { randomUUID } from "node:crypto";
import {
  conversationHash,
  ConversationStoreError,
  type ConversationScope,
  type ConversationStore
} from "../answers/conversation-store.js";
import type { AuthorizedCondominiumContext } from "../identity/authorized-condominium-context.js";
import type { DocumentSourceReader } from "../documents/document-source.js";
import {
  listRegisteredDocuments,
  type DocumentCatalogRepository
} from "../documents/document-catalog.js";
import {
  maximumDraftContentBytes,
  maximumDraftSourceReferences,
  maximumDraftTextCharacters,
  type DocumentDraft,
  type DocumentDraftContent
} from "../../shared/document-draft.js";
import { createDraftPdf } from "./draft-pdf.js";
import type { AudioInput } from "./audio-inputs.js";
import { audioSourceReference } from "./audio-source.js";
import type { DocumentAuthoringReference } from "../../shared/document-proposal.js";
import type { AuthoringOperations } from "./authoring-operations.js";

export class DocumentDraftError extends Error {
  constructor(
    public readonly statusCode: number,
    message: string
  ) {
    super(message);
  }
}
type Scope = Extract<ConversationScope, { kind: "chat" }>;
const key = (id: string, event: number) => `document-draft:${id}:${event}`;
const fail = (status: number, message: string): never => {
  throw new DocumentDraftError(status, message);
};
function assertScope(context: AuthorizedCondominiumContext, scope: Scope) {
  if (
    context.userId !== scope.userId ||
    context.condominiumId !== scope.condominiumId ||
    !context.permissions.includes("document:read") ||
    !context.permissions.includes("document:upload")
  )
    fail(403, "Acesso não autorizado ao rascunho.");
}
const checkedText = (value: unknown, max: number, optional = false): value is string =>
  typeof value === "string" &&
  (optional || value.trim().length > 0) &&
  value.length <= max &&
  !/\p{Cc}/u.test(value.replace(/[\t\r\n]/gu, ""));
export function validateDraftContent(value: unknown): asserts value is DocumentDraftContent {
  if (!value || typeof value !== "object") fail(400, "Rascunho inválido.");
  const v = value as DocumentDraftContent;
  if (
    !checkedText(v.title, 200) ||
    !checkedText(v.documentKind, 80) ||
    !checkedText(v.text, maximumDraftTextCharacters) ||
    Buffer.byteLength(JSON.stringify(v)) > maximumDraftContentBytes ||
    !checkedText(v.changes, 2_000, true) ||
    !checkedText(v.pending, 2_000, true) ||
    !["create", "revise", "improve"].includes(v.operation) ||
    !Array.isArray(v.sources) ||
    v.sources.length > maximumDraftSourceReferences ||
    v.sources.some(
      (s) =>
        !s ||
        !checkedText(s.documentId, 100) ||
        !checkedText(s.documentVersionId, 100) ||
        !Number.isSafeInteger(s.page) ||
        s.page < 1 ||
        !checkedText(s.excerpt, 1_000)
    )
  )
    fail(400, "Texto, origem ou limites do rascunho inválidos.");
  if (v.audioSource !== undefined) {
    const a = v.audioSource;
    if (
      !a ||
      !checkedText(a.inputId, 100) ||
      !/^[a-f0-9]{64}$/u.test(a.originalSha256) ||
      !/^[a-f0-9]{64}$/u.test(a.transcriptSha256) ||
      !["dictation", "meeting"].includes(a.mode) ||
      !Number.isFinite(a.durationSeconds) ||
      a.durationSeconds <= 0 ||
      a.durationSeconds > 3600
    )
      fail(400, "Referência do áudio inválida.");
  }
  if (v.authoringSource !== undefined) {
    const a = v.authoringSource;
    if (
      !a ||
      !checkedText(a.proposalId, 100) ||
      !/^[a-f0-9]{64}$/u.test(a.proposalHash) ||
      !/^[a-f0-9]{64}$/u.test(a.sourceHash) ||
      typeof a.hasUserReport !== "boolean"
    )
      fail(400, "Referência da proposta inválida.");
  }
}
function contentOf(draft: DocumentDraftContent): DocumentDraftContent {
  return {
    title: draft.title,
    documentKind: draft.documentKind,
    operation: draft.operation,
    text: draft.text,
    sources: draft.sources.map((s) => ({
      documentId: s.documentId,
      documentVersionId: s.documentVersionId,
      page: s.page,
      excerpt: s.excerpt
    })),
    changes: draft.changes,
    pending: draft.pending,
    ...(draft.authoringSource
      ? {
          authoringSource: {
            proposalId: draft.authoringSource.proposalId,
            proposalHash: draft.authoringSource.proposalHash,
            sourceHash: draft.authoringSource.sourceHash,
            hasUserReport: draft.authoringSource.hasUserReport
          }
        }
      : {}),
    ...(draft.audioSource
      ? {
          audioSource: {
            inputId: draft.audioSource.inputId,
            originalSha256: draft.audioSource.originalSha256,
            transcriptSha256: draft.audioSource.transcriptSha256,
            mode: draft.audioSource.mode,
            durationSeconds: draft.audioSource.durationSeconds
          }
        }
      : {})
  };
}
export function createDocumentDraftService(options: {
  store: ConversationStore;
  operations?: AuthoringOperations;
  sources?: DocumentSourceReader;
  catalog: DocumentCatalogRepository;
  authoringSource?: (
    context: AuthorizedCondominiumContext,
    scope: Scope,
    id: string
  ) => Promise<DocumentAuthoringReference>;
  audioSource?: (
    context: AuthorizedCondominiumContext,
    scope: Scope,
    id: string
  ) => Promise<AudioInput>;
  now: () => Date;
}) {
  async function sourceHashes(
    context: AuthorizedCondominiumContext,
    content: DocumentDraftContent,
    scope: Scope
  ) {
    const hashes: string[] = [];
    if (content.authoringSource) {
      if (!options.authoringSource) fail(503, "Leitura da proposta de origem indisponível.");
      const actual = await options.authoringSource!(
        context,
        scope,
        content.authoringSource.proposalId
      );
      const normalized = contentOf({ ...content, authoringSource: actual }).authoringSource;
      if (conversationHash(normalized) !== conversationHash(contentOf(content).authoringSource))
        fail(409, "A proposta de origem mudou. Prepare outro rascunho.");
      hashes.push(conversationHash(normalized));
    }
    if (content.audioSource) {
      if (!options.audioSource) fail(503, "Leitura da origem de áudio indisponível.");
      const actual = audioSourceReference(
        await options.audioSource!(context, scope, content.audioSource.inputId)
      );
      if (conversationHash(actual) !== conversationHash(contentOf(content).audioSource))
        fail(409, "A origem de áudio mudou. Prepare outra revisão.");
      hashes.push(conversationHash(actual));
    }
    if (!content.sources.length) return hashes;
    if (!options.sources) return fail(503, "Leitura das fontes indisponível.");
    const catalog = await listRegisteredDocuments(options.catalog, context);
    for (const source of content.sources) {
      const registered = catalog.find(
        (row) =>
          row.documentId === source.documentId && row.documentVersionId === source.documentVersionId
      );
      if (
        !registered ||
        registered.processingStatus !== "ready" ||
        registered.validityStatus !== "confirmed"
      )
        fail(409, "Uma fonte não está disponível e confirmada. Revise a proposta.");
      const page = await options.sources.getAuthorizedPage(context, source);
      if (!page || !page.content.includes(source.excerpt))
        fail(409, "Uma fonte mudou ou não está autorizada. Revise a proposta.");
      hashes.push(conversationHash(page!.content));
    }
    return hashes;
  }
  async function latest(scope: Scope, id: string): Promise<DocumentDraft> {
    let result: DocumentDraft | undefined;
    for (let event = 1; event <= 100; event++) {
      const entry = await options.store.find(scope, key(id, event));
      if (!entry) return result ?? fail(404, "Rascunho indisponível nesta conversa.");
      result = entry.response.draft as DocumentDraft;
    }
    return fail(409, "Limite de revisões atingido. Crie um novo rascunho.");
  }
  async function revalidate(
    context: AuthorizedCondominiumContext,
    draft: DocumentDraft,
    scope: Scope
  ) {
    if (
      conversationHash(await sourceHashes(context, draft, scope)) !==
      conversationHash(draft.sourceHashes)
    )
      fail(409, "O conteúdo da fonte mudou. Prepare outra revisão.");
  }
  async function save(scope: Scope, draft: DocumentDraft, command: unknown, message: string) {
    try {
      const entry = await options.store.append(scope, {
        id: randomUUID(),
        createdAt: options.now().toISOString(),
        requestKey: key(draft.id, draft.event),
        inputHash: conversationHash(command),
        messages: [{ id: randomUUID(), role: "user", kind: "question_answer", text: message }],
        response: { draft },
        metadata: { documentDraftId: draft.id, documentDraftEvent: draft.event }
      });
      return entry.response.draft as DocumentDraft;
    } catch (error) {
      if (error instanceof ConversationStoreError)
        throw new DocumentDraftError(
          error.statusCode,
          error.statusCode === 409
            ? "Outra edição ou confirmação foi salva. Recarregue a versão atual."
            : error.message
        );
      throw error;
    }
  }
  return {
    async read(context: AuthorizedCondominiumContext, scope: Scope, id: string) {
      assertScope(context, scope);
      await options.operations?.check(context, scope, id);
      const draft = await latest(scope, id);
      await revalidate(context, draft, scope);
      await options.operations?.check(context, scope, id);
      return draft;
    },
    async propose(
      context: AuthorizedCondominiumContext,
      scope: Scope,
      id: string,
      raw: unknown,
      expectedEvent: number
    ) {
      assertScope(context, scope);
      if (!Number.isSafeInteger(expectedEvent) || expectedEvent < 0 || expectedEvent > 97)
        fail(400, "Revisão inválida ou limite atingido.");
      validateDraftContent(raw);
      if (expectedEvent === 0 && (await options.store.find(scope, `audio-input:${id}:received`)))
        fail(409, "Identidade já pertence a um áudio. Use outro identificador para o rascunho.");
      if (expectedEvent === 0) await options.operations?.open(context, scope, id);
      else await options.operations?.check(context, scope, id);
      const content = contentOf(raw);
      const previous = expectedEvent
        ? await options.store.find(scope, key(id, expectedEvent))
        : undefined;
      if (expectedEvent && !previous) fail(409, "A revisão anterior não está disponível.");
      const old = previous?.response.draft as DocumentDraft | undefined;
      if (
        old?.authoringSource &&
        conversationHash(contentOf(old).authoringSource) !==
          conversationHash(content.authoringSource ?? null)
      )
        fail(409, "A edição deve preservar a referência da proposta original.");
      const hashes = await sourceHashes(context, content, scope);
      const draft: DocumentDraft = {
        ...content,
        id,
        event: expectedEvent + 1,
        revision: (old?.revision ?? 0) + 1,
        status: "awaiting_confirmation",
        sourceHashes: hashes,
        hash: conversationHash([content, hashes]),
        createdAt: options.now().toISOString()
      };
      // A chave do próximo evento é a comparação atômica, também no PostgreSQL.
      const saved = await save(
        scope,
        draft,
        ["propose", expectedEvent, content, hashes],
        `Salvei a revisão ${draft.revision} do documento “${content.title}” para conferir o texto integral no rascunho.`
      );
      await options.operations?.check(context, scope, id);
      return saved;
    },
    async decide(
      context: AuthorizedCondominiumContext,
      scope: Scope,
      id: string,
      expectedEvent: number,
      hash: string,
      confirm: boolean,
      reviewed: boolean
    ) {
      assertScope(context, scope);
      if (!Number.isSafeInteger(expectedEvent) || expectedEvent < 1 || expectedEvent > 98)
        fail(400, "Revisão inválida.");
      await options.operations?.check(context, scope, id);
      const entry = await options.store.find(scope, key(id, expectedEvent));
      const old = entry?.response.draft as DocumentDraft | undefined;
      if (!old || old.hash !== hash || old.status !== "awaiting_confirmation")
        fail(409, "Confirme a versão exata apresentada para revisão.");
      await revalidate(context, old!, scope);
      if (confirm && !reviewed) fail(400, "Confirme a revisão dos dados e das pendências.");
      if (confirm) {
        try {
          createDraftPdf(old!, old!.revision);
        } catch (error) {
          fail(422, error instanceof Error ? error.message : "Não foi possível renderizar o PDF.");
        }
      }
      const saved = await save(
        scope,
        { ...old!, event: expectedEvent + 1, status: confirm ? "confirmed" : "declined" },
        ["decide", expectedEvent, hash, confirm, reviewed],
        confirm
          ? `Confirmei a revisão ${old!.revision} de “${old!.title}” para gerar o PDF.`
          : `Recusei a proposta “${old!.title}”.`
      );
      await options.operations?.check(context, scope, id);
      return saved;
    },
    async download(context: AuthorizedCondominiumContext, scope: Scope, id: string, hash: string) {
      assertScope(context, scope);
      await options.operations?.check(context, scope, id);
      const draft = await latest(scope, id);
      await revalidate(context, draft, scope);
      if (draft.status !== "confirmed" || draft.hash !== hash)
        fail(409, "Esta revisão não está confirmada. Revise e confirme antes de baixar.");
      const pdf = createDraftPdf(draft, draft.revision);
      await options.operations?.check(context, scope, id);
      return pdf;
    },
    async export(context: AuthorizedCondominiumContext, scope: Scope, id: string) {
      assertScope(context, scope);
      await this.read(context, scope, id);
      if (!options.operations) fail(503, "Exportação operacional de derivados indisponível.");
      const exported = await options.operations!.export(context, scope, id);
      for (const entry of exported.entries) {
        const historical = entry.response.draft as DocumentDraft | undefined;
        if (historical) {
          validateDraftContent(historical);
          await options.operations!.check(context, scope, historical.id);
          await revalidate(context, historical, scope);
        }
      }
      await options.operations!.check(context, scope, id);
      return exported;
    },
    async purge(context: AuthorizedCondominiumContext, scope: Scope, id: string) {
      assertScope(context, scope);
      if (!options.operations) fail(503, "Exclusão operacional de derivados indisponível.");
      await options.operations!.purge(context, scope, id);
    }
  };
}
