# Critérios de aceitação — Spec 004

| ID | Cenário | Resultado esperado |
| --- | --- | --- |
| AC-401 | Servidor iniciado sem `GEMINI_API_KEY` | Usa o gateway sintético local sem tentativa de rede. |
| AC-402 | Servidor iniciado com `GEMINI_API_KEY` | Usa o gateway Gemini apenas no backend. |
| AC-403 | Gemini retorna JSON com uma citação autorizada | A resposta é exibida com a mesma evidência, documento, versão, página e trecho verificável. |
| AC-404 | Gemini retorna citação inexistente ou trecho alterado | A resposta falha fechada e não exibe afirmação documental. |
| AC-405 | Documento contém instrução maliciosa | O prompt delimita o documento como dado não confiável e o validador impede citação inválida. |
| AC-406 | Provedor falha, expira ou devolve conteúdo não estruturado | O sistema registra falha mínima e retorna mensagem segura, sem fonte inventada. |
| AC-407 | Usuário envia apenas um cumprimento | A Cora responde de modo acolhedor, sem alegação documental e sem citação. |
| AC-408 | Usuário pede orientação prática condominial sem citar um documento | A Cora responde em linguagem conversacional, sem fontes vazias, sem alegar regra local e com encaminhamento humano quando houver risco. |
