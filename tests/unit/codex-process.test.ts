import { execFile, type ChildProcess } from "node:child_process";
import { EventEmitter } from "node:events";
import { beforeEach, describe, expect, it, vi } from "vitest";
import {
  CodexProcessError,
  codexProcessEnvironment,
  runCodexProcess
} from "../../apps/api/answers/codex-process.js";

vi.mock("node:child_process", () => ({ execFile: vi.fn() }));

describe("processo Codex sem shell ou credenciais de API", () => {
  beforeEach(() => vi.resetAllMocks());

  it("AC7711: mede eventos fragmentados sem conteúdo, sem confundir evento com token", async () => {
    const timings: unknown[] = [];
    vi.mocked(execFile).mockImplementation((...args: unknown[]) => {
      const callback = args[3] as (error: null, stdout: string) => void;
      const child = new EventEmitter(),
        stdout = new EventEmitter();
      queueMicrotask(() => {
        child.emit("spawn");
        stdout.emit("data", Buffer.from('aviso privado\n{"type":"turn.st'));
        stdout.emit(
          "data",
          Buffer.from(
            'arted"}\n{"type":"item.completed","item":{"type":"agent_message","text":"CANARIO_PRIVADO"}}\n'
          )
        );
        callback(null, "output sintético");
      });
      return Object.assign(child, {
        stdout,
        stdin: { on: vi.fn(), end: vi.fn() }
      }) as unknown as ChildProcess;
    });
    await runCodexProcess({
      executable: "synthetic",
      args: [],
      input: "privado",
      cwd: ".",
      timeoutMs: 1000,
      onTimings: (t) => {
        timings.push(t);
      }
    });
    const timing = timings[0] as {
      spawnMs: number;
      firstByteMs: number;
      turnStartedMs: number;
      firstAnswerEventMs: number;
      totalMs: number;
    };
    expect(timing.spawnMs).toBeGreaterThanOrEqual(0);
    expect(timing.firstByteMs).toBeGreaterThanOrEqual(timing.spawnMs);
    expect(timing.turnStartedMs).toBeGreaterThanOrEqual(timing.firstByteMs);
    expect(timing.firstAnswerEventMs).toBeGreaterThanOrEqual(timing.turnStartedMs);
    expect(timing.totalMs).toBeGreaterThanOrEqual(timing.firstAnswerEventMs);
    expect(JSON.stringify(timings)).not.toMatch(/CANARIO|privado|text|token/iu);
  });
  it.each([false, true])(
    "AC7711: marcos ausentes sao null e observador nao interfere (async=%s)",
    async (asyncObserver) => {
      vi.mocked(execFile).mockImplementation((...args: unknown[]) => {
        const callback = args[3] as (error: null, stdout: string) => void;
        queueMicrotask(() => callback(null, "saida"));
        return { stdin: { on: vi.fn(), end: vi.fn() } } as unknown as ChildProcess;
      });
      const observer = vi.fn((t) => {
        expect(t).toMatchObject({
          spawnMs: null,
          firstByteMs: null,
          turnStartedMs: null,
          firstAnswerEventMs: null
        });
        if (asyncObserver) return Promise.reject(new Error("privado"));
        throw new Error("privado");
      });
      await expect(
        runCodexProcess({
          executable: "synthetic",
          args: [],
          input: "",
          cwd: ".",
          timeoutMs: 100,
          onTimings: observer
        })
      ).resolves.toBe("saida");
      expect(observer).toHaveBeenCalledOnce();
    }
  );

  it("encaminha somente ambiente necessário ao CLI", () => {
    expect(
      codexProcessEnvironment({
        Path: "native-path",
        USERPROFILE: "profile",
        CODEX_HOME: "auth-path",
        OPENAI_API_KEY: "secret",
        CODEX_API_KEY: "secret",
        GEMINI_API_KEY: "secret",
        DATABASE_URL: "secret",
        NODE_OPTIONS: "untrusted"
      })
    ).toEqual({ Path: "native-path", USERPROFILE: "profile", CODEX_HOME: "auth-path" });
  });

  it.each([false, true])(
    "limita timeout e buffer, oculta janela e trata encerramento (erro=%s)",
    async (fail) => {
      const end = vi.fn();
      const on = vi.fn();
      vi.mocked(execFile).mockImplementation((...args: unknown[]) => {
        const callback = args[3] as (error: Error | null, stdout: string) => void;
        queueMicrotask(() =>
          callback(fail ? new Error("stderr sensível") : null, "synthetic-output")
        );
        return { stdin: { end, on } } as unknown as ChildProcess;
      });
      const request = {
        executable: "native-codex",
        args: ["exec", "-"],
        input: "pergunta sintética",
        cwd: "isolated",
        timeoutMs: 1000
      };
      const result = runCodexProcess(request);
      if (fail) await expect(result).rejects.toThrow(/^Falha no processo Codex\.$/u);
      else await expect(result).resolves.toBe("synthetic-output");
      expect(execFile).toHaveBeenCalledWith(
        "native-codex",
        ["exec", "-"],
        expect.objectContaining({
          shell: false,
          windowsHide: true,
          timeout: 1000,
          killSignal: "SIGKILL",
          maxBuffer: 2097152
        }),
        expect.any(Function)
      );
      expect(end).toHaveBeenCalledWith("pergunta sintética");
      expect(on).toHaveBeenCalledWith("error", expect.any(Function));
      const listener = on.mock.calls[0]?.[1] as () => undefined;
      expect(listener()).toBeUndefined();
    }
  );

  it("recusa executável ausente mesmo sem stdin disponível", async () => {
    vi.mocked(execFile).mockImplementation((...args: unknown[]) => {
      const callback = args[3] as (error: Error, stdout: string) => void;
      queueMicrotask(() => callback(new Error("ENOENT"), ""));
      return { stdin: null } as ChildProcess;
    });
    await expect(
      runCodexProcess({ executable: "missing", args: [], input: "", cwd: ".", timeoutMs: 1 })
    ).rejects.toThrow("Falha no processo");
  });

  it.each([
    [{ code: "ENOENT" }, "codex_process_start_failed"],
    [{ code: "EACCES" }, "codex_process_start_failed"],
    [{ code: "EPERM" }, "codex_process_start_failed"],
    [{ code: 1 }, "codex_process_failed"],
    [
      { code: "ERR_CHILD_PROCESS_STDIO_MAXBUFFER", killed: true, signal: "SIGKILL" },
      "codex_output_limit"
    ],
    [{ killed: true, signal: "SIGKILL" }, "codex_process_timeout"],
    [{ killed: true, signal: "SIGTERM" }, "codex_process_failed"],
    [{ signal: "SIGKILL" }, "codex_process_failed"],
    [{ message: "timeout com segredo", stderr: "não copiar" }, "codex_process_failed"]
  ] as const)("classifica metadados nativos sem usar texto livre: %j", async (details, code) => {
    vi.mocked(execFile).mockImplementation((...args: unknown[]) => {
      const callback = args[3] as (error: Error, stdout: string) => void;
      queueMicrotask(() =>
        callback(Object.assign(new Error("stderr com segredo"), details), "conteúdo privado")
      );
      return { stdin: { on: vi.fn(), end: vi.fn() } } as unknown as ChildProcess;
    });
    const error: unknown = await runCodexProcess({
      executable: "codex",
      args: [],
      input: "privado",
      cwd: ".",
      timeoutMs: 1
    }).catch((caught: unknown) => caught);
    expect(error).toBeInstanceOf(CodexProcessError);
    expect(error).toMatchObject({ code, message: "Falha no processo Codex." });
    expect(error).not.toHaveProperty("cause");
    expect(error).not.toHaveProperty("stderr");
    expect(JSON.stringify(error)).not.toMatch(/segredo|privado|timeout com/u);
  });

  it.each([false, true])(
    "registra falha de stdin sem suplantar falha nativa (timeout=%s)",
    async (timeout) => {
      vi.mocked(execFile).mockImplementation((...args: unknown[]) => {
        const callback = args[3] as (error: Error | null, stdout: string) => void;
        let onError: () => void;
        queueMicrotask(() => {
          onError();
          callback(
            timeout
              ? Object.assign(new Error("privado"), { killed: true, signal: "SIGKILL" })
              : null,
            "incompleto"
          );
        });
        return {
          stdin: {
            on: (_event: string, listener: () => void) => {
              onError = listener;
            },
            end: vi.fn()
          }
        } as unknown as ChildProcess;
      });
      await expect(
        runCodexProcess({ executable: "codex", args: [], input: "privado", cwd: ".", timeoutMs: 1 })
      ).rejects.toMatchObject({ code: timeout ? "codex_process_timeout" : "codex_stdin_failed" });
    }
  );

  it("não aceita sucesso sem stdin", async () => {
    vi.mocked(execFile).mockImplementation((...args: unknown[]) => {
      const callback = args[3] as (error: null, stdout: string) => void;
      queueMicrotask(() => callback(null, "saída"));
      return { stdin: null } as ChildProcess;
    });
    await expect(
      runCodexProcess({ executable: "codex", args: [], input: "privado", cwd: ".", timeoutMs: 1 })
    ).rejects.toMatchObject({ code: "codex_stdin_failed" });
  });

  it("espera encerramento ao falhar escrita síncrona de stdin", async () => {
    vi.mocked(execFile).mockImplementation((...args: unknown[]) => {
      const callback = args[3] as (error: null, stdout: string) => void;
      queueMicrotask(() => callback(null, "saída incompleta"));
      return {
        stdin: {
          on: vi.fn(),
          end: () => {
            throw new Error("entrada privada");
          }
        }
      } as unknown as ChildProcess;
    });
    await expect(
      runCodexProcess({ executable: "codex", args: [], input: "privado", cwd: ".", timeoutMs: 1 })
    ).rejects.toMatchObject({ code: "codex_stdin_failed" });
  });

  it("normaliza exceção síncrona do lançamento sem guardar causa", async () => {
    vi.mocked(execFile).mockImplementation(() => {
      throw new Error("credencial privada");
    });
    await expect(
      runCodexProcess({ executable: "codex", args: [], input: "privado", cwd: ".", timeoutMs: 1 })
    ).rejects.toMatchObject({
      code: "codex_process_start_failed",
      message: "Falha no processo Codex."
    });
  });
});
