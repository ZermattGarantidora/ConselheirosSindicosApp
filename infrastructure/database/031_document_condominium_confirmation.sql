BEGIN;

ALTER TABLE app.document_version_states
  ADD COLUMN selected_condominium_name text,
  ADD COLUMN condominium_check jsonb,
  ADD CONSTRAINT document_condominium_check_shape CHECK (
    condominium_check IS NULL OR COALESCE((
      jsonb_typeof(condominium_check) = 'object'
      AND condominium_check->>'status' IN ('pending', 'confirmed')
      AND condominium_check->>'resumeProcessingStatus' IN ('ready', 'needs_review')
      AND jsonb_typeof(condominium_check->'detectedNames') = 'array'
      AND jsonb_typeof(condominium_check->'expectedName') = 'string'
    ), false)
  ),
  ADD CONSTRAINT pending_condominium_requires_review CHECK (
    condominium_check->>'status' IS DISTINCT FROM 'pending'
    OR processing_status = 'needs_review'
  );

-- Existing table grants, manager-only write policies and forced tenant RLS apply.
COMMIT;
