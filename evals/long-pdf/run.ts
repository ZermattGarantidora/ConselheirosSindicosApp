import { execFile } from "node:child_process";
import { mkdir, mkdtemp, readFile, rm, writeFile } from "node:fs/promises";
import { basename, dirname, join, resolve } from "node:path";
import { tmpdir } from "node:os";
import { promisify } from "node:util";
import { fileURLToPath } from "node:url";
import {
  createLongPdfDocument,
  renderFullPagePdf
} from "../../tests/fixtures/full-page-documents.js";

// Generate outside the measured process: production runs compiled Node, without tsx or fixture rendering.
const directory = await mkdtemp(join(tmpdir(), "alvitra-pdf-benchmark-"));
const reportPath = "reports/long-pdf/latest.json";
await mkdir("reports/long-pdf", { recursive: true });
await writeFile(reportPath, `${JSON.stringify({ status: "running", passed: false })}\n`);
try {
  const document = createLongPdfDocument();
  await writeFile(join(directory, "document.pdf"), renderFullPagePdf(document));
  await writeFile(join(directory, "expected.json"), JSON.stringify(document));
  const script = fileURLToPath(new URL("./benchmark.mjs", import.meta.url));
  const { stdout } = await promisify(execFile)(process.execPath, [script, directory], {
    timeout: 120_000,
    maxBuffer: 1024 * 1024
  });
  console.log(stdout.trim());
} catch {
  const report = JSON.parse(await readFile(reportPath, "utf8")) as { status?: string };
  if (report.status === "running") {
    await writeFile(
      reportPath,
      `${JSON.stringify({ status: "failed", passed: false, reason: "execution_failed" })}\n`
    );
  }
  console.error(
    "Benchmark não aprovado. Consulte reports/long-pdf/latest.json; falhas de execução não aprovam o gate."
  );
  process.exitCode = 1;
} finally {
  if (
    dirname(resolve(directory)) !== resolve(tmpdir()) ||
    !basename(directory).startsWith("alvitra-pdf-benchmark-")
  ) {
    throw new Error("Diretório do benchmark fora da raiz temporária esperada.");
  }
  await rm(directory, { recursive: true, force: true });
}
