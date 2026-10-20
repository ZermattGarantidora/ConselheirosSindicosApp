export type DemoWorkAdmission = Readonly<{
  hasMemoryCapacity(): boolean;
  acquireDocument(): (() => void) | undefined;
}>;

export function createDemoWorkAdmission(
  options: Readonly<{
    maximumResidentBytes?: number;
    residentBytes?: () => number;
  }> = {}
): DemoWorkAdmission {
  const maximumResidentBytes = options.maximumResidentBytes ?? 320 * 1024 * 1024;
  const residentBytes = options.residentBytes ?? (() => process.memoryUsage().rss);
  if (!Number.isSafeInteger(maximumResidentBytes) || maximumResidentBytes <= 0) {
    throw new Error("O limite de memória deve ser um inteiro positivo.");
  }
  let documentInProgress = false;
  const hasMemoryCapacity = () => {
    const current = residentBytes();
    return Number.isFinite(current) && current >= 0 && current < maximumResidentBytes;
  };
  return Object.freeze({
    hasMemoryCapacity,
    acquireDocument() {
      if (documentInProgress || !hasMemoryCapacity()) return undefined;
      documentInProgress = true;
      let released = false;
      return () => {
        if (released) return;
        released = true;
        documentInProgress = false;
      };
    }
  });
}
