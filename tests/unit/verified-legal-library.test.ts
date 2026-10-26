import { describe, expect, it, vi } from "vitest";
import { createCondominiumId } from "../../apps/api/core/condominium-scope.js";
import type { AuthorizedCondominiumContext } from "../../apps/api/identity/authorized-condominium-context.js";
import { extractPdfTextByPage } from "../../apps/api/documents/extract-pdf-text.js";
import { developmentChunks } from "../../apps/api/retrieval/development-scoped-retrieval.js";
import { createScopedTextRetriever } from "../../apps/api/retrieval/text-retrieval.js";
import { curatedLegalSources } from "../../apps/api/legislation/curated-source-texts.js";
import { createConsultationPdf } from "../../apps/api/legislation/consultation-pdf.js";
import {
  legalContentHash,
  legalContentId,
  validateLegalEdition,
  type VerifiedLegalEdition,
  type VerifiedLegalSource
} from "../../apps/api/legislation/legal-edition-contract.js";
import { verifiedLegalEdition } from "../../apps/api/legislation/verified-legal-edition.js";
import { createVerifiedLegalLibrary } from "../../apps/api/legislation/verified-legal-library.js";

const context: AuthorizedCondominiumContext = {
  condominiumId: createCondominiumId("alameda"),
  userId: "legal-synthetic" as AuthorizedCondominiumContext["userId"],
  roleKey: "manager",
  membershipRevision: "v1",
  permissions: ["document:read"]
};
const emptyIndex = { findAuthorizedCandidates: async () => [] };
const searchInput = {
  query: "assembleia eletrônica direitos voz debate voto",
  limit: 8,
  minimumQualityScore: 0.7,
  asOf: new Date("2026-10-22T12:00:00Z")
};

function resealedSource(overrides: Partial<VerifiedLegalSource>): VerifiedLegalEdition {
  const payload = structuredClone(verifiedLegalEdition.payload);
  const sources = [{ ...payload.sources[0]!, ...overrides }, ...payload.sources.slice(1)];
  const changed = { ...payload, sources };
  return { payload: changed, payloadSha256: legalContentHash(JSON.stringify(changed)) };
}

describe("edição legal conferida", () => {
  it("AC-3901/3902: reproduz os seis PDFs e todos os dispositivos sem mudar uma palavra", async () => {
    const library = createVerifiedLegalLibrary();
    expect(library.sources).toHaveLength(6);
    expect(library.sources.reduce((sum, source) => sum + source.pages.length, 0)).toBe(25);
    for (const [index, source] of library.sources.entries()) {
      const raw = curatedLegalSources[index]!;
      const copy = createConsultationPdf({
        ...raw,
        verifiedAt: source.verifiedAt,
        reviewDueAt: source.reviewDueAt
      });
      expect(legalContentHash(copy.content)).toBe(source.pdfSha256);
      expect(legalContentHash(JSON.stringify(raw.sections))).toBe(source.capturedTextSha256);
      const extracted = await extractPdfTextByPage(copy.content);
      expect(extracted.map((page) => page.extractedText)).toEqual(
        source.pages.map((page) => page.text)
      );
      for (const section of raw.sections) {
        const body = source.pages
          .filter((page) => page.locator === section.locator)
          .map((page) => Array.from(page.text).slice(page.startOffset, page.endOffset).join(""))
          .join(" ");
        expect(body.replace(/\s+/gu, " ").trim()).toBe(section.text.replace(/\s+/gu, " ").trim());
      }
      expect(Object.isFrozen(source)).toBe(true);
      expect(Object.isFrozen(source.pages[0])).toBe(true);
    }
  });

  it("recusa um único caractere modificado sem atualizar o manifesto", () => {
    const edition = structuredClone(verifiedLegalEdition);
    const changed = { ...edition, payload: { ...edition.payload, edition: "alterada" } };
    expect(() => validateLegalEdition(changed)).toThrow("manifesto");
  });

  it.each([
    { officialUrl: "http://www.planalto.gov.br/lei" },
    { officialUrl: "https://www.planalto.gov.br.evil.test/lei" },
    { officialUrl: "https://usuario:senha@www.planalto.gov.br/lei" },
    { officialUrl: "https://www.planalto.gov.br:8443/lei" },
    { jurisdiction: "SP" as "BR" },
    { id: "invalido" },
    { versionId: "invalido" },
    { verifiedAt: "invalida" },
    { reviewDueAt: "invalida" },
    { reviewDueAt: "2026-10-21" },
    { pages: [] }
  ])("recusa metadados não autorizados: %j", (overrides) => {
    expect(() => validateLegalEdition(resealedSource(overrides))).toThrow();
  });

  it("recusa duplicação de fonte e edição vazia", () => {
    for (const sources of [
      [],
      [verifiedLegalEdition.payload.sources[0]!, verifiedLegalEdition.payload.sources[0]!]
    ]) {
      const payload = { edition: "controle", sources };
      expect(() =>
        validateLegalEdition({ payload, payloadSha256: legalContentHash(JSON.stringify(payload)) })
      ).toThrow();
    }
  });

  it("recusa PDF e página adulterados mesmo com novo hash do envelope", () => {
    const first = verifiedLegalEdition.payload.sources[0]!;
    expect(() =>
      validateLegalEdition(
        resealedSource({ pdfBase64: Buffer.from("%PDF-alterado").toString("base64") })
      )
    ).toThrow("PDF");
    for (const changed of [
      { text: "outra página" },
      { startOffset: -1 },
      { endOffset: 999999 },
      { endOffset: 0 },
      { pageNumber: 99 },
      { locator: "" }
    ]) {
      const pages = [{ ...first.pages[0]!, ...changed }, ...first.pages.slice(1)];
      expect(() => validateLegalEdition(resealedSource({ pages }))).toThrow("Página");
    }
  });

  it("mantém IDs determinísticos distintos para conteúdos distintos", () => {
    expect(legalContentId("fonte-a")).toBe(legalContentId("fonte-a"));
    expect(legalContentId("fonte-a")).not.toBe(legalContentId("fonte-b"));
  });

  it("pagina texto longo preservando acentos e rejeita renderização sem suporte", async () => {
    const input = {
      title: "Controle sintético",
      officialUrl: "https://www.planalto.gov.br/controle",
      verifiedAt: "2026-10-22",
      reviewDueAt: "2026-11-21",
      limitation: "Controle",
      sections: [
        {
          locator: "Artigo sintético",
          text: "Contribuição, segurança e manutenção.\n\n".repeat(220)
        }
      ]
    };
    const copy = createConsultationPdf(input);
    const pages = await extractPdfTextByPage(copy.content);
    expect(pages.length).toBeGreaterThan(1);
    expect(pages.every((page) => page.extractedText.includes("PAGINACAO PROPRIA"))).toBe(true);
    expect(pages[0]!.extractedText).toContain("Contribuição");
    expect(() => createConsultationPdf({ ...input, sections: [] })).toThrow();
    expect(() =>
      createConsultationPdf({ ...input, sections: [{ locator: "x", text: "" }] })
    ).toThrow();
    expect(() =>
      createConsultationPdf({ ...input, sections: [{ locator: "x", text: "x".repeat(150) }] })
    ).toThrow("largura");
    expect(() =>
      createConsultationPdf({ ...input, sections: [{ locator: "x", text: "Texto 🚧" }] })
    ).toThrow("Caractere");
    expect(() => createConsultationPdf({ ...input, limitation: "linha\n".repeat(80) })).toThrow(
      "Metadados"
    );
  });
});

describe("recuperação e leitura legais autorizadas", () => {
  it("AC-3902/3904: recupera legislação compartilhada sem admitir documentos de outro condomínio", async () => {
    const library = createVerifiedLegalLibrary();
    const retriever = createScopedTextRetriever(
      library.composeIndex({ findAuthorizedCandidates: async () => developmentChunks })
    );
    const result = await retriever.search(context, searchInput);
    const item = result.evidence.find((evidence) => evidence.content.includes("direitos de voz"));
    expect(item).toMatchObject({ sourceScope: "legislation", condominiumId: "alameda" });
    expect(result.evidence.some((evidence) => evidence.condominiumId === "bosque")).toBe(false);
    expect(result.evidence.some((evidence) => evidence.content.includes("No Bosque"))).toBe(false);
    const source = library.sources.find((source) => source.id === item?.documentId)!;
    const page = source.pages.find((page) => page.pageNumber === item?.pageNumber)!;
    expect(Array.from(page.text).slice(item!.startOffset, item!.endOffset).join("")).toBe(
      item!.content
    );
    expect(legalContentHash(item!.content)).toBe(item!.contentSha256);
  });

  it.each([
    ["2026-10-21T23:59:59.999Z", false],
    ["2026-10-22T00:00:00.000Z", true],
    ["2026-11-20T23:59:59.999Z", true],
    ["2026-11-21T00:00:00.000Z", false]
  ])("AC-3903: elegibilidade na data %s", async (date, eligible) => {
    const index = createVerifiedLegalLibrary().composeIndex(emptyIndex);
    const candidates = await index.findAuthorizedCandidates(context, {
      ...searchInput,
      asOf: new Date(date as string)
    });
    expect(candidates.length > 0).toBe(eligible);
  });

  it.each([
    "Quem é o síndico?",
    "Nome do síndico eleito",
    "Meteorito",
    "Qual é a lei municipal de Campinas para ruído?"
  ])("AC-3905: não usa regra federal irrelevante para %s", async (query) => {
    const index = createVerifiedLegalLibrary().composeIndex(emptyIndex);
    expect(await index.findAuthorizedCandidates(context, { ...searchInput, query })).toEqual([]);
  });

  it("nega busca e leitura sem permissão, preserva fallback privado e cópia histórica", async () => {
    const library = createVerifiedLegalLibrary();
    const source = library.sources[0]!;
    const input = { documentId: source.id, documentVersionId: source.versionId, page: 1 };
    const denied = { ...context, permissions: [] };
    const privateReader = { getAuthorizedPage: vi.fn(async () => undefined) };
    const reader = library.composeReader(privateReader);
    expect(
      await library.composeIndex(emptyIndex).findAuthorizedCandidates(denied, searchInput)
    ).toEqual([]);
    expect(await reader.getAuthorizedPage(denied, input)).toBeUndefined();
    expect(library.getAuthorizedCopy(denied, input)).toBeUndefined();
    expect(privateReader.getAuthorizedPage).not.toHaveBeenCalled();
    expect(await reader.getAuthorizedPage(context, input)).toMatchObject({
      content: source.pages[0]!.text,
      officialUrl: source.officialUrl
    });
    expect(await reader.getAuthorizedPage(context, { ...input, page: 999 })).toBeUndefined();
    expect(
      await reader.getAuthorizedPage(context, { ...input, documentId: "privado" })
    ).toBeUndefined();
    expect(privateReader.getAuthorizedPage).toHaveBeenCalledOnce();
    expect(
      library.getAuthorizedCopy(context, { ...input, documentVersionId: "outra" })
    ).toBeUndefined();
    const copy = library.getAuthorizedCopy(context, input)!;
    expect(legalContentHash(copy)).toBe(source.pdfSha256);
    copy[0] = 0;
    expect(legalContentHash(library.getAuthorizedCopy(context, input)!)).toBe(source.pdfSha256);
  });
});
