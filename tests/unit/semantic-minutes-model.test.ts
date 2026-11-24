import { expect, it, vi } from "vitest";
import {
  createResponsesMinutesModel,
  type MinutesModelRequest,
  minutesWritingPrompt,
  minutesReviewPrompt
} from "../../apps/api/authoring/semantic-minutes-model.js";
import { simpleMinutesPlan, responsesEnvelope } from "../fixtures/semantic-minutes.js";
const input: MinutesModelRequest = {
  phase: "write",
  operationId: "synthetic-operation",
  condominiumId: "alameda",
  userId: "sintetico",
  chatId: "synthetic-chat",
  data: { request: "FICTÍCIO. Redija uma ata." }
};
it("AC-7320: modelo explícito sem transporte permanece desligado e sem fetch", async () => {
  const request = vi.fn();
  vi.stubGlobal("fetch", request);
  try {
    const model = createResponsesMinutesModel({ modelKey: "synthetic-only" });
    expect(model.enabled).toBe(false);
    await expect(model.complete(input)).rejects.toMatchObject({ statusCode: 503 });
    expect(request).not.toHaveBeenCalled();
  } finally {
    vi.unstubAllGlobals();
  }
});
it.each(["write", "review"] as const)(
  "AC-7317/20: serializa %s estruturada, com limites, sem ferramentas e sem armazenar no provedor",
  async (phase) => {
    const transport = vi.fn(async () => responsesEnvelope(simpleMinutesPlan()));
    const model = createResponsesMinutesModel({ modelKey: "synthetic-only", transport });
    expect(await model.complete({ ...input, phase })).toEqual(simpleMinutesPlan());
    const [body, scope] = transport.mock.calls[0]! as unknown as [
      Record<string, unknown>,
      MinutesModelRequest
    ];
    expect(body).toMatchObject({
      model: "synthetic-only",
      store: false,
      background: false,
      tools: [],
      tool_choice: "none",
      text: { format: { type: "json_schema", strict: true } }
    });
    expect(body.input).toEqual([
      { role: "system", content: phase === "write" ? minutesWritingPrompt : minutesReviewPrompt },
      { role: "user", content: JSON.stringify(input.data) }
    ]);
    expect(scope).toMatchObject({
      condominiumId: input.condominiumId,
      userId: input.userId,
      chatId: input.chatId,
      operationId: input.operationId,
      phase
    });
    expect(scope.signal).toBeInstanceOf(AbortSignal);
    expect(body).not.toHaveProperty("previous_response_id");
  }
);
it.each([
  null,
  { status: "incomplete", output: [] },
  { status: "failed", output: [] },
  { status: "completed", output: [{ type: "function_call", name: "publish" }] },
  {
    status: "completed",
    output: [{ type: "message", role: "assistant", content: [{ type: "refusal", refusal: "No" }] }]
  },
  { status: "completed", output: [{ type: "message", role: "user", content: [] }] },
  { status: "completed", output: [] },
  {
    status: "completed",
    output: [
      {
        type: "message",
        role: "assistant",
        content: [{ type: "output_text", text: "invalid json" }]
      }
    ]
  },
  responsesEnvelope("x".repeat(61_000))
])("AC-7318: falha fechada em resposta recusada/incompleta/fora do contrato", async (response) => {
  const model = createResponsesMinutesModel({
    modelKey: "synthetic-only",
    transport: async () => response
  });
  await expect(model.complete(input)).rejects.toMatchObject({ statusCode: 422 });
});
it("AC-7318: aceita envelope com reasoning e JSON textual, sem expor reasoning", async () => {
  const model = createResponsesMinutesModel({
    modelKey: "synthetic-only",
    transport: async () => ({
      status: "completed",
      output: [
        { type: "reasoning", summary: [] },
        {
          type: "message",
          role: "assistant",
          content: [{ type: "output_text", text: '{"ok":true}' }]
        }
      ]
    })
  });
  expect(await model.complete(input)).toEqual({ ok: true });
});
it("AC-7320: exceder requisição ou cancelar antes não envia transporte", async () => {
  const transport = vi.fn(async () => responsesEnvelope({})),
    model = createResponsesMinutesModel({ modelKey: "synthetic-only", transport });
  await expect(
    model.complete({ ...input, data: { text: "x".repeat(300_001) } })
  ).rejects.toMatchObject({ statusCode: 422 });
  const controller = new AbortController();
  controller.abort();
  await expect(model.complete({ ...input, signal: controller.signal })).rejects.toThrow();
  expect(transport).not.toHaveBeenCalled();
});
it("AC-7320: timeout cancela sinal, sem repetição automática", async () => {
  let signal: AbortSignal | undefined;
  const transport = vi.fn(async (_body, context) => {
    signal = context.signal;
    return new Promise(() => {});
  });
  const model = createResponsesMinutesModel({
    modelKey: "synthetic-only",
    transport,
    timeoutMs: 10
  });
  await expect(model.complete(input)).rejects.toThrow("cancelada ou expirada");
  expect(signal?.aborted).toBe(true);
  expect(transport).toHaveBeenCalledTimes(1);
});
it("AC-7320: cancelamento ocorrido dentro do transporte não escapa da corrida", async () => {
  const controller = new AbortController(),
    transport = vi.fn(async () => {
      controller.abort();
      return new Promise(() => {});
    });
  await expect(
    createResponsesMinutesModel({ modelKey: "synthetic-only", transport }).complete({
      ...input,
      signal: controller.signal
    })
  ).rejects.toThrow("cancelada");
  expect(transport).toHaveBeenCalledTimes(1);
});
it.each(["", "invalid model", "x".repeat(101)])(
  "AC-7320: exige identidade explícita válida",
  (modelKey) => {
    expect(() => createResponsesMinutesModel({ modelKey })).toThrow("Modelo");
  }
);
it.each([0, 60_001, 1.5])("AC-7320: prazo deve ser finito e limitado", (timeoutMs) => {
  expect(() => createResponsesMinutesModel({ modelKey: "synthetic-only", timeoutMs })).toThrow(
    "Prazo"
  );
});
