# Aceitação — Spec 055

- **AC-5501 / RQ-5501:** plano contém somente Sol 6.1/Sol 5.6, memória ligada, low, 560 cenários/2.020 turnos e zero chamadas.
- **AC-5502 / RQ-5501:** snapshot adulterado é recusado; cópia nova mantém aplicação, corpus, dataset, prompt e alvos idênticos; alteração do harness é explícita e histórico permanece intacto.
- **AC-5503 / RQ-5502:** transporte envia modelo exato; tarifas/cache corretos; falha sem usage não vira custo zero ou cobrança.
- **AC-5504 / RQ-5503:** execução integral ou interrupção tem checkpoints e relatório; 80 alvos conservam exclusão R3 e denominador 79, com motivos/hashes e custos de smoke separados.

## Resultado observado

AC-5501–5504 executados em `2026-10-29-sol-61-56-r1`: 280 cenários/1.010 turnos por
modelo, low e memória ligada, sobre aplicação R3 preservada. Os únicos arquivos
diferentes são três do harness. O verificador final passou com 560 checkpoints e
160 decisões vinculadas às respostas. Testes de cópia/adulteração e tarifas passaram.

Sol 6.1 teve 68/79 satisfatórias; Sol 5.6, 57/79; Luna R3 histórica, 59/79. Custos,
tentativas sem usage e novas falhas permanecem explícitos no
[relatório](observed-results-2026-10-29.md). Isso atende à execução e medição solicitadas,
sem certificar qualidade global, aprovação especializada ou adoção de configuração.
