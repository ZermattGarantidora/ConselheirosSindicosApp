import { createHash } from "node:crypto";

import { describe, expect, it } from "vitest";

import { createCondominiumId } from "../../apps/api/core/condominium-scope.js";
import type { AuthorizedCondominiumContext } from "../../apps/api/identity/authorized-condominium-context.js";
import type { PrivateDocumentStorage } from "../../apps/api/documents/private-document-storage.js";
import {
  DocumentUploadForbiddenError,
  InvalidDocumentUploadError,
  maximumPdfUploadBytes,
  uploadDocument,
  type UploadedDocumentRecord
} from "../../apps/api/documents/upload-document.js";

const context: AuthorizedCondominiumContext = {
  condominiumId: createCondominiumId("alameda"),
  userId: "sindico-demo" as AuthorizedCondominiumContext["userId"],
  roleKey: "manager",
  membershipRevision: "v1",
  permissions: ["document:read", "document:upload"]
};

function createStorage(): Readonly<{
  storage: PrivateDocumentStorage;
  stored: string[];
  removed: string[];
}> {
  const stored: string[] = [];
  const removed: string[] = [];

  return {
    stored,
    removed,
    storage: {
      async storeOriginal({ condominiumId, objectId }) {
        stored.push(`${condominiumId}:${objectId}`);
        return { storageKey: `opaque/${objectId}` };
      },
      async removeOriginal({ condominiumId, objectId }) {
        removed.push(`${condominiumId}:${objectId}`);
      }
    }
  };
}

describe("upload privado de documento", () => {
  it("valida assinatura, calcula hash e registra apenas metadados escopados", async () => {
    const fixture = createStorage();
    const recorded: UploadedDocumentRecord[] = [];
    const content = Buffer.from("%PDF-1.7\\ntexto sintético");

    const uploaded = await uploadDocument(
      fixture.storage,
      {
        async recordUploaded(record) {
          recorded.push(record);
        }
      },
      context,
      {
        title: "Convenção sintética",
        documentType: "convention",
        content
      }
    );

    expect(uploaded.contentSha256).toBe(createHash("sha256").update(content).digest("hex"));
    expect(uploaded).toMatchObject({
      condominiumId: "alameda",
      processingStatus: "uploaded",
      validityStatus: "pending",
      sizeBytes: content.length
    });
    expect(recorded).toEqual([uploaded]);
    expect(fixture.stored).toHaveLength(1);
  });

  it("rejeita conteúdo que não é PDF antes de gravar", async () => {
    const fixture = createStorage();

    await expect(
      uploadDocument(fixture.storage, { async recordUploaded() {} }, context, {
        title: "Arquivo disfarçado",
        documentType: "other",
        content: Buffer.from("not a pdf")
      })
    ).rejects.toBeInstanceOf(InvalidDocumentUploadError);
    expect(fixture.stored).toEqual([]);
  });

  it.each([
    { title: "", documentType: "other", content: Buffer.from("%PDF-1.7") },
    { title: "Título válido", documentType: "unsupported", content: Buffer.from("%PDF-1.7") },
    {
      title: "Título válido",
      documentType: "other",
      content: Buffer.alloc(maximumPdfUploadBytes + 1)
    }
  ])("rejeita metadados ou limites inválidos antes de gravar", async (input) => {
    const fixture = createStorage();

    await expect(
      uploadDocument(fixture.storage, { async recordUploaded() {} }, context, input)
    ).rejects.toBeInstanceOf(InvalidDocumentUploadError);
    expect(fixture.stored).toEqual([]);
  });

  it("remove o original se o registro transacional falhar", async () => {
    const fixture = createStorage();

    await expect(
      uploadDocument(
        fixture.storage,
        {
          async recordUploaded() {
            throw new Error("database unavailable");
          }
        },
        context,
        {
          title: "Ata sintética",
          documentType: "meeting_minutes",
          content: Buffer.from("%PDF-1.7")
        }
      )
    ).rejects.toThrow("database unavailable");
    expect(fixture.stored).toHaveLength(1);
    expect(fixture.removed).toEqual([fixture.stored[0]]);
  });

  it("bloqueia perfil sem permissão de upload", async () => {
    const fixture = createStorage();
    const readOnlyContext = { ...context, permissions: ["document:read"] as const };

    await expect(
      uploadDocument(fixture.storage, { async recordUploaded() {} }, readOnlyContext, {
        title: "Regimento sintético",
        documentType: "internal_rules",
        content: Buffer.from("%PDF-1.7")
      })
    ).rejects.toBeInstanceOf(DocumentUploadForbiddenError);
    expect(fixture.stored).toEqual([]);
  });
});
