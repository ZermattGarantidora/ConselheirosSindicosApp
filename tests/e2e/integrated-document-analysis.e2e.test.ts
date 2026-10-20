import { describe, expect, it } from "vitest";
import { createApi } from "../../apps/api/app/create-api.js";
import { createDevelopmentDocumentMemory } from "../../apps/api/documents/development-document-memory.js";
import { createDevelopmentDocumentUploadRepository } from "../../apps/api/documents/development-document-upload-repository.js";
import { createDevelopmentIdentityRepository } from "../../apps/api/identity/development-identity-repository.js";
import { createSyntheticPdf } from "../fixtures/synthetic-pdfs.js";
import { expectDocumentReady } from "../fixtures/wait-for-document.js";

describe("análise documental integrada ao turno", () => {
  it.each([
    [
      "ata",
      "ATA DA ASSEMBLEIA",
      "Deliberacao: Aprovada a pintura do hall.",
      "Deliberacao: Aprovada a pintura do hall."
    ],
    [
      "contrato",
      "CONTRATO DE LIMPEZA",
      "Prazo: Prazo ate 31/12/2026, sem renovacao automatica.",
      "Prazo: Prazo ate 31/12/2026, sem renovacao automatica."
    ]
  ])(
    "envia PDF de %s e confere fonte no turno da conversa",
    async (kind, title, clause, expected) => {
      const repository = createDevelopmentDocumentUploadRepository();
      const app = createApi({
        membershipRepository: createDevelopmentIdentityRepository(),
        developmentDocumentMemory: createDevelopmentDocumentMemory(),
        documentCatalogRepository: repository,
        documentUploadRepository: repository,
        documentStorage: {
          async storeOriginal() {
            return { storageKey: "synthetic" };
          },
          async removeOriginal() {}
        },
        now: () => new Date("2026-10-16T12:00:00Z")
      });
      const headers = { "x-development-user-id": "sindico-demo" };
      try {
        const upload = await app.inject({
          method: "POST",
          url: "/v1/condominiums/alameda/documents",
          headers: {
            ...headers,
            "x-document-title": title,
            "x-document-type": "other",
            "x-document-validity-confirmed": "true",
            "content-type": "application/pdf"
          },
          // O gerador desta fixture é ASCII e a página deve comportar a linha inteira.
          payload: createSyntheticPdf(
            kind === "ata" ? [title, "Assunto: pintura", clause] : [title, clause],
            { pageWidth: 1200, fontSize: 10 }
          )
        });
        expect(upload.statusCode).toBe(202);
        expect(upload.json().processingStatus).toBe("uploaded");
        await expectDocumentReady(app, upload.json().documentVersionId);
        const response = await app.inject({
          method: "POST",
          url: "/v1/condominiums/alameda/questions",
          headers,
          payload: { question: `Analise a ${kind} disponível.` }
        });
        expect(response.statusCode).toBe(200);
        expect(response.json().documentAnalysis).toMatchObject({
          status: "available",
          rows: [
            {
              detail: expected,
              citations: [
                {
                  documentId: upload.json().documentId,
                  page: kind === "ata" ? 3 : 2,
                  excerpt: clause
                }
              ]
            }
          ]
        });
        expect(
          response.json().documentAnalysis.rows[0].citations[0].documentVersionId
        ).toBeTruthy();
      } finally {
        await app.close();
      }
    }
  );

  it("processa dois PDFs, compara com fontes e respeita remoção e autorização", async () => {
    const repository = createDevelopmentDocumentUploadRepository();
    const memory = createDevelopmentDocumentMemory();
    const app = createApi({
      membershipRepository: createDevelopmentIdentityRepository(),
      developmentDocumentMemory: memory,
      documentCatalogRepository: repository,
      documentUploadRepository: repository,
      documentStorage: {
        async storeOriginal() {
          return { storageKey: "synthetic" };
        },
        async removeOriginal() {}
      },
      now: () => new Date("2026-10-16T12:00:00Z")
    });
    try {
      const ids: string[] = [];
      for (const [period, value] of [
        ["01/2026", "100,00"],
        ["02/2026", "125,00"]
      ]) {
        const response = await app.inject({
          method: "POST",
          url: "/v1/condominiums/alameda/documents",
          headers: {
            "x-development-user-id": "sindico-demo",
            "x-document-title": `Balancete ${period}`,
            "x-document-type": "other",
            "x-document-validity-confirmed": "true",
            "content-type": "application/pdf"
          },
          payload: createSyntheticPdf([`BALANCETE ${period}`, `Energia R$ ${value}`])
        });
        expect(response.statusCode).toBe(202);
        expect(response.json().processingStatus).toBe("uploaded");
        await expectDocumentReady(app, response.json().documentVersionId);
        ids.push(response.json().documentId);
      }
      const ask = () =>
        app.inject({
          method: "POST",
          url: "/v1/condominiums/alameda/questions",
          headers: { "x-development-user-id": "sindico-demo" },
          payload: { question: "Compare os balancetes 2026-01 e 2026-02" }
        });
      const response = await ask();
      expect(response.statusCode).toBe(200);
      const report = response.json().documentAnalysis;
      expect(report.status).toBe("available");
      expect(report.rows).toHaveLength(1);
      expect(report.rows[0].detail).toContain("diferença: R$ 25,00");
      expect(report.rows[0].detail).toContain("25%");
      expect(report.rows[0].citations).toHaveLength(2);
      expect(
        report.rows[0].citations.every(
          (source: { page: number; excerpt: string }) =>
            source.page === 2 && source.excerpt.startsWith("Energia R$")
        )
      ).toBe(true);
      const archived = await app.inject({
        method: "DELETE",
        url: `/v1/condominiums/alameda/documents/${ids[0]}`,
        headers: { "x-development-user-id": "sindico-demo", "x-confirm-document-removal": "true" }
      });
      expect(archived.statusCode).toBe(204);
      expect((await ask()).json().documentAnalysis.rows).toHaveLength(0);
      const denied = await app.inject({
        method: "POST",
        url: "/v1/condominiums/alameda/questions",
        headers: { "x-development-user-id": "usuario-sem-acesso" },
        payload: { question: "Compare balancetes 2026-01 e 2026-02" }
      });
      expect(denied.statusCode).toBe(403);
      expect(denied.body).not.toContain("Energia");
    } finally {
      await app.close();
    }
  });

  it("falha do reader não expõe conteúdo nem quebra a resposta e conversa simples não lê documentos", async () => {
    let reads = 0;
    const app = createApi({
      membershipRepository: createDevelopmentIdentityRepository(),
      documentAnalysisReader: {
        async readAuthorized() {
          reads++;
          throw new Error("segredo-sintetico");
        }
      }
    });
    try {
      const headers = { "x-development-user-id": "sindico-demo" };
      const simple = await app.inject({
        method: "POST",
        url: "/v1/condominiums/alameda/questions",
        headers,
        payload: { question: "Olá" }
      });
      expect(simple.statusCode).toBe(200);
      expect(reads).toBe(0);
      const failed = await app.inject({
        method: "POST",
        url: "/v1/condominiums/alameda/questions",
        headers,
        payload: { question: "Compare os balancetes 2026-01 e 2026-02" }
      });
      expect(failed.statusCode).toBe(200);
      expect(failed.json().documentAnalysis.status).toBe("unavailable");
      expect(failed.body).not.toContain("segredo-sintetico");
    } finally {
      await app.close();
    }
  });
});
