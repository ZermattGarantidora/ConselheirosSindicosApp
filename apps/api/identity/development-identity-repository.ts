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

export function createDevelopmentIdentityRepository(
  memberships: readonly Membership[] = developmentMemberships
): MembershipRepository {
  return {
    async findMembership({ userId, condominiumId }) {
      return memberships.find(
        (membership) => membership.userId === userId && membership.condominiumId === condominiumId
      );
    }
  };
}

export function developmentUserId(): UserId {
  return createUserId("sindico-demo");
}
