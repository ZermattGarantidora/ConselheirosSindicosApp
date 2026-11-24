import assert from "node:assert/strict";
import { randomUUID } from "node:crypto";
import { mkdir, readFile, writeFile } from "node:fs/promises";
import { resolve } from "node:path";
import { pathToFileURL } from "node:url";
import { createServer } from "vite";
import react from "@vitejs/plugin-react";
import { createApi } from "../apps/api/app/create-api.js";
import { createDevelopmentIdentityRepository } from "../apps/api/identity/development-identity-repository.js";
import { extractPdfTextByPage } from "../apps/api/documents/extract-pdf-text.js";
import {
  syntheticAuthoringDocument,
  syntheticAuthoringText,
  syntheticDocumentAuthoringModel,
  syntheticDocumentPlan
} from "../tests/fixtures/document-authoring.js";
import type {
  DocumentAuthoringRequest,
  DocumentAuthoringSource
} from "../apps/shared/document-proposal.js";
const modulePath = process.env.ALVITRA_TEST_PLAYWRIGHT_MODULE;
if (!modulePath)
  throw new Error("Informe Playwright já instalado; este ensaio não instala dependências.");
const { chromium } = await import(pathToFileURL(resolve(modulePath)).href);
const output = resolve(".local/general-authoring/browser");
await mkdir(output, { recursive: true });
let writing = 0,
  review = 0;
const api = createApi({
  membershipRepository: createDevelopmentIdentityRepository(),
  documentCatalogRepository: {
    listAuthorized: async (context) => [syntheticAuthoringDocument(context)]
  },
  documentSourceReader: {
    getAuthorizedPage: async () => ({
      documentId: "synthetic-document",
      documentVersionId: "synthetic-version",
      title: "FICTÍCIO. Regimento",
      page: 1,
      content: syntheticAuthoringText
    })
  },
  documentAuthoringModel: syntheticDocumentAuthoringModel((input) => {
    if (input.phase === "write") {
      writing++;
      const data = input.data as {
        request: DocumentAuthoringRequest;
        sources: DocumentAuthoringSource[];
      };
      const plan = syntheticDocumentPlan(data.request, data.sources);
      // A citação de apoio aparece só no parágrafo; o antes usa outro trecho.
      return {
        ...plan,
        changes: plan.changes.map((c) => ({
          ...c,
          before: {
            sourceId: data.sources[0]!.id,
            startOffset: 0,
            endOffset: 9,
            quote: "FICTÍCIO."
          },
          references: []
        }))
      };
    } else review++;
  })
});
const chatId = randomUUID(),
  headers = { "x-development-user-id": "sindico-demo" };
assert.equal(
  (
    await api.inject({
      method: "POST",
      url: "/v1/condominiums/alameda/chats",
      headers,
      payload: { id: chatId, title: "FICTÍCIO" }
    })
  ).statusCode,
  201
);
const workspace = process.cwd().replaceAll("\\", "/");
await writeFile(
  resolve(output, "index.html"),
  '<!doctype html><html lang="pt-BR"><head><meta charset="UTF-8"><meta name="viewport" content="width=device-width,initial-scale=1"></head><body><div id="root"></div><script type="module" src="/entry.tsx"></script></body></html>'
);
await writeFile(
  resolve(output, "entry.tsx"),
  `import React from'react';import{createRoot}from'react-dom/client';import{DocumentDraftComposer}from'/@fs/${workspace}/apps/web/DocumentDraftComposer.tsx';import'/@fs/${workspace}/apps/web/styles.css';createRoot(document.getElementById('root')).render(<main style={{maxWidth:'900px',margin:'0 auto',padding:'16px'}}><h1>Ensaio documental sintético</h1><DocumentDraftComposer condominiumId="alameda" chatId=${JSON.stringify(chatId)} headers={{'x-development-user-id':'sindico-demo'}}/></main>);`
);
let vite: Awaited<ReturnType<typeof createServer>> | undefined,
  browser: Awaited<ReturnType<typeof chromium.launch>> | undefined,
  diagnose: (() => Promise<void>) | undefined;
try {
  const address = await api.listen({ host: "127.0.0.1", port: 0 });
  vite = await createServer({
    configFile: false,
    envDir: false,
    root: output,
    plugins: [react()],
    cacheDir: resolve(output, "vite-cache"),
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
    }),
    external: string[] = [],
    errors: string[] = [];
  await context.route(
    "**/*",
    async (route: {
      request(): { url(): string };
      abort(): Promise<void>;
      continue(): Promise<void>;
    }) => {
      const url = new URL(route.request().url());
      if (
        !["127.0.0.1", "localhost"].includes(url.hostname) &&
        !["blob:", "data:"].includes(url.protocol)
      ) {
        external.push(url.origin);
        await route.abort();
      } else await route.continue();
    }
  );
  const page = await context.newPage();
  page.on("pageerror", (e: Error) => errors.push(e.message));
  diagnose = async () => {
    await page.screenshot({ path: resolve(output, "failure.png"), fullPage: true });
    await writeFile(resolve(output, "failure.html"), await page.content());
  };
  await page.goto(target);
  await page.getByRole("button", { name: "Documentos em preparação", exact: true }).click();
  await page
    .getByLabel("Título da proposta", { exact: true })
    .fill("FICTÍCIO. Comunicado revisado");
  await page.getByRole("combobox", { name: /Operação proposta/u }).selectOption("revise");
  await page
    .getByLabel("O que deseja preparar?", { exact: true })
    .fill("Reorganize o comunicado com fundamento no regimento.");
  await page.getByRole("checkbox", { name: /FICTÍCIO. Regimento/u }).check();
  assert.equal(writing, 0);
  assert.equal(review, 0);
  let dropResponse = true;
  const attempts: string[] = [];
  await page.route(
    "**/document-proposals/*",
    async (route: {
      request(): { method(): string; url(): string };
      fetch(): Promise<unknown>;
      abort(): Promise<void>;
      continue(): Promise<void>;
    }) => {
      const req = route.request();
      if (req.method() === "POST" && !req.url().endsWith("/decide")) {
        attempts.push(req.url());
        if (dropResponse) {
          dropResponse = false;
          await route.fetch();
          await route.abort();
          return;
        }
      }
      await route.continue();
    }
  );
  const prepare = page.getByRole("button", { name: "Preparar proposta fundamentada", exact: true });
  await prepare.click();
  await page.getByRole("alert").waitFor();
  assert.equal(writing, 1);
  assert.equal(review, 1);
  await prepare.click();
  await page.getByRole("article", { name: "Proposta documental para conferência" }).waitFor();
  assert.equal(
    await page.locator("blockquote").filter({ hasText: syntheticAuthoringText }).count(),
    1
  );
  assert.equal(attempts.length, 2);
  assert.equal(attempts[0], attempts[1]);
  assert.equal(writing, 1);
  assert.equal(review, 1);
  await page.getByText("Conferir cobertura e fontes completas", { exact: true }).click();
  await page.screenshot({ path: resolve(output, "proposal-desktop.png"), fullPage: true });
  await page.setViewportSize({ width: 390, height: 844 });
  await page.screenshot({ path: resolve(output, "proposal-mobile.png"), fullPage: true });
  assert.equal(
    await page.evaluate(() => document.documentElement.scrollWidth > window.innerWidth),
    false
  );
  await page.setViewportSize({ width: 1280, height: 900 });
  await page.getByRole("button", { name: "Aceitar e conferir rascunho", exact: true }).click();
  const text = page.getByRole("textbox", { name: /^Texto do documento/u });
  await page.waitForFunction(() =>
    Array.from(document.querySelectorAll("textarea")).some((e) =>
      e.value.includes("Proposta para conferência:")
    )
  );
  assert((await text.inputValue()).includes("24 horas"));
  assert.equal(
    await page.getByRole("button", { name: "Baixar PDF confirmado", exact: true }).count(),
    0
  );
  await text.fill((await text.inputValue()) + "\nFICTÍCIO. Conferir antes de usar.");
  await page.getByRole("button", { name: "Salvar texto para revisão", exact: true }).click();
  await page.getByLabel("Revisei esta versão e suas pendências.", { exact: true }).check();
  await page.getByRole("button", { name: "Confirmar esta versão para PDF", exact: true }).click();
  const download = page.waitForEvent("download");
  await page.getByRole("button", { name: "Baixar PDF confirmado", exact: true }).click();
  await (await download).saveAs(resolve(output, "documento-revisado.pdf"));
  const pdf = (
    await extractPdfTextByPage(await readFile(resolve(output, "documento-revisado.pdf")))
  )
    .map((p) => p.extractedText)
    .join(" ");
  assert(pdf.includes("Conferir antes de usar"));
  assert(pdf.includes("Origem: proposta documental"));
  await page.reload();
  await page.getByRole("button", { name: "Documentos em preparação", exact: true }).click();
  await page.getByText("Propostas desta conversa", { exact: true }).click();
  await page
    .getByRole("button", { name: "FICTÍCIO. Comunicado revisado · aceita", exact: true })
    .click();
  await page.getByRole("button", { name: "Reabrir rascunho aceito", exact: true }).click();
  await page.getByRole("button", { name: "Baixar PDF confirmado", exact: true }).waitFor();
  assert((await text.inputValue()).includes("Conferir antes de usar"));
  assert.equal(writing, 1);
  assert.equal(review, 1);
  assert.equal(external.length, 0);
  assert.equal(errors.length, 0);
  await writeFile(
    resolve(output, "result.json"),
    JSON.stringify(
      {
        syntheticOnly: true,
        realProviderCalls: 0,
        simulatedWritingCalls: writing,
        simulatedReviewCalls: review,
        selectionDidNotGenerate: true,
        lostResponseRecoveredWithoutNewCall: true,
        acceptedDraftRequiredSeparateConfirmation: true,
        confirmedHumanEditRecovered: true,
        mobileOverflow: false,
        externalRequests: external,
        pageErrors: errors
      },
      null,
      2
    )
  );
  process.stdout.write(
    "Navegador: proposta, fundamentos, resposta perdida, edição, confirmação e PDF aprovados; zero chamada externa.\n"
  );
} catch (error) {
  await diagnose?.().catch(() => {});
  throw error;
} finally {
  await browser?.close();
  await vite?.close();
  await api.close();
}
