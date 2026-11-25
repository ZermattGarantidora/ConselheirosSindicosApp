import { startServer } from "./server.js";
import { registerServerShutdown } from "./server-shutdown.js";

const app = await startServer();
registerServerShutdown(() => app.close());
