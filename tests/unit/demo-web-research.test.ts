import { describe, it, expect, vi } from "vitest";
import { readFile } from "node:fs/promises";
import {
  createDemoWebResearchGateway,
  createDemoWebResearchFromEnvironment,
  parseDemoWebResearch
} from "../../apps/api/answers/demo-web-research.js";
import {
  demoWebResearchTopic,
  isDemoWebResearchRequest,
  officialWebUrl
} from "../../apps/shared/demo-web-research.js";
import { splitMessageText } from "../../apps/web/message-format.js";
import type { AnswerGatewayInput } from "../../apps/api/answers/answer-gateway.js";
const url = "https://www.gov.br/anpd/pt-br/teste-sintetico";
const date = new Date("2026-11-04T15:00:00Z");
const input: AnswerGatewayInput = {
  question: "Pesquise na internet sobre assembleias virtuais. CANARIO_PRIVADO 000.000.000-00",
  task: "grounded_answer",
  riskClass: "low",
  evidence: [],
  budget: { maximumOutputTokens: 800, maximumCostMicrounits: 0 }
};
const events = (
  answer: unknown = { answer: "Orientação pública de teste [1].", sourceUrls: [url] },
  items: unknown[] = [
    {
      type: "web_search",
      results: [
        {
          type: "text_result",
          url,
          title: "Fonte sintética",
          snippet: "Dados públicos sintéticos."
        }
      ]
    }
  ]
) =>
  [
    ...items.map((item) => ({ type: "item.completed", item })),
    { type: "item.completed", item: { type: "agent_message", text: JSON.stringify(answer) } },
    {
      type: "turn.completed",
      usage: { input_tokens: 100, output_tokens: 20, cached_input_tokens: 10 }
    }
  ]
    .map((value) => JSON.stringify(value))
    .join("\n");
describe("Spec 065 — pesquisa pública opt-in", () => {
  it("AC-6501: exige demo/Codex e bloqueia produção", () => {
    expect(createDemoWebResearchFromEnvironment({})).toBeUndefined();
    expect(() =>
      createDemoWebResearchFromEnvironment({ ALVITRA_DEMO_WEB_SEARCH_ENABLED: "true" })
    ).toThrow();
    const env = {
      ALVITRA_DEMO_WEB_SEARCH_ENABLED: "true",
      DEMO_MODE: "true",
      CODEX_ANSWER_ENABLED: "true"
    };
    expect(createDemoWebResearchFromEnvironment(env)).toBeDefined();
    for (const field of ["APP_ENV", "NODE_ENV"])
      expect(() =>
        createDemoWebResearchFromEnvironment({ ...env, [field]: "production" })
      ).toThrow();
  });
  it("AC-6502: decide a pesquisa pública sem exigir comando e escolhe constantes públicas", () => {
    expect(isDemoWebResearchRequest("Pesquise na internet sobre assembleias virtuais")).toBe(true);
    expect(isDemoWebResearchRequest("Analise a convenção enviada")).toBe(false);
    expect(demoWebResearchTopic("Analise a convenção enviada")).toBeUndefined();
    expect(demoWebResearchTopic("Pesquise na web sobre futebol")).toBeUndefined();
    for (const topic of [
      "assembleias virtuais",
      "deveres do síndico",
      "prestação de contas",
      "convenção",
      "manutenção preventiva",
      "acessibilidade",
      "LGPD"
    ])
      expect(
        demoWebResearchTopic("Busque na internet sobre " + topic + " CANARIO_PRIVADO")
      ).toBeTruthy();
    expect(demoWebResearchTopic(input.question)).not.toContain("CANARIO_PRIVADO");
  });
  it.each([
    "Quais são as regras para assembleias virtuais em condomínios?",
    "Quais são os deveres do síndico?",
    "Como funciona a prestação de contas?",
    "Qual a diferença entre convenção e regimento?",
    "Como organizar manutenção preventiva?",
    "Que cuidados de acessibilidade são necessários?",
    "Como aplicar a LGPD na administração de condomínios?"
  ])("aciona pesquisa pública automaticamente: %s", (question) => {
    expect(isDemoWebResearchRequest(question)).toBe(true);
    expect(demoWebResearchTopic(question)).toBeTruthy();
  });
  it.each([
    "Não pesquise na internet sobre assembleias virtuais.",
    "Sem consultar a internet, explique manutenção preventiva.",
    "Não quero pesquisar sobre LGPD.",
    "O que diz a convenção enviada?",
    "O que diz a convenção?",
    "O regimento permite animais?",
    "Qual o horário de silêncio no regimento?",
    "O balancete foi aprovado?",
    "Quais são as regras de assembleia virtual na minha convenção?",
    "Analise o balancete enviado.",
    "Qual o saldo no balancete?",
    "E isso?",
    "Olá!"
  ])("preserva recusa, pergunta documental e assunto insuficiente: %s", (question) => {
    expect(isDemoWebResearchRequest(question)).toBe(false);
    expect(demoWebResearchTopic(question)).toBeUndefined();
  });
  it("AC-6503: subprocesso não recebe pergunta livre nem ferramentas locais", async () => {
    let temporary = "";
    const gateway = createDemoWebResearchGateway({
      now: () => date,
      run: async (request) => {
        temporary = request.cwd;
        expect(request.input).not.toContain("CANARIO_PRIVADO");
        expect(request.input).not.toContain("000.000");
        expect(request.args).toContain('web_search="live"');
        expect(request.args).toContain("--ignore-user-config");
        for (const feature of [
          "shell_tool",
          "apps",
          "plugins",
          "multi_agent",
          "computer_use",
          "memories"
        ])
          expect(request.args).toContain(feature);
        expect(request.args).toContain("mcp_servers={}");
        expect(request.args).toContain('approval_policy="never"');
        expect(request.timeoutMs).toBe(180000);
        return events();
      }
    });
    const result = await gateway.generate(input);
    expect(result.output.answer).toContain("[Fonte 1](" + url + ")");
    expect(result.output.answerMode).toBe("abstained");
    expect(result.telemetry.inputTokens).toBe(100);
    expect(result.telemetry.cachedInputTokens).toBe(10);
    await expect(readFile(temporary + "/qualquer-arquivo")).rejects.toThrow();
  });
  it("AC-6503/6507: contexto privado ou tema desconhecido recusa antes de executar", async () => {
    const run = vi.fn();
    const gateway = createDemoWebResearchGateway({ run });
    await expect(
      gateway.generate({
        ...input,
        conversationContext: {
          policyVersion: "recent-chat-v1",
          turns: [{ question: "CANARIO_PRIVADO" }],
          bytes: 20,
          omittedAnswers: 0,
          omittedTurns: 0
        }
      })
    ).rejects.toMatchObject({ code: "web_private_context_disallowed" });
    await expect(gateway.generate({ ...input, evidence: [{} as never] })).rejects.toMatchObject({
      code: "web_private_context_disallowed"
    });
    await expect(
      gateway.generate({ ...input, question: "Pesquise na internet sobre CANARIO_PRIVADO" })
    ).rejects.toMatchObject({ code: "web_topic_unsupported" });
    expect(run).not.toHaveBeenCalled();
  });
  it("AC-6504: recusa fonte inventada, sem ferramenta e ferramentas locais", () => {
    expect(() =>
      parseDemoWebResearch(
        events({ answer: "Teste [1]", sourceUrls: ["https://www.gov.br/outra-fonte"] }),
        date
      )
    ).toThrow();
    expect(() => parseDemoWebResearch(events(undefined, []), date)).toThrow();
    for (const type of [
      "command_execution",
      "file_change",
      "mcp_tool_call",
      "todo_list",
      "unknown"
    ])
      expect(() => parseDemoWebResearch(events(undefined, [{ type }]), date)).toThrow();
    expect(() => parseDemoWebResearch(events() + "\n{}", date)).toThrow();
    expect(() => parseDemoWebResearch('{"type":"turn.failed"}', date)).toThrow();
    expect(() => parseDemoWebResearch('{"type":"unexpected"}', date)).toThrow();
    expect(() => parseDemoWebResearch("{}", date)).toThrow();
    expect(() => parseDemoWebResearch("not json", date)).toThrow();
  });
  it("AC-6504: referências, schema, erros de acesso e limites são conferidos", () => {
    for (const answer of [
      "Sem referência.",
      "Referência errada [9]",
      "citeinterno [1]",
      "<script> [1]",
      "https://outro.site [1]"
    ])
      expect(() => parseDemoWebResearch(events({ answer, sourceUrls: [url] }), date)).toThrow();
    for (const answer of [
      { answer: "Teste [1]", sourceUrls: [] },
      { answer: "Teste [1]", sourceUrls: [url, url] },
      { answer: 3, sourceUrls: [url] },
      { answer: "Teste [1]", sourceUrls: [url], extra: 1 }
    ])
      expect(() => parseDemoWebResearch(events(answer), date)).toThrow();
    expect(() =>
      parseDemoWebResearch(
        events(undefined, [
          { type: "web_search", results: [{ type: "text_result", url, title: "Acesso Negado!" }] }
        ]),
        date
      )
    ).toThrow();
    expect(() =>
      parseDemoWebResearch(
        events(
          undefined,
          Array.from({ length: 7 }, () => ({ type: "web_search", results: [] }))
        ),
        date
      )
    ).toThrow();
    expect(() =>
      parseDemoWebResearch(
        '{"type":"item.completed","item":{"type":"web_search","results":null}}',
        date
      )
    ).toThrow();
    expect(() =>
      parseDemoWebResearch(
        '{"type":"item.completed","item":{"type":"agent_message","text":3}}',
        date
      )
    ).toThrow();
    const minimal = events().split("\n");
    expect(() => parseDemoWebResearch(minimal.slice(0, -1).join("\n"), date)).toThrow();
    expect(
      parseDemoWebResearch(
        '{"type":"thread.started"}\n{"type":"turn.started"}\n{"type":"item.started","item":{"type":"web_search"}}\n{"type":"item.completed","item":{"type":"reasoning"}}\n' +
          events(),
        date
      ).answer
    ).toContain("04/11/2026");
  });
  it("AC-6505: renderiza só HTTPS oficial, mantém HTML e URLs perigosas literais", () => {
    for (const value of [
      "javascript:alert(1)",
      "http://www.gov.br/a",
      "https://www.gov.br.evil.test/a",
      "https://localhost/a",
      "https://usuario@www.gov.br/a",
      "https://www.gov.br:8080/a",
      "https://www.gov.br/a\n",
      "x".repeat(2050)
    ])
      expect(officialWebUrl(value)).toBeUndefined();
    expect(officialWebUrl(url)).toBe(url);
    expect(splitMessageText("Fonte [1](" + url + ") e **teste**")).toContainEqual({
      text: "1",
      bold: false,
      href: url
    });
    expect(
      splitMessageText("<script>alert(1)</script> [x](javascript:alert(1))")
        .map((item) => item.text)
        .join("")
    ).toContain("<script>");
    expect(splitMessageText("[x](https://evil.test/a)").some((item) => item.href)).toBe(false);
  });
  it("AC-6507: falha não usa fallback pago nem expõe erro remoto", async () => {
    const gateway = createDemoWebResearchGateway({
      run: async () => {
        throw new Error("CANARIO_PRIVADO");
      }
    });
    await expect(gateway.generate(input)).rejects.toMatchObject({ code: "web_search_unavailable" });
  });
});
