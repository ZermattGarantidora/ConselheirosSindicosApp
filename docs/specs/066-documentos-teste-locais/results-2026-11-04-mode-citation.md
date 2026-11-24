# Continuação sem aviso interno de validação — 04/11/2026

O print foi rastreado até o fallback de `answer-use-case.ts`. O log da API registrou duas
recusas definitivas por `mode_citation_mismatch`, cada uma após duas gerações. Isso comprova
incompatibilidade entre modo, citações ou claims; não comprova recusa pela origem sintética
nem permite reconstruir a saída privada original, que não foi usada em fixtures.

## Correção

- A variante local `answer-prompt-v29-local-test-v2` explica que recomendação geral pode
  responder normalmente sem citações documentais e sem uma fala de recusa. Explicita os
  contratos grounded/conflict/abstained, sem trocar rótulos de fatos para escapar da regra.
- `mode_citation_mismatch` recebe instrução específica no reparo único, mantendo fontes e
  orçamento. Sem histórico, somente esse erro cria contexto de contrato com zero turnos.
  Os demais códigos preservam o comportamento anterior sem histórico.
- Duas falhas continuam bloqueando a saída inválida e registrando os códigos. A mensagem
  pública fica em uma frase breve sobre não conseguir concluir, sem os três avisos internos
  do print, sem alegar ausência dos arquivos e sem pedir reenvio. Conflitos permanecem citados.
- Não houve alteração de validador, schema, autorização, isolamento, provedor ou teto de
  duas gerações. A personalidade padrão permanece igual. A instrução local foi apresentada
  na conversa antes de aplicada.

## Regressões

Antes da implementação, quatro verificações novas falharam. Um cenário adicional tinha
claim documental sem citação exibida, que corretamente dispara outro código antes da
checagem de modo; ele foi retirado desta parametrização específica, sem alterar sua regra
ou os testes existentes de claims. A auditoria também possui uma decisão local skipped,
além das duas invocações failed; a asserção final exige exatamente esses três registros e
somente duas chamadas ao gateway.

A primeira execução geral encontrou dois timeouts de 5 s e uma regressão de escopo:
o contexto vazio havia sido criado para todos os erros. O código foi restringido ao erro
observado para preservar a aceitação existente de outros códigos; o teste anterior não
foi enfraquecido. Os cenários lentos passaram com dois workers e os mesmos limites de 5 s.
A execução canônica seguinte, sem inferência concorrente, passou integralmente.

| Verificação | Resultado |
|---|---|
| Regressões direcionadas iniciais | 176/176, nove arquivos |
| Reparo e controles após restringir o contexto | 71/71, quatro arquivos |
| `pnpm run check` final | Aprovado; 2.128 testes, 189 arquivos; formatação, lint, tipos, visão e segredos aprovados |
| Statements / branches / functions / lines | 91,93% / 88,48% / 96,41% / 93,53% |
| `pnpm run evals` | 20/20, sem falhas P0 |
| `pnpm run evals:documentary` | 50/50 determinísticos; 50 semânticos e revisão especializada permanecem pendentes |
| `pnpm run test:e2e` | 204/204, 30 arquivos |
| `pnpm run build:api` | Aprovado |

Logs em `tmp/mode-citation-*.log`. O avaliador longo continua usando o diagnóstico de
falha terminal para impedir que um fallback não vazio conte como resposta completa; a
troca de redação não altera esse gate.

## Ensaio com geração real

Oito turnos sintéticos no caso de uso real, quatro por modelo. Luna no híbrido high e Sol
6.1 no single low. O contexto autorizado continha somente uma convenção FICTÍCIA preparada
para o ensaio, sem contrato de garantidora e sem informar vencimento. A primeira execução
do script foi bloqueada antes da inferência por não fornecer a revalidação obrigatória;
o harness passou a revalidar seu contexto sintético, sem mudar essa guarda no aplicativo.

| Pergunta | Luna | Sol 6.1 |
|---|---|---|
| Já possui garantidora contratada? | Não; grounded, com fonte original | Não; grounded, com fonte original |
| Quero uma recomendação sua de garantidora | Recomendação direta, sem citação forçada | Recomendação direta, sem citação forçada |
| um da sua recomendação | Retoma a recomendação normalmente | Retoma a recomendação normalmente |
| Dia de vencimento ausente no trecho | Não inventa data; pede trecho pertinente | Não inventa data; pede trecho pertinente |

As oito respostas passaram na primeira geração, sem falha de validação ou aviso rotineiro
de simulação. Respostas e metadados somente sintéticos foram preservados em
`tmp/mode-citation-smoke.json`. O ensaio não garante o resultado de todas as futuras gerações,
nem altera os limites de uma lacuna documental real.

## Revisão e ativação

Diff da tarefa revisado contra cópias anteriores, preservando o trabalho concorrente.
Sem achado P0/P1 na fatia. Sem merge ou deploy de produção. A API foi recompilada e o
processo Node verificado na porta 3000 foi reiniciado em janela oculta, com os mesmos
arquivos de ambiente, conforme autorização de reinício e limpeza da simulação nesta
conversa. A opção local continua habilitada; nenhum arquivo original privado foi excluído.
Verificação após o reinício em 04/11/2026 às 10:15, horário de São Paulo: `/health` retornou
200 e `/v1/runtime` confirmou Codex e histórico volátil. O log de erros da nova execução
estava vazio.
