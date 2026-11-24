import { randomUUID } from "node:crypto";
import { expect, it } from "vitest";
import { createApi } from "../../apps/api/app/create-api.js";
import { createDevelopmentIdentityRepository } from "../../apps/api/identity/development-identity-repository.js";
import { createInMemoryConversationStore } from "../../apps/api/answers/conversation-store.js";
import { createInMemoryChatRepository } from "../../apps/api/chats/chat-repository.js";
import { extractPdfTextByPage } from "../../apps/api/documents/extract-pdf-text.js";
import {
  syntheticAuthoringDocument,
  syntheticAuthoringText,
  syntheticDocumentAuthoringModel
} from "../fixtures/document-authoring.js";
const headers = { "x-development-user-id": "sindico-demo" };
const request = {
  title: "FICTÍCIO. Comunicado",
  documentKind: "Comunicado",
  operation: "revise",
  request: "Reorganize o aviso com fundamento no regimento.",
  report: "",
  documentVersionIds: ["synthetic-version"]
};
it("AC-7331/32: HTTP fundamenta fontes, exige aceite e confirmação, recupera e isola contextos", async () => {
  const store = createInMemoryConversationStore(),
    chats = createInMemoryChatRepository();
  let calls = 0,
    source = syntheticAuthoringText,
    visible = true;
  const options = {
    membershipRepository: createDevelopmentIdentityRepository(),
    conversationStore: store,
    chatRepository: chats,
    documentCatalogRepository: {
      listAuthorized: async (context: Parameters<typeof syntheticAuthoringDocument>[0]) =>
        visible ? [syntheticAuthoringDocument(context)] : []
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
    documentAuthoringModel: syntheticDocumentAuthoringModel(() => {
      calls++;
    })
  };
  let app = createApi(options);
  const chat = randomUUID(),
    otherChat = randomUUID(),
    id = randomUUID(),
    base = `/v1/condominiums/alameda/chats/${chat}/document-proposals`,
    draftBase = `/v1/condominiums/alameda/chats/${chat}/document-drafts/${id}`;
  try {
    for (const c of [chat, otherChat])
      expect(
        (
          await app.inject({
            method: "POST",
            url: "/v1/condominiums/alameda/chats",
            headers,
            payload: { id: c, title: "FICTÍCIO" }
          })
        ).statusCode
      ).toBe(201);
    expect((await app.inject({ method: "GET", url: base })).statusCode).toBe(401);
    const available = await app.inject({ method: "GET", url: base, headers });
    expect(available.json()).toMatchObject({ enabled: true, proposals: [], durable: false });
    expect(calls).toBe(0);
    expect(
      (
        await app.inject({
          method: "POST",
          url: `${base}/${id}`,
          headers,
          payload: { ...request, sourceText: "FORGED" }
        })
      ).statusCode
    ).toBe(422);
    expect(
      (
        await app.inject({
          method: "POST",
          url: `${base}/${randomUUID()}`,
          headers,
          payload: { ...request, documentVersionIds: ["foreign-version"] }
        })
      ).statusCode
    ).toBe(404);
    const written = await app.inject({
      method: "POST",
      url: `${base}/${id}`,
      headers,
      payload: request
    });
    expect(written.statusCode, written.body).toBe(200);
    const proposal = written.json().proposal;
    expect(proposal.sources[0].text).toBe(syntheticAuthoringText);
    expect(calls).toBe(2);
    expect((await app.inject({ method: "GET", url: draftBase, headers })).statusCode).toBe(404);
    expect(
      (
        await app.inject({
          method: "POST",
          url: `${base}/${id}/decide`,
          headers,
          payload: { hash: proposal.hash, accept: "true" }
        })
      ).statusCode
    ).toBe(400);
    const applied = await app.inject({
      method: "POST",
      url: `${base}/${id}/decide`,
      headers,
      payload: { hash: proposal.hash, accept: true }
    });
    expect(applied.statusCode, applied.body).toBe(200);
    const draft = applied.json().draft;
    expect(draft.status).toBe("awaiting_confirmation");
    expect(draft.authoringSource.proposalId).toBe(id);
    expect(
      (await app.inject({ method: "GET", url: `${draftBase}/pdf?hash=${draft.hash}`, headers }))
        .statusCode
    ).toBe(409);
    expect(
      (
        await app.inject({
          method: "POST",
          url: `${draftBase}/decide`,
          headers,
          payload: { expectedEvent: 1, hash: draft.hash, confirm: true, reviewed: true }
        })
      ).statusCode
    ).toBe(200);
    await app.close();
    app = createApi({
      ...options,
      documentAuthoringModel: { ...options.documentAuthoringModel, enabled: false }
    });
    const replay = await app.inject({
      method: "POST",
      url: `${base}/${id}`,
      headers,
      payload: request
    });
    expect(replay.json().proposal.hash).toBe(proposal.hash);
    expect(calls).toBe(2);
    const acceptedAgain = await app.inject({
      method: "POST",
      url: `${base}/${id}/decide`,
      headers,
      payload: { hash: proposal.hash, accept: true }
    });
    expect(acceptedAgain.json().draft.status).toBe("confirmed");
    const pdf = await app.inject({
      method: "GET",
      url: `${draftBase}/pdf?hash=${draft.hash}`,
      headers
    });
    expect(pdf.statusCode, pdf.body).toBe(200);
    expect(
      (await extractPdfTextByPage(pdf.rawPayload)).map((p) => p.extractedText).join(" ")
    ).toContain("Origem: proposta documental");
    expect((await app.inject({ method: "GET", url: base, headers })).json().proposals).toHaveLength(
      1
    );
    expect(
      (await app.inject({ method: "GET", url: `${base.replace(chat, otherChat)}/${id}`, headers }))
        .statusCode
    ).toBe(404);
    expect(
      (
        await app.inject({
          method: "GET",
          url: base,
          headers: { "x-development-user-id": "morador-alameda-demo" }
        })
      ).statusCode
    ).toBe(403);
    source += " Alteração posterior.";
    expect((await app.inject({ method: "GET", url: `${base}/${id}`, headers })).statusCode).toBe(
      409
    );
    expect(
      (await app.inject({ method: "GET", url: `${draftBase}/pdf?hash=${draft.hash}`, headers }))
        .statusCode
    ).toBe(409);
    visible = false;
    expect((await app.inject({ method: "GET", url: `${base}/${id}`, headers })).statusCode).toBe(
      404
    );
  } finally {
    await app.close();
  }
});
it("AC-7332: startup padrão desabilitado e guard de recuperação não permite geração", async () => {
  const app = createApi({ membershipRepository: createDevelopmentIdentityRepository() });
  const chat = randomUUID(),
    id = randomUUID(),
    base = `/v1/condominiums/alameda/chats/${chat}/document-proposals`;
  try {
    await app.inject({
      method: "POST",
      url: "/v1/condominiums/alameda/chats",
      headers,
      payload: { id: chat, title: "FICTÍCIO" }
    });
    expect((await app.inject({ method: "GET", url: base, headers })).json().enabled).toBe(false);
    expect(
      (await app.inject({ method: "POST", url: `${base}/${id}`, headers, payload: request }))
        .statusCode
    ).toBe(503);
    expect((await app.inject({ method: "GET", url: `${base}/invalid`, headers })).statusCode).toBe(
      400
    );
  } finally {
    await app.close();
  }
  const guarded = createApi({
    membershipRepository: createDevelopmentIdentityRepository(),
    assertDocumentRecovery: async () => {
      throw new Error("synthetic quarantine");
    }
  });
  try {
    expect((await guarded.inject({ method: "GET", url: base, headers })).statusCode).toBe(503);
  } finally {
    await guarded.close();
  }
});
