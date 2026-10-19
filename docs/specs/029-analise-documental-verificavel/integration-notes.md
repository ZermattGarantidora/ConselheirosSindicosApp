# Notas de integração — Spec 029

## Integração final — 2026-10-16

`financialAmountsFromStructuredExtraction` adapta o contrato público da Spec 028 e `analyzeDocumentRequest` usa o comparador no turno da conversa (Spec 032). `evals:documentary` foi registrado em package.json, README, AGENTS, quality-gates e CI. O executor legado agora encaminha à bateria canônica; não contabiliza testes repetidos sob cenários diferentes. Os itens de bloqueio por divisão de arquivos abaixo são históricos e foram resolvidos; revisão especializada e verificação probabilística continuam pendentes.

## Estado em 2026-10-16

Esta frente implementou contratos internos em `apps/api/analysis/` e `apps/api/retrieval/financial-retrieval.ts`, usando somente dados sintéticos. Ela não altera o contrato de extração que pertence ao fluxo documental paralelo.

## Divisão de frentes subsequente

- A Spec 029 continua dona exclusivamente de comparação financeira de balancetes, recuperação financeira e adaptação do contrato estruturado para `FinancialAmount`.
- A análise de atas, convenções e contratos migrou para uma frente separada em `apps/api/analysis/normative/**` e `tests/unit/normative-document-analysis*`. Os critérios de sequência descritos na RQ-2905 são insumo para ela; esta frente não criará nem modificará esses arquivos.
- A bateria transversal de qualidade migrou para `evals/documentary-quality/**`, `tests/e2e/documentary-quality*` e `docs/specs/031-avaliacao-qualidade-documental/**`. O dataset anterior em `evals/datasets/document-analysis.ts` registra a cobertura sintética já preparada, mas não será duplicado ou expandido nesta frente.

## Adaptação pendente

Quando o contrato público em `apps/api/documents/structured/` for publicado, criar adaptador na camada de análise que converta somente campos equivalentes para `FinancialAmount`: `condominium_id`, documento, versão, página, trecho/offsets, método, incerteza, valor exato, moeda, rubrica original e período financeiro. O adaptador deve recusar campos ausentes e não modificar a pasta documental.

## Gate global pendente

O executor está preparado em `evals/document-analysis-run.ts`, mas a instrução de execução paralela proíbe modificar `package.json`, README, AGENTS e `docs/quality/traceability.md`. Portanto ainda falta registrar um comando único de eval nesses arquivos e integrá-lo ao gate global. Esta entrega não declara conclusão integral até esse registro e a execução combinada dos gates.

## Validação humana e de provedor pendente

Os 100 casos são sintéticos e ainda não receberam revisão de contador, advogado, síndico ou outro especialista. Nenhum provedor de IA foi chamado neste recorte; nenhuma verificação real de provedor foi realizada. Esses fatos não podem ser tratados como baseline de produto ou autorização de rollout.
