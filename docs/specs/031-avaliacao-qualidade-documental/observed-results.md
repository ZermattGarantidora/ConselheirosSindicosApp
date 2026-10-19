# Resultados observados — Spec 031

**Data:** 2026-10-16  
**Dados:** exclusivamente sintéticos; nenhum dado pessoal, documento de cliente ou provedor externo.

## Execução local

```powershell
pnpm run evals:documentary
```

| Métrica | Resultado observado |
|---|---:|
| Casos totais | 100 |
| Determinísticos planejados/executados/aprovados | 50 / 41 / 41 |
| Falhas determinísticas | 0 |
| Determinísticos pendentes de integração | 9 |
| Semânticos planejados/replay por gateway | 50 / 0 |
| Casos P0 catalogados | 82 |
| Chamadas a provedor | 0 |
| Revisão especializada | pendente |

## Cobertura por segmento

| Segmento | Casos | Determinísticos executados | Semânticos pendentes |
|---|---:|---:|---:|
| balancete | 10 | 10 | 0 |
| tabela | 10 | 7 | 0 |
| OCR | 10 | 9 | 0 |
| isolamento | 10 | 10 | 0 |
| conteúdo não confiável | 10 | 5 | 0 |
| ata | 10 | 0 | 10 |
| convenção/regimento | 10 | 0 | 10 |
| contrato/aditivo | 10 | 0 | 10 |
| versão/citação | 10 | 0 | 10 |
| abstenção e escalonamento | 10 | 0 | 10 |

Os 41 casos executados exercitaram extração, conversão com fonte, variações exatas, ausência, duplicidade, duas moedas, sinais recusados, OCR incerto/incompleto, autorização, cache escopado, tentativa de ID externo, vetor de outro tenant, não exposição de erro documental pelo endpoint e comandos em documentos tratados como dados na camada estruturada. Nove cenários não receberam aprovação: subtotal, tabela cortada, rubrica multilinha, discrepância visual 8/3 no OCR e cinco comportamentos de instrução documental ainda sem executor fiel. Todos aparecem com motivo individual em `pendingCases`.

Os 50 casos semânticos têm agora fichas sintéticas concretas em `evals/documentary-quality/semantic/`, com pergunta, fonte versionada, rubrica e revisor requerido. A execução sem gateway observou `pending_gateway` (50 fichas, zero replay); o replay local de contrato exercitado pelo e2e também continua `pending_specialist_review`. O resultado não mede correção de modelo, grounding textual ponta a ponta, qualidade de prompt ou aprovação de especialistas. Portanto não é baseline de produto nem autorização de rollout.
