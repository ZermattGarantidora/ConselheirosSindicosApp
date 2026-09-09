import { readFileSync } from "node:fs";
import { describe, expect, it } from "vitest";

const migration = readFileSync(
  new URL("../../infrastructure/database/009_answers_feedback_audit.sql", import.meta.url),
  "utf8"
);
const groundingMigration = readFileSync(
  new URL("../../infrastructure/database/010_answer_claim_grounding.sql", import.meta.url),
  "utf8"
);

describe("migration de respostas, feedback e auditoria", () => {
  it("cria o modelo completo da interação documental", () => {
    for (const table of [
      "questions",
      "retrieval_runs",
      "retrieval_evidence",
      "answers",
      "answer_claims",
      "citations",
      "feedback",
      "model_invocations",
      "model_invocation_evidence",
      "audit_events"
    ]) {
      expect(migration).toContain(`CREATE TABLE app.${table}`);
    }
    expect(migration).toContain("CREATE OR REPLACE FUNCTION app.has_active_membership()");
    expect(migration).toContain("SECURITY DEFINER");
    expect(migration).toContain("SET search_path = pg_catalog, app");
    expect(migration).toContain("REVOKE ALL ON FUNCTION app.has_active_membership() FROM PUBLIC");
  });

  it("força RLS em todas as tabelas de tenant e preserva a fronteira composta", () => {
    const tenantTables = [
      "questions",
      "retrieval_runs",
      "retrieval_evidence",
      "answers",
      "answer_claims",
      "citations",
      "feedback",
      "model_invocations",
      "model_invocation_evidence",
      "audit_events"
    ];
    for (const table of tenantTables) {
      expect(migration).toContain(`ALTER TABLE app.${table} ENABLE ROW LEVEL SECURITY`);
      expect(migration).toContain(`ALTER TABLE app.${table} FORCE ROW LEVEL SECURITY`);
    }
    expect(migration).toContain("FOREIGN KEY (condominium_id, retrieval_run_id)");
    expect(migration).toContain("FOREIGN KEY (condominium_id, document_chunk_id)");
    expect(migration).toContain(
      "FOREIGN KEY (condominium_id, retrieval_run_id, retrieval_evidence_id)"
    );
    expect(migration).toContain("PRIMARY KEY (condominium_id, id)");
  });

  it("concede ao runtime somente leitura e inserção e exige membership ativa", () => {
    expect(migration).toContain(
      "GRANT SELECT, INSERT ON app.questions, app.retrieval_runs, app.retrieval_evidence"
    );
    expect(migration).not.toMatch(/GRANT[^;]+\bUPDATE\b[^;]+TO app_runtime/iu);
    expect(migration).not.toMatch(/GRANT[^;]+\bDELETE\b[^;]+TO app_runtime/iu);
    expect(migration).toContain("app.has_active_membership()");
    expect(migration).toContain("asked_by_user_id = app.current_user_id()");
    expect(migration).toContain("submitted_by_user_id = app.current_user_id()");
    expect(migration).toContain("actor_user_id = app.current_user_id()");
  });

  it("impõe modos, citações, claims, feedback e telemetria minimizada", () => {
    expect(migration).toContain("answer_mode IN ('grounded', 'abstained', 'conflict', 'failed')");
    expect(migration).toContain(
      "claim_type IN ('condominium_fact', 'interpretation', 'recommendation')"
    );
    expect(migration).toContain(
      "classification IN ('correct', 'incorrect', 'incomplete', 'outdated')"
    );
    expect(migration).toContain("input_hash text NOT NULL");
    expect(migration).toContain("output_hash text");
    expect(migration).toContain("metadata jsonb NOT NULL DEFAULT '{}'::jsonb");
    expect(migration).toContain("CHECK (jsonb_typeof(metadata) = 'object')");
  });

  it("impede persistir fatos e interpretações sem exigência de evidência", () => {
    expect(groundingMigration).toContain(
      "ADD CONSTRAINT answer_claims_documentary_evidence_required"
    );
    expect(groundingMigration).toContain("claim_type = 'recommendation' OR evidence_required");
  });
});
