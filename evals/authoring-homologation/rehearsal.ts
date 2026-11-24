import assert from "node:assert/strict";
import { randomUUID } from "node:crypto";
import { mkdir, mkdtemp, readFile, rename, rm } from "node:fs/promises";
import { basename, dirname, join, resolve } from "node:path";
import {
  createSyntheticAuthoringOperations,
  createSyntheticAuthoringLifecycleJournal,
  authoringOperationKinds
} from "../../apps/api/authoring/authoring-operations.js";
import { createSyntheticAuthoringBudget } from "../../apps/api/authoring/authoring-budget.js";
import { createDocumentDraftService } from "../../apps/api/authoring/document-drafts.js";
import { budgetDigest } from "../../apps/api/security/operation-budget.js";
import { createCondominiumId } from "../../apps/api/core/condominium-scope.js";
import {
  createUserId,
  AccessDeniedError,
  type AuthorizedCondominiumContext
} from "../../apps/api/identity/authorized-condominium-context.js";
import {
  memoryAuthoringArtifacts,
  syntheticAuthoringPolicies
} from "../../tests/fixtures/authoring-operations.js";

export async function rehearseOperations() {
  const root = resolve(".local/authoring-homologation");
  await mkdir(root, { recursive: true });
  const directory = await mkdtemp(join(root, "rehearsal-"));
  if (dirname(directory) !== root || !basename(directory).startsWith("rehearsal-"))
    throw new Error("Temporário fora do escopo do ensaio.");
  try {
    let clock = new Date("2026-11-17T12:00:00Z"),
      allowed = true,
      calls = 0;
    const context: AuthorizedCondominiumContext = {
      userId: createUserId(randomUUID()),
      condominiumId: createCondominiumId(randomUUID()),
      roleKey: "manager",
      membershipRevision: "synthetic-review-v1",
      permissions: ["document:read", "document:upload"]
    };
    const scope = {
        kind: "chat" as const,
        userId: context.userId,
        condominiumId: context.condominiumId,
        chatId: randomUUID()
      },
      memory = memoryAuthoringArtifacts(),
      policy = syntheticAuthoringPolicies(0),
      now = () => clock;
    const journal = createSyntheticAuthoringLifecycleJournal({
      directory: join(directory, "outside-dump-lifecycle"),
      journalId: randomUUID(),
      confirmation: "synthetic-local-only"
    });
    await journal.initialize();
    const budget = createSyntheticAuthoringBudget({
      directory: join(directory, "outside-dump-budget"),
      confirmation: "synthetic-local-only",
      policy: policy.budget,
      now
    });
    await budget.initialize();
    const options = {
      confirmation: "synthetic-local-only" as const,
      journal,
      artifacts: memory.artifacts,
      budget: budget.store,
      policy: policy.authoring,
      now,
      authorize: async (c: AuthorizedCondominiumContext) => {
        if (!allowed) throw new AccessDeniedError();
        return c;
      }
    };
    let operations = createSyntheticAuthoringOperations(options);
    const drafts = () =>
      createDocumentDraftService({
        store: memory.store,
        catalog: { listAuthorized: async () => [] },
        operations,
        now
      });
    const content = {
      title: "FICTÍCIO. Ensaio operacional",
      documentKind: "Comunicado",
      operation: "create" as const,
      text: "FICTÍCIO. Conferir antes de usar.",
      sources: [],
      changes: "Rascunho sintético.",
      pending: "Revisão humana pendente."
    };
    const id = randomUUID();
    await drafts().propose(context, scope, id, content, 0);
    for (const kind of authoringOperationKinds)
      await operations.run(context, scope, id, kind, "dry-run", budgetDigest(kind), async () => {
        calls++;
        return { synthetic: true };
      });
    assert.equal(calls, 6);
    const steps = [{ id: "six-purposes-zero-real-spending", passed: true }];
    const unknown = randomUUID();
    await operations.open(context, scope, unknown);
    await assert.rejects(() =>
      operations.run(
        context,
        scope,
        unknown,
        "document_write",
        "uncertain",
        budgetDigest("uncertain"),
        async () => {
          calls++;
          throw new Error("synthetic lost response");
        }
      )
    );
    operations = createSyntheticAuthoringOperations(options);
    await assert.rejects(() =>
      operations.run(
        context,
        scope,
        unknown,
        "document_write",
        "uncertain",
        budgetDigest("uncertain"),
        async () => {
          calls++;
          return {};
        }
      )
    );
    assert.equal(calls, 7);
    steps.push({ id: "unknown-not-retried-after-service-recreation", passed: true });
    const snapshot = memory.snapshot();
    await operations.purge(context, scope, id);
    memory.restore(snapshot);
    await assert.rejects(() => drafts().read(context, scope, id));
    steps.push({ id: "restore-remains-quarantined-before-deletion-replay", passed: true });
    await operations.maintain(context, scope, 50);
    await assert.rejects(() => drafts().read(context, scope, id));
    steps.push({ id: "purge-reapplied-to-restored-payload", passed: true });
    const independent = randomUUID();
    await drafts().propose(context, scope, independent, content, 0);
    const foreign = { ...scope, condominiumId: createCondominiumId(randomUUID()) };
    await assert.rejects(() => operations.export(context, foreign, independent));
    assert.equal((await drafts().read(context, scope, independent)).text, content.text);
    steps.push({ id: "foreign-scope-denied-original-family-preserved", passed: true });
    allowed = false;
    await assert.rejects(() => operations.export(context, scope, independent));
    allowed = true;
    steps.push({ id: "revoked-actor-denied", passed: true });
    const budgetFile = join(directory, "outside-dump-budget", "operation-budgets.json"),
      quarantinedFile = join(directory, "outside-dump-budget", "quarantine.json");
    await rename(budgetFile, quarantinedFile);
    try {
      await assert.rejects(() =>
        operations.run(
          context,
          scope,
          independent,
          "document_review",
          "missing-budget",
          budgetDigest("missing"),
          async () => {
            calls++;
            return {};
          }
        )
      );
      assert.equal(calls, 7);
    } finally {
      await rename(quarantinedFile, budgetFile);
    }
    steps.push({ id: "missing-cofre-no-empty-fallback", passed: true });
    clock = new Date("2026-11-17T13:00:00Z");
    await assert.rejects(() => drafts().read(context, scope, independent));
    await operations.maintain(context, scope, 50);
    steps.push({ id: "fixed-ttl-and-explicit-expiry-maintenance", passed: true });
    const ledger = JSON.parse(await readFile(budgetFile, "utf8")) as {
      receipts: {
        state: string;
        actualCostMicrounits?: number;
        request: { maximumCostMicrounits: number };
      }[];
    };
    assert.equal(ledger.receipts.length, 7);
    assert(ledger.receipts.some((r) => r.state === "unknown"));
    assert(
      ledger.receipts.every(
        (r) => r.request.maximumCostMicrounits === 0 && (r.actualCostMicrounits ?? 0) === 0
      )
    );
    return {
      syntheticOnly: true,
      backend: "memory-artifacts-and-local-file-fences",
      realProviderCalls: 0,
      activationAuthorized: false,
      policyApplied: false,
      simulatedCallbacks: calls,
      steps
    };
  } finally {
    await rm(directory, { recursive: true, force: true });
  }
}
