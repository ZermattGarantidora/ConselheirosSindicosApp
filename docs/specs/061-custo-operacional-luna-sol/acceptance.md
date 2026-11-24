# Aceitação — Spec 061

- **AC-6101:** nas fábricas OpenAI/Codex, consulta simples e configuração usam Luna high; risco alto e regras complexas da Spec 051 usam Sol 6.1 low. Uma geração por decisão; modelo/motivo observáveis.
- **AC-6102:** `single` preserva modelo configurado e esforço low; configuração desconhecida falha. Desativação, ausência de chave, limites de Codex local e prioridade sem fallback pago permanecem.
- **AC-6103:** na API, duas perguntas/contextos diferentes da mesma variante têm prefixo estável idêntico; pergunta, IDs, evidências e histórico ficam fora dele. Reconstruir os textos enviados preserva o prompt v27, inclusive setup. Somente prefixo recebe breakpoint de 30m. Modelo customizado não recebe opção nova presumida. Budget e `store:false` permanecem.
- **AC-6104:** citações permanecem reconstruídas exclusivamente das evidências recebidas; falha/incompletude não promove resposta ou dispara outro modelo. Regressões existentes de isolamento, cálculos, recuperação, memória e persistência passam.
- **AC-6105:** o ambiente local fica em híbrido sem mudança de credencial. E2E do servidor cobre boas-vindas, configuração, pergunta simples, risco alto e ausência de fallback, usando mocks. README informa reinício e reversão.
- **AC-6106:** híbrido local conserva a disponibilidade do gateway de lote; a chamada é Sol 6.1 low, sem usar Luna/API. Codex desativado, produção e single não-Sol não abrem esse fluxo. A validação/autorização do lote permanece inalterada.
- **AC-6107:** visão, formatação, lint, tipos, cobertura nos quatro indicadores, E2E e evals determinísticos aplicáveis passam. Evidências/limites ficam em results.md; nenhuma economia ou aprovação semântica é inventada.
