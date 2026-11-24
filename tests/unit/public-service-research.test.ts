import { describe, it, expect, vi } from "vitest";
import {
  publicWebResearchPlan,
  isBareWebResearchRequest
} from "../../apps/api/answers/public-service-research.js";
import { publicSourceUrl } from "../../apps/shared/demo-web-research.js";
import {
  createDemoWebResearchGateway,
  parseDemoWebResearch
} from "../../apps/api/answers/demo-web-research.js";
import { splitMessageText } from "../../apps/web/message-format.js";

const url = "https://prestador-ficticio.example.com/limpeza-caixas";
const events = [
  {
    type: "item.completed",
    item: {
      type: "web_search",
      results: [
        {
          type: "text_result",
          url,
          title: "Empresa fictícia",
          snippet: "Atendimento sintético em Pinhais."
        }
      ]
    }
  },
  {
    type: "item.completed",
    item: {
      type: "agent_message",
      text: JSON.stringify({
        answer:
          "Empresa fictícia anuncia atendimento em Pinhais. Confirme atendimento e documentação antes de contratar [1].",
        sourceUrls: [url]
      })
    }
  },
  { type: "turn.completed" }
]
  .map((item) => JSON.stringify(item))
  .join("\n");

describe("RQ-6504 — descoberta pública de prestadores", () => {
  it.each([
    "Indique empresas de limpeza de caixa d’água em Pinhais PR. CANARIO_PRIVADO 000.000.000-00 Rua Particular 123",
    "Tem empresa de higienização de caixas de água em Pinhais-PR?",
    "Procure empresas de limpeza de reservatórios de água em Pinhais.",
    "Me indique se há empresas de limpeza de caixa d'água em Pinhais PR."
  ])("AC-6510: exporta só serviço e município canônicos: %s", (question) => {
    expect(publicWebResearchPlan(question)).toEqual({
      sourcePolicy: "providers",
      topic:
        "Empresas de limpeza e higienização de caixas d’água que anunciem atendimento em Pinhais - PR, Brasil."
    });
  });
  it.each([
    "Indique empresa de limpeza de caixa d'água em Cidade CANARIO_PRIVADO PR.",
    "Indique empresa de limpeza de caixa d'água em Palmas.",
    "Indique empresa de limpeza de caixa d'água perto de mim.",
    "Analise o contrato de limpeza de caixa d'água em Pinhais PR.",
    "Não pesquise empresas de limpeza de caixa d'água em Pinhais PR.",
    "Indique empresa de pintura em Pinhais PR.",
    "Tem empresa de limpeza de caixa d'água em Curitiba PR e Pinhais PR?"
  ])("AC-6510: localidade insuficiente, documento ou outro serviço não navega: %s", (question) => {
    expect(publicWebResearchPlan(question)).toBeUndefined();
  });
  it("resolve homônimo com UF e preserva pesquisa oficial", () => {
    expect(
      publicWebResearchPlan("Empresa de limpeza de caixa d'água em Palmas TO")?.topic
    ).toContain("Palmas - TO");
    expect(publicWebResearchPlan("Quais são os deveres do síndico?")?.sourcePolicy).toBe(
      "official"
    );
    expect(isBareWebResearchRequest("pesquise na internet")).toBe(true);
    expect(isBareWebResearchRequest("não pesquise na internet")).toBe(false);
    expect(isBareWebResearchRequest("pesquise na internet sobre outro assunto")).toBe(false);
  });
  it("AC-6512: fonte empresarial observada só é aceita na política de prestadores", () => {
    expect(() => parseDemoWebResearch(events, new Date())).toThrow();
    const unobserved = events.split("\n");
    const searchEvent = JSON.parse(unobserved[0]!);
    searchEvent.item.results[0].url = url + "/outra-pagina";
    unobserved[0] = JSON.stringify(searchEvent);
    expect(() => parseDemoWebResearch(unobserved.join("\n"), new Date(), "providers")).toThrow();
    expect(parseDemoWebResearch(events, new Date(), "providers").answer).toContain(
      `[Fonte 1](${url})`
    );
    expect(splitMessageText(`[Fonte 1](${url})`)).toContainEqual({
      text: "Fonte 1",
      bold: false,
      href: url
    });
    expect(
      splitMessageText(`[Contato](https://wa.me/5511000000000)`).some((item) => item.href)
    ).toBe(false);
  });
  it.each([
    "http://empresa.com.br/",
    "https://localhost/",
    "https://127.0.0.1/",
    "https://[::1]/",
    "https://10.0.0.1/",
    "https://empresa.local/",
    "https://empresa.internal/",
    "https://usuario@empresa.com.br/",
    "https://empresa.com.br:8080/",
    "https://wa.me/5511000000000",
    "https://empresa.com.br/checkout",
    "https://empresa.com.br/?token=segredo",
    "https://empresa.com.br/\n"
  ])("AC-6512: recusa link privado ou de ação: %s", (value) => {
    expect(publicSourceUrl(value)).toBeUndefined();
  });
  it("AC-6510/6512: execução recebe só consulta canônica e não relaxa o modo oficial", async () => {
    const run = vi.fn(async (request) => {
      expect(request.input).not.toContain("CANARIO_PRIVADO");
      expect(request.input).not.toContain("000.000");
      expect(request.input).toContain("Pinhais - PR");
      expect(request.args).toContain('tools.web_search={context_size="low"}');
      expect(request.args).toContain("shell_tool");
      return events;
    });
    const gateway = createDemoWebResearchGateway({ run });
    const result = await gateway.generate({
      question:
        "Indique empresa de limpeza de caixa d'água em Pinhais PR CANARIO_PRIVADO 000.000.000-00",
      task: "grounded_answer",
      riskClass: "low",
      evidence: [],
      budget: { maximumOutputTokens: 800, maximumCostMicrounits: 0 }
    });
    expect(result.telemetry.promptVersion).toBe("demo-web-providers-v1");
    expect(result.output.answer).toContain(url);
    expect(run).toHaveBeenCalledTimes(1);
  });
});
