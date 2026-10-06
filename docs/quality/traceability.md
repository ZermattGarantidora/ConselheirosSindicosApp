# Matriz de rastreabilidade — Specs 001–012

**Status:** B1–B7 implementados em escopo sintético/local; autenticação persistente aprovada para ambiente controlado; CI remoto e proteção da `main` ativos; rollout público permanece pendente
**Atualizado em:** 2026-09-24

Esta matriz liga promessas a critérios de aceitação e evidências de verificação. Os casos usam somente dados sintéticos.

## Gates de preparação

| Gate                     | Evidência                                      | Limite                                                                                                                                          |
| ------------------------ | ---------------------------------------------- | ----------------------------------------------------------------------------------------------------------------------------------------------- |
| Alinhamento da Spec 001  | `spec.md` §0 e gate `validate-spec-vision.ps1` | não altera a visão canônica                                                                                                                     |
| Arquitetura e isolamento | ADRs 0001–0009                                 | PostgreSQL/RLS, escopo autorizado e processamento local antes de dados persistidos; Neon e OCR externo somente para integração/corpus sintético |
| Dados e riscos iniciais  | `docs/security/data-handling-inicial.md`       | somente corpus sintético; nenhum piloto ou dado real                                                                                            |
| Critérios de produto     | `acceptance.md` AC-001–AC-028                  | P0 bloqueia qualquer entrega correspondente                                                                                                     |

| Requisito                                                     | Critérios de aceitação                                                                                                                                                                      | Evals                        | Teste determinístico futuro                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                  |
| ------------------------------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | ---------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------ |
| RQ-001 Contexto autorizado e selecionado                      | AC-001, AC-002, AC-003, AC-022                                                                                                                                                              | EVAL-010, EVAL-011, EVAL-012 | `tests/e2e/identity-context.e2e.test.ts`; `tests/unit/authorized-condominium-context.test.ts`; `tests/integration/rls-tenant-isolation.test.ts`                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                              |
| RQ-002 / RQ-002A / RQ-002B Ingestão, identificação e controle de PDF | AC-004, AC-005, AC-023, AC-030, AC-031 | EVAL-014 | `apps/api/documents/document-processing.ts`; `apps/api/documents/document-identification.ts`; `apps/api/documents/postgres-document-upload-repository.ts`; `apps/api/documents/postgres-private-document-storage.ts`; `apps/api/documents/postgres-document-retention-repository.ts`; `infrastructure/database/022_manager_document_removal.sql`; `apps/api/app/create-api.ts`; `apps/web/App.tsx`; `tests/unit/document-catalog.test.ts`; `tests/unit/postgres-document-adapters.test.ts`; `tests/unit/postgres-document-retention-repository.test.ts`; `tests/unit/postgres-private-document-storage.test.ts`; `tests/e2e/document-ingestion.e2e.test.ts`; `tests/integration/rls-tenant-isolation.test.ts` |
| RQ-003 Versão e vigência                                      | AC-006, AC-007                                                                                                                                                                              | EVAL-008, EVAL-009           | `apps/api/documents/document-model.ts`; `apps/api/documents/version-validity.ts`; `tests/unit/document-model.test.ts`; `tests/unit/version-validity.test.ts`                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                 |
| RQ-004 Recuperação isolada                                    | AC-008, AC-009                                                                                                                                                                              | EVAL-010, EVAL-012           | `tests/unit/scoped-retrieval.test.ts`; `tests/unit/in-memory-scoped-retrieval.test.ts`; `tests/unit/text-retrieval.test.ts`; `tests/unit/postgres-scoped-retrieval.test.ts`; `tests/integration/rls-tenant-isolation.test.ts`                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                |
| RQ-005 Resposta fundamentada                                  | AC-010, AC-011, AC-024                                                                                                                                                                      | EVAL-001–EVAL-005, EVAL-015  | `apps/api/answers/answer-gateway.ts`; `apps/api/answers/answer-use-case.ts`; `apps/web/App.tsx`; `tests/unit/answer-gateway.test.ts`; `tests/unit/answer-use-case.test.ts`; `tests/unit/postgres-scoped-retrieval.test.ts`                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                   |
| RQ-006 Citações verificáveis                                  | AC-012, AC-013                                                                                                                                                                              | EVAL-001–EVAL-005, EVAL-015  | `apps/api/answers/citation-validator.ts`; `infrastructure/database/010_answer_claim_grounding.sql`; `apps/web/App.tsx`; `tests/unit/citation-validator.test.ts`; `tests/unit/api-answers.test.ts`; `tests/unit/answer-migration.test.ts`                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                     |
| RQ-007 Abstenção                                              | AC-014, AC-015                                                                                                                                                                              | EVAL-006, EVAL-007, EVAL-019 | `apps/api/answers/answer-use-case.ts`; `tests/unit/answer-use-case.test.ts`; `tests/unit/answer-gateway.test.ts`                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                             |
| RQ-008 Conflitos documentais                                  | AC-016                                                                                                                                                                                      | EVAL-008, EVAL-009           | `apps/api/answers/conflict-detection.ts`; `apps/api/answers/answer-gateway.ts`; `tests/unit/risk-and-conflict.test.ts`                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                       |
| RQ-009 Conteúdo não confiável                                 | AC-017                                                                                                                                                                                      | EVAL-012, EVAL-013           | `apps/api/answers/prompt-catalog.ts`; `apps/api/answers/answer-gateway.ts`; `tests/unit/answer-gateway.test.ts`; `evals/run.ts`                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                              |
| RQ-010 Escalonamento                                          | AC-018                                                                                                                                                                                      | EVAL-016, EVAL-017           | `apps/api/answers/risk-classification.ts`; `tests/unit/risk-and-conflict.test.ts`; `tests/unit/answer-use-case.test.ts`                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                      |
| RQ-011 Feedback                                               | AC-019                                                                                                                                                                                      | EVAL-020                     | `apps/api/answers/in-memory-answer-persistence.ts`; `apps/api/answers/postgres-answer-persistence.ts`; `apps/api/answers/answer-trace.ts`; `apps/api/app/create-api.ts`; `tests/unit/api-answers.test.ts`; `tests/e2e/feedback-audit.e2e.test.ts`; `tests/unit/answer-trace.test.ts`                                                                                                                                                                                                                                                                                                                                                                                                                                                                         |
| RQ-012 Auditoria e custo                                      | AC-020                                                                                                                                                                                      | EVAL-020                     | `apps/api/answers/answer-persistence.ts`; `apps/api/answers/postgres-answer-persistence.ts`; `apps/api/answers/answer-trace.ts`; `apps/api/answers/postgres-answer-trace-store.ts`; `infrastructure/database/009_answers_feedback_audit.sql`; `infrastructure/database/009_answers_feedback_and_audit.sql`; `tests/unit/answer-use-case.test.ts`; `tests/e2e/feedback-audit.e2e.test.ts`; `tests/unit/postgres-answer-trace-store.test.ts`                                                                                                                                                                                                                                                                                                                   |
| RQ-013 Falha segura                                           | AC-021, AC-025                                                                                                                                                                              | EVAL-019                     | `apps/api/answers/answer-gateway.ts`; `apps/api/answers/answer-use-case.ts`; `apps/api/app/server.ts`; `tests/unit/answer-gateway.test.ts`; `tests/unit/answer-use-case.test.ts`; `tests/unit/api-answers.test.ts`                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                           |
| RQ-014 Formato da resposta                                    | AC-010, AC-014, AC-016, AC-018, AC-028                                                                                                                                                      | EVAL-018                     | `apps/shared/conversation-intent.ts`; `apps/api/answers/answer-contract.ts`; `apps/api/answers/citation-validator.ts`; `apps/api/answers/prompt-catalog.ts`; `apps/api/answers/answer-use-case.ts`; `apps/api/answers/answer-gateway.ts`; `apps/web/App.tsx`; `apps/web/styles.css`; `tests/unit/conversation-intent.test.ts`; `tests/unit/citation-validator.test.ts`; `tests/unit/prompt-catalog.test.ts`; `tests/unit/chat-turn-ui.test.ts`; `tests/unit/answer-use-case.test.ts`; `tests/unit/answer-gateway.test.ts`                                                                                                                                                                                                                                                                                                                                                                                                                                   |
| RQ-015 Integridade dos turnos e confirmação de envio          | AC-026                                                                                                                                                                                      | —                            | `apps/web/App.tsx`; `tests/unit/chat-turn-ui.test.ts`                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                        |
| RQ-016 Latência sem duplicação de evidência                   | AC-027                                                                                                                                                                                      | —                            | `apps/api/answers/gemini-answer-gateway.ts`; `apps/api/answers/prompt-catalog.ts`; `tests/unit/gemini-answer-gateway.test.ts`                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                |
| ADR 0007 — alvo Neon sintético                                | marcador persistente, URL PostgreSQL com TLS, papel runtime seguro, identidade externa e fence do worker; migrations 003–006 verificadas; 6/6 testes RLS/API/worker aprovados em 2026-09-03 | —                            | `scripts/neon-integration-guard.ts`; `infrastructure/database/005_worker_claim_fencing.sql`; `infrastructure/database/006_runtime_document_read_grants.sql`; `tests/unit/neon-integration-guard.test.ts`; `tests/integration/rls-tenant-isolation.test.ts`                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                   |
| Spec 003 — entrada e criação local                            | AC-301–AC-316                                                                                                                                                                               | —                            | `apps/web/App.tsx`; `apps/web/styles.css`; `apps/api/identity/development-identity-repository.ts`; `apps/api/documents/development-document-memory.ts`; `apps/api/app/create-api.ts`; `tests/unit/development-test-condominium.test.ts`; `tests/unit/development-document-memory.test.ts`; `tests/unit/mobile-navigation.test.ts`                                                                                                                                                                                                                                                                                                                                                                                                                            |
| Spec 004 — gateway Gemini local                               | AC-401–AC-412                                                                                                                                                                               | —                            | `apps/api/answers/gemini-answer-gateway.ts`; `apps/api/answers/answer-gateway.ts`; `apps/api/answers/answer-use-case.ts`; `tests/unit/gemini-answer-gateway.test.ts`; `tests/unit/answer-use-case.test.ts`; `tests/unit/answer-gateway.test.ts`; `tests/unit/risk-and-conflict.test.ts`; `tests/unit/prompt-catalog.test.ts`                                                                                                                                                                                                                                                                                                                                                                                                                                 |
| Spec 005 — método de atuação da Cora                          | AC-501–AC-511                                                                                                                                                                               | —                            | `apps/shared/conversation-intent.ts`; `apps/api/answers/prompt-catalog.ts`; `apps/api/answers/answer-use-case.ts`; `apps/api/answers/answer-gateway.ts`; `apps/web/App.tsx`; `apps/web/styles.css`; `apps/web/message-format.ts`; `tests/unit/conversation-intent.test.ts`; `tests/unit/prompt-catalog.test.ts`; `tests/unit/answer-use-case.test.ts`; `tests/unit/answer-gateway.test.ts`; `tests/unit/chat-turn-ui.test.ts`; `tests/unit/web-message-format.test.ts`                                                                                                                                                                                                                                                                                                                                                                                                                                                                       |
| Spec 006 — autenticação real                                  | AC-601–AC-613                                                                                                                                                                               | —                            | `apps/api/identity/account-auth.ts`; `apps/api/identity/postgres-account-auth.ts`; `apps/api/app/create-api.ts`; `apps/api/app/server.ts`; `apps/web/App.tsx`; `apps/web/styles.css`; `contracts/http/health.openapi.json`; `infrastructure/database/011_real_account_auth.sql`; `tests/unit/account-auth.test.ts`; `tests/unit/health-contract.test.ts`; `tests/unit/mobile-navigation.test.ts`; `tests/unit/server.test.ts`; `tests/e2e/identity-context.e2e.test.ts`                                                                                                                                                                                                                                                                                      |
| Spec 007 — criação real de condomínio                         | AC-701–AC-710                                                                                                                                                                               | —                            | `apps/api/identity/postgres-condominium-directory.ts`; `apps/api/app/create-api.ts`; `apps/api/app/server.ts`; `apps/web/App.tsx`; `apps/web/document-upload-request.ts`; `apps/web/styles.css`; `infrastructure/database/012_real_condominium_creation.sql`; `tests/unit/postgres-condominium-directory.test.ts`; `tests/unit/real-condominium-creation.test.ts`; `tests/unit/condominium-registration-feedback.test.ts`; `tests/unit/web-document-upload.test.ts`                                                                                                                                                                                                                                                                                          |
| Spec 008 — login com Google                                   | AC-801–AC-807                                                                                                                                                                               | —                            | `apps/api/identity/google-oauth.ts`; `apps/api/identity/account-auth.ts`; `apps/api/app/create-api.ts`; `apps/api/app/server.ts`; `apps/web/App.tsx`; `apps/web/styles.css`; `infrastructure/database/013_google_oauth_identity.sql`; `tests/unit/google-oauth.test.ts`; `tests/unit/account-auth.test.ts`; `tests/unit/mobile-navigation.test.ts`                                                                                                                                                                                                                                                                                                                                                                                                           |
| Spec 009 — configurações, perfil, documentos e exclusão do condomínio | AC-901–AC-914                                                                                                                                                                       | —                            | `apps/web/App.tsx`; `apps/web/styles.css`; `apps/api/app/create-api.ts`; `apps/api/identity/condominium-profile.ts`; `apps/api/identity/postgres-condominium-profile.ts`; `apps/api/identity/in-memory-condominium-profile.ts`; `apps/api/documents/document-catalog.ts`; `apps/api/documents/development-document-upload-repository.ts`; `apps/api/documents/postgres-document-upload-repository.ts`; `apps/api/identity/development-identity-repository.ts`; `apps/api/identity/postgres-condominium-directory.ts`; `infrastructure/database/014_leave_condominium_management.sql`; `infrastructure/database/015_delete_condominium.sql`; `infrastructure/database/023_condominium_profile_customization.sql`; `tests/unit/condominium-profile.test.ts`; `tests/unit/in-memory-condominium-profile.test.ts`; `tests/unit/postgres-condominium-profile.test.ts`; `tests/unit/api-condominium-profile.test.ts`; `tests/unit/condominium-profile-migration.test.ts`; `tests/unit/document-catalog.test.ts`; `tests/unit/api-answers.test.ts`; `tests/unit/mobile-navigation.test.ts`; `tests/unit/development-test-condominium.test.ts`; `tests/unit/postgres-condominium-directory.test.ts`; `tests/unit/real-condominium-creation.test.ts` |
| Spec 010 — proteção de carga do piloto                        | AC-1001–AC-1004                                                                                                                                                                             | —                            | `apps/api/operations/tenant-work-limiter.ts`; `apps/api/app/create-api.ts`; `tests/unit/tenant-work-limiter.test.ts`; `tests/unit/api-answers.test.ts`; `tests/unit/b7-input-hardening.test.ts`                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                              |
| Spec 011 — piloto real controlado                             | AC-1101–AC-1106                                                                                                                                                                             | —                            | Evidências pendentes: decisão de ambiente, política LGPD, testes no ambiente efetivo, termo de participação e checklist operacional; nenhuma entrada de dado real é autorizada enquanto estiver em rascunho.                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                 |
| Spec 012 — painel administrativo da Zermatt                   | AC-1201–AC-1208                                                                                                                                                                             | —                            | `apps/api/admin/admin-dashboard.ts`; `apps/api/app/create-api.ts`; `apps/api/app/server.ts`; `apps/web/App.tsx`; `apps/web/styles.css`; `infrastructure/database/016_admin_dashboard_metrics.sql`; `infrastructure/database/017_admin_account_directory.sql`; `tests/unit/admin-dashboard.test.ts`; `tests/unit/admin-dashboard-ui.test.ts`; acesso restrito à conta administrativa confirmada.                                                                                                                                                                                                                                                                                                                                                              |
| ADR 0012 — PostgreSQL remoto de staging                       | TLS, migrations ordenadas e credencial somente no servidor                                                                                                                                  | —                            | `scripts/database-migrations.ts`; `scripts/migrate-database.ts`; `package.json`; `.env.example`; `docs/adr/0012-postgresql-gerenciado-remoto.md`                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                             |
| ADR 0014 — painel administrativo minimizado                   | allowlist no servidor, agregação mínima e separação de finalidade                                                                                                                           | —                            | `docs/adr/0014-painel-administrativo-minimizado.md`; `apps/api/admin/admin-dashboard.ts`; `infrastructure/database/016_admin_dashboard_metrics.sql`; `tests/unit/admin-dashboard.test.ts`                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                    |

AC-912–AC-913 têm implementação vinculada à Spec 009 e à migration 023. A validação e normalização do perfil, assinaturas JPEG/PNG/WebP, tamanho, limite, capa, leitura, remoção e purge em memória são cobertos por `tests/unit/condominium-profile.test.ts` e `tests/unit/in-memory-condominium-profile.test.ts`. O adaptador PostgreSQL, o contrato de RLS/funções da migration e as rotas HTTP autorizadas são cobertos por `tests/unit/postgres-condominium-profile.test.ts`, `tests/unit/condominium-profile-migration.test.ts` e `tests/unit/api-condominium-profile.test.ts`. AC-914 descreve a navegação por abas das configurações; sua verificação automatizada permanece pendente.

Em 2026-10-06, a migration 024 corrigiu a permissão mínima do worker para ler e identificar
documentos apenas no `condominium_id` de processamento. `tests/unit/identity-migration.test.ts`
verifica os grants e policies, e `tests/integration/rls-tenant-isolation.test.ts` passou com 7/7
cenários no Neon sintético marcado, incluindo upload, processamento, recuperação isolada e
revogação de acesso.

Na primeira fatia do B4, a verificação determinística de RQ-004 também está em
`tests/unit/text-retrieval.test.ts`, `tests/unit/postgres-scoped-retrieval.test.ts` e
`tests/integration/rls-tenant-isolation.test.ts`. T401–T405 são exercitadas por
`tests/unit/retrieval-contract.test.ts`, `tests/unit/local-embedding.test.ts`,
`tests/unit/retrieval-ranking.test.ts` e `tests/unit/scoped-retrieval.test.ts`.

Para B5 e B6, a execução local de `pnpm run evals` aprovou 20/20 casos, com 14/14
casos P0 e 6/6 casos P1 aprovados. A última execução de `pnpm run test:coverage`
registrou 94,12% de statements, 86,49% de branches, 96,90% de functions e 94,07%
de lines. O banco PostgreSQL foi coberto por testes determinísticos do adaptador e a
migration 009 foi aplicada no Neon dedicado e sintético.

Em 2026-09-04, o Neon dedicado aplicou as migrations pendentes 007 e 008 e aprovou
`pnpm.cmd run test:integration`: 7/7 cenários de RLS e retrieval passaram.
Em 2026-09-09, a migration 009 foi aplicada no mesmo alvo e `pnpm run test:integration`
passou com 7/7 cenários; o setup dos fixtures passou a limpar as tabelas B6 antes das
tabelas documentais.

## Rastreamento da Fase 6

| Tarefa | Requisito/gate relacionado            | Evidência                                                                                                                                                                                             | Status                                                      |
| ------ | ------------------------------------- | ----------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | ----------------------------------------------------------- |
| T601   | RQ-011, AC-019                        | `apps/api/app/create-api.ts`; `apps/web/App.tsx`; `apps/api/answers/answer-trace.ts`; `tests/e2e/feedback-audit.e2e.test.ts`                                                                          | concluído — sintético/local                                 |
| T602   | RQ-012, TM-018, telemetria minimizada | `apps/api/answers/answer-trace.ts`; `apps/api/answers/postgres-answer-trace-store.ts`; `infrastructure/database/009_answers_feedback_and_audit.sql`; `tests/unit/postgres-answer-trace-store.test.ts` | concluído — adapter coberto; Neon não executado nesta etapa |
| T603   | gate de eval pelo caminho real        | `evals/synthetic-adapter.ts`; `tests/e2e/synthetic-evals.e2e.test.ts`                                                                                                                                 | concluído — sintético                                       |
| T604   | EVAL-001–EVAL-020                     | `evals/datasets/consulta-documental.yaml`; `tests/e2e/synthetic-evals.e2e.test.ts`                                                                                                                    | concluído — 20 casos                                        |
| T605   | thresholds P0/P1 e baseline           | `docs/quality/b6-synthetic-baseline-2026-09-10.md`; `evals/synthetic-adapter.ts`                                                                                                                      | concluído — P0 em 100%                                      |
| T606   | CI e release gate                     | `.github/workflows/ci.yml`; `package.json`; `docs/quality/quality-gates.md`                                                                                                                           | concluído — comando no CI                                   |
| T607   | AC-019, AC-020                        | `tests/e2e/feedback-audit.e2e.test.ts`; `tests/unit/answer-trace.test.ts`; `tests/unit/postgres-answer-trace-store.test.ts`                                                                           | concluído — sintético/local                                 |

## Rastreamento da preparação B7

| Tarefa | Requisito/gate relacionado                             | Evidência esperada                                                                                                                                                                                            | Status                                                                                              |
| ------ | ------------------------------------------------------ | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | --------------------------------------------------------------------------------------------------- |
| T701   | TM-001–TM-013, AC-002, AC-008, AC-013, AC-017, AC-021  | `docs/security/b7-threat-model-review.md`; `tests/unit/b7-input-hardening.test.ts`; suítes existentes de upload, isolamento e gateway                                                                         | concluído — piloto sintético                                                                        |
| T702   | TM-003, TM-004, TM-014, TM-015, TM-020; AC-003, AC-009 | `docs/security/b7-data-lifecycle-exercise.md`; `tests/unit/b7-data-lifecycle.test.ts`; E2E de revogação                                                                                                       | concluído — exercício sintético                                                                     |
| T703   | TM-011, TM-013, TM-016, TM-019                         | `docs/security/b7-incident-runbook.md`; `docs/security/b7-incident-exercise-2026-09-10.md`                                                                                                                    | concluído — piloto sintético                                                                        |
| T704   | RQ-005–RQ-010; EVAL-001–EVAL-019                       | `tests/e2e/synthetic-pilot.e2e.test.ts`; `apps/web/SyntheticReview.tsx`; `docs/release/b7-piloto-sintetico-2026-09-10.md`; `docs/reviews/b7-corpus-human-review-2026-09-10.md`; corpus e fixtures artificiais | concluído — 100 casos revisados; 100 aprovados; 0 para revisar; 0 reprovados, limitado ao sintético |
| T705   | gates de qualidade e release                           | `docs/reviews/b7-sintetico-2026-09-10.md`; `pnpm run check`; `pnpm run pilot:synthetic`; `pnpm run test:e2e`; `git diff --check`                                                                              | concluído — aprovação limitada ao sintético                                                         |
| T706   | RQ-1001, RQ-1002; AC-1001–AC-1004                      | `apps/api/operations/tenant-work-limiter.ts`; `tests/unit/tenant-work-limiter.test.ts`; `tests/unit/api-answers.test.ts`; `tests/unit/b7-input-hardening.test.ts`                                             | concluído — proteção local; não libera rollout externo                                              |

Os casos desta preparação são exclusivamente sintéticos. A conclusão acima não
autoriza dados reais, rollout externo ou integração. A Fase 6 e T704 estão concluídas
apenas no escopo sintético/local; T105 e T208 estão concluídas quanto à proteção
remota da `main`, sem autorizar dados reais ou produção.

## Rastreamento da proteção remota

| Tarefa | Evidência                                                                                                                                                                           | Status             |
| ------ | ----------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | ------------------ |
| T105   | Regra de proteção da `main` criada no GitHub em 2026-09-11; Pull Request, 1 aprovação, check `quality`, branch atualizada, conversas resolvidas, sem bypass, exclusão ou force-push | concluído — remoto |
| T208   | `.github/workflows/ci.yml` com check `quality` tornado obrigatório pela regra remota da `main`                                                                                      | concluído — remoto |

Em 2026-09-04, o Neon dedicado aplicou as migrations pendentes 007 e 008 e aprovou
`pnpm.cmd run test:integration`: 7/7 cenários de RLS e retrieval passaram.

Na fase inicial do B5, `tests/e2e/document-answer.e2e.test.ts` exercita o endpoint
autorizado de respostas com citação, abstenção e tentativa de acesso cruzado, usando
exclusivamente o corpus de desenvolvimento sintético.

A T507 concluiu a cobertura determinística de AC-010 a AC-018 e AC-021 nos testes
de respostas e gateway local. A Fase 6 adiciona feedback, trilha auditável e evals
sintéticos, mantendo o bloqueio para dados reais, rollout externo e seleção definitiva
de modelo até as revisões e gates correspondentes.

Em 2026-09-18, `pnpm run check` aprovou 58 arquivos e 314 testes após a integração
da autenticação persistente, da criação real de condomínios, do login Google, das
configurações do chat, da landing page responsiva e do runner remoto de migrations. A cobertura ficou em 89,11% de
statements, 80,36% de branches, 97,04% de functions e 90,42% de lines. A autenticação real ainda não foi
exercitada contra um banco local neste ambiente, pois Docker/PostgreSQL não está
disponível; a suíte usa o adaptador em memória e cobre o contrato das migrations.

Em 2026-09-22, `pnpm run check` aprovou 61 arquivos e 346 testes após a inclusão do
painel administrativo minimizado e do diretório operacional de contas. A cobertura
ficou em 89,30% de statements, 80,82% de branches, 96,17% de functions e 90,57% de
lines. As migrations 016 e 017 e o adaptador PostgreSQL foram verificados de forma
determinística. Em seguida, as duas migrations foram aplicadas ao banco remoto
controlado para habilitar a conta administrativa confirmada pelo usuário e listar no
máximo 100 contas ativas somente com nome e e-mail. A validação operacional não
consultou dados condominiais nem conteúdo documental.

Em 2026-09-22, a correção de roteamento de orientações operacionais da AC-408 foi
verificada por `pnpm run check`, com 61 arquivos e 348 testes aprovados e cobertura de
89,63% de statements, 81,25% de branches, 96,17% de functions e 90,93% de lines.
`pnpm run evals` também aprovou os 20 casos da Spec 001, incluindo 14/14 casos P0.

Na mesma data, a recuperação do login real após reinício foi verificada por
`pnpm run check`, com 61 arquivos e 349 testes aprovados e cobertura de 89,62% de
statements, 81,27% de branches, 96,18% de functions e 90,91% de lines. O caso de
regressão confirma que um cookie antigo não bloqueia `/health` nem `/v1/runtime`, e a
interface não rebaixa falha de conexão para demonstração. `pnpm run evals` permaneceu
com 20/20 casos aprovados e 14/14 P0.

Também em 2026-09-22, a linguagem da Cora foi ajustada para um tom cordial, simples e
pouco formal, sem gírias, linguagem infantil ou juridiquês. `pnpm run check` aprovou
62 arquivos e 350 testes, com cobertura de 89,62% de statements, 81,27% de branches,
96,18% de functions e 90,91% de lines. `pnpm run evals` permaneceu com 20/20 casos
aprovados e 14/14 P0.

Em 2026-09-23, o fluxo de consulta passou a buscar primeiro nos documentos para toda
pergunta substantiva. Evidência suficiente gera uma resposta formulada para a pergunta
com fonte destacada; ausência, baixa qualidade ou trecho tangencial geram orientação
geral identificada, sem citação nem regra local inventada. O transporte Gemini foi
movido para `generateContent`, conforme ADR 0015, depois que a API Interactions expirou
e o método suportado respondeu com o mesmo modelo. `pnpm run check` aprovou 62 arquivos
e 354 testes, com cobertura de 89,10% de statements, 80,52% de branches, 96,03% de
functions e 90,30% de lines. `pnpm run evals` aprovou 20/20 casos, incluindo 14/14 P0.
A verificação real com `gemini-3.5-flash-lite` e a pergunta sobre perturbação do sossego
foi concluída em cerca de nove segundos; a interface exibiu `Orientação geral`, risco
alto, limitação documental, indicação de advogado e zero fontes inventadas. Uma segunda
verificação, somente com evidência sintética, produziu `answerMode: grounded` e preservou
título, página 4 e trecho integral reconstruídos localmente.

Também em 2026-09-23, a retomada de um cadastro interrompido passou a reconhecer o
condomínio que já pertence à mesma conta e continuar o envio dos documentos, sem criar
outro condomínio ou outro vínculo. Um CNPJ pertencente a uma conta diferente continua
bloqueado sem revelar dados do cadastro existente. `pnpm run check` aprovou 62 arquivos
e 357 testes, com cobertura de 89,21% de statements, 80,57% de branches, 96,22% de
functions e 90,41% de lines.

Ainda em 2026-09-23, as configurações do condomínio passaram a listar somente os
documentos ativos do contexto autorizado, com tipo, versão mais recente, processamento
e vigência, e a permitir o envio confirmado de múltiplos PDFs. O catálogo usa o mesmo
escopo de membership e `condominium_id` do upload, com estados de carregamento, vazio e
falha na interface. `pnpm run check` aprovou 63 arquivos e 362 testes, com cobertura de
89,00% de statements, 80,18% de branches, 95,97% de functions e 90,18% de lines. A
verificação visual local confirmou a listagem e o formulário responsivo sem erros no
navegador.

Também em 2026-09-23, o modo real com e-mail e senha tornou-se o padrão obrigatório.
Sem `DATABASE_URL`, a API não inicia nem expõe dados sintéticos; a demonstração local
passou a exigir `DEMO_MODE=true` de forma explícita. `pnpm run check` aprovou 63 arquivos
e 363 testes, com cobertura de 89,01% de statements, 80,24% de branches, 95,97% de
functions e 90,20% de lines.

Na mesma data, a autenticação real passou a recuperar de forma automática e limitada
falhas temporárias de DNS, timeout e conexão encerrada. A retomada reconhece contas e
sessões que a própria tentativa anterior tenha criado, sem converter perda de confirmação
em duplicidade indevida; indisponibilidade persistente retorna `503` sem expor detalhes do
banco. `pnpm run check` aprovou 63 arquivos e 366 testes, com cobertura de 89,05% de
statements, 80,58% de branches, 95,74% de functions e 90,40% de lines. A verificação
final, incluindo a preservação do erro entre módulos, aprovou 367 testes e cobertura de
89,15% de statements, 80,39% de branches, 95,74% de functions e 90,50% de lines.

Também em 2026-09-23, o envio documental passou a declarar o cookie de mesma origem e,
após `401` ou `403`, revalidar o mesmo `condominium_id` antes de repetir o arquivo uma
única vez. A repetição só ocorre quando o servidor confirma `document:upload`; falhas de
armazenamento e negações persistentes não são repetidas. `pnpm run check` aprovou 64
arquivos e 370 testes, mantendo cobertura de 89,15% de statements, 80,39% de branches,
95,74% de functions e 90,50% de lines.

Em 2026-09-24, o chat passou a remover a resposta anterior da área ativa antes de
mostrar a espera da pergunta seguinte, mantendo cada resposta no turno correto e
confirmando o envio com um som curto que não bloqueia a requisição. Uma resposta
concluída com sucesso produz um segundo som, diferente do envio, sem transformar falhas
em confirmação de sucesso. Cumprimentos e perguntas sociais passaram a receber uma frase
curta, orientações gerais ficaram limitadas a três frases ou dois passos e a interface
deixou de repetir alertas e blocos vazios de fontes. O contrato Gemini passou a solicitar
somente o `evidenceId` de cada citação e a reconstruir localmente os metadados verificáveis,
reduzindo saída redundante sem alterar o grounding. O comando `pnpm run check` aprovou 65
arquivos e 375 testes, com cobertura de 89,16% de statements, 80,52% de branches, 95,75%
de functions e 90,47% de lines.

Na mesma data, o acesso às configurações no cabeçalho móvel recebeu um ícone de
engrenagem de 22 pixels, área de toque de 44 por 44 pixels, contraste reforçado e
espaçamento lateral seguro. A verificação visual em viewport de 390 por 844 pixels
confirmou o ícone centralizado e sem corte; `pnpm run check` permaneceu com 65 arquivos
e 375 testes aprovados.

Também em 2026-09-24, o RQ-014 e os AC-028, AC-509 e AC-510 passaram a reservar pontos
de atenção e próximo passo para abstenção, falha, conflito, risco alto, validação
profissional ou degradação relevante. Respostas documentais comuns de risco baixo ou
médio deixam esses campos vazios, e a interface reúne toda ressalva essencial no mesmo
cartão da resposta. A verificação determinística está em
`tests/unit/answer-use-case.test.ts`, `tests/unit/prompt-catalog.test.ts` e
`tests/unit/chat-turn-ui.test.ts`. `pnpm run check` aprovou 65 arquivos e 377 testes,
com cobertura de 89,28% de statements, 80,65% de branches, 95,94% de functions e
90,59% de lines. `pnpm run evals` aprovou 20/20 casos, incluindo 14/14 casos P0.

Ainda em 2026-09-24, o RQ-013 e os AC-025 e AC-406 passaram a exigir recuperação
limitada de falhas transitórias da Gemini antes do fallback. O gateway usa até três
tentativas dentro de um único orçamento de tempo, respeita `Retry-After` e não repete
falhas permanentes de autenticação ou configuração. O fallback documental deixou de
copiar blocos brutos: transforma valores e datas recuperados em frases curtas ou se
abstém quando não consegue formular uma conclusão completa sem distorcer a fonte. Os
testes de regressão estão em `tests/unit/gemini-answer-gateway.test.ts` e
`tests/unit/answer-gateway.test.ts`. `pnpm run check` aprovou 65 arquivos e 380 testes,
com cobertura de 89,29% de statements, 80,63% de branches, 95,70% de functions e
90,68% de lines. `pnpm run evals` aprovou 20/20 casos, incluindo 14/14 casos P0.

Também em 2026-09-24, o RQ-014 e o AC-511 calibraram a completude das respostas
substantivas. O prompt `answer-prompt-v14` elevou o limite de 70 para 90 palavras e
passou a pedir, depois da conclusão, um ou dois detalhes úteis sustentados, como
condição, prazo, exceção ou consequência, sem permitir introdução, repetição ou texto
de preenchimento. A regra está verificada em `tests/unit/prompt-catalog.test.ts`.
`pnpm run check` aprovou 65 arquivos e 380 testes, com cobertura de 89,29% de
statements, 80,63% de branches, 95,70% de functions e 90,68% de lines. `pnpm run
evals` aprovou 20/20 casos, incluindo 14/14 casos P0.

Ainda em 2026-09-24, o RQ-017 e o AC-029 definiram a legislação oficial compartilhada
como base principal das perguntas substantivas, sem misturá-la aos documentos privados
dos condomínios. A migration 018 cria fontes, versões, páginas e trechos legais somente
leitura para o runtime; a recuperação combinada identifica `legislation` e preserva o
escopo do condomínio na mesma consulta. O importador administrativo valida o domínio
oficial da Câmara, o PDF, o hash e a versão da Constituição atualizada até a EC 139/2026.
O prompt `answer-prompt-v15` exige diferenciar lei e documento interno e impede citação
legal irrelevante. `pnpm run check` aprovou 66 arquivos e 384 testes, com cobertura de
89,29% de statements, 80,72% de branches, 95,70% de functions e 90,68% de lines.
`pnpm run evals` aprovou 20/20 casos, incluindo 14/14 casos P0. Após confirmação
explícita, a migration 018 foi aplicada no banco remoto e o PDF oficial foi importado
como versão 1, com 152 páginas e 529 trechos pesquisáveis. Uma consulta de leitura
confirmou a versão vigente e recuperou, na página 3, o trecho constitucional sobre o
direito de propriedade. A API foi reiniciada e o endpoint de saúde confirmou o modo
real de autenticação e o provedor Gemini.

## Regra de manutenção

## Rastreamento da Spec 013 — Leitura integral de PDFs

| Requisito/critério        | Evidência                                                                                                                                                                                        | Status                                                                             |
| ------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------ | ---------------------------------------------------------------------------------- |
| RQ-1301, AC-1301, AC-1307 | `apps/api/documents/extract-pdf-text.ts`; `apps/api/documents/document-processing.ts`; `infrastructure/database/019_document_extraction_completeness.sql`; `tests/unit/extract-pdf-text.test.ts` | implementado — páginas, hash, limite de 500 e falha recuperável                    |
| RQ-1302, AC-1302          | `apps/api/documents/extract-pdf-text.ts`; `tests/unit/extract-pdf-text.test.ts`                                                                                                                  | implementado — quebras de linha preservadas                                        |
| RQ-1303, AC-1303, AC-1304 | `apps/api/documents/document-processing.ts`; `apps/api/documents/ocr-quality.ts`; `tests/unit/document-processing.test.ts`                                                                       | implementado — completude e OCR insuficiente mantêm revisão                        |
| RQ-1304, AC-1305          | `apps/api/documents/document-catalog.ts`; `apps/api/documents/postgres-document-upload-repository.ts`; `apps/web/App.tsx`; `tests/unit/document-catalog.test.ts`                                 | implementado — catálogo exibe leitura e páginas a revisar                          |
| RQ-1305, AC-1306, AC-1308 | `apps/api/documents/postgres-document-upload-repository.ts`; `apps/api/documents/postgres-document-processing-repository.ts`; `tests/unit/postgres-document-adapters.test.ts`                    | implementado — resumo escopado por condomínio; OCR indisponível não publica pronto |

Em 2026-10-05, a Spec 013 elevou o limite de PDF para 25 MB, preservando o máximo de 500 páginas. A migration 019 mantém o resumo de extração por versão documental e bloqueia o estado `ready` quando as contagens não indicam completude.

- Novo requisito exige ao menos um critério de aceitação.
- Requisito de segurança exige teste determinístico.
- Comportamento probabilístico exige eval.
- Nenhum requisito pode ser marcado como entregue enquanto sua evidência de verificação estiver ausente.
