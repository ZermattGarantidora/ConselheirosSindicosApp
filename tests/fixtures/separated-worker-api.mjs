// Synthetic-only API harness. Production always starts dist/api/app/main.js.
import process from "node:process";
import { resolve } from "node:path";
import { pathToFileURL } from "node:url";
import { syntheticWorkerDatabase } from "../../scripts/synthetic-worker-database.ts";
const compiledRoot = process.env.SYNTHETIC_WORKER_BUILD_ROOT ?? resolve("dist");
const load = (file) => import(pathToFileURL(resolve(compiledRoot, file)).href);
const { createApi } = await load("api/app/create-api.js");
const { createPostgresMembershipRepository } = await load(
  "api/identity/postgres-identity-repository.js"
);
const { createPostgresPrivateDocumentStorage } = await load(
  "api/documents/postgres-private-document-storage.js"
);
const { createPostgresDocumentUploadRepository } = await load(
  "api/documents/postgres-document-upload-repository.js"
);
const { createPostgresChatRepository } = await load("api/chats/postgres-chat-repository.js");
const { createPostgresConversationStore } = await load(
  "api/answers/postgres-conversation-store.js"
);
const { createPostgresDocumentSourceReader } = await load("api/documents/document-source.js");

const pool = await syntheticWorkerDatabase(process.env.SYNTHETIC_WORKER_PROVIDER);
const documents = createPostgresDocumentUploadRepository(pool);
const app = createApi({
  membershipRepository: createPostgresMembershipRepository(pool),
  documentStorage: createPostgresPrivateDocumentStorage(pool),
  documentUploadRepository: documents,
  documentCatalogRepository: documents,
  chatRepository: createPostgresChatRepository(pool),
  conversationStore: createPostgresConversationStore(pool),
  documentSourceReader: createPostgresDocumentSourceReader(pool)
});
app.addHook("onClose", async () => {
  await pool.end();
});
await app.listen({ host: "127.0.0.1", port: 0 });
process.send?.({ type: "ready", address: app.server.address() });
const stop = async () => {
  await app.close();
  process.disconnect?.();
};
process.once("SIGTERM", () => {
  void stop();
});
process.once("SIGINT", () => {
  void stop();
});
process.on("message", (message) => {
  if (message === "stop") void stop();
});
