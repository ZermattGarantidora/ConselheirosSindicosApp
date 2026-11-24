import { readFile } from "node:fs/promises";
import { join } from "node:path";
import { randomUUID } from "node:crypto";
import { createApi } from "../../apps/api/app/create-api.js";
import type {
  PrivateDocumentStorage,
  PrivateDocumentReader
} from "../../apps/api/documents/private-document-storage.js";
import { createAnswerUseCase } from "../../apps/api/answers/answer-use-case.js";
import type { AnswerGateway, AnswerGatewayInput } from "../../apps/api/answers/answer-gateway.js";
import { createInMemoryAnswerPersistence } from "../../apps/api/answers/in-memory-answer-persistence.js";
import { createDevelopmentDocumentMemory } from "../../apps/api/documents/development-document-memory.js";
import { createDevelopmentDocumentUploadRepository } from "../../apps/api/documents/development-document-upload-repository.js";
import { createDevelopmentIdentityRepository } from "../../apps/api/identity/development-identity-repository.js";
import { createUserId } from "../../apps/api/identity/authorized-condominium-context.js";
import { createVerifiedLegalLibrary } from "../../apps/api/legislation/verified-legal-library.js";
import { createScopedTextRetriever } from "../../apps/api/retrieval/text-retrieval.js";
import { files } from "./cases.js";
export async function demoFixture(root: string, gateway: AnswerGateway) {
  const memory = createDevelopmentDocumentMemory();
  const repository = createDevelopmentDocumentUploadRepository();
  const memberships = createDevelopmentIdentityRepository();
  memberships.createTestCondominium({
    userId: createUserId("sindico-demo"),
    condominiumId: "demo-docs",
    name: "Condomínio Jardim do Horizonte"
  });
  const inputs: AnswerGatewayInput[] = [];
  const outputs: unknown[] = [];
  const diagnostics: unknown[] = [];
  const originals = new Map<string, Buffer>();
  const storage: PrivateDocumentStorage & PrivateDocumentReader = {
    async storeOriginal(input) {
      originals.set(input.objectId, input.content);
      return { storageKey: input.objectId };
    },
    async removeOriginal(input) {
      originals.delete(input.objectId);
    },
    async readOriginal(input) {
      const result = originals.get(input.objectId);
      if (!result) throw new Error("Original sintético ausente.");
      return result;
    }
  };
  const app = createApi({
    membershipRepository: memberships,
    developmentMembershipRegistry: memberships,
    developmentDocumentMemory: memory,
    documentUploadRepository: repository,
    documentCatalogRepository: repository,
    documentStorage: storage,
    answerUseCase: createAnswerUseCase({
      retriever: createScopedTextRetriever(createVerifiedLegalLibrary().composeIndex(memory.index)),
      persistence: createInMemoryAnswerPersistence(),
      onValidationFailure: (event) => {
        diagnostics.push(event);
      },
      gateway: {
        async generate(input) {
          inputs.push(input);
          const result = await gateway.generate(input);
          outputs.push(result);
          return result;
        }
      }
    })
  });
  const headers = { "x-development-user-id": "sindico-demo" };
  const catalog: unknown[] = [];
  for (const title of Object.values(files)) {
    const content = await readFile(join(root, "tests/fixtures/demo-documents", title));
    const upload = await app.inject({
      method: "POST",
      url: "/v1/condominiums/demo-docs/documents",
      headers: {
        ...headers,
        "content-type": "application/pdf",
        "x-document-title": encodeURIComponent(title),
        "x-document-type": "other",
        "x-document-validity-confirmed": "true"
      },
      payload: content
    });
    if (upload.statusCode !== 202) throw new Error("Upload sintético recusado.");
    const version = upload.json<{ documentVersionId: string }>().documentVersionId;
    const original = await app.inject({
      url: "/v1/condominiums/demo-docs/documents/" + version + "/file",
      headers
    });
    if (!original.rawPayload.equals(content)) throw new Error("Original divergiu após upload.");
  }
  for (let i = 0; i < 500; i++) {
    const items = (
      await app.inject({ url: "/v1/condominiums/demo-docs/documents", headers })
    ).json<{
      documents: {
        processingStatus: string;
        expectedPageCount: number;
        searchablePageCount: number;
        condominiumCheck?: unknown;
      }[];
    }>().documents;
    if (
      items.length === 4 &&
      items.every(
        (item) =>
          item.processingStatus === "ready" &&
          item.expectedPageCount === 2 &&
          item.searchablePageCount === 2 &&
          !item.condominiumCheck
      )
    ) {
      catalog.push(...items);
      break;
    }
    if (i === 499) throw new Error("Corpus não ficou integralmente pesquisável.");
    await new Promise((resolve) => setTimeout(resolve, 10));
  }
  return {
    app,
    inputs,
    outputs,
    diagnostics,
    catalog,
    headers,
    async ask(question: string) {
      inputs.length = 0;
      outputs.length = 0;
      diagnostics.length = 0;
      const chatId = randomUUID();
      const created = await app.inject({
        method: "POST",
        url: "/v1/condominiums/demo-docs/chats",
        headers,
        payload: { id: chatId, title: "Teste documental sintético" }
      });
      if (created.statusCode !== 201) throw new Error("Chat independente não criado.");
      return app.inject({
        method: "POST",
        url: "/v1/condominiums/demo-docs/questions",
        headers,
        payload: { question, chatId }
      });
    }
  };
}
