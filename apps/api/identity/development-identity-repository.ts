import { createCondominiumId } from "../core/condominium-scope.js";
import {
  createUserId,
  type Membership,
  type MembershipRepository,
  type UserId
} from "./authorized-condominium-context.js";

const developmentMemberships: readonly Membership[] = [
  {
    condominiumId: createCondominiumId("alameda"),
    userId: createUserId("sindico-demo"),
    roleKey: "manager",
    status: "active",
    validFrom: new Date("2026-01-01T00:00:00.000Z"),
    revision: "membership-alameda-v1"
  },
  {
    condominiumId: createCondominiumId("bosque"),
    userId: createUserId("sindico-demo"),
    roleKey: "manager",
    status: "active",
    validFrom: new Date("2026-01-01T00:00:00.000Z"),
    revision: "membership-bosque-v1"
  },
  {
    condominiumId: createCondominiumId("alameda"),
    userId: createUserId("morador-alameda-demo"),
    roleKey: "advisor",
    status: "active",
    validFrom: new Date("2026-01-01T00:00:00.000Z"),
    revision: "membership-morador-alameda-v1"
  }
];

export type DevelopmentMembershipRegistry = MembershipRepository &
  Readonly<{
    createTestCondominium(input: DevelopmentCondominiumRegistration): Readonly<{
      membership: Membership;
      condominium: DevelopmentCondominiumProfile;
    }>;
    listTestCondominiums(userId: UserId): readonly DevelopmentCondominiumProfile[];
    leaveTestCondominium(userId: UserId, condominiumId: string): void;
    deleteTestCondominium(userId: UserId, condominiumId: string): void;
  }>;

export type DevelopmentCondominiumProfile = Readonly<{
  condominiumId: string;
  name: string;
  cnpj: string;
  administrationCompany: string;
  unitCount: number | null;
  address: Readonly<{
    postalCode: string;
    street: string;
    number: string;
    complement: string;
    neighborhood: string;
    city: string;
    state: string;
  }>;
  contact: Readonly<{
    managerName: string;
    email: string;
    phone: string;
  }>;
}>;

export type DevelopmentCondominiumRegistration = Readonly<{
  userId: UserId;
  condominiumId: string;
  name: string;
  cnpj: string;
  administrationCompany?: string;
  unitCount?: number | null;
  address: Readonly<{
    postalCode?: string;
    street?: string;
    number?: string;
    complement?: string;
    neighborhood?: string;
    city: string;
    state: string;
  }>;
  contact?: Readonly<{
    managerName?: string;
    email?: string;
    phone?: string;
  }>;
}>;

function requiredText(value: string, maximumLength: number, field: string): string {
  const normalized = value.trim();
  if (normalized.length === 0 || normalized.length > maximumLength) {
    throw new Error(`${field} é obrigatório e deve ter até ${maximumLength} caracteres.`);
  }
  return normalized;
}

function optionalText(value: string | undefined, maximumLength: number, field: string): string {
  const normalized = value?.trim() ?? "";
  if (normalized.length > maximumLength) {
    throw new Error(`${field} deve ter até ${maximumLength} caracteres.`);
  }
  return normalized;
}

function normalizeCnpj(value: string): string {
  const digits = value.replaceAll(/\D/gu, "");
  if (digits.length !== 14) {
    throw new Error("O CNPJ sintético deve ter 14 dígitos.");
  }
  return digits;
}

function normalizeUnitCount(value: number | null | undefined): number | null {
  if (value === undefined || value === null) return null;
  if (!Number.isInteger(value) || value < 1 || value > 100_000) {
    throw new Error("A quantidade de unidades deve ser um inteiro entre 1 e 100000.");
  }
  return value;
}

function createDevelopmentProfile(
  input: DevelopmentCondominiumRegistration,
  condominiumId: string
): DevelopmentCondominiumProfile {
  const state = requiredText(input.address.state, 2, "A UF").toUpperCase();
  if (!/^[A-Z]{2}$/u.test(state)) {
    throw new Error("A UF deve ter duas letras.");
  }
  const postalCode = optionalText(input.address.postalCode, 9, "O CEP").replaceAll(/\D/gu, "");
  if (postalCode.length > 0 && postalCode.length !== 8) {
    throw new Error("O CEP deve ter 8 dígitos.");
  }

  return Object.freeze({
    condominiumId,
    name: requiredText(input.name, 120, "O nome do condomínio"),
    cnpj: normalizeCnpj(input.cnpj),
    administrationCompany: optionalText(input.administrationCompany, 120, "A administradora"),
    unitCount: normalizeUnitCount(input.unitCount),
    address: Object.freeze({
      postalCode,
      street: optionalText(input.address.street, 120, "O logradouro"),
      number: optionalText(input.address.number, 20, "O número"),
      complement: optionalText(input.address.complement, 80, "O complemento"),
      neighborhood: optionalText(input.address.neighborhood, 80, "O bairro"),
      city: requiredText(input.address.city, 80, "A cidade"),
      state
    }),
    contact: Object.freeze({
      managerName: optionalText(input.contact?.managerName, 100, "O responsável"),
      email: optionalText(input.contact?.email, 160, "O e-mail"),
      phone: optionalText(input.contact?.phone, 30, "O telefone")
    })
  });
}

export function createDevelopmentIdentityRepository(
  memberships: readonly Membership[] = developmentMemberships
): DevelopmentMembershipRegistry {
  const testMemberships = [...memberships];
  const testCondominiums: Array<
    Readonly<{ userId: UserId; profile: DevelopmentCondominiumProfile }>
  > = [];

  return {
    async findMembership({ userId, condominiumId }) {
      return testMemberships.find(
        (membership) => membership.userId === userId && membership.condominiumId === condominiumId
      );
    },

    createTestCondominium(input) {
      const { userId, condominiumId: inputCondominiumId } = input;
      const condominiumId = createCondominiumId(inputCondominiumId);

      if (
        testMemberships.some(
          (membership) => membership.userId === userId && membership.condominiumId === condominiumId
        )
      ) {
        throw new Error("Já existe um condomínio de teste com esse identificador.");
      }

      const condominium = createDevelopmentProfile(input, condominiumId);
      const membership = Object.freeze({
        condominiumId,
        userId,
        roleKey: "manager" as const,
        status: "active" as const,
        validFrom: new Date("2026-01-01T00:00:00.000Z"),
        revision: `membership-${condominiumId}-test-v1`
      });
      testMemberships.push(membership);
      testCondominiums.push(Object.freeze({ userId, profile: condominium }));
      return Object.freeze({ membership, condominium });
    },

    listTestCondominiums(userId) {
      return Object.freeze(
        testCondominiums
          .filter(
            (record) =>
              record.userId === userId &&
              testMemberships.some(
                (membership) =>
                  membership.userId === userId &&
                  membership.condominiumId === record.profile.condominiumId &&
                  membership.status === "active"
              )
          )
          .map((record) => record.profile)
      );
    },
    leaveTestCondominium(userId, inputCondominiumId) {
      const condominiumId = createCondominiumId(inputCondominiumId);
      const index = testMemberships.findIndex(
        (membership) =>
          membership.userId === userId &&
          membership.condominiumId === condominiumId &&
          membership.status === "active"
      );
      if (index === -1) throw new Error("O condomínio não está associado à sua conta.");

      const membership = testMemberships[index];
      if (membership === undefined) throw new Error("O condomínio não está associado à sua conta.");
      testMemberships[index] = Object.freeze({
        ...membership,
        status: "revoked",
        validUntil: new Date(),
        revision: `${membership.revision}-revoked`
      });
    },

    deleteTestCondominium(userId, inputCondominiumId) {
      const condominiumId = createCondominiumId(inputCondominiumId);
      const managerMembership = testMemberships.find(
        (membership) =>
          membership.userId === userId &&
          membership.condominiumId === condominiumId &&
          membership.status === "active"
      );
      if (managerMembership === undefined) {
        throw new Error("O condomínio não está associado à sua conta.");
      }
      if (managerMembership.roleKey !== "manager") {
        throw new Error("Somente o síndico responsável pode apagar o condomínio.");
      }

      for (let index = testMemberships.length - 1; index >= 0; index -= 1) {
        if (testMemberships[index]?.condominiumId === condominiumId)
          testMemberships.splice(index, 1);
      }
      for (let index = testCondominiums.length - 1; index >= 0; index -= 1) {
        if (testCondominiums[index]?.profile.condominiumId === condominiumId) {
          testCondominiums.splice(index, 1);
        }
      }
    }
  };
}

export function developmentUserId(): UserId {
  return createUserId("sindico-demo");
}
