import type { CondominiumId } from "../core/condominium-scope.js";
import type { AuthorizedCondominiumContext } from "../identity/authorized-condominium-context.js";
import { retrievalPipelineVersion, retrievalQueryHash } from "./retrieval-contract.js";

export type SyntheticEvidence = Readonly<{
  id: string;
  condominiumId: CondominiumId;
  content: string;
}>;

export class ScopedEvidenceStore {
  public constructor(private readonly evidence: readonly SyntheticEvidence[]) {}

  public findForContext(context: AuthorizedCondominiumContext): readonly SyntheticEvidence[] {
    return this.evidence.filter((item) => item.condominiumId === context.condominiumId);
  }
}

export class TenantScopedCache<T> {
  private readonly values = new Map<string, T>();

  public get(
    context: AuthorizedCondominiumContext,
    input: Readonly<{
      documentVersion: string | readonly string[];
      query: string;
      pipelineVersion?: string;
    }>
  ): T | undefined {
    return this.values.get(this.keyFor(context, input));
  }

  public set(
    context: AuthorizedCondominiumContext,
    input: Readonly<{
      documentVersion: string | readonly string[];
      query: string;
      pipelineVersion?: string;
    }>,
    value: T
  ): void {
    this.values.set(this.keyFor(context, input), value);
  }

  private keyFor(
    context: AuthorizedCondominiumContext,
    input: Readonly<{
      documentVersion: string | readonly string[];
      query: string;
      pipelineVersion?: string;
    }>
  ): string {
    return [
      context.condominiumId,
      context.userId,
      context.roleKey,
      context.membershipRevision,
      [...context.permissions].sort().join(","),
      input.pipelineVersion ?? retrievalPipelineVersion,
      typeof input.documentVersion === "string"
        ? input.documentVersion
        : [...input.documentVersion].sort().join(","),
      retrievalQueryHash(input.query)
    ].join("|");
  }
}
