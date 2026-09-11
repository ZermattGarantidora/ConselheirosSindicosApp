# Revisão preliminar do threat model — T701

**Status:** concluído para piloto sintético; não libera dados reais
**Data:** 2026-09-10
**Escopo:** entradas de documentos, processamento PDF/OCR, retrieval, gateway de resposta e fronteiras de tenant da Spec 001

## Regra de dados

Esta revisão usa somente código, testes e fixtures sintéticos. Nenhum documento,
pergunta, identificador ou log real foi utilizado.

## Controles confirmados na implementação atual

- upload exige assinatura `%PDF-`, limite de tamanho, metadados válidos e
  permissão `document:upload`;
- o original é removido quando o registro transacional falha;
- parser PDF com falha retorna estado `failed` e não publica páginas como prontas;
- OCR indisponível, inválido ou abaixo do piso mantém o documento em `needs_review`;
- storage usa chave opaca derivada do condomínio e rejeita identificador de objeto
  inválido;
- contexto autorizado e RLS/recuperação usam o condomínio selecionado no servidor;
- o gateway local trata instruções documentais como dado e a resposta valida
  evidências/citações antes de exibir o resultado;
- as suítes existentes de isolamento, revogação, citação, falha segura e as novas
  entradas T701 usam apenas corpus sintético.

## Evidências executáveis

- `tests/unit/upload-document.test.ts`;
- `tests/unit/document-processing.test.ts`;
- `tests/unit/private-document-storage.test.ts`;
- `tests/unit/local-extractive-gateway.test.ts`;
- `tests/unit/b7-input-hardening.test.ts`;
- `tests/e2e/identity-context.e2e.test.ts`;
- `tests/e2e/document-answer.e2e.test.ts`;
- `tests/integration/rls-tenant-isolation.test.ts`, quando executado contra o
  Neon dedicado e marcado como integração sintética.

## Gaps que impedem liberar dados reais

- quota por usuário/condomínio, timeout explícito, cancelamento e backpressure
  não fazem parte do piloto automatizado local;
- o processamento local não constitui, por si só, um sandbox de parser/OCR;
- o exercício de exportação/purge da T702 é sintético e não substitui a
  implementação contra infraestrutura autorizada;
- a trilha sintética e o adapter PostgreSQL da Fase 6 estão implementados, mas a
  validação contra o Neon dedicado não foi executada nesta etapa e retenção,
  alertas e operação de telemetria de produto continuam sem validação real;
- o procedimento de incidente foi exercitado apenas com cenários sintéticos.

Esses gaps são riscos residuais aceitos somente para este piloto automatizado,
sem dados reais, sem usuários externos e sem disponibilidade de produção. Eles
bloqueiam qualquer rollout com dados de clientes.

## Decisão provisória

T701 está concluída para o escopo sintético após a revisão, os testes de entrada
e o exercício de incidente. Qualquer achado crítico/alto, vazamento entre
condomínios ou resposta sem evidência continua bloqueando a B7.
