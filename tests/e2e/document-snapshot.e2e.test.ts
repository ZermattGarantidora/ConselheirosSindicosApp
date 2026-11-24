import { describe, expect, it, vi } from "vitest";
import { createApi } from "../../apps/api/app/create-api.js";
import { createLocalSyntheticAnswerGateway } from "../../apps/api/answers/answer-gateway.js";
import { createDevelopmentDocumentMemory } from "../../apps/api/documents/development-document-memory.js";
import { createDevelopmentDocumentUploadRepository } from "../../apps/api/documents/development-document-upload-repository.js";
import { createDevelopmentIdentityRepository } from "../../apps/api/identity/development-identity-repository.js";
import { createSyntheticPdf } from "../fixtures/synthetic-pdfs.js";
import {
  sendDocumentMessage,
  waitForDocumentProcessing
} from "../../apps/web/document-processing-request.js";
import { requestDocumentConversationResult } from "../../apps/web/document-condominium-confirmation.js";
import { managerContext } from "../unit/answer-fixtures.js";

const headers = { "x-development-user-id": "sindico-demo" };
function fixture(
  options: {
    blockedReading?: Promise<void>;
    gatewayFails?: boolean;
    afterGenerate?: () => void | Promise<void>;
    readerFails?: boolean;
  } = {}
) {
  const memory = createDevelopmentDocumentMemory();
  const repository = createDevelopmentDocumentUploadRepository();
  const memberships = createDevelopmentIdentityRepository();
  let revoked = false;
  const readAuthorized = vi.fn(
    async (...args: Parameters<typeof memory.analysisReader.readAuthorized>) => {
      if (options.readerFails) throw new Error("private-internal-error");
      return memory.analysisReader.readAuthorized(...args);
    }
  );
  const generate = vi.fn(
    async (
      input: Parameters<ReturnType<typeof createLocalSyntheticAnswerGateway>["generate"]>[0]
    ) => {
      if (options.gatewayFails) throw new Error("private-provider-error");
      const result = await createLocalSyntheticAnswerGateway().generate(input);
      await options.afterGenerate?.();
      return {
        ...result,
        output: {
          ...result.output,
          answer: input.question.includes('"state":"received"')
            ? "Recebi [[DOCUMENT]] em [[CONDOMINIUM]] e vou trazer a leitura inicial."
            : "Recebi [[DOCUMENT]] em [[CONDOMINIUM]]. Segue o raio-X inicial. [[DETECTED]]",
          citations: []
        }
      };
    }
  );
  const app = createApi({
    membershipRepository: {
      async findMembership(input) {
        return revoked ? undefined : memberships.findMembership(input);
      }
    },
    documentCatalogRepository: repository,
    documentUploadRepository: repository,
    developmentDocumentMemory: {
      ...memory,
      async indexUploaded(input) {
        await options.blockedReading;
        return memory.indexUploaded(input);
      }
    },
    documentAnalysisReader: { readAuthorized },
    setupMessageGateway: { generate },
    documentStorage: {
      async storeOriginal() {
        return { storageKey: "synthetic" };
      },
      async removeOriginal() {}
    }
  });
  const transport: typeof fetch = async (url, init) => {
    const response = await app.inject({
      method: init?.method === "POST" ? "POST" : "GET",
      url: String(url),
      headers: Object.fromEntries(new Headers(init?.headers).entries()),
      ...(init?.body === undefined ? {} : { payload: String(init.body) })
    });
    return new Response(response.body, { status: response.statusCode });
  };
  async function upload(
    text = "Balancete 01/2026\nReceitas: R$ 10.000,00\nDespesas: R$ 8.000,00",
    validity = true,
    separatePages = false
  ) {
    const response = await app.inject({
      method: "POST",
      url: "/v1/condominiums/alameda/documents",
      headers: {
        ...headers,
        "content-type": "application/pdf",
        "x-document-title": "Arquivo.pdf",
        "x-document-type": "other",
        "x-document-validity-confirmed": String(validity)
      },
      payload: createSyntheticPdf(separatePages ? text.split("\n") : [text], { pageWidth: 1100 })
    });
    expect(response.statusCode).toBe(202);
    return response.json().documentVersionId as string;
  }
  async function wait(versionId: string) {
    await expect
      .poll(async () => {
        const response = await app.inject({ url: "/v1/condominiums/alameda/documents", headers });
        return response
          .json()
          .documents.find(
            (document: { documentVersionId: string }) => document.documentVersionId === versionId
          )?.processingStatus;
      })
      .not.toMatch(/^(?:uploaded|processing)$/u);
  }
  const converse = (versionId: string, event = "status", tenant = "alameda") =>
    app.inject({
      method: "POST",
      url: `/v1/condominiums/${tenant}/documents/${versionId}/conversation`,
      headers,
      payload: { event }
    });
  return {
    app,
    repository,
    upload,
    wait,
    converse,
    readAuthorized,
    generate,
    transport,
    revoke() {
      revoked = true;
    }
  };
}

describe("recebimento e resumo automático no fluxo HTTP — Spec 045", () => {
  it("AC-4501: processamento pode avançar durante a fala de recebimento sem invalidá-la", async () => {
    let changeState: () => Promise<void> = async () => {};
    const f = fixture({ afterGenerate: () => changeState() });
    try {
      const version = await f.upload();
      await f.wait(version);
      changeState = async () => {
        await f.repository.updateProcessingStatus?.(managerContext, {
          documentVersionId: version,
          processingStatus: "needs_review"
        });
      };
      const received = await f.converse(version, "received");
      expect(received.statusCode).toBe(200);
      expect(received.json().message).toContain("Recebi");
      expect(f.readAuthorized).not.toHaveBeenCalled();
    } finally {
      await f.app.close();
    }
  });

  it("AC-4501/4502: arquivo sem pergunta recebe confirmação antes da leitura e raio-X com dados depois", async () => {
    let finish!: () => void;
    const blockedReading = new Promise<void>((resolve) => {
      finish = resolve;
    });
    const f = fixture({ blockedReading });
    const ask = vi.fn();
    let versionId = "";
    try {
      await sendDocumentMessage({
        message: "",
        receive: async () => {
          versionId = await f.upload();
        },
        acknowledge: async () => {
          const received = await f.converse(versionId, "received");
          expect(received.statusCode).toBe(200);
          expect(received.json().message).toContain("Recebi");
          expect(received.json().snapshot).toBeUndefined();
          expect(f.readAuthorized).not.toHaveBeenCalled();
        },
        waitUntilProcessed: async () => {
          finish();
          await f.wait(versionId);
          const status = await waitForDocumentProcessing(f.transport, {
            condominiumId: "alameda",
            documentVersionId: versionId,
            headers,
            signal: AbortSignal.timeout(3000)
          });
          const result = await requestDocumentConversationResult(f.transport, {
            condominiumId: "alameda",
            documentVersionId: versionId,
            headers,
            event: "status"
          });
          expect(result.snapshot?.status).toBe("available");
          expect(JSON.stringify(result.snapshot?.rows)).toContain("10.000,00");
          expect(
            result.snapshot?.rows.every((row) =>
              row.citations.every((citation) => citation.documentVersionId === versionId)
            )
          ).toBe(true);
          return status;
        },
        ask
      });
      expect(ask).not.toHaveBeenCalled();
      const inputs = JSON.stringify(f.generate.mock.calls);
      for (const privateValue of ["Arquivo.pdf", versionId, "10.000", "01/2026", "alameda"])
        expect(inputs).not.toContain(privateValue);
      expect(f.generate).toHaveBeenCalledTimes(2);
      for (const [input] of f.generate.mock.calls) expect(input.evidence).toEqual([]);
    } finally {
      finish();
      await f.app.close();
    }
  });

  it("AC-4903: mês futuro não participa da comparação do balancete recebido", async () => {
    const f = fixture();
    try {
      const other = await f.upload("Balancete 02/2026\nReceitas: R$ 999.999,00");
      await f.wait(other);
      const version = await f.upload();
      await f.wait(version);
      const response = await f.converse(version);
      expect(response.statusCode).toBe(200);
      expect(response.body).not.toContain("999.999");
      expect(f.readAuthorized.mock.calls[0]?.[1]).toEqual([version]);
      expect(response.headers["cache-control"]).toBe("private, no-store");
    } finally {
      await f.app.close();
    }
  });

  it("AC-4901/4903/4904: recebimento sem pergunta confere fechamento, histórico e apoios com fontes", async () => {
    const f = fixture();
    try {
      const january = await f.upload(
        "Balancete 01/2026\nRegime: caixa\nReceitas: R$ 9.000,00\nDespesas: R$ 6.000,00",
        true,
        true
      );
      await f.wait(january);
      const february = await f.upload(
        "Balancete 02/2026\nRegime: caixa\nReceitas: R$ 9.000,00\nDespesas: R$ 7.000,00",
        true,
        true
      );
      await f.wait(february);
      const budget = await f.upload(
        "Orcamento mensal 03/2026\nDespesas previstas: R$ 7.500,00",
        true,
        true
      );
      await f.wait(budget);
      const bank = await f.upload(
        "Extrato bancario 03/2026\nConta bancaria: operacao\nSaldo final: R$ 2.500,00",
        true,
        true
      );
      await f.wait(bank);
      const version = await f.upload(
        "Balancete 03/2026\nRegime: caixa\nConta bancaria: operacao\nSaldo inicial: R$ 1.000,00\nReceitas: R$ 10.000,00\nDespesas: R$ 8.000,00\nSaldo final: R$ 2.500,00\nSaldo bancario: R$ 3.000,00",
        true,
        true
      );
      await f.wait(version);
      const response = await f.converse(version);
      expect(response.statusCode).toBe(200);
      const report = response.json().snapshot;
      expect(report.financialReview.checks).toHaveLength(10);
      const get = (id: string) =>
        report.financialReview.checks.find((item: { id: string }) => item.id === id);
      expect(get("closing").detail).toContain("-R$ 500,00");
      expect(get("closing").status).toBe("atenção");
      expect(get("budget").status).toBe("atenção");
      expect(get("bank").status).toBe("atenção");
      expect(
        report.rows.some((row: { detail: string }) => row.detail.includes("2026-01: R$"))
      ).toBe(true);
      expect(
        report.rows.some((row: { detail: string }) => row.detail.includes("2026-02: R$"))
      ).toBe(true);
      expect(get("history").missingDocuments).toEqual([]);
      const cited = new Set(
        report.rows.flatMap((row: { citations: { documentVersionId: string }[] }) =>
          row.citations.map((item) => item.documentVersionId)
        )
      );
      expect(cited).toEqual(new Set([version, january, february]));
      expect(
        get("bank").citations.some(
          (item: { documentVersionId: string }) => item.documentVersionId === bank
        )
      ).toBe(true);
      const inputs = JSON.stringify(f.generate.mock.calls);
      for (const privateValue of ["10.000", "03/2026", version, january, "Saldo bancario"])
        expect(inputs).not.toContain(privateValue);
    } finally {
      await f.app.close();
    }
  });

  it.each(["archive", "review"] as const)(
    "AC-4906: %s de fonte histórica durante geração impede publicação",
    async (action) => {
      let change = async () => {};
      const f = fixture({ afterGenerate: () => change() });
      try {
        const prior = await f.upload("Balancete 02/2026\nReceitas: R$ 9.000,00", true, true);
        await f.wait(prior);
        const version = await f.upload("Balancete 03/2026\nReceitas: R$ 10.000,00", true, true);
        await f.wait(version);
        change = async () => {
          if (action === "review")
            await f.repository.updateProcessingStatus?.(managerContext, {
              documentVersionId: prior,
              processingStatus: "needs_review"
            });
          else {
            const registered = (await f.repository.listAuthorized(managerContext)).find(
              (item) => item.documentVersionId === prior
            )!;
            await f.repository.archiveAuthorized?.(managerContext, registered.documentId);
          }
        };
        const result = await f.converse(version);
        expect(result.statusCode).toBe(409);
        expect(result.json().snapshot).toBeUndefined();
        expect(result.body).not.toContain("9.000");
      } finally {
        await f.app.close();
      }
    }
  );

  it("AC-4503/4504: divergência bloqueia análise até confirmar; vigência continua independente", async () => {
    const f = fixture();
    try {
      const version = await f.upload(
        "Condominio Bosque\nAta de assembleia\nAprovada a manutenção até novembro."
      );
      await f.wait(version);
      expect((await f.converse(version)).json().snapshot).toBeUndefined();
      expect((await f.converse(version, "cancelled")).json().snapshot).toBeUndefined();
      expect(f.readAuthorized).not.toHaveBeenCalled();
      const confirmed = await f.app.inject({
        method: "POST",
        url: `/v1/condominiums/alameda/documents/${version}/confirm-condominium`,
        headers,
        payload: { confirm: true }
      });
      expect(confirmed.statusCode).toBe(200);
      expect((await f.converse(version, "confirmed")).json().snapshot.status).toBe("available");
      const pending = await f.upload("Balancete 01/2026", false);
      await f.wait(pending);
      const before = f.readAuthorized.mock.calls.length;
      expect((await f.converse(pending)).json().snapshot).toBeUndefined();
      expect(f.readAuthorized).toHaveBeenCalledTimes(before);
    } finally {
      await f.app.close();
    }
  });

  it("AC-4503: outro tenant e revogação durante a fala não devolvem resumo", async () => {
    let revoke = () => {};
    const f = fixture({ afterGenerate: () => revoke() });
    try {
      const version = await f.upload();
      await f.wait(version);
      expect((await f.converse(version, "status", "bosque")).statusCode).toBe(404);
      expect(f.readAuthorized).not.toHaveBeenCalled();
      revoke = f.revoke;
      const response = await f.converse(version);
      expect(response.statusCode).toBe(403);
      expect(response.body).not.toContain("10.000");
    } finally {
      await f.app.close();
    }
  });

  it("AC-4503: relatório local sobrevive à falha do gateway sem fabricar fala", async () => {
    const f = fixture({ gatewayFails: true });
    try {
      const version = await f.upload();
      await f.wait(version);
      const response = await f.converse(version);
      expect(response.statusCode).toBe(200);
      expect(response.json().message).toBeUndefined();
      expect(response.json().snapshot.status).toBe("available");
      expect(response.body).not.toContain("private-provider-error");
    } finally {
      await f.app.close();
    }
  });

  it("AC-4503: reader falha de forma segura sem conteúdo ou erro interno", async () => {
    const f = fixture({ readerFails: true });
    try {
      const version = await f.upload();
      await f.wait(version);
      const response = await f.converse(version);
      expect(response.statusCode).toBe(200);
      expect(response.json().snapshot.status).toBe("unavailable");
      expect(response.json().snapshot.rows).toEqual([]);
      expect(response.body).not.toContain("private-internal-error");
      expect(response.body).not.toContain("10.000");
    } finally {
      await f.app.close();
    }
  });
});
