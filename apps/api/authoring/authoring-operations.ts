import type { AuthorizedCondominiumContext } from "../identity/authorized-condominium-context.js";
import {
  budgetDigest,
  createBudgetedOperationRunner,
  OperationBudgetError,
  type OperationBudgetStore
} from "../security/operation-budget.js";
import {
  createSyntheticAudioRecoveryJournal,
  type AudioRecoveryJournal,
  type AudioRecoveryDecision
} from "./audio-recovery-journal.js";
import {
  authoringFamily,
  matchesAuthoringRoot,
  type AuthoringArtifactStore,
  type AuthoringScope
} from "./authoring-artifacts.js";
import { DocumentDraftError } from "./document-drafts.js";
import type { ConversationEntry } from "../answers/conversation-store.js";
export type AuthoringExport = Readonly<{ originId: string; entries: readonly ConversationEntry[] }>;
export const authoringOperationKinds = [
  "document_write",
  "document_review",
  "document_improvement",
  "audio_transcription",
  "audio_minutes_write",
  "audio_minutes_review"
] as const;
export type AuthoringOperationKind = (typeof authoringOperationKinds)[number];
export interface AuthoringOperations {
  readonly syntheticOnly: true;
  open(context: AuthorizedCondominiumContext, scope: AuthoringScope, id: string): Promise<void>;
  check(context: AuthorizedCondominiumContext, scope: AuthoringScope, id: string): Promise<void>;
  run<T>(
    context: AuthorizedCondominiumContext,
    scope: AuthoringScope,
    id: string,
    kind: AuthoringOperationKind,
    step: string,
    payloadHash: string,
    operation: () => Promise<T>
  ): Promise<T>;
  export(
    context: AuthorizedCondominiumContext,
    scope: AuthoringScope,
    id: string
  ): Promise<AuthoringExport>;
  purge(context: AuthorizedCondominiumContext, scope: AuthoringScope, id: string): Promise<void>;
  maintain(
    context: AuthorizedCondominiumContext,
    scope: AuthoringScope,
    limit?: number
  ): Promise<{ purged: number; remaining: number }>;
}
export const createSyntheticAuthoringLifecycleJournal = createSyntheticAudioRecoveryJournal;
const sameScope = (a: AuthoringScope, b: AuthoringScope) =>
  a.userId === b.userId && a.condominiumId === b.condominiumId && a.chatId === b.chatId;
const uuid = /^[a-f0-9]{8}(?:-[a-f0-9]{4}){3}-[a-f0-9]{12}$/u;
const fail = (
  status: number,
  message = "Autoria indisponível ou em quarentena operacional."
): never => {
  throw new DocumentDraftError(status, message);
};
export function authoringOperationId(
  scope: AuthoringScope,
  id: string,
  kind: AuthoringOperationKind,
  step: string
) {
  const hex = budgetDigest(["authoring-operation-v1", scope, id, kind, step]).slice(0, 32);
  return `${hex.slice(0, 8)}-${hex.slice(8, 12)}-${hex.slice(12, 16)}-${hex.slice(16, 20)}-${hex.slice(20)}`;
}
/** Cofre de orçamento e journal recebidos explicitamente ficam fora do dump da aplicação. */
export function createSyntheticAuthoringOperations(options: {
  confirmation: "synthetic-local-only";
  journal: AudioRecoveryJournal;
  artifacts: AuthoringArtifactStore;
  budget: OperationBudgetStore;
  policy: {
    revision: string;
    retentionSeconds: number;
    maximumCostMicrounits: Readonly<Record<AuthoringOperationKind, number>>;
  };
  now: () => Date;
  authorize: (
    context: AuthorizedCondominiumContext,
    scope: AuthoringScope
  ) => Promise<AuthorizedCondominiumContext>;
}): AuthoringOperations {
  const policy = structuredClone(options.policy);
  if (
    options.confirmation !== "synthetic-local-only" ||
    !/^[a-f0-9]{64}$/u.test(policy.revision) ||
    !Number.isSafeInteger(policy.retentionSeconds) ||
    policy.retentionSeconds < 1 ||
    policy.retentionSeconds > 604800 ||
    authoringOperationKinds.some(
      (k) =>
        !Number.isSafeInteger(policy.maximumCostMicrounits[k]) ||
        policy.maximumCostMicrounits[k] < 0 ||
        policy.maximumCostMicrounits[k] > 1e12
    )
  )
    fail(503);
  async function actor(context: AuthorizedCondominiumContext, scope: AuthoringScope, id?: string) {
    if (
      ![scope.userId, scope.condominiumId, scope.chatId, ...(id ? [id] : [])].every((v) =>
        uuid.test(v)
      )
    )
      fail(403);
    const current = await options.authorize(context, scope);
    if (
      current.userId !== scope.userId ||
      current.condominiumId !== scope.condominiumId ||
      !current.permissions.includes("document:read") ||
      !current.permissions.includes("document:upload")
    )
      fail(403, "Acesso não autorizado aos derivados.");
    return current;
  }
  const descriptor = (scope: AuthoringScope, id: string) => ({
    sha256: budgetDigest(["authoring-origin-v1", scope, id]),
    commandHash: budgetDigest(["authoring-retention-v1", policy])
  });
  async function records() {
    try {
      return await options.journal.read();
    } catch {
      return fail(503);
    }
  }
  async function entries(scope: AuthoringScope) {
    const result = await options.artifacts.list(scope);
    if (
      result.length > 10000 ||
      result.some((e) => e.scope.kind !== "chat" || !sameScope(e.scope, scope))
    )
      fail(503);
    return result;
  }
  function origin(rows: readonly AudioRecoveryDecision[], scope: AuthoringScope, id: string) {
    const found = rows.find(
      (r) => r.kind === "dispatch" && r.id === id && sameScope(r.scope, scope)
    );
    if (!found) return undefined;
    const expected = descriptor(scope, id),
      created = Date.parse(found.expiresAt) - policy.retentionSeconds * 1000;
    if (
      found.sha256 !== expected.sha256 ||
      found.commandHash !== expected.commandHash ||
      !Number.isFinite(options.now().getTime()) ||
      options.now().getTime() < created
    )
      fail(503);
    return found;
  }
  async function recovered(scope: AuthoringScope, rows: readonly AudioRecoveryDecision[]) {
    const purged = rows.filter((r) => r.kind === "purge" && sameScope(r.scope, scope));
    if (!purged.length) return;
    const saved = await entries(scope);
    if (purged.some((r) => hasFamilyContent(saved, r.id)))
      fail(
        503,
        "Recuperação de derivados em quarentena. Reaplique as purgas antes de usar este contexto."
      );
  }
  function hasFamilyContent(saved: readonly ConversationEntry[], id: string) {
    const ids = authoringFamily(saved, id);
    return saved.some(
      (e) => ids.some((child) => matchesAuthoringRoot(e, child)) && e.response.status !== "purged"
    );
  }
  async function check(context: AuthorizedCondominiumContext, scope: AuthoringScope, id: string) {
    await actor(context, scope, id);
    const rows = await records();
    await recovered(scope, rows);
    const found = origin(rows, scope, id);
    if (
      !found ||
      Date.parse(found.expiresAt) <= options.now().getTime() ||
      rows.some((r) => r.kind === "purge" && r.id === id && sameScope(r.scope, scope))
    )
      fail(404, "Conteúdo derivado indisponível, excluído ou expirado.");
  }
  async function open(context: AuthorizedCondominiumContext, scope: AuthoringScope, id: string) {
    await actor(context, scope, id);
    const rows = await records();
    await recovered(scope, rows);
    if (origin(rows, scope, id)) return check(context, scope, id);
    if ((await entries(scope)).some((e) => matchesAuthoringRoot(e, id)))
      fail(
        503,
        "Origem sem recibo de retenção. Não foi atribuído prazo novo ao conteúdo existente."
      );
    const record: AudioRecoveryDecision = {
      kind: "dispatch",
      scope: structuredClone(scope),
      id,
      ...descriptor(scope, id),
      expiresAt: new Date(options.now().getTime() + policy.retentionSeconds * 1000).toISOString()
    };
    await options.journal.record(record);
    await check(context, scope, id);
  }
  async function purge(context: AuthorizedCondominiumContext, scope: AuthoringScope, id: string) {
    await actor(context, scope, id);
    const rows = await records(),
      base = origin(rows, scope, id);
    if (!base) fail(404, "Origem de retenção indisponível.");
    const ids = authoringFamily(await entries(scope), id);
    for (const child of ids) {
      const found = origin(rows, scope, child) ?? {
        ...base!,
        id: child,
        ...descriptor(scope, child)
      };
      if (!origin(rows, scope, child)) await options.journal.record({ ...found, kind: "dispatch" });
      await options.journal.record({ ...found, kind: "purge" });
    }
    await options.artifacts.scrub(scope, ids);
    if (hasFamilyContent(await entries(scope), id))
      fail(
        503,
        "Um derivado apareceu durante a purga. Reaplique a manutenção; o acesso continua bloqueado."
      );
    await actor(context, scope, id);
  }
  return {
    syntheticOnly: true,
    open,
    check,
    purge,
    async run(context, scope, id, kind, step, payloadHash, operation) {
      const current = await actor(context, scope, id);
      await check(current, scope, id);
      if (
        !authoringOperationKinds.includes(kind) ||
        !step ||
        step.length > 100 ||
        !/^[a-f0-9]{64}$/u.test(payloadHash)
      )
        fail(400);
      const runner = createBudgetedOperationRunner({
        store: options.budget,
        authorize: async () => {
          const fresh = await actor(context, scope, id);
          await check(fresh, scope, id);
          return fresh.membershipRevision === current.membershipRevision;
        }
      });
      try {
        return await runner.execute(
          {
            scope: {
              kind: "tenant",
              userId: scope.userId,
              condominiumId: scope.condominiumId,
              membershipRevision: current.membershipRevision
            },
            operationId: authoringOperationId(scope, id, kind, step),
            kind,
            payloadHash,
            policyRevision: policy.revision,
            maximumCostMicrounits: policy.maximumCostMicrounits[kind]
          },
          async () => {
            const value = await operation();
            await check(current, scope, id);
            return {
              value,
              outputHash: budgetDigest(value),
              actualCostMicrounits: policy.maximumCostMicrounits[kind]
            };
          }
        );
      } catch (error) {
        if (error instanceof OperationBudgetError)
          fail(
            error.code === "limit" ? 429 : 503,
            error.code === "limit"
              ? "Limite operacional de autoria atingido; nenhuma nova chamada foi feita."
              : "Consumo de autoria não confirmado. Retome o mesmo pedido; não haverá nova chamada automática."
          );
        throw error;
      }
    },
    async export(context, scope, id) {
      await check(context, scope, id);
      const all = await entries(scope),
        ids = authoringFamily(all, id);
      for (const child of ids) await check(context, scope, child);
      const result = {
        originId: id,
        entries: all.filter((e) => ids.some((child) => matchesAuthoringRoot(e, child)))
      };
      if (Buffer.byteLength(JSON.stringify(result)) > 4 * 1024 * 1024)
        fail(422, "A exportação excede o limite integral; nenhum trecho foi cortado.");
      await check(context, scope, id);
      return result;
    },
    async maintain(context, scope, limit = 20) {
      await actor(context, scope);
      if (!Number.isSafeInteger(limit) || limit < 1 || limit > 50)
        fail(400, "Lote de manutenção inválido.");
      const rows = await records();
      const candidates = rows.filter(
        (r) =>
          r.kind === "dispatch" &&
          sameScope(r.scope, scope) &&
          (Date.parse(r.expiresAt) <= options.now().getTime() ||
            rows.some((p) => p.kind === "purge" && p.id === r.id && sameScope(p.scope, scope)))
      );
      const all = await entries(scope),
        pending = candidates.filter(
          (r) =>
            !rows.some((p) => p.kind === "purge" && p.id === r.id && sameScope(p.scope, scope)) ||
            hasFamilyContent(all, r.id)
        );
      for (const item of pending.slice(0, limit)) await purge(context, scope, item.id);
      return {
        purged: Math.min(pending.length, limit),
        remaining: Math.max(0, pending.length - limit)
      };
    }
  };
}
