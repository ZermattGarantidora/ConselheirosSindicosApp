import { createHash } from "node:crypto";
import { mkdir } from "node:fs/promises";
import { join } from "node:path";
import { runCodexProcess, type CodexProcessRequest } from "../../apps/api/answers/codex-process.js";
import { readCheckpoint, writeCheckpoint } from "../full-page-documents/checkpoints.js";
import { usageFromEvents } from "../conversation-comparison/protocol.js";

type Scope = { manifestHash: string; condition: string; caseId: string };
type Receipt = Scope & {
  inputHash: string;
  model: string;
  status: "completed" | "failed";
  rawEvents?: string;
  latencyMs: number;
  usage: ReturnType<typeof usageFromEvents>;
  errorCode?: string;
};
export function createDurableDenseProcess(
  directory: string,
  scope: Scope,
  run: (request: CodexProcessRequest) => Promise<string> = runCodexProcess,
  onReuse: () => void = () => {}
) {
  if (!/^[a-zA-Z0-9-]+$/u.test(scope.caseId) || !/^[a-zA-Z0-9-]+$/u.test(scope.condition))
    throw new Error("Escopo de tentativa inválido.");
  let sequence = 0;
  return async (request: CodexProcessRequest) => {
    const folder = join(directory, "attempts");
    await mkdir(folder, { recursive: true });
    const name = `${scope.condition}-${scope.caseId}-${++sequence}`;
    const startedPath = join(folder, `${name}-started.json`),
      resultPath = join(folder, `${name}-result.json`);
    const inputHash = createHash("sha256").update(request.input).digest("hex"),
      model = request.args[request.args.indexOf("--model") + 1] ?? "unknown";
    const receipt = await readCheckpoint<Receipt>(resultPath);
    if (receipt) {
      if (
        receipt.manifestHash !== scope.manifestHash ||
        receipt.caseId !== scope.caseId ||
        receipt.condition !== scope.condition ||
        receipt.inputHash !== inputHash ||
        receipt.model !== model
      )
        throw new Error("Recibo de outro caso, modelo ou entrada.");
      if (receipt.status !== "completed" || typeof receipt.rawEvents !== "string")
        throw new Error("Tentativa anterior falhou; não reenviar automaticamente.");
      onReuse();
      return receipt.rawEvents;
    }
    const prior = await readCheckpoint<{ manifestHash: string; inputHash: string }>(startedPath);
    if (prior)
      throw new Error("Tentativa anterior com envio incerto; consumo desconhecido, não reenviar.");
    await writeCheckpoint(startedPath, { ...scope, inputHash, model, possiblyDispatched: true });
    const started = Date.now();
    try {
      const stdout = await run(request);
      await writeCheckpoint(resultPath, {
        ...scope,
        inputHash,
        model,
        status: "completed",
        rawEvents: stdout,
        latencyMs: Date.now() - started,
        usage: usageFromEvents(stdout)
      } satisfies Receipt);
      return stdout;
    } catch (error) {
      // Se o resultado não pôde ser salvo, o marcador anterior conserva a incerteza.
      if (!(await readCheckpoint(resultPath)))
        await writeCheckpoint(resultPath, {
          ...scope,
          inputHash,
          model,
          status: "failed",
          latencyMs: Date.now() - started,
          usage: null,
          errorCode: "dense_process_failed"
        } satisfies Receipt);
      throw error;
    }
  };
}
