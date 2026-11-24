import type { HostedCallKey, HostedCallLedger } from "./hosted-call-ledger.js";
import { hostedCallResultHash } from "./hosted-call-ledger.js";
import type {
  HostedDocumentCallControl,
  HostedDocumentTransferAuthorizer
} from "./hosted-document-execution.js";
import {
  DocumentRecoveryError,
  recoveryDigest,
  type DocumentRecoveryJournal,
  type DocumentRecoverySnapshot
} from "./synthetic-document-recovery-journal.js";

export type DocumentRecoveryVerifier = (snapshot: DocumentRecoverySnapshot) => Promise<boolean>;

/** Verifier checks purges AND authoritative monetary/quantity receipts globally, read-only. */
export function createDocumentRecoveryGuard(options: {
  journal: DocumentRecoveryJournal;
  verifyRecoveredState?: DocumentRecoveryVerifier;
}) {
  return async (scope?: {
    condominiumId: string;
    documentVersionIds?: readonly string[];
    documentId?: string;
  }) => {
    try {
      const snapshot = await options.journal.read();
      if (!options.verifyRecoveredState || !(await options.verifyRecoveredState(snapshot)))
        throw new DocumentRecoveryError();
      if (
        scope &&
        snapshot.purges.some(
          (row) =>
            row.condominiumId === scope.condominiumId &&
            (row.documentId === scope.documentId ||
              row.documentVersionIds.some((id) => scope.documentVersionIds?.includes(id)))
        )
      )
        throw new DocumentRecoveryError();
      return snapshot;
    } catch {
      throw new DocumentRecoveryError();
    }
  };
}

/** Wrap the already paired Spec 072 controls together; never replace their authorizer/store. */
export function createRecoveryGuardedHostedControls(options: {
  authorize: HostedDocumentTransferAuthorizer;
  callControl: HostedDocumentCallControl;
  journal: DocumentRecoveryJournal;
  verifyRecoveredState?: DocumentRecoveryVerifier;
}): { authorize: HostedDocumentTransferAuthorizer; callControl: HostedDocumentCallControl } {
  const guard = createDocumentRecoveryGuard(options),
    ledger = options.callControl.ledger;
  const check = (key: HostedCallKey) =>
    guard({ condominiumId: key.condominiumId, documentVersionIds: key.documentVersionIds ?? [] });
  return {
    authorize: async (request) => {
      try {
        await guard({
          condominiumId: request.condominiumId,
          documentVersionIds: request.documentVersions.map((row) => row.id)
        });
        return await options.authorize(request);
      } catch {
        return { allowed: false };
      }
    },
    callControl: {
      ...options.callControl,
      ledger: {
        reserve: async (key, budget) => {
          await check(key);
          return ledger.reserve(key, budget);
        },
        dispatch: async (key, owner) => {
          await check(key);
          await options.journal.recordDispatch(key, owner);
          await ledger.dispatch(key, owner);
        },
        complete: async (key, owner, value) => {
          await check(key);
          await ledger.complete(key, owner, value);
          await options.journal.recordCompletion(
            key,
            owner,
            hostedCallResultHash(JSON.stringify(value))
          );
        },
        uncertain: (key, owner) => ledger.uncertain(key, owner),
        cancel: (key, owner) => ledger.cancel(key, owner),
        invalidateDocumentVersion: (tenant, version) =>
          ledger.invalidateDocumentVersion(tenant, version)
      }
    }
  };
}

/** No provider, new claim, refund or operational reconciliation. Proof is PRIVATE, never HTTP. */
export async function reconcileKnownDocumentResult(options: {
  ledger: HostedCallLedger;
  key: HostedCallKey;
  owner: string;
  value: unknown;
  authorizeProof?:
    | ((
        candidate: Readonly<{ key: HostedCallKey; ownerSha256: string; resultSha256: string }>
      ) => Promise<boolean>)
    | undefined;
  validateResult: (value: unknown) => boolean;
}): Promise<void> {
  try {
    const value = structuredClone(options.value),
      key = structuredClone(options.key);
    const serialized = JSON.stringify(value);
    if (
      typeof serialized !== "string" ||
      Buffer.byteLength(serialized) > 1_000_000 ||
      !options.validateResult(value) ||
      !options.authorizeProof ||
      !(await options.authorizeProof({
        key,
        ownerSha256: recoveryDigest(options.owner),
        resultSha256: hostedCallResultHash(serialized)
      }))
    )
      throw new DocumentRecoveryError();
    await options.ledger.complete(key, options.owner, value);
  } catch {
    throw new DocumentRecoveryError();
  }
}
