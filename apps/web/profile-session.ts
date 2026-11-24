import { developmentIdentityStorageKey } from "./development-identity.js";

export async function signOut(
  authMode: "development" | "real",
  storage: Pick<Storage, "removeItem"> | undefined,
  request: typeof fetch = fetch,
  accessCodeEnabled = false
): Promise<void> {
  if (authMode === "real" || accessCodeEnabled) {
    const response = await request(accessCodeEnabled ? "/v1/access/logout" : "/v1/auth/logout", {
      method: "POST",
      credentials: "same-origin",
      signal: AbortSignal.timeout(15_000)
    });
    if (!response.ok) throw new Error("Não foi possível sair da conta. Tente novamente.");
  }
  try {
    storage?.removeItem(developmentIdentityStorageKey);
  } catch {
    // O identificador da entrada antiga é apenas uma lembrança local.
  }
}
