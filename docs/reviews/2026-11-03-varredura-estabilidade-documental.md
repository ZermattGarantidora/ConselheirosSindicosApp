# Revisão do autor — estabilidade do envio e da resposta documental

- **Status:** revisão do autor concluída; não autoriza merge
- **Data:** 2026-11-03
- **Escopo:** Specs 057/024, AC-5703/5711/5712/5713 e continuidade das perguntas
- **Snapshot:** `df4a5feeaa696683cc6ef0ab86f6101a2d56c45f7087bf077bf6e214dc0dab5a`
  em `.local/stability-sweep/source-manifest.json`
- **Revisor independente:** pendente
- **P0/P1 pendentes no delta:** nenhum encontrado na revisão do autor

## Diff e comportamento revistos

Revisto o delta contra `.local/stability-sweep/baseline/`, os dois módulos novos, testes e
documentação. Alterações preexistentes e concorrentes foram preservadas; não há aprovação do
branch inteiro. A fonte já reduzida pela Spec 016 foi conservada, atualizando dois contratos antigos.

Conferidos página/versão/escopo na deduplicação, limites do subprocesso e HTTP, resposta vazia,
corpo nulo, JSON inválido, snapshot inválido e erros de rede. A revisão identificou que um
snapshot vazio ainda podia provocar uma geração: o cliente passou a conferir sua estrutura,
com regressão de requisição única aprovada. A normalização de falhas não expõe texto nativo.

A política de risco foi extraída da pergunta existente e compartilhada pela síntese. Acrescenta
somente a recomendação humana exigida pelo classificador; texto, afirmações e fontes seguem pelo
validador. Metadados inválidos/contraditórios são recusados antes da aplicação da política. Não há
fallback de provedor, reparo novo, geração duplicada, relaxamento de acesso ou mudança do prompt.

## Verificação executada

- 1.833 testes de unidade/E2E, 173 arquivos, zero falhas; modelos e fontes sintéticos.
- Cobertura: statements 91,39%, branches 87,57%, functions 96,20%, lines 93,03%.
- TypeScript, ESLint, Prettier, scanner de segredos e gate de 62 specs aprovados.
- Builds de API/web; evals básicos 20/20 e documentais determinísticos 50/50.
- Runtime compilado: dois PDFs, vinte consultas simuladas, zero chamadas de provedor.
- Um smoke externo fictício, explicitamente autorizado, concluiu em 11,484 s com duas fontes;
  o mesmo caminho falhou no sandbox com `codex_process_failed` em 201 ms.
- Diagnóstico operacional do original já autorizado ocorreu em memória e parou antes do gateway.
  Nenhum conteúdo desse original virou fixture, eval, teste ou log.

Comandos equivalentes aos scripts canônicos usaram os binários instalados em `node_modules`:
Corepack não conseguia obter pnpm no sandbox. Testes HTTP rodaram no ambiente nativo porque o
sandbox negava localhost. Não houve mudança de asserção para contornar EACCES.

## Aplicação e limites

Vite recebe o cliente atualizado. O usuário confirmou o reinício do backend volátil e o descarte
de seu estado em RAM. A ativação foi concluída às 20h23 de 03/11/2026 (America/Sao_Paulo), com
saúde da API e do proxy aprovadas, Codex selecionado e originais em disco preservados. Não houve
nova geração, commit, merge ou deploy. A causa exata do 503 histórico não foi registrada à época e permanece
indeterminada; esta revisão corrige falhas reproduzíveis, sem atribuí-la retroativamente a uma delas.
Integração PostgreSQL não foi repetida: não houve mudança de schema, SQL ou persistência.
