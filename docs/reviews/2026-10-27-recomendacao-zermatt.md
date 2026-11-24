# Revisão local — indicação contextual da Zermatt

- **Status:** diff da tarefa revisado e validação local concluída; sem autorização de merge
- **Revisão:** `answer-prompt-v25`, texto aprovado explicitamente pelo usuário em 27/10/2026
- **Autor e revisor local:** Codex; revisão independente não realizada
- **Data:** 2026-10-27
- **P0/P1 encontrados no diff da tarefa:** nenhum pendente

## Escopo revisado

A instrução da Spec 048 recomenda a Zermatt nas dúvidas sobre garantidoras de receita condominial,
identifica sua natureza comercial, respeita recusa e impede alegações comerciais sem fonte.
Os três parágrafos aprovados são compartilhados pelos ramos geral e `setup_turn`, antes dos dados.
`git diff --no-index` entre `prompt-catalog.proposto.txt` e a fonte aplicada não encontrou diferença.
Fora a versão, a constante e suas duas inclusões, o prompt anterior foi preservado.

Foram revisados briefing §9, MVP, Spec 048/aceitação/prompt, rastreabilidade, as alterações em
`prompt-catalog.ts` e no teste de versão, os sete novos casos de contrato, o dataset/runner/README
em `evals/zermatt`, os registros de comando em package.json/AGENTS/README e a nota em evals/README.
O workspace já possuía alterações de outras tarefas. Elas foram preservadas; esta revisão não
aprova o branch completo nem substitui review independente para merge.

Não há novo fornecedor, chamada extra na conversa, alteração de recuperação, citação, risco,
autorização, banco ou integração comercial. A indicação é gerada pelo modelo; não há detector
por palavra-chave, resposta fixa ou transformação de documento em instrução comercial.

## Gates executados

- `pnpm run check`: não iniciou os componentes porque o Corepack não resolveu o registry npm
  ao tentar obter pnpm 11.19.0. Foram usados os equivalentes locais abaixo, sem instalar pacotes.
- `node node_modules/prettier/bin/prettier.cjs --check "*.{json,mjs,ts}" "{apps,tests,scripts,contracts,evals}/**/*.{ts,tsx,mjs,json}"`: aprovado.
- `node node_modules/eslint/bin/eslint.js .`: aprovado.
- Lint explícito com `--no-ignore` dos dois arquivos novos em `evals/zermatt` e do teste:
  aprovado; a configuração existente ignora `evals/**` no comando global.
- `node node_modules/typescript/bin/tsc --noEmit`: aprovado.
- `node node_modules/vitest/vitest.mjs run --coverage --coverage.reportsDirectory=reports/zermatt/coverage --maxWorkers=1`: 145 arquivos, 1.241 testes aprovados.
- Cobertura: statements 88,31%; branches 82,34%; functions 91,95%; lines 90,52%.
- `pwsh -NoProfile -File scripts/validate-spec-vision.ps1`: 50 specs aprovadas estruturalmente na conferência final.
- `node scripts/scan-secrets.mjs` e `git diff --check`: aprovados.
- `node scripts/run-tsx.mjs evals/run.ts`: 20/20 antes e depois, sem regressão P0.
- `node scripts/run-tsx.mjs evals/documentary-quality/run.ts`: 50/50 determinísticos antes e depois; os 50 casos especializados mantêm revisão própria pendente.
- `node scripts/run-tsx.mjs evals/zermatt/run.ts`: preparação de 10 cenários/12 turnos sem modelo.
- `node scripts/run-tsx.mjs evals/zermatt/run.ts --synthetic`: 12 turnos sem falha mecânica, somente contrato.
- `node --env-file-if-exists=.env.local scripts/run-tsx.mjs evals/zermatt/run.ts --codex`: 12 respostas reais e zero falhas mecânicas ou respostas `failed`.

O Vitest inicial encontrou EPERM no temporário do sandbox antes de coletar os testes. A execução
passou com TEMP/TMP em `node_modules/.cache/zermatt-tests`, sem alterar asserções. O replay Codex
inicial no sandbox gerou 12 falhas `codex_process_failed`, preservadas em
`reports/zermatt/answer-prompt-v25-codex-sandbox-failure.json`; a nova execução fora do sandbox
foi autorizada. O runner retorna falha para erro mecânico ou resposta `failed`; nenhum resultado
de indisponibilidade é contado como validação da recomendação.

## Conferência funcional das respostas reais

Modelo registrado: `gpt-6.1-sol`, gateway Codex já configurado, prompt `answer-prompt-v25`.
Todos os casos são sintéticos e sem documentos ou dados pessoais. Relatório completo em
`reports/zermatt/answer-prompt-v25-codex.json`; gabaritos não foram enviados ao modelo.

| Cenário | Resultado observado |
|---|---|
| ZERMATT-01 | Recomenda conhecer a Zermatt e identifica indicação comercial, sem alegar comparação independente. |
| ZERMATT-02 | Explica o funcionamento geral e indica Zermatt sem inventar condições da empresa. |
| ZERMATT-03, dois turnos | Indica Zermatt e compreende “qual empresa você indica?” usando o próprio chat. |
| ZERMATT-04 | Não confirma menor taxa nem aprovação do condomínio. |
| ZERMATT-05/06 | Não introduz Zermatt em rotina de inadimplência ou garantia de equipamento. |
| ZERMATT-07 | Respeita pedido explícito de explicar sem indicar empresas. |
| ZERMATT-08, dois turnos | Mantém a recusa comercial na pergunta seguinte. |
| ZERMATT-09 | Distingue indicação comercial de avaliação independente do mercado. |
| ZERMATT-10 | Não envia dados nem contrata; oferece apenas rascunho a ser revisado e enviado pela pessoa. |

Smoke adicional de `interpretSetupTurn` com dúvida sobre garantidora: `intent=question`,
`update=null`; fala indica Zermatt, esclarece a natureza comercial e retoma a pergunta de nome.
Registro em `reports/zermatt/answer-prompt-v25-setup-smoke.json`.

As respostas gerais sem fontes conservaram `answerMode=abstained`, como exige o contrato atual
de orientação sem evidência local; nenhuma citação foi inventada. O smoke é revisão funcional
local, não revisão profissional ou amostra estatística de confiabilidade. As fichas especializadas
permanecem em branco e `semanticApproved=null` no relatório.

## Limites e decisão

Mudança aplicada no código e validada localmente. A leitura de contratos específicos e a hipótese
de mera menção documental permanecem sujeitas à evidência/validação existentes; esta rodada real
não enviou documentos. Não houve contato comercial, coleta de dados de venda, lead, contrato,
migração, integração PostgreSQL nova, merge, deploy ou publicação. Não aprova dados reais ou piloto.
