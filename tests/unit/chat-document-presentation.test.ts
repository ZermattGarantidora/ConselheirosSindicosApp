import { readFile } from "node:fs/promises";
import { createElement, Fragment } from "react";
import { renderToStaticMarkup } from "react-dom/server";
import { describe, expect, it, vi } from "vitest";
import {
  DocumentBatchProgress,
  RecordedDocumentUpload,
  type DocumentUploadProgress
} from "../../apps/web/ChatDocumentAttachments.js";
import {
  recordedDocumentUploads,
  refreshTimeline,
  type TimelineEntry
} from "../../apps/web/conversation-timeline.js";

const document = { condominiumId: "alameda", documentVersionId: "v1", title: "Ata.pdf" };
const uploadEntry: TimelineEntry = {
  id: "entry-1",
  sequence: 1,
  createdAt: "2026-11-03T12:00:00.000Z",
  metadata: { documentVersionId: document.documentVersionId },
  messages: [{ id: "upload-1", role: "user", kind: "upload", text: document.title }]
};

function renderUploadConversation(
  entries: readonly TimelineEntry[],
  items: readonly DocumentUploadProgress[]
) {
  const uploads = recordedDocumentUploads(entries, document.condominiumId);
  return renderToStaticMarkup(
    createElement(
      Fragment,
      null,
      ...entries
        .flatMap((entry) => entry.messages)
        .map((message) =>
          message.kind === "upload"
            ? createElement(RecordedDocumentUpload, {
                key: message.id,
                name: message.text,
                document: uploads.get(message.id),
                items,
                onOpen: vi.fn()
              })
            : createElement("p", { key: message.id }, message.text)
        ),
      createElement(DocumentBatchProgress, {
        items,
        recordedDocuments: [...uploads.values()],
        onOpen: vi.fn()
      })
    )
  );
}

describe("AC-5710 — interface documental discreta", () => {
  it("AC-5814: não repete a bolha temporária quando o mesmo upload já está no histórico", () => {
    const html = renderToStaticMarkup(
      createElement(DocumentBatchProgress, {
        items: [{ id: "upload-1", name: "Ata.pdf", phase: "ready", document }],
        recordedDocuments: [document],
        onOpen: vi.fn()
      })
    );
    expect(html).not.toContain('aria-label="Visualizar Ata.pdf"');
    expect(html).not.toContain('class="user-message');
  });

  it("AC-5814: chegada, atualização repetida e recarga conservam uma bolha antes da resposta", () => {
    const items: readonly DocumentUploadProgress[] = [
      { id: "local-1", name: document.title, phase: "ready", document }
    ];
    const summary: TimelineEntry = {
      id: "entry-2",
      sequence: 2,
      createdAt: "2026-11-03T12:00:01.000Z",
      metadata: {},
      messages: [
        {
          id: "summary-1",
          role: "assistant",
          kind: "document_summary",
          text: "Análise sintética concluída."
        }
      ]
    };
    const page = { entries: [uploadEntry, summary], nextCursor: null, durable: true };
    const first = refreshTimeline(undefined, page);
    const repeated = refreshTimeline(first, page);
    for (const html of [
      renderUploadConversation([], items),
      renderUploadConversation(first.entries, items),
      renderUploadConversation(repeated.entries, items),
      renderUploadConversation(page.entries, [])
    ]) {
      expect(html.match(/aria-label="Visualizar Ata.pdf"/gu)).toHaveLength(1);
      expect(html.match(/class="user-message/gu)).toHaveLength(1);
      if (html.includes(summary.messages[0]!.text))
        expect(html.indexOf('aria-label="Visualizar Ata.pdf"')).toBeLessThan(
          html.indexOf(summary.messages[0]!.text)
        );
    }
  });

  it.each([
    ["processing", undefined, "Lendo e preparando", "status"],
    ["needs_review", undefined, "Leitura precisa de revisão ou confirmação", "status"],
    ["failed", "Envie uma versão legível.", "Envie uma versão legível.", "alert"],
    ["ready", "Falha após a leitura.", "Falha após a leitura.", "alert"]
  ] as const)("AC-5814: mantém %s na única entrada confirmada", (phase, error, text, role) => {
    const html = renderUploadConversation(
      [uploadEntry],
      [
        {
          id: "local-1",
          name: document.title,
          phase,
          document,
          ...(error === undefined ? {} : { error })
        }
      ]
    );
    expect(html.match(/aria-label="Visualizar Ata.pdf"/gu)).toHaveLength(1);
    expect(html.match(/class="user-message/gu)).toHaveLength(1);
    expect(html).toContain(text);
    expect(html).toContain(`role="${role}"`);
  });

  it("AC-5814: nome igual em outra versão ou condomínio não suprime upload local", () => {
    const items: readonly DocumentUploadProgress[] = [
      {
        id: "local-1",
        name: document.title,
        phase: "ready",
        document: { ...document, documentVersionId: "v2" }
      },
      {
        id: "local-2",
        name: document.title,
        phase: "processing",
        document: { ...document, condominiumId: "bosque" }
      },
      { id: "local-3", name: document.title, phase: "queued" }
    ];
    const html = renderUploadConversation([uploadEntry], items);
    expect(html.match(/class="user-message/gu)).toHaveLength(4);
    expect(html.match(/aria-label="Visualizar Ata.pdf"/gu)).toHaveLength(3);
    expect(html).toContain("Lendo e preparando");
    expect(html).toContain("Aguardando envio");
  });

  it("arquivo pronto conserva o original sem aviso de sucesso", () => {
    const html = renderToStaticMarkup(
      createElement(DocumentBatchProgress, {
        items: [
          {
            id: "1",
            name: "Ata.pdf",
            phase: "ready",
            document: { condominiumId: "alameda", documentVersionId: "v1", title: "Ata.pdf" }
          }
        ],
        onOpen: vi.fn()
      })
    );
    expect(html).toContain('aria-label="Visualizar Ata.pdf"');
    expect(html).not.toContain("Disponível para consulta");
    expect(html).not.toContain('role="status"');
    expect(html).not.toContain('role="alert"');
  });

  it("mantém progresso ativo, pendência e falha que exigem ação", () => {
    const html = renderToStaticMarkup(
      createElement(DocumentBatchProgress, {
        items: [
          { id: "1", name: "Ata.pdf", phase: "processing" },
          { id: "2", name: "Convenção.pdf", phase: "needs_review" },
          { id: "3", name: "Contrato.pdf", phase: "failed", error: "Envie uma versão legível." }
        ],
        onOpen: vi.fn()
      })
    );
    expect(html).toContain("Lendo e preparando");
    expect(html).toContain("Leitura precisa de revisão ou confirmação");
    expect(html).toContain("Envie uma versão legível.");
    expect(html.match(/role="alert"/gu)).toHaveLength(1);
  });

  it("não monta cartões de erro ou relatório e descarta a síntese de outra conversa", async () => {
    const app = await readFile("apps/web/App.tsx", "utf8");
    for (const text of [
      "Ver conferência documental e cálculos",
      "Ver os dez pontos",
      "Ver análise por documento",
      "Não consegui continuar agora",
      'className="assistant-message error-message"',
      "analysisOnly: true"
    ])
      expect(app).not.toContain(text);
    expect(app).toContain("const documentAnswer = message.answer ?? message.batch?.summary;");
    expect(app).toContain("answer={documentAnswer}");
    const complete = app.slice(
      app.indexOf("respond: async (documents) => {"),
      app.indexOf("const allReady = await sendDocumentBatch")
    );
    expect(complete).toContain('if (message !== "" && !uploadNotice) return;');
    expect(app).toContain("const uploadNotice = isDocumentUploadNotice(message)");
    expect(complete.indexOf("if (!isCurrent()) return;")).toBeGreaterThan(
      complete.indexOf("await requestDocumentBatchSummary")
    );
    expect(complete.indexOf("if (!isCurrent()) return;")).toBeLessThan(
      complete.indexOf("setDocumentConversationMessages")
    );
    expect(app).toContain("complete: () => batchResponse.finish()");
    expect(app).toContain("batch: { response: batchResponse, key: id }");
    const confirmation = app.slice(
      app.indexOf("if (input.batch !== undefined)"),
      app.indexOf('if (input.message !== "" && input.check.resumeProcessingStatus')
    );
    expect(confirmation).toContain("await waitForDocumentProcessing");
    expect(confirmation).toContain("await input.batch.response.respondIfReady()");
    expect(confirmation).not.toContain("converseAboutDocument");
  });
});
