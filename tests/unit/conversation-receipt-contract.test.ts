import { readFile } from "node:fs/promises";
import { webcrypto } from "node:crypto";
import ts from "typescript";
import { expect, it, vi } from "vitest";
import {
  isAnswerPayload,
  isDocumentSnapshot,
  requestDocumentBatchSummary
} from "../../apps/web/document-condominium-confirmation.js";

async function harness(
  body: unknown,
  mode: "json" | "raw" | "progress" = "json",
  acknowledged = false
) {
  const source = await readFile("apps/web/App.tsx", "utf8");
  const start = source.indexOf("  async function conversationFetch(");
  const end = source.indexOf("\n  useEffect(", start);
  expect(start).toBeGreaterThan(0);
  expect(end).toBeGreaterThan(start);
  const compiled = ts.transpileModule(`export ${source.slice(start, end).trim()}`, {
    compilerOptions: { module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2022 }
  }).outputText;
  const receipts = { current: new Map<string, string>() };
  const keys: string[] = [];
  const transport = vi.fn(async (_url: unknown, init: RequestInit) => {
    keys.push(new Headers(init.headers).get("x-conversation-request-id")!);
    return mode === "raw"
      ? new Response(String(body), { status: 200 })
      : Response.json(body, {
          headers: mode === "progress" ? { "x-alvitra-progress": "internet" } : {}
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
  return {
    fetchRequest: exported.conversationFetch!,
    keys,
    run: async (url: string, requestBody: unknown) => {
      const request = {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify(requestBody)
      };
      let bodyErrors = 0;
      for (let i = 0; i < 2; i++) {
        try {
          await (await exported.conversationFetch!(url, request)).json();
        } catch {
          bodyErrors++;
        }
        if (acknowledged) await vi.waitFor(() => expect(receipts.current.size).toBe(0));
      }
      return { keys, pending: receipts.current.size, bodyErrors };
    }
  };
}

it.each([
  {
    route: "setup-message",
    url: "/v1/chat/setup-message",
    request: { stage: "welcome" },
    body: { message: "FICTICIO-OLA" }
  },
  {
    route: "setup-turn",
    url: "/v1/chat/setup-turn",
    request: { stage: "manager_name", message: "FICTICIO" },
    body: { message: "FICTICIO-RETORNO", intent: "answer", update: null }
  },
  {
    route: "upload",
    url: "/v1/condominiums/synthetic-condominium/documents",
    request: { synthetic: true },
    body: {
      documentId: "FICTICIO-DOC",
      documentVersionId: "FICTICIO-VERSION",
      processingStatus: "uploaded"
    }
  },
  {
    route: "questions",
    url: "/v1/condominiums/synthetic-condominium/questions",
    request: { question: "Pergunta sintética" },
    body: {
      answerId: "synthetic-answer",
      questionId: "synthetic-question",
      answer: "Resposta sintética."
    }
  },
  {
    route: "document-batch",
    url: "/v1/condominiums/synthetic-condominium/documents/conversation",
    request: { documentVersionIds: ["synthetic-version"] },
    body: {
      summary: {
        answerMode: "abstained",
        answer: "Síntese sintética.",
        citations: [],
        attentionPoints: [],
        suggestedNextStep: null,
        specialist: { required: false, type: null, reason: null }
      }
    }
  },
  {
    route: "document-snapshot",
    url: "/v1/condominiums/synthetic-condominium/documents/synthetic-version/conversation",
    request: { event: "ready", analysisOnly: true },
    body: { snapshot: { status: "available", title: "FICTICIO", rows: [], limitations: [] } }
  },
  {
    route: "create-condominium",
    url: "/v1/condominiums",
    request: { name: "Condomínio sintético", unitCount: 2 },
    body: {
      condominiumId: "synthetic-condominium",
      role: "syndic",
      permissions: ["document:read", "document:upload"],
      condominium: {
        condominiumId: "synthetic-condominium",
        name: "Condomínio sintético",
        unitCount: 2
      }
    }
  },
  {
    route: "confirm-condominium",
    url: "/v1/condominiums/synthetic-condominium/documents/synthetic-version/confirm-condominium",
    request: { message: "Confirmo" },
    body: { confirmed: true }
  }
])(
  "libera o recibo após resposta válida do contrato $route",
  async ({ route, url, request, body }) => {
    const result = await (await harness(body)).run(url, request);
    console.info(
      JSON.stringify({
        scenario: `confirmed-${route}`,
        sameRequestId: result.keys[0] === result.keys[1],
        pending: result.pending,
        externalCalls: 0
      })
    );
    expect(result.pending).toBe(0);
    expect(result.bodyErrors).toBe(0);
    expect(result.keys[1]).not.toBe(result.keys[0]);
  }
);

it("preserva o recibo quando o corpo JSON não satisfaz o contrato", async () => {
  const result = await (
    await harness({ message: "corpo incompleto" })
  ).run("/v1/condominiums/synthetic-condominium/questions", { question: "Pergunta sintética" });
  expect(result.pending).toBe(1);
  expect(result.keys[1]).toBe(result.keys[0]);
});

it("AC-7127: JSON inválido conserva a chave e não retenta automaticamente", async () => {
  const result = await (
    await harness("{incomplete", "raw")
  ).run("/v1/condominiums/synthetic-condominium/questions", { question: "FICTICIO" });
  expect(result.keys).toHaveLength(2);
  expect(result.keys[1]).toBe(result.keys[0]);
  expect(result.pending).toBe(1);
  expect(result.bodyErrors).toBe(2);
});
it("AC-7127: o consumidor real recusa resposta incompleta sem liberar o recibo", async () => {
  const f = await harness({ summary: { answer: "FICTICIO-INCOMPLETO", citations: [] } });
  const request = {
    condominiumId: "synthetic-condominium",
    documentVersionIds: ["synthetic-version"],
    headers: {}
  };
  await expect(requestDocumentBatchSummary(f.fetchRequest, request)).rejects.toThrow("incompleta");
  await expect(requestDocumentBatchSummary(f.fetchRequest, request)).rejects.toThrow("incompleta");
  expect(f.keys).toHaveLength(2);
  expect(f.keys[1]).toBe(f.keys[0]);
});
it.each([true, false])(
  "AC-7127: progresso com contrato válido=%s confirma só após corpo",
  async (valid) => {
    const body = valid
      ? { answerId: "FICTICIO-A", questionId: "FICTICIO-Q", answer: "FICTICIO-RESPOSTA" }
      : { answerId: "FICTICIO-A" };
    const result = await (
      await harness({ statusCode: 200, body }, "progress", valid)
    ).run("/v1/condominiums/synthetic-condominium/questions", { question: "FICTICIO" });
    expect(result.pending).toBe(valid ? 0 : 1);
    expect(result.keys[0] === result.keys[1]).toBe(!valid);
  }
);
