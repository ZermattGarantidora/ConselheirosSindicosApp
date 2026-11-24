import { mkdtemp, rm } from "node:fs/promises";
import { join } from "node:path";
import { tmpdir } from "node:os";
import type { FastifyInstance } from "fastify";
import { startServer } from "../../apps/api/app/server.js";
import { createLocalAccessCodeService } from "../../apps/api/identity/local-access-code-store.js";

const directories = new WeakMap<FastifyInstance, string>();
const sessions = new WeakMap<FastifyInstance, Map<string, string>>();

/** Usa provisionamento operacional e login reais, sem bypass de autenticação nos testes. */
export async function startSyntheticServer(port: number, environment: NodeJS.ProcessEnv) {
  if (environment.DEMO_MODE !== "true") return startServer(port, environment);
  const directory = await mkdtemp(join(tmpdir(), "alvitra-synthetic-access-"));
  try {
    const app = await startServer(port, { ...environment, ACCESS_CODE_DIRECTORY: directory });
    directories.set(app, directory);
    sessions.set(app, new Map());
    app.server.once("close", () => {
      void rm(directory, { recursive: true, force: true });
    });
    return app;
  } catch (error) {
    await rm(directory, { recursive: true, force: true });
    throw error;
  }
}

export async function syntheticAccessHeaders(app: FastifyInstance, userId = "sindico-demo") {
  const directory = directories.get(app);
  if (!directory) return { "x-development-user-id": userId };
  const known = sessions.get(app)!;
  if (!known.has(userId)) {
    const code = await (await createLocalAccessCodeService(directory)).provision(userId);
    const response = await app.inject({
      method: "POST",
      url: "/v1/access/login",
      payload: { code }
    });
    if (response.statusCode !== 200) throw new Error("Login sintético não confirmado.");
    known.set(userId, String(response.headers["set-cookie"]).split(";")[0]!);
  }
  return { cookie: known.get(userId)! };
}
