import { randomUUID } from "node:crypto";
import { expect, it } from "vitest";
import { createApi } from "../../apps/api/app/create-api.js";
import { createDevelopmentIdentityRepository } from "../../apps/api/identity/development-identity-repository.js";
import { financialFixture } from "../fixtures/financial-dossier.js";
const headers = { "x-development-user-id": "sindico-demo" };
it("AC-7352: rota privada entrega rascunho comum, nega escopo estranho e fica inativa sem modelo", async () => {
  const f = financialFixture(),
    memberships = createDevelopmentIdentityRepository();
  const options = {
    membershipRepository: memberships,
    documentCatalogRepository: f.catalog,
    documentAnalysisReader: f.reader,
    documentSourceReader: {
      async getAuthorizedPage(_c: unknown, r: { page: number }) {
        const [doc] = await f.reader.readAuthorized();
        return {
          documentId: doc!.documentId,
          documentVersionId: doc!.documentVersionId,
          title: doc!.documentTitle,
          page: r.page,
          content: doc!.pages[r.page - 1]!.extractedText
        };
      }
    },
    financialReportModel: f.options.model
  };
  const app = createApi(options);
  const chatId = randomUUID(),
    id = randomUUID(),
    base = `/v1/condominiums/alameda/chats/${chatId}`;
  try {
    expect(
      (
        await app.inject({
          method: "POST",
          url: "/v1/condominiums/alameda/chats",
          headers,
          payload: { id: chatId, title: "FICTÍCIO" }
        })
      ).statusCode
    ).toBe(201);
    const url = `${base}/financial-reports/${id}`;
    const choices = await app.inject({
      method: "GET",
      url: `${base}/financial-reports?versions=${f.request.documentVersionIds[0]}`,
      headers
    });
    expect(choices.statusCode, choices.body).toBe(200);
    expect(choices.json().candidates.map((c: { key: string }) => c.key)).toEqual([
      "BAL-OUT",
      "BAL-SET"
    ]);
    expect(f.complete).not.toHaveBeenCalled();
    expect((await app.inject({ method: "POST", url, payload: f.request })).statusCode).toBe(401);
    expect(
      (
        await app.inject({
          method: "POST",
          url: url.replace("/alameda/", "/bosque/"),
          headers,
          payload: f.request
        })
      ).statusCode
    ).toBe(404);
    expect(f.complete).not.toHaveBeenCalled();
    const result = await app.inject({ method: "POST", url, headers, payload: f.request });
    expect(result.statusCode, result.body).toBe(200);
    expect(result.headers["cache-control"]).toBe("private, no-store");
    expect((await app.inject({ method: "GET", url, headers })).json().draft.hash).toBe(
      result.json().draft.hash
    );
    expect(
      (await app.inject({ method: "GET", url: `${base}/document-drafts/${id}`, headers })).json()
        .draft.status
    ).toBe("awaiting_confirmation");
    expect(
      (
        await app.inject({
          method: "GET",
          url: `${base}/document-drafts/${id}/pdf?hash=${result.json().draft.hash}`,
          headers
        })
      ).statusCode
    ).toBe(409);
    f.changePage();
    expect(
      (await app.inject({ method: "GET", url: `${base}/document-drafts/${id}`, headers }))
        .statusCode
    ).toBe(409);
    expect(f.complete).toHaveBeenCalledTimes(2);
  } finally {
    await app.close();
  }
  const { financialReportModel, ...disabled } = options;
  expect(financialReportModel.key).toBeTruthy();
  const inactive = createApi(disabled),
    chat = randomUUID();
  try {
    await inactive.inject({
      method: "POST",
      url: "/v1/condominiums/alameda/chats",
      headers,
      payload: { id: chat, title: "FICTÍCIO" }
    });
    expect(
      (
        await inactive.inject({
          method: "POST",
          url: `/v1/condominiums/alameda/chats/${chat}/financial-reports/${randomUUID()}`,
          headers,
          payload: f.request
        })
      ).statusCode
    ).toBe(503);
    expect(f.complete).toHaveBeenCalledTimes(2);
  } finally {
    await inactive.close();
  }
});
