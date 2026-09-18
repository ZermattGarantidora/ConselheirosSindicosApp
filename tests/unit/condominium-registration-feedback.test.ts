import { describe, expect, it } from "vitest";

import { formatRegistrationFailure, registrationValidationErrors } from "../../apps/web/App.js";

const emptyForm = {
  name: "",
  cnpj: "",
  administrationCompany: "",
  unitCount: "",
  postalCode: "",
  street: "",
  number: "",
  complement: "",
  neighborhood: "",
  city: "",
  state: "",
  managerName: "",
  email: "",
  phone: ""
} as const;

const validForm = {
  ...emptyForm,
  name: "Residencial Horizonte",
  cnpj: "12.345.678/0001-90",
  unitCount: "64",
  city: "São Paulo",
  state: "SP",
  email: "sindico@example.test"
} as const;

const minutes = { name: "ata.pdf", type: "application/pdf", size: 1200 } as const;

describe("feedback do cadastro de condomínio", () => {
  it("lista os dados obrigatórios que ainda faltam", () => {
    expect(registrationValidationErrors(emptyForm, undefined, [], false, true)).toEqual([
      "nome do condomínio",
      "CNPJ com 14 dígitos",
      "cidade",
      "UF com 2 letras",
      "ata de constituição em PDF",
      "confirmação de que os documentos pertencem a este condomínio"
    ]);
  });

  it("aceita os dados completos e a ata PDF", () => {
    expect(registrationValidationErrors(validForm, minutes, [], true, true)).toEqual([]);
  });

  it("preserva o erro da API e identifica falha ao salvar documentos", () => {
    expect(formatRegistrationFailure(new Error("Acesso não autorizado."), "documents")).toBe(
      "Não foi possível salvar a ata e os documentos: Acesso não autorizado. Confira se a sessão ainda está ativa; se necessário, volte ao login e tente novamente."
    );
  });

  it("identifica falha na criação do condomínio", () => {
    expect(formatRegistrationFailure(new Error("CNPJ já cadastrado."), "condominium")).toBe(
      "Não foi possível criar o condomínio: CNPJ já cadastrado."
    );
  });
});
