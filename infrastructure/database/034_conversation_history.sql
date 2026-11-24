BEGIN;

CREATE TABLE app.conversation_setup_sessions (
  id uuid PRIMARY KEY,
  owner_user_id uuid NOT NULL REFERENCES app.users(id) ON DELETE CASCADE,
  condominium_id uuid REFERENCES app.condominiums(id) ON DELETE CASCADE,
  chat_id uuid,
  created_at timestamptz(3) NOT NULL DEFAULT now(),
  CHECK ((condominium_id IS NULL) = (chat_id IS NULL)),
  FOREIGN KEY (condominium_id, owner_user_id, chat_id)
    REFERENCES app.chats(condominium_id, owner_user_id, id) ON DELETE CASCADE
);
CREATE UNIQUE INDEX conversation_one_active_setup ON app.conversation_setup_sessions(owner_user_id)
  WHERE condominium_id IS NULL;
ALTER TABLE app.conversation_setup_sessions ENABLE ROW LEVEL SECURITY;
ALTER TABLE app.conversation_setup_sessions FORCE ROW LEVEL SECURITY;
GRANT SELECT, INSERT, UPDATE ON app.conversation_setup_sessions TO app_runtime;
CREATE POLICY conversation_setup_owner ON app.conversation_setup_sessions FOR ALL TO app_runtime
  USING (owner_user_id = app.current_user_id() AND (condominium_id IS NULL OR
    (condominium_id = app.current_condominium_id() AND EXISTS (SELECT 1 FROM app.condominiums c WHERE c.id = condominium_id))))
  WITH CHECK (owner_user_id = app.current_user_id() AND (condominium_id IS NULL OR
    (condominium_id = app.current_condominium_id() AND EXISTS (SELECT 1 FROM app.condominiums c WHERE c.id = condominium_id))));

CREATE TABLE app.conversation_entries (
  id uuid PRIMARY KEY,
  sequence bigint GENERATED ALWAYS AS IDENTITY UNIQUE,
  owner_user_id uuid NOT NULL REFERENCES app.users(id) ON DELETE CASCADE,
  condominium_id uuid REFERENCES app.condominiums(id) ON DELETE CASCADE,
  chat_id uuid,
  setup_session_id uuid REFERENCES app.conversation_setup_sessions(id) ON DELETE CASCADE,
  scope_key text NOT NULL,
  request_key text NOT NULL CHECK (length(request_key) BETWEEN 1 AND 200),
  input_hash text NOT NULL CHECK (input_hash ~ '^[a-f0-9]{64}$'),
  created_at timestamptz(3) NOT NULL,
  messages jsonb NOT NULL CHECK (jsonb_typeof(messages) = 'array' AND jsonb_array_length(messages) BETWEEN 1 AND 2),
  response jsonb NOT NULL CHECK (jsonb_typeof(response) = 'object'),
  metadata jsonb NOT NULL DEFAULT '{}' CHECK (jsonb_typeof(metadata) = 'object'),
  CHECK ((condominium_id IS NULL AND chat_id IS NULL AND setup_session_id IS NOT NULL AND scope_key = 'setup:' || setup_session_id::text)
    OR (condominium_id IS NOT NULL AND chat_id IS NOT NULL AND scope_key = 'chat:' || condominium_id::text || ':' || chat_id::text)),
  UNIQUE (owner_user_id, scope_key, request_key),
  FOREIGN KEY (condominium_id, owner_user_id, chat_id)
    REFERENCES app.chats(condominium_id, owner_user_id, id) ON DELETE CASCADE
);
CREATE INDEX conversation_history_order ON app.conversation_entries(owner_user_id, scope_key, created_at DESC, sequence DESC);
ALTER TABLE app.conversation_entries ENABLE ROW LEVEL SECURITY;
ALTER TABLE app.conversation_entries FORCE ROW LEVEL SECURITY;
GRANT SELECT, INSERT, UPDATE ON app.conversation_entries TO app_runtime;
CREATE POLICY conversation_entries_owner ON app.conversation_entries FOR ALL TO app_runtime
  USING (owner_user_id = app.current_user_id() AND
    ((condominium_id IS NULL AND EXISTS (SELECT 1 FROM app.conversation_setup_sessions s
        WHERE s.id = setup_session_id AND s.owner_user_id = app.current_user_id() AND s.condominium_id IS NULL))
      OR (condominium_id = app.current_condominium_id() AND EXISTS (SELECT 1 FROM app.condominiums c WHERE c.id = condominium_id))))
  WITH CHECK (owner_user_id = app.current_user_id() AND
    ((condominium_id IS NULL AND EXISTS (SELECT 1 FROM app.conversation_setup_sessions s
        WHERE s.id = setup_session_id AND s.owner_user_id = app.current_user_id() AND s.condominium_id IS NULL))
      OR (condominium_id = app.current_condominium_id() AND EXISTS (SELECT 1 FROM app.chats c
        WHERE c.condominium_id = conversation_entries.condominium_id AND c.owner_user_id = app.current_user_id() AND c.id = chat_id))));

-- Backfill executado pelo migrador administrativo, sem gerar falas retroativas.
INSERT INTO app.chats (condominium_id,owner_user_id,id,title)
SELECT DISTINCT condominium_id,asked_by_user_id,'00000000-0000-4000-8000-000000000000'::uuid,'Histórico anterior'
FROM app.questions WHERE chat_id IS NULL
ON CONFLICT DO NOTHING;

WITH previous AS (
  SELECT q.id AS question_id,q.condominium_id,q.asked_by_user_id AS owner_user_id,
    COALESCE(q.chat_id,'00000000-0000-4000-8000-000000000000'::uuid) AS chat_id,
    q.content,q.created_at,a.id AS answer_id,a.direct_answer,
    jsonb_build_object('answerId',a.id,'questionId',q.id,'condominiumId',q.condominium_id,
      'riskClass',a.risk_class,'createdAt',a.created_at,'answer',a.direct_answer,'answerMode',a.answer_mode,
      'attentionPoints',a.attention_points,'suggestedNextStep',a.suggested_next_step,
      'specialist',jsonb_build_object('required',a.specialist_required,'type',a.specialist_type,'reason',a.specialist_reason),
      'citations',COALESCE((SELECT jsonb_agg(jsonb_build_object('id',c.id,'evidenceId',c.retrieval_evidence_id,
        'documentId',c.document_id,'documentVersionId',c.document_version_id,'title',c.document_title_snapshot,
        'page',c.page_number_snapshot,'excerpt',c.excerpt_snapshot,'sourceScope',c.source_scope,
        'sourceRemoved',c.source_removed_at IS NOT NULL,'startOffset',c.page_start_offset,'endOffset',c.page_end_offset)
        ORDER BY c.ordinal) FROM app.citations c WHERE c.condominium_id=a.condominium_id AND c.answer_id=a.id),'[]'::jsonb)) AS answer
  FROM app.questions q JOIN app.answers a ON a.condominium_id=q.condominium_id AND a.question_id=q.id
)
INSERT INTO app.conversation_entries (id,owner_user_id,condominium_id,chat_id,scope_key,request_key,input_hash,created_at,messages,response,metadata)
SELECT answer_id,owner_user_id,condominium_id,chat_id,'chat:'||condominium_id::text||':'||chat_id::text,
  'answer:'||answer_id::text,repeat('0',64),created_at,
  jsonb_build_array(jsonb_build_object('id',question_id,'role','user','kind','question_answer','text',content),
    jsonb_build_object('id',answer_id,'role','assistant','kind','question_answer','text',direct_answer,'answer',answer)),
  answer,jsonb_build_object('origin','legacy_backfill','memoryReplaySafe',false)
FROM previous ORDER BY created_at,question_id;

COMMIT;
