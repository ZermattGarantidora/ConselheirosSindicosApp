import { randomUUID } from "node:crypto";
import { expect, it } from "vitest";
import { createApi } from "../../apps/api/app/create-api.js";
import { createDevelopmentIdentityRepository } from "../../apps/api/identity/development-identity-repository.js";
import { createInMemoryConversationStore } from "../../apps/api/answers/conversation-store.js";
import { createInMemoryChatRepository } from "../../apps/api/chats/chat-repository.js";
import { extractPdfTextByPage } from "../../apps/api/documents/extract-pdf-text.js";
import { syntheticDocx } from "../fixtures/synthetic-authoring.js";
import { docxMediaType } from "../../apps/api/documents/extract-docx-text.js";

const headers = { "x-development-user-id": "sindico-demo" };
const content = {
  title: "Comunicado sintético",
  documentKind: "Comunicado",
  operation: "create",
  text: "FICTÍCIO. Manutenção no condomínio sintético. Conferir data antes de enviar.",
  sources: [],
  changes: "Criação solicitada.",
  pending: "Confirmar data e horário."
};
it("AC-7309/10: salva revisão, confirma, baixa e recupera após reconstruir a API; isola chats e revoga acesso", async () => {
  const store = createInMemoryConversationStore(),
    chats = createInMemoryChatRepository(),
    memberships = createDevelopmentIdentityRepository();
  const options = {
    membershipRepository: memberships,
    conversationStore: store,
    chatRepository: chats
  };
  let app = createApi(options);
  try {
    const chatId = randomUUID(),
      otherChatId = randomUUID(),
      id = randomUUID();
    for (const chat of [chatId, otherChatId])
      expect(
        (
          await app.inject({
            method: "POST",
            url: "/v1/condominiums/alameda/chats",
            headers,
            payload: { id: chat, title: "FICTÍCIO" }
          })
        ).statusCode
      ).toBe(201);
    const base = `/v1/condominiums/alameda/chats/${chatId}/document-drafts`;
    expect((await app.inject({ method: "GET", url: base })).statusCode).toBe(401);
    const proposal = await app.inject({
      method: "POST",
      url: `${base}/${id}`,
      headers,
      payload: { expectedEvent: 0, content }
    });
    expect(proposal.statusCode, proposal.body).toBe(200);
    const first = proposal.json().draft;
    expect(
      (await app.inject({ method: "GET", url: `${base}/${id}/pdf?hash=${first.hash}`, headers }))
        .statusCode
    ).toBe(409);
    const decide = await app.inject({
      method: "POST",
      url: `${base}/${id}/decide`,
      headers,
      payload: { expectedEvent: first.event, hash: first.hash, confirm: true, reviewed: true }
    });
    expect(decide.statusCode, decide.body).toBe(200);
    await app.close();
    app = createApi(options);
    const recovered = await app.inject({ method: "GET", url: `${base}/${id}`, headers });
    expect(recovered.json().draft.status).toBe("confirmed");
    expect(recovered.json().durable).toBe(false); // Reiniciar API não transforma RAM em persistência durável.
    const file = await app.inject({
      method: "GET",
      url: `${base}/${id}/pdf?hash=${first.hash}`,
      headers
    });
    expect(file.statusCode, file.body).toBe(200);
    expect(file.headers["content-type"]).toContain("application/pdf");
    expect(file.headers["cache-control"]).toBe("private, no-store");
    expect(
      (await extractPdfTextByPage(file.rawPayload)).map((p) => p.extractedText).join(" ")
    ).toContain("Manutenção no condomínio sintético");
    expect(
      (
        await app.inject({
          method: "GET",
          url: `/v1/condominiums/alameda/chats/${otherChatId}/document-drafts/${id}`,
          headers
        })
      ).statusCode
    ).toBe(404);
    const list = await app.inject({ method: "GET", url: base, headers });
    expect(list.json().drafts).toHaveLength(1);
    const audioBase = `/v1/condominiums/alameda/chats/${chatId}/audio-inputs`;
    expect((await app.inject({ method: "GET", url: audioBase, headers })).json().enabled).toBe(
      false
    );
    expect(
      (
        await app.inject({
          method: "POST",
          url: `${audioBase}/${randomUUID()}?mode=dictation&title=FICTICIO`,
          headers: { ...headers, "content-type": "audio/wav" },
          payload: Buffer.from("WAV unavailable")
        })
      ).statusCode
    ).toBe(503);
    expect(
      (
        await app.inject({
          method: "GET",
          url: base,
          headers: { "x-development-user-id": "morador-alameda-demo" }
        })
      ).statusCode
    ).toBe(403);
    await app.inject({
      method: "DELETE",
      url: `/v1/condominiums/alameda/chats/${chatId}`,
      headers
    });
    expect(
      (await app.inject({ method: "GET", url: `${base}/${id}/pdf?hash=${first.hash}`, headers }))
        .statusCode
    ).toBe(404);
  } finally {
    await app.close();
  }
});
it("AC-7305/11: upload Word preserva os bytes privados e enfileira sem IA/OCR", async () => {
  const originals = new Map<string, Buffer>();
  const app = createApi({
    membershipRepository: createDevelopmentIdentityRepository(),
    documentStorage: {
      async storeOriginal(input) {
        originals.set(input.objectId, Buffer.from(input.content));
        return { storageKey: `synthetic/${input.objectId}` };
      },
      async removeOriginal(input) {
        originals.delete(input.objectId);
      }
    }
  });
  try {
    const bytes = syntheticDocx();
    const result = await app.inject({
      method: "POST",
      url: "/v1/condominiums/alameda/documents",
      headers: {
        ...headers,
        "content-type": docxMediaType,
        "x-document-title": encodeURIComponent("Convenção sintética.docx"),
        "x-document-type": "convention",
        "x-document-validity-confirmed": "true"
      },
      payload: bytes
    });
    expect(result.statusCode, result.body).toBe(202);
    expect([...originals.values()][0]).toEqual(bytes);
  } finally {
    await app.close();
  }
});

it("AC-7322/7323: oferta no chat, recusa persistente e aceite com revisão antes do PDF", async () => {
  let evaluations = 0;
  const app = createApi({
    membershipRepository: createDevelopmentIdentityRepository(),
    documentImprovementAgent: {
      async suggest(draft) {
        evaluations++;
        return {
          message:
            "Posso separar a orientação de conferência em outro parágrafo. Quer revisar essa apresentação?",
          text: draft.text.replace(". Conferir", ".\n\nConferir"),
          changes: "Separação de parágrafos, sem alterar os fatos."
        };
      }
    }
  });
  try {
    const chatId = randomUUID();
    await app.inject({
      method: "POST",
      url: "/v1/condominiums/alameda/chats",
      headers,
      payload: { id: chatId, title: "FICTÍCIO" }
    });
    for (const accept of [false, true]) {
      const id = randomUUID(),
        base = `/v1/condominiums/alameda/chats/${chatId}/document-drafts/${id}`;
      const draft = (
        await app.inject({
          method: "POST",
          url: base,
          headers,
          payload: { expectedEvent: 0, content }
        })
      ).json().draft;
      const offer = await app.inject({
        method: "POST",
        url: `${base}/improvement`,
        headers,
        payload: { expectedEvent: 1 }
      });
      expect(offer.statusCode, offer.body).toBe(200);
      expect(offer.json().offer.status).toBe("offered");
      const decision = await app.inject({
        method: "POST",
        url: `${base}/improvement`,
        headers,
        payload: { expectedEvent: 1, hash: draft.hash, accept }
      });
      expect(decision.statusCode, decision.body).toBe(200);
      expect(decision.json().draft).toMatchObject({
        revision: accept ? 2 : 1,
        status: "awaiting_confirmation"
      });
      expect(
        (
          await app.inject({
            method: "GET",
            url: `${base}/pdf?hash=${decision.json().draft.hash}`,
            headers
          })
        ).statusCode
      ).toBe(409);
      if (!accept) {
        const closed = await app.inject({
          method: "POST",
          url: `${base}/improvement`,
          headers,
          payload: { expectedEvent: 1 }
        });
        expect(closed.json().offer.status).toBe("declined");
      }
      expect(
        (
          await app.inject({
            method: "POST",
            url: `${base}/improvement`,
            headers: { "x-development-user-id": "morador-alameda-demo" },
            payload: { expectedEvent: 1 }
          })
        ).statusCode
      ).toBe(403);
    }
    expect(evaluations).toBe(2);
  } finally {
    await app.close();
  }
});
