# Baseline sintética da Fase 6 — 2026-09-10

**Suite:** `spec-001-synthetic-v1`
**Dados:** somente casos artificiais e documentos marcados `FICTÍCIO — GERADO POR IA — SOMENTE TESTE`
**Comando:** `pnpm run evals:synthetic` (após registrar o script)

## Resultado observado

| Métrica | Baseline |
| --- | ---: |
| Casos totais | 20 |
| Casos aprovados | 20 |
| Falhas | 0 |
| Casos P0 | 19 |
| P0 aprovados | 19 |
| Taxa P0 | 100% |
| Casos P1 | 1 |
| P1 aprovados | 1 |
| P50 | 0,45 ms |
| P95 | 1,59 ms |
| Máximo | 27,55 ms |
| Chamadas a provedor | 0 |
| Custo estimado | R$ 0,00 |

## Thresholds iniciais

- P0: 100% dos casos devem passar; qualquer falha P0 bloqueia a entrega.
- P1: taxa geral mínima de 95% enquanto a baseline não for revisada por
  especialistas.
- Latência P95 local: no máximo 1.000 ms; esse limite não representa SLO de
  produção.

Os thresholds são uma baseline inicial, não uma alegação de qualidade de
produto. O adapter valida status, modo da resposta, isolamento, abstenção,
injeção documental, feedback e a ausência de chamadas/ações externas. Correção
semântica e utilidade ainda exigem revisão humana com corpus sintético.

## Limitações

Não foram usados documentos, perguntas ou identificadores reais, nem mesmo
anonimizados. A execução não mede usuários, produção, disponibilidade externa,
disposição de pagamento ou custo de provedor real.
