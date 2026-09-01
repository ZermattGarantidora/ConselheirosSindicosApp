BEGIN;

CREATE SCHEMA IF NOT EXISTS app;

CREATE TABLE app.users (
  id uuid PRIMARY KEY,
  auth_subject text NOT NULL UNIQUE,
  status text NOT NULL CHECK (status IN ('active', 'blocked', 'deleted')),
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

CREATE TABLE app.condominiums (
  id uuid PRIMARY KEY,
  display_name text NOT NULL,
  status text NOT NULL CHECK (status IN ('active', 'suspended', 'pending_deletion')),
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

CREATE TABLE app.memberships (
  condominium_id uuid NOT NULL REFERENCES app.condominiums (id) ON DELETE RESTRICT,
  id uuid NOT NULL,
  user_id uuid NOT NULL REFERENCES app.users (id) ON DELETE RESTRICT,
  role_key text NOT NULL CHECK (role_key IN ('manager', 'advisor')),
  status text NOT NULL CHECK (status IN ('active', 'revoked', 'expired')),
  valid_from timestamptz NOT NULL,
  valid_until timestamptz,
  revoked_at timestamptz,
  revision text NOT NULL,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  PRIMARY KEY (condominium_id, id),
  CHECK (valid_until IS NULL OR valid_until > valid_from),
  CHECK ((status <> 'revoked') OR revoked_at IS NOT NULL)
);

CREATE UNIQUE INDEX memberships_one_active_per_user
  ON app.memberships (condominium_id, user_id)
  WHERE status = 'active';

CREATE INDEX memberships_user_by_condominium
  ON app.memberships (user_id, condominium_id);

CREATE FUNCTION app.current_user_id()
RETURNS uuid
LANGUAGE sql
STABLE
AS $$
  SELECT NULLIF(current_setting('app.user_id', true), '')::uuid;
$$;

ALTER TABLE app.users ENABLE ROW LEVEL SECURITY;
ALTER TABLE app.users FORCE ROW LEVEL SECURITY;
ALTER TABLE app.condominiums ENABLE ROW LEVEL SECURITY;
ALTER TABLE app.condominiums FORCE ROW LEVEL SECURITY;
ALTER TABLE app.memberships ENABLE ROW LEVEL SECURITY;
ALTER TABLE app.memberships FORCE ROW LEVEL SECURITY;

GRANT USAGE ON SCHEMA app TO app_runtime;
GRANT SELECT ON app.users, app.condominiums, app.memberships TO app_runtime;

CREATE POLICY users_current_identity ON app.users
  FOR SELECT
  USING (id = app.current_user_id());

CREATE POLICY memberships_current_identity ON app.memberships
  FOR SELECT
  USING (user_id = app.current_user_id());

CREATE POLICY condominiums_active_membership ON app.condominiums
  FOR SELECT
  USING (
    EXISTS (
      SELECT 1
      FROM app.memberships
      WHERE memberships.condominium_id = condominiums.id
        AND memberships.user_id = app.current_user_id()
        AND memberships.status = 'active'
        AND memberships.valid_from <= now()
        AND (memberships.valid_until IS NULL OR memberships.valid_until > now())
    )
  );

COMMIT;
