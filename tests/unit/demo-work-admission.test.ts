import { describe, expect, it, vi } from "vitest";
import { createDemoWorkAdmission } from "../../apps/api/operations/demo-work-admission.js";
import { startMemoryDiagnostics } from "../../apps/api/operations/memory-diagnostics.js";

describe("capacidade da demonstração", () => {
  it("aceita um documento por vez e não libera a reserva de outro trabalho por engano", () => {
    const admission = createDemoWorkAdmission({ residentBytes: () => 1 });
    const releaseFirst = admission.acquireDocument();
    expect(releaseFirst).toBeTypeOf("function");
    expect(admission.acquireDocument()).toBeUndefined();
    releaseFirst!();
    const releaseSecond = admission.acquireDocument();
    expect(releaseSecond).toBeTypeOf("function");
    releaseFirst!();
    expect(admission.acquireDocument()).toBeUndefined();
    releaseSecond!();
    expect(admission.acquireDocument()).toBeTypeOf("function");
  });
  it("recusa trabalho no limite de RSS e volta a aceitar quando há memória", () => {
    let current = 320 * 1024 * 1024;
    const admission = createDemoWorkAdmission({ residentBytes: () => current });
    expect(admission.hasMemoryCapacity()).toBe(false);
    expect(admission.acquireDocument()).toBeUndefined();
    current -= 1;
    expect(admission.hasMemoryCapacity()).toBe(true);
    expect(admission.acquireDocument()).toBeTypeOf("function");
  });
  it.each([NaN, Infinity, -1])("não admite trabalho com medida inválida (%s)", (value) => {
    expect(createDemoWorkAdmission({ residentBytes: () => value }).hasMemoryCapacity()).toBe(false);
  });
  it.each([0, -1, 1.5])("rejeita orçamento inválido (%s)", (value) => {
    expect(() => createDemoWorkAdmission({ maximumResidentBytes: value })).toThrow();
  });
});

describe("diagnóstico de memória sem conteúdo do usuário", () => {
  it("registra RSS, heap e buffers e encerra o timer ao fechar o servidor", () => {
    vi.useFakeTimers();
    try {
      const report = vi.fn();
      const stop = startMemoryDiagnostics(report, () => ({
        rss: 100 * 1048576,
        heapUsed: 20 * 1048576,
        heapTotal: 30 * 1048576,
        external: 5 * 1048576,
        arrayBuffers: 3 * 1048576
      }));
      expect(report).toHaveBeenLastCalledWith({
        event: "server_memory",
        rssMiB: 100,
        heapMiB: 20,
        externalMiB: 5,
        buffersMiB: 3
      });
      vi.advanceTimersByTime(60_000);
      expect(report).toHaveBeenCalledTimes(2);
      stop();
      vi.advanceTimersByTime(60_000);
      expect(report).toHaveBeenCalledTimes(2);
      expect(vi.getTimerCount()).toBe(0);
    } finally {
      vi.useRealTimers();
    }
  });
});
