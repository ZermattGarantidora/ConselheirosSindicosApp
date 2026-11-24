BEGIN;
CREATE TABLE app.condominium_creation_receipts (
  owner_user_id uuid NOT NULL REFERENCES app.users(id) ON DELETE CASCADE,
  request_key text NOT NULL CHECK (length(request_key) BETWEEN 1 AND 200),
  input_hash text NOT NULL CHECK (input_hash ~ '^[a-f0-9]{64}$'),
  condominium_id uuid NOT NULL REFERENCES app.condominiums(id) ON DELETE CASCADE,
  PRIMARY KEY (owner_user_id,request_key)
);
ALTER TABLE app.condominium_creation_receipts ENABLE ROW LEVEL SECURITY;
ALTER TABLE app.condominium_creation_receipts FORCE ROW LEVEL SECURITY;
GRANT SELECT,INSERT ON app.condominium_creation_receipts TO app_runtime;
CREATE POLICY creation_receipt_owner ON app.condominium_creation_receipts FOR ALL TO app_runtime
  USING (owner_user_id=app.current_user_id())
  WITH CHECK (owner_user_id=app.current_user_id());
COMMIT;
