# Matriz de rastreabilidade — Spec 001

**Status:** primeira fatia local parcialmente implementada  
**Atualizado em:** 2026-09-01

Esta matriz liga promessas a critérios de aceitação e evidàncias de verificação. Os identificadores de testes serão preenchidos quando o scaffold for criado.

## Gates de preparação

| Gate | Evidência | Limite |
|---|---|---|
| Alinhamento da Spec 001 | `spec.md` §0 e gate `validate-spec-vision.ps1` | não altera a visão canônica |
| Arquitetura e isolamento | ADRs 0001–0007 | PostgreSQL/RLS e escopo autorizado antes de dados persistidos; Neon somente para integração sintética |
| Dados e riscos iniciais | `docs/security/data-handling-inicial.md` | somente corpus sintético; nenhum piloto ou dado real |
| Critérios de produto | `acceptance.md` AC-001–AC-021 | P0 bloqueia qualquer entrega correspondente |

| Requisito | Critérios de aceitação | Evals | Teste determinístico futuro |
|---|---|---|---|
| RQ-001 Contexto autorizado e selecionado | AC-001, AC-002, AC-003, AC-022 | EVAL-010, EVAL-011, EVAL-012 | `tests/e2e/identity-context.e2e.test.ts`; `tests/unit/authorized-condominium-context.test.ts`; `tests/integration/rls-tenant-isolation.test.ts` |
| RQ-002 Ingestão de PDF | AC-004, AC-005 | EVAL-014 | `documents/pdf-ingestion` |
| RQ-003 Versão e vigência | AC-006, AC-007 | EVAL-008, EVAL-009 | `documents/version-validity` |
| RQ-004 Recuperação isolada | AC-008, AC-009 | EVAL-010, EVAL-012 | `tests/unit/scoped-retrieval.test.ts` |
| RQ-005 Resposta fundamentada | AC-010, AC-011 | EVAL-001–EVAL-005, EVAL-015 | `answers/grounded-response` |
| RQ-006 Citações verificáveis | AC-012, AC-013 | EVAL-001–EVAL-005, EVAL-015 | `citations/source-location` |
| RQ-007 Abstenção | AC-014, AC-015 | EVAL-006, EVAL-007, EVAL-019 | `answers/abstention` |
| RQ-008 Conflitos documentais | AC-016 | EVAL-008, EVAL-009 | `answers/document-conflict` |
| RQ-009 Conteúdo não confiável | AC-017 | EVAL-012, EVAL-013 | `security/document-prompt-injection` |
| RQ-010 Escalonamento | AC-018 | EVAL-016, EVAL-017 | `answers/specialist-escalation` |
| RQ-011 Feedback | AC-019 | EVAL-020 | `feedback/record-classification` |
| RQ-012 Auditoria e custo | AC-020 | — | `audit/answer-trace` |
| RQ-013 Falha segura | AC-021 | EVAL-019 | `answers/dependency-failure` |
| RQ-014 Formato da resposta | AC-010, AC-014, AC-016, AC-018 | EVAL-018 | `answers/response-schema` |
| ADR 0007 — alvo Neon sintético | marcador persistente, URL PostgreSQL com TLS e papel runtime seguro | — | `scripts/neon-integration-guard.ts`; `tests/unit/neon-integration-guard.test.ts`; `tests/integration/rls-tenant-isolation.test.ts` |

## Regra de manutenção

- Novo requisito exige ao menos um critério de aceitação.
- Requisito de segurança exige teste determinístico.
- Comportamento probabilístico exige eval.
- Nenhum requisito pode ser marcado como entregue enquanto sua evidência de verificação estiver ausente.
