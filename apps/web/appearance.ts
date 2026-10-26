export type Appearance = "light" | "dark";

export const appearanceStorageKey = "alvitra.appearance";

export function getBrowserStorage(): Storage | undefined {
  try {
    return window.localStorage;
  } catch {
    return undefined;
  }
}

export function loadAppearance(storage: Pick<Storage, "getItem"> | undefined): Appearance {
  try {
    const saved = storage?.getItem(appearanceStorageKey);
    if (saved === "light" || saved === "dark") return saved;
  } catch {
    // O padrão claro continua disponível sem armazenamento local.
  }
  return "light";
}

export function getInitialAppearance(): Appearance {
  return loadAppearance(getBrowserStorage());
}

export function saveAppearance(
  storage: Pick<Storage, "setItem"> | undefined,
  appearance: Appearance
): void {
  try {
    storage?.setItem(appearanceStorageKey, appearance);
  } catch {
    // A escolha continua válida nesta página quando a persistência está bloqueada.
  }
}
