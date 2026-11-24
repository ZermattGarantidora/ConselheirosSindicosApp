import assert from "node:assert/strict";
import { execFileSync } from "node:child_process";
import { createHash, randomUUID } from "node:crypto";
import { mkdir, readFile, writeFile } from "node:fs/promises";
import { join, resolve } from "node:path";
import { setTimeout as delay } from "node:timers/promises";
import { createApi } from "../../apps/api/app/create-api.js";
import { createDevelopmentIdentityRepository } from "../../apps/api/identity/development-identity-repository.js";
import { createDevelopmentDocumentMemory } from "../../apps/api/documents/development-document-memory.js";
import { createDevelopmentDocumentUploadRepository } from "../../apps/api/documents/development-document-upload-repository.js";
import { createLocalPrivateDocumentStorage } from "../../apps/api/documents/private-document-storage.js";
import { createInMemoryConversationStore } from "../../apps/api/answers/conversation-store.js";
import { createInMemoryChatRepository } from "../../apps/api/chats/chat-repository.js";
import { createLocalCodexAuthoringModels } from "../../apps/api/authoring/codex-authoring-model.js";
import {
  createLocalFinancialReportModel,
  type FinancialReportModel
} from "../../apps/api/authoring/financial-report.js";
import { runCodexProcess } from "../../apps/api/answers/codex-process.js";
import { authoringHash } from "../../apps/api/authoring/document-authoring-contract.js";
import { managerContext } from "../../tests/unit/answer-fixtures.js";
import { createLedger, createBook } from "./corpus.js";
import { buildOracle } from "./oracle.js";
import { verifyAgainstOracle } from "./verify.js";
import type { UploadedDocumentRecord } from "../../apps/api/documents/upload-document.js";
import type { RegisteredDocument } from "../../apps/api/documents/document-catalog.js";
import type { analyzeFinancialDossier } from "../../apps/api/analysis/financial-dossier.js";
import type { DocumentDraft } from "../../apps/shared/document-draft.js";
import { proveHumanAdjustments } from "./human-adjustments.js";

const args = process.argv.slice(2);
const real = args.includes("--codex");
if (real && !args.includes("--confirm-synthetic-local"))
  throw new Error("Codex exige --confirm-synthetic-local; sem API paga.");
const runId =
  args.find((a) => a.startsWith("--run="))?.slice(6) ??
  (real ? "codex-20261118" : "offline-20261118");
assert.match(runId, /^[A-Za-z0-9_-]{1,70}$/u);
const directory = resolve(".local/financial-300", runId),
  output = resolve("output/pdf", `financial-300-${runId}`);
await mkdir(join(directory, "receipts"), { recursive: true });
await mkdir(output, { recursive: true });
const json = async (file: string, value: unknown) =>
  writeFile(file, JSON.stringify(value, null, 2));
const saved = async (file: string) => {
  try {
    return JSON.parse(await readFile(file, "utf8"));
  } catch (error) {
    if ((error as NodeJS.ErrnoException).code === "ENOENT") return undefined;
    throw error;
  }
};
const ledger = createLedger(),
  gold = buildOracle(ledger),
  book = createBook(ledger);
await json(join(directory, "ledger.json"), ledger);
await json(join(directory, "oracle.json"), gold); // Fechado antes da extração e de qualquer inferência.
await json(join(directory, "pages.json"), book);
const oracleHash = authoringHash(gold),
  sourcePdf = join(output, "caderno-financeiro-300-paginas.pdf");
const python = args.find((a) => a.startsWith("--python="))?.slice(9);
assert.ok(python, "Informe --python=<executável local com reportlab>; sem instalações.");
execFileSync(
  python,
  [resolve("evals/financial-dossier/render.py"), join(directory, "pages.json"), sourcePdf],
  { windowsHide: true }
);
const bytes = await readFile(sourcePdf),
  originalHash = createHash("sha256").update(bytes).digest("hex");
let calls = 0,
  reused = 0;
const codex = createLocalCodexAuthoringModels({
  confirmation: "synthetic-local-only",
  timeoutMs: 120000,
  async run(request) {
    assert.ok(real, "Modelo proibido no modo offline.");
    const index = request.args.indexOf("--output-schema"),
      schema = await readFile(request.args[index + 1]!, "utf8");
    const hash = authoringHash([
      request.args.filter((_, i) => i !== index + 1),
      schema,
      request.input
    ]);
    const prefix = join(directory, "receipts", hash),
      previous = await saved(`${prefix}.result.json`);
    if (previous) {
      reused++;
      return previous.stdout as string;
    }
    await writeFile(
      `${prefix}.dispatch.json`,
      JSON.stringify({ hash, startedAt: new Date().toISOString(), externalApiBilling: false }),
      { flag: "wx" }
    );
    calls++;
    console.log(`Codex local: despacho ${calls}`);
    const started = Date.now(),
      stdout = await runCodexProcess(request);
    await json(`${prefix}.result.json`, { hash, stdout, latencyMs: Date.now() - started });
    return stdout;
  }
});
const offlineModel: FinancialReportModel = {
  key: "offline-structure-only",
  async complete(phase, data) {
    if (phase === "write")
      return {
        title: "FICTÍCIO - Conferência financeira",
        overview: "Conferência do caderno integral, com diferenças e lacunas explícitas.",
        priorities: (data.priorityCheckIds as string[]).map((checkId) => ({
          checkId,
          text: (data.checks as { id: string; detail: string }[]).find((c) => c.id === checkId)!
            .detail
        })),
        conclusion: "Confira as evidências e as pendências antes de validar decisões financeiras."
      };
    return {
      accepted: true,
      snapshotHash: data.snapshotHash,
      planHash: data.planHash,
      checks: (data.checks as { id: string }[]).map((c) => ({ id: c.id, supported: true })),
      issues: []
    };
  }
};
const memory = createDevelopmentDocumentMemory(),
  repository = createDevelopmentDocumentUploadRepository();
let record: UploadedDocumentRecord | undefined;
const old = (await saved(join(directory, "upload.json"))) as
  { record: UploadedDocumentRecord; catalog: RegisteredDocument[] } | undefined;
const catalog = old ? createDevelopmentDocumentUploadRepository(old.catalog) : repository;
const uploads = {
  async recordUploaded(r: UploadedDocumentRecord) {
    record = r;
    await catalog.recordUploaded(r);
  }
};
if (old) {
  record = old.record;
  await memory.indexUploaded({ record, content: bytes, validityConfirmed: true });
}
const store = createInMemoryConversationStore(),
  chats = createInMemoryChatRepository();
const underlying = real ? createLocalFinancialReportModel(codex) : offlineModel;
const loggedModel: FinancialReportModel = {
  key: underlying.key,
  async complete(phase, data) {
    await json(join(directory, `${phase}-input.json`), data);
    const value = await underlying.complete(phase, data);
    await json(join(directory, `${phase}-output.json`), value);
    return value;
  }
};
let changeLastPage = false;
const guardedReader = {
  async readAuthorized(...input: Parameters<typeof memory.analysisReader.readAuthorized>) {
    const documents = await memory.analysisReader.readAuthorized(...input);
    return changeLastPage
      ? documents.map((d) => ({
          ...d,
          pages: d.pages.map((p) =>
            p.pageNumber === 300
              ? { ...p, extractedText: p.extractedText + "\nAlteração sintética da origem." }
              : p
          )
        }))
      : documents;
  }
};
const baseOptions = {
  membershipRepository: createDevelopmentIdentityRepository(),
  conversationStore: store,
  chatRepository: chats,
  documentCatalogRepository: catalog,
  documentUploadRepository: uploads,
  documentStorage: createLocalPrivateDocumentStorage(join(directory, "private")),
  developmentDocumentMemory: memory,
  documentSourceReader: memory.createSourceReader(catalog),
  documentAnalysisReader: guardedReader,
  financialReportModel: loggedModel
};
let app = createApi(baseOptions);
const headers = { "x-development-user-id": "sindico-demo" };
const chatId = randomUUID(),
  id = randomUUID(),
  base = `/v1/condominiums/alameda/chats/${chatId}`,
  draftPath = `${base}/document-drafts/${id}`;
const started = Date.now();
try {
  assert.equal(
    (
      await app.inject({
        method: "POST",
        url: "/v1/condominiums/alameda/chats",
        headers,
        payload: { id: chatId, title: "FICTÍCIO - prova financeira 300 páginas" }
      })
    ).statusCode,
    201
  );
  if (!old) {
    const upload = await app.inject({
      method: "POST",
      url: "/v1/condominiums/alameda/documents",
      headers: {
        ...headers,
        "content-type": "application/pdf",
        "x-document-title": encodeURIComponent(book.title),
        "x-document-type": "other",
        "x-document-validity-confirmed": "true"
      },
      payload: bytes
    });
    assert.equal(upload.statusCode, 202, upload.body);
    assert.ok(record);
    const deadline = Date.now() + 60000;
    while (Date.now() < deadline) {
      const rows = await catalog.listAuthorized(managerContext);
      if (rows[0]?.processingStatus === "ready") break;
      await delay(100);
    }
    await json(join(directory, "upload.json"), {
      record,
      catalog: await catalog.listAuthorized(managerContext)
    });
  }
  assert.ok(record);
  const sources = await memory.analysisReader.readAuthorized(managerContext, [
    record.documentVersionId
  ]);
  assert.equal(sources[0]?.pages.length, 300);
  for (const page of book.pages)
    assert.equal(
      sources[0]!.pages[page.page - 1]!.extractedText,
      page.text,
      `Página ${page.page} divergente.`
    );
  await json(join(directory, "extracted.json"), sources);
  console.log("300 páginas extraídas integralmente. Solicitando relatório.");
  const request = { documentVersionIds: [record.documentVersionId], currentDocumentKey: "BAL-OUT" };
  const response = await app.inject({
    method: "POST",
    url: `${base}/financial-reports/${id}`,
    headers,
    payload: request
  });
  await writeFile(join(directory, "response.json"), response.body);
  assert.equal(response.statusCode, 200, response.body.slice(0, 1000));
  const result = response.json() as {
    draft: DocumentDraft;
    analysis: ReturnType<typeof analyzeFinancialDossier>;
    synthesis: unknown;
  };
  const verified = verifyAgainstOracle(result.analysis, gold);
  assert.equal(authoringHash(gold), oracleHash);
  await json(join(directory, "coverage.json"), result.analysis.inventory);
  await json(join(directory, "analysis.json"), result.analysis);
  await writeFile(join(output, "relatorio-alvitra.txt"), result.draft.text);
  const totalCalls = calls;
  assert.equal(
    (
      await app.inject({
        method: "POST",
        url: `${base}/financial-reports/${id}`,
        headers,
        payload: request
      })
    ).statusCode,
    200
  );
  assert.equal(calls, totalCalls, "Retomada não pode gerar inferência.");
  assert.equal(
    (
      await app.inject({
        method: "GET",
        url: `${draftPath}/pdf?hash=${result.draft.hash}`,
        headers
      })
    ).statusCode,
    409
  );
  const decision = await app.inject({
    method: "POST",
    url: `${draftPath}/decide`,
    headers,
    payload: {
      expectedEvent: result.draft.event,
      hash: result.draft.hash,
      confirm: true,
      reviewed: true
    }
  });
  assert.equal(decision.statusCode, 200, decision.body); // Somente confirmação automatizada do teste, não homologação humana.
  await app.close();
  app = createApi(baseOptions);
  const recovered = await app.inject({ method: "GET", url: draftPath, headers });
  assert.equal(recovered.statusCode, 200, recovered.body);
  assert.equal(recovered.json().draft.status, "confirmed");
  const pdf = await app.inject({
    method: "GET",
    url: `${draftPath}/pdf?hash=${result.draft.hash}`,
    headers
  });
  assert.equal(pdf.statusCode, 200, pdf.body.slice(0, 200));
  await writeFile(join(output, "relatorio-alvitra.pdf"), pdf.rawPayload);
  const original = await app.inject({
    method: "GET",
    url: `/v1/condominiums/alameda/documents/${record.documentVersionId}/file`,
    headers
  });
  assert.equal(createHash("sha256").update(original.rawPayload).digest("hex"), originalHash);
  assert.equal((await app.inject({ method: "GET", url: draftPath })).statusCode, 401);
  assert.equal(
    (await app.inject({ method: "GET", url: draftPath.replace("/alameda/", "/bosque/"), headers }))
      .statusCode,
    404
  );
  changeLastPage = true;
  assert.equal((await app.inject({ method: "GET", url: draftPath, headers })).statusCode, 409);
  assert.equal(
    (
      await app.inject({
        method: "GET",
        url: `${draftPath}/pdf?hash=${result.draft.hash}`,
        headers
      })
    ).statusCode,
    409
  );
  assert.equal(
    (
      await app.inject({
        method: "POST",
        url: `${base}/financial-reports/${id}`,
        headers,
        payload: request
      })
    ).statusCode,
    409
  );
  assert.equal(calls, totalCalls, "Mudança na página 300 não pode disparar o modelo.");
  changeLastPage = false;
  const humanAdjustments = real ? await proveHumanAdjustments(codex, directory) : [];
  const receipt = {
    ...verified,
    runId,
    mode: real
      ? "Codex contratado via CLI/ChatGPT"
      : "offline: apenas cálculos e contratos; sem avaliação de modelo",
    oracleHash,
    originalHash,
    generatedPdfHash: createHash("sha256").update(pdf.rawPayload).digest("hex"),
    calls,
    reused,
    latencyMs: Date.now() - started,
    humanAdjustments: humanAdjustments.map((r) => ({
      id: r.id,
      passed: r.passed,
      humanRevalidated: r.humanRevalidated
    })),
    operationalLimitsActive: false,
    externalApiBilling: false,
    humanApproved: false,
    productionAuthorized: false,
    sourceChangeOnPage300Blocks: true,
    persistence:
      "API reconstruída usando os mesmos repositórios em RAM; durabilidade PostgreSQL exige gate próprio",
    sourcePdf,
    reportPdf: join(output, "relatorio-alvitra.pdf")
  };
  await json(join(directory, "result.json"), receipt);
  await writeFile(
    join(directory, "junit.xml"),
    '<testsuite name="financial-300" tests="5" failures="0">' +
      [
        "all-300-pages-exact",
        "oracle-all-invoices-and-ten-checks",
        "draft-confirmation-and-api-recovery",
        "source-page-300-change-blocks",
        "private-original-unchanged"
      ]
        .map((name) => `<testcase name="${name}"/>`)
        .join("") +
      "</testsuite>"
  );
  console.log(JSON.stringify(receipt));
} finally {
  await app.close();
}
