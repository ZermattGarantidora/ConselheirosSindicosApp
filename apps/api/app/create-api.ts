import Fastify, { type FastifyInstance } from "fastify";

import { createCondominiumId } from "../core/condominium-scope.js";
import {
  AccessDeniedError,
  createUserId,
  resolveAuthorizedCondominiumContext,
  type MembershipRepository
} from "../identity/authorized-condominium-context.js";

export type CreateApiOptions = Readonly<{
  membershipRepository: MembershipRepository;
  now?: () => Date;
  version?: string;
}>;

export function createApi(options: CreateApiOptions): FastifyInstance {
  const app = Fastify({ logger: false });
  const now = options.now ?? (() => new Date());
  const version = options.version ?? "0.1.0";

  app.get("/health", async () => ({ status: "ok", version }));

  app.get<{ Params: { condominiumId: string }; Headers: { "x-development-user-id"?: string } }>(
    "/v1/condominiums/:condominiumId/context",
    async (request, reply) => {
      try {
        const userId = createUserId(request.headers["x-development-user-id"] ?? "");
        const condominiumId = createCondominiumId(request.params.condominiumId);
        const context = await resolveAuthorizedCondominiumContext(options.membershipRepository, {
          userId,
          condominiumId,
          now: now()
        });

        return reply.send({
          condominiumId: context.condominiumId,
          role: context.roleKey,
          permissions: context.permissions
        });
      } catch (error: unknown) {
        if (error instanceof AccessDeniedError) {
          return reply.code(403).send({ message: "Acesso não autorizado." });
        }

        return reply.code(401).send({ message: "Identidade de desenvolvimento inválida." });
      }
    }
  );

  return app;
}
