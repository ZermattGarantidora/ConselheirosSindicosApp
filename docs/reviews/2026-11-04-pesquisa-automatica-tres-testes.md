# Pesquisa automática — reinício e três testes reais

Em 04/11/2026, após autorização explícita para reiniciar a API e executar três testes,
a API foi compilada com `tsc --project tsconfig.api.json`. Somente o Node verificado na
porta 3000 foi substituído: PID 1508 → 31976, às 09:59, usando os mesmos arquivos de
ambiente e janela oculta. O Vite na porta 5173 permaneceu ativo. Saúde e provedor Codex
foram confirmados pelo proxy antes dos testes; o PID 31976 continuou na porta após eles.

## Resultado

**3/3 testes técnicos aprovados**, com perguntas públicas sem comando para pesquisar,
identidade sintética `sindico-demo` e conversas independentes em `alameda`.
Nenhum PDF, dado cadastral ou histórico privado foi enviado ao pesquisador.

| Pergunta                                                             | Sinal de progresso | Resposta completa | Fontes oficiais distintas | Resultado |
| -------------------------------------------------------------------- | ------------------ | ----------------- | ------------------------- | --------- |
| Quais são as regras atuais para assembleias virtuais em condomínios? | 28 ms              | 34,23 s           | 1 — Senado                | Aprovado  |
| Quais são os deveres do síndico na prestação de contas?              | 18 ms              | 15,53 s           | 1 — Senado                | Aprovado  |
| Como aplicar a LGPD na administração de condomínios?                 | 24 ms              | 23,31 s           | 3 — ANPD                  | Aprovado  |

Nos três casos, o servidor enviou `x-alvitra-progress: internet` e um primeiro trecho
contendo somente whitespace JSON, enquanto a resposta final ainda era aguardada. Esse
é o sinal consumido pelo cliente para mostrar “Pesquisando na internet”. O envelope final
confirmou status 200, resposta não vazia, links HTTPS oficiais e data da pesquisa. O journal
recuperou pergunta e resposta; o aviso operacional não foi salvo como fala da Alvitra.

As respostas integrais e medições estão nos JSONs locais ignorados em
`.local/web-automatic-2026-11-04/activation/live-three.json` e `live-<tema>.json`.
O script utilizado está em `.local/web-automatic-2026-11-04/live-three.mjs`.
Os registros de ativação e saúde estão no mesmo diretório `activation`.

## Limites observados

- A ferramenta de interface encerrou o acesso por não conseguir determinar a URL atual do
  Chrome com confiança. Não houve mais interação visual. Estes testes verificam a API real
  e o proxy; não representam observação visual do texto na tela. A ordem do callback do
  cliente e o estado de interface têm cobertura determinística na revisão anterior.
- A segunda resposta cobre os deveres gerais do síndico, incluindo prestar contas anualmente
  e quando exigido. Ela é mais ampla que a pergunta. Também retornou metadados de análise
  financeira limitada, sem linhas ou valores, pedindo dois meses. Esse comportamento do
  caminho financeiro não foi alterado neste ensaio.
- A conferência técnica de pesquisa e links não substitui avaliação jurídica especializada.
  As respostas não comprovam regras ou fatos de um condomínio específico.
- O histórico da demonstração continua volátil. A tentativa de preservar o cadastro do
  acesso anterior não o encontrou antes do reinício; nenhum cadastro foi restaurado por
  este ensaio. O reinício não removeu arquivos originais do disco.

Não houve alteração de comportamento, prompt ou configuração nesta ativação, nem merge ou
deploy. Os gates e a cobertura do código implementado permanecem registrados na
[revisão da pesquisa automática](2026-11-04-pesquisa-automatica-progresso.md).
