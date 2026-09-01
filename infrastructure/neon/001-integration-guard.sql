BEGIN;

CREATE TABLE public.conselheiro_integration_guard (
  guard_id text PRIMARY KEY,
  purpose text NOT NULL,
  created_at timestamptz NOT NULL DEFAULT now(),
  CONSTRAINT integration_guard_identity CHECK (guard_id = 'conselheiro-neon-synthetic-v1'),
  CONSTRAINT integration_guard_purpose CHECK (purpose = 'synthetic-integration-only')
);

INSERT INTO public.conselheiro_integration_guard (guard_id, purpose)
VALUES ('conselheiro-neon-synthetic-v1', 'synthetic-integration-only');

REVOKE ALL ON TABLE public.conselheiro_integration_guard FROM PUBLIC;

COMMIT;
