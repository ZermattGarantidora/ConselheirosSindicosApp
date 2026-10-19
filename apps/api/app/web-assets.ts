import { readFile, stat } from "node:fs/promises";
import { extname, isAbsolute, relative, resolve } from "node:path";

import type { FastifyInstance, FastifyReply, FastifyRequest } from "fastify";

const contentTypes = Object.freeze({
  ".css": "text/css; charset=utf-8",
  ".html": "text/html; charset=utf-8",
  ".ico": "image/x-icon",
  ".js": "text/javascript; charset=utf-8",
  ".json": "application/json; charset=utf-8",
  ".jpg": "image/jpeg",
  ".jpeg": "image/jpeg",
  ".png": "image/png",
  ".svg": "image/svg+xml",
  ".woff": "font/woff",
  ".woff2": "font/woff2"
});

function requestedPath(request: FastifyRequest): string | undefined {
  const pathname = request.raw.url?.split("?", 1)[0] ?? "/";
  try {
    return decodeURIComponent(pathname).replace(/^\/+/, "");
  } catch {
    return undefined;
  }
}

function fileWithinDirectory(directory: string, pathname: string): string | undefined {
  const candidate = resolve(directory, pathname.length === 0 ? "index.html" : pathname);
  const pathFromDirectory = relative(directory, candidate);
  return pathFromDirectory.startsWith("..") || isAbsolute(pathFromDirectory)
    ? undefined
    : candidate;
}

async function sendFile(reply: FastifyReply, filename: string): Promise<boolean> {
  try {
    const metadata = await stat(filename);
    if (!metadata.isFile()) return false;
    const contentType = contentTypes[extname(filename).toLowerCase() as keyof typeof contentTypes];
    reply
      .header("cache-control", "no-store")
      .type(contentType ?? "application/octet-stream")
      .send(await readFile(filename));
    return true;
  } catch {
    return false;
  }
}

/** Serve o build do cliente junto da API para preservar a mesma origem e os cookies de sessão. */
export function registerWebAssets(app: FastifyInstance, directory: string): void {
  const absoluteDirectory = resolve(directory);
  app.get("/", async (request, reply) => {
    const filename = fileWithinDirectory(absoluteDirectory, requestedPath(request) ?? "");
    if (filename !== undefined && (await sendFile(reply, filename))) return;
    return reply.code(503).send({ message: "A interface web ainda não está disponível." });
  });
  app.get("/*", async (request, reply) => {
    const pathname = requestedPath(request);
    if (pathname === undefined) return reply.code(400).send({ message: "Caminho inválido." });
    const filename = fileWithinDirectory(absoluteDirectory, pathname);
    if (filename !== undefined && (await sendFile(reply, filename))) return;
    if (extname(pathname).length > 0)
      return reply.code(404).send({ message: "Arquivo não encontrado." });
    const index = fileWithinDirectory(absoluteDirectory, "index.html");
    if (index !== undefined && (await sendFile(reply, index))) return;
    return reply.code(503).send({ message: "A interface web ainda não está disponível." });
  });
}
