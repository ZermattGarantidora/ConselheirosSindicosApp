BEGIN;

ALTER TABLE app.answer_claims
  ADD CONSTRAINT answer_claims_documentary_evidence_required
  CHECK (claim_type = 'recommendation' OR evidence_required);

COMMIT;
