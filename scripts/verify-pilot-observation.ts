import { readFile } from "node:fs/promises";
import { evaluatePilotObservation } from "./pilot-observation.js";
try {
  const args = process.argv.slice(2);
  if (args.some((arg) => !arg.startsWith("--input=") && !arg.startsWith("--reference-time=")))
    throw new Error();
  const input =
    args.find((arg) => arg.startsWith("--input="))?.slice(8) ??
    new URL("../infrastructure/pilot/synthetic-observation.json", import.meta.url);
  const now =
    args.find((arg) => arg.startsWith("--reference-time="))?.slice(17) ?? new Date().toISOString();
  console.info(
    JSON.stringify(
      evaluatePilotObservation(JSON.parse(await readFile(input, "utf8")), now),
      null,
      2
    )
  );
} catch {
  console.error(
    JSON.stringify({
      code: "pilot_observation_invalid",
      activationAuthorized: false,
      deliveredNotifications: 0
    })
  );
  process.exitCode = 1;
}
