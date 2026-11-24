import { randomUUID } from "node:crypto";
import { createApi } from "../../apps/api/app/create-api.js";
import { createInMemoryConversationStore } from "../../apps/api/answers/conversation-store.js";
import { createInMemoryChatRepository } from "../../apps/api/chats/chat-repository.js";
import { createDevelopmentIdentityRepository } from "../../apps/api/identity/development-identity-repository.js";
import {
  syntheticAuthoringDocument,
  syntheticDocumentAuthoringModel,
  syntheticDocumentPlan
} from "./document-authoring.js";
import type {
  DocumentAuthoringRequest,
  DocumentAuthoringSource,
  DocumentProposalPlan
} from "../../apps/shared/document-proposal.js";
import { createAnswerTelemetry } from "../unit/answer-use-case.test-support.js";

export function originalDocumentFixture() {
  const original = "FICTÍCIO.  Para usar o salão, solicite reserva com antecedência de 24 horas.";
  const store = createInMemoryConversationStore(),
    chats = createInMemoryChatRepository();
  let source = original,
    visible = true,
    complete = true,
    syntheticEnabled = true;
  let writing = 0,
    reviews = 0,
    summaries = 0;
  let transform = (plan: DocumentProposalPlan) => plan;
  let afterCall = async () => {};
  type Options = Parameters<typeof createApi>[0];
  const options: { -readonly [K in keyof Options]: Options[K] } = {
    membershipRepository: createDevelopmentIdentityRepository(),
    conversationStore: store,
    chatRepository: chats,
    syntheticOriginalImprovements: true,
    documentCatalogRepository: {
      listAuthorized: async (context) =>
        visible
          ? [{ ...syntheticAuthoringDocument(context), extractionCompleteness: complete ? 1 : 0.5 }]
          : []
    },
    documentSourceReader: {
      getAuthorizedPage: async () => ({
        documentId: "synthetic-document",
        documentVersionId: "synthetic-version",
        title: "FICTÍCIO. Regimento",
        page: 1,
        content: source
      })
    },
    documentAnalysisReader: {
      readAuthorized: async (context, versions) =>
        versions.map((version) => ({
          condominiumId: context.condominiumId,
          documentId: "synthetic-document",
          documentVersionId: version,
          documentTitle: "FICTÍCIO. Regimento",
          pages: [
            { pageNumber: 1, extractedText: source, extractionMethod: "pdf_text", qualityScore: 1 }
          ]
        }))
    },
    codexDocumentBatchGateway: {
      generate: async (input) => {
        summaries++;
        const s = input.evidence[0]!;
        return {
          output: {
            answer: "O regimento fictício pede reserva do salão com antecedência de 24 horas.",
            answerMode: "grounded",
            citations: [
              {
                evidenceId: s.id,
                documentId: s.documentId,
                documentVersionId: s.documentVersionId,
                title: s.documentTitle,
                page: s.pageNumber,
                excerpt: s.content
              }
            ],
            attentionPoints: [],
            suggestedNextStep: null,
            specialist: {
              required: true,
              type: "advogado",
              reason: "Confira a interpretação antes de usar."
            },
            claims: [
              {
                statement: "A reserva exige antecedência de 24 horas.",
                claimType: "interpretation",
                evidenceRequired: true,
                citationEvidenceIds: [s.id]
              }
            ]
          },
          telemetry: createAnswerTelemetry()
        };
      }
    },
    documentAuthoringModel: syntheticDocumentAuthoringModel(async (input) => {
      if (input.phase === "write") writing++;
      else reviews++;
      if (!syntheticEnabled) throw new Error("synthetic uncertain dispatch");
      if (input.phase === "review") {
        await afterCall();
        return;
      }
      const data = input.data as {
        request: DocumentAuthoringRequest;
        sources: DocumentAuthoringSource[];
      };
      const base = syntheticDocumentPlan(data.request, data.sources);
      const paragraphs = base.paragraphs.map((p, i) => ({
        ...p,
        text: data.sources[i]!.text.replace(/ {2,}/gu, " ")
      }));
      await afterCall();
      return transform({
        ...base,
        message: paragraphs.every((p, i) => p.text === data.sources[i]!.text)
          ? "A organização deste original já está adequada; não há mudança a oferecer."
          : "Posso organizar o espaçamento do regimento sem alterar suas regras. Quer conferir um rascunho com essa mudança?",
        paragraphs,
        changes: base.changes.map((c, i) => ({ ...c, after: paragraphs[i]!.text }))
      });
    })
  };
  return {
    options,
    store,
    chats,
    original,
    app: () => createApi(options),
    counts: () => ({ writing, reviews, summaries }),
    setSource: (text: string) => {
      source = text;
    },
    source: () => source,
    hide: () => {
      visible = false;
    },
    incomplete: () => {
      complete = false;
    },
    uncertain: () => {
      syntheticEnabled = false;
    },
    transform: (fn: typeof transform) => {
      transform = fn;
    },
    afterCall: (fn: typeof afterCall) => {
      afterCall = fn;
    }
  };
}
export const originalHeaders = { "x-development-user-id": "sindico-demo" };
export async function originalChat(app: ReturnType<typeof createApi>, id = randomUUID()) {
  const response = await app.inject({
    method: "POST",
    url: "/v1/condominiums/alameda/chats",
    headers: originalHeaders,
    payload: { id, title: "FICTÍCIO. Original" }
  });
  if (response.statusCode !== 201) throw new Error(response.body);
  return id;
}
export function originalAnalysis(
  app: ReturnType<typeof createApi>,
  chat: string,
  extra: Record<string, string> = {}
) {
  return app.inject({
    method: "POST",
    url: "/v1/condominiums/alameda/documents/conversation",
    headers: { ...originalHeaders, "x-chat-id": chat, ...extra },
    payload: { documentVersionIds: ["synthetic-version"] }
  });
}
