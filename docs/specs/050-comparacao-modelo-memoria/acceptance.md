# Aceitação — Spec 050

| ID | Requisito | Exemplo verificável |
|---|---|---|
| AC-5001 | RQ-5001 | As quatro células usam IDs e hashes idênticos de corpus, dataset e código; checkpoint alterado é recusado. |
| AC-5002 | RQ-5002 | A mesma continuação recebe histórico no modo ligado e nenhum contexto no desligado, sem trocar variável global ou alterar a pergunta. |
| AC-5003 | RQ-5003 | Resposta recusada após transporte concluído ainda entra no consumo; erro sem usage fica desconhecido e não é registrado como zero. |
| AC-5004 | RQ-5004 | Entrada total 1M, cache 400k e saída 100k em Sol dá 56 créditos equivalentes; billedCost permanece nulo; cache maior que entrada é recusado. |
| AC-5005 | RQ-5005 | Plano sem `--execute` não gera chamadas; resumo sem revisão não informa taxa de acerto ou modelo aprovado; falhas e pendências não somem. |
| AC-5006 | RQ-5001/RQ-5003 | Execução interrompida preserva checkpoints e subtotal; retomada compatível não repete casos concluídos nem reaproveita resposta de outra célula. |

Comandos: `pnpm run evals:comparison`, testes unitários/E2E de comparação, `pnpm run check`,
`pnpm run evals`, `pnpm run evals:documentary` e gate de visão.
