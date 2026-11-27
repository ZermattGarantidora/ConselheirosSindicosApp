import type { Pool } from "pg";
import { describe, expect, it, vi } from "vitest";
import { createRuntimeIdentityQueryPool } from "../../apps/api/identity/postgres-runtime-query.js";

const statement = "SELECT * FROM app.find_access_code($1)";
function fixture(failAt?: string, rollbackFails = false) {
  const error = Object.assign(new Error("synthetic database failure"), { code: "23505" });
  let active = false;
  let role = false;
  const result = { rows: [{ user_id: "synthetic-user" }] };
  const client = {
    query: vi.fn<(sql: string, values?: unknown[]) => Promise<typeof result>>(async (sql) => {
      if (sql === failAt || (sql === "ROLLBACK" && rollbackFails)) throw error;
      if (sql === "BEGIN") active = true;
      if (sql === "SET LOCAL ROLE app_runtime") {
        if (!active) throw new Error("transaction required");
        role = true;
      }
      if (sql === statement && (!active || !role))
        throw new Error("permission denied for schema app");
      if (sql === "COMMIT" || sql === "ROLLBACK") active = role = false;
      return result;
    }),
    release: vi.fn()
  };
  const connect = vi.fn(async () => client);
  const pool = { connect } as unknown as Pick<Pool, "connect">;
  return { executor: createRuntimeIdentityQueryPool(pool), client, connect, error, result };
}

describe("AC-7810 — consultas de identidade com login NOINHERIT", () => {
  it("executa com papel local e devolve os parâmetros/resultado sem transformá-los", async () => {
    const f = fixture();
    await expect(f.client.query(statement, ["synthetic-hash"])).rejects.toThrow(
      "permission denied for schema app"
    );
    f.client.query.mockClear();
    expect(await f.executor.query(statement, ["synthetic-hash"])).toBe(f.result);
    expect(f.client.query.mock.calls).toEqual([
      ["BEGIN"],
      ["SET LOCAL ROLE app_runtime"],
      [statement, ["synthetic-hash"]],
      ["COMMIT"]
    ]);
    expect(f.client.release).toHaveBeenCalledExactlyOnceWith(false);
  });

  it.each(["BEGIN", "SET LOCAL ROLE app_runtime", statement, "COMMIT"])(
    "erro em %s preserva o erro original, reverte e libera uma vez",
    async (failAt) => {
      const f = fixture(failAt);
      await expect(f.executor.query(statement)).rejects.toBe(f.error);
      expect(f.error.code).toBe("23505");
      expect(f.client.query.mock.calls.at(-1)).toEqual(["ROLLBACK"]);
      expect(f.client.release).toHaveBeenCalledExactlyOnceWith(false);
      if (failAt === "BEGIN" || failAt === "SET LOCAL ROLE app_runtime")
        expect(f.client.query.mock.calls.map(([sql]) => sql)).not.toContain(statement);
    }
  );

  it("rollback falho descarta a conexão sem mascarar o erro original", async () => {
    const f = fixture(statement, true);
    await expect(f.executor.query(statement)).rejects.toBe(f.error);
    expect(f.client.release).toHaveBeenCalledExactlyOnceWith(true);
  });

  it("conexão indisponível não executa SQL nem faz retry", async () => {
    const f = fixture();
    f.connect.mockRejectedValue(f.error);
    await expect(f.executor.query(statement)).rejects.toBe(f.error);
    expect(f.connect).toHaveBeenCalledOnce();
    expect(f.client.query).not.toHaveBeenCalled();
    expect(f.client.release).not.toHaveBeenCalled();
  });

  it("não confirma resultado antes do COMMIT nem libera a conexão antecipadamente", async () => {
    const f = fixture();
    let commit: () => void;
    const committed = new Promise<void>((resolve) => {
      commit = resolve;
    });
    const query = f.client.query.getMockImplementation()!;
    f.client.query.mockImplementation(async (sql, values) => {
      if (sql === "COMMIT") await committed;
      return query(sql, values);
    });
    let settled = false;
    const pending = f.executor.query(statement).then((result) => {
      settled = true;
      return result;
    });
    await vi.waitFor(() => expect(f.client.query).toHaveBeenCalledWith("COMMIT"));
    expect(settled).toBe(false);
    expect(f.client.release).not.toHaveBeenCalled();
    commit!();
    expect(await pending).toBe(f.result);
    expect(f.client.release).toHaveBeenCalledOnce();
  });

  it("consultas concorrentes reservam conexões e transações próprias", async () => {
    const first = fixture();
    const second = fixture();
    const connect = vi
      .fn()
      .mockResolvedValueOnce(first.client)
      .mockResolvedValueOnce(second.client);
    const executor = createRuntimeIdentityQueryPool({ connect } as unknown as Pick<
      Pool,
      "connect"
    >);
    await Promise.all([
      executor.query(statement, ["first"]),
      executor.query(statement, ["second"])
    ]);
    expect(connect).toHaveBeenCalledTimes(2);
    for (const [index, f] of [first, second].entries()) {
      expect(f.client.query.mock.calls.map(([sql]) => sql)).toEqual([
        "BEGIN",
        "SET LOCAL ROLE app_runtime",
        statement,
        "COMMIT"
      ]);
      expect(f.client.query).toHaveBeenCalledWith(statement, [index === 0 ? "first" : "second"]);
      expect(f.client.release).toHaveBeenCalledExactlyOnceWith(false);
    }
  });
});
