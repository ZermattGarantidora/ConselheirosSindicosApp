BEGIN;

ALTER TABLE app.legal_source_versions
  ADD COLUMN verified_at timestamptz,
  ADD COLUMN review_due_at timestamptz,
  ADD COLUMN consultation_pdf bytea,
  ADD CONSTRAINT legal_verification_interval CHECK (
    (verified_at IS NULL AND review_due_at IS NULL)
    OR (verified_at IS NOT NULL AND review_due_at IS NOT NULL AND review_due_at > verified_at)
  ),
  ADD CONSTRAINT legal_consultation_pdf_size CHECK (
    consultation_pdf IS NULL
    OR (octet_length(consultation_pdf) > 0 AND octet_length(consultation_pdf) <= 26214400)
  );

COMMENT ON COLUMN app.legal_source_versions.verified_at IS
  'Início do intervalo conferido do recorte; não é a data de início de vigência da lei.';
COMMENT ON COLUMN app.legal_source_versions.review_due_at IS
  'Limite exclusivo da conferência; expiração não significa revogação da lei.';
COMMENT ON COLUMN app.legal_source_versions.consultation_pdf IS
  'Cópia paginada identificada como derivada; original remoto oficial permanece na fonte.';

COMMIT;
