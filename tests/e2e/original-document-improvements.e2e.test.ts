import { randomUUID } from "node:crypto";
import { expect, it } from "vitest";
import { createUserId } from "../../apps/api/identity/authorized-condominium-context.js";
import { extractPdfTextByPage } from "../../apps/api/documents/extract-pdf-text.js";
import {
  originalDocumentFixture,
  originalHeaders as headers,
  originalChat,
  originalAnalysis
} from "../fixtures/original-document-authoring.js";

it("AC-7338/39/41: análise do original, oferta, decisão, edição, confirmação e PDF recuperáveis", async () => {
  const f = originalDocumentFixture();
  let app = f.app();
  try {
    const chat = await originalChat(app);
    const base = `/v1/condominiums/alameda/chats/${chat}/document-proposals`;
    expect((await app.inject({ method: "GET", url: base, headers })).json().proposals).toEqual([]);
    expect(f.counts().writing).toBe(0);
    const analyzed = await originalAnalysis(app, chat);
    expect(analyzed.statusCode, analyzed.body).toBe(200);
    expect(analyzed.json().originalImprovement.status).toBe("offered");
    const id = analyzed.json().originalImprovement.proposalId;
    const proposal = (await app.inject({ method: "GET", url: `${base}/${id}`, headers })).json()
      .proposal;
    expect(proposal.trigger).toBe("original_analysis");
    expect(proposal.plan.changes[0].before.quote).toBe(f.original);
    const history = await app.inject({
      method: "GET",
      url: `/v1/condominiums/alameda/chats/${chat}/messages`,
      headers
    });
    expect(history.statusCode).toBe(200);
    const messages = history
      .json()
      .entries.flatMap((entry: { messages: { text: string }[] }) => entry.messages);
    expect(
      messages.some((message: { text: string }) => message.text === proposal.plan.message)
    ).toBe(true);
    expect(history.body).not.toContain("Avalie somente a organização");
    expect(history.body).not.toContain("Solicitei a redação documental");
    expect(
      (
        await f.store.find(
          {
            kind: "chat",
            userId: createUserId("sindico-demo"),
            condominiumId: "alameda",
            chatId: chat
          },
          `document-authoring:${id}:request`
        )
      )?.metadata.internalAuthoring
    ).toBe(true);
    const draftBase = `/v1/condominiums/alameda/chats/${chat}/document-drafts/${id}`;
    expect((await app.inject({ method: "GET", url: draftBase, headers })).statusCode).toBe(404);
    expect((await originalAnalysis(app, chat)).json().originalImprovement.proposalId).toBe(id);
    expect(f.counts()).toMatchObject({ writing: 1, reviews: 1 });
    const accepted = await app.inject({
      method: "POST",
      url: `${base}/${id}/decide`,
      headers,
      payload: { hash: proposal.hash, accept: true }
    });
    expect(accepted.statusCode, accepted.body).toBe(200);
    const draft = accepted.json().draft;
    expect(draft.status).toBe("awaiting_confirmation");
    expect(
      (await app.inject({ method: "GET", url: `${draftBase}/pdf?hash=${draft.hash}`, headers }))
        .statusCode
    ).toBe(409);
    const edited = await app.inject({
      method: "POST",
      url: draftBase,
      headers,
      payload: {
        expectedEvent: draft.event,
        content: {
          ...Object.fromEntries(
            [
              "title",
              "documentKind",
              "operation",
              "text",
              "sources",
              "changes",
              "pending",
              "authoringSource"
            ].map((k) => [k, draft[k]])
          ),
          text: draft.text + "\nFICTÍCIO. Conferir antes de usar."
        }
      }
    });
    expect(edited.statusCode, edited.body).toBe(200);
    const revised = edited.json().draft;
    expect(
      (
        await app.inject({
          method: "POST",
          url: `${draftBase}/decide`,
          headers,
          payload: {
            expectedEvent: revised.event,
            hash: revised.hash,
            confirm: true,
            reviewed: true
          }
        })
      ).statusCode
    ).toBe(200);
    await app.close();
    app = f.app();
    const replay = await originalAnalysis(app, chat);
    expect(replay.json().originalImprovement.status).toBe("accepted");
    const pdf = await app.inject({
      method: "GET",
      url: `${draftBase}/pdf?hash=${revised.hash}`,
      headers
    });
    expect(pdf.statusCode, pdf.body).toBe(200);
    expect(
      (await extractPdfTextByPage(pdf.rawPayload)).map((p) => p.extractedText).join(" ")
    ).toContain("Conferir antes de usar");
    expect(f.source()).toBe(f.original);
    expect(f.counts()).toMatchObject({ writing: 1, reviews: 1 });
    f.hide();
    expect(
      (await app.inject({ method: "GET", url: `${draftBase}/pdf?hash=${revised.hash}`, headers }))
        .statusCode
    ).toBe(404);
  } finally {
    await app.close();
  }
});

it("AC-7339: recusa persistente não insiste após nova API", async () => {
  const f = originalDocumentFixture();
  let app = f.app();
  try {
    const chat = await originalChat(app);
    const r = await originalAnalysis(app, chat);
    expect(r.statusCode, r.body).toBe(200);
    const id = r.json().originalImprovement.proposalId;
    const base = `/v1/condominiums/alameda/chats/${chat}/document-proposals/${id}`;
    const p = (await app.inject({ method: "GET", url: base, headers })).json().proposal;
    expect(
      (
        await app.inject({
          method: "POST",
          url: `${base}/decide`,
          headers,
          payload: { hash: p.hash, accept: false }
        })
      ).statusCode
    ).toBe(200);
    await app.close();
    app = f.app();
    expect((await originalAnalysis(app, chat)).json().originalImprovement.status).toBe("declined");
    expect(f.counts()).toMatchObject({ writing: 1, reviews: 1 });
  } finally {
    await app.close();
  }
});

it.each(["unchanged", "uncertain", "incomplete", "disabled", "scope", "limit"] as const)(
  "AC-7339/40: %s não oferece mudança aplicável nem repete chamada incerta",
  async (mode) => {
    const f = originalDocumentFixture();
    if (mode === "unchanged") f.setSource(f.original.replace(".  ", ". "));
    if (mode === "uncertain") f.uncertain();
    if (mode === "incomplete") f.incomplete();
    if (mode === "limit") f.setSource(f.original + " Texto fictício.".repeat(100));
    if (mode === "disabled") delete f.options.syntheticOriginalImprovements;
    const app = f.app();
    try {
      const chat = await originalChat(app);
      const r = await originalAnalysis(app, mode === "scope" ? randomUUID() : chat);
      if (mode === "incomplete") {
        expect(r.statusCode).toBe(503);
      } else if (mode === "scope") {
        expect(r.statusCode).toBe(404);
      } else {
        expect(r.statusCode, r.body).toBe(200);
        if (mode === "disabled") expect(r.json().originalImprovement).toBeUndefined();
        else
          expect(r.json().originalImprovement.status).toBe(
            mode === "unchanged" ? "unchanged" : "blocked"
          );
      }
      if (mode === "uncertain") {
        const before = f.counts();
        expect((await originalAnalysis(app, chat)).json().originalImprovement.status).toBe(
          "blocked"
        );
        expect(f.counts().writing).toBe(before.writing);
        expect(before.writing).toBe(1);
      }
      if (mode === "limit") {
        expect(f.counts().writing).toBe(0);
        expect(r.json().originalImprovement.message).toContain("mil caracteres");
      }
      if (mode === "unchanged") {
        const id = r.json().originalImprovement.proposalId;
        const base = `/v1/condominiums/alameda/chats/${chat}/document-proposals/${id}`;
        const p = (await app.inject({ method: "GET", url: base, headers })).json().proposal;
        expect(
          (
            await app.inject({
              method: "POST",
              url: `${base}/decide`,
              headers,
              payload: { hash: p.hash, accept: true }
            })
          ).statusCode
        ).toBe(409);
      }
    } finally {
      await app.close();
    }
  }
);

it("AC-7340: mudança entre análise e preparação bloqueia antes do agente", async () => {
  const f = originalDocumentFixture();
  const originalReader = f.options.documentSourceReader!;
  let reads = 0;
  f.options.documentSourceReader = {
    async getAuthorizedPage(context, input) {
      if (++reads === 2) f.setSource(f.original + " Alteração posterior.");
      return originalReader.getAuthorizedPage(context, input);
    }
  };
  const app = f.app();
  try {
    const chat = await originalChat(app);
    const r = await originalAnalysis(app, chat);
    expect(r.statusCode).toBe(409);
    expect(f.counts().writing).toBe(0);
  } finally {
    await app.close();
  }
});

it("AC-7339/40: concorrência não duplica agente e revogação durante avaliação impede entrega", async () => {
  for (const revoke of [false, true]) {
    const f = originalDocumentFixture();
    if (revoke)
      f.afterCall(async () => {
        f.hide();
      });
    const app = f.app();
    try {
      const chat = await originalChat(app);
      const responses = revoke
        ? [await originalAnalysis(app, chat)]
        : await Promise.all([originalAnalysis(app, chat), originalAnalysis(app, chat)]);
      expect(f.counts().writing).toBe(1);
      if (revoke) {
        expect(responses.every((r) => r.statusCode === 409)).toBe(true);
        expect(
          (
            await app.inject({
              method: "GET",
              url: `/v1/condominiums/alameda/chats/${chat}/document-proposals`,
              headers
            })
          ).json().proposals
        ).toEqual([]);
      } else {
        expect(responses.every((r) => r.statusCode === 200)).toBe(true);
        expect(responses.some((r) => r.json().originalImprovement.status === "offered")).toBe(true);
        expect(f.counts().reviews).toBe(1);
      }
    } finally {
      await app.close();
    }
  }
});
