import { randomUUID } from "node:crypto";
import type { ConversationScope, ConversationStore } from "../answers/conversation-store.js";
import type { DocumentCatalogRepository } from "../documents/document-catalog.js";
import { listRegisteredDocuments } from "../documents/document-catalog.js";
import type { DocumentSourceReader } from "../documents/document-source.js";
import {
  AccessDeniedError,
  type AuthorizedCondominiumContext
} from "../identity/authorized-condominium-context.js";
import type { DocumentDraftContent } from "../../shared/document-draft.js";
import {
  documentAuthoringVersion,
  type DocumentAuthoringRequest,
  type DocumentAuthoringSource,
  type DocumentProposal,
  type DocumentAuthoringReference
} from "../../shared/document-proposal.js";
import {
  authoringHash,
  authoringInvalid,
  authoringLimits,
  validateAuthoringRequest,
  validateDocumentPlan,
  validateDocumentReview
} from "./document-authoring-contract.js";
import { DocumentDraftError, type createDocumentDraftService } from "./document-drafts.js";
import type { AuthoringOperations } from "./authoring-operations.js";
import {
  originalIsUnchanged,
  validateOriginalImprovement
} from "./original-document-improvements.js";
type Scope = Extract<ConversationScope, { kind: "chat" }>;
export interface DocumentAuthoringModel {
  readonly enabled: boolean;
  readonly key: string;
  complete(
    input: Readonly<{
      phase: "write" | "review";
      operationId: string;
      scope: Scope;
      data: Readonly<Record<string, unknown>>;
      signal: AbortSignal;
    }>
  ): Promise<unknown>;
}
type Packet = {
  request: DocumentAuthoringRequest;
  sources: readonly DocumentAuthoringSource[];
  sourceHash: string;
  modelKey: string;
  trigger?: "original_analysis";
};
export function createDocumentAuthoringService(options: {
  store: ConversationStore;
  catalog: DocumentCatalogRepository;
  sources?: DocumentSourceReader;
  drafts: ReturnType<typeof createDocumentDraftService>;
  model?: DocumentAuthoringModel;
  operations?: AuthoringOperations;
  now: () => Date;
  authorize: (
    context: AuthorizedCondominiumContext,
    scope: Scope
  ) => Promise<AuthorizedCondominiumContext>;
  timeoutMs?: number;
}) {
  const timeoutMs = options.timeoutMs ?? 30000;
  if (!Number.isSafeInteger(timeoutMs) || timeoutMs < 1 || timeoutMs > 60000)
    throw new Error("Prazo de redação inválido.");
  async function actor(context: AuthorizedCondominiumContext, scope: Scope) {
    const current = await options.authorize(context, scope);
    if (
      current.userId !== scope.userId ||
      current.condominiumId !== scope.condominiumId ||
      !current.permissions.includes("document:read") ||
      !current.permissions.includes("document:upload")
    )
      throw new AccessDeniedError();
    return current;
  }
  async function collect(context: AuthorizedCondominiumContext, request: DocumentAuthoringRequest) {
    const catalog = await listRegisteredDocuments(options.catalog, context),
      sources: DocumentAuthoringSource[] = [];
    let total = 0;
    const documents = new Set<string>();
    for (const version of request.documentVersionIds) {
      const document = catalog.find((d) => d.documentVersionId === version);
      if (!document) throw new DocumentDraftError(404, "Fonte indisponível neste condomínio.");
      if (documents.has(document.documentId))
        throw new DocumentDraftError(
          409,
          "Há versões do mesmo documento no pedido. Confira o conflito e selecione a versão adequada explicitamente."
        );
      documents.add(document.documentId);
      const count = document.expectedPageCount;
      if (
        document.processingStatus !== "ready" ||
        document.validityStatus !== "confirmed" ||
        !count ||
        count < 1 ||
        !Number.isSafeInteger(count) ||
        document.processedPageCount !== count ||
        document.searchablePageCount !== count ||
        document.extractionCompleteness !== 1 ||
        document.unreadablePageNumbers.length
      )
        authoringInvalid(
          "A revisão integral exige leitura completa e versão confirmada. Confira o original."
        );
      if (sources.length + count + (request.report ? 1 : 0) > authoringLimits.sources)
        authoringInvalid(
          "O pedido excede vinte páginas/blocos. Delimite o material; nada foi cortado."
        );
      if (!options.sources) throw new DocumentDraftError(503, "Leitura das fontes indisponível.");
      for (let page = 1; page <= count; page++) {
        const source = await options.sources.getAuthorizedPage(context, {
          documentId: document.documentId,
          documentVersionId: version,
          page
        });
        if (
          !source ||
          source.documentId !== document.documentId ||
          source.documentVersionId !== version ||
          source.page !== page ||
          !source.content.trim()
        )
          throw new DocumentDraftError(
            409,
            "Uma página/bloco não está disponível para conferência."
          );
        total += source.content.length;
        if (total > authoringLimits.sourceCharacters)
          authoringInvalid(
            "As fontes excedem oitenta mil caracteres. Nenhum trecho foi descartado."
          );
        sources.push({
          id: `document:${version}:${page}`,
          kind: "document",
          title: document.title,
          text: source.content,
          documentId: document.documentId,
          documentVersionId: version,
          page,
          documentType: document.documentType
        });
      }
    }
    if (request.report)
      sources.push({
        id: "user-report",
        kind: "user_report",
        title: "Relato declarado pelo síndico; sujeito à conferência",
        text: request.report
      });
    return sources;
  }
  async function append(
    scope: Scope,
    id: string,
    phase: string,
    hash: string,
    response: Record<string, unknown>,
    message: string,
    role: "assistant" | "user" = "user",
    entryId = randomUUID(),
    internal = false
  ) {
    return options.store.append(scope, {
      id: entryId,
      createdAt: options.now().toISOString(),
      requestKey: `document-authoring:${id}:${phase}`,
      inputHash: hash,
      messages: [{ id: randomUUID(), role, kind: "question_answer", text: message }],
      response,
      metadata: {
        documentAuthoringId: id,
        documentDraftId: id,
        ...(internal ? { internalAuthoring: true } : {})
      }
    });
  }
  async function packet(
    context: AuthorizedCondominiumContext,
    scope: Scope,
    id: string
  ): Promise<Packet> {
    await options.operations?.check(context, scope, id);
    const current = await actor(context, scope),
      entry = await options.store.find(scope, `document-authoring:${id}:request`);
    if (!entry || entry.response.status !== "requested")
      throw new DocumentDraftError(404, "Pedido documental indisponível.");
    const saved = entry.response.packet as Packet;
    validateAuthoringRequest(saved?.request);
    if (
      !Array.isArray(saved.sources) ||
      typeof saved.modelKey !== "string" ||
      !saved.modelKey.trim()
    )
      throw new DocumentDraftError(409, "Recibo documental incompleto.");
    if (
      entry.inputHash !== authoringHash([documentAuthoringVersion, saved.request]) ||
      saved.sourceHash !== authoringHash(saved.sources)
    )
      throw new DocumentDraftError(409, "O recibo da origem documental mudou.");
    const fresh = await collect(current, saved.request);
    if (authoringHash(fresh) !== saved.sourceHash)
      throw new DocumentDraftError(
        409,
        "Uma fonte mudou. Prepare outra proposta para conferir a versão atual."
      );
    return saved;
  }
  async function read(
    context: AuthorizedCondominiumContext,
    scope: Scope,
    id: string
  ): Promise<DocumentProposal> {
    const input = await packet(context, scope, id),
      result = await options.store.find(scope, `document-authoring:${id}:proposal`);
    if (!result)
      throw new DocumentDraftError(
        404,
        "A proposta ainda não está disponível. Recupere o mesmo pedido."
      );
    const proposal = result.response.proposal as DocumentProposal;
    const plan = validateDocumentPlan(proposal?.plan, input.request, input.sources);
    if (input.trigger === "original_analysis") validateOriginalImprovement(plan, input.sources);
    if (
      proposal.id !== id ||
      proposal.sourceHash !== input.sourceHash ||
      proposal.hash !== authoringHash([documentAuthoringVersion, id, input.sourceHash, plan])
    )
      throw new DocumentDraftError(409, "Proposta incompatível com o recibo da origem.");
    const decision = await options.store.find(scope, `document-authoring:${id}:decision`);
    await options.operations?.check(context, scope, id);
    if (
      decision &&
      (!["accepted", "declined"].includes(String(decision.response.status)) ||
        decision.inputHash !==
          authoringHash([proposal.hash, decision.response.status === "accepted"]))
    )
      throw new DocumentDraftError(409, "Recibo de decisão incompatível com a proposta.");
    return {
      ...proposal,
      sources: input.sources,
      ...(input.trigger ? { trigger: input.trigger } : {}),
      status:
        plan.status === "needs_context"
          ? "needs_context"
          : input.trigger === "original_analysis" && originalIsUnchanged(plan, input.sources)
            ? "unchanged"
            : ((decision?.response.status as "accepted" | "declined" | undefined) ?? "offered")
    };
  }
  const referenceOf = (p: DocumentProposal): DocumentAuthoringReference => ({
    proposalId: p.id,
    proposalHash: p.hash,
    sourceHash: p.sourceHash,
    hasUserReport: p.sources.some((s) => s.kind === "user_report")
  });
  function contentOf(proposal: DocumentProposal): DocumentDraftContent {
    const { plan } = proposal,
      sourceMap = new Map(proposal.sources.map((s) => [s.id, s]));
    const references = [
      ...plan.paragraphs.flatMap((p) => p.references),
      ...plan.changes.flatMap((c) => [...(c.before ? [c.before] : []), ...c.references])
    ];
    const uniqueReferences = [
      ...new Map(
        references
          .filter((r) => sourceMap.get(r.sourceId)?.kind === "document")
          .map((r) => [authoringHash(r), r])
      ).values()
    ];
    return {
      title: plan.title,
      documentKind: plan.documentKind,
      operation: plan.operation,
      text: plan.paragraphs.map((p) => p.text).join("\n\n"),
      sources: uniqueReferences.map((r) => {
        const s = sourceMap.get(r.sourceId)!;
        return {
          documentId: s.documentId!,
          documentVersionId: s.documentVersionId!,
          page: s.page!,
          excerpt: r.quote
        };
      }),
      changes: `${plan.changes.length} alteração(ões) fundamentada(s). Antes/depois e justificativas estão na proposta ${proposal.id}.`,
      pending: [
        ...plan.pending,
        ...(plan.requiresSpecialist
          ? ["Conferir esta proposta com assessoria especializada antes de usar."]
          : []),
        ...(proposal.sources.some((s) => s.kind === "user_report")
          ? ["Relato declarado pelo usuário; não comprova fatos, aprovação ou vigência documental."]
          : [])
      ].join("\n"),
      authoringSource: referenceOf(proposal)
    };
  }
  const service = {
    async original(
      context: AuthorizedCondominiumContext,
      scope: Scope,
      versions: readonly string[],
      expectedSources?: readonly { version: string; page: number; text: string }[]
    ): Promise<DocumentProposal | undefined> {
      const current = await actor(context, scope);
      if (versions.length !== 1)
        throw new DocumentDraftError(
          409,
          "Selecione um único original para avaliar melhorias; nenhuma origem foi escolhida automaticamente."
        );
      if (!options.model?.enabled) return undefined;
      const catalog = await listRegisteredDocuments(options.catalog, current);
      const document = catalog.find((d) => d.documentVersionId === versions[0]);
      if (!document) throw new DocumentDraftError(404, "Original indisponível.");
      const request: DocumentAuthoringRequest = {
        title: document.title,
        documentKind: "Cópia revisada",
        operation: "improve",
        request:
          "Avalie somente a organização de espaços e quebras do original após sua análise. Preserve integralmente palavras, pontuação, números e ordem de todos os blocos. Apresente antes/depois e pergunte se deseja conferir um rascunho. Se não houver melhoria, preserve o texto idêntico e explique; se faltar base, peça contexto. Não crie arquivo.",
        report: "",
        documentVersionIds: [...versions]
      };
      validateAuthoringRequest(request);
      const sources = await collect(current, request);
      if (sources.some((s) => s.text.length > 1000))
        authoringInvalid(
          "A oferta automática exige blocos de até mil caracteres para mostrar o antes integral. Nenhum bloco foi cortado; peça revisão explícita de escopo menor."
        );
      if (
        expectedSources &&
        authoringHash(
          sources.map((s) => ({ version: s.documentVersionId, page: s.page, text: s.text }))
        ) !== authoringHash(expectedSources)
      )
        throw new DocumentDraftError(
          409,
          "O original mudou desde a análise. Refaça a análise antes de avaliar melhorias."
        );
      const digest = authoringHash([
        "original-improvement-v1",
        scope,
        versions,
        sources.map((s) => ({ version: s.documentVersionId, page: s.page, text: s.text }))
      ]);
      const id = `${digest.slice(0, 8)}-${digest.slice(8, 12)}-4${digest.slice(13, 16)}-a${digest.slice(17, 20)}-${digest.slice(20, 32)}`;
      return service.prepare(
        current,
        scope,
        id,
        request,
        undefined,
        "original_analysis",
        authoringHash(sources)
      );
    },
    enabled: options.model?.enabled === true,
    async available(context: AuthorizedCondominiumContext, scope: Scope) {
      const current = await actor(context, scope);
      return {
        enabled: options.model?.enabled === true,
        documents: (await listRegisteredDocuments(options.catalog, current))
          .filter((d) => d.processingStatus === "ready" && d.validityStatus === "confirmed")
          .map((d) => ({
            documentVersionId: d.documentVersionId,
            title: d.title,
            documentType: d.documentType
          })),
        limits: authoringLimits
      };
    },
    read,
    async export(context: AuthorizedCondominiumContext, scope: Scope, id: string) {
      await read(context, scope, id);
      if (!options.operations)
        throw new DocumentDraftError(503, "Exportação operacional indisponível.");
      const exported = await options.operations.export(context, scope, id);
      const ids = new Set(
        exported.entries
          .map((e) => (e.response.draft as { id?: string } | undefined)?.id)
          .filter((v): v is string => typeof v === "string")
      );
      for (const child of ids) await options.drafts.export(context, scope, child);
      await options.operations.check(context, scope, id);
      return exported;
    },
    async purge(context: AuthorizedCondominiumContext, scope: Scope, id: string) {
      await actor(context, scope);
      if (!options.operations)
        throw new DocumentDraftError(503, "Exclusão operacional indisponível.");
      await options.operations.purge(context, scope, id);
    },
    async recent(context: AuthorizedCondominiumContext, scope: Scope, before?: string) {
      await actor(context, scope);
      const page = await options.store.list(scope, 50, before);
      const ids = [
          ...new Set(
            page.entries
              .filter((e) => e.metadata.documentAuthoringId && e.requestKey.endsWith(":proposal"))
              .map((e) => String(e.metadata.documentAuthoringId))
          )
        ],
        proposals = [];
      for (const id of ids) {
        try {
          proposals.push(await read(context, scope, id));
        } catch (error) {
          if (!(error instanceof DocumentDraftError) || ![404, 409, 422].includes(error.statusCode))
            throw error;
        }
      }
      return { proposals, nextCursor: page.nextCursor };
    },
    async reference(context: AuthorizedCondominiumContext, scope: Scope, id: string) {
      const proposal = await read(context, scope, id);
      if (proposal.status !== "accepted")
        throw new DocumentDraftError(409, "A origem exige uma proposta aceita pelo usuário.");
      return referenceOf(proposal);
    },
    async prepare(
      context: AuthorizedCondominiumContext,
      scope: Scope,
      id: string,
      raw: unknown,
      signal?: AbortSignal,
      trigger?: "original_analysis",
      expectedSourceHash?: string
    ): Promise<DocumentProposal> {
      validateAuthoringRequest(raw);
      const request = structuredClone(raw),
        current = await actor(context, scope),
        commandHash = authoringHash([documentAuthoringVersion, request]);
      const existing = await options.store.find(scope, `document-authoring:${id}:request`);
      if (!existing && (await options.store.find(scope, `audio-input:${id}:received`)))
        throw new DocumentDraftError(
          409,
          "Identidade já pertence a um áudio. Use outra identidade para a proposta."
        );
      if (existing) await options.operations?.check(current, scope, id);
      else await options.operations?.open(current, scope, id);
      if (existing && existing.inputHash !== commandHash)
        throw new DocumentDraftError(
          409,
          "Este identificador pertence a outro pedido. Use o mesmo pedido para retomar."
        );
      if (existing && (existing.response.packet as Packet)?.trigger !== trigger)
        throw new DocumentDraftError(409, "A identidade pertence a outro modo de proposta.");
      if (!existing) {
        if (!options.model?.enabled)
          throw new DocumentDraftError(
            503,
            "Redação documental não habilitada. Nenhuma proposta foi fabricada."
          );
        const sources = await collect(current, request),
          snapshot: Packet = {
            request,
            sources,
            sourceHash: authoringHash(sources),
            modelKey: options.model.key,
            ...(trigger ? { trigger } : {})
          };
        if (trigger && snapshot.sourceHash !== expectedSourceHash)
          throw new DocumentDraftError(
            409,
            "O original mudou entre análise e preparação. Nenhuma avaliação foi enviada."
          );
        if (Buffer.byteLength(JSON.stringify(snapshot)) > 150000)
          authoringInvalid("O conjunto excede o limite do recibo; nenhum trecho foi cortado.");
        await append(
          scope,
          id,
          "request",
          commandHash,
          { status: "requested", packet: snapshot },
          request.request,
          "user",
          undefined,
          trigger === "original_analysis"
        );
      }
      const input = await packet(context, scope, id);
      const proposal = await options.store.find(scope, `document-authoring:${id}:proposal`);
      if (proposal) return read(context, scope, id);
      async function phase<T>(
        name: "write" | "review",
        data: Record<string, unknown>,
        validate: (v: unknown) => T
      ): Promise<T> {
        const hash = authoringHash([documentAuthoringVersion, input.modelKey, name, data]);
        if (Buffer.byteLength(JSON.stringify(data)) > authoringLimits.requestBytes)
          authoringInvalid("A etapa excede o limite integral; nenhum subconjunto foi enviado.");
        const saved = await options.store.find(scope, `document-authoring:${id}:${name}-result`);
        if (saved) {
          if (saved.inputHash !== hash)
            throw new DocumentDraftError(409, "Recibo de redação incompatível.");
          if (saved.response.status !== "completed")
            authoringInvalid("Esta proposta foi rejeitada pela conferência.");
          return validate(saved.response.value);
        }
        if (!options.model?.enabled || options.model.key !== input.modelKey)
          throw new DocumentDraftError(
            503,
            "Redator/conferente original indisponível. Nenhum fallback foi executado."
          );
        signal?.throwIfAborted();
        await packet(context, scope, id);
        const execute = async (): Promise<T> => {
          const claimId = randomUUID(),
            claim = await append(
              scope,
              id,
              `${name}-dispatch`,
              hash,
              { status: "started", modelKey: input.modelKey },
              name === "write"
                ? "Solicitei a redação documental fundamentada."
                : "Solicitei a conferência da proposta contra todas as fontes.",
              "user",
              claimId,
              input.trigger === "original_analysis"
            );
          if (claim.id !== claimId)
            throw new DocumentDraftError(
              503,
              "A etapa já iniciou e aguarda resultado ou reconciliação. Nenhuma nova chamada foi feita."
            );
          const controller = new AbortController(),
            abort = () => controller.abort();
          signal?.addEventListener("abort", abort, { once: true });
          let timer: ReturnType<typeof setTimeout> | undefined;
          let value: T;
          try {
            const timeout = new Promise<never>((_, reject) => {
              timer = setTimeout(() => {
                controller.abort();
                reject(new Error("timeout"));
              }, timeoutMs);
            });
            const output = await Promise.race([
              options.model!.complete({
                phase: name,
                operationId: authoringHash([scope, id, name]),
                scope: structuredClone(scope),
                data: structuredClone(data),
                signal: controller.signal
              }),
              timeout
            ]);
            signal?.throwIfAborted();
            value = validate(output);
            await packet(context, scope, id);
          } catch (error) {
            if (error instanceof DocumentDraftError && error.statusCode === 422) {
              await append(
                scope,
                id,
                `${name}-result`,
                hash,
                { status: "rejected" },
                "A proposta solicitada foi rejeitada pelos controles de conferência.",
                "user",
                undefined,
                input.trigger === "original_analysis"
              );
              throw error;
            }
            if (error instanceof AccessDeniedError || error instanceof DocumentDraftError)
              throw error;
            throw new DocumentDraftError(
              503,
              "A redação/conferência não tem resultado confirmado. Recupere o mesmo pedido; não haverá envio automático adicional."
            );
          } finally {
            if (timer) clearTimeout(timer);
            signal?.removeEventListener("abort", abort);
          }
          await append(
            scope,
            id,
            `${name}-result`,
            hash,
            { status: "completed", value },
            name === "write"
              ? "Recebi o plano documental para conferência."
              : "Recebi a conferência da proposta documental.",
            "user",
            undefined,
            input.trigger === "original_analysis"
          );
          return value;
        };
        return options.operations
          ? options.operations.run(
              context,
              scope,
              id,
              name === "write" ? "document_write" : "document_review",
              name,
              hash,
              execute
            )
          : execute();
      }
      const data = {
        version: documentAuthoringVersion,
        request: input.request,
        sources: input.sources,
        sourceHash: input.sourceHash,
        untrustedData: true,
        ...(input.trigger ? { trigger: input.trigger } : {})
      };
      const plan = await phase("write", data, (v) => {
        const plan = validateDocumentPlan(v, input.request, input.sources);
        if (input.trigger) validateOriginalImprovement(plan, input.sources);
        return plan;
      });
      await phase("review", { ...data, plan, planHash: authoringHash(plan) }, (v) =>
        validateDocumentReview(v, plan, input.sources, input.sourceHash)
      );
      await packet(context, scope, id);
      const result: DocumentProposal = {
        id,
        hash: authoringHash([documentAuthoringVersion, id, input.sourceHash, plan]),
        sourceHash: input.sourceHash,
        plan,
        sources: input.sources,
        status: plan.status === "needs_context" ? "needs_context" : "offered"
      };
      await append(
        scope,
        id,
        "proposal",
        commandHash,
        { proposal: { ...result, sources: undefined } },
        plan.message,
        "assistant"
      );
      return read(context, scope, id);
    },
    async decide(
      context: AuthorizedCondominiumContext,
      scope: Scope,
      id: string,
      hash: string,
      accept: boolean
    ) {
      const proposal = await read(context, scope, id),
        current = await actor(context, scope);
      if (proposal.hash !== hash || ["needs_context", "unchanged"].includes(proposal.status))
        throw new DocumentDraftError(409, "Esta proposta não está pronta ou seu hash mudou.");
      if (proposal.status === (accept ? "declined" : "accepted"))
        throw new DocumentDraftError(409, "A proposta já recebeu outra decisão.");
      await append(
        scope,
        id,
        "decision",
        authoringHash([hash, accept]),
        { status: accept ? "accepted" : "declined" },
        accept
          ? "Aceitei a proposta documental para conferir o rascunho, sem confirmar PDF."
          : "Recusei a proposta documental."
      );
      if (!accept) return { proposal: { ...proposal, status: "declined" as const } };
      const existing = await options.store.find(scope, `document-draft:${id}:1`);
      if (existing) {
        const first = existing.response.draft as DocumentDraftContent;
        if (
          !first?.authoringSource ||
          authoringHash(first.authoringSource) !== authoringHash(referenceOf(proposal))
        )
          throw new DocumentDraftError(
            409,
            "Já existe outro rascunho com esta identidade. Nenhum texto foi sobrescrito."
          );
        return {
          proposal: { ...proposal, status: "accepted" as const },
          draft: await options.drafts.read(current, scope, id)
        };
      }
      return {
        proposal: { ...proposal, status: "accepted" as const },
        draft: await options.drafts.propose(current, scope, id, contentOf(proposal), 0)
      };
    }
  };
  return service;
}
