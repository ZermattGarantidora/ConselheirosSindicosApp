import { describe, expect, it, vi } from "vitest";
import {
  createApiOperationControl,
  deniedApiOperationControl,
  type ApiOperation
} from "../../apps/api/app/operation-control.js";
import {
  budgetDigest,
  mutateBudgetLedger,
  type BudgetLedger,
  type OperationBudgetStore
} from "../../apps/api/security/operation-budget.js";

const revision = budgetDigest("synthetic-policy");
const userId = "11111111-1111-4111-8111-111111111111";
const condominiumId = "22222222-2222-4222-8222-222222222222";
const input: ApiOperation = {
  scope: { kind: "tenant", userId, condominiumId, membershipRevision: "synthetic-v1" },
  kind: "question",
  requestKey: "synthetic-attempt",
  payload: { question: "Pergunta inteiramente fictícia" },
  revalidate: async () => true
};
function fixture() {
  const state: BudgetLedger = {
    policy: {
      enabled: true,
      revision,
      currency: "USD",
      scopeDailyCost: 20,
      globalDailyCost: 20,
      scopeDailyOperations: 3,
      globalDailyOperations: 3,
      scopeConcurrent: 1,
      globalConcurrent: 1
    },
    receipts: []
  };
  const store: OperationBudgetStore = {
    mutate: async (action, request, details) =>
      mutateBudgetLedger(
        state,
        action,
        request,
        details ?? {},
        new Date("2026-11-09T12:00:00.000Z")
      )
  };
  const options = {
    store,
    policyRevision: revision,
    maximumCostMicrounits: { setup: 10, question: 10, upload: 0 }
  };
  return {
    state,
    options,
    control: createApiOperationControl({ ...options, authorize: async () => true })
  };
}
describe("AC-7119 — admissão operacional de API", () => {
  it("AC-7125: replay só consulta política/escopo atuais, sem reserva, geração ou novo custo", async () => {
    const { control, options, state } = fixture();
    const proof = control.replayProof!(input);
    expect(await control.authorizeReplay!(proof, async () => true)).toBe(true);
    expect(await control.authorizeReplay!(proof, async () => false)).toBe(false);
    const changed = createApiOperationControl({
      ...options,
      policyRevision: budgetDigest("synthetic-changed"),
      authorize: async () => true
    });
    expect(await changed.authorizeReplay!(proof, async () => true)).toBe(false);
    const revoked = createApiOperationControl({ ...options, authorize: async () => false });
    expect(await revoked.authorizeReplay!(proof, async () => true)).toBe(false);
    const failed = createApiOperationControl({
      ...options,
      authorize: async () => {
        throw new Error("FICTICIO");
      }
    });
    expect(await failed.authorizeReplay!(proof, async () => true)).toBe(false);
    expect(state.receipts).toEqual([]);
  });
  it("default e startup negam, sem consumir ou executar", async () => {
    const { options, state } = fixture(),
      operation = vi.fn();
    await expect(
      createApiOperationControl(options).execute(input, operation)
    ).rejects.toMatchObject({ code: "denied" });
    await expect(deniedApiOperationControl.execute(input, operation)).rejects.toMatchObject({
      code: "denied"
    });
    expect(state.receipts).toEqual([]);
    expect(operation).not.toHaveBeenCalled();
  });
  it("reserva e conclui antes do retorno, com recibo sem payload; repetição não executa", async () => {
    const { control, state } = fixture();
    const operation = vi.fn(async () => {
      expect(state.receipts[0]?.state).toBe("started");
      return "FALA-FICTICIA-PRIVADA";
    });
    expect(await control.execute(input, operation)).toBe("FALA-FICTICIA-PRIVADA");
    expect(state.receipts[0]?.state).toBe("completed");
    await expect(control.execute(input, operation)).rejects.toMatchObject({
      code: "already_completed"
    });
    expect(operation).toHaveBeenCalledOnce();
    expect(JSON.stringify(state)).not.toContain("FALA-FICTICIA-PRIVADA");
  });
  it.each(["payload", "revision", "membership"])(
    "%s alterado não contorna a mesma identidade",
    async (kind) => {
      const { control, options, state } = fixture();
      const operation = vi.fn(async () => "fictício");
      await control.execute(input, operation);
      const changed = {
        ...input,
        ...(kind === "payload"
          ? { payload: "outro" }
          : kind === "membership"
            ? {
                scope: {
                  kind: "tenant" as const,
                  userId,
                  condominiumId,
                  membershipRevision: "synthetic-v2"
                }
              }
            : {})
      };
      const candidate =
        kind === "revision"
          ? createApiOperationControl({
              ...options,
              policyRevision: budgetDigest("synthetic-v2"),
              authorize: async () => true
            })
          : control;
      await expect(candidate.execute(changed, operation)).rejects.toHaveProperty("code");
      expect(state.receipts).toHaveLength(1);
      expect(operation).toHaveBeenCalledOnce();
    }
  );
  it("revogação depois do trabalho retém recibo e não entrega resultado", async () => {
    const { control, state } = fixture();
    let permitted = true;
    await expect(
      control.execute({ ...input, revalidate: async () => permitted }, async () => {
        permitted = false;
        return "privado";
      })
    ).rejects.toMatchObject({ code: "denied" });
    expect(state.receipts[0]?.state).toBe("completed");
  });
  it("falha após claim fica desconhecida e não executa novamente", async () => {
    const { control, state } = fixture();
    const operation = vi.fn(async () => {
      throw new Error("FICTICIO-PRIVADO");
    });
    await expect(control.execute(input, operation)).rejects.toMatchObject({ code: "unavailable" });
    await expect(control.execute(input, operation)).rejects.toMatchObject({ code: "unknown" });
    expect(state.receipts[0]?.state).toBe("unknown");
    expect(operation).toHaveBeenCalledOnce();
  });
  it.each(["", "a".repeat(201)])(
    "chave inválida é recusada antes do armazenamento",
    async (requestKey) => {
      const { control, state } = fixture();
      await expect(control.execute({ ...input, requestKey }, vi.fn())).rejects.toMatchObject({
        code: "denied"
      });
      expect(state.receipts).toEqual([]);
    }
  );
});
