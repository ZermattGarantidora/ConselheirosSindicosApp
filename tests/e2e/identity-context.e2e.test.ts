import { afterAll, describe, expect, it } from "vitest";

import { createApi } from "../../apps/api/app/create-api.js";
import { createCondominiumId } from "../../apps/api/core/condominium-scope.js";
import type { PrivateDocumentStorage } from "../../apps/api/documents/private-document-storage.js";
import type { UploadedDocumentRecord } from "../../apps/api/documents/upload-document.js";
import { createDevelopmentIdentityRepository } from "../../apps/api/identity/development-identity-repository.js";
import {
  createUserId,
  type MembershipRepository
} from "../../apps/api/identity/authorized-condominium-context.js";

describe("seleção de condomínio", () => {
  const app = createApi({
    membershipRepository: createDevelopmentIdentityRepository(),
    now: () => new Date("2026-09-01T00:00:00.000Z")
  });

  afterAll(async () => {
    await app.close();
  });

  it("expõe o health check versionado", async () => {
    const response = await app.inject({ method: "GET", url: "/health" });

    expect(response.statusCode).toBe(200);
    expect(response.json()).toEqual({
      status: "ok",
      version: "0.1.0",
      aiProvider: "local",
      authMode: "development",
      googleAuthEnabled: false
    });
  });

  it("AC-001: devolve o contexto autorizado no servidor", async () => {
    const response = await app.inject({
      method: "GET",
      url: "/v1/condominiums/alameda/context",
      headers: { "x-development-user-id": "sindico-demo" }
    });

    expect(response.statusCode).toBe(200);
    expect(response.json()).toEqual({
      condominiumId: "alameda",
      role: "manager",
      permissions: ["document:read", "document:upload"]
    });
  });

  it("AC-002: nega o acesso sem confirmar o condomínio alvo", async () => {
    const response = await app.inject({
      method: "GET",
      url: "/v1/condominiums/bosque/context",
      headers: { "x-development-user-id": "morador-alameda-demo" }
    });

    expect(response.statusCode).toBe(403);
    expect(response.json()).toEqual({ message: "Acesso não autorizado." });
  });

  it("AC-003: revalida a membership depois de uma revogação", async () => {
    let revoked = false;
    const repository: MembershipRepository = {
      async findMembership({ condominiumId, userId }) {
        return {
          condominiumId,
          userId,
          roleKey: "manager",
          status: revoked ? "revoked" : "active",
          validFrom: new Date("2026-01-01T00:00:00.000Z"),
          revision: "membership-v1"
        };
      }
    };
    const revocableApp = createApi({
      membershipRepository: repository,
      now: () => new Date("2026-09-01T00:00:00.000Z")
    });

    const firstResponse = await revocableApp.inject({
      method: "GET",
      url: `/v1/condominiums/${createCondominiumId("alameda")}/context`,
      headers: { "x-development-user-id": createUserId("sindico-demo") }
    });
    revoked = true;
    const responseAfterRevocation = await revocableApp.inject({
      method: "GET",
      url: "/v1/condominiums/alameda/context",
      headers: { "x-development-user-id": "sindico-demo" }
    });

    expect(firstResponse.statusCode).toBe(200);
    expect(responseAfterRevocation.statusCode).toBe(403);
    await revocableApp.close();
  });

  it("recusa identidade de desenvolvimento ausente", async () => {
    const response = await app.inject({ method: "GET", url: "/v1/condominiums/alameda/context" });

    expect(response.statusCode).toBe(401);
    expect(response.json()).toEqual({ message: "Identidade de desenvolvimento inválida." });
  });

  it("T302: aceita somente PDF de gestor autorizado e não expõe a chave privada", async () => {
    const recorded: UploadedDocumentRecord[] = [];
    const storage: PrivateDocumentStorage = {
      async storeOriginal({ objectId }) {
        return { storageKey: `private/${objectId}` };
      },
      async removeOriginal() {}
    };
    const uploadApp = createApi({
      membershipRepository: createDevelopmentIdentityRepository(),
      documentStorage: storage,
      documentUploadRepository: {
        async recordUploaded(record) {
          recorded.push(record);
        }
      },
      now: () => new Date("2026-09-01T00:00:00.000Z")
    });

    const response = await uploadApp.inject({
      method: "POST",
      url: "/v1/condominiums/alameda/documents",
      headers: {
        "content-type": "application/pdf",
        "x-development-user-id": "sindico-demo",
        "x-document-title": "Convenção sintética",
        "x-document-type": "convention"
      },
      payload: Buffer.from("%PDF-1.7\\nconteúdo sintético")
    });

    expect(response.statusCode).toBe(202);
    expect(response.json()).toMatchObject({
      processingStatus: "uploaded",
      validityStatus: "pending"
    });
    expect(response.body).not.toContain("private/");
    expect(recorded).toHaveLength(1);
    expect(recorded[0]).toMatchObject({ condominiumId: "alameda", documentType: "convention" });
    await uploadApp.close();
  });

  it("T302: bloqueia upload em condomínio não autorizado antes do storage", async () => {
    let writes = 0;
    const storage: PrivateDocumentStorage = {
      async storeOriginal() {
        writes += 1;
        return { storageKey: "private/unreachable" };
      },
      async removeOriginal() {}
    };
    const uploadApp = createApi({
      membershipRepository: createDevelopmentIdentityRepository(),
      documentStorage: storage,
      now: () => new Date("2026-09-01T00:00:00.000Z")
    });

    const response = await uploadApp.inject({
      method: "POST",
      url: "/v1/condominiums/bosque/documents",
      headers: {
        "content-type": "application/pdf",
        "x-development-user-id": "morador-alameda-demo",
        "x-document-title": "Documento sintético",
        "x-document-type": "other"
      },
      payload: Buffer.from("%PDF-1.7")
    });

    expect(response.statusCode).toBe(403);
    expect(writes).toBe(0);
    await uploadApp.close();
  });

  it("T302: bloqueia perfil autorizado somente para leitura antes do storage", async () => {
    let writes = 0;
    const storage: PrivateDocumentStorage = {
      async storeOriginal() {
        writes += 1;
        return { storageKey: "private/unreachable" };
      },
      async removeOriginal() {}
    };
    const uploadApp = createApi({
      membershipRepository: createDevelopmentIdentityRepository(),
      documentStorage: storage,
      now: () => new Date("2026-09-01T00:00:00.000Z")
    });

    const response = await uploadApp.inject({
      method: "POST",
      url: "/v1/condominiums/alameda/documents",
      headers: {
        "content-type": "application/pdf",
        "x-development-user-id": "morador-alameda-demo",
        "x-document-title": "Documento sintético",
        "x-document-type": "other"
      },
      payload: Buffer.from("%PDF-1.7")
    });

    expect(response.statusCode).toBe(403);
    expect(writes).toBe(0);
    await uploadApp.close();
  });

  it("T302: retorna falha recuperável sem expor erro interno de storage", async () => {
    const storage: PrivateDocumentStorage = {
      async storeOriginal() {
        throw new Error("storage unavailable");
      },
      async removeOriginal() {}
    };
    const uploadApp = createApi({
      membershipRepository: createDevelopmentIdentityRepository(),
      documentStorage: storage,
      now: () => new Date("2026-09-01T00:00:00.000Z")
    });

    const response = await uploadApp.inject({
      method: "POST",
      url: "/v1/condominiums/alameda/documents",
      headers: {
        "content-type": "application/pdf",
        "x-development-user-id": "sindico-demo",
        "x-document-title": "Documento sintético",
        "x-document-type": "other"
      },
      payload: Buffer.from("%PDF-1.7")
    });

    expect(response.statusCode).toBe(500);
    expect(response.json()).toEqual({
      message: "Não foi possível registrar o documento com segurança."
    });
    await uploadApp.close();
  });
});
