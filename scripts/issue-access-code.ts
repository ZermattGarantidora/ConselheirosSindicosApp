import { Pool } from "pg";
import { parseDatabaseUrl } from "./database-migrations.js";
import { createAccessCodeService } from "../apps/api/identity/access-code.js";
import { createLocalAccessCodeService } from "../apps/api/identity/local-access-code-store.js";
import { createPostgresAccessCodeStore } from "../apps/api/identity/postgres-access-code-store.js";
import { createDevelopmentIdentity } from "../apps/web/development-identity.js";

const args = process.argv.slice(2).filter((arg) => arg !== "--");
const value = (flag: string) => args[args.indexOf(flag) + 1];
const demo = process.env.DEMO_MODE?.trim().toLowerCase() === "true";
let pool: Pool | undefined;
try {
  if (
    (args.includes("--demo-name") && !demo) ||
    (args.includes("--demo-name") && args.includes("--user-id"))
  )
    throw new Error("Nome sintético só pode ser usado na demonstração sem banco.");
  const userId = args.includes("--demo-name")
    ? createDevelopmentIdentity(value("--demo-name") ?? "").userId
    : args.includes("--user-id")
      ? value("--user-id")
      : undefined;
  if (!userId || userId.startsWith("--"))
    throw new Error(
      "Informe --user-id <identidade> ou --demo-name <nome-anterior> na demonstração."
    );
  const service = demo
    ? await createLocalAccessCodeService(
        process.env.ACCESS_CODE_DIRECTORY?.trim() || ".local/access-codes"
      )
    : createAccessCodeService(
        createPostgresAccessCodeStore(
          (pool = new Pool({
            connectionString: parseDatabaseUrl(
              process.env.ACCESS_CODE_OPERATOR_DATABASE_URL ?? process.env.DATABASE_URL
            ).toString()
          }))
        ),
        process.env.ACCESS_CODE_SECRET ?? ""
      );
  // Provisionamento operacional: a credencial é exibida somente para a equipe entregar ao titular.
  // O modo real cria apenas identidades novas sem senha/e-mail se --new for explícito.
  if (args.includes("--new")) {
    if (!pool) throw new Error("Na demonstração, escolha diretamente uma identidade sintética.");
    if (!/^[a-f0-9-]{36}$/iu.test(userId)) throw new Error("Use um UUID como identidade real.");
    await pool.query("SELECT app.create_account($1, $2, NULL, NULL, NULL)", [
      userId,
      `access-code:${userId}`
    ]);
  }
  const code = await service.provision(userId);
  process.stdout.write(`Código de acesso (entregue apenas ao titular): ${code}\n`);
} catch {
  console.error(
    "Não foi possível emitir o código. Confira a identidade, o ambiente, o segredo e as migrations. A emissão não é pública."
  );
  process.exitCode = 1;
} finally {
  await pool?.end();
}
