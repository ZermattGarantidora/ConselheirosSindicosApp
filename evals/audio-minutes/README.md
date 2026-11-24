# Cenários locais de redação de ata

`pnpm run evals:audio-minutes` executa 26 casos sintéticos (13 por modo de áudio), sem `.env`,
conexão ou provedor real. Ata esperada, saídas defeituosas e respostas do conferente são
roteirizadas e rotuladas. A bateria verifica síntese estruturada, referências, números, cobertura,
conferência completa e bloqueio quando o conferente rejeita nomes inferidos, omissões, negações
perdidas ou propostas promovidas a aprovação. Não simula a capacidade de um modelo detectar
esses problemas: os rótulos são explícitos. Não é avaliação de qualidade real de IA.

Resultados em `.local/authoring/semantic-evals/results.json`. Os testes unitários e E2E cobrem
autorização, recuperação, concorrência e o fluxo até o PDF. Antes de habilitar um modelo real,
será necessária avaliação específica de redação e conferência, com corpus sintético revisado,
limites/custo/política aprovados e revisão humana. A bateria local não autoriza ativação.
