import { describe, expect, it } from "vitest";

import type { AccountCredentials } from "../../apps/api/identity/account-auth.js";
import { createSecretCipher } from "../../apps/api/identity/account-security-crypto.js";
import {
  createPostgresAccountSecurity,
  createPostgresAccountSecurityStore
} from "../../apps/api/identity/postgres-account-security.js";
import { createUserId } from "../../apps/api/identity/authorized-condominium-context.js";

const userId = createUserId("00000000-0000-4000-8000-000000000150");
const account: AccountCredentials = Object.freeze({
  userId,
  authSubject: userId,
  email: "persistente-seguranca@example.test",
  displayName: "Conta Persistente Sintética",
  passwordHash: "scrypt$synthetic",
  googleSubject: null,
  status: "active"
});

const accountRow = Object.freeze({
  user_id: userId,
  auth_subject: userId,
  email: account.email,
  display_name: account.displayName,
  password_hash: account.passwordHash,
  google_subject: null,
  status: "active" as const,
  email_verified_at: "2026-10-08T12:00:00.000Z",
  mfa_secret_ciphertext: "aesgcm$1$synthetic",
  mfa_enabled_at: new Date("2026-10-08T12:10:00.000Z")
});

describe("adaptador PostgreSQL da segurança da conta", () => {
  it("mapeia todas as operações para funções restritas do banco", async () => {
    const calls: { text: string; values: readonly unknown[] | undefined }[] = [];
    let nextRows: readonly unknown[] = [];
    const pool = {
      async query<T>(text: string, values?: readonly unknown[]) {
        calls.push({ text, values });
        const rows = nextRows as T[];
        nextRows = [];
        return { rows };
      }
    } as unknown as Parameters<typeof createPostgresAccountSecurityStore>[0];
    const store = createPostgresAccountSecurityStore(pool);
    const now = new Date("2026-10-08T13:00:00.000Z");

    await store.createAccount(account);
    nextRows = [accountRow];
    await expect(store.findAccountByEmail(account.email)).resolves.toMatchObject({
      userId,
      emailVerifiedAt: new Date("2026-10-08T12:00:00.000Z"),
      mfaEnabledAt: new Date("2026-10-08T12:10:00.000Z")
    });
    nextRows = [];
    await expect(store.findAccountByEmail("ausente@example.test")).resolves.toBeUndefined();
    await store.createAction({
      userId,
      purpose: "verify_email",
      tokenHash: "a".repeat(64),
      expiresAt: now
    });
    nextRows = [{ confirmed: true }];
    await expect(store.confirmEmail("a".repeat(64), now)).resolves.toBe(true);
    nextRows = [{ reset: true }];
    await expect(store.resetPassword("b".repeat(64), "hash-novo", now)).resolves.toBe(true);
    nextRows = [{ changed: true }];
    await expect(
      store.changePassword({ currentTokenHash: "c".repeat(64), passwordHash: "hash-trocado" })
    ).resolves.toBe(true);
    nextRows = [{ ...accountRow, email_verified_at: now }];
    await expect(store.findAccountBySession("c".repeat(64), now)).resolves.toMatchObject({
      userId,
      emailVerifiedAt: now
    });
    await store.createSession({
      userId,
      tokenHash: "c".repeat(64),
      expiresAt: new Date("2026-10-09T13:00:00.000Z"),
      deviceLabel: "Chrome sintético"
    });
    await store.createMfaChallenge({
      userId,
      tokenHash: "d".repeat(64),
      deviceLabel: "Firefox sintético",
      expiresAt: new Date("2026-10-08T13:05:00.000Z")
    });
    nextRows = [
      {
        ...accountRow,
        device_label: "Firefox sintético",
        attempts: 1,
        expires_at: "2026-10-08T13:05:00.000Z"
      }
    ];
    await expect(store.findMfaChallenge("d".repeat(64), now)).resolves.toMatchObject({
      deviceLabel: "Firefox sintético",
      attempts: 1,
      expiresAt: new Date("2026-10-08T13:05:00.000Z")
    });
    nextRows = [];
    await expect(store.findMfaChallenge("ausente", now)).resolves.toBeUndefined();
    await store.recordMfaFailure("d".repeat(64), 5);
    await store.consumeMfaChallenge("d".repeat(64));
    nextRows = [{ saved: true }];
    await expect(store.setPendingMfaSecret("c".repeat(64), "ciphertext")).resolves.toBe(true);
    nextRows = [{ enabled: true }];
    await expect(store.enableMfa("c".repeat(64), ["e".repeat(64), "f".repeat(64)])).resolves.toBe(
      true
    );
    nextRows = [{ consumed: true }];
    await expect(store.consumeRecoveryCode(userId, "e".repeat(64))).resolves.toBe(true);
    nextRows = [{ disabled: true }];
    await expect(store.disableMfa("c".repeat(64))).resolves.toBe(true);
    nextRows = [
      {
        session_id: 15,
        device_label: "Chrome sintético",
        created_at: "2026-10-08T12:00:00.000Z",
        last_seen_at: now,
        expires_at: "2026-10-09T12:00:00.000Z",
        current: true
      }
    ];
    await expect(store.listSessions("c".repeat(64), now)).resolves.toEqual([
      {
        sessionId: "15",
        deviceLabel: "Chrome sintético",
        createdAt: new Date("2026-10-08T12:00:00.000Z"),
        lastSeenAt: now,
        expiresAt: new Date("2026-10-09T12:00:00.000Z"),
        current: true
      }
    ]);
    await expect(store.revokeSession("c".repeat(64), "inválida")).resolves.toBe(false);
    nextRows = [{ revoked: true }];
    await expect(store.revokeSession("c".repeat(64), "15")).resolves.toBe(true);
    await store.revokeOtherSessions("c".repeat(64));

    expect(calls.map((call) => call.text)).toEqual(
      expect.arrayContaining([
        expect.stringContaining("app.find_account_security_by_email"),
        expect.stringContaining("app.reset_account_password"),
        expect.stringContaining("app.enable_account_mfa"),
        expect.stringContaining("app.list_account_sessions"),
        expect.stringContaining("app.revoke_owned_auth_session")
      ])
    );
    expect(createPostgresAccountSecurity(pool, createSecretCipher("11".repeat(32)))).toBeDefined();
  });

  it("traduz colisão de e-mail e preserva falhas inesperadas", async () => {
    const uniquePool = {
      async query() {
        throw Object.assign(new Error("unique"), { code: "23505" });
      }
    } as unknown as Parameters<typeof createPostgresAccountSecurityStore>[0];
    await expect(
      createPostgresAccountSecurityStore(uniquePool).createAccount(account)
    ).rejects.toMatchObject({ code: "email_taken" });

    const failure = new Error("falha de conexão sintética");
    const failingPool = {
      async query() {
        throw failure;
      }
    } as unknown as Parameters<typeof createPostgresAccountSecurityStore>[0];
    await expect(
      createPostgresAccountSecurityStore(failingPool).createAccount(account)
    ).rejects.toBe(failure);
  });
});
