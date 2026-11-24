import { createElement } from "react";
import { renderToStaticMarkup } from "react-dom/server";
import { describe, expect, it, vi } from "vitest";
import {
  DocumentAvailability,
  DocumentLibrary,
  LibraryDocumentList
} from "../../apps/web/DocumentLibrary.js";
import {
  documentValidityLabel,
  filterLibraryDocuments,
  loadCondominiumDocuments,
  scopedLibraryDocuments,
  summarizeDocumentAvailability,
  libraryDocumentCategory,
  type LibraryDocument
} from "../../apps/web/document-library.js";

function document(overrides: Partial<LibraryDocument> = {}): LibraryDocument {
  return {
    condominiumId: "alameda",
    condominiumName: "Alameda sintética",
    documentId: "doc-1",
    documentVersionId: "version-1",
    title: "Convenção sintética",
    documentType: "convention",
    versionNumber: 1,
    createdAt: "2026-10-27T02:00:00Z",
    processingStatus: "ready",
    validityStatus: "confirmed",
    ...overrides
  };
}

const props = {
  condominiumId: "alameda",
  condominiumName: "Alameda sintética",
  pending: false,
  error: "",
  onRetry: () => {},
  onClose: () => {},
  onOpen: () => {},
  confirmationControl: () => null
};

describe("biblioteca documental por condomínio — Spec 044", () => {
  it("AC-4405: calcula 3 de 4 como 75% e não muda a base por filtro", () => {
    const documents = [
      document(),
      document({ documentVersionId: "v2" }),
      document({ documentVersionId: "v3" }),
      document({ documentVersionId: "v4", processingStatus: "processing" })
    ];
    expect(summarizeDocumentAvailability(documents)).toEqual({
      total: 4,
      available: 3,
      attention: 1,
      percentage: 75
    });
    expect(filterLibraryDocuments(documents, "", "all", "attention")).toHaveLength(1);
    expect(summarizeDocumentAvailability(documents).percentage).toBe(75);
  });

  it("AC-4405: impede que confirmação pendente conte como pronta", () => {
    const documents = [
      document({
        condominiumCheck: {
          status: "pending",
          expectedName: "Alameda",
          detectedNames: ["Bosque"],
          sources: [],
          resumeProcessingStatus: "ready"
        }
      })
    ];
    expect(summarizeDocumentAvailability(documents)).toMatchObject({ available: 0, percentage: 0 });
    expect(filterLibraryDocuments(documents, "", "all", "available")).toEqual([]);
    expect(filterLibraryDocuments(documents, "", "all", "attention")).toHaveLength(1);
  });

  it.each(["uploaded", "processing", "needs_review", "failed"] as const)(
    "AC-4405: %s não entra no numerador",
    (processingStatus) => {
      expect(summarizeDocumentAvailability([document({ processingStatus })]).available).toBe(0);
    }
  );

  it("AC-4405: base vazia vale 0%, arredonda frações e não certifica qualidade", () => {
    expect(summarizeDocumentAvailability([])).toEqual({
      total: 0,
      available: 0,
      attention: 0,
      percentage: 0
    });
    expect(
      summarizeDocumentAvailability([
        document(),
        document({ processingStatus: "failed" }),
        document({ processingStatus: "needs_review" })
      ]).percentage
    ).toBe(33);
    const html = renderToStaticMarkup(
      createElement(DocumentAvailability, { documents: [document()] })
    );
    expect(html).toContain("100%");
    expect(html).toContain("não é uma taxa de acerto nem uma garantia de vigência");
    expect(html).toContain("divididas pelo");
    expect(html.split("<details>")[0]).not.toContain("100%");
    expect(html).not.toContain("<progress");
    expect(html).not.toContain("<details open");
    expect(html).toContain("1 de 1");
  });

  it.each(["pending", "disputed", "superseded"] as const)(
    "AC-4405: vigência %s não simula disponibilidade na recuperação",
    (validityStatus) => {
      const documents = [document({ validityStatus })];
      expect(summarizeDocumentAvailability(documents).available).toBe(0);
      expect(filterLibraryDocuments(documents, "", "all", "attention")).toHaveLength(1);
    }
  );

  it("AC-4405: documento sem vigência aplicável continua elegível", () => {
    expect(
      summarizeDocumentAvailability([document({ validityStatus: "not_applicable" })]).percentage
    ).toBe(100);
  });

  it("AC-4404/4405: filtra outro tenant, deduplica versão, conserva versões distintas e ordena", () => {
    const first = document({ title: "Ata 10", documentVersionId: "ata10" });
    const scoped = scopedLibraryDocuments(
      [
        first,
        first,
        document({ title: "Ata 2", documentVersionId: "ata2", versionNumber: 2 }),
        document({ condominiumId: "bosque", documentVersionId: "foreign" })
      ],
      "alameda"
    );
    expect(scoped.map((item) => item.documentVersionId)).toEqual(["ata2", "ata10"]);
    expect(summarizeDocumentAvailability(scoped).total).toBe(2);
    expect(scopedLibraryDocuments([first], undefined)).toEqual([]);
  });

  it("AC-4404: busca sem acento/caixa e combina categoria e disponibilidade", () => {
    const documents = [
      document(),
      document({
        title: "Ata sintética",
        documentType: "meeting_minutes",
        processingStatus: "failed"
      })
    ];
    expect(filterLibraryDocuments(documents, " CONVENCAO ", "convention", "available")).toEqual([
      documents[0]
    ]);
    expect(filterLibraryDocuments(documents, "ata", "meeting_minutes", "attention")).toEqual([
      documents[1]
    ]);
    expect(filterLibraryDocuments(documents, "ata", "contract", "all")).toEqual([]);
    expect(filterLibraryDocuments(documents, "ausente", "all", "all")).toEqual([]);
  });

  it.each([
    ["pending", "Vigência não confirmada"],
    ["disputed", "Vigência em conflito"],
    ["superseded", "Versão substituída"],
    ["not_applicable", "Vigência não se aplica"]
  ] as const)("AC-4404: identifica %s", (status, label) =>
    expect(documentValidityLabel(status)).toBe(label)
  );

  it("AC-4404: mostra categoria, versão, data em São Paulo e conflito sem documento alheio", () => {
    const html = renderToStaticMarkup(
      createElement(DocumentLibrary, {
        ...props,
        documents: [
          document({ validityStatus: "disputed" }),
          document({ condominiumId: "bosque", title: "Canário de outro condomínio" })
        ]
      })
    );
    expect(html).toContain("Alameda sintética");
    expect(html).toContain("Convenções");
    expect(html).toContain("Versão 1");
    expect(html).toContain("26/10/2026");
    expect(html).toContain("Vigência em conflito");
    expect(html).not.toContain("Canário de outro condomínio");
    expect(html).toContain('type="search"');
  });

  it("AC-4403: carga e falha não anunciam porcentagem nem base vazia", () => {
    for (const state of [{ pending: true }, { error: "Catálogo indisponível" }]) {
      const html = renderToStaticMarkup(
        createElement(DocumentLibrary, { ...props, ...state, documents: [] })
      );
      expect(html).not.toContain("0%");
      expect(html).not.toContain("Nenhum documento enviado");
    }
    const html = renderToStaticMarkup(
      createElement(DocumentLibrary, { ...props, error: "Catálogo indisponível", documents: [] })
    );
    expect(html).toContain("Tentar novamente");
    expect(html).toContain('role="alert"');
  });

  it("AC-4405: base vazia não exige anexos", () => {
    const html = renderToStaticMarkup(createElement(DocumentLibrary, { ...props, documents: [] }));
    expect(html).not.toContain("0%");
    expect(html).toContain("pela conversa, quando precisar");
    expect(html).toContain("orientação geral sem anexos");
  });

  it("AC-4403: solicita somente o catálogo ativo com identidade e sem cache", async () => {
    const request = vi
      .fn<typeof fetch>()
      .mockResolvedValue(new Response(JSON.stringify({ documents: [document()] })));
    const signal = new AbortController().signal;
    const result = await loadCondominiumDocuments(
      request,
      {
        condominiumId: "alameda",
        condominiumName: "Alameda",
        headers: { "x-development-user-id": "gestor" }
      },
      signal
    );
    expect(request).toHaveBeenCalledExactlyOnceWith("/v1/condominiums/alameda/documents", {
      credentials: "same-origin",
      cache: "no-store",
      headers: { "x-development-user-id": "gestor" },
      signal
    });
    expect(result[0]?.condominiumName).toBe("Alameda");
  });

  it("AC-4408: separa balancetes pelo conteúdo classificado, sem usar o nome", () => {
    const statement = document({
      documentType: "other",
      title: "Arquivo 04",
      isFinancialStatement: true
    });
    const renamedConvention = document({ title: "Balancete.pdf" });
    const other = document({ documentType: "other", title: "balancete sem leitura.pdf" });
    expect(libraryDocumentCategory(statement)).toBe("financial_statement");
    expect(libraryDocumentCategory({ ...statement, documentType: "meeting_minutes" })).toBe(
      "financial_statement"
    );
    expect(libraryDocumentCategory(renamedConvention)).toBe("convention");
    expect(
      filterLibraryDocuments(
        [statement, renamedConvention, other],
        "",
        "financial_statement",
        "all"
      )
    ).toEqual([statement]);
    expect(filterLibraryDocuments([statement, other], "", "other", "all")).toEqual([other]);
    const html = renderToStaticMarkup(
      createElement(LibraryDocumentList, {
        documents: [statement, other],
        onOpen: props.onOpen,
        confirmationControl: props.confirmationControl
      })
    );
    expect(html).toContain('aria-label="Balancetes"');
    expect(html).toContain('aria-label="Outros documentos"');
    expect(html.split('aria-label="Outros documentos"')[1]).not.toContain("Arquivo 04");
  });

  it("AC-4408: área financeira exclui documentos gerais, outro tenant e suas contagens", () => {
    const html = renderToStaticMarkup(
      createElement(DocumentLibrary, {
        ...props,
        initialSection: "financial_statement",
        documents: [
          document({
            documentType: "other",
            title: "Balancete autorizado",
            isFinancialStatement: true
          }),
          document({ documentVersionId: "convention", title: "Convenção geral" }),
          document({
            condominiumId: "bosque",
            documentVersionId: "foreign",
            title: "Balancete alheio",
            documentType: "other",
            isFinancialStatement: true
          })
        ]
      })
    );
    expect(html).toContain("Balancete autorizado");
    expect(html).not.toContain("Convenção geral");
    expect(html).not.toContain("Balancete alheio");
    expect(html).toContain("1 de 1 versões");
    expect(html).toContain('aria-pressed="true"');
  });

  it("AC-4408: área vazia de balancetes orienta envio pela conversa", () => {
    const html = renderToStaticMarkup(
      createElement(DocumentLibrary, {
        ...props,
        initialSection: "financial_statement",
        documents: [document()]
      })
    );
    expect(html).toContain("Nenhum balancete identificado");
    expect(html).not.toContain("Visualizar Convenção sintética");
    expect(html).toContain("pela conversa");
  });

  it("AC-4403: descarta resposta atrasada mesmo se o transporte ignorou o aborto", async () => {
    const controller = new AbortController();
    const request = vi.fn<typeof fetch>().mockImplementation(async () => {
      controller.abort();
      return new Response(JSON.stringify({ documents: [document()] }));
    });
    await expect(
      loadCondominiumDocuments(
        request,
        { condominiumId: "alameda", condominiumName: "Alameda", headers: {} },
        controller.signal
      )
    ).rejects.toThrow();
  });

  it("AC-4403: negação de acesso não simula catálogo vazio", async () => {
    const request = vi.fn<typeof fetch>().mockResolvedValue(new Response(null, { status: 403 }));
    await expect(
      loadCondominiumDocuments(
        request,
        { condominiumId: "alameda", condominiumName: "Alameda", headers: {} },
        new AbortController().signal
      )
    ).rejects.toThrow("Não foi possível carregar");
  });
});
