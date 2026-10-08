import { describe, expect, it, vi } from "vitest";

import { createApi } from "../../apps/api/app/create-api.js";
import { createCondominiumId } from "../../apps/api/core/condominium-scope.js";
import {
  DocumentCatalogForbiddenError,
  listRegisteredDocuments,
  type RegisteredDocument
} from "../../apps/api/documents/document-catalog.js";
import { createDevelopmentDocumentUploadRepository } from "../../apps/api/documents/development-document-upload-repository.js";
import type { PrivateDocumentStorage } from "../../apps/api/documents/private-document-storage.js";
import {
  createUserId,
  type AuthorizedCondominiumContext
} from "../../apps/api/identity/authorized-condominium-context.js";
import { createDevelopmentIdentityRepository } from "../../apps/api/identity/development-identity-repository.js";

function registeredDocument(
  condominiumId: "alameda" | "bosque",
  input: Partial<RegisteredDocument> = {}
): RegisteredDocument {
  return {
    condominiumId: createCondominiumId(condominiumId),
    documentId: `${condominiumId}-documento`,
    documentVersionId: `${condominiumId}-documento-v1`,
    title: `Convenção sintética ${condominiumId}`,
    documentType: "convention",
    versionNumber: 1,
    sizeBytes: 2_048,
    processingStatus: "ready",
    validityStatus: "confirmed",
    createdAt: "2026-09-01T00:00:00.000Z",
    expectedPageCount: 2,
    processedPageCount: 2,
    searchablePageCount: 2,
    unreadablePageNumbers: [],
    extractionCompleteness: 1,
    extractionMethod: "pdf_text",
    ocrQualityScore: null,
    ...input
  };
}

const managerContext: AuthorizedCondominiumContext = {
  condominiumId: createCondominiumId("alameda"),
  userId: createUserId("sindico-demo"),
  roleKey: "manager",
  membershipRevision: "membership-alameda-v1",
  permissions: ["document:read", "document:upload"]
};

const memoryStorage: PrivateDocumentStorage = {
  async storeOriginal({ objectId }) {
    return { storageKey: `synthetic/${objectId}` };
  },
  async removeOriginal() {}
};

describe("catálogo documental do condomínio", () => {
  it("mantém upload de foto bloqueado no armazenamento local de desenvolvimento", async () => {
    const storeOriginal = vi.fn(async () => ({ storageKey: "local/nao-deve-gravar" }));
    const repository = createDevelopmentDocumentUploadRepository();
    const app = createApi({
      membershipRepository: createDevelopmentIdentityRepository(),
      documentStorage: { storeOriginal, async removeOriginal() {} },
      documentUploadRepository: repository,
      documentCatalogRepository: repository
    });
    try {
      const response = await app.inject({
        method: "POST",
        url: "/v1/condominiums/alameda/documents",
        headers: {
          "content-type": "image/png",
          "x-development-user-id": "sindico-demo",
          "x-document-title": "Foto sintética",
          "x-document-type": "other"
        },
        payload: Buffer.from("foto sintética")
      });
      expect(response.statusCode).toBe(503);
      expect(storeOriginal).not.toHaveBeenCalled();
    } finally {
      await app.close();
    }
  });

  it("lista somente o condomínio autorizado e conserva apenas a versão mais recente", async () => {
    const repository = createDevelopmentDocumentUploadRepository([
      registeredDocument("alameda", { uploadedByCurrentUser: false }),
      registeredDocument("alameda", {
        documentVersionId: "alameda-documento-v2",
        versionNumber: 2,
        processingStatus: "processing",
        createdAt: "2026-09-02T00:00:00.000Z"
      }),
      registeredDocument("bosque")
    ]);

    await expect(listRegisteredDocuments(repository, managerContext)).resolves.toEqual([
      expect.objectContaining({
        condominiumId: "alameda",
        documentVersionId: "alameda-documento-v2",
        versionNumber: 2
      })
    ]);
  });

  it("recusa contexto sem leitura documental", async () => {
    await expect(
      listRegisteredDocuments(createDevelopmentDocumentUploadRepository(), {
        ...managerContext,
        permissions: []
      })
    ).rejects.toBeInstanceOf(DocumentCatalogForbiddenError);
  });

  it("AC-909 a AC-911: lista e adiciona PDFs somente no condomínio autorizado", async () => {
    const repository = createDevelopmentDocumentUploadRepository([
      registeredDocument("alameda"),
      registeredDocument("bosque")
    ]);
    const app = createApi({
      membershipRepository: createDevelopmentIdentityRepository(),
      documentStorage: memoryStorage,
      documentUploadRepository: repository,
      documentCatalogRepository: repository,
      now: () => new Date("2026-09-23T12:00:00.000Z")
    });

    const initial = await app.inject({
      method: "GET",
      url: "/v1/condominiums/alameda/documents",
      headers: { "x-development-user-id": "sindico-demo" }
    });
    expect(initial.statusCode).toBe(200);
    expect(initial.json()).toEqual({
      documents: [
        expect.objectContaining({
          documentId: "alameda-documento",
          title: "Convenção sintética alameda",
          expectedPageCount: 2,
          processedPageCount: 2,
          searchablePageCount: 2,
          unreadablePageNumbers: [],
          extractionCompleteness: 1,
          extractionMethod: "pdf_text"
        })
      ]
    });
    expect(initial.body).not.toContain("bosque-documento");

    const emptyTrash = await app.inject({
      method: "GET",
      url: "/v1/condominiums/alameda/documents/archived",
      headers: { "x-development-user-id": "sindico-demo" }
    });
    expect(emptyTrash.statusCode).toBe(200);
    expect(emptyTrash.json()).toEqual({ documents: [] });

    const uploaded = await app.inject({
      method: "POST",
      url: "/v1/condominiums/alameda/documents",
      headers: {
        "content-type": "application/pdf",
        "x-development-user-id": "sindico-demo",
        "x-document-title": encodeURIComponent("Ata sintética adicional"),
        "x-document-type": "meeting_minutes",
        "x-document-validity-confirmed": "true"
      },
      payload: Buffer.from("%PDF-1.7\nconteúdo sintético")
    });
    expect(uploaded.statusCode).toBe(202);

    const updated = await app.inject({
      method: "GET",
      url: "/v1/condominiums/alameda/documents",
      headers: { "x-development-user-id": "sindico-demo" }
    });
    expect(updated.statusCode).toBe(200);
    expect(updated.json().documents).toEqual(
      expect.arrayContaining([
        expect.objectContaining({
          title: "Ata sintética adicional",
          documentType: "meeting_minutes",
          validityStatus: "confirmed"
        })
      ])
    );

    const deleted = await app.inject({
      method: "DELETE",
      url: `/v1/condominiums/alameda/documents/${uploaded.json().documentId}`,
      headers: { "x-development-user-id": "sindico-demo" }
    });
    expect(deleted.statusCode).toBe(204);

    const afterDeletion = await app.inject({
      method: "GET",
      url: "/v1/condominiums/alameda/documents",
      headers: { "x-development-user-id": "sindico-demo" }
    });
    expect(afterDeletion.body).not.toContain("Ata sintética adicional");

    const archived = await app.inject({
      method: "GET",
      url: "/v1/condominiums/alameda/documents/archived",
      headers: { "x-development-user-id": "sindico-demo" }
    });
    expect(archived.statusCode).toBe(200);
    expect(archived.body).toContain("Ata sintética adicional");

    const restored = await app.inject({
      method: "POST",
      url: `/v1/condominiums/alameda/documents/${uploaded.json().documentId}/restore`,
      headers: { "x-development-user-id": "sindico-demo" }
    });
    expect(restored.statusCode).toBe(204);

    const afterRestore = await app.inject({
      method: "GET",
      url: "/v1/condominiums/alameda/documents",
      headers: { "x-development-user-id": "sindico-demo" }
    });
    expect(afterRestore.body).toContain("Ata sintética adicional");

    const missingRestore = await app.inject({
      method: "POST",
      url: "/v1/condominiums/alameda/documents/documento-inexistente/restore",
      headers: { "x-development-user-id": "sindico-demo" }
    });
    expect(missingRestore.statusCode).toBe(404);

    const deniedArchivedList = await app.inject({
      method: "GET",
      url: "/v1/condominiums/alameda/documents/archived",
      headers: { "x-development-user-id": "morador-alameda-demo" }
    });
    expect(deniedArchivedList.statusCode).toBe(403);

    const deniedRestore = await app.inject({
      method: "POST",
      url: `/v1/condominiums/alameda/documents/${uploaded.json().documentId}/restore`,
      headers: { "x-development-user-id": "morador-alameda-demo" }
    });
    expect(deniedRestore.statusCode).toBe(403);

    const deniedList = await app.inject({
      method: "GET",
      url: "/v1/condominiums/bosque/documents",
      headers: { "x-development-user-id": "morador-alameda-demo" }
    });
    expect(deniedList.statusCode).toBe(403);

    const deniedUpload = await app.inject({
      method: "POST",
      url: "/v1/condominiums/alameda/documents",
      headers: {
        "content-type": "application/pdf",
        "x-development-user-id": "morador-alameda-demo",
        "x-document-title": "Arquivo",
        "x-document-type": "other"
      },
      payload: Buffer.from("%PDF-1.7")
    });
    expect(deniedUpload.statusCode).toBe(403);

    const unauthenticated = await app.inject({
      method: "GET",
      url: "/v1/condominiums/alameda/documents"
    });
    expect(unauthenticated.statusCode).toBe(401);
    await app.close();
  });

  it("recusa lixeira e recuperação quando o repositório não oferece essas operações", async () => {
    const repository = createDevelopmentDocumentUploadRepository([registeredDocument("alameda")]);
    const app = createApi({
      membershipRepository: createDevelopmentIdentityRepository(),
      documentStorage: memoryStorage,
      documentUploadRepository: repository,
      documentCatalogRepository: { listAuthorized: repository.listAuthorized },
      now: () => new Date("2026-10-05T12:00:00.000Z")
    });

    const list = await app.inject({
      method: "GET",
      url: "/v1/condominiums/alameda/documents/archived",
      headers: { "x-development-user-id": "sindico-demo" }
    });
    expect(list.statusCode).toBe(403);

    const restore = await app.inject({
      method: "POST",
      url: "/v1/condominiums/alameda/documents/documento/restore",
      headers: { "x-development-user-id": "sindico-demo" }
    });
    expect(restore.statusCode).toBe(403);
    await app.close();
  });
});
