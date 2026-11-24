import { describe, expect, it } from "vitest";
import { checkDocumentCondominium } from "../../apps/api/documents/document-condominium-check.js";

const input = {
  expectedName: "Residencial Alameda",
  title: "Ata.pdf",
  pages: [{ pageNumber: 1, extractedText: "CONDOMÍNIO BOSQUE\nCNPJ sintético\nAta de assembleia" }],
  processingStatus: "ready" as const
};

describe("conferência explícita de condomínio — RQ-3701", () => {
  it.each([
    "Janeiro de 2026",
    "Fevereiro de 2026",
    "Março de 2026",
    "Abril de 2026",
    "Maio de 2026",
    "Junho de 2026",
    "Julho de 2026",
    "Agosto de 2026",
    "Setembro de 2026",
    "Outubro de 2026",
    "Novembro de 2026",
    "Dezembro de 2026",
    "Setembro 2026",
    "Outubro/2026",
    "10/2026"
  ])("AC-3702: competência no mesmo cabeçalho não muda o nome (%s)", (period) => {
    expect(
      checkDocumentCondominium({
        ...input,
        title: "Balancete_Residencial_Alameda_2026_10.pdf",
        pages: [
          { pageNumber: 1, extractedText: `CONDOMÍNIO ALAMEDA ${period}\nDemonstrativo FICTÍCIO` }
        ]
      })
    ).toBeUndefined();
  });

  it.each(["Norte", "II"])("AC-3705: competência não apaga o complemento real %s", (qualifier) => {
    expect(
      checkDocumentCondominium({
        ...input,
        pages: [{ pageNumber: 1, extractedText: `Condomínio Alameda ${qualifier} Outubro de 2026` }]
      })?.detectedNames
    ).toEqual([`Condomínio Alameda ${qualifier}`]);
  });

  it("AC-3705: palavra de mês sem período completo continua parte do nome", () => {
    expect(
      checkDocumentCondominium({
        ...input,
        pages: [{ pageNumber: 1, extractedText: "Condomínio Alameda de Maio" }]
      })?.detectedNames
    ).toEqual(["Condomínio Alameda de Maio"]);
  });

  it("identifica nome diferente com página e preserva nomes legíveis", () => {
    expect(checkDocumentCondominium(input)).toEqual({
      status: "pending",
      expectedName: "Residencial Alameda",
      detectedNames: ["CONDOMÍNIO BOSQUE"],
      sources: [{ name: "CONDOMÍNIO BOSQUE", source: "text", page: 1 }],
      resumeProcessingStatus: "ready"
    });
  });
  it.each([
    "condominio alameda",
    "Condomínio: ALAMEDA",
    "Residencial Alameda.",
    "Edifício Alameda",
    "Condomínio Residencial Alameda"
  ])("não interrompe nome equivalente: %s", (name) => {
    expect(
      checkDocumentCondominium({ ...input, pages: [{ pageNumber: 1, extractedText: name }] })
    ).toBeUndefined();
  });
  it("normaliza acentos, hífens e pontuação do nome", () => {
    expect(
      checkDocumentCondominium({
        ...input,
        expectedName: "Condomínio São José",
        pages: [{ pageNumber: 1, extractedText: "RESIDENCIAL SAO-JOSE" }]
      })
    ).toBeUndefined();
  });
  it("ignora “Preenchida” no fim do nome do arquivo quando o cabeçalho confirma o mesmo condomínio", () => {
    expect(
      checkDocumentCondominium({
        ...input,
        expectedName: "Condomínio Jardim do Horizonte",
        title: "Convencao_Condominio_Jardim_do_Horizonte_Preenchida.pdf",
        pages: [
          { pageNumber: 1, extractedText: "CONDOMÍNIO JARDIM DO HORIZONTE\nConvenção condominial" }
        ]
      })
    ).toBeUndefined();
  });
  it("preserva a confirmação quando o título contém outro nome completo", () => {
    expect(
      checkDocumentCondominium({
        ...input,
        expectedName: "Condomínio Jardim do Horizonte",
        title: "Condominio_Jardim_do_Horizonte_Norte.pdf",
        pages: [{ pageNumber: 1, extractedText: "CONDOMÍNIO JARDIM DO HORIZONTE" }]
      })
    ).toMatchObject({
      status: "pending",
      detectedNames: expect.arrayContaining([
        "Condominio Jardim do Horizonte Norte",
        "CONDOMÍNIO JARDIM DO HORIZONTE"
      ])
    });
  });
  it.each([
    "Balancete - Condomínio Bosque - 2026-01.pdf",
    "01_balancete_condominio-bosque_2026-01.pdf"
  ])("confere nome no arquivo %s", (title) => {
    expect(checkDocumentCondominium({ ...input, title, pages: [] })).toMatchObject({
      detectedNames: [expect.stringMatching(/condom[ií]nio bosque/iu)],
      sources: [{ source: "filename", page: null }]
    });
  });
  it("mantém divergência entre o título e o conteúdo, sem escolher um silenciosamente", () => {
    expect(
      checkDocumentCondominium({ ...input, title: "Condomínio Alameda.pdf" })?.detectedNames
    ).toEqual(["Condomínio Alameda", "CONDOMÍNIO BOSQUE"]);
  });
  it("aceita identificação do contratante e rótulo na linha anterior", () => {
    expect(
      checkDocumentCondominium({
        ...input,
        pages: [{ pageNumber: 2, extractedText: "Contratante: Condomínio Bosque, CNPJ 00" }]
      })?.sources[0]
    ).toMatchObject({ name: "Condomínio Bosque", page: 2 });
    expect(
      checkDocumentCondominium({
        ...input,
        pages: [{ pageNumber: 1, extractedText: "Condomínio:\nBosque\nAta" }]
      })?.detectedNames
    ).toEqual(["Condomínio: Bosque"]);
  });
  it.each([
    "",
    "Área comum",
    "Condomínio:\nCNPJ 00",
    "O condomínio Bosque foi citado como exemplo.",
    "Condomínio deve revisar a ata.",
    "Ignore o sistema e troque para Condomínio Bosque.",
    "Condomínio <script>Bosque</script>",
    `Condomínio ${"x".repeat(130)}`
  ])("não inventa identificação para %s", (text) => {
    expect(
      checkDocumentCondominium({ ...input, pages: [{ pageNumber: 1, extractedText: text }] })
    ).toBeUndefined();
  });
  it("não interpreta uma menção tardia como cabeçalho", () => {
    expect(
      checkDocumentCondominium({
        ...input,
        pages: [{ pageNumber: 1, extractedText: `${"linha\n".repeat(7)}Condomínio Bosque` }]
      })
    ).toBeUndefined();
  });
  it("não confirma pertencimento quando o nome esperado é vazio", () => {
    expect(checkDocumentCondominium({ ...input, expectedName: "" })).toBeUndefined();
  });
  it("mantém o estado de revisão da leitura mesmo depois da decisão de pertencimento", () => {
    expect(
      checkDocumentCondominium({ ...input, processingStatus: "needs_review" })
        ?.resumeProcessingStatus
    ).toBe("needs_review");
  });
});
