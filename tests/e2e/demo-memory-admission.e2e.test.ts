import { describe, expect, it, vi } from "vitest";
import { createApi } from "../../apps/api/app/create-api.js";
import { createDemoWorkAdmission } from "../../apps/api/operations/demo-work-admission.js";
import { createDevelopmentIdentityRepository } from "../../apps/api/identity/development-identity-repository.js";
import { createDevelopmentDocumentMemory } from "../../apps/api/documents/development-document-memory.js";
import { createDevelopmentDocumentUploadRepository } from "../../apps/api/documents/development-document-upload-repository.js";
import { createSyntheticTextPdf } from "../fixtures/synthetic-pdfs.js";

const headers = {
  "x-development-user-id": "sindico-demo",
  "content-type": "application/pdf",
  "x-document-title": "Documento sintético",
  "x-document-type": "other"
};

describe("capacidade de documentos na demonstração", () => {
  it("não aceita corpo nem inicia IA/storage sob pressão de memória; mantém leitura e saúde disponíveis", async () => {
    const storeOriginal = vi.fn(async () => ({ storageKey: "sintetico" }));
    const generate = vi.fn();
    const app = createApi({
      membershipRepository: createDevelopmentIdentityRepository(),
      demoWorkAdmission: createDemoWorkAdmission({ residentBytes: () => 321 * 1048576 }),
      documentStorage: { storeOriginal, async removeOriginal() {} },
      setupMessageGateway: { generate }
    });
    try {
      for (const path of ["/v1/condominiums/alameda/documents", "/v1/chat/setup-turn"]) {
        const response = await app.inject({
          method: "POST",
          url: path,
          headers,
          payload: createSyntheticTextPdf()
        });
        expect(response.statusCode).toBe(503);
        expect(response.headers["retry-after"]).toBe("5");
        expect(response.json().code).toBe("server_busy");
      }
      expect(storeOriginal).not.toHaveBeenCalled();
      expect(generate).not.toHaveBeenCalled();
      expect((await app.inject({ url: "/health" })).statusCode).toBe(200);
      expect(
        (await app.inject({ url: "/v1/condominiums/alameda/documents", headers })).statusCode
      ).toBe(200);
    } finally {
      await app.close();
    }
  });

  it.each(["ready", "exception"] as const)(
    "mantém a reserva após 202 e a libera ao terminar (%s)",
    async (outcome) => {
      let finish!: () => void;
      const reading = new Promise<void>((resolve) => {
        finish = resolve;
      });
      const memory = createDevelopmentDocumentMemory();
      const repository = createDevelopmentDocumentUploadRepository();
      const storeOriginal = vi.fn(async () => ({ storageKey: "sintetico" }));
      const app = createApi({
        membershipRepository: createDevelopmentIdentityRepository(),
        demoWorkAdmission: createDemoWorkAdmission({ residentBytes: () => 1 }),
        documentUploadRepository: repository,
        documentCatalogRepository: repository,
        documentStorage: { storeOriginal, async removeOriginal() {} },
        developmentDocumentMemory: {
          ...memory,
          async indexUploaded() {
            await reading;
            if (outcome === "exception") throw new Error("falha sintética");
            return "ready";
          }
        }
      });
      const upload = (customHeaders = headers, content = createSyntheticTextPdf()) =>
        app.inject({
          method: "POST",
          url: "/v1/condominiums/alameda/documents",
          headers: customHeaders,
          payload: content
        });
      try {
        // Failed validation/authentication must release an unclaimed reservation as well.
        expect((await upload(headers, Buffer.from("PDF inválido"))).statusCode).toBe(400);
        expect(
          (await upload({ ...headers, "x-development-user-id": "usuario-sem-vinculo" })).statusCode
        ).toBe(403);
        const first = await upload();
        expect(first.statusCode).toBe(202);
        const competing = await upload();
        expect(competing.statusCode).toBe(503);
        expect(storeOriginal).toHaveBeenCalledOnce();
        finish();
        await expect
          .poll(
            async () =>
              (await app.inject({ url: "/v1/condominiums/alameda/documents", headers })).json()
                .documents[0].processingStatus
          )
          .toBe(outcome === "exception" ? "failed" : "ready");
        expect((await upload()).statusCode).toBe(202);
        expect(storeOriginal).toHaveBeenCalledTimes(2);
      } finally {
        finish();
        await app.close();
      }
    }
  );
});
