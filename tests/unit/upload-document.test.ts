import { createHash } from "node:crypto";

import { describe, expect, it } from "vitest";

import { createCondominiumId } from "../../apps/api/core/condominium-scope.js";
import type { AuthorizedCondominiumContext } from "../../apps/api/identity/authorized-condominium-context.js";
import type { PrivateDocumentStorage } from "../../apps/api/documents/private-document-storage.js";
import {
  DocumentUploadForbiddenError,
  InvalidDocumentUploadError,
  maximumImageUploadBytes,
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

function syntheticPng(): Buffer {
  const signature = Buffer.from([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a]);
  const ihdr = Buffer.concat([
    Buffer.from([0, 0, 0, 13]),
    Buffer.from("IHDR"),
    Buffer.from([0, 0, 0, 2, 0, 0, 0, 2, 8, 2, 0, 0, 0]),
    Buffer.alloc(4)
  ]);
  const idat = Buffer.concat([
    Buffer.from([0, 0, 0, 1]),
    Buffer.from("IDAT"),
    Buffer.from([0]),
    Buffer.alloc(4)
  ]);
  const iend = Buffer.concat([Buffer.from([0, 0, 0, 0]), Buffer.from("IEND"), Buffer.alloc(4)]);
  return Buffer.concat([signature, ihdr, idat, iend]);
}

function syntheticJpeg(): Buffer {
  return Buffer.from([
    0xff, 0xd8, 0xff, 0xc0, 0x00, 0x0b, 0x08, 0x00, 0x02, 0x00, 0x02, 0x01, 0x01, 0x11, 0x00, 0xff,
    0xda, 0x00, 0x08, 0x01, 0x01, 0x00, 0x00, 0x3f, 0x00, 0x01, 0x02, 0xff, 0xd9
  ]);
}

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

  it("persiste a confirmação explícita para permitir o uso documental", async () => {
    const fixture = createStorage();
    let recorded: UploadedDocumentRecord | undefined;

    await uploadDocument(
      fixture.storage,
      {
        async recordUploaded(record) {
          recorded = record;
        }
      },
      context,
      {
        title: "Ata sintética confirmada",
        documentType: "meeting_minutes",
        content: Buffer.from("%PDF-1.7"),
        validityConfirmed: true
      }
    );

    expect(recorded?.validityStatus).toBe("confirmed");
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

  it("armazena fotos sintéticas validadas como JPEG e PNG no condomínio", async () => {
    const photos: readonly Readonly<{ mediaType: "image/png" | "image/jpeg"; content: Buffer }>[] =
      [
        { mediaType: "image/png" as const, content: syntheticPng() },
        { mediaType: "image/jpeg" as const, content: syntheticJpeg() }
      ];
    for (const { mediaType, content } of photos) {
      const fixture = createStorage();
      let recorded: UploadedDocumentRecord | undefined;
      await uploadDocument(
        fixture.storage,
        {
          async recordUploaded(record) {
            recorded = record;
          }
        },
        context,
        { title: "Foto sintética", documentType: "other", content, mediaType }
      );
      expect(recorded?.mediaType).toBe(mediaType);
      expect(recorded?.condominiumId).toBe("alameda");
      expect(fixture.stored).toHaveLength(1);
    }
  });

  it("rejeita imagem truncada, MIME divergente ou acima de 10 MiB antes de persistir", async () => {
    const fixture = createStorage();
    const repository = { async recordUploaded() {} };
    await expect(
      uploadDocument(fixture.storage, repository, context, {
        title: "Imagem truncada",
        documentType: "other",
        content: Buffer.from([0xff, 0xd8]),
        mediaType: "image/jpeg"
      })
    ).rejects.toBeInstanceOf(InvalidDocumentUploadError);
    await expect(
      uploadDocument(fixture.storage, repository, context, {
        title: "MIME divergente",
        documentType: "other",
        content: syntheticPng(),
        mediaType: "image/jpeg"
      })
    ).rejects.toBeInstanceOf(InvalidDocumentUploadError);
    await expect(
      uploadDocument(fixture.storage, repository, context, {
        title: "Imagem excedente",
        documentType: "other",
        content: Buffer.alloc(maximumImageUploadBytes + 1),
        mediaType: "image/png"
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
  ])(
    "rejeita metadados ou limites inválidos antes de gravar",
    async (input: Parameters<typeof uploadDocument>[3]) => {
      const fixture = createStorage();

      await expect(
        uploadDocument(fixture.storage, { async recordUploaded() {} }, context, input)
      ).rejects.toBeInstanceOf(InvalidDocumentUploadError);
      expect(fixture.stored).toEqual([]);
    }
  );

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

  it("aceita o identificador de um documento existente para criar nova versão", async () => {
    const fixture = createStorage();
    const documentId = "11111111-1111-4111-8111-111111111111";
    let recorded: UploadedDocumentRecord | undefined;

    await uploadDocument(
      fixture.storage,
      {
        async recordUploaded(record) {
          recorded = record;
        }
      },
      context,
      {
        title: "Convenção revisada",
        documentType: "convention",
        documentId,
        content: Buffer.from("%PDF-1.7")
      }
    );

    expect(recorded?.documentId).toBe(documentId);
  });

  it("rejeita identificador de documento inválido antes de gravar", async () => {
    const fixture = createStorage();

    await expect(
      uploadDocument(fixture.storage, { async recordUploaded() {} }, context, {
        title: "Documento inválido",
        documentType: "other",
        documentId: "documento-inválido",
        content: Buffer.from("%PDF-1.7")
      })
    ).rejects.toThrow("identificador do documento");
    expect(fixture.stored).toEqual([]);
  });
});
