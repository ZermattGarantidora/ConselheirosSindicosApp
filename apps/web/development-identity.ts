export type DevelopmentIdentity = Readonly<{
  userId: string;
  displayName: string;
}>;

export const developmentIdentityStorageKey = "alvitra.demo.identity";

export type DevelopmentSetupCondominium = Readonly<{
  condominiumId: string;
  name: string;
  unitCount: number;
}>;

export type DevelopmentSetupProfile = Readonly<{
  completed: boolean;
  managerName: string;
  condominiums: readonly DevelopmentSetupCondominium[];
}>;

type IdentityStorage = Pick<Storage, "getItem" | "setItem">;

const nonNameReplies = new Set([
  "oi",
  "ola",
  "opa",
  "bom dia",
  "boa tarde",
  "boa noite",
  "tudo bem",
  "sim",
  "nao",
  "ok",
  "okay",
  "certo",
  "beleza",
  "obrigado",
  "obrigada",
  "teste",
  "usuario",
  "sindico",
  "sindica"
]);

function comparisonText(value: string): string {
  return value
    .normalize("NFD")
    .replaceAll(/[\u0300-\u036f]/gu, "")
    .toLocaleLowerCase("pt-BR");
}

function normalizeManagerNameCandidate(input: string): string | undefined {
  if (/\p{Cc}/u.test(input)) return undefined;
  const candidate = input
    .trim()
    .replace(/^[“”"'`]+|[“”"'`.,!?;:]+$/gu, "")
    .replaceAll(/\s+/gu, " ");
  const comparable = comparisonText(candidate);
  if (
    candidate.length < 2 ||
    candidate.length > 60 ||
    nonNameReplies.has(comparable) ||
    /^(?:quero|preciso|gostaria|tenho|estou|vamos|acho|nao sei|por favor|pode|meu nome|eu sou|sou|prefiro)\b/u.test(
      comparable
    ) ||
    /\bexemplo\b/u.test(comparable) ||
    !/\p{L}/u.test(candidate) ||
    !/^[\p{L}\p{M}\p{N}]+(?:[ '\-’][\p{L}\p{M}\p{N}]+)*$/u.test(candidate)
  ) {
    return undefined;
  }

  return /\p{N}/u.test(candidate)
    ? candidate
    : `${candidate.charAt(0).toLocaleUpperCase("pt-BR")}${candidate.slice(1)}`;
}

export function parseDevelopmentManagerName(input: string): string | undefined {
  return normalizeManagerNameCandidate(input);
}

function hashName(value: string): string {
  let hash = 2_166_136_261;
  for (const character of value) {
    hash ^= character.codePointAt(0) ?? 0;
    hash = Math.imul(hash, 16_777_619);
  }
  return (hash >>> 0).toString(36);
}

export function normalizeDevelopmentDisplayName(input: string): string {
  const displayName = input.trim().replaceAll(/\s+/gu, " ");
  if (
    /\p{Cc}/u.test(input) ||
    displayName.length < 2 ||
    displayName.length > 60 ||
    /\p{Cc}/u.test(displayName)
  ) {
    throw new Error("Digite um nome de usuário com 2 a 60 caracteres.");
  }
  return displayName;
}

export function createDevelopmentIdentity(input: string): DevelopmentIdentity {
  const displayName = normalizeDevelopmentDisplayName(input);
  const normalized = displayName.normalize("NFKC").toLocaleLowerCase("pt-BR");
  const slug = normalized
    .normalize("NFD")
    .replaceAll(/[\u0300-\u036f]/gu, "")
    .replaceAll(/[^a-z0-9]+/gu, "-")
    .replaceAll(/^-|-$/gu, "")
    .slice(0, 32);
  return Object.freeze({
    userId: `demo-${slug || "usuario"}-${hashName(normalized)}`,
    displayName
  });
}

export function loadDevelopmentIdentity(
  storage: Pick<IdentityStorage, "getItem">
): DevelopmentIdentity | undefined {
  try {
    const serialized = storage.getItem(developmentIdentityStorageKey);
    if (serialized === null) return undefined;
    const parsed = JSON.parse(serialized) as Readonly<{ displayName?: unknown }>;
    return typeof parsed.displayName === "string"
      ? createDevelopmentIdentity(parsed.displayName)
      : undefined;
  } catch {
    return undefined;
  }
}

export function saveDevelopmentIdentity(
  storage: Pick<IdentityStorage, "setItem">,
  identity: DevelopmentIdentity
): void {
  storage.setItem(
    developmentIdentityStorageKey,
    JSON.stringify({ displayName: identity.displayName })
  );
}

function setupProfileStorageKey(userId: string): string {
  return `alvitra.demo.profile.${userId}`;
}

export function loadDevelopmentSetupProfile(
  storage: Pick<IdentityStorage, "getItem">,
  identity: DevelopmentIdentity
): DevelopmentSetupProfile | undefined {
  try {
    const serialized = storage.getItem(setupProfileStorageKey(identity.userId));
    if (serialized === null) return undefined;
    const parsed = JSON.parse(serialized) as Readonly<{
      completed?: unknown;
      managerName?: unknown;
      condominiums?: unknown;
    }>;
    const managerName =
      typeof parsed.managerName === "string"
        ? parseDevelopmentManagerName(parsed.managerName)
        : undefined;
    if (
      typeof parsed.completed !== "boolean" ||
      (parsed.managerName !== undefined && managerName === undefined) ||
      !Array.isArray(parsed.condominiums)
    ) {
      return undefined;
    }
    const condominiums = parsed.condominiums.filter(
      (item): item is DevelopmentSetupCondominium =>
        typeof item === "object" &&
        item !== null &&
        "condominiumId" in item &&
        typeof item.condominiumId === "string" &&
        "name" in item &&
        typeof item.name === "string" &&
        "unitCount" in item &&
        typeof item.unitCount === "number" &&
        Number.isInteger(item.unitCount) &&
        item.unitCount > 0
    );
    return condominiums.length === parsed.condominiums.length
      ? Object.freeze({
          completed: parsed.completed,
          managerName: managerName ?? "",
          condominiums: Object.freeze(condominiums)
        })
      : undefined;
  } catch {
    return undefined;
  }
}

export function rememberDevelopmentManagerName(
  storage: IdentityStorage,
  identity: DevelopmentIdentity,
  managerName: string
): void {
  const normalizedManagerName = parseDevelopmentManagerName(managerName);
  if (normalizedManagerName === undefined) {
    throw new Error("Informe como você prefere ser chamado.");
  }
  const current = loadDevelopmentSetupProfile(storage, identity);
  storage.setItem(
    setupProfileStorageKey(identity.userId),
    JSON.stringify({
      completed: current?.completed ?? false,
      managerName: normalizedManagerName,
      condominiums: current?.condominiums ?? []
    })
  );
}

export function rememberDevelopmentCondominium(
  storage: IdentityStorage,
  identity: DevelopmentIdentity,
  managerName: string,
  condominium: DevelopmentSetupCondominium,
  completed: boolean
): void {
  const normalizedManagerName = parseDevelopmentManagerName(managerName);
  if (normalizedManagerName === undefined) {
    throw new Error("Informe como você prefere ser chamado.");
  }
  const current = loadDevelopmentSetupProfile(storage, identity);
  const condominiums = [
    ...(current?.condominiums.filter((item) => item.condominiumId !== condominium.condominiumId) ??
      []),
    condominium
  ];
  storage.setItem(
    setupProfileStorageKey(identity.userId),
    JSON.stringify({
      completed,
      managerName: normalizedManagerName,
      condominiums
    })
  );
}
