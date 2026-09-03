import {
  type CondominiumId,
  type CondominiumScope,
  withCondominiumScope
} from "../core/condominium-scope.js";

declare const userIdBrand: unique symbol;

export type UserId = string & {
  readonly [userIdBrand]: "UserId";
};

export type MembershipStatus = "active" | "revoked" | "expired";
export type Permission = "document:read" | "document:upload";

export type Membership = Readonly<{
  condominiumId: CondominiumId;
  userId: UserId;
  roleKey: "manager" | "advisor";
  status: MembershipStatus;
  validFrom: Date;
  validUntil?: Date;
  revision: string;
}>;

export type AuthorizedCondominiumContext = Readonly<
  CondominiumScope & {
    userId: UserId;
    roleKey: Membership["roleKey"];
    membershipRevision: string;
    permissions: readonly Permission[];
  }
>;

export interface MembershipRepository {
  findMembership(
    input: Readonly<{ userId: UserId; condominiumId: CondominiumId }>
  ): Promise<Membership | undefined>;
}

export class AccessDeniedError extends Error {
  public constructor() {
    super("Acesso ao condomínio não autorizado.");
    this.name = "AccessDeniedError";
  }
}

export function createUserId(input: string): UserId {
  const normalized = input.trim();

  if (normalized.length === 0) {
    throw new Error("UserId não pode ser vazio.");
  }

  return normalized as UserId;
}

export async function resolveAuthorizedCondominiumContext(
  repository: MembershipRepository,
  input: Readonly<{ userId: UserId; condominiumId: CondominiumId; now: Date }>
): Promise<AuthorizedCondominiumContext> {
  const membership = await repository.findMembership({
    userId: input.userId,
    condominiumId: input.condominiumId
  });

  if (
    membership === undefined ||
    membership.userId !== input.userId ||
    membership.condominiumId !== input.condominiumId ||
    membership.status !== "active" ||
    membership.validFrom > input.now ||
    (membership.validUntil !== undefined && membership.validUntil <= input.now)
  ) {
    throw new AccessDeniedError();
  }

  const permissions: readonly Permission[] =
    membership.roleKey === "manager" ? ["document:read", "document:upload"] : ["document:read"];

  return Object.freeze({
    ...withCondominiumScope(input.condominiumId),
    userId: input.userId,
    roleKey: membership.roleKey,
    membershipRevision: membership.revision,
    permissions
  });
}
