# Revisão local — continuação das correções Luna/Sol 6.1

- **Status:** revisado pelo autor; não é aprovação independente para merge.
- **Autor/revisor:** Codex, auditoria técnica por IA.
- **Data:** 2026-10-29.
- **Diff revisado:** delta desta tarefa contra os arquivos copiados antes das alterações em
  `.local/corrections-056-r4/baseline`, módulos/teste novos e documentação correspondente.
  Hashes finais em `reports/conversations-corrections-056-r4-verification.json`.
- **P0/P1 identificados no delta revisado:** 0.

## Escopo e evidências

Spec 056, RQ-5602–5605 e AC-5610–5616. Revisado o diff completo dos quatro módulos alterados,
os dois módulos novos (`documentary-dates.ts`, `financial-result-table.ts`), as 51 regressões e
as mudanças de spec, aceitação, resultados e rastreabilidade. As alterações preexistentes no
diretório compartilhado foram preservadas; esta revisão não aprova os demais diffs do workspace.

O cálculo usa centavos inteiros, competências consecutivas, rubricas e colunas da tabela atual.
Controles recusam valor/sinal/período errados, total em saldo/taxa, cabeçalho projetado, competência
ausente e versões concorrentes. Qualificação monetária fica na cláusula correspondente. A
correção não altera autorização, tenant, recuperação ou acesso às fontes; validadores anteriores
de IDs, versão, trecho, offsets, modo e claim continuam executados.

O reparo contém somente orientação interna controlada; não copia texto recusado ou gabarito,
não converte claims/indicadores para aprovar saída e mantém duas tentativas, modelo/esforço,
oito fontes, oito turnos e 12.000 bytes. Instruções documentais não são promovidas a instrução
de sistema. O system prompt e os resultados históricos foram preservados.

## Verificação executada

O Corepack/pnpm não conseguiu baixar sua versão por DNS no sandbox. Executados os mesmos
componentes do gate com os binários instalados:

- `node node_modules/prettier/bin/prettier.cjs --check '*.{json,mjs,ts}' '{apps,tests,scripts,contracts,evals}/**/*.{ts,tsx,mjs,json}'`
- `node node_modules/eslint/bin/eslint.js .`
- `node node_modules/typescript/bin/tsc --noEmit`
- `node node_modules/vitest/vitest.mjs run --coverage --coverage.reportsDirectory=.local/corrections-056-r4/coverage-final-gate --maxWorkers=2 --testTimeout=20000 --hookTimeout=30000`
- `pwsh -NoProfile -File scripts/validate-spec-vision.ps1`
- `node scripts/scan-secrets.mjs`
- `node scripts/run-tsx.mjs evals/run.ts`
- `node scripts/run-tsx.mjs evals/documentary-quality/run.ts`

Suíte completa: **1.650/1.650 testes, 165 arquivos**. Cobertura statements **92,46%**, branches
**88,37%**, funções **97,16%**, linhas **94,06%**. Os 51 testes novos e os 48 da suíte de sínteses
passaram; E2E incluídos na execução ampla. Gate de visão aprovado para 58 specs. Evals legados
20/20 e documentais determinísticos 50/50. Sem exclusão ou enfraquecimento de asserções.
TEMP/TMP da tarefa contornam EPERM no temporário padrão; os tetos do harness conservam os
limites e asserções específicos dos cenários. Nenhum banco/schema mudou nesta tarefa.

## Resultados dos modelos e pendências

Contraprovas R4/R5 concluídas com falhas preservadas, conforme
`docs/specs/056-validacao-e-completude-sinteses/corrections-2026-10-29.md`. Houve 33 tentativas com
usage e duas falhas iniciais sem usage. Custo conhecido 11,408377 créditos equivalentes, mais
consumo desconhecido; não é fatura. O Luna reparou a minuta na R5. Uma falha Sol
`codex_tool_disallowed` permanece operacional, sem inferir o item emitido.

Os ajustes posteriores de parsing foram revalidados offline em 88 candidatos com hashes
conferidos, sem nova inferência. Isso não substitui falhas R4/R5, não mede taxa global e não
certifica o fluxo completo. Persistem lacunas de recuperação, completude semântica e histórico
durável. Revisão independente e profissional, 50 evals documentais semânticos e nova comparação
completa dos modelos permanecem pendentes. A spec conserva o estado de pendências qualitativas.

Não houve merge, publicação ou reinício da aplicação do usuário. A mudança fica disponível
para a próxima execução do backend com esta fonte.
