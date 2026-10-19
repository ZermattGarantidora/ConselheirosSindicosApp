# Notas de integração — Spec 028

## Integração final — 2026-10-16

A Spec 032 consome a extração no relatório do turno. O adaptador financeiro da Spec 029 está implementado. A persistência adicional foi substituída, nesta fatia, por derivação sobre páginas já persistidas sob RLS (ADR 0024); não se repete OCR nem se cria cache fora da retenção documental. As limitações geométricas abaixo permanecem.

## Contrato público

`apps/api/documents/structured/structured-document-contract.ts` expõe `StructuredDocumentExtraction` e `StructuredFinancialEntry`. A frente de análise deve aceitar somente entradas cujo `source.condominiumId` corresponda ao contexto autorizado e deve citar a fonte original, sem transformar avisos ou estados desconhecidos em conclusões.

O contrato também expõe `internal_rules` para sinal direto de regimento interno; esse tipo não autoriza inferir regra, vigência ou prevalência sem evidência recuperada.

## Limitações deliberadas

- A extração é determinística, textual e conservadora; não reconhece colunas geométricas de PDF nem extrai uma linha com mais de um valor. Valores negativos, entre parênteses ou sintaticamente incompletos ficam fora dos dados financeiros até revisão.
- A fatia não persiste o derivado estruturado. Ele acompanha `DocumentProcessingOutcome`; uma etapa futura precisa de schema, RLS, retenção e purge para materializá-lo.
- `financialPeriod` é somente período contábil e jamais vigência documental.

## Ajustes globais necessários depois da integração

- definir repositório de derivados estruturados com RLS, retenção e purge coerentes com originais;
- conectar a análise determinística somente aos campos com estado `known` e fonte verificável;
- acrescentar à rastreabilidade global os requisitos RQ-2801 a RQ-2804 e seus testes.
