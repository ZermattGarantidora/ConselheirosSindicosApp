export type AccountLevel = "starting" | "confirmed";

export type ConfirmedAccountProfile = Readonly<{
  emailVerified: boolean;
  activeCondominiumCount: number;
}>;

export type AccountLevelPolicy = Readonly<{
  confirmedLevelMinimumCondominiums: number;
}>;

export const defaultAccountLevelPolicy: AccountLevelPolicy = Object.freeze({
  confirmedLevelMinimumCondominiums: 1
});

export function calculateAccountLevel(
  profile: ConfirmedAccountProfile,
  policy: AccountLevelPolicy = defaultAccountLevelPolicy
): AccountLevel {
  if (
    profile.emailVerified &&
    profile.activeCondominiumCount >= policy.confirmedLevelMinimumCondominiums
  ) {
    return "confirmed";
  }
  return "starting";
}
