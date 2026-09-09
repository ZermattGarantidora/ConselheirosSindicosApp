import { createRequire } from "node:module";
import { fileURLToPath, URL } from "node:url";

const require = createRequire(import.meta.url);
const safeUserInfo = () => ({ username: "codex" });
require("node:os").userInfo = safeUserInfo;
require("os").userInfo = safeUserInfo;

const preload = fileURLToPath(new URL("./safe-os-user-info.cjs", import.meta.url)).replaceAll(
  "\\",
  "/"
);
process.env.NODE_OPTIONS = [process.env.NODE_OPTIONS, `--require=${preload}`]
  .filter(Boolean)
  .join(" ");

process.argv = [process.argv[0], process.argv[1], ...process.argv.slice(2)];
await import("tsx/cli");
