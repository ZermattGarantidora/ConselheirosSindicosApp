import { it, expect } from "vitest";
import { randomUUID } from "node:crypto";
import { mkdtemp, rm } from "node:fs/promises";
import { join, resolve, dirname, basename } from "node:path";
import { tmpdir } from "node:os";
import { createApi, type CreateApiOptions } from "../../apps/api/app/create-api.js";
import {
  createInMemoryConversationStore,
  type ConversationScope
} from "../../apps/api/answers/conversation-store.js";
import { createApiOperationControl } from "../../apps/api/app/operation-control.js";
import { createLocalOperationBudgetStore } from "../../apps/api/security/local-operation-budget-store.js";
import { budgetDigest } from "../../apps/api/security/operation-budget.js";
import type { JournalReplayProof } from "../../apps/api/app/journal-replay-proof.js";
async function removeValidityDirectory(directory: string) {
  if (
    resolve(dirname(directory)) !== resolve(tmpdir()) ||
    !basename(directory).startsWith("alvitra-question-validity-")
  )
    throw Error("Temporário fora do escopo");
  await rm(directory, { recursive: true, force: true });
}
it.each(
  [
    ...["confirmed", "pending", "disputed", "superseded"].map((nextStatus) => ({
      initial: "confirmed",
      nextStatus,
      mode: "grounded",
      changePage: false,
      expected: nextStatus === "confirmed" ? 200 : 403
    })),
    {
      initial: "pending",
      nextStatus: "pending",
      mode: "conflict",
      changePage: false,
      expected: 200
    },
    {
      initial: "pending",
      nextStatus: "disputed",
      mode: "conflict",
      changePage: false,
      expected: 403
    },
    {
      initial: "confirmed",
      nextStatus: "confirmed",
      mode: "grounded",
      changePage: true,
      expected: 403
    },
    {
      initial: "pending",
      nextStatus: "pending",
      mode: "conflict",
      changePage: true,
      expected: 403
    },
    {
      initial: "confirmed",
      nextStatus: "confirmed",
      mode: "grounded",
      changePage: false,
      missingPageProof: true,
      expected: 403
    }
  ].map((scenario) => ({ missingPageProof: false, ...scenario }))
)(
  "AC-7125: $mode/$nextStatus/página alterada=$changePage/prova ausente=$missingPageProof preserva histórico",
  async ({ initial, nextStatus, mode, changePage, missingPageProof, expected }) => {
    const userId = randomUUID(),
      condominiumId = randomUUID(),
      documentId = randomUUID(),
      documentVersionId = randomUUID(),
      text = "Convenção FICTÍCIA: o mandato dura dois anos.";
    const directory = await mkdtemp(join(tmpdir(), "alvitra-question-validity-"));
    let validityStatus = initial,
      calls = 0;
    let pageContent = text;
    const catalog = {
      condominiumId,
      documentId,
      documentVersionId,
      title: "FICTÍCIO.pdf",
      documentType: "convention",
      versionNumber: 1,
      sizeBytes: 100,
      processingStatus: "ready",
      validityStatus,
      createdAt: "2026-11-11T12:00:00.000Z",
      expectedPageCount: 1,
      processedPageCount: 1,
      searchablePageCount: 1,
      unreadablePageNumbers: [],
      extractionCompleteness: 1,
      extractionMethod: "pdf_text",
      ocrQualityScore: null
    };
    const answer = {
      answerId: randomUUID(),
      questionId: randomUUID(),
      condominiumId,
      riskClass: "low",
      createdAt: new Date("2026-11-11T12:00:00.000Z"),
      answer:
        mode === "grounded"
          ? "O mandato é de dois anos."
          : "O documento está com vigência pendente; confirme antes de aplicar a regra.",
      answerMode: mode,
      citations: [
        {
          id: randomUUID(),
          evidenceId: randomUUID(),
          documentId,
          documentVersionId,
          title: catalog.title,
          page: 1,
          excerpt: text,
          startOffset: 0,
          endOffset: Array.from(text).length,
          sourceScope: "condominium",
          sourceRemoved: false
        }
      ],
      attentionPoints: [],
      suggestedNextStep: null,
      specialist: { required: false, type: null, reason: null }
    };
    const revision = budgetDigest("fixture-policy");
    const store = createInMemoryConversationStore();
    const app = createApi({
      membershipRepository: {
        findMembership: async (input: { userId: string; condominiumId: string }) => ({
          ...input,
          roleKey: "manager",
          status: "active",
          validFrom: new Date("2026-01-01"),
          revision: "fixture-membership"
        })
      },
      conversationStore: {
        ...store,
        async find(scope: ConversationScope, key: string) {
          const entry = await store.find(scope, key);
          if (!entry || !missingPageProof) return entry;
          return {
            ...entry,
            metadata: {
              ...entry.metadata,
              replayProof: {
                ...(entry.metadata.replayProof as JournalReplayProof),
                sourcePages: undefined
              }
            }
          };
        }
      },
      documentCatalogRepository: { listAuthorized: async () => [{ ...catalog, validityStatus }] },
      documentSourceReader: {
        getAuthorizedPage: async () => ({
          documentId,
          documentVersionId,
          title: catalog.title,
          page: 1,
          content: pageContent
        })
      },
      answerUseCase: {
        // O contrato de comparação pendente exige a resposta validada persistida,
        // inclusive suas claims; o journal não confia só no payload HTTP.
        findValidatedAnswer: async (
          context: { userId: string; condominiumId: string },
          id: string
        ) =>
          context.userId === userId &&
          context.condominiumId === condominiumId &&
          id === answer.answerId
            ? {
                ...answer,
                userId,
                validationStatus: "passed",
                claims: [
                  {
                    id: randomUUID(),
                    statement: answer.answer,
                    claimType: mode === "conflict" ? "interpretation" : "condominium_fact",
                    evidenceRequired: true,
                    citationEvidenceIds: [answer.citations[0]!.evidenceId]
                  }
                ]
              }
            : undefined,
        ask: async () => {
          calls++;
          return answer;
        },
        listConversationHistory: async () => [],
        submitFeedback: async () => {
          throw Error("unused");
        }
      },
      operationControl: createApiOperationControl({
        store: createLocalOperationBudgetStore({
          directory,
          confirmation: "synthetic-only",
          policy: {
            enabled: true,
            revision,
            currency: "USD",
            scopeDailyCost: 100,
            globalDailyCost: 100,
            scopeDailyOperations: 10,
            globalDailyOperations: 10,
            scopeConcurrent: 2,
            globalConcurrent: 2
          }
        }),
        policyRevision: revision,
        maximumCostMicrounits: { question: 10, setup: 10, upload: 0 },
        authorize: async () => true
      })
    } as unknown as CreateApiOptions);
    try {
      const request = {
        method: "POST" as const,
        url: `/v1/condominiums/${condominiumId}/questions`,
        headers: {
          "x-development-user-id": userId,
          "x-conversation-request-id": "synthetic-validity-replay"
        },
        payload: { question: "Qual é a duração do mandato?" }
      };
      const first = await app.inject(request);
      expect(first.statusCode).toBe(200);
      validityStatus = nextStatus;
      if (changePage)
        pageContent += "\nRETIFICAÇÃO FICTÍCIA: confira também as regras posteriores.";
      const replay = await app.inject(request);
      const proof = {
        firstStatus: first.statusCode,
        replayStatus: replay.statusCode,
        sameResponse: first.body === replay.body,
        generatedCalls: calls,
        validityBefore: initial,
        validityAfter: validityStatus,
        externalCalls: 0,
        activationAuthorized: false
      };
      console.info(JSON.stringify(proof));
      expect(replay.statusCode).toBe(expected);
      expect(calls).toBe(1);
      const history = await app.inject({
        method: "GET",
        url: `/v1/condominiums/${condominiumId}/chats/00000000-0000-4000-8000-000000000000/messages`,
        headers: request.headers
      });
      expect(history.statusCode).toBe(200);
      expect(history.body).toContain(answer.answer);
    } finally {
      await app.close();
      await removeValidityDirectory(directory);
    }
  }
);
