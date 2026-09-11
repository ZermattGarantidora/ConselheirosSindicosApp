# Registro de revisão local — B6/B7 piloto sintético

- **Status:** APROVADO PARA PILOTO SINTÉTICO; NÃO APROVADO PARA MERGE OU PRODUÇÃO
- **Commit ou diff revisado:** diff completo do working tree em 2026-09-10, incluindo as trilhas B6 e B7, a migration 009 e o adapter de eval
- **Revisor independente:** revisão humana do corpus concluída no navegador local; nome e data não foram preenchidos no JSON exportado
- **Autor:** Codex
- **Data:** 2026-09-10
- **P0 abertos:** 0
- **P1 abertos:** 0

## Escopo revisado

Revisados os arquivos de código, testes, políticas, threat model, ciclo de vida,
runbook de incidente, corpus, adapter de eval, trilha de feedback/auditoria e
relatório do piloto B7. A revisão verificou
autorização por `condominium_id`, isolamento entre Alameda e Bosque, conteúdo
documental não confiável, validação de citações, abstenção, purge/exportação,
revogação, feedback imutável, telemetria minimizada, ausência de chamadas externas
e a coerência entre tarefas,
rastreabilidade e release.

O pacote caso a caso para revisão humana independente foi preparado em
`docs/reviews/b7-corpus-human-review-2026-09-10.md`. A revisão técnica do agente
não é usada como assinatura humana. A revisão humana do responsável registrou
100 casos aprovados, 0 para revisar e 0 reprovados; T704 está concluída no escopo
sintético.

Não foram encontrados defeitos concretos P0 ou P1 no escopo sintético. A
revisão humana do corpus foi registrada e os riscos residuais registrados em
`docs/security/b7-threat-model-review.md` continuam bloqueando dados de
clientes, usuários externos, armazenamento remoto e produção.

## Comandos executados

- `pnpm run check` — aprovado: 178 testes; statements 92%, branches 84,93%, functions 97,95% e lines 91,9%.
- `pnpm run evals:synthetic` — aprovado: 20/20 casos; 19/19 P0; 0 chamadas de provedor; custo R$ 0,00.
- `pnpm run pilot:synthetic` — aprovado: 100/100 casos sintéticos.
- `pnpm run test:e2e` — aprovado: 21/21 testes.
- `pnpm run build:web` — aprovado.
- `git diff --check` — aprovado.

## Achados P2/P3 aceitos

Nenhum novo achado P0 ou P1. As limitações de validação Neon da
migration 009, infraestrutura de retenção/backup e sandbox de parser/OCR permanecem registradas e não foram
tratadas como defeitos ocultos nem como autorização de rollout.

## Decisão

O diff está aprovado para o piloto automatizado sintético fechado. Qualquer
merge ou liberação externa ainda exige revisão do diff mais recente, proteção de
branch, validação do ambiente persistente e uma nova decisão de dados; esta
revisão sintética não os substitui.
