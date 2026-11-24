import { readFile } from "node:fs/promises";
import { webcrypto } from "node:crypto";
import ts from "typescript";
import { expect, it, vi } from "vitest";
import {
  isAnswerPayload,
  isDocumentSnapshot
} from "../../apps/web/document-condominium-confirmation.js";

it("conserva o recibo quando o corpo HTTP falha após os cabeçalhos 200", async () => {
  const source = await readFile("apps/web/App.tsx", "utf8");
  const start = source.indexOf("  async function conversationFetch(");
  const end = source.indexOf("\n  useEffect(", start);
  expect(start).toBeGreaterThan(0);
  expect(end).toBeGreaterThan(start);
  // Executa a função atual, sem copiar sua implementação e sem montar uma UI fictícia.
  const compiled = ts.transpileModule(`export ${source.slice(start, end).trim()}`, {
    compilerOptions: { module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2022 }
  }).outputText;
  const receipts = { current: new Map<string, string>() };
  const keys: string[] = [];
  let call = 0;
  const transport = vi.fn(async (_url: unknown, init: RequestInit) => {
    keys.push(new Headers(init.headers).get("x-conversation-request-id")!);
    call++;
    return call === 1
      ? new Response(
          new ReadableStream({
            start(controller) {
              controller.error(new Error("synthetic-connection-lost"));
            }
          }),
          { status: 200 }
        )
      : Response.json({
          answerId: "synthetic-answer",
          questionId: "synthetic-question",
          answer: "Resposta sintética."
        });
  });
  const exported: { conversationFetch?: typeof fetch } = {};
  const initialize = new Function(
    "exports",
    "fetch",
    "requestHeaders",
    "authMode",
    "developmentIdentity",
    "context",
    "activeChatId",
    "setupStage",
    "setupSession",
    "pendingReceipts",
    "timelineScope",
    "setTimelineRevision",
    "crypto",
    "isAnswerPayload",
    "isDocumentSnapshot",
    compiled
  );
  initialize(
    exported,
    transport,
    () => ({}),
    "development",
    { userId: "synthetic-user" },
    { condominiumId: "synthetic-condominium" },
    "synthetic-chat",
    "complete",
    { current: undefined },
    receipts,
    "same-synthetic-scope",
    () => {},
    webcrypto,
    isAnswerPayload,
    isDocumentSnapshot
  );
  const request = {
    method: "POST",
    headers: { "content-type": "application/json" },
    body: JSON.stringify({ question: "Pergunta sintética", chatId: "synthetic-chat" })
  };
  const first = await exported.conversationFetch!(
    "/v1/condominiums/synthetic-condominium/questions",
    request
  );
  await expect(first.json()).rejects.toThrow("synthetic-connection-lost");
  const second = await exported.conversationFetch!(
    "/v1/condominiums/synthetic-condominium/questions",
    request
  );
  await second.json();
  console.info(
    JSON.stringify({
      scenario: "headers-200-body-failed",
      requests: keys.length,
      sameRequestId: keys[0] === keys[1],
      externalCalls: 0
    })
  );
  expect(keys).toHaveLength(2);
  expect(keys[1]).toBe(keys[0]);
});
