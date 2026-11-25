import { describe, it, expect } from "vitest";
import {
  codexReferenceFormat,
  codexReferenceLayout
} from "../../apps/api/answers/codex-reference-layout.js";
import { answerSchema, structuredAnswer } from "../../apps/api/answers/openai-answer-gateway.js";
import { createCodexAnswerGateway } from "../../apps/api/answers/codex-answer-gateway.js";
import { withGenerationContract } from "../../apps/api/answers/answer-task-context.js";
import { validateGeneratedAnswer } from "../../apps/api/answers/citation-validator.js";
import type { AnswerGatewayInput } from "../../apps/api/answers/answer-gateway.js";
import { createEvidence, bosque } from "./answer-fixtures.js";
import { observedGateway } from "../../evals/conversation-comparison/observed-gateway.js";
import type { ProcessObservation } from "../../evals/conversation-comparison/protocol.js";

function fixture(prefix = "private", pending = false): AnswerGatewayInput {
  return withGenerationContract({
    question: "Compare PG-8421 e explique a pendencia.",
    task: "grounded_answer",
    riskClass: "low",
    evidence: [
      createEvidence({ id: `${prefix}-left`, content: "PG-8421 | R$715,41; ver ressalva final." }),
      createEvidence({
        id: `${prefix}-right`,
        pageNumber: 9,
        content: "PG-8421 | R$751,41; diferenca aguarda comprovante.",
        validityStatus: pending ? "pending" : "confirmed"
      })
    ],
    budget: { maximumCostMicrounits: 100000, maximumOutputTokens: 800 }
  });
}
const output = (id = "e1") => ({
  answer: "O registro informa R$715,41.",
  answerMode: "grounded",
  citations: [{ evidenceId: id }],
  claims: [
    {
      statement: "O registro informa R$715,41.",
      claimType: "condominium_fact",
      evidenceRequired: true,
      citationEvidenceIds: [id]
    }
  ],
  attentionPoints: [],
  suggestedNextStep: null,
  specialist: { required: false, type: null, reason: null }
});
const events = (text: string) =>
  [
    { type: "item.completed", item: { type: "agent_message", text } },
    {
      type: "turn.completed",
      usage: { input_tokens: 120, cached_input_tokens: 90, output_tokens: 30 }
    }
  ]
    .map((e) => JSON.stringify(e))
    .join("\n");

describe("AC7712 — layout local para cache, sem enfraquecer evidência", () => {
  it("AC7714: recusa alias no corpo sem apagar texto e preserva literal das entradas", () => {
    const input = fixture(),
      layout = codexReferenceLayout(input, "compact-v1"),
      bad = { ...output(), answer: output().answer + " [e1]" };
    const text = JSON.stringify(bad);
    expect(() => layout.decode(text)).toThrow(
      expect.objectContaining({ code: "answer_body_internal_reference" })
    );
    expect(JSON.parse(text).answer).toContain("[e1]");
    const quoted = codexReferenceLayout(
      { ...input, question: input.question + " Explique a etiqueta e1." },
      "compact-v1"
    );
    expect(JSON.parse(quoted.decode(text)).answer).toBe(bad.answer);
    const sourced = codexReferenceLayout(
      {
        ...input,
        evidence: input.evidence.map((e) => ({ ...e, content: e.content + " Etiqueta e1." }))
      },
      "compact-v1"
    );
    expect(JSON.parse(sourced.decode(text)).answer).toBe(bad.answer);
  });
  it("AC7713: harness efetivamente usa o layout registrado, sem trocar modelo", async () => {
    const observations: ProcessObservation[] = [];
    const gateway = observedGateway(
      { id: "sol-fixed", model: "gpt-6.1-sol", memory: false },
      observations,
      {
        executable: "synthetic",
        timeoutMs: 1000,
        referenceFormat: "compact-v1",
        run: async () => events(JSON.stringify(output()))
      }
    );
    const result = await gateway.generate(fixture());
    expect(result.telemetry.performance?.referenceFormat).toBe("compact-v1");
    expect(observations).toHaveLength(1);
    expect(observations[0]?.model).toBe("gpt-6.1-sol");
    expect(result.output.citations[0]?.evidenceId).toBe("private-left");
  });
  it("mantem schema estavel, contrato coerente e todos os textos intactos", () => {
    const a = fixture(),
      b = fixture("other");
    const before = JSON.stringify(a),
      left = codexReferenceLayout(a, "compact-v1"),
      right = codexReferenceLayout(b, "compact-v1");
    expect(answerSchema(left.input.evidence)).toEqual(answerSchema(right.input.evidence));
    expect(left.input.evidence.map((e) => e.id)).toEqual(["e1", "e2"]);
    expect(left.input.question).toBe(a.question);
    for (const [i, e] of left.input.evidence.entries())
      expect({ ...e, id: a.evidence[i]!.id }).toEqual(a.evidence[i]);
    expect(left.input.conversationContext?.taskFocus?.validationContract).toMatchObject({
      availableEvidenceIds: ["e1", "e2"],
      conditionalConflict: { evidenceIds: ["e1", "e2"] }
    });
    expect(JSON.stringify(a)).toBe(before);
    const decoded = JSON.parse(left.decode(JSON.stringify(output())));
    expect(decoded.citations).toEqual([{ evidenceId: "private-left" }]);
    expect(decoded.claims[0].citationEvidenceIds).toEqual(["private-left"]);
    expect(decoded.answer).toBe(output().answer);
    expect(
      validateGeneratedAnswer(structuredAnswer(JSON.stringify(decoded), a), a.evidence).citations[0]
        ?.excerpt
    ).toBe(a.evidence[0]!.content);
  });
  it("nao compartilha mapas entre chamadas ou tenants", async () => {
    const a = codexReferenceLayout(fixture("tenant-a"), "compact-v1");
    const b = codexReferenceLayout(
      {
        ...fixture("tenant-b"),
        evidence: fixture("tenant-b").evidence.map((e) => ({ ...e, condominiumId: bosque }))
      },
      "compact-v1"
    );
    const decoded = await Promise.all(
      [a, b].map(
        async (layout) =>
          JSON.parse(layout.decode(JSON.stringify(output()))).citations[0].evidenceId
      )
    );
    expect(decoded).toEqual(["tenant-a-left", "tenant-b-left"]);
  });
  it("preserva texto livre do historico mesmo quando coincide com ID", () => {
    const base = fixture();
    const input = {
      ...base,
      conversationContext: {
        ...base.conversationContext!,
        turns: [{ question: "private-left", answer: "private-right" }]
      }
    };
    expect(codexReferenceLayout(input, "compact-v1").input.conversationContext?.turns).toEqual(
      input.conversationContext.turns
    );
  });
  it.each(["e3", "other-tenant", "private-left", ""])(
    "recusa referencia fora do mapa: %s",
    (id) => {
      const layout = codexReferenceLayout(fixture(), "compact-v1");
      expect(() => layout.decode(JSON.stringify(output(id)))).toThrow(
        expect.objectContaining({ code: "citation_not_authorized" })
      );
      expect(() =>
        layout.decode(
          JSON.stringify({ ...output(), citations: [], claims: [{ citationEvidenceIds: [id] }] })
        )
      ).toThrow();
    }
  );
  it("recusa mistura de tenant e IDs duplicados antes do envio", () => {
    const a = fixture();
    for (const second of [
      { ...a.evidence[1]!, condominiumId: bosque },
      { ...a.evidence[1]!, id: a.evidence[0]!.id }
    ])
      expect(() =>
        codexReferenceLayout({ ...a, evidence: [a.evidence[0]!, second] }, "compact-v1")
      ).toThrow("Conjunto de evidências inválido");
  });
  it("conserva a proibicao de claims factuais quando ha minuta", () => {
    const input = fixture("pending", true),
      layout = codexReferenceLayout(input, "compact-v1");
    expect(answerSchema(layout.input.evidence)).toEqual(answerSchema(input.evidence));
    expect(JSON.stringify(answerSchema(layout.input.evidence))).not.toContain(
      '"enum":["condominium_fact"]'
    );
    expect(() =>
      validateGeneratedAnswer(
        structuredAnswer(layout.decode(JSON.stringify(output("e2"))), input),
        input.evidence
      )
    ).toThrow("Versão pendente");
  });
  it("original e sem fontes conservam protocolo anterior; configuracao desconhecida falha", () => {
    const input = fixture();
    expect(codexReferenceFormat(undefined)).toBe("original");
    expect(() => codexReferenceFormat("unknown")).toThrow();
    expect(codexReferenceLayout(input, "original").input).toBe(input);
    expect(
      codexReferenceLayout({ ...input, evidence: [] }, "compact-v1").decode("texto livre")
    ).toBe("texto livre");
  });
  it("gateway restaura IDs, mede cache/layout e nao esconde falha do validador", async () => {
    const input = fixture(),
      observations: unknown[] = [];
    const result = await createCodexAnswerGateway({
      referenceFormat: "compact-v1",
      onPerformance: (p) => {
        observations.push(p);
      },
      run: async (request) => {
        expect(request.input).toContain('"evidenceId":"e1"');
        expect(request.input).not.toContain('"evidenceId":"private-left"');
        request.onTimings?.({
          spawnMs: 1,
          firstByteMs: 2,
          turnStartedMs: 3,
          firstAnswerEventMs: 4,
          totalMs: 5
        });
        return events(JSON.stringify(output()));
      }
    }).generate(input);
    expect(result.output.citations[0]?.evidenceId).toBe("private-left");
    expect(result.telemetry.performance).toMatchObject({
      referenceFormat: "compact-v1",
      schemaSha256: expect.stringMatching(/^[a-f0-9]{64}$/u),
      process: { spawnMs: 1 }
    });
    expect(observations).toEqual([result.telemetry.performance]);
    expect(JSON.stringify(observations)).not.toMatch(/PG-8421|private-left|715,41/u);
    await expect(
      createCodexAnswerGateway({
        referenceFormat: "compact-v1",
        run: async () => events(JSON.stringify(output("e9")))
      }).generate(input)
    ).rejects.toMatchObject({ code: "citation_not_authorized" });
  });
});
