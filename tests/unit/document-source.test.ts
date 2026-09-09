import { describe, expect, it } from "vitest";
import type { Pool, PoolClient } from "pg";

import {
  createDocumentSourceUrl,
  createPostgresDocumentSourceReader
} from "../../apps/api/documents/document-source.js";
import { createCondominiumId } from "../../apps/api/core/condominium-scope.js";
import {
  type AuthorizedCondominiumContext,
  createUserId
} from "../../apps/api/identity/authorized-condominium-context.js";

const condominiumId = createCondominiumId("11111111-1111-4111-8111-111111111111");
const userId = createUserId("22222222-2222-4222-8222-222222222222");
const documentId = "33333333-3333-4333-8333-333333333333";
const documentVersionId = "44444444-4444-4444-8444-444444444444";

const context: AuthorizedCondominiumContext = Object.freeze({
  userId,
  condominiumId,
  roleKey: "manager",
  permissions: Object.freeze(["document:read"] as const),
  membershipRevision: "1"
});

describe("document source reader", () => {
  it("preserves an internal UUID identity when creating the RLS context", async () => {
    const queries: string[] = [];
    const client = {
      query: async (query: string) => {
        queries.push(query);
        if (query.includes("SELECT d.id AS document_id")) {
          return {
            rows: [
              {
                document_id: documentId,
                document_version_id: documentVersionId,
                title: "Convenção",
                page: 3,
                content: "Trecho autorizado."
              }
            ]
          };
        }
        return { rows: [] };
      },
      release: () => undefined
    } as unknown as PoolClient;
    const pool = {
      connect: async () => client
    } as unknown as Pick<Pool, "connect">;

    const source = await createPostgresDocumentSourceReader(pool).getAuthorizedPage(context, {
      documentId,
      documentVersionId,
      page: 3
    });

    expect(source).toMatchObject({ documentId, documentVersionId, page: 3 });
    expect(queries).not.toContain("SELECT app.resolve_user_id($1) AS user_id");
    expect(queries).toContain("SELECT set_config('app.user_id', $1, true)");
    expect(createDocumentSourceUrl(condominiumId, source!)).toContain(documentVersionId);
  });
});
