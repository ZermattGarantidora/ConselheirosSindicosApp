# Aceitação — Spec 074

- **AC-7401:** fixture com entrada 3.000, cache lido 1.000, escrita 30m 500, escrita 12h 500 e saída 500 calcula USD 0,01085 para Sol; raciocínio não é somado novamente. Sem escrita, fixture comum calcula valor correto.
- **AC-7402:** ausência, número negativo/fracionário, cache maior que entrada, TTL inconsistente ou modelo sem preço gera valor desconhecido; custo observado nulo não é custo zero.
- **AC-7403:** resposta incompleta, JSON inválido, citação não autorizada e erro de rede mantêm a rejeição original e registram uma tentativa; uso disponível é preservado mesmo quando o resultado falha. Reparo soma ambas as tentativas.
- **AC-7404:** o evento privado da resposta persiste os recibos sem pergunta, texto, IDs de fonte ou chave, sem alterar o isolamento e sem migration. Testes da persistência verificam o JSON recebido.
- **AC-7405:** plano possui exatamente 30 IDs únicos, ambos os braços, memória ligada e esforços do runtime, com hash de corpus/código/dataset e zero inferência no modo padrão.
- **AC-7406:** execução usa snapshot, alternância, checkpoints e no máximo o reparo existente; falha preservada não é substituída em retomada. Nenhuma API alternativa é chamada.
- **AC-7407:** relatório inclui todas as tentativas, ausência de usage, modelos, latências média/mediana/p95, custos equivalentes e limites; custo por aprovado inclui rejeições no numerador e é nulo sem denominador.
- **AC-7408:** todos os turnos executados têm auditoria técnica identificada, gabarito e hashes; aprovação mecânica não vira qualidade semântica, revisão especializada continua pendente e falhas permanecem visíveis.
- **AC-7409:** visão, formatação, lint, tipos, cobertura >=80% nos quatro indicadores, E2E e evals determinísticos aplicáveis são executados e seus resultados registrados. A fixture de risco do smoke Codex deve responder à emergência e exigir especialista; manter a asserção de quatro chamadas, sem tornar resposta genérica válida para evitar reparo.
