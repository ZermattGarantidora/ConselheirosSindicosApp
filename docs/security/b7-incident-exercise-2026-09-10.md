# Exercício de incidente da B7 — 2026-09-10

**Status:** concluído em ambiente sintético
**Runbook:** `docs/security/b7-incident-runbook.md`

## Cenários simulados

| Cenário | Contenção esperada | Evidência sintética |
| --- | --- | --- |
| PDF malformado | rejeitar ou retornar `failed` sem publicar conteúdo | `tests/unit/b7-input-hardening.test.ts` |
| Prompt injection documental | tratar instrução como dado e manter somente fato seguro | `tests/unit/local-extractive-gateway.test.ts` e `tests/e2e/synthetic-pilot.e2e.test.ts` |
| Acesso cruzado | retornar `403` sem revelar existência do tenant | `tests/e2e/identity-context.e2e.test.ts` e piloto sintético |
| Revogação | negar sessão/link/identificador após revogação | `tests/e2e/identity-context.e2e.test.ts` |
| Falha de retrieval | retornar `503` sem resposta sintética | `tests/e2e/document-answer.e2e.test.ts` |
| Exclusão | remover artefatos do alvo e preservar o segundo tenant | `tests/unit/b7-data-lifecycle.test.ts` |

## Resultado

Todos os cenários determinísticos passaram. Não houve segredo, dado pessoal,
documento real, contato externo ou ação irreversível. O exercício não simula
notificação jurídica nem operação de produção; essas etapas exigirão política,
responsáveis e ambiente autorizados antes de qualquer uso real.
