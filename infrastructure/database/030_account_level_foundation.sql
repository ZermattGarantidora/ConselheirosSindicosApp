BEGIN;

ALTER TABLE app.users
  ADD COLUMN IF NOT EXISTS account_level text NOT NULL DEFAULT 'starting'
    CHECK (account_level IN ('starting', 'confirmed')),
  ADD COLUMN IF NOT EXISTS account_level_calculated_at timestamptz;

COMMENT ON COLUMN app.users.account_level IS
  'Base ajustável para nível da conta; não autoriza funcionalidades nem regras comerciais.';

COMMIT;
