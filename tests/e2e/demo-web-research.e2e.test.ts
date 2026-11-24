import { describe, it, expect, vi } from "vitest";
import { randomUUID } from "node:crypto";
import { createServer as createViteServer, type ViteDevServer } from "vite";
import { createApi } from "../../apps/api/app/create-api.js";
import { createDevelopmentIdentityRepository } from "../../apps/api/identity/development-identity-repository.js";
import { createAnswerUseCase } from "../../apps/api/answers/answer-use-case.js";
import { createInMemoryAnswerPersistence } from "../../apps/api/answers/in-memory-answer-persistence.js";
import { createDemoWebResearchGateway } from "../../apps/api/answers/demo-web-research.js";
import { generalAnswer } from "../../apps/api/answers/openai-answer-gateway.js";
import { createAnswerTelemetry } from "../unit/answer-use-case.test-support.js";
import { AccessDeniedError } from "../../apps/api/identity/authorized-condominium-context.js";
import {
  createInMemoryConversationStore,
  ConversationStoreError
} from "../../apps/api/answers/conversation-store.js";
const url = "https://www.gov.br/anpd/pt-br/teste-sintetico";
const stdout = [
  {
    type: "item.completed",
    item: {
      type: "web_search",
      results: [
        { type: "text_result", url, title: "Fonte sintética", snippet: "Texto público sintético." }
      ]
    }
  },
  {
    type: "item.completed",
    item: {
      type: "agent_message",
      text: JSON.stringify({ answer: "Orientação pública sintética [1].", sourceUrls: [url] })
    }
  },
  { type: "turn.completed", usage: { input_tokens: 20, output_tokens: 10 } }
]
  .map((item) => JSON.stringify(item))
  .join("\n");
describe("Spec 065 — conversa pública isolada", () => {
  it("AC-6511: retomada preserva o risco do assunto público original", async () => {
    const app = createApi({
      membershipRepository: createDevelopmentIdentityRepository(),
      answerUseCase: createAnswerUseCase({
        retriever: {
          async search() {
            throw new Error();
          }
        },
        gateway: {
          async generate() {
            throw new Error();
          }
        },
        demoWebResearchGateway: createDemoWebResearchGateway({ run: async () => stdout }),
        persistence: createInMemoryAnswerPersistence()
      })
    });
    const headers = { "x-development-user-id": "sindico-demo", "x-alvitra-progress": "web" };
    const chatId = randomUUID();
    try {
      await app.inject({
        method: "POST",
        url: "/v1/condominiums/alameda/chats",
        headers,
        payload: { id: chatId, title: "Risco sintético de retomada" }
      });
      for (const question of ["Como aplicar a LGPD em condomínios?", "pesquise na internet"]) {
        const response = await app.inject({
          method: "POST",
          url: "/v1/condominiums/alameda/questions",
          headers,
          payload: { chatId, question }
        });
        expect(response.headers["x-alvitra-progress"]).toBe("internet");
        expect(response.json().body.riskClass).toBe("high");
        expect(response.json().body.specialist.required).toBe(true);
      }
    } finally {
      await app.close();
    }
  });
  it("AC-6510/6511: prestador pesquisa automaticamente e pedido curto retoma só a última pergunta autorizada", async () => {
    const source = "https://prestador-ficticio.example.com/caixas";
    const providerEvents = stdout.replaceAll(url, source);
    const run = vi.fn(async (request) => {
      expect(request.input).toContain("Pinhais - PR");
      expect(request.input).not.toContain("CANARIO_PRIVADO");
      expect(request.input).not.toContain("000.000");
      return providerEvents;
    });
    const search = vi.fn(async () => {
      throw new Error("Pesquisa pública não recupera PDFs.");
    });
    const useCase = createAnswerUseCase({
      retriever: { search },
      gateway: {
        async generate() {
          return {
            output: generalAnswer("Qual assunto público você quer consultar?"),
            telemetry: createAnswerTelemetry()
          };
        }
      },
      demoWebResearchGateway: createDemoWebResearchGateway({ run }),
      persistence: createInMemoryAnswerPersistence()
    });
    const app = createApi({
      membershipRepository: createDevelopmentIdentityRepository(),
      answerUseCase: useCase
    });
    const chatId = randomUUID(),
      otherChatId = randomUUID();
    const headers = { "x-development-user-id": "sindico-demo", "x-alvitra-progress": "web" };
    const route = "/v1/condominiums/alameda";
    try {
      for (const id of [chatId, otherChatId])
        expect(
          (
            await app.inject({
              method: "POST",
              url: route + "/chats",
              headers,
              payload: { id, title: "Regressão sintética de prestador" }
            })
          ).statusCode
        ).toBe(201);
      const ask = (question: string, id = chatId, user = "sindico-demo") =>
        app.inject({
          method: "POST",
          url: route + "/questions",
          headers: { ...headers, "x-development-user-id": user },
          payload: { chatId: id, question }
        });
      const first = await ask(
        "Indique empresas de limpeza de caixa d’água em Pinhais PR. CANARIO_PRIVADO 000.000.000-00"
      );
      expect(first.headers["x-alvitra-progress"]).toBe("internet");
      expect(first.json().body.answer).toContain(source);
      const continued = await ask("pesquise na internet");
      expect(continued.headers["x-alvitra-progress"]).toBe("internet");
      expect(continued.json().body.answer).toContain(source);
      expect(run).toHaveBeenCalledTimes(2);
      expect(search).not.toHaveBeenCalled();
      const unrelated = await ask("Olá, mudando de assunto.");
      expect(unrelated.headers["x-alvitra-progress"]).toBeUndefined();
      const afterBoundary = await ask("pesquise na internet");
      expect(afterBoundary.headers["x-alvitra-progress"]).toBeUndefined();
      expect(afterBoundary.json().answer).not.toContain("Não foi possível");
      const other = await ask("pesquise na internet", otherChatId);
      expect(other.headers["x-alvitra-progress"]).toBeUndefined();
      const denied = await ask("pesquise na internet", chatId, "sem-associacao");
      expect(denied.statusCode).toBe(403);
      expect(run).toHaveBeenCalledTimes(2);
    } finally {
      await app.close();
    }
  });
  it("AC-6502/6509: pergunta normal inicia pesquisa, avisa antes do corpo e repetição salva não simula busca", async () => {
    let release!: () => void;
    const gate = new Promise<void>((resolve) => {
      release = resolve;
    });
    const run = vi.fn(async (request) => {
      expect(request.input).not.toContain("CANARIO_PRIVADO");
      await gate;
      return stdout;
    });
    const search = vi.fn(async () => {
      throw new Error("Não recuperar documentos para tópico público.");
    });
    const persistence = createInMemoryAnswerPersistence();
    const useCase = createAnswerUseCase({
      retriever: { search },
      gateway: {
        async generate() {
          return { output: generalAnswer("Olá!"), telemetry: createAnswerTelemetry() };
        }
      },
      demoWebResearchGateway: createDemoWebResearchGateway({ run }),
      persistence
    });
    const app = createApi({
      membershipRepository: createDevelopmentIdentityRepository(),
      answerUseCase: useCase
    });
    let proxy: ViteDevServer | undefined;
    try {
      const apiOrigin = await app.listen({ host: "127.0.0.1", port: 0 });
      proxy = await createViteServer({
        configFile: false,
        envDir: false,
        appType: "custom",
        logLevel: "silent",
        cacheDir: ".local/web-automatic-2026-11-04/vite-cache",
        optimizeDeps: { noDiscovery: true },
        server: {
          host: "127.0.0.1",
          port: 0,
          watch: null,
          hmr: false,
          proxy: { "/v1": { target: apiOrigin } }
        }
      });
      await proxy.listen();
      const origin = proxy.resolvedUrls!.local[0]!.replace(/\/$/u, "");
      const chatId = randomUUID();
      expect(
        (
          await app.inject({
            method: "POST",
            url: "/v1/condominiums/alameda/chats",
            headers: { "x-development-user-id": "sindico-demo" },
            payload: { id: chatId, title: "Pesquisa automática sintética" }
          })
        ).statusCode
      ).toBe(201);
      const headers = {
        "content-type": "application/json",
        "x-development-user-id": "sindico-demo",
        "x-alvitra-progress": "web",
        "idempotency-key": "automatic-public-once",
        "x-conversation-request-id": "automatic-public-once",
        "x-conversation-condominium-id": "alameda",
        "x-conversation-chat-id": chatId
      };
      const payload = {
        question: "Quais são as regras atuais para assembleias virtuais? CANARIO_PRIVADO",
        chatId
      };
      const response = await fetch(origin + "/v1/condominiums/alameda/questions", {
        method: "POST",
        headers,
        body: JSON.stringify(payload),
        signal: AbortSignal.timeout(10000)
      });
      expect(response.headers.get("x-alvitra-progress")).toBe("internet");
      expect(response.headers.get("cache-control")).toContain("no-store");
      let bodyFinished = false;
      const body = response.json().then((value) => {
        bodyFinished = true;
        return value;
      });
      expect(bodyFinished).toBe(false);
      release();
      const result = await body;
      expect(result.statusCode).toBe(200);
      expect(result.body.answer).toContain("[Fonte 1](" + url + ")");
      expect(search).not.toHaveBeenCalled();
      expect(run).toHaveBeenCalledTimes(1);
      const history = (
        await app.inject({ url: `/v1/condominiums/alameda/chats/${chatId}/messages`, headers })
      ).json();
      const messages = history.entries.flatMap((entry: { messages: { text: string }[] }) =>
        entry.messages.map((message) => message.text)
      );
      expect(messages).toContain(payload.question);
      expect(messages).toContain(result.body.answer);
      expect(messages).not.toContain("Pesquisando na internet");
      const repeated = await fetch(origin + "/v1/condominiums/alameda/questions", {
        method: "POST",
        headers,
        body: JSON.stringify(payload)
      });
      expect(repeated.headers.get("x-alvitra-progress")).toBeNull();
      expect((await repeated.json()).answerId).toBe(result.body.answerId);
      expect(run).toHaveBeenCalledTimes(1);
      const normal = await fetch(origin + "/v1/condominiums/alameda/questions", {
        method: "POST",
        headers: {
          ...headers,
          "x-conversation-request-id": "normal-public-test",
          "idempotency-key": "normal-public-test"
        },
        body: JSON.stringify({ question: "Olá!", chatId })
      });
      expect(normal.headers.get("x-alvitra-progress")).toBeNull();
      await normal.json();
      const denied = await fetch(origin + "/v1/condominiums/alameda/questions", {
        method: "POST",
        headers: { ...headers, "x-development-user-id": "sem-associacao" },
        body: JSON.stringify(payload)
      });
      expect(denied.status).toBe(403);
      expect(denied.headers.get("x-alvitra-progress")).toBeNull();
      await denied.json();
    } finally {
      release();
      await proxy?.close();
      await app.close();
    }
  }, 30000);
  it("AC-6509/6506: falha na gravação do journal não confirma resposta após o aviso", async () => {
    const store = createInMemoryConversationStore();
    const app = createApi({
      membershipRepository: createDevelopmentIdentityRepository(),
      conversationStore: {
        ...store,
        async append() {
          throw new ConversationStoreError(503, "Não foi possível salvar a conversa.");
        }
      },
      answerUseCase: createAnswerUseCase({
        retriever: {
          async search() {
            throw new Error();
          }
        },
        gateway: {
          async generate() {
            throw new Error();
          }
        },
        demoWebResearchGateway: createDemoWebResearchGateway({ run: async () => stdout }),
        persistence: createInMemoryAnswerPersistence()
      })
    });
    const chatId = randomUUID();
    const user = { "x-development-user-id": "sindico-demo" };
    try {
      expect(
        (
          await app.inject({
            method: "POST",
            url: "/v1/condominiums/alameda/chats",
            headers: user,
            payload: { id: chatId, title: "Falha sintética de gravação" }
          })
        ).statusCode
      ).toBe(201);
      const response = await app.inject({
        method: "POST",
        url: "/v1/condominiums/alameda/questions",
        headers: {
          ...user,
          "x-alvitra-progress": "web",
          "x-conversation-request-id": "failed-save",
          "x-conversation-condominium-id": "alameda",
          "x-conversation-chat-id": chatId
        },
        payload: { question: "Quais são as regras atuais para assembleias virtuais?", chatId }
      });
      expect(response.headers["x-alvitra-progress"]).toBe("internet");
      expect(response.json()).toEqual({
        statusCode: 503,
        body: {
          message: "Não foi possível salvar ou recuperar a conversa com segurança. Tente novamente."
        }
      });
    } finally {
      await app.close();
    }
  });
  it("AC-6509: erro depois do progresso conserva o status de falha no envelope", async () => {
    const useCase = createAnswerUseCase({
      retriever: {
        async search() {
          throw new Error();
        }
      },
      gateway: {
        async generate() {
          throw new Error();
        }
      },
      persistence: createInMemoryAnswerPersistence()
    });
    const failingUseCase = {
      ...useCase,
      ask: vi.fn<typeof useCase.ask>(async (_context, input) => {
        input.onWebResearchStarted?.();
        throw new AccessDeniedError();
      })
    };
    const app = createApi({
      membershipRepository: createDevelopmentIdentityRepository(),
      answerUseCase: failingUseCase
    });
    try {
      const response = await app.inject({
        method: "POST",
        url: "/v1/condominiums/alameda/questions",
        headers: { "x-development-user-id": "sindico-demo", "x-alvitra-progress": "web" },
        payload: { question: "Quais são os deveres do síndico?" }
      });
      expect(response.headers["x-alvitra-progress"]).toBe("internet");
      expect(response.json()).toEqual({
        statusCode: 403,
        body: { message: "Acesso não autorizado." }
      });
    } finally {
      await app.close();
    }
  });
  it("AC-6503/6506: exclui memória/retrieval, grava ambos os lados, mantém idempotência e autorização", async () => {
    const persistence = createInMemoryAnswerPersistence();
    const search = vi.fn(async () => {
      throw new Error("Não consultar documentos neste teste.");
    });
    const run = vi.fn(async (request) => {
      expect(request.input).not.toContain("CANARIO_PRIVADO");
      return stdout;
    });
    const normal = vi.fn(async () => ({
      output: generalAnswer("Olá, CANARIO_PRIVADO!"),
      telemetry: createAnswerTelemetry()
    }));
    const useCase = createAnswerUseCase({
      retriever: { search },
      gateway: { generate: normal },
      demoWebResearchGateway: createDemoWebResearchGateway({ run }),
      persistence
    });
    const app = createApi({
      membershipRepository: createDevelopmentIdentityRepository(),
      answerUseCase: useCase
    });
    const headers = { "x-development-user-id": "sindico-demo" };
    const chatId = randomUUID();
    const route = "/v1/condominiums/alameda";
    try {
      expect(
        (
          await app.inject({
            method: "POST",
            url: route + "/chats",
            headers,
            payload: { id: chatId, title: "Pesquisa sintética" }
          })
        ).statusCode
      ).toBe(201);
      expect(
        (
          await app.inject({
            method: "POST",
            url: route + "/questions",
            headers,
            payload: { chatId, question: "Olá!" }
          })
        ).statusCode
      ).toBe(200);
      const historySpy = vi.spyOn(persistence, "listConversationHistory");
      const payload = {
        chatId,
        question: "Pesquise na internet sobre assembleias virtuais. CANARIO_PRIVADO"
      };
      const response = await app.inject({
        method: "POST",
        url: route + "/questions",
        headers: { ...headers, "idempotency-key": "web-synthetic-once" },
        payload
      });
      expect(response.statusCode).toBe(200);
      expect(response.json().answer).toContain("[Fonte 1](" + url + ")");
      expect(response.json().answerMode).toBe("abstained");
      expect(search).not.toHaveBeenCalled();
      expect(historySpy).not.toHaveBeenCalled();
      expect(normal).toHaveBeenCalledTimes(1);
      expect(run).toHaveBeenCalledTimes(1);
      const repeat = await app.inject({
        method: "POST",
        url: route + "/questions",
        headers: { ...headers, "idempotency-key": "web-synthetic-once" },
        payload
      });
      expect(repeat.json().answerId).toBe(response.json().answerId);
      expect(run).toHaveBeenCalledTimes(1);
      expect(
        persistence.listAuditEvents().find((event) => event.metadata.memoryReplaySafe === false)
      ).toBeDefined();
      const history = (
        await app.inject({ url: route + "/chats/" + chatId + "/messages", headers })
      ).json();
      const texts = history.entries.flatMap((entry: { messages: { text: string }[] }) =>
        entry.messages.map((message) => message.text)
      );
      expect(texts).toContain(payload.question);
      expect(texts).toContain(response.json().answer);
      expect(
        (
          await app.inject({
            url: route + "/chats/" + chatId + "/messages",
            headers: { "x-development-user-id": "morador-alameda-demo" }
          })
        ).statusCode
      ).toBe(404); // Mesmo condomínio, mas chat privado de outro titular: não revela existência.
      expect(
        (
          await app.inject({
            url: route + "/chats/" + chatId + "/messages",
            headers: { "x-development-user-id": "outro-sintetico" }
          })
        ).statusCode
      ).toBe(403);
    } finally {
      await app.close();
    }
  });
});
