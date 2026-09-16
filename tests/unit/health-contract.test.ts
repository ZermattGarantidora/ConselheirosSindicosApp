import { readFile } from "node:fs/promises";

import { describe, expect, it } from "vitest";

describe("contrato HTTP de saúde", () => {
  it("declara uma resposta de sucesso versionada, com provedor de IA, e um estado indisponível", async () => {
    const raw = await readFile("contracts/http/health.openapi.json", "utf8");
    const contract: unknown = JSON.parse(raw);

    expect(contract).toMatchObject({
      openapi: "3.1.0",
      info: { version: "0.1.0" },
      paths: {
        "/health": {
          get: {
            operationId: "getHealth",
            responses: {
              "200": { description: "Aplicação disponível" },
              "503": { description: "Dependência indisponível" }
            }
          }
        }
      }
    });
    expect(contract).toMatchObject({
      paths: {
        "/health": {
          get: {
            responses: {
              "200": {
                content: {
                  "application/json": {
                    schema: { required: expect.arrayContaining(["aiProvider"]) }
                  }
                }
              }
            }
          }
        }
      }
    });
  });
});
