import { execFile } from "node:child_process";

export type CodexProcessRequest = Readonly<{
  executable: string;
  args: readonly string[];
  input: string;
  cwd: string;
  timeoutMs: number;
  signal?: AbortSignal;
}>;

export type CodexProcessErrorCode =
  | "codex_process_start_failed"
  | "codex_process_failed"
  | "codex_process_timeout"
  | "codex_output_limit"
  | "codex_stdin_failed";

// Guardar somente o código controlado; Error.cause e mensagens nativas podem conter segredos.
export class CodexProcessError extends Error {
  public constructor(public readonly code: CodexProcessErrorCode) {
    super("Falha no processo Codex.");
    this.name = "CodexProcessError";
  }
}

function processErrorCode(error: unknown): CodexProcessErrorCode {
  const details = error as { code?: unknown; killed?: unknown; signal?: unknown } | null;
  if (details?.code === "ERR_CHILD_PROCESS_STDIO_MAXBUFFER") return "codex_output_limit";
  if (details?.killed === true && details.signal === "SIGKILL") return "codex_process_timeout";
  if (["ENOENT", "EACCES", "EPERM"].includes(String(details?.code)))
    return "codex_process_start_failed";
  return "codex_process_failed";
}

// O CLI gerencia a sessão ChatGPT; não encaminhar chaves, banco ou segredos da aplicação.
export function codexProcessEnvironment(environment: NodeJS.ProcessEnv): NodeJS.ProcessEnv {
  const allowed =
    /^(PATH|PATHEXT|SYSTEMROOT|WINDIR|COMSPEC|USERPROFILE|HOME|APPDATA|LOCALAPPDATA|TEMP|TMP|TMPDIR|CODEX_HOME|HTTPS_PROXY|HTTP_PROXY|NO_PROXY|CODEX_CA_CERTIFICATE|SSL_CERT_FILE)$/iu;
  return Object.fromEntries(Object.entries(environment).filter(([key]) => allowed.test(key)));
}

export function runCodexProcess(request: CodexProcessRequest): Promise<string> {
  return new Promise((resolve, reject) => {
    let stdinFailed = false;
    try {
      const child = execFile(
        request.executable,
        [...request.args],
        {
          cwd: request.cwd,
          env: codexProcessEnvironment(process.env),
          encoding: "utf8",
          timeout: request.timeoutMs,
          killSignal: "SIGKILL",
          maxBuffer: 2 * 1024 * 1024,
          windowsHide: true,
          shell: false,
          ...(request.signal ? { signal: request.signal } : {})
        },
        (error, stdout) => {
          // Dar precedência ao erro nativo (ex.: timeout que também fecha stdin com EPIPE).
          if (error !== null) reject(new CodexProcessError(processErrorCode(error)));
          else if (stdinFailed) reject(new CodexProcessError("codex_stdin_failed"));
          else resolve(stdout);
        }
      );
      // Esperar o encerramento permite limpar o temporário depois que o processo terminou.
      child.stdin?.on("error", () => {
        stdinFailed = true;
      });
      if (child.stdin === null) stdinFailed = true;
      try {
        child.stdin?.end(request.input);
      } catch {
        stdinFailed = true;
      }
    } catch {
      reject(new CodexProcessError("codex_process_start_failed"));
    }
  });
}
