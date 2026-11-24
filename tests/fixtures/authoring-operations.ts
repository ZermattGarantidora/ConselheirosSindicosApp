import { randomUUID } from "node:crypto";
import {
  ConversationStoreError,
  validateConversationWrite,
  type ConversationEntry,
  type ConversationStore,
  type ConversationScope
} from "../../apps/api/answers/conversation-store.js";
import type {
  AuthoringArtifactStore,
  AuthoringScope
} from "../../apps/api/authoring/authoring-artifacts.js";
import {
  matchesAuthoringRoot,
  scrubAuthoringEntry
} from "../../apps/api/authoring/authoring-artifacts.js";
import { authoringOperationKinds } from "../../apps/api/authoring/authoring-operations.js";
import { budgetDigest, type BudgetPolicy } from "../../apps/api/security/operation-budget.js";
const same = (a: ConversationScope, b: ConversationScope) =>
  JSON.stringify(a) === JSON.stringify(b);
export function memoryAuthoringArtifacts() {
  let rows: ConversationEntry[] = [];
  const store: ConversationStore = {
    durable: false,
    beginSetup: async () => randomUUID(),
    pendingSetup: async () => undefined,
    bindSetup: async () => {},
    find: async (scope, key) =>
      structuredClone(rows.find((e) => same(e.scope, scope) && e.requestKey === key)),
    append: async (scope, entry) => {
      validateConversationWrite(entry);
      const old = rows.find((e) => same(e.scope, scope) && e.requestKey === entry.requestKey);
      if (old) {
        if (old.inputHash !== entry.inputHash) throw new ConversationStoreError(409);
        return structuredClone(old);
      }
      const result = {
        ...structuredClone(entry),
        scope: structuredClone(scope),
        sequence: rows.length + 1
      };
      rows.push(result);
      return structuredClone(result);
    },
    list: async (scope, limit = 50, cursor) => ({
      entries: structuredClone(
        rows
          .filter((e) => same(e.scope, scope) && (!cursor || e.sequence < Number(cursor)))
          .sort((a, b) => b.sequence - a.sequence)
          .slice(0, limit)
      ),
      nextCursor: null
    })
  };
  const artifacts: AuthoringArtifactStore = {
    list: async (scope) => structuredClone(rows.filter((e) => same(e.scope, scope))),
    scrub: async (scope, ids) => {
      rows = rows.map((e) =>
        same(e.scope, scope) && ids.some((id) => matchesAuthoringRoot(e, id))
          ? scrubAuthoringEntry(e)
          : e
      );
    }
  };
  return {
    store,
    artifacts,
    snapshot: () => structuredClone(rows),
    restore: (snapshot: ConversationEntry[]) => {
      rows = structuredClone(snapshot);
    },
    scopeRows: (scope: AuthoringScope) => rows.filter((e) => same(e.scope, scope))
  };
}
export function syntheticAuthoringPolicies(maximum = 100) {
  const revision = budgetDigest("synthetic-authoring-operations-v1");
  const budget: BudgetPolicy = {
    enabled: true,
    revision,
    currency: "BRL",
    scopeDailyCost: 10000,
    globalDailyCost: 20000,
    scopeDailyOperations: 100,
    globalDailyOperations: 200,
    scopeConcurrent: 5,
    globalConcurrent: 10
  };
  return {
    budget,
    authoring: {
      revision,
      retentionSeconds: 3600,
      maximumCostMicrounits: Object.fromEntries(
        authoringOperationKinds.map((k) => [k, maximum])
      ) as Record<(typeof authoringOperationKinds)[number], number>
    }
  };
}
