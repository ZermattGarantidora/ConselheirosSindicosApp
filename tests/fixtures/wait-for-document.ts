import type { FastifyInstance } from "fastify";
import { expect } from "vitest";

export async function expectDocumentReady(
  app: FastifyInstance,
  documentVersionId: string,
  condominiumId = "alameda",
  headers: Readonly<Record<string, string>> = { "x-development-user-id": "sindico-demo" }
): Promise<void> {
  await expect
    .poll(
      async () => {
        const catalog = await app.inject({
          method: "GET",
          url: `/v1/condominiums/${condominiumId}/documents`,
          headers
        });
        expect(catalog.statusCode).toBe(200);
        return catalog
          .json()
          .documents.find(
            (document: { documentVersionId: string }) =>
              document.documentVersionId === documentVersionId
          );
      },
      { timeout: 5000 }
    )
    .toMatchObject({ documentVersionId, processingStatus: "ready" });
}
