# Revisão do autor — ampliação de conversas longas

- **Status:** revisão do autor concluída; revisão independente pendente; sem autorização de merge.
- **Diff revisado:** RQ-4105/AC-4108–AC-4110, ampliação da Spec 041 nesta decisão de 27/10/2026.
- **Revisor independente:** pendente.
- **Autor:** Codex, autor dos roteiros e da infraestrutura desta ampliação.
- **Data:** 2026-10-27.

## Escopo

Preservação dos 240 cenários e 260 turnos originais, com 40 roteiros adicionais e 750 turnos:
dez conversas de 10, dez de 15, dez de 20 e dez de 30 perguntas. IDs `CONV-long-01` a `40`,
com oráculo específico por pergunta e checkpoints de fase. Nenhum documento do corpus foi alterado.

Arquivos revisados: `long-case.ts`, `long-dataset.ts`, `long-10.ts`, `long-15.ts`, `long-20.ts`,
`long-30.ts`, exportações de `dataset.ts`, `replay.ts`, `review.ts`, `run.ts`, testes de eval,
adaptação da seleção em `risk-classification.test.ts`, Spec 041/aceitação, README principal,
READMEs de eval e rastreabilidade. O driver transitório original de 240 casos em `tmp/` passou
a selecionar explicitamente a baseline, preservando a comparação e a autorização original.
Não houve alteração de comportamento de produção, provedor, prompt, banco ou dependência nesta fatia.

Revisei os cálculos contra os três balancetes e os gabaritos contra os 25 textos fictícios.
A classificação de risco do roteiro indica sua natureza geral, não que toda pergunta isolada
exige risco alto; a revisão por turno decide se o escalonamento é apropriado ao contexto.
Isso não substitui revisão especializada dos gabaritos ou das respostas de modelo.

## Verificações e correções durante a construção

- O usuário `restricted` da fixture tem associação `advisor` ao Alameda; a recusa negativa
  foi corrigida para tentar o Bosque, sem associação. Mantive 403 e zero gateway, sem enfraquecer asserções.
- A regressão dos 51 turnos originais de risco usa `baselineConversationCases`; não deve receber
  230 perguntas de roteiros mistos como se fossem perguntas isoladas obrigatoriamente de alto risco.
- Confirmações mecânicas cobrem chat preservado, limite da memória, fontes progressivas/retiradas,
  separação por usuário/condomínio e revogação após 15 perguntas. Não certificam persistência SQL ou frontend.
- Testes recusam completude quando se omite o último resultado ou se troca sua pergunta.
  Uma revisão fictícia que reprova segurança só no turno 30 mantém esse turno reprovado e bloqueia aprovação.
- Hash da baseline preservada: `4dbc7054c44e53571fd08f5f068bdbe454ccc35fabfffb26d075a183426c33e9`.
- Hash do corpus preservado: `96ca9a845c28b1e3bfabd42033bd852d92a1de85b65626c07bee7d257fc86e39`.
- Hash do dataset ampliado: `4e721a0c6f408791f0aca1d3ac45d0d82ed890549d8b5dd4fb2ffbeef21a193b`.
- Bruto da rodada histórica preservado: `c8af558626bc5883cd3782cb15fefe7ad4bb4645107bdd2259520b2511fb5bf3`.

## Gates executados

`pnpm run check` falhou antes de executar os gates por DNS do Corepack ao buscar pnpm 11.19.0
(`ENOTFOUND registry.npmjs.org`). Foram executados os equivalentes com os binários já instalados:

| Verificação | Resultado |
|---|---|
| Prettier no conjunto de código do projeto | Aprovado; README de eval também formatado |
| ESLint no workspace | Aprovado |
| TypeScript `tsc --noEmit` | Aprovado |
| Vitest com cobertura, `--maxWorkers=2` | 143 arquivos e 1.226 testes aprovados |
| Statements / branches / functions / lines | 91,09% / 86,09% / 96,30% / 92,98%, acima de 80% |
| Validação de visão | 47 specs aprovadas |
| Scanner de segredos | Aprovado |
| Evals determinísticos anteriores | 20/20 e 50/50 aprovados |
| Preparação da suíte completa | 280 cenários, 1.010 turnos, nenhuma chamada externa |
| Replay sintético completo | 1.010/1.010 turnos mecanicamente válidos, zero falhas, zero respostas failed |
| Replay sintético `--long` | 750/750 turnos mecanicamente válidos, zero falhas |
| Seleção `--baseline` | 240 cenários/260 turnos e hash original preservados |

A primeira cobertura geral, executada junto com outros gates e com a concorrência padrão,
teve dez timeouts de testes antigos e um timeout da suíte ampliada, além do seletor de risco
que ainda incluía o conjunto novo. Depois da correção do seletor, a execução limitada a dois
workers passou inteira sem mudar timeouts, asserções, thresholds ou a configuração de CI.
Relatórios locais: `reports/conversations-expansion-tests.json`,
`coverage/conversations-expansion/coverage-summary.json`, `reports/conversations-synthetic.json`
e `reports/conversations-long-synthetic.json`. Esses resultados se referem ao snapshot do
workspace testado; não aprovam alterações concorrentes posteriores.

## Limites e decisão

Infraestrutura e roteiros adicionados, com documentação e rastreabilidade coerentes. Os 1.010
turnos continuam pendentes de revisão semântica. Não executei os 40 longos no modelo externo;
as respostas sintéticas locais validam contratos e não recebem notas de correção.
Revisão independente para merge e revisão de síndico/contador/jurista/responsável técnico seguem pendentes.
Nenhum merge, publicação ou novo consumo externo foi realizado nesta fatia.
