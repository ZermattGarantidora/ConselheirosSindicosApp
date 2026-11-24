import { beforeEach, describe, expect, it, vi } from "vitest";

const fixture = vi.hoisted(() => ({
  mode: "safe",
  constructors: vi.fn(),
  ends: vi.fn(),
  releases: vi.fn()
}));
vi.mock("pg", () => ({
  Pool: class {
    constructor(configuration: unknown) {
      fixture.constructors(configuration);
    }
    async connect() {
      if (fixture.mode === "connection_failed") throw new Error("connection unavailable");
      return {
        release: fixture.releases,
        async query(sql: string) {
          if (sql.includes("ops_control.environment"))
            return {
              rows:
                fixture.mode === "bad_marker"
                  ? []
                  : [
                      {
                        name: `alvitra_ops_worker_${"a".repeat(32)}`,
                        purpose: "worker",
                        data_policy: "synthetic-local-only"
                      }
                    ]
            };
          if (sql.includes("conselheiro_integration_guard"))
            return { rowCount: fixture.mode === "bad_marker" ? 0 : 1, rows: [] };
          return {
            rows: [
              {
                rolcanlogin: false,
                rolsuper: false,
                rolbypassrls:
                  fixture.mode ===
                  (sql.includes("rolname = 'app_worker'") ? "unsafe_worker" : "unsafe_runtime")
              }
            ]
          };
        }
      };
    }
    async end() {
      fixture.ends();
    }
  }
}));
import { syntheticWorkerDatabase } from "../../scripts/synthetic-worker-database.js";

const neon = {
  NEON_INTEGRATION_DATABASE_URL:
    "postgresql://synthetic:synthetic@synthetic.neon.tech/synthetic?sslmode=verify-full",
  NEON_INTEGRATION_CONFIRMATION: "synthetic-only"
};
const supabase = {
  SUPABASE_INTEGRATION_DATABASE_URL:
    "postgresql://synthetic:synthetic@db.synthetic.supabase.co/postgres?sslmode=verify-full",
  SUPABASE_INTEGRATION_CONFIRMATION: "synthetic-only",
  SUPABASE_INTEGRATION_CA_CERT: "-----BEGIN CERTIFICATE-----\nsynthetic\n-----END CERTIFICATE-----"
};
beforeEach(() => {
  fixture.mode = "safe";
  vi.clearAllMocks();
});

describe("AC-6906/6908 — destino sintético do ensaio separado", () => {
  it("backend local exige marcador próprio e não escolhe credenciais remotas", async () => {
    const local = {
      LOCAL_INTEGRATION_DATABASE_URL: `postgresql://synthetic:synthetic@127.0.0.1:5432/alvitra_ops_worker_${"a".repeat(32)}`,
      LOCAL_INTEGRATION_CONFIRMATION: "synthetic-local-only"
    };
    await (await syntheticWorkerDatabase("local", { ...neon, ...local })).end();
    expect(fixture.constructors).toHaveBeenCalledWith(
      expect.objectContaining({ connectionString: local.LOCAL_INTEGRATION_DATABASE_URL })
    );
    fixture.mode = "bad_marker";
    await expect(syntheticWorkerDatabase("local", local)).rejects.toThrow();
  });
  it("verifica marcador e papéis antes de devolver conexão Neon", async () => {
    const pool = await syntheticWorkerDatabase("neon", neon);
    expect(fixture.releases).toHaveBeenCalledOnce();
    expect(fixture.ends).not.toHaveBeenCalled();
    await pool.end();
    expect(fixture.ends).toHaveBeenCalledOnce();
  });
  it("Supabase usa CA validada e não desativa verificação TLS", async () => {
    const pool = await syntheticWorkerDatabase("supabase", supabase);
    expect(fixture.constructors).toHaveBeenCalledWith(
      expect.objectContaining({
        ssl: { ca: supabase.SUPABASE_INTEGRATION_CA_CERT, rejectUnauthorized: true }
      })
    );
    await pool.end();
  });
  it.each(["bad_marker", "unsafe_runtime", "unsafe_worker", "connection_failed"])(
    "recusa %s e fecha o pool sem devolver destino",
    async (mode) => {
      fixture.mode = mode;
      await expect(syntheticWorkerDatabase("neon", neon)).rejects.toThrow();
      expect(fixture.ends).toHaveBeenCalledOnce();
    }
  );
  it("recusa host/confirmacão/provedor antes de conectar e não tenta outro destino", async () => {
    await expect(syntheticWorkerDatabase("production", { ...neon, ...supabase })).rejects.toThrow();
    await expect(
      syntheticWorkerDatabase("neon", { ...neon, NEON_INTEGRATION_CONFIRMATION: "" })
    ).rejects.toThrow();
    await expect(
      syntheticWorkerDatabase("neon", {
        ...neon,
        NEON_INTEGRATION_DATABASE_URL: "postgresql://localhost/production"
      })
    ).rejects.toThrow();
    expect(fixture.constructors).not.toHaveBeenCalled();
  });
});
