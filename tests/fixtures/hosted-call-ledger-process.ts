import { appendFile } from "node:fs/promises";
import { join } from "node:path";
import { createSyntheticFileHostedCallLedger } from "../../apps/api/documents/synthetic-file-hosted-call-ledger.js";
import {
  createHostedDocumentExecutor,
  hostedDocumentDestination,
  hostedDocumentRequestHash,
  type HostedDocumentTransferRequest
} from "../../apps/api/documents/hosted-document-execution.js";

const [directory, mode, tenant = "synthetic-a", suffix = "a", policyRevision = "synthetic-only"] =
  process.argv.slice(2);
if (!directory || !["execute", "reserve", "stop-after-dispatch"].includes(mode ?? ""))
  throw new Error("Parâmetros sintéticos inválidos.");
const request: HostedDocumentTransferRequest = {
  purpose: "photo_ocr",
  destination: hostedDocumentDestination,
  model: "synthetic-model",
  condominiumId: tenant,
  documentVersions: [
    { id: "synthetic-v1", contentKind: "original", contentSha256: suffix.repeat(64) }
  ],
  payloadSha256: suffix.repeat(64),
  inputBytes: 100,
  pageCount: 1,
  maximumOutputTokens: 16000,
  processorVersion: "synthetic-v1"
};
const budget = {
  currency: "USD" as const,
  tariffVersion: "synthetic-v1",
  maximumCostMicrounits: 10,
  tenantDailyLimitMicrounits: 20,
  globalDailyLimitMicrounits: 30
};
const ledger = createSyntheticFileHostedCallLedger({ directory, confirmation: "synthetic-only" });
const key = {
  condominiumId: tenant,
  requestHash: hostedDocumentRequestHash(request),
  policyRevision
};
try {
  if (mode !== "execute") {
    const reserved = await ledger.reserve(key, budget);
    if (mode === "stop-after-dispatch" && reserved.status === "reserved") {
      await ledger.dispatch(key, reserved.owner);
      // Encerra depois da gravação, sem resultado remoto: retomar não autoriza outro envio.
      process.stdout.write(JSON.stringify({ status: "stopped" }));
      process.exit(0);
    }
    process.stdout.write(JSON.stringify(reserved));
  } else {
    const executor = createHostedDocumentExecutor({
      authorize: async (input) => ({
        allowed: true,
        requestHash: hostedDocumentRequestHash(input),
        policyRevision
      }),
      callControl: { ledger, budget: () => budget }
    });
    const value = await executor.execute(request, async () => {
      await appendFile(join(directory, "synthetic-provider-count"), "1\n", { flush: true });
      return { text: "Resultado OCR integral inteiramente sintético." };
    });
    process.stdout.write(JSON.stringify({ status: "completed", value }));
  }
} catch (error) {
  process.stdout.write(
    JSON.stringify({
      status: "blocked",
      code: error && typeof error === "object" && "code" in error ? error.code : "failed"
    })
  );
}
