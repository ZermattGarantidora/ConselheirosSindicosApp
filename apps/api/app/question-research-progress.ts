import type { FastifyReply, FastifyInstance } from "fastify";
import { Readable } from "node:stream";

const startedReplies = new WeakSet<FastifyReply>();

/** Executar depois do journal: só confirmar o corpo após a gravação normal. */
export function registerQuestionResearchProgress(app: FastifyInstance): void {
  app.addHook("onSend", async (_request, reply, payload) => {
    if (!startedReplies.has(reply) || typeof payload !== "string") return payload;
    return Readable.from([
      JSON.stringify({ statusCode: reply.statusCode, body: JSON.parse(payload) })
    ]);
  });
}

/** Cabeçalhos antecipados sinalizam início real; o corpo final continua único. */
export function questionResearchProgress(reply: FastifyReply, negotiated: boolean) {
  let started = false;
  return {
    start() {
      if (!negotiated || started || reply.raw.destroyed || reply.raw.headersSent) return;
      started = true;
      startedReplies.add(reply);
      reply.raw.writeHead(200, {
        "content-type": "application/json; charset=utf-8",
        "cache-control": "private, no-store",
        "x-content-type-options": "nosniff",
        "x-alvitra-progress": "internet"
      });
      reply.raw.flushHeaders();
      // Um byte JSON neutro também faz proxies locais encaminharem os cabeçalhos.
      reply.raw.write(" ");
    },
    send(statusCode: number, body: unknown) {
      return reply.code(statusCode).send(body);
    }
  };
}
