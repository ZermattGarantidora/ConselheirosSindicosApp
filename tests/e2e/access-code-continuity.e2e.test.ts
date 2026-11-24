import { randomUUID } from "node:crypto";
import { mkdtemp, rm } from "node:fs/promises";
import { tmpdir } from "node:os";
import { basename, dirname, join, resolve } from "node:path";
import type { FastifyInstance } from "fastify";
import { afterEach, describe, expect, it, vi } from "vitest";
import { createApi } from "../../apps/api/app/create-api.js";
import { createInMemoryConversationStore } from "../../apps/api/answers/conversation-store.js";
import { createDevelopmentIdentityRepository } from "../../apps/api/identity/development-identity-repository.js";
import { createLocalAccessCodeService } from "../../apps/api/identity/local-access-code-store.js";
import { createAnswerTelemetry } from "../unit/answer-use-case.test-support.js";

const apps: FastifyInstance[] = [];
const directories: string[] = [];
const welcome = "FICTÍCIO. Como prefere ser chamado?";
const cookieOf = (response: { headers: Record<string, unknown> }) =>
  String(response.headers["set-cookie"]).split(";")[0]!;

async function setup() {
  const directory = await mkdtemp(join(tmpdir(), "alvitra-access-continuity-"));
  directories.push(directory);
  const service = await createLocalAccessCodeService(directory);
  const store = createInMemoryConversationStore();
  let time = new Date("2026-11-09T12:00:00Z");
  const build = (access = service) => {
    const app = createApi({
      membershipRepository: createDevelopmentIdentityRepository(),
      accessCodeAuth: access,
      secureCookies: true,
      now: () => time,
      conversationStore: store,
      setupMessageGateway: {
        generate: async () => ({
          output: {
            answer: welcome,
            answerMode: "abstained",
            citations: [],
            claims: [],
            attentionPoints: [],
            suggestedNextStep: null,
            specialist: { required: false, type: null, reason: null }
          },
          telemetry: createAnswerTelemetry()
        })
      }
    });
    apps.push(app);
    return app;
  };
  const app = build();
  const code = await service.provision("sindico-demo");
  const login = (target: FastifyInstance, accessCode = code) =>
    target.inject({ method: "POST", url: "/v1/access/login", payload: { code: accessCode } });
  return {
    directory,
    service,
    store,
    app,
    code,
    build,
    login,
    advanceTo: (value: string) => {
      time = new Date(value);
    }
  };
}

afterEach(async () => {
  await Promise.all(apps.splice(0).map((app) => app.close()));
  for (const directory of directories.splice(0)) {
    expect(resolve(dirname(directory))).toBe(resolve(tmpdir()));
    expect(basename(directory)).toMatch(/^alvitra-access-continuity-/u);
    await rm(directory, { recursive: true, force: true });
  }
});

describe("Spec 068 — acesso lembrado e histórico da conta sem WhatsApp", () => {
  it("AC-6817: recria API/cofre e renova sessão antiga sem pedir código nem usar IP", async () => {
    const fixture = await setup();
    const first = await fixture.login(fixture.app);
    expect(first.statusCode).toBe(200);
    const cookie = cookieOf(first);
    await fixture.app.close();
    fixture.advanceTo("2028-11-09T12:00:00Z");
    const restoredService = await createLocalAccessCodeService(fixture.directory);
    const login = vi.spyOn(restoredService, "login");
    const restored = fixture.build(restoredService);
    const response = await restored.inject({
      url: "/v1/access/session",
      headers: { cookie },
      remoteAddress: "203.0.113.77"
    });
    expect(response.statusCode).toBe(200);
    expect(response.json()).toEqual({ userId: "sindico-demo" });
    expect(response.headers["set-cookie"]).toContain("Max-Age=34560000; Secure");
    expect(login).not.toHaveBeenCalled();
    const failed = vi
      .spyOn(restoredService, "authenticate")
      .mockRejectedValueOnce(new Error("FICTICIO-PRIVADO"));
    const unavailable = await restored.inject({ url: "/v1/access/session", headers: { cookie } });
    expect(unavailable.statusCode).toBe(503);
    expect(unavailable.headers["set-cookie"]).toBeUndefined();
    expect(unavailable.body).not.toContain("FICTICIO-PRIVADO");
    failed.mockRestore();
    expect(
      (await restored.inject({ url: "/v1/access/session", headers: { cookie } })).statusCode
    ).toBe(200);
    expect(login).not.toHaveBeenCalled();
  });

  it("AC-6818/6820: segundo aparelho vê as falas originais e logout não apaga histórico", async () => {
    const { app, service, login } = await setup();
    const first = cookieOf(await login(app));
    const second = cookieOf(await login(app));
    expect(first).not.toBe(second);
    const opening = await app.inject({
      method: "POST",
      url: "/v1/chat/setup-message",
      headers: { cookie: first, "x-conversation-request-id": randomUUID() },
      payload: { stage: "welcome" }
    });
    expect(opening.statusCode).toBe(200);
    expect(opening.json().message).toBe(welcome);
    const chatId = randomUUID();
    expect(
      (
        await app.inject({
          method: "POST",
          url: `/v1/condominiums/alameda/chats/${chatId}/setup-history`,
          headers: { cookie: first },
          payload: {}
        })
      ).statusCode
    ).toBe(204);
    const question = await app.inject({
      method: "POST",
      url: "/v1/condominiums/alameda/questions",
      headers: { cookie: first, "x-conversation-request-id": randomUUID() },
      payload: { chatId, question: "Olá" }
    });
    expect(question.statusCode).toBe(200);
    const url = `/v1/condominiums/alameda/chats/${chatId}/messages`;
    const fromSecond = await app.inject({ url, headers: { cookie: second } });
    expect(fromSecond.statusCode).toBe(200);
    const page = fromSecond.json();
    // This adapter proves cross-device access and the journal contract, not process durability.
    expect(page.durable).toBe(false);
    expect(
      page.entries.flatMap((entry: { messages: { role: string; text: string }[] }) =>
        entry.messages.map(({ role, text }) => ({ role, text }))
      )
    ).toEqual([
      { role: "assistant", text: welcome },
      { role: "user", text: "Olá" },
      { role: "assistant", text: question.json().answer }
    ]);
    expect(
      (await app.inject({ method: "POST", url: "/v1/access/logout", headers: { cookie: first } }))
        .statusCode
    ).toBe(204);
    expect(
      (await app.inject({ url: "/v1/access/session", headers: { cookie: first } })).statusCode
    ).toBe(401);
    expect((await app.inject({ url, headers: { cookie: second } })).json()).toEqual(page);
    const third = cookieOf(await login(app));
    expect((await app.inject({ url, headers: { cookie: third } })).json()).toEqual(page);
    const otherCode = await service.provision("morador-alameda-demo");
    const other = cookieOf(await login(app, otherCode));
    expect((await app.inject({ url, headers: { cookie: other } })).statusCode).toBe(404);
    const withoutCookie = await app.inject({
      url,
      headers: { "x-development-user-id": "sindico-demo" }
    });
    expect(withoutCookie.statusCode).toBe(401);
    expect(withoutCookie.body).not.toContain(welcome);
  });

  it("AC-6819: falha de gravação não confirma fala; retentativa aparece uma vez no outro aparelho", async () => {
    const { app, store, login } = await setup();
    const first = cookieOf(await login(app));
    const second = cookieOf(await login(app));
    const chatId = randomUUID();
    expect(
      (
        await app.inject({
          method: "POST",
          url: "/v1/condominiums/alameda/chats",
          headers: { cookie: first },
          payload: { id: chatId, title: "Conversa FICTÍCIA" }
        })
      ).statusCode
    ).toBe(201);
    const failure = vi
      .spyOn(store, "append")
      .mockRejectedValueOnce(new Error("FICTICIO-FALHA-NA-GRAVACAO"));
    const request = {
      method: "POST" as const,
      url: "/v1/condominiums/alameda/questions",
      headers: { cookie: first, "x-conversation-request-id": randomUUID() },
      payload: { chatId, question: "Olá" }
    };
    const failed = await app.inject(request);
    expect(failed.statusCode).toBe(503);
    expect(failed.body).not.toContain("FICTICIO-FALHA-NA-GRAVACAO");
    const url = `/v1/condominiums/alameda/chats/${chatId}/messages`;
    expect((await app.inject({ url, headers: { cookie: second } })).json().entries).toEqual([]);
    failure.mockRestore();
    const saved = await app.inject(request);
    expect(saved.statusCode).toBe(200);
    expect((await app.inject(request)).json()).toEqual(saved.json());
    const page = (await app.inject({ url, headers: { cookie: second } })).json();
    expect(page.entries).toHaveLength(1);
    expect(page.entries[0].messages.map((message: { text: string }) => message.text)).toEqual([
      "Olá",
      saved.json().answer
    ]);
  });
});
