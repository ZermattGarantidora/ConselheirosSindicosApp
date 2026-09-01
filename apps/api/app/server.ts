import { createApi } from "./create-api.js";
import { createDevelopmentIdentityRepository } from "../identity/development-identity-repository.js";

export async function startServer(port = 3000): Promise<ReturnType<typeof createApi>> {
  const app = createApi({ membershipRepository: createDevelopmentIdentityRepository() });
  await app.listen({ host: "127.0.0.1", port });
  return app;
}
