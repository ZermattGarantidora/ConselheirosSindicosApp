import type { CondominiumId } from "../core/condominium-scope.js";
import type { UserId } from "./authorized-condominium-context.js";

export const maximumCondominiumProfilePhotoBytes = 5 * 1024 * 1024;
export const maximumCondominiumProfilePhotos = 5;

export type CondominiumProfile = Readonly<{
  condominiumId: string;
  name: string;
  cnpj: string | null;
  address: Readonly<{
    postalCode: string;
    street: string;
    number: string;
    complement: string;
    neighborhood: string;
    city: string;
    state: string;
  }>;
  administrationCompany: string;
  unitCount: number | null;
  contact: Readonly<{ managerName: string; email: string; phone: string }>;
  description: string;
}>;

export type CondominiumProfileUpdate = Omit<CondominiumProfile, "condominiumId" | "cnpj">;

export type CondominiumProfilePhoto = Readonly<{
  photoId: string;
  mediaType: "image/jpeg" | "image/png" | "image/webp";
  sizeBytes: number;
  isCover: boolean;
  createdAt: string;
}>;

export type CondominiumProfilePhotoContent = CondominiumProfilePhoto &
  Readonly<{ content: Buffer }>;

export interface CondominiumProfileRepository {
  deleteCondominium?(condominiumId: CondominiumId): Promise<void>;
  getProfile(
    input: Readonly<{ userId: UserId; condominiumId: CondominiumId }>
  ): Promise<CondominiumProfile | undefined>;
  updateProfile(
    input: Readonly<{
      userId: UserId;
      condominiumId: CondominiumId;
      profile: CondominiumProfileUpdate;
    }>
  ): Promise<CondominiumProfile | undefined>;
  listPhotos(
    input: Readonly<{ userId: UserId; condominiumId: CondominiumId }>
  ): Promise<readonly CondominiumProfilePhoto[]>;
  addPhoto(
    input: Readonly<{
      userId: UserId;
      condominiumId: CondominiumId;
      photoId: string;
      mediaType: CondominiumProfilePhoto["mediaType"];
      content: Buffer;
    }>
  ): Promise<CondominiumProfilePhoto>;
  readPhoto(
    input: Readonly<{ userId: UserId; condominiumId: CondominiumId; photoId: string }>
  ): Promise<CondominiumProfilePhotoContent | undefined>;
  setCover(
    input: Readonly<{ userId: UserId; condominiumId: CondominiumId; photoId: string }>
  ): Promise<void>;
  deletePhoto(
    input: Readonly<{ userId: UserId; condominiumId: CondominiumId; photoId: string }>
  ): Promise<void>;
}

export class InvalidCondominiumProfileError extends Error {
  public constructor(message: string) {
    super(message);
    this.name = "InvalidCondominiumProfileError";
  }
}

export class CondominiumProfilePhotoLimitError extends Error {
  public constructor() {
    super("Este condomínio já tem o limite de cinco fotos.");
    this.name = "CondominiumProfilePhotoLimitError";
  }
}

function textField(
  value: unknown,
  field: string,
  maximumLength: number,
  required = false
): string | undefined {
  if (value === undefined || value === null) return undefined;
  if (typeof value !== "string") {
    throw new InvalidCondominiumProfileError(`${field} deve ser um texto.`);
  }
  const normalized = value.trim();
  if (required && normalized.length === 0) {
    throw new InvalidCondominiumProfileError(`${field} é obrigatório.`);
  }
  if (normalized.length > maximumLength) {
    throw new InvalidCondominiumProfileError(`${field} deve ter até ${maximumLength} caracteres.`);
  }
  return normalized;
}

function objectField(value: unknown): Record<string, unknown> | undefined {
  return typeof value === "object" && value !== null && !Array.isArray(value)
    ? (value as Record<string, unknown>)
    : undefined;
}

export function validateCondominiumProfileUpdate(
  value: unknown
): CondominiumProfileUpdate | undefined {
  const body = objectField(value);
  const address = objectField(body?.address);
  const contact = objectField(body?.contact);
  if (body === undefined || address === undefined || contact === undefined) return undefined;

  const name = textField(body.name, "O nome", 120, true);
  const street = textField(address.street, "O logradouro", 120);
  const number = textField(address.number, "O número", 20);
  const complement = textField(address.complement, "O complemento", 80);
  const neighborhood = textField(address.neighborhood, "O bairro", 80);
  const city = textField(address.city, "A cidade", 80, true);
  const state = textField(address.state, "A UF", 2, true)?.toUpperCase();
  const postalCode = textField(address.postalCode, "O CEP", 9)?.replaceAll(/\D/gu, "") ?? "";
  const administrationCompany = textField(body.administrationCompany, "A administradora", 120);
  const managerName = textField(contact.managerName, "O responsável", 100);
  const email = textField(contact.email, "O e-mail", 160);
  const phone = textField(contact.phone, "O telefone", 30);
  const description = textField(body.description, "A descrição", 500);

  if (
    name === undefined ||
    city === undefined ||
    state === undefined ||
    !/^[A-Z]{2}$/u.test(state)
  ) {
    throw new InvalidCondominiumProfileError("Informe o nome, a cidade e uma UF válida.");
  }
  if (postalCode.length > 0 && postalCode.length !== 8) {
    throw new InvalidCondominiumProfileError("O CEP deve conter oito dígitos.");
  }
  if (
    body.unitCount !== null &&
    body.unitCount !== undefined &&
    (!Number.isInteger(body.unitCount) ||
      Number(body.unitCount) < 1 ||
      Number(body.unitCount) > 100_000)
  ) {
    throw new InvalidCondominiumProfileError(
      "A quantidade de unidades deve ser um número inteiro positivo."
    );
  }
  if (email !== undefined && email.length > 0 && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/u.test(email)) {
    throw new InvalidCondominiumProfileError("Informe um e-mail válido ou deixe o campo vazio.");
  }

  return Object.freeze({
    name,
    address: Object.freeze({
      postalCode,
      street: street ?? "",
      number: number ?? "",
      complement: complement ?? "",
      neighborhood: neighborhood ?? "",
      city,
      state
    }),
    administrationCompany: administrationCompany ?? "",
    unitCount:
      body.unitCount === null || body.unitCount === undefined ? null : Number(body.unitCount),
    contact: Object.freeze({
      managerName: managerName ?? "",
      email: email ?? "",
      phone: phone ?? ""
    }),
    description: description ?? ""
  });
}

export function decodeCondominiumProfilePhoto(value: unknown):
  | Readonly<{
      mediaType: CondominiumProfilePhoto["mediaType"];
      content: Buffer;
    }>
  | undefined {
  const body = objectField(value);
  if (
    body === undefined ||
    typeof body.mediaType !== "string" ||
    typeof body.contentBase64 !== "string"
  ) {
    return undefined;
  }
  if (
    body.contentBase64.length === 0 ||
    body.contentBase64.length > Math.ceil(maximumCondominiumProfilePhotoBytes / 3) * 4
  ) {
    throw new InvalidCondominiumProfileError("A foto deve ter até 5 MB.");
  }
  const content = Buffer.from(body.contentBase64, "base64");
  if (
    content.length === 0 ||
    content.length > maximumCondominiumProfilePhotoBytes ||
    content.toString("base64") !== body.contentBase64
  ) {
    throw new InvalidCondominiumProfileError(
      "O arquivo enviado não é uma foto válida ou excede 5 MB."
    );
  }

  const mediaType = body.mediaType;
  const validJpeg =
    mediaType === "image/jpeg" &&
    content.length >= 3 &&
    content[0] === 0xff &&
    content[1] === 0xd8 &&
    content[2] === 0xff;
  const validPng =
    mediaType === "image/png" &&
    content.subarray(0, 8).equals(Buffer.from([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a]));
  const validWebp =
    mediaType === "image/webp" &&
    content.length >= 12 &&
    content.toString("ascii", 0, 4) === "RIFF" &&
    content.toString("ascii", 8, 12) === "WEBP";
  if (!validJpeg && !validPng && !validWebp) {
    throw new InvalidCondominiumProfileError("Use uma imagem JPEG, PNG ou WebP válida.");
  }
  return Object.freeze({ mediaType: mediaType as CondominiumProfilePhoto["mediaType"], content });
}
