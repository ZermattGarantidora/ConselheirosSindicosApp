import { describe, expect, it, vi } from "vitest";
import {
  createHostedDocumentExecutor,
  hostedDocumentDestination,
  hostedDocumentRequestHash,
  type HostedDocumentTransferAuthorizer,
  type HostedDocumentTransferRequest
} from "../../apps/api/documents/hosted-document-execution.js";

const request: HostedDocumentTransferRequest = {
  purpose: "pdf_ocr",
  destination: hostedDocumentDestination,
  model: "synthetic-model",
  condominiumId: "alameda",
  documentVersions: [{ id: "version-1", contentKind: "original", contentSha256: "a".repeat(64) }],
  payloadSha256: "a".repeat(64),
  inputBytes: 100,
  pageCount: 2,
  maximumOutputTokens: 16000
};
const allow: HostedDocumentTransferAuthorizer = async (input) => ({
  allowed: true,
  requestHash: hostedDocumentRequestHash(input),
  policyRevision: "synthetic-policy-v1"
});

describe("Spec 071 — execução documental privada", () => {
  it("AC-7101: nega por padrão sem chamar operação", async () => {
    const operation = vi.fn();
    await expect(createHostedDocumentExecutor().execute(request, operation)).rejects.toMatchObject({
      code: "transfer_denied"
    });
    expect(operation).not.toHaveBeenCalled();
  });

  it.each(["denied", "mismatched", "revision", "exception"])(
    "AC-7101: recusa decisão %s sem detalhes privados",
    async (kind) => {
      const authorize: HostedDocumentTransferAuthorizer = async (input) => {
        if (kind === "exception") throw new Error("DETALHE_PRIVADO");
        if (kind === "denied") return { allowed: false };
        return {
          allowed: true,
          requestHash: kind === "mismatched" ? "0".repeat(64) : hostedDocumentRequestHash(input),
          policyRevision: kind === "revision" ? " " : "v1"
        };
      };
      const operation = vi.fn();
      const error = await createHostedDocumentExecutor({ authorize })
        .execute(request, operation)
        .catch((value: unknown) => value);
      expect(error).toMatchObject({ code: "transfer_denied" });
      expect(String(error)).not.toContain("DETALHE_PRIVADO");
      expect(error).not.toHaveProperty("cause");
      expect(operation).not.toHaveBeenCalled();
    }
  );

  it("AC-7104: compartilha execução concorrente e devolve cópias independentes", async () => {
    const gate = Promise.withResolvers<void>();
    const execute = createHostedDocumentExecutor({ authorize: allow });
    const operation = vi.fn(async () => {
      await gate.promise;
      return { pages: ["texto sintético"] };
    });
    const first = execute.execute(request, operation);
    const second = execute.execute(request, operation);
    await vi.waitFor(() => expect(operation).toHaveBeenCalledOnce());
    gate.resolve();
    const [a, b] = await Promise.all([first, second]);
    a.pages[0] = "alterado pelo consumidor";
    expect(b.pages).toEqual(["texto sintético"]);
    expect(await execute.execute(request, operation)).toEqual(b);
    expect(operation).toHaveBeenCalledOnce();
  });

  it.each(["condominiumId", "version", "hash", "chatId", "userId", "membershipRevision"])(
    "AC-7104: não compartilha escopo/conteúdo diferente: %s",
    async (field) => {
      const executor = createHostedDocumentExecutor({ authorize: allow });
      const operation = vi.fn(async () => "ok");
      await executor.execute(request, operation);
      const changed = {
        ...request,
        ...(field === "version"
          ? { documentVersions: [{ ...request.documentVersions[0]!, id: "version-2" }] }
          : field === "hash"
            ? { payloadSha256: "b".repeat(64) }
            : { [field]: "outro" })
      };
      await executor.execute(changed, operation);
      expect(operation).toHaveBeenCalledTimes(2);
    }
  );

  it("AC-7101: revogação impede cache e troca de revisão invalida reutilização", async () => {
    let policyRevision = "v1";
    let allowed = true;
    const executor = createHostedDocumentExecutor({
      authorize: async (input) =>
        allowed
          ? { allowed: true, requestHash: hostedDocumentRequestHash(input), policyRevision }
          : { allowed: false }
    });
    const operation = vi.fn(async () => "ok");
    await executor.execute(request, operation);
    allowed = false;
    await expect(executor.execute(request, operation)).rejects.toMatchObject({
      code: "transfer_denied"
    });
    allowed = true;
    policyRevision = "v2";
    await executor.execute(request, operation);
    expect(operation).toHaveBeenCalledTimes(2);
  });

  it("AC-7101/7103: revogação durante execução recusa publicação e não memoriza", async () => {
    let allowed = true;
    const executor = createHostedDocumentExecutor({
      authorize: async (input) => (allowed ? allow(input) : { allowed: false })
    });
    const operation = vi.fn(async () => {
      allowed = false;
      return "não publicar";
    });
    await expect(executor.execute(request, operation)).rejects.toMatchObject({
      code: "transfer_denied"
    });
    allowed = true;
    expect(await executor.execute(request, async () => "novo")).toBe("novo");
  });

  it("AC-7103: falha não é cacheada nem expõe causa", async () => {
    const executor = createHostedDocumentExecutor({ authorize: allow });
    const operation = vi.fn(async () => {
      throw new Error("DETALHE_PRIVADO");
    });
    for (let i = 0; i < 2; i++) {
      const error = await executor.execute(request, operation).catch((value: unknown) => value);
      expect(error).toMatchObject({ code: "execution_failed" });
      expect(String(error)).not.toContain("DETALHE_PRIVADO");
    }
    expect(operation).toHaveBeenCalledTimes(2);
  });

  it("AC-7104: expira em dez minutos e limita o cache a 64 resultados", async () => {
    let now = 0;
    const executor = createHostedDocumentExecutor({ authorize: allow, now: () => now });
    const operation = vi.fn(async () => "ok");
    await executor.execute(request, operation);
    now = 600_000;
    await executor.execute(request, operation);
    for (let i = 0; i < 64; i++)
      await executor.execute({ ...request, payloadSha256: String(i) }, operation);
    await executor.execute(request, operation);
    expect(operation).toHaveBeenCalledTimes(67);
  });

  it("AC-7104: limita uma operação ativa e quatro em espera", async () => {
    const gate = Promise.withResolvers<void>();
    const executor = createHostedDocumentExecutor({ authorize: allow });
    const operation = vi.fn(async () => {
      await gate.promise;
      return "ok";
    });
    const pending = Array.from({ length: 5 }, (_, index) =>
      executor.execute({ ...request, condominiumId: `tenant-${index}` }, operation)
    );
    await vi.waitFor(() => expect(operation).toHaveBeenCalledOnce());
    await expect(
      executor.execute({ ...request, condominiumId: "excess" }, operation)
    ).rejects.toMatchObject({ code: "execution_limit" });
    gate.resolve();
    await Promise.all(pending);
    expect(operation).toHaveBeenCalledTimes(5);
  });

  it("AC-7101: revalida autorização depois de aguardar a fila", async () => {
    const gate = Promise.withResolvers<void>();
    let blocked = false;
    const executor = createHostedDocumentExecutor({
      authorize: async (input) =>
        blocked && input.condominiumId === "bosque" ? { allowed: false } : allow(input)
    });
    const active = executor.execute(request, async () => {
      await gate.promise;
      return "ok";
    });
    const operation = vi.fn(async () => "não executar");
    const queued = executor.execute({ ...request, condominiumId: "bosque" }, operation);
    const assertion = expect(queued).rejects.toMatchObject({ code: "transfer_denied" });
    await Promise.resolve();
    blocked = true;
    gate.resolve();
    await active;
    await assertion;
    expect(operation).not.toHaveBeenCalled();
  });

  it("AC-7103: cancelamento remove espera e não inicia operação cancelada", async () => {
    const executor = createHostedDocumentExecutor({ authorize: allow });
    const gate = Promise.withResolvers<void>();
    const active = executor.execute(request, async () => {
      await gate.promise;
      return "ok";
    });
    const controller = new AbortController();
    const operation = vi.fn(async () => "não executar");
    const queued = executor.execute(
      { ...request, condominiumId: "bosque" },
      operation,
      controller.signal
    );
    const assertion = expect(queued).rejects.toMatchObject({ code: "execution_failed" });
    const other = ["c", "d", "e"].map((condominiumId) =>
      executor.execute({ ...request, condominiumId }, async () => "ok")
    );
    // A recusa comprova que a operação cancelada já entrou na fila, não só no autorizador.
    await expect(
      executor.execute({ ...request, condominiumId: "excess" }, operation)
    ).rejects.toMatchObject({ code: "execution_limit" });
    controller.abort();
    await assertion;
    gate.resolve();
    await active;
    await Promise.all(other);
    expect(operation).not.toHaveBeenCalled();
    await expect(executor.execute(request, operation, AbortSignal.abort())).rejects.toMatchObject({
      code: "execution_failed"
    });
  });
});
