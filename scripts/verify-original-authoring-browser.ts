import assert from "node:assert/strict";
import { mkdir, readFile, writeFile } from "node:fs/promises";
import { resolve } from "node:path";
import { pathToFileURL } from "node:url";
import { createServer } from "vite";
import react from "@vitejs/plugin-react";
import {
  originalDocumentFixture,
  originalChat
} from "../tests/fixtures/original-document-authoring.js";
import { extractPdfTextByPage } from "../apps/api/documents/extract-pdf-text.js";
const modulePath = process.env.ALVITRA_TEST_PLAYWRIGHT_MODULE;
if (!modulePath)
  throw new Error("Informe Playwright já instalado; nenhum pacote ou navegador será instalado.");
const { chromium } = await import(pathToFileURL(resolve(modulePath)).href);
const output = resolve(".local/authoring-originals/browser");
await mkdir(output, { recursive: true });
const fixture = originalDocumentFixture(),
  api = fixture.app(),
  chat = await originalChat(api),
  other = await originalChat(api);
const workspace = process.cwd().replaceAll("\\", "/");
await writeFile(
  resolve(output, "index.html"),
  '<!doctype html><html lang="pt-BR"><head><meta charset="UTF-8"><meta name="viewport" content="width=device-width,initial-scale=1"></head><body><div id="root"></div><script type="module" src="/entry.tsx"></script></body></html>'
);
await writeFile(
  resolve(output, "entry.tsx"),
  `
import React,{useState}from'react';import{createRoot}from'react-dom/client';
import{DocumentAuthoringComposer}from'/@fs/${workspace}/apps/web/DocumentAuthoringComposer.tsx';
import{DocumentDraftComposer}from'/@fs/${workspace}/apps/web/DocumentDraftComposer.tsx';
import{requestDocumentBatchSummary}from'/@fs/${workspace}/apps/web/document-condominium-confirmation.tsx';
import'/@fs/${workspace}/apps/web/styles.css';
const headers={'x-development-user-id':'sindico-demo'};
function Demo(){const[chat,setChat]=useState(${JSON.stringify(chat)}),[revision,setRevision]=useState(0),[draft,setDraft]=useState(),[answer,setAnswer]=useState(''),[error,setError]=useState(''),[busy,setBusy]=useState(false);
async function analyze(){setBusy(true);setError('');try{const result=await requestDocumentBatchSummary(fetch,{condominiumId:'alameda',documentVersionIds:['synthetic-version'],headers:{...headers,'x-chat-id':chat},onOriginalImprovementStatus:setError});setAnswer(result.answer);setRevision(r=>r+1);}catch(e){setError(e.message);}finally{setBusy(false);}}
return <main style={{maxWidth:'900px',margin:'0 auto',padding:'16px'}}><h1>Demonstração documental simulada</h1><p>Fontes fictícias e modelos simulados. Sem chamadas externas. O histórico desta demonstração fica em memória.</p><button disabled={busy} onClick={analyze}>Analisar original fictício</button><button onClick={()=>{setChat(${JSON.stringify(other)});setDraft(undefined);setAnswer('');setError('');}}>Mudar conversa</button>{answer?<article aria-label="Análise do original"><p>{answer}</p></article>:null}{error?<p role="alert">{error}</p>:null}<DocumentAuthoringComposer key={'original:'+chat} condominiumId="alameda" chatId={chat} headers={headers} originalsOnly refreshKey={revision} onDraft={setDraft}/><DocumentDraftComposer key={'draft:'+chat} condominiumId="alameda" chatId={chat} headers={headers} draftSelection={draft}/></main>;}createRoot(document.getElementById('root')).render(<Demo/>);`
);
let vite: Awaited<ReturnType<typeof createServer>> | undefined,
  browser: Awaited<ReturnType<typeof chromium.launch>> | undefined;
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
      watch: { ignored: ["**/*.pdf", "**/*.png", "**/result.json", "**/failure.html"] },
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
  try {
    await page.goto(target);
    assert.equal(fixture.counts().writing, 0);
    let drop = true;
    await page.route(
      "**/documents/conversation",
      async (route: {
        fetch(): Promise<unknown>;
        abort(): Promise<void>;
        continue(): Promise<void>;
      }) => {
        if (drop) {
          drop = false;
          await route.fetch();
          await route.abort();
        } else await route.continue();
      }
    );
    await page.getByRole("button", { name: "Analisar original fictício", exact: true }).click();
    await page.getByRole("alert").waitFor();
    assert.deepEqual(
      { writing: fixture.counts().writing, reviews: fixture.counts().reviews },
      { writing: 1, reviews: 1 }
    );
    await page.getByRole("button", { name: "Analisar original fictício", exact: true }).click();
    const offer = page.getByRole("region", { name: "Melhoria do original na conversa" });
    await offer.getByRole("button", { name: "Aceitar e conferir rascunho", exact: true }).waitFor();
    assert.equal(fixture.counts().writing, 1);
    assert.equal(fixture.counts().reviews, 1);
    assert((await offer.textContent()).includes(fixture.original));
    assert.equal(
      await page.getByRole("button", { name: "Baixar PDF confirmado", exact: true }).count(),
      0
    );
    await page.screenshot({ path: resolve(output, "oferta-desktop.png"), fullPage: true });
    await page.setViewportSize({ width: 390, height: 844 });
    assert.equal(
      await page.evaluate(() => document.documentElement.scrollWidth > innerWidth),
      false
    );
    await page.screenshot({ path: resolve(output, "oferta-mobile.png"), fullPage: true });
    await page.setViewportSize({ width: 1280, height: 900 });
    await offer.getByRole("button", { name: "Aceitar e conferir rascunho", exact: true }).click();
    const text = page.getByRole("textbox", { name: /^Texto do documento/u });
    await text.waitFor();
    assert((await text.inputValue()).includes("24 horas"));
    await text.fill((await text.inputValue()) + "\nFICTÍCIO. Revisão humana da cópia.");
    await page.getByRole("button", { name: "Salvar texto para revisão", exact: true }).click();
    await page.getByLabel("Revisei esta versão e suas pendências.", { exact: true }).check();
    await page.getByRole("button", { name: "Confirmar esta versão para PDF", exact: true }).click();
    const download = page.waitForEvent("download");
    await page.getByRole("button", { name: "Baixar PDF confirmado", exact: true }).click();
    await (await download).saveAs(resolve(output, "copia-confirmada.pdf"));
    const pdf = (
      await extractPdfTextByPage(await readFile(resolve(output, "copia-confirmada.pdf")))
    )
      .map((p) => p.extractedText)
      .join(" ");
    assert(pdf.includes("Revisão humana da cópia"));
    assert(pdf.includes("Origem: proposta documental"));
    assert.equal(fixture.source(), fixture.original);
    await page.reload();
    await page.getByRole("button", { name: "Documentos em preparação", exact: true }).click();
    await page.getByText("Propostas desta conversa", { exact: true }).click();
    await page.getByRole("button", { name: "FICTÍCIO. Regimento · aceita", exact: true }).click();
    await page.getByRole("button", { name: "Reabrir rascunho aceito", exact: true }).click();
    await page.getByRole("button", { name: "Baixar PDF confirmado", exact: true }).waitFor();
    assert((await text.inputValue()).includes("Revisão humana da cópia"));
    await page.screenshot({ path: resolve(output, "rascunho-recuperado.png"), fullPage: true });
    await page.getByRole("button", { name: "Mudar conversa", exact: true }).click();
    assert.equal(
      await page.getByRole("button", { name: "Baixar PDF confirmado", exact: true }).count(),
      0
    );
    assert.equal(await offer.count(), 0);
    await page.getByRole("button", { name: "Analisar original fictício", exact: true }).click();
    await offer.getByRole("button", { name: "Recusar proposta", exact: true }).click();
    await offer.getByText("Proposta recusada.", { exact: true }).waitFor();
    await page.getByRole("button", { name: "Analisar original fictício", exact: true }).click();
    await page.getByRole("article", { name: "Análise do original", exact: true }).waitFor();
    await page.waitForFunction(
      () => !document.querySelector('section[aria-label="Melhoria do original na conversa"]')
    );
    assert.equal(fixture.counts().writing, 2);
    assert.equal(fixture.counts().reviews, 2);
    assert.deepEqual(external, []);
    assert.deepEqual(errors, []);
    await writeFile(
      resolve(output, "result.json"),
      JSON.stringify(
        {
          syntheticOnly: true,
          realProviderCalls: 0,
          ...fixture.counts(),
          analysisToOffer: true,
          lostResponseWithoutRepeatedAuthoring: true,
          originalUnchanged: true,
          humanEditConfirmedPdf: true,
          reloadRecovered: true,
          declineNotRepeated: true,
          chatSwitchIsolated: true,
          mobileOverflow: false,
          externalRequests: external,
          pageErrors: errors
        },
        null,
        2
      )
    );
    process.stdout.write(
      "Demonstração: análise, oferta, aceite/recusa, revisão, PDF, recuperação e isolamento aprovados; zero chamadas externas.\n"
    );
  } catch (error) {
    await page.screenshot({ path: resolve(output, "failure.png"), fullPage: true });
    await writeFile(resolve(output, "failure.html"), await page.content());
    throw error;
  }
} finally {
  await browser?.close();
  await vite?.close();
  await api.close();
}
