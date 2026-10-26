import { developmentIdentityStorageKey } from "./development-identity.js";

export async function signOut(
  authMode: "development" | "real",
  storage: Pick<Storage, "removeItem"> | undefined,
  request: typeof fetch = fetch
): Promise<void> {
  if (authMode === "real") {
    const response = await request("/v1/auth/logout", {
      method: "POST",
      credentials: "same-origin",
      signal: AbortSignal.timeout(15_000)
    });
    if (!response.ok) throw new Error("Não foi possível sair da conta. Tente novamente.");
  }
  try {
    storage?.removeItem(developmentIdentityStorageKey);
  } catch {
    // A lembrança é apenas um preenchimento da entrada, nunca uma sessão autenticada.
  }
}
