import { describe, expect, it } from "vitest";

import {
  InvalidCondominiumProfileError,
  decodeCondominiumProfilePhoto,
  maximumCondominiumProfilePhotoBytes,
  validateCondominiumProfileUpdate
} from "../../apps/api/identity/condominium-profile.js";

const completeProfile = {
  name: "  Residencial Horizonte  ",
  address: {
    postalCode: "01234-567",
    street: " Rua das Flores ",
    number: " 123 ",
    complement: " Bloco A ",
    neighborhood: " Centro ",
    city: " São Paulo ",
    state: " sp "
  },
  administrationCompany: " Gestão Sintética ",
  unitCount: 42,
  contact: {
    managerName: " Maria Síndica ",
    email: " maria@example.test ",
    phone: " (11) 99999-9999 "
  },
  description: " Perfil de teste. "
};

function encoded(content: Buffer): string {
  return content.toString("base64");
}

describe("validação de perfil do condomínio", () => {
  it("normaliza os campos obrigatórios e opcionais", () => {
    expect(validateCondominiumProfileUpdate(completeProfile)).toEqual({
      name: "Residencial Horizonte",
      address: {
        postalCode: "01234567",
        street: "Rua das Flores",
        number: "123",
        complement: "Bloco A",
        neighborhood: "Centro",
        city: "São Paulo",
        state: "SP"
      },
      administrationCompany: "Gestão Sintética",
      unitCount: 42,
      contact: {
        managerName: "Maria Síndica",
        email: "maria@example.test",
        phone: "(11) 99999-9999"
      },
      description: "Perfil de teste."
    });
  });

  it("aceita os campos opcionais ausentes, vazios ou nulos", () => {
    expect(
      validateCondominiumProfileUpdate({
        name: "Residencial",
        address: { city: "Curitiba", state: "pr" },
        contact: {},
        unitCount: null
      })
    ).toEqual({
      name: "Residencial",
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
      unitCount: null,
      contact: { managerName: "", email: "", phone: "" },
      description: ""
    });
  });

  it("recusa corpos incompletos e campos obrigatórios inválidos", () => {
    expect(validateCondominiumProfileUpdate(undefined)).toBeUndefined();
    expect(validateCondominiumProfileUpdate({ name: "Residencial" })).toBeUndefined();
    for (const profile of [
      { ...completeProfile, name: " " },
      { ...completeProfile, address: { ...completeProfile.address, city: " " } },
      { ...completeProfile, address: { ...completeProfile.address, state: "São Paulo" } },
      { ...completeProfile, address: { ...completeProfile.address, state: 12 } }
    ]) {
      expect(() => validateCondominiumProfileUpdate(profile)).toThrow(
        InvalidCondominiumProfileError
      );
    }
  });

  it("valida CEP, quantidade de unidades, e-mail e tipos textuais", () => {
    const invalidProfiles = [
      { ...completeProfile, address: { ...completeProfile.address, postalCode: "123" } },
      { ...completeProfile, unitCount: 0 },
      { ...completeProfile, unitCount: 1.5 },
      { ...completeProfile, unitCount: 100_001 },
      { ...completeProfile, contact: { ...completeProfile.contact, email: "invalido" } },
      { ...completeProfile, administrationCompany: 42 }
    ];
    for (const profile of invalidProfiles) {
      expect(() => validateCondominiumProfileUpdate(profile)).toThrow(
        InvalidCondominiumProfileError
      );
    }
  });
});

describe("decodificação de fotos do perfil", () => {
  it.each([
    ["image/jpeg", Buffer.from([0xff, 0xd8, 0xff, 0x00])],
    ["image/png", Buffer.from([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a])],
    ["image/webp", Buffer.from("RIFFxxxxWEBP", "ascii")]
  ] as const)("aceita uma assinatura %s válida", (mediaType, content) => {
    expect(decodeCondominiumProfilePhoto({ mediaType, contentBase64: encoded(content) })).toEqual({
      mediaType,
      content
    });
  });

  it("recusa corpo incompleto, base64 inválido, excesso e conteúdo incompatível", () => {
    expect(decodeCondominiumProfilePhoto(undefined)).toBeUndefined();
    expect(decodeCondominiumProfilePhoto({ mediaType: "image/jpeg" })).toBeUndefined();
    const invalidPhotos = [
      { mediaType: "image/jpeg", contentBase64: "" },
      { mediaType: "image/jpeg", contentBase64: "não-é-base64" },
      { mediaType: "image/gif", contentBase64: encoded(Buffer.from("GIF89a")) },
      { mediaType: "image/png", contentBase64: encoded(Buffer.from([0xff, 0xd8, 0xff])) },
      {
        mediaType: "image/jpeg",
        contentBase64: "a".repeat(Math.ceil(maximumCondominiumProfilePhotoBytes / 3) * 4 + 1)
      }
    ];
    for (const photo of invalidPhotos) {
      expect(() => decodeCondominiumProfilePhoto(photo)).toThrow(InvalidCondominiumProfileError);
    }
  });
});
