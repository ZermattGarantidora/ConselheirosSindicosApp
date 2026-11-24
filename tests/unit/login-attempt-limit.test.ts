import { mkdtemp, readFile, rm, writeFile } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { afterEach, describe, expect, it, vi } from "vitest";
import { createLocalAccessCodeService } from "../../apps/api/identity/local-access-code-store.js";
import { createPostgresAccessCodeStore } from "../../apps/api/identity/postgres-access-code-store.js";
import {
  loginAttemptPolicy,
  reserveLoginAttempt,
  type LoginAttemptCounter
} from "../../apps/api/security/login-attempt-limit.js";

const directories: string[] = [];
const time = new Date("2026-11-09T12:00:00Z");
const hash = (value: number) => value.toString(16).padStart(64, "0");
afterEach(async () => {
  await Promise.all(
    directories.splice(0).map((directory) => rm(directory, { recursive: true, force: true }))
  );
});

describe("reserva persistente de tentativas — RQ-6805", () => {
  it("AC-6813/6815: reserva concorrente em duas instâncias não excede dez e sobrevive à recriação", async () => {
    const directory = await mkdtemp(join(tmpdir(), "alvitra-security-limit-"));
    directories.push(directory);
    const first = await createLocalAccessCodeService(directory);
    const second = await createLocalAccessCodeService(directory);
    const decisions = await Promise.all(
      Array.from({ length: 14 }, (_, index) =>
        (index % 2 ? first : second).consumeLoginAttempt("198.51.100.12", time)
      )
    );
    expect(decisions.filter((decision) => decision.allowed)).toHaveLength(10);
    expect(decisions.filter((decision) => !decision.allowed)).toEqual(
      Array.from({ length: 4 }, () => ({ allowed: false, retryAfterSeconds: 900 }))
    );
    const restarted = await createLocalAccessCodeService(directory);
    expect(await restarted.consumeLoginAttempt("198.51.100.12", time)).toEqual({
      allowed: false,
      retryAfterSeconds: 900
    });
    expect(await restarted.consumeLoginAttempt("203.0.113.12", time)).toEqual({
      allowed: true,
      retryAfterSeconds: 0
    });
    const raw = await readFile(join(directory, "vault.json"), "utf8");
    expect(raw).not.toContain("198.51.100.12");
    expect(raw).not.toContain("203.0.113.12");
    const stored = JSON.parse(raw) as { loginAttempts: LoginAttemptCounter[] };
    expect(stored.loginAttempts.map((row) => row.key)).toEqual(expect.arrayContaining(["global"]));
    expect(
      stored.loginAttempts
        .filter((row) => row.key !== "global")
        .every((row) => /^[a-f0-9]{64}$/u.test(row.key))
    ).toBe(true);
    expect(
      await restarted.consumeLoginAttempt("198.51.100.12", new Date(time.getTime() + 899_001))
    ).toEqual({ allowed: false, retryAfterSeconds: 1 });
    expect(
      await restarted.consumeLoginAttempt("198.51.100.12", new Date(time.getTime() + 900_000))
    ).toEqual({ allowed: true, retryAfterSeconds: 0 });
    expect(
      (
        JSON.parse(await readFile(join(directory, "vault.json"), "utf8")) as {
          loginAttempts: unknown[];
        }
      ).loginAttempts
    ).toHaveLength(2);
  });

  it("AC-6814: origens rotativas compartilham teto global e excesso não cria contador", () => {
    let counters: LoginAttemptCounter[] = [];
    for (let index = 0; index < 1000; index++) {
      const reservation = reserveLoginAttempt(counters, hash(index), time.getTime());
      expect(reservation.decision.allowed).toBe(true);
      counters = reservation.counters;
    }
    const blocked = reserveLoginAttempt(counters, hash(2000), time.getTime());
    expect(blocked.decision).toEqual({ allowed: false, retryAfterSeconds: 900 });
    expect(blocked.counters).toHaveLength(1001);
    expect(blocked.counters.some((counter) => counter.key === hash(2000))).toBe(false);
    expect(
      reserveLoginAttempt(counters, hash(2000), time.getTime() + 900_000).decision.allowed
    ).toBe(true);
    expect(() => reserveLoginAttempt([], "IP-em-texto", time.getTime())).toThrow();
    for (const invalid of [-1, NaN, Infinity, 1.5])
      expect(() => reserveLoginAttempt([], hash(0), invalid)).toThrow();
  });

  it("AC-6815: cofre anterior permanece legível e contadores corrompidos falham fechados", async () => {
    const directory = await mkdtemp(join(tmpdir(), "alvitra-security-corruption-"));
    directories.push(directory);
    const service = await createLocalAccessCodeService(directory);
    await writeFile(
      join(directory, "vault.json"),
      JSON.stringify({ credentials: [], sessions: [] })
    );
    expect((await service.consumeLoginAttempt("198.51.100.1", time)).allowed).toBe(true);
    for (const loginAttempts of [
      null,
      [null],
      [{ key: "IP", count: 1, until: 10 }],
      [{ key: "global", count: -1, until: 10 }],
      [{ key: "global", count: 1001, until: 10 }],
      [{ key: "global", count: 1, until: NaN }],
      [
        { key: "global", count: 1, until: 10 },
        { key: "global", count: 1, until: 10 }
      ]
    ]) {
      const raw = JSON.stringify({ credentials: [], sessions: [], loginAttempts });
      await writeFile(join(directory, "vault.json"), raw);
      await expect(service.consumeLoginAttempt("198.51.100.1", time)).rejects.toThrow();
      expect(await readFile(join(directory, "vault.json"), "utf8")).toBe(raw);
    }
  });

  it("AC-6815: janelas de origens tardias sobrevivem à virada da janela global", async () => {
    const directory = await mkdtemp(join(tmpdir(), "alvitra-security-window-"));
    directories.push(directory);
    const service = await createLocalAccessCodeService(directory);
    const lateOrigins = Array.from({ length: 999 }, (_, index) => ({
      key: hash(index),
      count: 1,
      until: time.getTime() + 800_000
    }));
    await writeFile(
      join(directory, "vault.json"),
      JSON.stringify({
        credentials: [],
        sessions: [],
        loginAttempts: [{ key: "global", count: 1000, until: time.getTime() }, ...lateOrigins]
      })
    );
    expect((await service.consumeLoginAttempt("198.51.100.1", time)).allowed).toBe(true);
    expect((await service.consumeLoginAttempt("198.51.100.2", time)).allowed).toBe(true);
    expect(
      (
        JSON.parse(await readFile(join(directory, "vault.json"), "utf8")) as {
          loginAttempts: unknown[];
        }
      ).loginAttempts
    ).toHaveLength(1002);
  });

  it("AC-6816: PostgreSQL usa parâmetro sem relógio do cliente e rejeita resultados inválidos", async () => {
    const query = vi
      .fn()
      .mockResolvedValue({ rows: [{ allowed: false, retry_after_seconds: 899 }] });
    const store = createPostgresAccessCodeStore({ query });
    expect(await store.consumeLoginAttempt(hash(1), 0)).toEqual({
      allowed: false,
      retryAfterSeconds: 899
    });
    expect(query).toHaveBeenCalledWith("SELECT * FROM app.consume_access_login_attempt($1)", [
      hash(1)
    ]);
    query.mockResolvedValue({ rows: [{ allowed: true, retry_after_seconds: 0 }] });
    expect((await store.consumeLoginAttempt(hash(1), 0)).allowed).toBe(true);
    for (const rows of [
      [],
      [{ allowed: "true", retry_after_seconds: 0 }],
      [{ allowed: false, retry_after_seconds: 0 }],
      [{ allowed: false, retry_after_seconds: loginAttemptPolicy.windowMs / 1000 + 1 }],
      [{ allowed: true, retry_after_seconds: 1 }],
      [
        { allowed: true, retry_after_seconds: 0 },
        { allowed: true, retry_after_seconds: 0 }
      ]
    ]) {
      query.mockResolvedValue({ rows });
      await expect(store.consumeLoginAttempt(hash(1), 0)).rejects.toThrow();
    }
    query.mockRejectedValue(new Error("falha-sintetica"));
    await expect(store.consumeLoginAttempt(hash(1), 0)).rejects.toThrow("falha-sintetica");
  });
});
