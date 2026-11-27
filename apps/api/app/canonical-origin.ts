import type { FastifyInstance } from "fastify";

export type CanonicalOrigin = Readonly<{ origin: string; aliases: ReadonlySet<string> }>;

function validHostname(value: string): boolean {
  return (
    value.length <= 253 &&
    value.includes(".") &&
    value.split(".").every((label) => /^[a-z0-9](?:[a-z0-9-]{0,61}[a-z0-9])?$/u.test(label))
  );
}

/** Configuração exclusivamente do servidor; nunca inferir o destino a partir de headers. */
export function canonicalOriginFromEnvironment(
  environment: NodeJS.ProcessEnv
): CanonicalOrigin | undefined {
  const source = environment.PUBLIC_APP_ORIGIN?.trim();
  const aliasSource = environment.PUBLIC_APP_ALIASES?.trim();
  if (!source && !aliasSource) return undefined;
  const fail = () => new Error("Configuração de domínio público inválida.");
  let parsed: URL;
  try {
    parsed = new URL(source ?? "");
  } catch {
    throw fail();
  }
  if (
    parsed.protocol !== "https:" ||
    parsed.username ||
    parsed.password ||
    parsed.port ||
    parsed.pathname !== "/" ||
    parsed.search ||
    parsed.hash ||
    !validHostname(parsed.hostname)
  )
    throw fail();
  const aliases = new Set<string>();
  for (const entry of aliasSource ? aliasSource.split(",") : []) {
    const alias = entry.trim().toLowerCase();
    if (!validHostname(alias) || alias === parsed.hostname || aliases.has(alias)) throw fail();
    aliases.add(alias);
  }
  return { origin: parsed.origin, aliases };
}

export function canonicalRedirectLocation(
  configuration: CanonicalOrigin,
  requestTarget: string
): string | undefined {
  if (
    !requestTarget.startsWith("/") ||
    requestTarget.startsWith("//") ||
    [...requestTarget].some((character) => {
      const code = character.charCodeAt(0);
      return code <= 32 || code === 127 || character === "\\";
    })
  )
    return undefined;
  return configuration.origin + requestTarget;
}

export function registerCanonicalOrigin(
  app: FastifyInstance,
  configuration: CanonicalOrigin | undefined
): void {
  if (configuration === undefined) return;
  app.addHook("onRequest", async (request, reply) => {
    const host = request.headers.host?.toLowerCase().replace(/:443$/u, "");
    if (
      host === undefined ||
      !configuration.aliases.has(host) ||
      request.url.split("?", 1)[0] === "/health"
    )
      return;
    // Concatenar só caminhos locais preserva a origem mesmo diante de um request-target hostil.
    const destination = canonicalRedirectLocation(configuration, request.url);
    if (destination === undefined) return reply.code(400).send({ code: "invalid_redirect_path" });
    return reply.header("cache-control", "no-store").redirect(destination, 308);
  });
}
