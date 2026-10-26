BEGIN;

CREATE TABLE app.chats (
  condominium_id uuid NOT NULL REFERENCES app.condominiums(id) ON DELETE CASCADE,
  owner_user_id uuid NOT NULL REFERENCES app.users(id) ON DELETE RESTRICT,
  id uuid NOT NULL,
  title text NOT NULL CHECK (length(trim(title)) BETWEEN 1 AND 120),
  created_at timestamptz(3) NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  hidden_at timestamptz,
  PRIMARY KEY (condominium_id, owner_user_id, id)
);

ALTER TABLE app.chats ENABLE ROW LEVEL SECURITY;
ALTER TABLE app.chats FORCE ROW LEVEL SECURITY;
GRANT SELECT, INSERT, UPDATE ON app.chats TO app_runtime;
CREATE POLICY chats_owner_scope ON app.chats FOR ALL TO app_runtime
  USING (
    condominium_id = app.current_condominium_id() AND owner_user_id = app.current_user_id()
    AND EXISTS (SELECT 1 FROM app.condominiums WHERE id = chats.condominium_id)
  )
  WITH CHECK (
    condominium_id = app.current_condominium_id() AND owner_user_id = app.current_user_id()
    AND EXISTS (SELECT 1 FROM app.condominiums WHERE id = chats.condominium_id)
  );

ALTER TABLE app.questions ADD COLUMN chat_id uuid,
  ADD CONSTRAINT questions_owned_chat_fk FOREIGN KEY (condominium_id, asked_by_user_id, chat_id)
    REFERENCES app.chats(condominium_id, owner_user_id, id) ON DELETE RESTRICT;
CREATE INDEX questions_by_chat ON app.questions (condominium_id, asked_by_user_id, chat_id, created_at DESC, id DESC);

CREATE TABLE app.chat_attachments (
  condominium_id uuid NOT NULL,
  owner_user_id uuid NOT NULL,
  chat_id uuid NOT NULL,
  document_version_id uuid NOT NULL,
  title text NOT NULL,
  created_at timestamptz NOT NULL DEFAULT now(),
  PRIMARY KEY (condominium_id, owner_user_id, chat_id, document_version_id),
  FOREIGN KEY (condominium_id, owner_user_id, chat_id) REFERENCES app.chats(condominium_id, owner_user_id, id) ON DELETE CASCADE,
  FOREIGN KEY (condominium_id, document_version_id) REFERENCES app.document_versions(condominium_id, id) ON DELETE CASCADE
);
ALTER TABLE app.chat_attachments ENABLE ROW LEVEL SECURITY;
ALTER TABLE app.chat_attachments FORCE ROW LEVEL SECURITY;
GRANT SELECT, INSERT ON app.chat_attachments TO app_runtime;
CREATE POLICY chat_attachments_owner_scope ON app.chat_attachments FOR ALL TO app_runtime
  USING (
    condominium_id = app.current_condominium_id() AND owner_user_id = app.current_user_id()
    AND EXISTS (SELECT 1 FROM app.condominiums WHERE id = chat_attachments.condominium_id)
  )
  WITH CHECK (
    condominium_id = app.current_condominium_id() AND owner_user_id = app.current_user_id()
    AND EXISTS (SELECT 1 FROM app.condominiums WHERE id = chat_attachments.condominium_id)
  );

COMMIT;
