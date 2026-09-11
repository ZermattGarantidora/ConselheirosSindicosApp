# Matriz de rastreabilidade — Spec 001

**Status:** B1–B7 implementados em escopo sintético/local; CI remoto e proteção da `main` ativos; rollout real permanece pendente
**Atualizado em:** 2026-09-11

Esta matriz liga promessas a critérios de aceitação e evidências de verificação. Os casos usam somente dados sintéticos.

## Gates de preparação

| Gate                     | Evidência                                      | Limite                                                                                                                                          |
| ------------------------ | ---------------------------------------------- | ----------------------------------------------------------------------------------------------------------------------------------------------- |
| Alinhamento da Spec 001  | `spec.md` §0 e gate `validate-spec-vision.ps1` | não altera a visão canônica                                                                                                                     |
| Arquitetura e isolamento | ADRs 0001–0009                                 | PostgreSQL/RLS, escopo autorizado e processamento local antes de dados persistidos; Neon e OCR externo somente para integração/corpus sintético |
| Dados e riscos iniciais  | `docs/security/data-handling-inicial.md`       | somente corpus sintético; nenhum piloto ou dado real                                                                                            |
| Critérios de produto     | `acceptance.md` AC-001–AC-021                  | P0 bloqueia qualquer entrega correspondente                                                                                                     |

| Requisito                                | Critérios de aceitação                                                                                                                                          | Evals                        | Teste determinístico futuro                                                                                                                                                                                                                                                                                                                                                                                                                     |
| ---------------------------------------- | --------------------------------------------------------------------------------------------------------------------------------------------------------------- | ---------------------------- | ----------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| RQ-001 Contexto autorizado e selecionado | AC-001, AC-002, AC-003, AC-022                                                                                                                                  | EVAL-010, EVAL-011, EVAL-012 | `tests/e2e/identity-context.e2e.test.ts`; `tests/unit/authorized-condominium-context.test.ts`; `tests/integration/rls-tenant-isolation.test.ts`                                                                                                                                                                                                                                                                                                 |
| RQ-002 Ingestão de PDF                   | AC-004, AC-005                                                                                                                                                  | EVAL-014                     | `apps/api/documents/document-processing.ts`; `apps/api/documents/postgres-document-processing-repository.ts`; `tests/unit/document-processing.test.ts`; `tests/unit/persisted-processing.test.ts`; `tests/unit/upload-document.test.ts`; `tests/unit/extract-pdf-text.test.ts`; `tests/unit/ocr-quality.test.ts`; `tests/unit/openai-ocr.test.ts`; `tests/e2e/document-ingestion.e2e.test.ts`; `tests/integration/rls-tenant-isolation.test.ts` |
| RQ-003 Versão e vigência                 | AC-006, AC-007                                                                                                                                                  | EVAL-008, EVAL-009           | `apps/api/documents/document-model.ts`; `apps/api/documents/version-validity.ts`; `tests/unit/document-model.test.ts`; `tests/unit/version-validity.test.ts`                                                                                                                                                                                                                                                                                    |
| RQ-004 Recuperação isolada               | AC-008, AC-009 | EVAL-010, EVAL-012 | `tests/unit/scoped-retrieval.test.ts`; `tests/unit/in-memory-scoped-retrieval.test.ts`; `tests/unit/text-retrieval.test.ts`; `tests/unit/postgres-scoped-retrieval.test.ts`; `tests/integration/rls-tenant-isolation.test.ts` |
| RQ-005 Resposta fundamentada             | AC-010, AC-011 | EVAL-001–EVAL-005, EVAL-015 | `apps/api/answers/answer-gateway.ts`; `apps/api/answers/answer-use-case.ts`; `tests/unit/answer-gateway.test.ts`; `tests/unit/answer-use-case.test.ts`; `tests/unit/postgres-scoped-retrieval.test.ts` |
| RQ-006 Citações verificáveis             | AC-012, AC-013 | EVAL-001–EVAL-005, EVAL-015 | `apps/api/answers/citation-validator.ts`; `infrastructure/database/010_answer_claim_grounding.sql`; `apps/web/App.tsx`; `tests/unit/citation-validator.test.ts`; `tests/unit/api-answers.test.ts`; `tests/unit/answer-migration.test.ts` |
| RQ-007 Abstenção                         | AC-014, AC-015 | EVAL-006, EVAL-007, EVAL-019 | `apps/api/answers/answer-use-case.ts`; `tests/unit/answer-use-case.test.ts`; `tests/unit/answer-gateway.test.ts` |
| RQ-008 Conflitos documentais             | AC-016 | EVAL-008, EVAL-009 | `apps/api/answers/conflict-detection.ts`; `apps/api/answers/answer-gateway.ts`; `tests/unit/risk-and-conflict.test.ts` |
| RQ-009 Conteúdo não confiável            | AC-017 | EVAL-012, EVAL-013 | `apps/api/answers/prompt-catalog.ts`; `apps/api/answers/answer-gateway.ts`; `tests/unit/answer-gateway.test.ts`; `evals/run.ts` |
| RQ-010 Escalonamento                     | AC-018 | EVAL-016, EVAL-017 | `apps/api/answers/risk-classification.ts`; `tests/unit/risk-and-conflict.test.ts`; `tests/unit/answer-use-case.test.ts` |
| RQ-011 Feedback                          | AC-019 | EVAL-020 | `apps/api/answers/in-memory-answer-persistence.ts`; `apps/api/answers/postgres-answer-persistence.ts`; `apps/api/answers/answer-trace.ts`; `apps/api/app/create-api.ts`; `tests/unit/api-answers.test.ts`; `tests/e2e/feedback-audit.e2e.test.ts`; `tests/unit/answer-trace.test.ts` |
| RQ-012 Auditoria e custo                 | AC-020 | EVAL-020 | `apps/api/answers/answer-persistence.ts`; `apps/api/answers/postgres-answer-persistence.ts`; `apps/api/answers/answer-trace.ts`; `apps/api/answers/postgres-answer-trace-store.ts`; `infrastructure/database/009_answers_feedback_audit.sql`; `infrastructure/database/009_answers_feedback_and_audit.sql`; `tests/unit/answer-use-case.test.ts`; `tests/e2e/feedback-audit.e2e.test.ts`; `tests/unit/postgres-answer-trace-store.test.ts` |
| RQ-013 Falha segura                      | AC-021 | EVAL-019 | `apps/api/answers/answer-use-case.ts`; `tests/unit/answer-use-case.test.ts`; `tests/unit/api-answers.test.ts` |
| RQ-014 Formato da resposta               | AC-010, AC-014, AC-016, AC-018 | EVAL-018 | `apps/api/answers/answer-contract.ts`; `apps/api/answers/citation-validator.ts`; `apps/web/App.tsx`; `tests/unit/citation-validator.test.ts` |
| ADR 0007 — alvo Neon sintético           | marcador persistente, URL PostgreSQL com TLS, papel runtime seguro, identidade externa e fence do worker; migrations 003–006 verificadas; 6/6 testes RLS/API/worker aprovados em 2026-09-03 | —                            | `scripts/neon-integration-guard.ts`; `infrastructure/database/005_worker_claim_fencing.sql`; `infrastructure/database/006_runtime_document_read_grants.sql`; `tests/unit/neon-integration-guard.test.ts`; `tests/integration/rls-tenant-isolation.test.ts`                                                                                                                                                                                      |

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

| Tarefa | Requisito/gate relacionado | Evidência | Status |
| ------ | -------------------------- | --------- | ------ |
| T601 | RQ-011, AC-019 | `apps/api/app/create-api.ts`; `apps/web/App.tsx`; `apps/api/answers/answer-trace.ts`; `tests/e2e/feedback-audit.e2e.test.ts` | concluído — sintético/local |
| T602 | RQ-012, TM-018, telemetria minimizada | `apps/api/answers/answer-trace.ts`; `apps/api/answers/postgres-answer-trace-store.ts`; `infrastructure/database/009_answers_feedback_and_audit.sql`; `tests/unit/postgres-answer-trace-store.test.ts` | concluído — adapter coberto; Neon não executado nesta etapa |
| T603 | gate de eval pelo caminho real | `evals/synthetic-adapter.ts`; `tests/e2e/synthetic-evals.e2e.test.ts` | concluído — sintético |
| T604 | EVAL-001–EVAL-020 | `evals/datasets/consulta-documental.yaml`; `tests/e2e/synthetic-evals.e2e.test.ts` | concluído — 20 casos |
| T605 | thresholds P0/P1 e baseline | `docs/quality/b6-synthetic-baseline-2026-09-10.md`; `evals/synthetic-adapter.ts` | concluído — P0 em 100% |
| T606 | CI e release gate | `.github/workflows/ci.yml`; `package.json`; `docs/quality/quality-gates.md` | concluído — comando no CI |
| T607 | AC-019, AC-020 | `tests/e2e/feedback-audit.e2e.test.ts`; `tests/unit/answer-trace.test.ts`; `tests/unit/postgres-answer-trace-store.test.ts` | concluído — sintético/local |

## Rastreamento da preparação B7

| Tarefa | Requisito/gate relacionado | Evidência esperada | Status |
| ------ | -------------------------- | ------------------ | ------ |
| T701 | TM-001–TM-013, AC-002, AC-008, AC-013, AC-017, AC-021 | `docs/security/b7-threat-model-review.md`; `tests/unit/b7-input-hardening.test.ts`; suítes existentes de upload, isolamento e gateway | concluído — piloto sintético |
| T702 | TM-003, TM-004, TM-014, TM-015, TM-020; AC-003, AC-009 | `docs/security/b7-data-lifecycle-exercise.md`; `tests/unit/b7-data-lifecycle.test.ts`; E2E de revogação | concluído — exercício sintético |
| T703 | TM-011, TM-013, TM-016, TM-019 | `docs/security/b7-incident-runbook.md`; `docs/security/b7-incident-exercise-2026-09-10.md` | concluído — piloto sintético |
| T704 | RQ-005–RQ-010; EVAL-001–EVAL-019 | `tests/e2e/synthetic-pilot.e2e.test.ts`; `apps/web/SyntheticReview.tsx`; `docs/release/b7-piloto-sintetico-2026-09-10.md`; `docs/reviews/b7-corpus-human-review-2026-09-10.md`; corpus e fixtures artificiais | concluído — 100 casos revisados; 100 aprovados; 0 para revisar; 0 reprovados, limitado ao sintético |
| T705 | gates de qualidade e release | `docs/reviews/b7-sintetico-2026-09-10.md`; `pnpm run check`; `pnpm run pilot:synthetic`; `pnpm run test:e2e`; `git diff --check` | concluído — aprovação limitada ao sintético |

Os casos desta preparação são exclusivamente sintéticos. A conclusão acima não
autoriza dados reais, rollout externo ou integração. A Fase 6 e T704 estão concluídas
apenas no escopo sintético/local; T105 e T208 estão concluídas quanto à proteção
remota da `main`, sem autorizar dados reais ou produção.

## Rastreamento da proteção remota

| Tarefa | Evidência | Status |
| ------ | --------- | ------ |
| T105 | Regra de proteção da `main` criada no GitHub em 2026-09-11; Pull Request, 1 aprovação, check `quality`, branch atualizada, conversas resolvidas, sem bypass, exclusão ou force-push | concluído — remoto |
| T208 | `.github/workflows/ci.yml` com check `quality` tornado obrigatório pela regra remota da `main` | concluído — remoto |

Em 2026-09-04, o Neon dedicado aplicou as migrations pendentes 007 e 008 e aprovou
`pnpm.cmd run test:integration`: 7/7 cenários de RLS e retrieval passaram.

Na fase inicial do B5, `tests/e2e/document-answer.e2e.test.ts` exercita o endpoint
autorizado de respostas com citação, abstenção e tentativa de acesso cruzado, usando
exclusivamente o corpus de desenvolvimento sintético.

A T507 concluiu a cobertura determinística de AC-010 a AC-018 e AC-021 nos testes
de respostas e gateway local. A Fase 6 adiciona feedback, trilha auditável e evals
sintéticos, mantendo o bloqueio para dados reais, rollout externo e seleção definitiva
de modelo até as revisões e gates correspondentes.

## Regra de manutenção

- Novo requisito exige ao menos um critério de aceitação.
- Requisito de segurança exige teste determinístico.
- Comportamento probabilístico exige eval.
- Nenhum requisito pode ser marcado como entregue enquanto sua evidência de verificação estiver ausente.
