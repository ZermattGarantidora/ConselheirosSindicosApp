import { readFile } from "node:fs/promises";
import { inspectPilotPreparation } from "./pilot-preparation.js";

try {
  const args = process.argv.slice(2);
  const decisionArgument = args.find((arg) => arg.startsWith("--decisions="));
  if (args.some((arg) => arg !== "--require-decisions" && !arg.startsWith("--decisions=")))
    throw new Error("Argumento não suportado.");
  const blueprint = await readFile(new URL("../render.pilot.yaml", import.meta.url), "utf8");
  const decisions = JSON.parse(
    await readFile(
      decisionArgument?.slice("--decisions=".length) ??
        new URL("../infrastructure/pilot/operations-decisions.example.json", import.meta.url),
      "utf8"
    )
  );
  const result = inspectPilotPreparation(blueprint, decisions);
  console.info(JSON.stringify(result, null, 2));
  if (
    !result.configurationValid ||
    (args.includes("--require-decisions") && !result.decisionsRecorded)
  )
    process.exitCode = 1;
} catch {
  console.error(JSON.stringify({ code: "pilot_preparation_failed", activationAuthorized: false }));
  process.exitCode = 1;
}
