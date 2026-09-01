declare const condominiumIdBrand: unique symbol;

export type CondominiumId = string & {
  readonly [condominiumIdBrand]: "CondominiumId";
};

export type CondominiumScope = Readonly<{
  condominiumId: CondominiumId;
}>;

export function createCondominiumId(input: string): CondominiumId {
  const normalized = input.trim();

  if (normalized.length === 0) {
    throw new Error("CondominiumId não pode ser vazio.");
  }

  return normalized as CondominiumId;
}

export function withCondominiumScope(condominiumId: CondominiumId): CondominiumScope {
  return Object.freeze({ condominiumId });
}
