# Critérios de aceitação — Spec 004

| ID | Cenário | Resultado esperado |
| --- | --- | --- |
| AC-401 | Servidor iniciado sem `GEMINI_API_KEY` | Usa o gateway sintético local sem tentativa de rede. |
| AC-402 | Servidor iniciado com `GEMINI_API_KEY` | Usa o gateway Gemini apenas no backend. |
| AC-403 | Gemini retorna JSON com uma citação autorizada | A resposta é exibida com a mesma evidência, documento, versão, página e trecho verificável. |
| AC-404 | Gemini retorna citação inexistente ou trecho alterado | A resposta falha fechada e não exibe afirmação documental. |
| AC-405 | Documento contém instrução maliciosa | O prompt delimita o documento como dado não confiável e o validador impede citação inválida. |
| AC-406 | Provedor falha, expira, limita temporariamente ou devolve conteúdo não estruturado | O gateway repete somente falhas transitórias, no máximo três tentativas dentro do orçamento total; não repete autenticação/configuração inválida e, se todas falharem, registra falha mínima e permite fallback seguro sem fonte inventada nem texto documental fragmentado. |
| AC-407 | Usuário envia apenas um cumprimento | A Cora responde de modo acolhedor, sem alegação documental e sem citação. |
| AC-408 | Usuário pede orientação prática condominial sem citar um documento, ainda que a busca pudesse encontrar um trecho apenas tangencial | A Cora responde em linguagem conversacional, sem usar o trecho tangencial como fonte, sem alegar regra local e com encaminhamento humano quando houver risco. |
| AC-409 | `GEMINI_MODEL` não é informado no ambiente de testes | O gateway usa `gemini-3.5-flash-lite`; uma variável explícita continua substituindo o padrão. |
| AC-410 | A pergunta não é respondida pelos documentos recuperados | A Cora formula orientação geral para a pergunta, usa `answerMode: abstained`, não cria citação e informa que a resposta não foi confirmada nos documentos. |
| AC-411 | A evidência responde à pergunta | A Cora escreve a resposta na hora, preserva o sentido da fonte e a interface destaca documento, versão, página e trecho; nenhuma resposta pronta substitui a geração fundamentada. |
| AC-412 | Uma resposta documental é rejeitada pela validação | O sistema tenta orientação geral sem evidências e só exibe falha técnica se essa segunda geração também falhar. |
