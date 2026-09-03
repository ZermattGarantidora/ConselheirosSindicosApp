import { Pool } from "pg";

import { createApi } from "./create-api.js";
import { createPostgresDocumentUploadRepository } from "../documents/postgres-document-upload-repository.js";
import { createLocalPrivateDocumentStorage } from "../documents/private-document-storage.js";
import { createDevelopmentIdentityRepository } from "../identity/development-identity-repository.js";
import { createPostgresMembershipRepository } from "../identity/postgres-identity-repository.js";

export async function startServer(
  port = 3000,
  environment: NodeJS.ProcessEnv = process.env
): Promise<ReturnType<typeof createApi>> {
  const databaseUrl = environment.DATABASE_URL?.trim();

  if (databaseUrl === undefined || databaseUrl.length === 0) {
    const app = createApi({ membershipRepository: createDevelopmentIdentityRepository() });
    await app.listen({ host: "127.0.0.1", port });
    return app;
  }

  const pool = new Pool({ connectionString: databaseUrl });
  const app = createApi({
    membershipRepository: createPostgresMembershipRepository(pool),
    documentStorage: createLocalPrivateDocumentStorage(
      environment.DOCUMENT_STORAGE_ROOT?.trim() || ".local/synthetic-documents"
    ),
    documentUploadRepository: createPostgresDocumentUploadRepository(pool)
  });
  app.addHook("onClose", async () => {
    await pool.end();
  });
  await app.listen({ host: "127.0.0.1", port });
  return app;
}
