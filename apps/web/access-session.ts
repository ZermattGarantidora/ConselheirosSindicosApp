import type { DevelopmentIdentity } from "./development-identity.js";

export async function requestAccessSession(
  request: typeof fetch,
  code?: string,
  signal?: AbortSignal
): Promise<DevelopmentIdentity | undefined> {
  const response = await request(code === undefined ? "/v1/access/session" : "/v1/access/login", {
    method: code === undefined ? "GET" : "POST",
    credentials: "same-origin",
    cache: "no-store",
    signal: signal ?? AbortSignal.timeout(15_000),
    ...(code === undefined
      ? {}
      : { headers: { "content-type": "application/json" }, body: JSON.stringify({ code }) })
  });
  if (code === undefined && response.status === 401) return undefined;
  if (!response.ok) {
    const message =
      response.status === 429
        ? "Muitas tentativas. Aguarde alguns minutos e tente novamente."
        : response.status === 401
          ? "Código de acesso inválido. Confira o código fornecido pela equipe."
          : "Não foi possível acessar agora. Tente novamente.";
    throw new Error(message);
  }
  const body = (await response.json()) as { userId?: unknown };
  if (typeof body.userId !== "string" || !body.userId.trim())
    throw new Error("Não foi possível confirmar seu acesso.");
  return { userId: body.userId, displayName: "" };
}
