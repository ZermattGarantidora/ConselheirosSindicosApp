import { describe, expect, it, vi } from "vitest";
import { accountOpenAiUsage } from "../../apps/api/answers/usage-accounting.js";
import { createOpenAiAnswerGateway } from "../../apps/api/answers/openai-answer-gateway.js";
import {
  gatewayErrorTelemetry,
  AnswerGatewayUnavailableError
} from "../../apps/api/answers/answer-gateway.js";
import { InvalidAnswerValidationError } from "../../apps/api/answers/citation-validator.js";
import { createAnswerUseCase } from "../../apps/api/answers/answer-use-case.js";
import { createInMemoryAnswerPersistence } from "../../apps/api/answers/in-memory-answer-persistence.js";
import { createPostgresAnswerPersistence } from "../../apps/api/answers/postgres-answer-persistence.js";
import type { PoolClient } from "pg";
import { createRoutedAnswerGateway } from "../../apps/api/answers/answer-model-routing.js";
import { createEvidence, createRetrievalResult, managerContext } from "./answer-fixtures.js";

const usage = {
  input_tokens: 3000,
  output_tokens: 500,
  input_tokens_details: {
    cached_tokens: 1000,
    cache_write_tokens: 1000,
    cache_write_tokens_details: { ttl_30m_tokens: 500, ttl_12h_tokens: 500 }
  },
  output_tokens_details: { reasoning_tokens: 100 }
};
const input = {
  question: "Como organizar a rotina?",
  task: "grounded_answer" as const,
  riskClass: "low" as const,
  evidence: [],
  budget: { maximumOutputTokens: 800, maximumCostMicrounits: 100_000 }
};
const provider = (text: string, status = "completed") =>
  new Response(
    JSON.stringify({
      status,
      usage,
      output: [{ type: "message", content: [{ type: "output_text", text }] }]
    })
  );

describe("Spec 074 — medição íntegra de custo", () => {
  it("AC-7403: rejeição HTTP com consumo preserva modelo, rota e uso sem repetir chamada", async () => {
    const fetch = vi
      .fn<typeof globalThis.fetch>()
      .mockResolvedValue(new Response(JSON.stringify({ usage }), { status: 429 }));
    const gateway = createRoutedAnswerGateway({
      "gpt-6-luna": createOpenAiAnswerGateway({ apiKey: "synthetic", model: "gpt-6-luna", fetch }),
      "gpt-6.1-sol": createOpenAiAnswerGateway({ apiKey: "synthetic", model: "gpt-6.1-sol", fetch })
    });
    try {
      await gateway.generate(input);
      expect.fail("Rejeição deve falhar");
    } catch (error) {
      expect(gatewayErrorTelemetry(error)).toMatchObject({
        modelKey: "gpt-6-luna",
        routingReason: "luna-sol-v1:basic_request",
        usageAccounting: { estimatedCostUsd: 0.0005475 },
        errorCode: "provider_http_error"
      });
    }
    expect(fetch).toHaveBeenCalledTimes(1);
  });
  it("AC-7401: cache misto e raciocínio são contados uma vez, inclusive valores pequenos", () => {
    expect(accountOpenAiUsage("gpt-6.1-sol", usage)).toMatchObject({
      estimatedCostUsd: 0.01085,
      unavailableReason: null,
      usage: { inputTokens: 3000, outputTokens: 500, reasoningTokens: 100 }
    });
    expect(accountOpenAiUsage("gpt-6-luna", usage).estimatedCostUsd).toBe(0.0005475);
    expect(
      accountOpenAiUsage("gpt-6-luna", {
        input_tokens: 1,
        output_tokens: 1,
        input_tokens_details: { cached_tokens: 0, cache_write_tokens: 0 }
      }).estimatedCostUsd
    ).toBe(0.0000006);
  });
  it.each([
    undefined,
    null,
    [],
    {},
    { input_tokens: 20 },
    { ...usage, input_tokens: -1 },
    { ...usage, output_tokens: 0.5 },
    { ...usage, input_tokens: 1 },
    { ...usage, output_tokens_details: { reasoning_tokens: 501 } },
    { ...usage, input_tokens_details: { ...usage.input_tokens_details, cache_write_tokens: 500 } },
    {
      ...usage,
      input_tokens_details: { ...usage.input_tokens_details, cache_write_tokens_details: {} }
    },
    { ...usage, input_tokens: Number.MAX_SAFE_INTEGER, output_tokens: Number.MAX_SAFE_INTEGER }
  ])("AC-7402: uso ausente/inválido permanece desconhecido %#", (raw) => {
    expect(accountOpenAiUsage("gpt-6.1-sol", raw).estimatedCostUsd).toBeNull();
  });
  it("AC-7402: modelo sem preço preserva tokens, sem inventar tarifa", () => {
    expect(accountOpenAiUsage("custom", usage)).toMatchObject({
      estimatedCostUsd: null,
      unavailableReason: "price_unavailable",
      usage: { inputTokens: 3000 }
    });
    expect(gatewayErrorTelemetry("erro arbitrário")).toBeUndefined();
    expect(accountOpenAiUsage("__proto__", usage).estimatedCostUsd).toBeNull();
    expect(
      accountOpenAiUsage("gpt-6.1-sol", {
        input_tokens: 300_000,
        output_tokens: 1000,
        input_tokens_details: { cached_tokens: 0, cache_write_tokens: 0 }
      }).estimatedCostUsd
    ).toBe(1.215);
  });
  it("AC-7402: formato de TTL inválido e contadores legados inválidos não viram custo conhecido", async () => {
    expect(
      accountOpenAiUsage("gpt-6.1-sol", {
        ...usage,
        input_tokens_details: {
          ...usage.input_tokens_details,
          cache_write_tokens_details: "inválido"
        }
      }).estimatedCostUsd
    ).toBeNull();
    const fetch = vi.fn<typeof globalThis.fetch>().mockResolvedValue(
      new Response(
        JSON.stringify({
          status: "completed",
          usage: { ...usage, input_tokens: "secret-counter", output_tokens: -1 },
          output: [
            { type: "message", content: [{ type: "output_text", text: "Orientação geral." }] }
          ]
        })
      )
    );
    const result = await createOpenAiAnswerGateway({ apiKey: "synthetic", fetch }).generate(input);
    expect(result.telemetry).toMatchObject({
      inputTokens: 0,
      cachedInputTokens: 0,
      outputTokens: 0,
      usageAccounting: { estimatedCostUsd: null }
    });
    expect(JSON.stringify(result.telemetry)).not.toContain("secret-counter");
  });
  it.each([
    "incomplete",
    "bad_json",
    "bad_citation",
    "missing_text",
    "transport",
    "http",
    "invalid_response"
  ])("AC-7403: preserva consumo e classe do erro em %s", async (kind) => {
    const fetch = vi.fn<typeof globalThis.fetch>().mockImplementation(async () => {
      if (kind === "transport") throw new Error("SEGREDO QUE NÃO DEVE SAIR");
      if (kind === "http") return new Response("SEGREDO", { status: 503 });
      if (kind === "invalid_response") return new Response("inválido");
      if (kind === "missing_text")
        return new Response(JSON.stringify({ status: "completed", usage, output: [] }));
      return provider(
        kind === "bad_citation"
          ? JSON.stringify({ citations: [{ evidenceId: "not-authorized" }] })
          : "inválido",
        kind === "incomplete" ? "incomplete" : "completed"
      );
    });
    try {
      await createOpenAiAnswerGateway({ apiKey: "synthetic-secret", fetch }).generate({
        ...input,
        evidence: kind.startsWith("bad_") ? [createEvidence()] : []
      });
      expect.fail("A saída inválida deve ser recusada");
    } catch (error) {
      expect(error).toBeInstanceOf(
        kind === "bad_citation" ? InvalidAnswerValidationError : AnswerGatewayUnavailableError
      );
      const receipt = gatewayErrorTelemetry(error)!;
      expect(receipt.status).toBe("failed");
      expect(receipt.usageAccounting?.estimatedCostUsd).toBe(
        ["transport", "http", "invalid_response"].includes(kind) ? null : 0.01085
      );
      expect(JSON.stringify(receipt)).not.toMatch(/SEGREDO|synthetic-secret|inválido/u);
    }
    expect(fetch).toHaveBeenCalledTimes(1);
  });
  it("AC-7403/7404: auditoria conserva tentativa rejeitada e reparo sem conteúdo", async () => {
    const persistence = createInMemoryAnswerPersistence();
    const source = createEvidence();
    const valid = {
      answer: source.content,
      answerMode: "grounded",
      citations: [{ evidenceId: source.id }],
      claims: [
        {
          statement: source.content,
          claimType: "condominium_fact",
          evidenceRequired: true,
          citationEvidenceIds: [source.id]
        }
      ],
      attentionPoints: [],
      suggestedNextStep: null,
      specialist: { required: false, type: null, reason: null }
    };
    const fetch = vi
      .fn<typeof globalThis.fetch>()
      .mockResolvedValueOnce(
        provider(JSON.stringify({ ...valid, citations: [{ evidenceId: "invalid" }] }))
      )
      .mockResolvedValueOnce(provider(JSON.stringify(valid)));
    const app = createAnswerUseCase({
      persistence,
      retriever: { search: async () => createRetrievalResult([source]) },
      gateway: createOpenAiAnswerGateway({ apiKey: "synthetic-secret", fetch })
    });
    const answer = await app.ask(managerContext, {
      question: "Qual a regra da área comum?",
      requestId: "cost-synthetic-repair"
    });
    const saved = persistence.getInteraction(answer.answerId)!;
    const encoded = saved.auditEvents.find((e) => e.eventType !== "question_created")!.metadata
      .providerAccountingReceipts;
    const receipts = JSON.parse(String(encoded));
    expect(receipts).toHaveLength(2);
    expect(
      receipts.map(
        (r: { accounting: { estimatedCostUsd: number } }) => r.accounting.estimatedCostUsd
      )
    ).toEqual([0.01085, 0.01085]);
    expect(receipts.map((r: { status: string }) => r.status)).toEqual(["failed", "completed"]);
    expect(
      saved.invocations.some(
        (i) => i.providerKey === "openai" && i.status === "failed" && i.inputTokens === 3000
      )
    ).toBe(true);
    expect(String(encoded)).not.toContain(source.content);
    expect(String(encoded)).not.toContain("synthetic-secret");
    const queries: { sql: string; values: readonly unknown[] | undefined }[] = [];
    const client = {
      query: vi.fn(async (sql: string, values?: readonly unknown[]) => {
        queries.push({ sql, values });
        return {
          rows: sql.includes("resolve_user_id")
            ? [{ user_id: "11111111-1111-4111-8111-111111111111" }]
            : []
        };
      }),
      release: vi.fn()
    };
    const pool = { connect: async () => client as unknown as PoolClient };
    await createPostgresAnswerPersistence(pool).saveInteraction(saved);
    const audit = queries.find(
      (q) =>
        q.sql.includes("INSERT INTO app.audit_events") &&
        String(q.values?.[9]).includes("providerAccountingReceipts") &&
        String(q.values?.[9]).includes("0.01085")
    );
    expect(audit?.values?.[0]).toBe(managerContext.condominiumId);
    expect(JSON.parse(String(audit?.values?.[9])).providerAccountingReceipts).toBe(encoded);
    expect(queries.at(-1)?.sql).toBe("COMMIT");
  });
});
