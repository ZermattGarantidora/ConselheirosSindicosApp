# Matriz de rastreabilidade — Specs 001–036

## Organização do menu da conta — 2026-10-26

| Requisito | Aceitação | Evidência |
| --- | --- | --- |
| RQ-2404/RQ-2405/RQ-2407 — menu compacto de documentos, condomínio e perfil | AC-2405, AC-2406 e AC-2408 | `App.tsx`, `styles.css` e `account-menu-ui.test.ts`; “Condomínios” expande no próprio menu, o selecionado contém “Documentos enviados” limitado aos seus arquivos e o perfil mantém a saída no rodapé em botão vermelho. |

Validação: gate de visão das 40 specs, 5 testes do menu e build web aprovados; prévia local conferida com o acordeão de condomínios, seus documentos e o perfil.

## Saudação contextual em nova conversa — 2026-10-26

| Requisito | Aceitação | Evidência |
| --- | --- | --- |
| RQ-3801/RQ-3805 — nova conversa iniciada pela Alvitra | AC-3801 e AC-3806 | `setup-message.ts`, `App.tsx`, `setup-message.test.ts`, `chat-sidebar-ui.test.ts` e `offline-demo-ui.test.ts`; a mensagem é gerada no ambiente conectado e usa uma saudação segura no modo local, sem copiar turnos, anexos, rascunhos ou cadastro. |

Validação: gate de visão das 40 specs aprovado; 11 testes unitários focados e build web aprovados. A prévia local confirmou que “Nova conversa” abre com a saudação da Alvitra.

## Fronteira determinística reforçada — 2026-10-19

| Requisito | Aceitação | Evidência |
| --- | --- | --- |
| RQ-2901 — precisão do cálculo local | AC-2901 e AC-2902 | `financial-analysis.ts`, `financial-analysis.test.ts`: frações positivas/negativas, base zero e `precision_limit` com diferença monetária preservada |
| RQ-3204 — referência literal independente de IA | AC-3205 | `document-analysis-validation.ts`, `document-analysis-validation.test.ts`: documento/versão/título/página/offset/trecho adulterados, Unicode, permissão, tenant e duplicidade |
| RQ-3202 e RQ-3204 — degradação e publicação integral | AC-3204 e AC-3205 | `deterministic-analysis.e2e.test.ts`: cálculo sobre PDFs apesar da falha do gateway simulado; fonte ambígua invalida o relatório sem expor erro |

`pnpm run check`: 673/673 testes em 107 arquivos; statements 89,21%, branches 82,94%,
functions 95,78%, lines 91,47%; formatação, lint, tipagem, 36 specs e segredos aprovados.
E2E 52/52; evals locais 20/20; documentais determinísticos 50/50; integração sintética Neon 7/7;
build web aprovado. Sem chamadas reais de IA, migração, novos serviços ou alteração de prompt.
Os testes de autorização, isolamento e idempotência existentes permanecem aprovados;
essas regras não foram transferidas para IA nem reimplementadas.

Esta fatia reforça cálculos e referências; não implementa teto monetário global, conciliação
bancária, cache genérico entre uploads, roteamento Luna/Sol ou confirmação humana nova.
A conferência literal não atesta significado ou OCR correto. Relatório de revisão local em
`docs/reviews/2026-10-19-conferencia-deterministica.md`; revisão independente para merge e
aprovação semântica continuam pendentes.

## Integração da bateria e preparação semântica — 2026-10-16

| Requisito | Aceitação | Evidência |
| --- | --- | --- |
| RQ-3102–3104 — execução determinística fiel e completa | AC-3102, AC-3103, AC-3105 | `evals/documentary-quality/run.ts`; mapas de tabelas, OCR e segurança; `tests/e2e/documentary-quality.e2e.test.ts`: 50 executados, nenhuma pendência determinística |
| RQ-3601 — fontes independentes do gabarito | AC-3601, AC-3605 | `semantic/fixtures.ts`, `semantic/cases.ts`; teste de mutação do gabarito sem mudança de fontes/pergunta, metadados ausentes e exclusão de fontes inelegíveis |
| RQ-3602–3603 — replay e revisão distintos | AC-3602, AC-3603, AC-3604, AC-3606 | `semantic/replay.ts`, `semantic/run.ts`; teste de erro por caso; JSON com respostas, telemetria e revisão humana não preenchida; CLI e CI registrados |
| RQ-3202–3203 — PDF ao relatório no turno | AC-3201, AC-3203, AC-3204 | `tests/e2e/integrated-document-analysis.e2e.test.ts`: PDFs sintéticos de atas/contratos com rótulos literais e balancetes; citação por página/versão, comparação, remoção e autorização |

Resultado local: `pnpm run check` aprovado em 103 arquivos/617 testes; statements 88,86%, branches 82,50%, functions 95,64%, lines 91,14%; formatação, lint, tipagem, 36 specs e scanner aprovados. `pnpm run test:e2e`: 40 cenários aprovados (incluídos nos 617). `pnpm run evals`: 20/20; `pnpm run evals:documentary`: 50/50 determinísticos, sem pendências; build web aprovado. `git diff --check` sem erros.

`pnpm run evals:documentary:semantic` gerou 50 fichas com zero replays; `--synthetic` gerou 50 respostas locais mecanicamente válidas. Ambos informam zero chamadas de provedor e zero aprovações semânticas. Os artefatos estão em `reports/documentary-semantic-review.json` e `reports/documentary-semantic-synthetic.json`, regeneráveis e ignorados pelo Git. As fontes não contêm gabarito; vigência permanece pendente. O replay direto não representa o filtro de elegibilidade de produção.

Limites: não houve avaliação probabilística, leitura visual de OCR por provedor, navegação manual no browser, nova execução Neon ou julgamento especializado. OCR 8/3 usa transcrição e conferência independentes simuladas no processamento real. O fluxo de PDF normativo verifica rótulos literais, não interpretação universal de prosa. A etapa de modelo requer autorização/configuração e orçamento; a etapa humana requer revisores qualificados. Não houve merge, publicação, contato externo nem aprovação fictícia. A revisão desta fatia é autorrevisão, não revisão independente para merge.

## Correções das Specs 034–035 — 2026-10-16

| Requisito | Aceitação | Regressão determinística |
| --- | --- | --- |
| RQ-3401 — ausência de entradas não confirma OCR financeiro | AC-3405 e AC-3406 | `tests/unit/ocr-consistency.test.ts`: extração vazia, parcial, tabela ambígua/cortada, valor ilegível e ata não financeira |
| RQ-3501 — distinguir obrigação humana de comando à assistente | AC-3501 e AC-3504 | `tests/unit/document-instruction-security.test.ts`; `tests/e2e/document-instruction-security.e2e.test.ts`: cláusula legítima disponível e citável, ataque explícito bloqueado antes do gateway |
| RQ-3501 — fato independente em trecho misto | AC-3505 | `tests/unit/document-instruction-security.test.ts`: fatia literal e offsets Unicode; `tests/e2e/document-instruction-security.e2e.test.ts`: fonte mista sem instrução enviada; `EVAL-012` original sem alteração das asserções |

Os casos de contato adversarial agora nomeiam a assistente para remover a ambiguidade das fixtures anteriores; não foram removidas as asserções de bloqueio, zero chamadas e ausência de vazamento. Esta correção não afirma resistência universal a injeção nem substitui revisão especializada ou eval de provedor.

Verificação final destas correções, em 2026-10-16:

- `pnpm run check`: aprovado, 103 arquivos e 613 testes; statements 88,86%, branches 82,45%, functions 95,64%, lines 91,14%; formatação, lint, tipagem, 36 specs e scanner de segredos aprovados.
- `pnpm run test:e2e`: 36 cenários aprovados em 9 arquivos (incluídos também nos 613 testes; não são contagens somáveis).
- `pnpm run evals`: 20/20 aprovados, incluindo `EVAL-012` sem alteração de suas asserções.
- `pnpm run evals:documentary`: 41/41 determinísticos executados aprovados; 9 ainda pendentes de integração e 50 semânticos não executados. Revisão especializada permanece pendente; o código de saída zero não significa conclusão da bateria.
- `git diff --check`: aprovado. Autorrevisão dos arquivos desta correção verificou escopo, isolamento preservado, fontes literais, offsets Unicode, hash recalculado e compatibilidade do identificador com o chunk persistido. Nenhum merge ou publicação foi executado; não representa revisão independente para merge.

O gate revelou ainda um escape desnecessário no hífen da expressão de rubricas; foi removido sem alteração semântica. Não houve mudança de schema/persistência, dependência, provedor ou prompt. Integração Neon e chamadas de modelo externo não foram reexecutadas nesta correção. As alterações preexistentes fora deste escopo foram preservadas.

## Specs 028–032 — análise documental integrada

| Requisito | Aceitação | Evidência |
|---|---|---|
| RQ-2801 a RQ-2804 — extração, fonte e incerteza | AC-2801 a AC-2805 e regressões Unicode/sinais | `apps/api/documents/structured/`; `tests/unit/structured-document-extraction.test.ts`; `tests/unit/document-processing.test.ts` |
| RQ-2901 a RQ-2904 — cálculo e comparabilidade | AC-2901 a AC-2904 | `apps/api/analysis/financial-analysis.ts`; `tests/unit/financial-analysis.test.ts`; `tests/unit/document-analysis.test.ts` |
| RQ-3001 a RQ-3004 — fatos, limites e conflitos normativos | AC-3001 a AC-3008 | `apps/api/analysis/normative/`; `tests/unit/normative-document-analysis.test.ts`; `tests/unit/document-analysis.test.ts` |
| RQ-3101 a RQ-3104 — avaliações honestas | AC-3101 a AC-3104 | `evals/documentary-quality/`; `tests/e2e/documentary-quality.e2e.test.ts`; `pnpm run evals:documentary` |
| RQ-3201 — páginas autorizadas e limites | AC-3201 a AC-3203 | `apps/api/analysis/document-analysis-reader.ts`; `tests/unit/document-analysis-reader.test.ts`; `tests/integration/rls-tenant-isolation.test.ts` |
| RQ-3202 e RQ-3203 — relatório no turno e falha segura | AC-3201 a AC-3204 | `apps/api/analysis/document-analysis.ts`; `apps/api/app/create-api.ts`; `apps/web/App.tsx`; `tests/e2e/integrated-document-analysis.e2e.test.ts` |

O relatório calculado usa páginas existentes (ADR 0024), sem nova persistência ou prompt. Revisão semântica por especialistas e avaliação probabilística do provedor não são substituídas por testes determinísticos e permanecem explicitamente pendentes nos relatórios da Spec 031.

**Status:** Blocos 1–8 autorizados; núcleo documental e vetorial preservado
**Atualizado em:** 2026-10-09

Esta matriz liga promessas a critérios de aceitação e evidências de verificação. Os casos usam somente dados sintéticos.

## Gates de preparação

| Gate                     | Evidência                                      | Limite                                                                                                                                          |
| ------------------------ | ---------------------------------------------- | ----------------------------------------------------------------------------------------------------------------------------------------------- |
| Alinhamento da Spec 001  | `spec.md` §0 e gate `validate-spec-vision.ps1` | não altera a visão canônica                                                                                                                     |
| Arquitetura e isolamento | ADRs 0001–0009                                 | PostgreSQL/RLS, escopo autorizado e processamento local antes de dados persistidos; Neon e OCR externo somente para integração/corpus sintético |
| Dados e riscos iniciais  | `docs/security/data-handling-inicial.md`       | somente corpus sintético; nenhum piloto ou dado real                                                                                            |
| Critérios de produto     | `acceptance.md` AC-001–AC-028                  | P0 bloqueia qualquer entrega correspondente                                                                                                     |

| Requisito                                                             | Critérios de aceitação                                                                                                                                                                      | Evals                        | Teste determinístico futuro                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                 |
| --------------------------------------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | ---------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| RQ-001 Contexto autorizado e selecionado                              | AC-001, AC-002, AC-003, AC-022                                                                                                                                                              | EVAL-010, EVAL-011, EVAL-012 | `tests/e2e/identity-context.e2e.test.ts`; `tests/unit/authorized-condominium-context.test.ts`; `tests/integration/rls-tenant-isolation.test.ts`                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                             |
| RQ-002 / RQ-002A / RQ-002B Ingestão, identificação e controle de PDF  | AC-004, AC-005, AC-023, AC-030, AC-031                                                                                                                                                      | EVAL-014                     | `apps/api/documents/document-processing.ts`; `apps/api/documents/document-identification.ts`; `apps/api/documents/postgres-document-upload-repository.ts`; `apps/api/documents/postgres-private-document-storage.ts`; `apps/api/documents/postgres-document-retention-repository.ts`; `infrastructure/database/022_manager_document_removal.sql`; `apps/api/app/create-api.ts`; `apps/web/App.tsx`; `tests/unit/document-catalog.test.ts`; `tests/unit/postgres-document-adapters.test.ts`; `tests/unit/postgres-document-retention-repository.test.ts`; `tests/unit/postgres-private-document-storage.test.ts`; `tests/e2e/document-ingestion.e2e.test.ts`; `tests/integration/rls-tenant-isolation.test.ts`                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                               |
| RQ-003 Versão e vigência                                              | AC-006, AC-007                                                                                                                                                                              | EVAL-008, EVAL-009           | `apps/api/documents/document-model.ts`; `apps/api/documents/version-validity.ts`; `tests/unit/document-model.test.ts`; `tests/unit/version-validity.test.ts`                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                |
| RQ-004 Recuperação isolada                                            | AC-008, AC-009                                                                                                                                                                              | EVAL-010, EVAL-012           | `tests/unit/scoped-retrieval.test.ts`; `tests/unit/in-memory-scoped-retrieval.test.ts`; `tests/unit/text-retrieval.test.ts`; `tests/unit/postgres-scoped-retrieval.test.ts`; `tests/integration/rls-tenant-isolation.test.ts`                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                               |
| RQ-005 Resposta fundamentada                                          | AC-010, AC-011, AC-024                                                                                                                                                                      | EVAL-001–EVAL-005, EVAL-015  | `apps/api/answers/answer-gateway.ts`; `apps/api/answers/answer-use-case.ts`; `apps/web/App.tsx`; `tests/unit/answer-gateway.test.ts`; `tests/unit/answer-use-case.test.ts`; `tests/unit/postgres-scoped-retrieval.test.ts`; `tests/e2e/document-answer.e2e.test.ts`                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                         |
| RQ-006 Citações verificáveis                                          | AC-012, AC-013                                                                                                                                                                              | EVAL-001–EVAL-005, EVAL-015  | `apps/api/answers/citation-validator.ts`; `infrastructure/database/010_answer_claim_grounding.sql`; `apps/web/App.tsx`; `tests/unit/citation-validator.test.ts`; `tests/unit/api-answers.test.ts`; `tests/unit/answer-migration.test.ts`; `tests/e2e/document-answer.e2e.test.ts`                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                           |
| RQ-007 Abstenção                                                      | AC-014, AC-015                                                                                                                                                                              | EVAL-006, EVAL-007, EVAL-019 | `apps/api/answers/answer-use-case.ts`; `tests/unit/answer-use-case.test.ts`; `tests/unit/answer-gateway.test.ts`                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                            |
| RQ-008 Conflitos documentais                                          | AC-016                                                                                                                                                                                      | EVAL-008, EVAL-009           | `apps/api/answers/conflict-detection.ts`; `apps/api/answers/answer-gateway.ts`; `tests/unit/risk-and-conflict.test.ts`                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                      |
| RQ-009 Conteúdo não confiável                                         | AC-017                                                                                                                                                                                      | EVAL-012, EVAL-013           | `apps/api/answers/prompt-catalog.ts`; `apps/api/answers/answer-gateway.ts`; `tests/unit/answer-gateway.test.ts`; `evals/run.ts`                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                             |
| RQ-010 Escalonamento                                                  | AC-018                                                                                                                                                                                      | EVAL-016, EVAL-017           | `apps/api/answers/risk-classification.ts`; `tests/unit/risk-and-conflict.test.ts`; `tests/unit/answer-use-case.test.ts`                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                     |
| RQ-011 Feedback                                                       | AC-019                                                                                                                                                                                      | EVAL-020                     | `apps/api/answers/in-memory-answer-persistence.ts`; `apps/api/answers/postgres-answer-persistence.ts`; `apps/api/answers/answer-trace.ts`; `apps/api/app/create-api.ts`; `tests/unit/api-answers.test.ts`; `tests/e2e/feedback-audit.e2e.test.ts`; `tests/unit/answer-trace.test.ts`                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                        |
| RQ-012 Auditoria e custo                                              | AC-020                                                                                                                                                                                      | EVAL-020                     | `apps/api/answers/answer-persistence.ts`; `apps/api/answers/postgres-answer-persistence.ts`; `apps/api/answers/answer-trace.ts`; `apps/api/answers/postgres-answer-trace-store.ts`; `infrastructure/database/009_answers_feedback_audit.sql`; `infrastructure/database/009_answers_feedback_and_audit.sql`; `tests/unit/answer-use-case.test.ts`; `tests/e2e/feedback-audit.e2e.test.ts`; `tests/unit/postgres-answer-trace-store.test.ts`                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                  |
| RQ-013 Falha segura                                                   | AC-021, AC-025                                                                                                                                                                              | EVAL-019                     | `apps/api/answers/answer-gateway.ts`; `apps/api/answers/answer-use-case.ts`; `apps/api/app/server.ts`; `tests/unit/answer-gateway.test.ts`; `tests/unit/answer-use-case.test.ts`; `tests/unit/api-answers.test.ts`                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                          |
| RQ-014 Formato da resposta                                            | AC-010, AC-014, AC-016, AC-018, AC-028                                                                                                                                                      | EVAL-018                     | `apps/shared/conversation-intent.ts`; `apps/api/answers/answer-contract.ts`; `apps/api/answers/citation-validator.ts`; `apps/api/answers/prompt-catalog.ts`; `apps/api/answers/answer-use-case.ts`; `apps/api/answers/answer-gateway.ts`; `apps/web/answer-presentation.ts`; `apps/web/App.tsx`; `apps/web/styles.css`; `tests/unit/conversation-intent.test.ts`; `tests/unit/citation-validator.test.ts`; `tests/unit/prompt-catalog.test.ts`; `tests/unit/chat-turn-ui.test.ts`; `tests/unit/answer-use-case.test.ts`; `tests/unit/answer-gateway.test.ts`                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                |
| RQ-015 Integridade dos turnos e confirmação de envio                  | AC-026                                                                                                                                                                                      | —                            | `apps/web/App.tsx`; `tests/unit/chat-turn-ui.test.ts`                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                       |
| RQ-016 Latência sem duplicação de evidência                           | AC-027                                                                                                                                                                                      | —                            | `apps/api/answers/gemini-answer-gateway.ts`; `apps/api/answers/prompt-catalog.ts`; `tests/unit/gemini-answer-gateway.test.ts`                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                               |
| ADR 0007 — alvo Neon sintético                                        | marcador persistente, URL PostgreSQL com TLS, papel runtime seguro, identidade externa e fence do worker; migrations 003–006 verificadas; 6/6 testes RLS/API/worker aprovados em 2026-09-03 | —                            | `scripts/neon-integration-guard.ts`; `infrastructure/database/005_worker_claim_fencing.sql`; `infrastructure/database/006_runtime_document_read_grants.sql`; `tests/unit/neon-integration-guard.test.ts`; `tests/integration/rls-tenant-isolation.test.ts`                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                  |
| Spec 003 — entrada e criação local                                    | AC-301–AC-316                                                                                                                                                                               | —                            | `apps/web/App.tsx`; `apps/web/styles.css`; `apps/api/identity/development-identity-repository.ts`; `apps/api/documents/development-document-memory.ts`; `apps/api/app/create-api.ts`; `tests/unit/development-test-condominium.test.ts`; `tests/unit/development-document-memory.test.ts`; `tests/unit/mobile-navigation.test.ts`                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                           |
| Spec 004 — gateway Gemini local                                       | AC-401–AC-412                                                                                                                                                                               | —                            | `apps/api/answers/gemini-answer-gateway.ts`; `apps/api/answers/answer-gateway.ts`; `apps/api/answers/answer-use-case.ts`; `tests/unit/gemini-answer-gateway.test.ts`; `tests/unit/answer-use-case.test.ts`; `tests/unit/answer-gateway.test.ts`; `tests/unit/risk-and-conflict.test.ts`; `tests/unit/prompt-catalog.test.ts`                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                |
| Spec 005 — método de atuação da Cora                                  | AC-501–AC-511                                                                                                                                                                               | —                            | `apps/shared/conversation-intent.ts`; `apps/api/answers/prompt-catalog.ts`; `apps/api/answers/answer-use-case.ts`; `apps/api/answers/answer-gateway.ts`; `apps/web/App.tsx`; `apps/web/styles.css`; `apps/web/message-format.ts`; `tests/unit/conversation-intent.test.ts`; `tests/unit/prompt-catalog.test.ts`; `tests/unit/answer-use-case.test.ts`; `tests/unit/answer-gateway.test.ts`; `tests/unit/chat-turn-ui.test.ts`; `tests/unit/web-message-format.test.ts`                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                      |
| Spec 006 — autenticação real                                          | AC-601–AC-613                                                                                                                                                                               | —                            | `apps/api/identity/account-auth.ts`; `apps/api/identity/postgres-account-auth.ts`; `apps/api/app/create-api.ts`; `apps/api/app/server.ts`; `apps/web/App.tsx`; `apps/web/styles.css`; `contracts/http/health.openapi.json`; `infrastructure/database/011_real_account_auth.sql`; `tests/unit/account-auth.test.ts`; `tests/unit/health-contract.test.ts`; `tests/unit/mobile-navigation.test.ts`; `tests/unit/server.test.ts`; `tests/e2e/identity-context.e2e.test.ts`                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                     |
| Spec 007 — criação real de condomínio                                 | AC-701–AC-710                                                                                                                                                                               | —                            | `apps/api/identity/postgres-condominium-directory.ts`; `apps/api/app/create-api.ts`; `apps/api/app/server.ts`; `apps/web/App.tsx`; `apps/web/document-upload-request.ts`; `apps/web/styles.css`; `infrastructure/database/012_real_condominium_creation.sql`; `tests/unit/postgres-condominium-directory.test.ts`; `tests/unit/real-condominium-creation.test.ts`; `tests/unit/condominium-registration-feedback.test.ts`; `tests/unit/web-document-upload.test.ts`                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                         |
| Spec 008 — login com Google                                           | AC-801–AC-807                                                                                                                                                                               | —                            | `apps/api/identity/google-oauth.ts`; `apps/api/identity/account-auth.ts`; `apps/api/app/create-api.ts`; `apps/api/app/server.ts`; `apps/web/App.tsx`; `apps/web/styles.css`; `infrastructure/database/013_google_oauth_identity.sql`; `tests/unit/google-oauth.test.ts`; `tests/unit/account-auth.test.ts`; `tests/unit/mobile-navigation.test.ts`                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                          |
| Spec 009 — configurações, perfil, documentos e exclusão do condomínio | AC-901–AC-914                                                                                                                                                                               | —                            | `apps/web/App.tsx`; `apps/web/styles.css`; `apps/api/app/create-api.ts`; `apps/api/identity/condominium-profile.ts`; `apps/api/identity/postgres-condominium-profile.ts`; `apps/api/identity/in-memory-condominium-profile.ts`; `apps/api/documents/document-catalog.ts`; `apps/api/documents/development-document-upload-repository.ts`; `apps/api/documents/postgres-document-upload-repository.ts`; `apps/api/identity/development-identity-repository.ts`; `apps/api/identity/postgres-condominium-directory.ts`; `infrastructure/database/014_leave_condominium_management.sql`; `infrastructure/database/015_delete_condominium.sql`; `infrastructure/database/023_condominium_profile_customization.sql`; `tests/unit/condominium-profile.test.ts`; `tests/unit/in-memory-condominium-profile.test.ts`; `tests/unit/postgres-condominium-profile.test.ts`; `tests/unit/api-condominium-profile.test.ts`; `tests/unit/condominium-profile-migration.test.ts`; `tests/unit/document-catalog.test.ts`; `tests/unit/api-answers.test.ts`; `tests/unit/mobile-navigation.test.ts`; `tests/unit/development-test-condominium.test.ts`; `tests/unit/postgres-condominium-directory.test.ts`; `tests/unit/real-condominium-creation.test.ts` |
| Spec 010 — proteção de carga do piloto                                | AC-1001–AC-1004                                                                                                                                                                             | —                            | `apps/api/operations/tenant-work-limiter.ts`; `apps/api/app/create-api.ts`; `tests/unit/tenant-work-limiter.test.ts`; `tests/unit/api-answers.test.ts`; `tests/unit/b7-input-hardening.test.ts`                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                             |
| Spec 011 — piloto real controlado                                     | AC-1101–AC-1106                                                                                                                                                                             | —                            | Evidências pendentes: decisão de ambiente, política LGPD, testes no ambiente efetivo, termo de participação e checklist operacional; nenhuma entrada de dado real é autorizada enquanto estiver em rascunho.                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                |
| Spec 012 — painel administrativo da Zermatt                           | AC-1201–AC-1208                                                                                                                                                                             | —                            | `apps/api/admin/admin-dashboard.ts`; `apps/api/app/create-api.ts`; `apps/api/app/server.ts`; `apps/web/App.tsx`; `apps/web/styles.css`; `infrastructure/database/016_admin_dashboard_metrics.sql`; `infrastructure/database/017_admin_account_directory.sql`; `tests/unit/admin-dashboard.test.ts`; `tests/unit/admin-dashboard-ui.test.ts`; acesso restrito à conta administrativa confirmada.                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                             |
| Spec 015 — segurança e recuperação da conta                           | AC-1501–AC-1520                                                                                                                                                                             | —                            | `apps/api/identity/account-security.ts`; `apps/api/identity/account-security-crypto.ts`; `apps/api/identity/postgres-account-security.ts`; `apps/api/identity/account-action-delivery.ts`; `apps/api/app/create-api.ts`; `apps/api/app/server.ts`; `apps/web/App.tsx`; `apps/web/styles.css`; `infrastructure/database/027_account_security.sql`; `infrastructure/database/028_preserve_active_mfa_setup.sql`; `infrastructure/database/029_track_account_session_activity.sql`; `tests/unit/account-security.test.ts`; tokens de ação armazenados somente como hash, segredo TOTP cifrado, entrega externa bloqueada sem provedor aprovado e novas ativações de MFA indisponíveis enquanto houver somente prévia local de e-mail.                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                          |
| ADR 0012 — PostgreSQL remoto de staging                               | TLS, migrations ordenadas e credencial somente no servidor                                                                                                                                  | —                            | `scripts/database-migrations.ts`; `scripts/migrate-database.ts`; `package.json`; `.env.example`; `docs/adr/0012-postgresql-gerenciado-remoto.md`                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                            |
| ADR 0014 — painel administrativo minimizado                           | allowlist no servidor, agregação mínima e separação de finalidade                                                                                                                           | —                            | `docs/adr/0014-painel-administrativo-minimizado.md`; `apps/api/admin/admin-dashboard.ts`; `infrastructure/database/016_admin_dashboard_metrics.sql`; `tests/unit/admin-dashboard.test.ts`                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                   |

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

## Rastreamento da Spec 014 — Interpretação visual de fotos

| Requisito                           | Evidência esperada                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                          | Status                                                                                                                                                                                                                                                            |
| ----------------------------------- | --------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | ----------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| RQ-1401, AC-1401–1402               | `apps/web/App.tsx`; `apps/web/document-upload-request.ts`; `tests/unit/chat-document-upload-ui.test.ts`; `tests/unit/web-document-upload.test.ts`                                                                                                                                                                                                                                                                                                                                                                           | implementado e testado localmente; ainda depende da migration 025 para ativação persistente                                                                                                                                                                       |
| RQ-1402, AC-1403                    | `apps/api/documents/upload-document.ts`; `infrastructure/database/025_document_photo_analysis.sql`; `tests/unit/upload-document.test.ts`                                                                                                                                                                                                                                                                                                                                                                                    | validadores implementados; migration aplicada e schema conferido por leitura; teste de integração PostgreSQL não executado                                                                                                                                        |
| RQ-1403–1404, AC-1404–1406, AC-1409 | `apps/api/documents/gemini-image-analysis.ts`; `apps/api/retrieval/gemini-multimodal-embedding.ts`; `apps/api/documents/postgres-document-processing-repository.ts`; `apps/api/worker/worker.ts`; `tests/unit/gemini-visual-image.test.ts`; `tests/unit/persisted-processing.test.ts`                                                                                                                                                                                                                                       | implementado e testado com imagens sintéticas/fetch simulado; provedor real não chamado                                                                                                                                                                           |
| RQ-1405–1407, AC-1407–1408          | `apps/api/retrieval/postgres-scoped-retrieval.ts`; `apps/api/documents/document-processing.ts`; `tests/unit/postgres-scoped-retrieval.test.ts`; `tests/unit/document-processing.test.ts`                                                                                                                                                                                                                                                                                                                                    | implementado e testado; consulta PostgreSQL real pendente                                                                                                                                                                                                         |
| RQ-1409–1412, AC-1410–1414          | `infrastructure/database/026_document_derived_data_retention.sql`; `apps/api/documents/postgres-document-retention-repository.ts`; `apps/api/documents/postgres-document-upload-repository.ts`; `apps/api/answers/postgres-answer-persistence.ts`; `apps/web/App.tsx`; `tests/unit/document-retention-migration.test.ts`; `tests/unit/postgres-answer-persistence.test.ts`; `tests/unit/postgres-document-retention-repository.test.ts`; `tests/unit/postgres-document-adapters.test.ts`; `tests/unit/chat-turn-ui.test.ts` | implementado: purge remove arquivo e índice após 30 dias, preservando mensagens, respostas, feedback e citações históricas; testes automatizados aprovados; migration não aplicada nem validada em PostgreSQL; backups/restore e dados reais continuam bloqueados |

Verificação local em 2026-10-07: 77 arquivos e 451 testes passaram; cobertura geral 88,41% statements, 80,85% branches, 95,11% functions e 90,11% lines. Lint, formatação, build Web, gates de spec, scanner de segredos e typecheck de `apps/` passaram; o typecheck integral continua falhando em callbacks implicitamente `any` preexistentes de diversos testes fora desta funcionalidade. Evals sintéticos: 20/20, incluindo 14/14 P0. A migration 025 foi aplicada ao Neon configurado com o marcador `synthetic-only`, compartilhado com a prévia local, após autorização explícita; uma consulta de leitura confirmou o registro, as colunas e as restrições. A suíte de integração não foi executada porque trunca fixtures e a base contém dados da prévia. O provedor Gemini não foi chamado e dados reais/pilotos seguem bloqueados.

Verificação da retenção em 2026-10-07: suíte completa passou, 78 arquivos e 457 testes, com 88,43% statements, 80,86% branches, 95,11% functions e 90,13% lines; evals sintéticos passaram 20/20, sem chamadas ao provedor. Formatação, lint, build web, scanner de segredos, gate de visão e `git diff --check` passaram. O typecheck integral continua falhando somente por parâmetros implicitamente `any` em testes preexistentes de outras funcionalidades; nenhum erro de typecheck apareceu nos arquivos alterados nesta tarefa. A migration 026 não foi aplicada nem validada em PostgreSQL e nenhuma base/prévia foi alterada; a integração da prévia contém dados e o comando de integração trunca fixtures. A exclusão lógica no banco ativo não cobre snapshots/WAL/backups do provedor nem replay externo após restore; dados reais/pilotos seguem bloqueados.

Verificação da segurança da conta em 2026-10-08: suíte completa passou, 80 arquivos e 476 testes,
com 88,50% statements, 81,24% branches, 95,34% functions e 90,48% lines. Lint, formatação,
build web, scanner de segredos, gate de visão e `git diff --check` passaram. O fluxo integrado
sintético confirmou cadastro 202 sem o antigo 503, link local de verificação, confirmação 204,
login 200 e sessão listada. As migrations 027–029 foram aplicadas ao banco controlado configurado;
elas protegem tokens por hash, segredo TOTP cifrado, MFA ativo contra reconfiguração silenciosa e
atualização de atividade por sessão. O typecheck integral mantém 43 erros preexistentes em testes
de outras funcionalidades; nenhum erro apareceu nos arquivos desta entrega. Produção continua sem
envio real de e-mail até aprovação de um provedor e dados reais/piloto permanecem bloqueados.

Ainda em 2026-10-08, a simplificação do MFA foi verificada por `pnpm run check`: 80 arquivos e 477
testes passaram, com 88,52% de statements, 81,30% de branches, 95,34% de functions e 90,49% de
lines. O gate incluiu formatação, lint, typecheck, cobertura, alinhamento da visão e scanner de
segredos. Os 22 cenários E2E também passaram e o cliente web compilou. Testes determinísticos
confirmaram que a prévia local de e-mail informa `mfaEnrollmentAvailable: false`, bloqueia setup e
ativação com `503` e mantém desafio, acesso e desativação para contas que já tinham MFA ativo. Não
houve mudança de schema, uso de dados reais nem chamada a provedor externo.

Ainda em 2026-10-08, a regressão da consulta de atas foi corrigida no caminho completo de upload e
pergunta. O gateway local passou a priorizar a linha eleitoral em vez de uma lista de perguntas do
próprio PDF, extrair nome e período do mandato e citar a página correta. Quando o provedor principal
se abstém, a extração local só o substitui se encontrar esse fato eleitoral determinístico; nos demais
casos, a abstenção segura é preservada. A busca de perguntas sobre síndico e mandato também reduz a
consulta aos termos que aparecem na ata, evitando que o PostgreSQL selecione apenas o anexo com a
lista de perguntas e exclua a página da eleição. Similaridades cosseno negativas retornadas pelo banco são
normalizadas para zero antes da persistência, preservando o contrato de score entre 0 e 1. A suíte completa
aprovou 80 arquivos e 482 testes, com 88,75% de statements, 81,66% de branches, 95,71% de functions
e 90,72% de lines; formatação, lint, typecheck, gate de visão e scanner de segredos passaram. A
validação manual no aplicativo local, com conta, condomínio e documento exclusivamente sintéticos,
confirmou a resposta fundamentada e a citação da página 3 no ambiente persistente configurado.

Ainda em 2026-10-08, o teste manual de abstenção identificou que uma orientação geral podia afirmar
categoricamente a inexistência de protocolo local sem evidência. A validação posterior passou a remover
esse tipo de afirmação e preservar somente a orientação prática segura; a limitação da busca continua
visível, sem citação. A regressão sintética está em `tests/unit/answer-use-case.test.ts` e cobre RQ-007,
AC-014 e AC-028. O gate completo aprovou 80 arquivos e 483 testes, com 88,77% de statements,
81,66% de branches, 95,73% de functions e 90,74% de lines; formatação, lint, typecheck, alinhamento
da visão e scanner de segredos também passaram. As 20 evals sintéticas passaram, incluindo todos
os 14 casos P0, sem custo estimado de provedor.

## Spec 016 — chat único, Bloco 1

| Requisito                                                        | Critérios de aceitação | Evidência determinística                                                                                                                                                  |
| ---------------------------------------------------------------- | ---------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| RQ-1601 e RQ-1605 — entrada direta e ausência de telas paralelas | AC-1601 e AC-1606      | `apps/web/App.tsx`; `apps/web/main.tsx`; `tests/unit/chat-single-page.test.ts`                                                                                            |
| RQ-1602 — contexto automático e seguro                           | AC-1602 e AC-1603      | `GET /v1/chat/bootstrap`; `tests/unit/chat-bootstrap.test.ts`; testes existentes de autorização e RLS                                                                     |
| RQ-1603 — conversa documental                                    | AC-1604                | `apps/web/App.tsx`; `tests/unit/chat-turn-ui.test.ts`; `tests/e2e/document-answer.e2e.test.ts`                                                                            |
| RQ-1604 — documento no chat                                      | AC-1605                | `apps/web/document-upload-request.ts`; `tests/unit/chat-document-upload-ui.test.ts`; `tests/unit/web-document-upload.test.ts`; `tests/e2e/document-ingestion.e2e.test.ts` |
| Layout responsivo e acessível                                    | AC-1607                | `apps/web/styles.css`; `tests/unit/chat-single-page.test.ts`; build do cliente                                                                                            |

A Spec 016 substitui somente a experiência de telas das Specs 003, 006, 007, 008, 009, 012 e 015. Controles internos de autorização, sessão, tenant, auditoria, retenção e migrations são
preservados porque continuam protegendo o núcleo documental e preparam capacidades posteriores.
Os Blocos 2–6 foram autorizados explicitamente pelo usuário. Os Blocos 7 e 8 permanecem fora do
escopo até nova autorização explícita.

## Spec 018 — múltiplos chats e barra lateral, Bloco 3

| Requisito                                             | Critérios de aceitação | Evidência de verificação                                                                                                            |
| ----------------------------------------------------- | ---------------------- | ----------------------------------------------------------------------------------------------------------------------------------- |
| RQ-1701 — barra recolhida e responsiva                | AC-1701 e AC-1702      | `apps/web/App.tsx`; `apps/web/styles.css`; `tests/unit/chat-sidebar-ui.test.ts`                                                     |
| RQ-1702 — criar, alternar, nomear, renomear e excluir | AC-1703 e AC-1704      | `apps/web/conversation-title.ts`; `apps/web/App.tsx`; `tests/unit/conversation-title.test.ts`; `tests/unit/chat-sidebar-ui.test.ts` |
| RQ-1703 — contrato documental preservado              | AC-1703 e AC-1705      | `apps/web/App.tsx`; `tests/unit/chat-sidebar-ui.test.ts`; testes existentes da Spec 016 e de autorização/RLS                        |

O Bloco 3 não persiste a organização de chats, nem remove registros documentais. Essa decisão evita
introduzir armazenamento de conteúdo ou metadados sem modelagem explícita de tenant, RLS, retenção e auditoria.

Ajuste verificado em 2026-10-13: a primeira pergunta substantiva agora recebe um título curto
derivado localmente do assunto; saudações são ignoradas, títulos longos são cortados entre palavras
e a renomeação manual permanece disponível. O gate completo aprovou 83 arquivos e 486 testes, com
88,52% de statements, 81,47% de branches, 95,49% de functions e 90,54% de lines. O build web, o
gate de visão para 24 specs, o scanner de segredos e a conferência visual local também passaram.

Verificação do Bloco 1 em 2026-10-09: 78 arquivos e 464 testes passaram. A cobertura atingiu
88,59% de statements, 81,49% de branches, 95,45% de functions e 90,58% de lines. Os 23 cenários
E2E, o build web, a formatação, o lint, o scanner de segredos, o gate de visão para 16 specs e
`git diff --check` passaram. O typecheck estrito dirigido aos arquivos alterados passou. O
typecheck integral continua apontando parâmetros implicitamente `any` preexistentes em testes não
relacionados ao Bloco 1; nenhuma asserção ou regra de compilação foi enfraquecida.

## Spec 017 — personalidade da Alvitra, Bloco 2

| Requisito                                        | Critérios de aceitação | Evidência determinística                                                                                                                                                                                                |
| ------------------------------------------------ | ---------------------- | ----------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| RQ-1701 e RQ-1702 — tom e franqueza útil         | AC-1701–AC-1703        | `apps/api/answers/prompt-catalog.ts`; `tests/unit/prompt-catalog.test.ts`; `tests/unit/gemini-answer-gateway.test.ts`                                                                                                   |
| RQ-1703 e RQ-1704 — verdade documental e limites | AC-1704–AC-1705        | `apps/web/answer-presentation.ts`; `apps/web/App.tsx`; `tests/unit/chat-turn-ui.test.ts`; testes de grounding, citações, conflitos, abstenção e risco existentes; `tests/unit/prompt-catalog.test.ts`; evals sintéticos |
| RQ-1705 — aprovação antes de aplicação           | AC-1706                | `docs/specs/017-personalidade-alvitra/system-prompt.md`; versão `answer-prompt-v16`                                                                                                                                     |

O usuário aprovou o prompt em 2026-10-09. Ele foi aplicado ao gateway na versão
`answer-prompt-v16`; a verificação inclui testes determinísticos e evals sintéticos.

Em 2026-10-13, a apresentação de respostas sem evidência foi simplificada: o modo interno de
abstenção e a explicação natural permanecem, enquanto a interface deixou de exibir etiquetas
técnicas ou repetir a limitação em um bloco automático de atenção. O gate completo aprovou 82
arquivos e 482 testes, com 88,52% de statements, 81,47% de branches, 95,49% de functions e 90,54%
de lines. O build web, o gate de visão para 24 specs e a conferência visual local também passaram.

## Spec 019 — menu contextual, Bloco 4

| Requisito                         | Critérios de aceitação | Evidência de verificação                                                                                        |
| --------------------------------- | ---------------------- | --------------------------------------------------------------------------------------------------------------- |
| RQ-1901 — menu contextual         | AC-1901                | `apps/web/App.tsx`; `apps/web/styles.css`; `tests/unit/account-menu-ui.test.ts`                                 |
| RQ-1902 — condomínios autorizados | AC-1902 e AC-1903      | `GET /v1/chat/condominiums`; `GET /v1/condominiums/:condominiumId/context`; `tests/unit/chat-bootstrap.test.ts` |
| RQ-1903 — criação pela conversa   | AC-1904                | `apps/web/App.tsx`; `tests/unit/account-menu-ui.test.ts`                                                        |

## Spec 020 — documentos sob demanda, Bloco 6

| Requisito                                                         | Critérios de aceitação | Evidência de verificação                                                                                  |
| ----------------------------------------------------------------- | ---------------------- | --------------------------------------------------------------------------------------------------------- |
| RQ-2001 e RQ-2002 — envio posterior e pedido contextual           | AC-2001 e AC-2002      | `apps/api/answers/prompt-catalog.ts`; `tests/unit/prompt-catalog.test.ts`; testes de abstenção existentes |
| RQ-2003 — memória autorizada                                      | AC-2003                | `apps/web/document-upload-request.ts`; testes de upload, vetorização, autorização e RLS existentes        |

## Spec 023 — base para níveis da conta, Bloco 8

| Requisito                 | Critérios de aceitação | Evidência de verificação                                                                                                             |
| ------------------------- | ---------------------- | ------------------------------------------------------------------------------------------------------------------------------------ |
| Campo e cálculo ajustável | AC-2101 e AC-2102      | `infrastructure/database/030_account_level_foundation.sql`; `apps/api/identity/account-level.ts`; `tests/unit/account-level.test.ts` |

## Spec 022 — raio-X de balancetes, Bloco 7

| Requisito                                 | Critérios de aceitação | Evidência de verificação                                                                                                     |
| ----------------------------------------- | ---------------------- | ---------------------------------------------------------------------------------------------------------------------------- |
| RQ-2201 — raio-X orientado por evidência  | AC-2201                | `skills/alvitra-balancete-analysis/SKILL.md`; `apps/api/answers/prompt-catalog.ts`; `tests/unit/prompt-catalog.test.ts`      |
| RQ-2202 — comparação prudente             | AC-2202                | `apps/api/answers/prompt-catalog.ts`; `tests/unit/prompt-catalog.test.ts`                                                    |
| RQ-2203 — limites financeiros e evidência | AC-2203                | `apps/api/answers/prompt-catalog.ts`; contrato de citações, risco e abstenção existente; `tests/unit/prompt-catalog.test.ts` |

## Spec 021 — perfil pela conversa, Bloco 5

| Requisito                             | Critérios de aceitação | Evidência determinística                                                                                                                                         |
| ------------------------------------- | ---------------------- | ---------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| RQ-2001 — coleta natural              | AC-2001                | `apps/api/answers/prompt-catalog.ts`; `tests/unit/prompt-catalog.test.ts`                                                                                        |
| RQ-2002 — confirmação explícita       | AC-2002                | `apps/api/identity/condominium-profile.ts`; `tests/unit/condominium-profile.test.ts`                                                                             |
| RQ-2003 — perfil autorizado e isolado | AC-2003                | `apps/api/app/create-api.ts`; `apps/api/identity/condominium-profile.ts`; `tests/unit/condominium-profile.test.ts`; `tests/unit/api-condominium-profile.test.ts` |

## Spec 024 — jornada inicial conversacional

| Requisito                                        | Critérios de aceitação | Evidência determinística                                                                                                                                                         |
| ------------------------------------------------ | ---------------------- | -------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| RQ-2401 — entrada mínima separada                | AC-2401                | `apps/web/App.tsx`; `apps/web/styles.css`; `tests/unit/chat-single-page.test.ts`                                                                                                 |
| RQ-2402 e RQ-2403 — cadastro guiado pela Alvitra | AC-2402 e AC-2403      | `apps/web/App.tsx`; `apps/api/answers/setup-message.ts`; `apps/api/app/create-api.ts`; `tests/unit/conversational-setup-ui.test.ts`; testes de criação real e de desenvolvimento |
| RQ-2403 — documentos necessários, enviados depois | AC-2404               | `apps/api/answers/setup-message.ts`; `apps/api/answers/prompt-catalog.ts`; `apps/web/App.tsx`; `tests/unit/setup-message.test.ts`; `tests/unit/conversational-setup-ui.test.ts`; testes existentes de upload e vetorização |
| RQ-2404 — documentos organizados em Perfil      | AC-2405                | `GET /v1/chat/condominiums`; `GET /v1/condominiums/:condominiumId/documents`; `apps/web/App.tsx`; `tests/unit/account-menu-ui.test.ts`; testes de autorização/RLS                |
| RQ-2405 — tela documental do condomínio atual    | AC-2406                | `apps/web/App.tsx`; `apps/web/styles.css`; `tests/unit/account-menu-ui.test.ts`; contratos de autorização/RLS existentes                                                         |
| RQ-2406 — continuidade conversacional            | AC-2407                | `apps/web/App.tsx`; `tests/unit/conversational-setup-ui.test.ts`; `tests/unit/chat-bootstrap.test.ts`                                                                            |

A apresentação das mensagens da Alvitra prevista em RQ-2402 e AC-2402 é verificada por
`tests/unit/conversational-setup-ui.test.ts`: sem rótulo repetido de autoria, com fundo
transparente, tipografia editorial e linha lateral anil alinhada à esquerda. A troca entre uma
saudação do síndico e a resposta da Alvitra também foi conferida no navegador local em viewport
móvel.

Verificação da Spec 024 em 2026-10-09: 82 arquivos e 480 testes passaram. A cobertura atingiu
88,51% de statements, 81,45% de branches, 95,49% de functions e 90,53% de lines. Os 23 cenários
E2E, o build web, a formatação, o lint, o gate de visão para 24 specs, o scanner de segredos e
`git diff --check` passaram. O typecheck integral mantém erros `implicit any` preexistentes em testes
não relacionados; nenhum erro apareceu nos arquivos alterados. A validação manual no navegador
local configurou dois condomínios sintéticos em sequência, continuou sem documentos e confirmou
“Dados” agrupando documentos autorizados por tipo e condomínio.

Ajuste da jornada em 2026-10-13: a pergunta seguinte à quantidade passou a ser calculada por
`apps/web/setup-conversation.ts`. O caso de um condomínio segue direto ao nome, sem “um por vez” ou
“1 de 1”; o caso com três mantém a sequência e mostra “1 de 3”. A suíte completa aprovou 82 arquivos
e 481 testes, com 88,51% de statements, 81,45% de branches, 95,49% de functions e 90,53% de lines.
Build web, lint, formatação, typecheck, gate de visão, scanner de segredos e validação manual dos dois
caminhos no navegador local passaram.

## Spec 025 — demonstração online sintética no Render

| Requisito                              | Critérios de aceitação | Evidência determinística                                      |
| -------------------------------------- | ---------------------- | ------------------------------------------------------------- |
| RQ-2501 — demonstração sem dados reais | AC-2501                | `render.yaml`; `apps/api/app/server.ts`; ADR 0021             |
| RQ-2502 — mesma origem                 | AC-2502                | `apps/api/app/web-assets.ts`; `tests/unit/web-assets.test.ts` |
| RQ-2503 — implantação verificável      | AC-2503                | `render.yaml`; `/health`; `tests/unit/server.test.ts`         |

## Spec 026 — conversa aberta e contextual

| Requisito                          | Critérios de aceitação     | Evidência planejada                                                                                                                                                                                                                                                                                                                                |
| ---------------------------------- | -------------------------- | -------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| RQ-2601 — mensagens geradas        | AC-2601 e AC-2606          | `apps/api/answers/setup-message.ts`; `apps/api/answers/setup-turn.ts`; `apps/api/answers/prompt-catalog.ts`; `apps/web/App.tsx`; `tests/unit/setup-message.test.ts`; `tests/unit/setup-turn.test.ts`; `tests/unit/api-setup-message.test.ts`                                                                                                           |
| RQ-2602 — perguntas abertas        | AC-2602 e AC-2603          | `apps/api/answers/prompt-catalog.ts`; `apps/api/answers/openai-answer-gateway.ts`; `tests/unit/prompt-catalog.test.ts`; evals novos pendentes                                                                                                                                                                                                      |
| RQ-2603 — fatos locais e anexos    | AC-2604, AC-2607 e AC-2608 | `apps/api/answers/answer-use-case.ts`; `tests/unit/openai-answer-gateway.test.ts`; testes existentes de isolamento e anexos; evals novos pendentes                                                                                                                                                                                                 |
| RQ-2604 — franqueza construtiva    | AC-2605                    | `apps/api/answers/prompt-catalog.ts`; evals de tom e firmeza pendentes                                                                                                                                                                                                                                                                             |
| RQ-2605 — provedores e validação   | AC-2606, AC-2607 e AC-2609 | `apps/api/answers/openai-answer-gateway.ts`; `apps/api/answers/gemini-answer-gateway.ts`; `apps/api/answers/answer-gateway.ts`; `apps/api/app/server.ts`; `tests/unit/openai-answer-gateway.test.ts`; `tests/unit/gemini-answer-gateway.test.ts`; ADRs 0022–0023                                                                                   |
| RQ-2606 — fotos durante a migração | AC-2609                    | `apps/api/documents/openai-image-analysis.ts`; `apps/api/documents/gemini-image-analysis.ts`; `apps/api/retrieval/openai-image-embedding.ts`; `apps/api/retrieval/gemini-multimodal-embedding.ts`; `apps/api/retrieval/postgres-scoped-retrieval.ts`; `tests/unit/openai-visual-image.test.ts`; `tests/unit/gemini-visual-image.test.ts`; ADR 0023 |

O prompt da Spec 026 foi aprovado em 2026-10-15 e incorporado à versão `answer-prompt-v22`.
O adaptador foi verificado por transporte simulado; ativação com dados reais, evals novos e
verificação ao vivo do provedor permanecem pendentes.
Na migração gradual para OpenAI, os adaptadores dos dois provedores foram preservados e verificados
com transporte simulado; a reindexação de fotos antigas, a verificação ao vivo e os evals
específicos de recuperação visual permanecem pendentes. O runtime prefere OpenAI quando
configurada e usa Gemini como alternativa temporária, sem misturar perfis vetoriais.

Em 2026-10-15, após a decisão explícita de não excluir a Gemini, o gateway de resposta, a análise
visual e o embedding Gemini foram preservados no runtime. Uma verificação local real confirmou
`aiProvider: gemini` e gerou com sucesso a pergunta inicial da Alvitra sem expor a chave. O gate
`pnpm run check` aprovou 89 arquivos e 516 testes, com 88,00% de statements, 80,46% de branches,
95,37% de functions e 90,15% de lines; o build web também passou. Dados reais continuam bloqueados.

Ainda em 2026-10-15, a validação do nome de tratamento passou a rejeitar saudações e respostas
genéricas antes de persistir o perfil, além de entender construções naturais de apresentação.
Perfis locais incompletos gravados anteriormente com “olá” como nome deixam de ser restaurados e
retornam à pergunta correta. Saudações recebem uma resposta cordial antes da nova pergunta, sem
exemplos ou nomes sugeridos. A regressão está coberta em `tests/unit/development-identity.test.ts`,
`tests/unit/conversational-setup-ui.test.ts` e `tests/unit/setup-message.test.ts`.
Em 2026-10-15, `pnpm run check` passou: cobertura 88,09% em statements, 80,54% em branches,
95,74% em functions e 90,13% em lines; `pnpm run test:e2e` passou 23 testes, `pnpm run evals`
passou 20 casos sintéticos e `pnpm run build:web` concluiu. Não houve chamada paga ao provedor.
Após a correção da resposta a saudações, o gate completo passou novamente com 89 arquivos e 519
testes, cobertura de 87,98% em statements, 80,44% em branches, 95,37% em functions e 90,13% em
lines. O build web também passou, e a jornada foi conferida no navegador local: ao receber “Olá”,
a Alvitra respondeu à saudação antes de perguntar o nome, sem exemplos ou nomes sugeridos.
Na verificação sintética desta implementação, `pnpm run check` passou com 505 testes e cobertura
de 87,93% em statements, 80,02% em branches, 95,30% em functions e 90,08% em lines. O build web,
23 cenários E2E e os 20 evals sintéticos existentes também passaram. Nenhuma chamada paga ao
provedor foi executada.

Em 2026-10-15, a orientação documental foi corrigida para distinguir necessidade de envio imediato
de necessidade para uma conclusão local: o cadastro continua sem anexos, mas a Alvitra informa que
os documentos relevantes são necessários para conhecer o condomínio e podem ser enviados depois,
aos poucos. O prompt `answer-prompt-v22` proíbe chamar esses documentos de opcionais e mantém apenas
orientação geral enquanto a evidência local não chega. `pnpm run check` aprovou 90 arquivos e 528
testes, com cobertura de 87,99% em statements, 81,06% em branches, 95,44% em functions e 90,35% em
lines. O build web, os 23 testes E2E e os 20 evals sintéticos também passaram.

## Spec 027 — identidade provisória e cadastro único

| Requisito                                        | Critérios de aceitação | Evidência determinística                                                                                                                         |
| ------------------------------------------------ | ---------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------ |
| RQ-2701 — entrada provisória transparente        | AC-2701                | `apps/web/App.tsx`; `apps/web/styles.css`; `tests/unit/chat-single-page.test.ts`                                                                 |
| RQ-2702 — identidade sintética estável e isolada | AC-2702 e AC-2705      | `apps/web/development-identity.ts`; `tests/unit/development-identity.test.ts`; testes de autorização existentes                                  |
| RQ-2703 — cadastro uma única vez                 | AC-2703                | `apps/api/answers/setup-turn.ts`; `apps/api/app/create-api.ts`; `apps/web/App.tsx`; `tests/unit/setup-turn.test.ts`; `tests/unit/api-setup-message.test.ts`; `tests/unit/conversational-setup-ui.test.ts`; `tests/unit/chat-bootstrap.test.ts` |
| RQ-2704 — tratamento pelo nome                   | AC-2704                | `apps/api/answers/answer-use-case.ts`; `apps/api/answers/setup-message.ts`; `tests/unit/api-answers.test.ts`; `tests/unit/setup-message.test.ts` |

A interpretação conversacional de RQ-2703 é feita pelo modelo a partir da etapa e do histórico
recente, com decisão estruturada validada no servidor. O navegador não classifica a intenção por
frases ou palavras-chave. `tests/unit/setup-turn.test.ts`, `tests/unit/api-setup-message.test.ts` e
`tests/unit/conversational-setup-ui.test.ts` cobrem pedidos de exemplo que permanecem na pergunta,
números por extenso, correção de nome durante outra etapa, limites dos campos e remoção de marcas de
Markdown antes da exibição. `tests/unit/development-identity.test.ts` limita-se a validar valores já
confirmados antes de persistir o perfil local.
Na verificação de 2026-10-15, `pnpm run check` aprovou 90 arquivos e 527 testes, com cobertura de
87,99% em statements, 81,06% em branches, 95,44% em functions e 90,35% em lines. O build web e os
23 testes E2E também passaram, assim como os 20 evals sintéticos. A jornada foi conferida com o
provedor configurado no navegador local: um pedido de exemplo recebeu explicação sem virar nome;
uma dúvida sobre o motivo da pergunta permaneceu na etapa; “Cuido de dois hoje” foi interpretado
como quantidade; e uma correção de nome retomou a pergunta de condomínio sem perder o contexto.
Na verificação de 2026-10-15, `pnpm run check` aprovou 89 arquivos e 520 testes, com cobertura de
87,96% em statements, 80,42% em branches, 95,37% em functions e 90,11% em lines. O build web e os
23 testes E2E também passaram. O fluxo foi conferido no navegador local com pedido de exemplo,
declaração inicial e correção do nome no meio da configuração.

Verificação da Spec 027 em 2026-10-15: depois de separar o nome de usuário do nome de tratamento, 41
testes focados em sete arquivos passaram. No gate completo, 87 arquivos e 501 testes passaram, com
88,04% de statements, 80,31% de branches, 95,74% de functions e 90,08% de lines. Também passaram o
build web, a formatação, o lint, a tipagem, o gate de visão das 27 specs e o scanner de segredos.

- Novo requisito exige ao menos um critério de aceitação.
- Requisito de segurança exige teste determinístico.
- Comportamento probabilístico exige eval.
- Nenhum requisito pode ser marcado como entregue enquanto sua evidência de verificação estiver ausente.

## Correções de segurança e degradação local — 2026-10-19

| Requisito | Aceitação | Implementação e regressão |
| --- | --- | --- |
| RQ-3503 — impedir literal protegido na saída completa | AC-3503 | `document-instruction-policy.ts`, `answer-use-case.ts`; `tests/unit/document-instruction-security.test.ts`, `tests/e2e/protected-document-output.e2e.test.ts` (10 cenários, incluindo erro, fallback e persistência) |
| RQ-3404 — chave não habilita OCR de uploads | AC-3407 | `openai-ocr.ts`, `server.ts`, `worker.ts`; `tests/unit/openai-ocr.test.ts`, `tests/unit/offline-demo-ui.test.ts` |
| RQ-2705 — abrir demonstração sem inventar conversa | AC-2706 | `App.tsx`, `styles.css`; `tests/unit/offline-demo-ui.test.ts`; conferência visual desktop e 390 × 844 com identidade fictícia nova |

Verificação desta árvore local: `pnpm run check` passou 638 testes em 105 arquivos;
cobertura: statements 89,04%, branches 82,72%, functions 95,77%, lines 91,31%.
Também passaram 50 testes E2E, 20 evals locais, 50 casos documentais determinísticos,
build web e 7 testes de integração Neon exclusivamente sintéticos (sem migração).
O gate das 36 specs e o scanner de segredos passaram. Nenhuma chamada real de IA foi feita.

A revisão local das correções não é aprovação independente do branch nem autorização de merge.
Limites: defesa lexical não universal; OCR de uploads permanece indisponível; novo cadastro
offline continua pendente; 50 casos semânticos e revisão especializada continuam sem aprovação.
Detalhes em `docs/reviews/2026-10-19-correcoes-seguranca-local.md`.

## Correções após revisão do PR 14 — 2026-10-19

| Requisito | Aceitação | Implementação e regressão |
| --- | --- | --- |
| RQ-2606 — fotos usam exclusivamente o perfil ativo | AC-2609 | `postgres-scoped-retrieval.ts`; `tests/unit/postgres-scoped-retrieval.test.ts`, `tests/unit/retrieval-profile-isolation.test.ts`; `tests/integration/rls-tenant-isolation.test.ts` com OpenAI/Gemini e dois condomínios sintéticos |
| RQ-2802 — sinais negativos tipográficos não viram positivos | AC-2806 | `extract-structured-document.ts`; `tests/unit/structured-document-extraction.test.ts`, cobrindo PDF/OCR e hífen interno legítimo |
| RQ-3501 e RQ-3503 — títulos também são dados não confiáveis | AC-3501 e AC-3503 | `document-instruction-policy.ts`; `tests/unit/document-instruction-security.test.ts`, `tests/e2e/protected-document-output.e2e.test.ts`, incluindo erros, fallback e persistência |
| RQ-3504 e RQ-3204 — relatório não contorna a barreira documental | AC-3506 | `document-analysis.ts`; `tests/e2e/document-analysis-security.e2e.test.ts`, com páginas fora da seleção do retriever, título e controle de obrigação humana legítima |

Verificação final desta rodada: 718 testes em 109 arquivos; cobertura de statements 89,26%,
branches 83,02%, functions 95,80% e lines 91,52%. Gates de formatação, lint, tipagem, 36 specs
e segredos passaram. Também passaram 66 E2E, 7 integrações Neon sintéticas sem migração,
20 evals locais, 50 casos documentais determinísticos e build web. Não houve chamada paga
de IA; os 50 casos semânticos e a revisão especializada permanecem pendentes.
Registro dos defeitos, correções e limites em `docs/reviews/2026-10-19-revisao-pr-14.md`.
Autorrevisão não é aprovação independente nem autorização de merge.

## Publicação e contrato de cadastro Gemini — 2026-10-19

| Requisito | Aceitação | Evidência |
| --- | --- | --- |
| RQ-2501 e RQ-2503 — demonstração atualizada e sem banco | AC-2501 e AC-2503 | Serviço e Blueprint Render passam a acompanhar `main`; commit `725d911` publicado, cliente `index-RcE-rAYV.js`, runtime de desenvolvimento; ADR 0025 registra autorização da chave somente no serviço |
| RQ-2504 — conversa externa autorizada para teste fictício | AC-2504 | Chave transferida por autorização explícita, segredo fora do repositório, `GEMINI_MAX_ATTEMPTS=1`; observações e limitações em `docs/reviews/2026-10-19-render-gemini-testes.md`; conferência final deve ser registrada no PR |
| RQ-2601, RQ-2605 e RQ-2703 — formato da interpretação não depende só do prompt | AC-2601 e AC-2703 | `gemini-answer-gateway.ts`; `tests/unit/gemini-setup-contract.test.ts` verifica schema e rejeição de campo extra; testes de conversa geral e documental preservados; teste real local confirmou nome e pergunta seguinte após a correção |

O ensaio publicado encontrou uma falha real de contrato e não foi contado como jornada aprovada.
Os seis testes novos incluem cinco falhas reproduzidas antes da correção e um controle de
rejeição local mantido. Nenhuma asserção foi relaxada. O prompt e o modelo não foram alterados.
Somente mensagens e identidades fictícias foram utilizadas. Não se aprovou avaliação semântica,
dados reais, piloto ou teto monetário global; consumo real e testes simulados são distintos.

## Correção de envio e visualização documental — 2026-10-20

| Requisito | Aceitação | Implementação e regressão |
| --- | --- | --- |
| RQ-2004 — mensagem acompanha o anexo | AC-2004 e AC-2006 | `apps/web/App.tsx`, `document-processing-request.ts`; `tests/unit/document-processing-request.test.ts`, `tests/unit/chat-document-upload-ui.test.ts`, `tests/e2e/chat-document-send.e2e.test.ts` |
| RQ-2005 — recepção sem aguardar leitura | AC-2005 e AC-2006 | `apps/api/app/create-api.ts`; extração demonstrativa em segundo plano, catálogo com estado terminal; `tests/e2e/chat-document-send.e2e.test.ts`; regressões documentais aguardam a versão exata no catálogo |
| RQ-2006 — original completo e autorizado | AC-2007 | `apps/web/DocumentViewer.tsx`, `App.tsx`, `styles.css`; `tests/unit/document-processing-request.test.ts`, `tests/e2e/chat-document-send.e2e.test.ts`; bytes integrais, MIME seguro, original disponível antes da leitura, revogação, acesso cruzado e remoção |

O parser, o prompt, os provedores e o contrato de evidência não foram alterados. Os testes antigos
que exigiam `memoryStatus: ready` na recepção agora exigem 202 com `processingStatus: uploaded`
e, separadamente, `ready` para a mesma versão antes das consultas; as asserções de conteúdo,
citações, cálculos e segurança foram preservadas. Validação final registrada no review desta data.

Verificação local: 745 testes em 112 arquivos, 70 E2E, 20 evals locais, 50 documentais
determinísticos e build web aprovados. Cobertura: statements 89,72%, branches 83,52%,
functions 96,01%, lines 91,98%. Conferência visual bloqueada pelo acesso ao servidor local;
revisão independente e publicação pendentes. Detalhes em
`docs/reviews/2026-10-20-envio-visualizacao-documental.md`.

## Apelido com números na configuração — 2026-10-20

RQ-2703/RQ-2704 e AC-2707: `setup-turn.ts` e `development-identity.ts` aceitam `teste4` como
apelido confirmado e o restauram sem mudar identidade/permissões. `create-api.ts` distingue
interpretação inválida (502) de indisponibilidade do provedor (503); `App.tsx` preserva o texto
em erro. Regressões em `tests/unit/setup-turn.test.ts`, `tests/unit/development-identity.test.ts`
e `tests/unit/api-setup-message.test.ts`: sete falhas reproduzidas antes da correção e 28 testes
focados aprovados depois, com os controles anteriores preservados.

Gate completo desta correção: 755 testes em 112 arquivos aprovados; cobertura de statements
89,77%, branches 83,55%, functions 96,01% e lines 92,04%. Formatação, lint, tipagem, 36 specs,
segredos e build web aprovados. Pelo painel do Render foi confirmada também uma queda da
instância por exceder 512 MB às 14h33; essa falha operacional não foi corrigida pela mudança de
apelido e não é atribuída à mesma requisição sem evidência. Detalhes em
`docs/reviews/2026-10-20-apelido-e-indisponibilidade.md`. Correções ainda locais, sem publicação.

## Consumo e admissão de trabalho da demonstração — 2026-10-20

| Requisito | Aceitação | Implementação e evidência |
| --- | --- | --- |
| RQ-2505 — runtime compilado e PDF sob demanda | AC-2505 | `tsconfig.api.json`, `main.ts`, `package.json`, `render.yaml`, `extract-pdf-text.ts`; `build:api`, `test:production`, regressões existentes de extração/consulta e CI |
| RQ-2506 — reserva documental e pressão de RSS | AC-2506 e AC-2507 | `demo-work-admission.ts`, `create-api.ts`, `server.ts`; `tests/unit/demo-work-admission.test.ts`, `tests/e2e/demo-memory-admission.e2e.test.ts` |
| RQ-2507 — medição agregada | AC-2508 | `memory-diagnostics.ts`, `server.ts`, `scripts/verify-production-runtime.mjs`; teste de timer/fechamento e ensaio compilado sintético |

No mesmo ensaio local sem documentos, RSS após 40 health checks caiu de aproximadamente 305 MiB
em tsx/PDF antecipado para 70 MiB no Node compilado/PDF sob demanda. O ensaio compilado com dois
PDFs e vinte perguntas terminou com pico de 126 MiB e nenhuma chamada externa. Não se atribui a
operação exata do OOM no Render a partir desses números, nem se declara estabilidade publicada.
ADR 0026 registra orçamento, limites e necessidade de verificar o serviço Linux após publicação.

Gate final: 767 testes em 114 arquivos aprovados, cobertura de statements 89,85%, branches
83,69%, functions 95,89% e lines 92,11%; formatação, lint, tipagem, 36 specs e scanner de segredos
aprovados. Builds da API/web e avaliações documentais (20 + 50 determinísticas) passaram. O
ensaio compilado repetido após o ajuste final passou com pico de 127 MiB. Revisão e limites em
`docs/reviews/2026-10-20-memoria-demonstracao.md`; publicação e medição no Render pendentes.

## Perfil compacto e aparência — 2026-10-20

| Requisito | Critérios de aceitação | Evidência de verificação |
|---|---|---|
| RQ-2407 — substituir Dados por Perfil | AC-2405 e AC-2408 | `apps/web/App.tsx`; `tests/unit/account-menu-ui.test.ts`; conferência visual desktop e celular pendente por ausência de navegador nesta sessão |
| RQ-2408 — escolha de tema, claro por padrão | AC-2409 | `apps/web/appearance.ts`; `apps/web/main.tsx`; `apps/web/styles.css`; `tests/unit/appearance.test.ts`; `tests/unit/account-menu-ui.test.ts` |
| RQ-2409 — saída e retomada explícita | AC-2410 e AC-2411 | `apps/web/profile-session.ts`; `tests/unit/profile-session.test.ts`; contrato de logout existente em `tests/unit/account-auth.test.ts` |

A saída remove apenas a lembrança do último acesso e recria a página para descartar estado e
operações pendentes. Preserva perfis sintéticos e tema; no modo real aguarda revogação na API.
Não altera autorização, isolamento, documentos ou prompts. O Bloco 4 do briefing e o MVP refletem
o ajuste de apresentação solicitado pelo usuário.

Validação desta fatia: build web, typecheck, scanner de segredos e gate das 37 specs aprovados.
Os 29 testes específicos de perfil/entrada/sessão passaram. A suíte completa passou 811 testes
em 119 arquivos com `vitest run --coverage --coverage.reportOnFailure --maxWorkers 2`:
statements 89,99%, branches 83,78%, functions 95,95% e lines 92,21%. A concorrência foi limitada
após uma execução simultânea com compilação e lint exceder os timeouts; nenhuma asserção foi
reduzida. As ferramentas foram executadas pelos binários locais: o shim de pnpm tentou baixar
sua versão e a rede deste ambiente não conseguiu resolver o registro.

Formatação e lint dos arquivos de perfil aprovados. O lint global ainda aponta duas ocorrências
de `no-useless-escape` em `apps/api/documents/document-condominium-check.ts`, criado por outra
alteração durante esta tarefa e preservado. A inspeção visual desktop/celular permanece pendente:
o inventário de navegadores retornou vazio. Esses bloqueios não foram tratados como aprovação
dos gates gerais nem como autorização para integrar ou publicar a árvore de trabalho.

### Ajuste da escolha de aparência — 2026-10-20

RQ-2408 e AC-2409: “Aparência” oferece “Claro” e “Escuro” em um seletor nativo com rótulo
associado. Sem preferência válida salva, a entrada e o chat usam sempre o claro, inclusive se
o sistema operacional estiver em modo escuro ou o armazenamento falhar. A escolha explícita
continua salva para recarga e saída. `appearance.test.ts` cobre o padrão e a restauração dos dois
temas; `account-menu-ui.test.ts` confere as opções e o rótulo acessível. A área documental existente
permanece como está; este ajuste não adiciona opções ao perfil.

Validação do ajuste: formatação, lint global, typecheck, build web, scanner de segredos e gate
das 37 specs aprovados. A suíte completa passou 813 testes em 119 arquivos, com concorrência
limitada a dois workers: statements 89,99%, branches 83,88%, functions 95,95% e lines 92,21%.
O lint global desta execução passou, substituindo o bloqueio registrado na validação inicial
do perfil. Diff incremental completo revisado; a limitação de inspeção visual registrada acima
permanece.

## Conferência de condomínio no envio — 2026-10-20

| Requisito | Aceitação | Implementação e evidência |
| --- | --- | --- |
| RQ-3701 — nomes explícitos e equivalência | AC-3701, AC-3702 e AC-3705 | `document-condominium-check.ts`, `document-processing.ts`; `tests/unit/document-condominium-check.test.ts` e OCR no E2E |
| RQ-3702 — pendência antes de consulta | AC-3701 e AC-3703 | estado `needs_review`, memória e persistência; `tests/e2e/document-condominium-confirmation.e2e.test.ts` valida abstenção antes e citação depois |
| RQ-3703 — confirmar ou cancelar com ambos os nomes | AC-3703 | `document-condominium-confirmation.tsx`, `document-processing-request.ts`, `App.tsx`; renderização React, transporte e preservação da pergunta nos testes unitários/E2E |
| RQ-3704 — versão, autorização, retomada e decisão persistente | AC-3704 e AC-3705 | catálogo, adaptadores, rota de confirmação, migração 031 e ADR 0027; testes de tenant, revogação, arquivo removido, versão antiga e decisão concorrente; caso RLS em `tests/integration/rls-tenant-isolation.test.ts` |

Spec 037 mantém o envio 202 assíncrono e reutiliza a extração existente. Confirmação não altera
condomínio, leitura ou vigência silenciosamente. Migração/integração Neon bloqueadas por DNS;
nenhuma publicação ou aprovação de merge. Resultados e pendências em
`docs/reviews/2026-10-20-confirmacao-condominio-documental.md`.

Gate local final desta fatia: `pnpm run check` aprovado, 813 testes/119 arquivos, statements
89,99%, branches 83,88%, functions 95,95% e lines 92,21%. Builds API/web, ensaio compilado e
evals (20/20 + 50/50 determinísticos) aprovados. A migração 031 e os testes RLS no Neon continuam
sem validação por falha de DNS; revisão independente e publicação pendentes.

## Novo chat na reentrada — 2026-10-20

| Requisito | Aceitação | Implementação e evidência |
| --- | --- | --- |
| RQ-3801 — novo chat em cada entrada | AC-3801 e AC-3802 | `chat-session.ts`, `App.tsx`; `chat-session.test.ts` e `chat-reentry.e2e.test.ts` validam lista anterior separada do novo chat, sem salvar entradas vazias |
| RQ-3802 — último turno, títulos e referências | AC-3801, AC-3802 e AC-3805 | repositórios de chat, vínculo na persistência de perguntas, upload e UI; regressões de reentrada, renomeação, ocultação, último turno e anexo |
| RQ-3803 — usuário, tenant e cursores | AC-3803 e AC-3804 | rotas, filtros de histórico, migração 032 e RLS; `chat-repository.test.ts`, `postgres-answer-persistence.test.ts`, E2E com outro membro/tenant/revogação e paginação de 105 turnos |
| RQ-3804 — legado e abas | AC-3804 e AC-3805 | chat reservado de legado, IDs novos por entrada e idempotência inclui chat; testes E2E de abas, chave repetida e legado oculto |

Spec 038 e ADR 0028 substituem a restrição de organização efêmera da Spec 018. Testes de inspeção
da sidebar passaram a exigir carregamento de chats separados e operações assíncronas no servidor,
em lugar de agregar todo o histórico em um título; controles, fontes e isolamento permanecem
exigidos. O teste PostgreSQL manteve autor/limite e acrescentou o vínculo e o cursor opcionais;
nenhuma asserção de segurança foi removida. Conteúdo não é copiado para armazenamento do navegador.

Verificação final da Spec 038: `pnpm run check` aprovado com 830 testes/122 arquivos; cobertura
statements 90,16%, branches 84,34%, functions 96,12%, lines 92,33%. Builds API/web, runtime
compilado e evals 20/20 + 50/50 determinísticos aprovados. Migração 032 e integração RLS bloqueadas
por DNS do Neon; revisão independente e publicação pendentes. A demonstração mantém a limitação
de perda de estado no reinício do servidor (ADR 0021). Registro completo em
`docs/reviews/2026-10-20-novo-chat-na-reentrada.md`.

## Ajustes da prévia e nova conversa sem duplicação — 2026-10-20

| Requisito | Aceitação | Implementação e evidência |
| --- | --- | --- |
| RQ-2405/RQ-2407 — menu até a base, itens no topo e perfil sem atalhos repetidos | AC-2406/AC-2408 | `App.tsx`, `styles.css`, `account-menu-ui.test.ts`; documentos permanecem em Perfil → Documentos enviados, com identificação e autorização por condomínio |
| RQ-3703 — uma confirmação azul-escura sem alerta duplicado | AC-3701/AC-3703 | `App.tsx`, `styles.css`; a pendência preserva a pergunta e continua bloqueando consulta até confirmação; falhas operacionais reais continuam visíveis |
| RQ-3805 — nova conversa sem cópia do cadastro, turnos, anexos ou rascunho | AC-3806 | `chat-session.ts`, `App.tsx`, `chat-session.test.ts`, `chat-sidebar-ui.test.ts`; mensagens iniciais vinculadas ao chat de origem e descarte somente de rascunhos vazios não salvos |

O teste anterior do atalho documental foi atualizado porque sua retirada foi explicitamente
solicitada; o catálogo autorizado e seus controles de leitura/confirmar permanecem exigidos.
Sem mudança de API, banco, provedor, prompt ou autorização. Validação final registrada em
`docs/reviews/2026-10-20-ajustes-previa-e-nova-conversa.md`.

Validação final: `pnpm run check` aprovado com dois workers, 832 testes/122 arquivos; cobertura
statements 90,16%, branches 84,34%, functions 96,12% e lines 92,33%. Build web e inspeção na prévia
local aprovados, incluindo menu em 320 px e 1280 px, cartão azul sem alerta duplicado e criação
de chat sem copiar saudação/rascunho, preservando o chat anterior. Sem publicação ou merge.

## Base legal federal conferida — 2026-10-22

| Requisito | Aceitação | Implementação e evidência |
|---|---|---|
| RQ-3901 — curadoria e integridade | AC-3901 | `curated-source-texts.ts`, `legal-edition-contract.ts`, `verified-legal-edition.ts`; seis fontes oficiais, nove leis relacionadas e 25 páginas; testes de corrupção e origem em `verified-legal-library.test.ts` |
| RQ-3902 — paginação honesta | AC-3902 | `consultation-pdf.ts`, `build-verified-legal-corpus.ts`; reprodução dos PDFs, texto e offsets em `verified-legal-library.test.ts`; leitura autorizada e visualização em `legal-copy-viewer.test.ts` e eval HTTP |
| RQ-3903 — compartilhamento autorizado | AC-3904 e AC-3905 | `verified-legal-library.ts`, `server.ts`, rota de cópia; índice privado preservado; `citation-validator.ts` recusa fato local sustentado só por lei; regressões unitárias e HTTP |
| RQ-3904 — intervalo da conferência | AC-3903 | filtro de 22/10/2026 até 21/11/2026 exclusivo; fronteiras e ausência de fonte em unitários/evals; seleção PostgreSQL por `verified_at` e `review_due_at` |
| RQ-3905 - persistência administrativa | AC-3906 | migração 033, importador genérico e `legal:import:verified`; idempotência, recusa de regressão, rollback e cópia histórica testados com adaptadores simulados; execução PostgreSQL externa informou migração concluída e 8/10 casos aprovados, duas falhas em investigação; suíte ampliada para onze casos após ajuste das fixtures |
| RQ-3906 — avaliação | AC-3907 | `pnpm run evals:legal`, 21 casos determinísticos sem provedor; não mede qualidade semântica de IA nem substitui revisão jurídica |

A autorização permite adicionar material confirmado; não houve importação integral do GitHub,
publicação, mudança de prompt ou importação em banco de produção. A edição é parcial e as páginas
são das cópias Alvitra, não da publicação oficial. O ADR 0029 registra curadoria, limites e revisão.
O importador constitucional anterior continua sem certificação de atualização integral.
Resultados finais e limitações em `docs/reviews/2026-10-22-base-legal-verificada.md`.

Validação local final da Spec 039: 901 testes aprovados, incluindo 21 casos legais;
cobertura statements 90,51%, branches 84,84%, functions 96,23% e lines 92,61%.
Formatação, lint, tipagem, gate de 39 specs, scanner de segredos, builds API/web e runtime
compilado aprovados. Evals adicionais: 20/20 e 50/50 determinísticos, sem chamadas pagas.
Os gates equivalentes foram executados diretamente porque o Corepack não resolveu o registro
do pnpm. Migração e dez testes de integração Neon bloqueados por DNS antes da conexão;
sem ativação persistente, revisão independente, merge ou publicação.

Rechecagem posterior em 22/10/2026: DNS Neon/GitHub/npm resolvido e HTTPS npm acessível;
a conexão PostgreSQL de leitura com o Neon continua recusada com `EACCES`, inclusive após
reinício informado pelo usuário. O teste fora da restrição foi rejeitado pela política da
sessão, que não admite `sandbox_approval`. Nenhuma migração, importação ou teste RLS adicional
foi executado. A alternativa de integração Neon para ChatGPT foi recusada pelo usuário.
`scripts/verify-neon-local.ps1` prepara a retomada pelo PowerShell normal do Windows, preservando
as guardas do ADR 0007; `-CheckOnly` valida somente pré-requisitos locais. A execução real dos
comandos de banco continua pendente e não foi substituída pela conferência do script.
Pré-verificação local e dez testes das guardas aprovados. A tentativa normal do script
interrompeu na conexão da migração com `EACCES`, sem iniciar os testes de integração ou alterar
o banco; nenhuma validação PostgreSQL foi declarada aprovada.

Execução externa informada pelo usuário em 22/10/2026: a migração terminou sem erro e a suíte
PostgreSQL executou dez casos, com oito aprovados e dois reprovados. O trecho recebido aponta
resultado não vazio na busca antes da confirmação do documento (AC-3704); a outra falha ainda
exige o relatório completo. Foi identificada limpeza incompleta das fixtures: as quatro tabelas
legais não participavam do reinício do cenário. Foram incluídas no `TRUNCATE` exclusivo do banco
sintético, mantendo a asserção de busca vazia e as regras de autorização sem mudanças.
Uma regressão AC-3906 importa evidência pública sintética, comprova sua leitura e exige ausência
após reiniciar as fixtures com a mesma identidade autorizada. A suíte passa a ter onze casos.
O script externo grava JSON por rodada em `reports/neon-integration/`; a nova execução real é
necessária para confirmar ambas as falhas. Não houve relaxamento de asserções ou timeouts.

Retomada em 26/10/2026: corrigida também a fixture de revogação do cenário
AC-3903/3904/3906 para preencher `revoked_at = now()`, conforme o CHECK da migração 001.
A verificação de cópia inacessível após a revogação permanece exigida. O ajuste preserva
schema e código de produção; o resultado PostgreSQL dos onze cenários ainda está pendente.
A sessão continua recebendo `EACCES` no teste de conexão somente leitura. Não há relatório
externo novo confirmado até esta retomada.

## Migração operacional para Supabase — 2026-10-26

| Requisito | Aceitação | Implementação e evidência |
| --- | --- | --- |
| RQ-4001 — destino protegido | AC-4001 e AC-4002 | `scripts/supabase-integration-guard.ts`, `scripts/migrate-supabase-integration.ts`, `infrastructure/supabase/001-integration-guard.sql`, `.github/workflows/supabase-integration.yml` e testes unitários do guard mantêm endpoint Supabase, TLS, confirmação e marcador persistente. O workflow é somente manual, consome URL por segredo e exige `synthetic-only`. |
| RQ-4002 — isolamento e vetorização | AC-4003 | `tests/integration/rls-tenant-isolation.test.ts` aceita explicitamente o destino Neon ativo ou Supabase preparado, mantendo a mesma validação RLS e de perfis vetoriais. |
| RQ-4003 — corte condicionado | AC-4004 | Os artefatos Supabase foram preparados, mas `package.json`, `.env.example`, `README.md`, `AGENTS.md` e `scripts/verify-neon-local.ps1` preservam Neon até a validação externa. |

O projeto Supabase sintético dedicado `alvitra-integration-synthetic` foi criado fora do
repositório e recebeu o marcador persistente. A tentativa protegida de migrations e integração
não alcançou o banco porque o Node local rejeitou uma cadeia TLS autoassinada; nenhuma migration
ou fixture foi aplicada. O workflow manual no GitHub Actions foi preparado para executar a mesma
validação a partir de um runner externo, depois de receber o segredo do projeto sintético.

Validação da retomada em 26/10/2026: 901/901 testes locais aprovados com um worker, cobertura
statements 90,51%, branches 84,84%, functions 96,23% e lines 92,61%. A rodada inicial com dois
workers teve três falhas; os 29 casos dos arquivos envolvidos passaram isoladamente, e a
rodada completa serial passou sem relaxamento de asserções ou timeouts. Guardas Supabase,
migrations e persistência legal tiveram ainda uma verificação focada com 35 casos aprovados.
A Spec 040/ADR 0030 passou a definir o destino ativo. O comando atual de retomada é
`scripts/verify-supabase-local.ps1`, com JSON e log completo em `reports/supabase-integration/`.
A captura preservou stderr e o código de falha no ensaio local. URL e confirmação da integração
Supabase não estão configuradas; os onze casos PostgreSQL continuam sem nova execução, e a
validação persistente não é considerada concluída.
