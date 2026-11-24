import { resolve } from "node:path";
import { Client } from "pg";
import { expect, it, vi } from "vitest";
import {
  assertDocumentRestoreTarget,
  createDocumentLifecycleRestorer
} from "../fixtures/document-lifecycle-restore.js";

const id = "a".repeat(32),
  other = "b".repeat(32);
const options = {
  sourceUrl: `postgresql://postgres:synthetic-only@127.0.0.1:5432/alvitra_ops_source_${id}`,
  restoreUrl: `postgresql://postgres:synthetic-only@127.0.0.1:5432/alvitra_ops_restore_${id}`,
  runId: id,
  directory: resolve(".local/pilot-operations", id),
  containerName: `alvitra-ops-${id}`,
  confirmation: "synthetic-local-only" as const
};
it("AC-7124: outro sufixo, origem ou diretório são recusados antes de conectar", () => {
  const connect = vi.spyOn(Client.prototype, "connect");
  try {
    for (const changed of [
      { ...options, restoreUrl: options.restoreUrl.replace(id, other) },
      { ...options, sourceUrl: options.sourceUrl.replace(id, other) },
      { ...options, directory: resolve(".local/unowned") },
      { ...options, restoreUrl: options.restoreUrl.replace("127.0.0.1", "example.org") }
    ])
      expect(() => createDocumentLifecycleRestorer(changed)).toThrow();
    expect(connect).not.toHaveBeenCalled();
  } finally {
    connect.mockRestore();
  }
});
it.each(["missing", "wrong-name", "wrong-purpose", "wrong-policy", "occupied", "valid"])(
  "AC-7124: marcador/destino %s só admite cópia própria vazia",
  async (mode) => {
    const query = vi.fn(async (sql: string) =>
      sql.includes("ops_control.environment")
        ? {
            rows:
              mode === "missing"
                ? []
                : [
                    {
                      name: `alvitra_ops_restore_${mode === "wrong-name" ? other : id}`,
                      purpose: mode === "wrong-purpose" ? "source" : "restore",
                      data_policy: mode === "wrong-policy" ? "real" : "synthetic-local-only"
                    }
                  ]
          }
        : { rows: [{ occupied: mode === "occupied" }] }
    );
    const target = query as unknown as Client["query"];
    const work = assertDocumentRestoreTarget({ query: target }, `alvitra_ops_restore_${id}`);
    if (mode === "valid") await expect(work).resolves.toBeUndefined();
    else await expect(work).rejects.toThrow();
    expect(query.mock.calls.every(([sql]) => sql.startsWith("SELECT"))).toBe(true);
    expect(query.mock.calls.map(([sql]) => sql).join("\n")).not.toMatch(
      /DROP|DELETE|TRUNCATE|CREATE/u
    );
  }
);
