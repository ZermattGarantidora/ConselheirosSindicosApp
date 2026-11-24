import type { FastifyError, FastifyInstance, FastifyReply, FastifyRequest } from "fastify";
import { accessCookie, readAccessCookie, type AccessCodeService } from "../identity/access-code.js";

export function registerAccessCodeRoutes(
  app: FastifyInstance,
  service: AccessCodeService,
  secure: boolean,
  now: () => Date
) {
  const errorHandler = (error: FastifyError, _request: FastifyRequest, reply: FastifyReply) => {
    const malformed =
      error.statusCode === 400 || error.statusCode === 413 || error.statusCode === 415;
    return reply.code(malformed ? error.statusCode! : 503).send({
      message: malformed
        ? "Código de acesso inválido."
        : "O acesso está temporariamente indisponível. Tente novamente."
    });
  };
  app.addHook("onRequest", async (request, reply) => {
    if (request.url.split("?")[0]?.startsWith("/v1/access/")) {
      reply.header("cache-control", "no-store");
      if (request.headers["sec-fetch-site"] === "cross-site")
        return reply.code(403).send({ message: "Acesso inválido." });
    }
  });
  const authenticate = (request: FastifyRequest) =>
    service.authenticate(readAccessCookie(request.headers.cookie));
  app.post<{ Body: unknown }>(
    "/v1/access/login",
    {
      bodyLimit: 1024,
      errorHandler,
      onRequest: async (request, reply) => {
        const decision = await service.consumeLoginAttempt(request.ip, now());
        if (!decision.allowed)
          return reply
            .header("retry-after", String(decision.retryAfterSeconds))
            .code(429)
            .send({ message: "Muitas tentativas. Aguarde alguns minutos e tente novamente." });
      }
    },
    async (request, reply) => {
      const input =
        request.body && typeof request.body === "object" && "code" in request.body
          ? request.body.code
          : undefined;
      const session = await service.login(input);
      if (!session)
        return reply
          .code(401)
          .send({ message: "Código de acesso inválido. Confira o código fornecido pela equipe." });
      return reply
        .header("set-cookie", accessCookie(session.token, secure))
        .send({ userId: session.userId });
    }
  );
  app.get("/v1/access/session", { errorHandler }, async (request, reply) => {
    const credential = await authenticate(request);
    if (!credential) return reply.code(401).send({ message: "Entre com seu código de acesso." });
    return reply
      .header("set-cookie", accessCookie(readAccessCookie(request.headers.cookie)!, secure))
      .send({ userId: credential.userId });
  });
  app.get("/v1/access/code", { errorHandler }, async (request, reply) => {
    const credential = await authenticate(request);
    const code = credential && (await service.ownCode(credential));
    if (!code) return reply.code(401).send({ message: "Entre com seu código de acesso." });
    return reply.send({ code });
  });
  app.post("/v1/access/logout", { errorHandler }, async (request, reply) => {
    await service.logout(readAccessCookie(request.headers.cookie));
    return reply.header("set-cookie", accessCookie("", secure)).code(204).send();
  });
}
