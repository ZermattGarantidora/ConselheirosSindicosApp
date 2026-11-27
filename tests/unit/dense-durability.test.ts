import { describe, it, expect, vi } from "vitest";
import { mkdtemp, rm, readFile, mkdir } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join, resolve, dirname, basename } from "node:path";
import { setTimeout as delay } from "node:timers/promises";
import { createProgressWriter } from "../../evals/dense-documents/progress.js";
import { createDurableDenseProcess } from "../../evals/dense-documents/attempts.js";
import { readCheckpoint, writeCheckpoint } from "../../evals/full-page-documents/checkpoints.js";
import type { CodexProcessRequest } from "../../apps/api/answers/codex-process.js";
async function temporary(run: (folder: string) => Promise<void>) {
  const folder = await mkdtemp(join(tmpdir(), "alvitra-dense-durability-"));
  try {
    await run(folder);
  } finally {
    if (
      dirname(resolve(folder)) === resolve(tmpdir()) &&
      basename(folder).startsWith("alvitra-dense-durability-")
    )
      await rm(folder, { recursive: true, force: true });
  }
}
const scope = { manifestHash: "manifest-sintetico", condition: "sol-fixed", caseId: "DENSE-001" };
const request: CodexProcessRequest = {
  executable: "synthetic-only",
  args: ["--model", "gpt-6.1-sol"],
  input: "pergunta sintetica",
  cwd: ".",
  timeoutMs: 1000
};
const stdout = JSON.stringify({
  type: "turn.completed",
  usage: { input_tokens: 100, cached_input_tokens: 20, output_tokens: 10 }
});
describe("Spec 076 — recibos duráveis e progresso", () => {
  it("AC7711: conserva marcos observados no recibo e no replay sem nova chamada", async () =>
    temporary(async (folder) => {
      const timings = {
        spawnMs: 1,
        firstByteMs: 2,
        turnStartedMs: 3,
        firstAnswerEventMs: 7,
        totalMs: 8
      };
      const observe = vi.fn(),
        run = vi.fn(async (request: CodexProcessRequest) => {
          request.onTimings?.(timings);
          return stdout;
        });
      await createDurableDenseProcess(folder, scope, run)({ ...request, onTimings: observe });
      const saved = await readCheckpoint<{ processTimings: unknown }>(
        join(folder, "attempts/sol-fixed-DENSE-001-1-result.json")
      );
      expect(saved?.processTimings).toEqual(timings);
      await createDurableDenseProcess(folder, scope, run)({ ...request, onTimings: observe });
      expect(run).toHaveBeenCalledOnce();
      expect(observe).toHaveBeenCalledTimes(2);
      expect(observe).toHaveBeenLastCalledWith(timings);
    }));
  it("AC7606: duas filas nunca gravam progresso ao mesmo tempo", async () => {
    let active = 0,
      max = 0;
    const seen: number[] = [];
    const writer = createProgressWriter("synthetic", async (_path, value) => {
      active++;
      max = Math.max(active, max);
      await delay(1);
      seen.push(value as number);
      active--;
    });
    await Promise.all(Array.from({ length: 30 }, (_, i) => writer(i)));
    expect(max).toBe(1);
    expect(seen).toEqual(Array.from({ length: 30 }, (_, i) => i));
  });
  it("AC7606: EPERM no progresso não descarta resultado; outro erro é visível", async () => {
    const blocked = Object.assign(new Error("busy"), { code: "EPERM" }),
      warn = vi.fn();
    const write = vi.fn().mockRejectedValueOnce(blocked).mockResolvedValue(undefined);
    const writer = createProgressWriter("synthetic", write, warn);
    await expect(writer(1)).resolves.toBeUndefined();
    await writer(2);
    expect(warn).toHaveBeenCalledOnce();
    expect(write).toHaveBeenLastCalledWith("synthetic", 2);
    const failed = createProgressWriter("synthetic", async () => {
      throw Object.assign(new Error("disk"), { code: "ENOSPC" });
    });
    await expect(failed(1)).rejects.toThrow("disk");
  });
  it("AC7606: recibo concluído recupera a saída exata sem nova inferência", async () =>
    temporary(async (folder) => {
      const run = vi.fn(async () => stdout),
        first = createDurableDenseProcess(folder, scope, run);
      expect(await first(request)).toBe(stdout);
      expect(run).toHaveBeenCalledOnce();
      const saved = await readCheckpoint<{ usage: unknown }>(
        join(folder, "attempts/sol-fixed-DENSE-001-1-result.json")
      );
      expect(saved?.usage).toEqual({ input: 100, cached: 20, output: 10 });
      const reused = vi.fn();
      expect(await createDurableDenseProcess(folder, scope, run, reused)(request)).toBe(stdout);
      expect(run).toHaveBeenCalledOnce();
      expect(reused).toHaveBeenCalledOnce();
      await expect(
        createDurableDenseProcess(folder, scope, run)({ ...request, input: "outro texto" })
      ).rejects.toThrow("outro caso");
      await expect(
        createDurableDenseProcess(folder, { ...scope, manifestHash: "outra" }, run)(request)
      ).rejects.toThrow("outro caso");
      expect(run).toHaveBeenCalledOnce();
    }));
  it("AC7606: falha não é refeita nem ganha consumo zero", async () =>
    temporary(async (folder) => {
      // Criar o marcador pelo caminho real antes de simular a interrupção.
      const run = vi.fn(async () => {
        throw new Error("falha sintetica");
      });
      await expect(createDurableDenseProcess(folder, scope, run)(request)).rejects.toThrow(
        "falha sintetica"
      );
      const raw = await readFile(
        join(folder, "attempts/sol-fixed-DENSE-001-1-result.json"),
        "utf8"
      );
      expect(raw).not.toContain("falha sintetica");
      const saved = JSON.parse(raw).value;
      expect(saved.usage).toBeNull();
      await expect(createDurableDenseProcess(folder, scope, run)(request)).rejects.toThrow(
        "não reenviar"
      );
      expect(run).toHaveBeenCalledOnce();
    }));
  it("AC7606: marcador sem resultado impede novo envio após interrupção", async () =>
    temporary(async (folder) => {
      await mkdir(join(folder, "attempts"));
      await writeCheckpoint(join(folder, "attempts/sol-fixed-DENSE-001-1-started.json"), {
        manifestHash: scope.manifestHash,
        inputHash: "envio-possivelmente-iniciado",
        possiblyDispatched: true
      });
      const run = vi.fn(async () => stdout);
      await expect(createDurableDenseProcess(folder, scope, run)(request)).rejects.toThrow(
        "consumo desconhecido"
      );
      expect(run).not.toHaveBeenCalled();
      expect(
        await readCheckpoint(join(folder, "attempts/sol-fixed-DENSE-001-1-result.json"))
      ).toBeUndefined();
    }));
});
