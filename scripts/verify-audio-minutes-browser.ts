import assert from "node:assert/strict";
import { createHash, randomUUID } from "node:crypto";
import { mkdir, readFile, writeFile } from "node:fs/promises";
import { resolve } from "node:path";
import { pathToFileURL } from "node:url";
import { createServer } from "vite";
import react from "@vitejs/plugin-react";
import { createApi } from "../apps/api/app/create-api.js";
import { createDevelopmentIdentityRepository } from "../apps/api/identity/development-identity-repository.js";
import { syntheticWav } from "../tests/fixtures/synthetic-authoring.js";
import {
  simpleMinutesSegments,
  simpleMinutesPlan,
  syntheticMinutesModel
} from "../tests/fixtures/semantic-minutes.js";
import { extractPdfTextByPage } from "../apps/api/documents/extract-pdf-text.js";
import type {
  PrivateDocumentReader,
  PrivateDocumentStorage
} from "../apps/api/documents/private-document-storage.js";

const modulePath = process.env.ALVITRA_TEST_PLAYWRIGHT_MODULE;
if (!modulePath)
  throw new Error(
    "Informe o módulo Playwright local já instalado; este comando não instala dependências."
  );
const { chromium } = await import(pathToFileURL(resolve(modulePath)).href);
const output = resolve(".local/authoring/audio-browser");
await mkdir(output, { recursive: true });
const original = syntheticWav(2),
  digest = createHash("sha256").update(original).digest("hex");
await writeFile(resolve(output, "FICTICIO.wav"), original);
const objects = new Map<string, Buffer>();
let transcriptions = 0;
let writingCalls = 0,
  reviewCalls = 0;
let improvementOffers = 0;
const storage: PrivateDocumentStorage & PrivateDocumentReader = {
  async storeOriginal(input) {
    if (objects.has(input.objectId)) throw new Error("existing");
    objects.set(input.objectId, Buffer.from(input.content));
    return { storageKey: input.objectId };
  },
  async removeOriginal(input) {
    objects.delete(input.objectId);
  },
  async readOriginal(input) {
    const value = objects.get(input.objectId);
    if (!value) throw new Error("missing");
    return value;
  }
};
const api = createApi({
  membershipRepository: createDevelopmentIdentityRepository(),
  documentStorage: storage,
  documentImprovementAgent: {
    async suggest(draft) {
      const suffix = "FICTÍCIO. Redação revisada no navegador.";
      if (!draft.text.endsWith(suffix) || draft.text.endsWith(`\n\n${suffix}`)) return null;
      improvementOffers++;
      return {
        message:
          "Posso separar sua observação final em outro parágrafo para facilitar a leitura. Quer conferir?",
        text: draft.text.replace(`\n${suffix}`, `\n\n${suffix}`),
        changes:
          "Separação da observação final em parágrafo próprio; palavras e valores preservados."
      };
    }
  },
  audioMinutesModel: syntheticMinutesModel({
    plan: () => {
      writingCalls++;
      return simpleMinutesPlan();
    },
    onCall: (input) => {
      if (input.phase === "review") reviewCalls++;
    }
  }),
  audioTranscriber: {
    async transcribe(input) {
      if (createHash("sha256").update(input.content).digest("hex") !== digest)
        throw new Error("Este ensaio aceita somente a fixture sintética exata.");
      transcriptions++;
      return {
        processedDurationSeconds: 2,
        truncated: false,
        segments: simpleMinutesSegments
      };
    }
  }
});
const postedRequests: string[] = [];
api.addHook("onRequest", async (request) => {
  if (request.method === "POST") postedRequests.push(request.url);
});
const chatId = randomUUID(),
  workspace = process.cwd().replaceAll("\\", "/");
await writeFile(
  resolve(output, "index.html"),
  '<!doctype html><html lang="pt-BR"><head><meta charset="UTF-8"><meta name="viewport" content="width=device-width,initial-scale=1"></head><body><div id="root"></div><script type="module" src="/entry.tsx"></script></body></html>'
);
await writeFile(
  resolve(output, "entry.tsx"),
  `
import React,{useState} from 'react';import{createRoot}from'react-dom/client';
import{AudioMinutesComposer}from'/@fs/${workspace}/apps/web/AudioMinutesComposer.tsx';
import{DocumentDraftComposer}from'/@fs/${workspace}/apps/web/DocumentDraftComposer.tsx';
import'/@fs/${workspace}/apps/web/styles.css';
const headers={'x-development-user-id':'sindico-demo'},chatId=${JSON.stringify(chatId)};
function Fixture(){const[draft,setDraft]=useState();return <main style={{maxWidth:'900px',margin:'0 auto',padding:'16px'}}><h1>Ensaio sintético de áudio — sem IA externa</h1><AudioMinutesComposer condominiumId="alameda" chatId={chatId} headers={headers} onDraft={setDraft} onClose={()=>{}} prepareChat={async()=>{const r=await fetch('/v1/condominiums/alameda/chats',{method:'POST',headers:{...headers,'content-type':'application/json'},body:JSON.stringify({id:chatId,title:'FICTÍCIO. Ata'})});if(!r.ok)throw new Error('chat unavailable');}}/><DocumentDraftComposer condominiumId="alameda" chatId={chatId} headers={headers} draftSelection={draft}/></main>;}createRoot(document.getElementById('root')).render(<Fixture/>);`
);
let vite: Awaited<ReturnType<typeof createServer>> | undefined;
let browser: Awaited<ReturnType<typeof chromium.launch>> | undefined;
let diagnose: (() => Promise<void>) | undefined;
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
  });
  const external: string[] = [];
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
  const pageErrors: string[] = [];
  page.on("pageerror", (error: Error) => pageErrors.push(error.message));
  diagnose = async () => {
    await page.screenshot({ path: resolve(output, "failure.png"), fullPage: true });
    await writeFile(resolve(output, "failure.html"), await page.content());
    await writeFile(resolve(output, "page-errors.json"), JSON.stringify(pageErrors));
  };
  await page.goto(target);
  await page.getByLabel("Gravação", { exact: true }).setInputFiles(resolve(output, "FICTICIO.wav"));
  await page.getByRole("combobox", { name: /Origem do áudio/u }).selectOption("meeting");
  await page.getByLabel("Ouvir gravação selecionada").waitFor();
  assert.equal(transcriptions, 0);
  assert.equal(postedRequests.length, 0);
  assert.equal(objects.size, 0);
  await page.getByRole("button", { name: "Enviar áudio e preparar ata", exact: true }).click();
  await page
    .getByRole("status")
    .filter({ hasText: "Rascunho aberto para revisão abaixo" })
    .waitFor();
  assert.equal(transcriptions, 1);
  const text = page.getByRole("textbox", { name: /^Texto do documento/u });
  assert((await text.inputValue()).includes("sem votação"));
  assert(!(await text.inputValue()).includes(simpleMinutesSegments[0].text));
  assert.equal(writingCalls, 1);
  assert.equal(reviewCalls, 1);
  await text.fill((await text.inputValue()) + "\nFICTÍCIO. Redação revisada no navegador.");
  await page.getByRole("button", { name: "Salvar texto para revisão", exact: true }).click();
  await page
    .getByRole("button", { name: "Aplicar ao rascunho para revisar", exact: true })
    .waitFor();
  await page.getByText("Conferir o texto proposto", { exact: true }).click();
  await page.screenshot({ path: resolve(output, "improvement-offer-desktop.png"), fullPage: true });
  await page.setViewportSize({ width: 390, height: 844 });
  await page.screenshot({ path: resolve(output, "improvement-offer-mobile.png"), fullPage: true });
  assert.equal(
    await page.evaluate(() => document.documentElement.scrollWidth > window.innerWidth),
    false
  );
  await page.setViewportSize({ width: 1280, height: 900 });
  await page.getByRole("button", { name: "Aplicar ao rascunho para revisar", exact: true }).click();
  await page.waitForFunction(() =>
    Array.from(document.querySelectorAll("textarea")).some((element) =>
      element.value.includes("\n\nFICTÍCIO. Redação revisada no navegador.")
    )
  );
  assert((await text.inputValue()).includes("\n\nFICTÍCIO. Redação revisada no navegador."));
  assert.equal(
    await page.getByRole("button", { name: "Baixar PDF confirmado", exact: true }).count(),
    0
  );
  assert.equal(improvementOffers, 1);
  await page.getByLabel("Revisei esta versão e suas pendências.", { exact: true }).check();
  await page.getByRole("button", { name: "Confirmar esta versão para PDF", exact: true }).click();
  const download = page.waitForEvent("download");
  await page.getByRole("button", { name: "Baixar PDF confirmado", exact: true }).click();
  await (await download).saveAs(resolve(output, "ata-revisada.pdf"));
  assert(
    (await extractPdfTextByPage(await readFile(resolve(output, "ata-revisada.pdf"))))
      .map((p) => p.extractedText)
      .join(" ")
      .includes("Redação revisada no navegador")
  );
  await page.screenshot({ path: resolve(output, "desktop.png"), fullPage: true });
  await page.setViewportSize({ width: 390, height: 844 });
  await page.screenshot({ path: resolve(output, "mobile.png"), fullPage: true });
  assert.equal(
    await page.evaluate(() => document.documentElement.scrollWidth > window.innerWidth),
    false
  );
  await page.reload();
  await page
    .getByRole("button", { name: "Recuperar áudios já enviados nesta conversa", exact: true })
    .click();
  await page
    .getByRole("button", { name: "FICTICIO.wav · retomar transcrição", exact: true })
    .click();
  await page.getByRole("button", { name: "Enviar áudio e preparar ata", exact: true }).click();
  await page.getByRole("button", { name: "Baixar PDF confirmado", exact: true }).waitFor();
  assert.equal(transcriptions, 1);
  assert.equal(writingCalls, 1);
  assert.equal(reviewCalls, 1);
  assert.equal(external.length, 0);
  assert.equal(pageErrors.length, 0);
  await writeFile(
    resolve(output, "result.json"),
    JSON.stringify(
      {
        syntheticOnly: true,
        realProviderCalls: 0,
        simulatedTranscriptions: transcriptions,
        simulatedWritingCalls: writingCalls,
        simulatedReviewCalls: reviewCalls,
        simulatedImprovementOffers: improvementOffers,
        selectionDidNotSend: true,
        reviewedPdfDownloaded: true,
        reloadRecoveredConfirmedRevision: true,
        mobileOverflow: false,
        externalPageRequests: external
      },
      null,
      2
    )
  );
  process.stdout.write(
    "Áudio no navegador: envio explícito, revisão, PDF, recuperação e mobile aprovados; zero chamada externa.\n"
  );
} catch (error) {
  await diagnose?.().catch(() => {});
  throw error;
} finally {
  await browser?.close();
  await vite?.close();
  await api.close();
}
