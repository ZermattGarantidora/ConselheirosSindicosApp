import assert from "node:assert/strict";
import { randomUUID } from "node:crypto";
import { mkdir, readFile, writeFile } from "node:fs/promises";
import { resolve } from "node:path";
import { pathToFileURL } from "node:url";
import { createServer } from "vite";
import react from "@vitejs/plugin-react";
import { createApi } from "../apps/api/app/create-api.js";
import { createDevelopmentIdentityRepository } from "../apps/api/identity/development-identity-repository.js";
import { createDevelopmentDocumentMemory } from "../apps/api/documents/development-document-memory.js";
import { createDevelopmentDocumentUploadRepository } from "../apps/api/documents/development-document-upload-repository.js";
import { createLocalPrivateDocumentStorage } from "../apps/api/documents/private-document-storage.js";
import { financialCorpusPdf } from "../tests/fixtures/financial-corpus.js";
import { syntheticFinancialReportModel } from "../tests/fixtures/financial-report-model.js";
import { extractPdfTextByPage } from "../apps/api/documents/extract-pdf-text.js";
const module = process.env.ALVITRA_TEST_PLAYWRIGHT_MODULE;
if (!module) throw new Error("Informe Playwright local já instalado; sem instalação automática.");
const { chromium } = await import(pathToFileURL(resolve(module)).href),
  directory = resolve(".local/financial-flow/20261118/browser");
await mkdir(directory, { recursive: true });
const memory = createDevelopmentDocumentMemory(),
  catalog = createDevelopmentDocumentUploadRepository(),
  headers = { "x-development-user-id": "sindico-demo" };
let writing = 0,
  review = 0;
const api = createApi({
  membershipRepository: createDevelopmentIdentityRepository(),
  documentCatalogRepository: catalog,
  documentUploadRepository: catalog,
  documentStorage: createLocalPrivateDocumentStorage(resolve(directory, "private")),
  developmentDocumentMemory: memory,
  documentSourceReader: memory.createSourceReader(catalog),
  financialReportModel: syntheticFinancialReportModel((phase) =>
    phase === "write" ? writing++ : review++
  )
});
let vite: Awaited<ReturnType<typeof createServer>> | undefined,
  browser: Awaited<ReturnType<typeof chromium.launch>> | undefined;
try {
  const chat = randomUUID(),
    other = randomUUID();
  for (const id of [chat, other])
    assert.equal(
      (
        await api.inject({
          method: "POST",
          url: "/v1/condominiums/alameda/chats",
          headers,
          payload: { id, title: "FICTÍCIO financeiro" }
        })
      ).statusCode,
      201
    );
  const corpus = financialCorpusPdf(),
    upload = await api.inject({
      method: "POST",
      url: "/v1/condominiums/alameda/documents",
      headers: {
        ...headers,
        "content-type": "application/pdf",
        "x-document-title": encodeURIComponent(corpus.book.title),
        "x-document-type": "other",
        "x-document-validity-confirmed": "true"
      },
      payload: corpus.pdf
    });
  assert.equal(upload.statusCode, 202, upload.body);
  const deadline = Date.now() + 60000;
  while (Date.now() < deadline) {
    const rows = (
      await api.inject({ method: "GET", url: "/v1/condominiums/alameda/documents", headers })
    ).json().documents;
    if (rows.some((r: { processingStatus: string }) => r.processingStatus === "ready")) break;
    await new Promise((r) => setTimeout(r, 50));
  }
  const workspace = process.cwd().replaceAll("\\", "/");
  await writeFile(
    resolve(directory, "index.html"),
    '<!doctype html><html lang="pt-BR"><head><meta charset="UTF-8"><meta name="viewport" content="width=device-width,initial-scale=1"></head><body><div id="root"></div><script type="module" src="/entry.tsx"></script></body></html>'
  );
  await writeFile(
    resolve(directory, "entry.tsx"),
    `import React,{useState}from'react';import{createRoot}from'react-dom/client';import{DocumentDraftComposer}from'/@fs/${workspace}/apps/web/DocumentDraftComposer.tsx';import'/@fs/${workspace}/apps/web/styles.css';function Harness(){const[id,setId]=useState(${JSON.stringify(chat)});return <main style={{maxWidth:'900px',margin:'auto',padding:16}}><h1>Chat sintético financeiro</h1><button onClick={()=>setId(${JSON.stringify(other)})}>Outra conversa de teste</button><DocumentDraftComposer key={id} condominiumId="alameda" chatId={id} headers={{'x-development-user-id':'sindico-demo'}}/></main>}createRoot(document.getElementById('root')).render(<Harness/>);`
  );
  const address = await api.listen({ host: "127.0.0.1", port: 0 });
  vite = await createServer({
    configFile: false,
    envDir: false,
    root: directory,
    plugins: [react()],
    cacheDir: resolve(directory, "vite-cache"),
    server: {
      host: "127.0.0.1",
      port: 0,
      fs: { allow: [process.cwd()] },
      proxy: { "/v1": address }
    }
  });
  await vite.listen();
  const target = vite.resolvedUrls?.local[0];
  assert(target);
  browser = await chromium.launch({
    headless: true,
    ...(process.env.ALVITRA_TEST_CHROMIUM_EXECUTABLE
      ? { executablePath: process.env.ALVITRA_TEST_CHROMIUM_EXECUTABLE }
      : {})
  });
  const context = await browser.newContext({
    viewport: { width: 1280, height: 900 },
    acceptDownloads: true
  });
  const external: string[] = [],
    errors: string[] = [];
  await context.route(
    "**/*",
    async (route: {
      request(): { url(): string };
      abort(): Promise<void>;
      continue(): Promise<void>;
    }) => {
      const url = new URL(route.request().url());
      if (!["127.0.0.1", "localhost"].includes(url.hostname)) {
        external.push(url.origin);
        await route.abort();
      } else await route.continue();
    }
  );
  const page = await context.newPage();
  page.on("pageerror", (e: Error) => errors.push(e.message));
  await page.goto(target);
  await page.getByRole("button", { name: "Documentos em preparação", exact: true }).click();
  await page.getByRole("button", { name: "Relatório financeiro", exact: true }).click();
  await page.getByRole("checkbox", { name: corpus.book.title, exact: true }).check();
  await page
    .getByRole("combobox", { name: "Balancete de referência", exact: true })
    .selectOption("BAL-OUT");
  assert.equal(writing, 0);
  assert.equal(review, 0);
  let drop = true;
  const attempts: string[] = [];
  await page.route(
    "**/financial-reports/*",
    async (route: {
      request(): { method(): string; url(): string };
      fetch(): Promise<unknown>;
      abort(): Promise<void>;
      continue(): Promise<void>;
    }) => {
      if (route.request().method() === "POST") {
        attempts.push(route.request().url());
        if (drop) {
          drop = false;
          await route.fetch();
          await route.abort();
          return;
        }
      }
      await route.continue();
    }
  );
  const prepare = page.getByRole("button", { name: "Preparar relatório financeiro", exact: true });
  await prepare.click();
  await page.getByRole("alert").waitFor();
  assert.equal(writing, 1);
  assert.equal(review, 1);
  await prepare.click();
  const text = page.getByRole("textbox", { name: /^Texto do documento/u });
  await page.waitForFunction(() =>
    Array.from(document.querySelectorAll("textarea")).some((e) =>
      e.value.includes("suporte parcial de R$ 9.382,80")
    )
  );
  assert.equal(attempts[0], attempts[1]);
  assert.equal(writing, 1);
  assert.equal(review, 1);
  assert((await text.inputValue()).includes("faltam R$ 305,95"));
  assert.equal(
    await page.getByRole("button", { name: "Baixar PDF confirmado", exact: true }).count(),
    0
  );
  await text.fill((await text.inputValue()) + "\nEdição humana financeira preservada.");
  await page.getByRole("button", { name: "Salvar texto para revisão", exact: true }).click();
  await page.getByLabel("Revisei esta versão e suas pendências.", { exact: true }).check();
  await page.getByRole("button", { name: "Confirmar esta versão para PDF", exact: true }).click();
  const download = page.waitForEvent("download");
  await page.getByRole("button", { name: "Baixar PDF confirmado", exact: true }).click();
  await (await download).saveAs(resolve(directory, "relatorio-financeiro.pdf"));
  const pdf = (
    await extractPdfTextByPage(await readFile(resolve(directory, "relatorio-financeiro.pdf")))
  )
    .map((p) => p.extractedText)
    .join(" ");
  assert(pdf.includes("Edição humana financeira preservada."));
  assert(pdf.includes("305,95"));
  await page.screenshot({ path: resolve(directory, "desktop.png"), fullPage: true });
  await page.setViewportSize({ width: 390, height: 844 });
  assert.equal(
    await page.evaluate(() => document.documentElement.scrollWidth > window.innerWidth),
    false
  );
  await page.screenshot({ path: resolve(directory, "mobile.png"), fullPage: true });
  await page.reload();
  await page.getByRole("button", { name: "Documentos em preparação", exact: true }).click();
  await page.getByRole("button", { name: "Relatório financeiro", exact: true }).click();
  await page.getByRole("button", { name: "Recuperar relatório financeiro 1", exact: true }).click();
  await page.getByRole("button", { name: "Baixar PDF confirmado", exact: true }).waitFor();
  assert((await text.inputValue()).includes("Edição humana financeira preservada."));
  assert.equal(writing, 1);
  assert.equal(review, 1);
  await page.getByRole("button", { name: "Outra conversa de teste", exact: true }).click();
  await page.getByRole("button", { name: "Documentos em preparação", exact: true }).click();
  await page.getByRole("button", { name: "Relatório financeiro", exact: true }).click();
  assert.equal(
    await page
      .getByRole("button", { name: "Recuperar relatório financeiro 1", exact: true })
      .count(),
    0
  );
  assert.equal(
    await page.getByRole("button", { name: "Baixar PDF confirmado", exact: true }).count(),
    0
  );
  assert.equal(external.length, 0);
  assert.equal(errors.length, 0);
  await writeFile(
    resolve(directory, "result.json"),
    JSON.stringify(
      {
        passed: true,
        pages: 300,
        providerCalls: 0,
        writing,
        review,
        selectionDidNotGenerate: true,
        lostResponseRecoveredWithoutCall: true,
        editRecovered: true,
        confirmationRequired: true,
        chatIsolated: true,
        mobileOverflow: false,
        external,
        errors
      },
      null,
      2
    )
  );
  console.log(
    "Navegador financeiro: 300 páginas, suporte parcial, recuperação, edição, confirmação, PDF e isolamento aprovados; sem provedor externo."
  );
} finally {
  await browser?.close();
  await vite?.close();
  await api.close();
}
