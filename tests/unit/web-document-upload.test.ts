import { describe, expect, it } from "vitest";

import { requestDocumentUploadWithAuthorizationRecovery } from "../../apps/web/document-upload-request.js";

function jsonResponse(status: number, body: unknown): Response {
  return new Response(JSON.stringify(body), {
    status,
    headers: { "content-type": "application/json" }
  });
}

describe("recuperação de autorização no upload documental", () => {
  it("revalida o mesmo contexto e repete uma única vez quando a permissão continua ativa", async () => {
    const calls: Array<Readonly<{ url: string; init: RequestInit | undefined }>> = [];
    const responses = [
      jsonResponse(403, { message: "Acesso não autorizado." }),
      jsonResponse(200, {
        condominiumId: "condominio-autorizado",
        role: "manager",
        permissions: ["document:read", "document:upload"]
      }),
      jsonResponse(202, { processingStatus: "uploaded" })
    ];
    const fetchRequest = async (url: string, init?: RequestInit): Promise<Response> => {
      calls.push({ url, init });
      const response = responses.shift();
      if (response === undefined) throw new Error("Chamada inesperada.");
      return response;
    };
    const content = new Blob(["%PDF-1.4 conteúdo sintético"], { type: "application/pdf" });

    const response = await requestDocumentUploadWithAuthorizationRecovery(fetchRequest, {
      condominiumId: "condominio-autorizado",
      content,
      title: "Ata sintética",
      documentType: "meeting_minutes",
      authMode: "real"
    });

    expect(response.status).toBe(202);
    expect(calls.map((call) => call.url)).toEqual([
      "/v1/condominiums/condominio-autorizado/documents",
      "/v1/condominiums/condominio-autorizado/context",
      "/v1/condominiums/condominio-autorizado/documents"
    ]);
    expect(calls.every((call) => call.init?.credentials === "same-origin")).toBe(true);
    expect(calls[0]?.init?.body).toBe(content);
    expect(calls[2]?.init?.body).toBe(content);
  });

  it("não repete o upload quando o contexto não confirma a permissão", async () => {
    const responses = [
      jsonResponse(403, { message: "Acesso não autorizado." }),
      jsonResponse(200, {
        condominiumId: "condominio-autorizado",
        role: "advisor",
        permissions: ["document:read"]
      })
    ];
    let calls = 0;
    const response = await requestDocumentUploadWithAuthorizationRecovery(
      async () => {
        calls += 1;
        const next = responses.shift();
        if (next === undefined) throw new Error("Chamada inesperada.");
        return next;
      },
      {
        condominiumId: "condominio-autorizado",
        content: new Blob(["%PDF-1.4"]),
        title: "Ata sintética",
        documentType: "meeting_minutes",
        authMode: "real"
      }
    );

    expect(response.status).toBe(403);
    expect(calls).toBe(2);
  });

  it("não repete falhas que não são de autenticação ou autorização", async () => {
    let calls = 0;
    const response = await requestDocumentUploadWithAuthorizationRecovery(
      async () => {
        calls += 1;
        return jsonResponse(500, { message: "Falha de armazenamento." });
      },
      {
        condominiumId: "condominio-autorizado",
        content: new Blob(["%PDF-1.4"]),
        title: "Ata sintética",
        documentType: "meeting_minutes",
        authMode: "real"
      }
    );

    expect(response.status).toBe(500);
    expect(calls).toBe(1);
  });
});
