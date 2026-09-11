import { createHash } from "node:crypto";

import { describe, expect, it } from "vitest";

type SyntheticArtifact = Readonly<{
  id: string;
  condominiumId: "alameda" | "bosque";
  kind:
    | "original"
    | "page"
    | "chunk"
    | "embedding"
    | "question"
    | "answer"
    | "feedback"
    | "audit"
    | "cache"
    | "job";
  contentHash: string;
  retentionUntil: Date;
}>;

class SyntheticLifecycleExercise {
  private readonly artifacts = new Map<string, SyntheticArtifact>();
  private readonly revokedUsers = new Set<string>();

  public add(artifact: SyntheticArtifact): void {
    this.artifacts.set(`${artifact.condominiumId}:${artifact.id}`, artifact);
  }

  public exportCondominium(
    condominiumId: SyntheticArtifact["condominiumId"]
  ): readonly SyntheticArtifact[] {
    return [...this.artifacts.values()].filter(
      (artifact) => artifact.condominiumId === condominiumId
    );
  }

  public purgeCondominium(condominiumId: SyntheticArtifact["condominiumId"]): Readonly<{
    condominiumId: SyntheticArtifact["condominiumId"];
    purgedArtifactIds: readonly string[];
    receiptHash: string;
  }> {
    const artifacts = this.exportCondominium(condominiumId);
    for (const artifact of artifacts) {
      this.artifacts.delete(`${artifact.condominiumId}:${artifact.id}`);
    }
    const purgedArtifactIds = artifacts.map((artifact) => artifact.id).sort();
    return Object.freeze({
      condominiumId,
      purgedArtifactIds: Object.freeze(purgedArtifactIds),
      receiptHash: createHash("sha256")
        .update(`${condominiumId}:${purgedArtifactIds.join(",")}`)
        .digest("hex")
    });
  }

  public purgeExpired(referenceDate: Date): readonly string[] {
    const expired = [...this.artifacts.values()].filter(
      (artifact) => artifact.retentionUntil.getTime() <= referenceDate.getTime()
    );
    for (const artifact of expired) {
      this.artifacts.delete(`${artifact.condominiumId}:${artifact.id}`);
    }
    return Object.freeze(
      expired.map((artifact) => `${artifact.condominiumId}:${artifact.id}`).sort()
    );
  }

  public revokeUser(userId: string, condominiumId: SyntheticArtifact["condominiumId"]): void {
    this.revokedUsers.add(`${userId}:${condominiumId}`);
  }

  public canRead(userId: string, condominiumId: SyntheticArtifact["condominiumId"]): boolean {
    return !this.revokedUsers.has(`${userId}:${condominiumId}`);
  }
}

function artifact(
  condominiumId: SyntheticArtifact["condominiumId"],
  id: string,
  kind: SyntheticArtifact["kind"],
  retentionUntil = new Date("2026-12-31T00:00:00.000Z")
): SyntheticArtifact {
  return Object.freeze({
    id,
    condominiumId,
    kind,
    contentHash: createHash("sha256").update(`${condominiumId}:${id}`).digest("hex"),
    retentionUntil
  });
}

describe("exercício sintético do ciclo de vida da B7", () => {
  it("exporta somente o condomínio solicitado e preserva o outro tenant", () => {
    const exercise = new SyntheticLifecycleExercise();
    exercise.add(artifact("alameda", "document-original", "original"));
    exercise.add(artifact("alameda", "answer-1", "answer"));
    exercise.add(artifact("bosque", "bosque-only-document", "original"));

    const exported = exercise.exportCondominium("alameda");

    expect(exported).toHaveLength(2);
    expect(exported.every((item) => item.condominiumId === "alameda")).toBe(true);
    expect(exported.map((item) => item.id)).not.toContain("bosque-only-document");
  });

  it("purga todos os derivados do tenant e emite recibo sem conteúdo", () => {
    const exercise = new SyntheticLifecycleExercise();
    const kinds: SyntheticArtifact["kind"][] = [
      "original",
      "page",
      "chunk",
      "embedding",
      "question",
      "answer",
      "feedback",
      "audit",
      "cache",
      "job"
    ];
    kinds.forEach((kind, index) => exercise.add(artifact("alameda", `artifact-${index}`, kind)));
    exercise.add(artifact("bosque", "untouched", "original"));

    const receipt = exercise.purgeCondominium("alameda");

    expect(receipt.purgedArtifactIds).toHaveLength(kinds.length);
    expect(receipt.receiptHash).toMatch(/^[a-f0-9]{64}$/);
    expect(exercise.exportCondominium("alameda")).toEqual([]);
    expect(exercise.exportCondominium("bosque")).toHaveLength(1);
    expect(JSON.stringify(receipt)).not.toContain("contentHash");
  });

  it("remove somente artefatos vencidos pela retenção sintética", () => {
    const exercise = new SyntheticLifecycleExercise();
    exercise.add(artifact("alameda", "expired", "audit", new Date("2026-09-09T00:00:00.000Z")));
    exercise.add(artifact("alameda", "kept", "audit", new Date("2026-09-11T00:00:00.000Z")));
    exercise.add(artifact("bosque", "other-tenant", "audit", new Date("2026-09-09T00:00:00.000Z")));

    expect(exercise.purgeExpired(new Date("2026-09-10T00:00:00.000Z"))).toEqual([
      "alameda:expired",
      "bosque:other-tenant"
    ]);
    expect(exercise.exportCondominium("alameda").map((item) => item.id)).toEqual(["kept"]);
  });

  it("nega leitura após revogação e não altera o acesso de outro tenant", () => {
    const exercise = new SyntheticLifecycleExercise();

    exercise.revokeUser("user-synthetic", "alameda");

    expect(exercise.canRead("user-synthetic", "alameda")).toBe(false);
    expect(exercise.canRead("user-synthetic", "bosque")).toBe(true);
  });
});
