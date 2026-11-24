export const loginAttemptPolicy = Object.freeze({
  perOrigin: 10,
  global: 1000,
  windowMs: 15 * 60_000
});

export type LoginAttemptDecision = Readonly<{ allowed: boolean; retryAfterSeconds: number }>;
export type LoginAttemptCounter = { key: string; count: number; until: number };

// Called only under the durable store's exclusive lock. No raw network origin enters this state.
export function reserveLoginAttempt(
  counters: LoginAttemptCounter[],
  originHash: string,
  time: number
): Readonly<{ counters: LoginAttemptCounter[]; decision: LoginAttemptDecision }> {
  if (!/^[a-f0-9]{64}$/u.test(originHash) || !Number.isSafeInteger(time) || time < 0)
    throw new Error("Reserva de acesso inválida.");
  const active = counters.filter((counter) => counter.until > time);
  const global = active.find((counter) => counter.key === "global") ?? {
    key: "global",
    count: 0,
    until: time + loginAttemptPolicy.windowMs
  };
  const origin = active.find((counter) => counter.key === originHash) ?? {
    key: originHash,
    count: 0,
    until: time + loginAttemptPolicy.windowMs
  };
  const blockedUntil = Math.max(
    global.count >= loginAttemptPolicy.global ? global.until : 0,
    origin.count >= loginAttemptPolicy.perOrigin ? origin.until : 0
  );
  if (blockedUntil > 0)
    return {
      counters: active,
      decision: { allowed: false, retryAfterSeconds: Math.ceil((blockedUntil - time) / 1000) }
    };
  return {
    counters: [
      ...active.filter((counter) => counter.key !== "global" && counter.key !== originHash),
      { ...global, count: global.count + 1 },
      { ...origin, count: origin.count + 1 }
    ],
    decision: { allowed: true, retryAfterSeconds: 0 }
  };
}
