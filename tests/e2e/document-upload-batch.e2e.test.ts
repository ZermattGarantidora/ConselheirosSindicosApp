import { randomUUID } from "node:crypto";
import { createElement } from "react";
import { renderToStaticMarkup } from "react-dom/server";
import { describe, expect, it, vi } from "vitest";
import { createApi } from "../../apps/api/app/create-api.js";
import { createDevelopmentDocumentMemory } from "../../apps/api/documents/development-document-memory.js";
import { createDevelopmentDocumentUploadRepository } from "../../apps/api/documents/development-document-upload-repository.js";
import { createDevelopmentIdentityRepository } from "../../apps/api/identity/development-identity-repository.js";
import { createInMemoryCondominiumProfileRepository } from "../../apps/api/identity/in-memory-condominium-profile.js";
import { createDemoWorkAdmission } from "../../apps/api/operations/demo-work-admission.js";
import { requestDocumentUploadWithAuthorizationRecovery } from "../../apps/web/document-upload-request.js";
import { waitForDocumentProcessing } from "../../apps/web/document-processing-request.js";
import { sendDocumentBatch } from "../../apps/web/document-upload-batch.js";
import {
  confirmDocumentCondominium,
  requestDocumentBatchSummary
} from "../../apps/web/document-condominium-confirmation.js";
import { createDocumentBatchResponse } from "../../apps/web/document-batch-response.js";
import { createAnswerTelemetry } from "../unit/answer-use-case.test-support.js";
import { AnswerMessage } from "../../apps/web/App.js";
import { saveChat } from "../../apps/web/chat-session.js";
import { createSyntheticPdf } from "../fixtures/synthetic-pdfs.js";

async function fixture() {
  const memory = createDevelopmentDocumentMemory();
  const repository = createDevelopmentDocumentUploadRepository();
  const memberships = createDevelopmentIdentityRepository();
  let processing = 0;
  let maximumProcessing = 0;
  const originals = new Map<string, Buffer>();
  let summaryCalls = 0;
  const app = createApi({
    membershipRepository: memberships,
    documentCatalogRepository: repository,
    documentUploadRepository: repository,
    condominiumProfileRepository: createInMemoryCondominiumProfileRepository([
      {
        condominiumId: "alameda",
        name: "Residencial Alameda",
        cnpj: null,
        address: {
          postalCode: "",
          street: "",
          number: "",
          complement: "",
          neighborhood: "",
          city: "Curitiba",
          state: "PR"
        },
        administrationCompany: "",
        unitCount: 40,
        contact: { managerName: "", email: "", phone: "" },
        description: ""
      }
    ]),
    codexDocumentBatchGateway: {
      generate: async (input) => {
        summaryCalls += 1;
        expect(new Set(input.evidence.map((item) => item.documentVersionId)).size).toBe(3);
        const source = input.evidence[0]!;
        return {
          output: {
            answer: "O mandato é de dois anos. Quer ajuda para conferir os demais prazos?",
            answerMode: "grounded",
            citations: [
              {
                evidenceId: source.id,
                documentId: source.documentId,
                documentVersionId: source.documentVersionId,
                title: source.documentTitle,
                page: source.pageNumber,
                excerpt: source.content
              }
            ],
            attentionPoints: [],
            suggestedNextStep: null,
            specialist: {
              required: true,
              type: "advogado",
              reason: "Confirme interpretações jurídicas antes de decidir."
            },
            claims: [
              {
                statement: "O mandato é de dois anos.",
                claimType: "interpretation",
                evidenceRequired: true,
                citationEvidenceIds: [source.id]
              }
            ]
          },
          telemetry: createAnswerTelemetry()
        };
      }
    },
    demoWorkAdmission: createDemoWorkAdmission({ residentBytes: () => 0 }),
    developmentDocumentMemory: {
      ...memory,
      async indexUploaded(input) {
        processing += 1;
        maximumProcessing = Math.max(maximumProcessing, processing);
        try {
          return await memory.indexUploaded(input);
        } finally {
          processing -= 1;
        }
      }
    },
    documentStorage: {
      async storeOriginal(input) {
        originals.set(input.objectId, input.content);
        return { storageKey: "synthetic" };
      },
      async removeOriginal(input) {
        originals.delete(input.objectId);
      }
    }
  });
  const request: typeof fetch = async (url, init) => {
    const response = await app.inject({
      url: String(url),
      method: init?.method === "POST" ? "POST" : "GET",
      headers: Object.fromEntries(new Headers(init?.headers).entries()),
      ...(init?.body === undefined
        ? {}
        : { payload: Buffer.from(await new Response(init.body).arrayBuffer()) })
    });
    return new Response(response.body, { status: response.statusCode });
  };
  const headers = { "x-development-user-id": "sindico-demo" };
  const chatId = randomUUID();
  await saveChat(
    request,
    { condominiumId: "alameda", headers },
    { id: chatId, title: "Lote sintético" }
  );
  const received: string[] = [];
  const statuses: string[] = [];
  async function process(file: File): Promise<boolean> {
    try {
      const response = await requestDocumentUploadWithAuthorizationRecovery(request, {
        condominiumId: "alameda",
        chatId,
        content: file,
        title: file.name,
        documentType: "other",
        authMode: "development",
        developmentUserId: "sindico-demo"
      });
      expect(response.status).toBe(202);
      const { documentVersionId } = (await response.json()) as { documentVersionId: string };
      received.push(documentVersionId);
      const status = await waitForDocumentProcessing(request, {
        condominiumId: "alameda",
        documentVersionId,
        headers,
        signal: AbortSignal.timeout(8000)
      });
      statuses.push(status);
      return status === "ready";
    } catch {
      statuses.push("failed");
      return false;
    }
  }
  return {
    app,
    request,
    headers,
    chatId,
    received,
    statuses,
    process,
    originals,
    maximumProcessing: () => maximumProcessing,
    summaryCalls: () => summaryCalls
  };
}

function pdf(name: string, text: string) {
  return new File([new Uint8Array(createSyntheticPdf([text]))], name, { type: "application/pdf" });
}

describe("AC-2009/2010 — lote no pipeline HTTP privado", () => {
  it("AC-5716/5817: legenda acompanha a análise única e é recuperada literalmente sem duplicação", async () => {
    const f = await fixture();
    try {
      const caption = "vou enviar ela por completo novamente";
      const ask = vi.fn(async () => {});
      const captionHeaders = {
        ...f.headers,
        "x-conversation-chat-id": f.chatId,
        "x-conversation-request-id": randomUUID()
      };
      const input = {
        condominiumId: "alameda",
        documentVersionIds: f.received,
        headers: captionHeaders,
        message: caption
      };
      await sendDocumentBatch({
        documents: [
          pdf("Ata.pdf", "Mandato de dois anos."),
          pdf("Regimento.pdf", "Horario de silencio apos as 22 horas."),
          pdf("Contrato.pdf", "Prazo de doze meses.")
        ],
        message: caption,
        isCurrent: () => true,
        process: f.process,
        complete: async () => {
          await requestDocumentBatchSummary(f.request, input);
        },
        ask
      });
      expect(ask).not.toHaveBeenCalled();
      await requestDocumentBatchSummary(f.request, input);
      expect(f.summaryCalls()).toBe(1);
      const changed = await f.app.inject({
        method: "POST",
        url: "/v1/condominiums/alameda/documents/conversation",
        headers: captionHeaders,
        payload: { documentVersionIds: f.received, message: "Segue o documento completo" }
      });
      expect(changed.statusCode).toBe(409);
      const history = (
        await f.app.inject({
          url: `/v1/condominiums/alameda/chats/${f.chatId}/messages`,
          headers: f.headers
        })
      ).json();
      const messages = history.entries.flatMap(
        (entry: { messages: { role: string; text: string }[] }) => entry.messages
      );
      expect(
        messages.filter(
          (message: { role: string; text: string }) =>
            message.role === "user" && message.text === caption
        )
      ).toHaveLength(1);
      expect(
        messages.filter(
          (message: { role: string; text: string }) =>
            message.role === "assistant" && message.text.includes("O mandato é de dois anos.")
        )
      ).toHaveLength(1);
      const invalid = await f.app.inject({
        method: "POST",
        url: "/v1/condominiums/alameda/documents/conversation",
        headers: f.headers,
        payload: {
          documentVersionIds: f.received,
          message: "Segue o documento, analise a vigência"
        }
      });
      expect(invalid.statusCode).toBe(400);
      expect(f.summaryCalls()).toBe(1);
    } finally {
      await f.app.close();
    }
  }, 30_000);
  it.each(["", "vou enviar ela por completo novamente"])(
    "AC-5704a/5716: duas confirmações liberam uma fala com legenda %s",
    async (caption) => {
      const f = await fixture();
      try {
        const keys = ["a", "b", "c"];
        const summaries: string[] = [];
        const batch = createDocumentBatchResponse<string>({
          keys,
          isCurrent: () => true,
          respond: async (versions) => {
            const result = await requestDocumentBatchSummary(f.request, {
              condominiumId: "alameda",
              documentVersionIds: versions,
              ...(caption === "" ? {} : { message: caption }),
              headers: f.headers
            });
            summaries.push(result.answer);
          }
        });
        await expect(
          sendDocumentBatch({
            documents: [
              pdf("Ata.pdf", "Mandato de dois anos."),
              pdf("Regimento - Condominio Bosque.pdf", "Horario de silencio: apos as 22 horas."),
              pdf("Contrato - Condominio Bosque.pdf", "Prazo de doze meses.")
            ],
            message: caption,
            isCurrent: () => true,
            process: async (file, index) => {
              const ready = await f.process(file);
              if (ready) batch.markReady(keys[index]!, f.received[index]!);
              return ready;
            },
            complete: () => batch.finish(),
            ask: async () => {
              throw new Error("Não deve fabricar pergunta.");
            }
          })
        ).resolves.toBe(false);
        expect(f.received).toHaveLength(3);
        expect(f.summaryCalls()).toBe(0);
        for (const index of [1, 2]) {
          const version = f.received[index]!;
          await confirmDocumentCondominium(f.request, {
            condominiumId: "alameda",
            documentVersionId: version,
            headers: f.headers
          });
          expect(
            await waitForDocumentProcessing(f.request, {
              condominiumId: "alameda",
              documentVersionId: version,
              headers: f.headers,
              signal: AbortSignal.timeout(8000)
            })
          ).toBe("ready");
          batch.markReady(keys[index]!, version);
          await batch.respondIfReady();
          expect(f.summaryCalls()).toBe(index === 1 ? 0 : 1);
        }
        await Promise.all([batch.finish(), batch.respondIfReady()]);
        expect(f.summaryCalls()).toBe(1);
        expect(summaries).toHaveLength(1);
        expect(summaries[0]).toContain("O mandato é de dois anos.");
      } finally {
        await f.app.close();
      }
    },
    30_000
  );

  // Cada um dos três acompanhamentos pode esperar até 8s; o teto do teste cobre o lote.
  it("recebe três PDFs no mesmo chat, respeita capacidade e consulta somente depois das leituras", async () => {
    const f = await fixture();
    try {
      let batchHtml = "";
      const ask = vi.fn(async () => {
        expect(f.statuses).toEqual(["ready", "ready", "ready"]);
        expect(batchHtml).toContain("O mandato é de dois anos.");
        expect(batchHtml).not.toContain("3 de 3");
      });
      await expect(
        sendDocumentBatch({
          documents: [
            pdf("Ata.pdf", "Mandato de dois anos."),
            pdf("Regimento.pdf", "Horario de silencio: apos as 22 horas."),
            pdf("Contrato.pdf", "Prazo de doze meses.")
          ],
          message: "Consulte os três arquivos.",
          isCurrent: () => true,
          process: f.process,
          complete: async () => {
            expect(f.statuses).toEqual(["ready", "ready", "ready"]);
            const listed = await f.request("/v1/condominiums/alameda/documents", {
              headers: f.headers
            });
            const metadata = (await listed.json()) as {
              documents: {
                expectedPageCount: number;
                processedPageCount: number;
                searchablePageCount: number;
                extractionCompleteness: number;
              }[];
            };
            expect(metadata.documents).toHaveLength(3);
            for (const document of metadata.documents)
              expect(document).toMatchObject({
                expectedPageCount: 1,
                processedPageCount: 1,
                searchablePageCount: 1,
                extractionCompleteness: 1
              });
            const summary = await requestDocumentBatchSummary(f.request, {
              condominiumId: "alameda",
              documentVersionIds: f.received,
              headers: f.headers
            });
            expect(summary.answer).toContain("Quer ajuda");
            batchHtml = renderToStaticMarkup(
              createElement(AnswerMessage, {
                answer: summary,
                question: "",
                onSelectCitation: vi.fn()
              })
            );
            expect(batchHtml).toContain("O mandato é de dois anos. Quer ajuda");
            expect(summary.citations[0]?.excerpt).toContain("Mandato de dois anos.");
            expect(batchHtml).toContain("Ata.pdf");
            expect(batchHtml).toContain("página 1");
            expect(batchHtml).toContain('aria-label="Ver fontes da resposta"');
            expect(batchHtml).not.toContain("Ver análise por documento");
            expect(batchHtml).not.toContain("Relatórios disponíveis");
          },
          ask
        })
      ).resolves.toBe(true);
      expect(ask).toHaveBeenCalledOnce();
      expect(f.summaryCalls()).toBe(1);
      expect(f.maximumProcessing()).toBe(1);
      expect(new Set(f.received).size).toBe(3);
      expect(f.originals.size).toBe(3);
      const history = await f.app.inject({
        url: `/v1/condominiums/alameda/history?chatId=${f.chatId}`,
        headers: f.headers
      });
      expect(history.statusCode).toBe(200);
      expect(
        history
          .json()
          .attachments.map((item: { documentVersionId: string }) => item.documentVersionId)
      ).toEqual(f.received);
      const otherTenant = await f.app.inject({
        url: "/v1/condominiums/bosque/documents",
        headers: f.headers
      });
      expect(otherTenant.statusCode).toBe(200);
      expect(otherTenant.json().documents).toEqual([]);
      const denied = await f.app.inject({
        url: "/v1/condominiums/alameda/documents",
        headers: { "x-development-user-id": "sindico-outro" }
      });
      expect(denied.statusCode).toBe(403);
    } finally {
      await f.app.close();
    }
  }, 30_000);

  it("mantém os originais recebidos e termina os demais quando um PDF falha na leitura", async () => {
    const f = await fixture();
    try {
      const ask = vi.fn();
      const invalid = new File(["%PDF-1.7\nPDF sintético sem estrutura"], "Incompleto.pdf", {
        type: "application/pdf"
      });
      await expect(
        sendDocumentBatch({
          documents: [
            pdf("Primeiro.pdf", "Regra legível."),
            invalid,
            pdf("Terceiro.pdf", "Outra regra legível.")
          ],
          message: "Compare todos.",
          isCurrent: () => true,
          process: f.process,
          ask
        })
      ).resolves.toBe(false);
      expect(f.statuses).toEqual(["ready", "failed", "ready"]);
      expect(f.received).toHaveLength(3);
      expect(f.originals.size).toBe(3);
      expect(ask).not.toHaveBeenCalled();
      expect(f.maximumProcessing()).toBe(1);
    } finally {
      await f.app.close();
    }
  });
});
