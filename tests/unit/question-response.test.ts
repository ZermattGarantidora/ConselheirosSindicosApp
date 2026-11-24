import { describe, it, expect, vi } from "vitest";
import { readQuestionResponse } from "../../apps/web/question-response.js";
const answer = {
  answerId: "answer-synthetic",
  questionId: "question-synthetic",
  answer: "Orientação pública sintética."
};
describe("AC-6509 — progresso de pesquisa antes da resposta", () => {
  it("avisa ao receber cabeçalhos e aguarda o corpo final", async () => {
    const started = vi.fn();
    let release!: (value: unknown) => void;
    const body = new Promise((resolve) => {
      release = resolve;
    });
    const response = {
      headers: new Headers({ "x-alvitra-progress": "internet" }),
      status: 200,
      json: () => body
    } as Response;
    let finished = false;
    const pending = readQuestionResponse(response, started).then((result) => {
      finished = true;
      return result;
    });
    expect(started).toHaveBeenCalledTimes(1);
    expect(finished).toBe(false);
    release({ statusCode: 200, body: answer });
    await expect(pending).resolves.toEqual(answer);
  });
  it("consulta comum conserva JSON normal e não mostra pesquisa", async () => {
    const started = vi.fn();
    await expect(readQuestionResponse(Response.json(answer), started)).resolves.toEqual(answer);
    expect(started).not.toHaveBeenCalled();
  });
  it.each([null, {}, { statusCode: 999, body: answer }, { statusCode: 200, body: {} }])(
    "recusa envelope incompleto: %j",
    async (body) => {
      await expect(
        readQuestionResponse(
          Response.json(body, { headers: { "x-alvitra-progress": "internet" } }),
          () => {}
        )
      ).rejects.toThrow();
    }
  );
  it("preserva erro posterior ao início em vez de simular resposta", async () => {
    await expect(
      readQuestionResponse(
        Response.json(
          { statusCode: 403, body: { message: "Acesso não autorizado." } },
          { headers: { "x-alvitra-progress": "internet" } }
        ),
        () => {}
      )
    ).rejects.toThrow("Acesso não autorizado");
    await expect(
      readQuestionResponse(
        Response.json({ message: "Falha temporária" }, { status: 503 }),
        () => {}
      )
    ).rejects.toThrow("Falha temporária");
  });
  it("recusa corpo interrompido sem fabricar uma resposta", async () => {
    const response = {
      headers: new Headers({ "x-alvitra-progress": "internet" }),
      status: 200,
      json: async () => {
        throw new DOMException("Interrompido", "AbortError");
      }
    } as unknown as Response;
    await expect(readQuestionResponse(response, () => {})).rejects.toMatchObject({
      name: "AbortError"
    });
  });
});
