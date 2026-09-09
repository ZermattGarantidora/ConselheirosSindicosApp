/* eslint-disable @typescript-eslint/no-require-imports, no-undef */
const os = require("node:os");

os.userInfo = () => ({ username: "codex" });
