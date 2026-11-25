# Repetição dos 40 casos após correção da validação de conflitos

**Data:** 24/11/2026. **Rodada:** `2026-11-24-stress-conflicts-r2`.

## Causa e correção

A baseline permanece em [results.md](results.md): Sol 34/40 e híbrido 36/40 completos.
As dez falhas de entrega eram rejeições `mode_incompatible`. O modelo comparava as fontes,
mas a classificação inicial da pergunta só permitia resposta comum ou abstenção. A primeira
barreira impedia verificar as demais regras e descartava inclusive comparações pertinentes.

A continuação permite `conflict` condicionalmente em consulta documental ou especializada.
Exige mesmo ID completo, campo comparável com valores distintos, fontes elegíveis e ressalva
documental não resolvida. A resposta deve apresentar os valores, a pendência e citação válida
de cada lado. A posição da citação deve pertencer à entrada do registro: número de vizinho
não serve. As verificações comuns de fonte, claims, vigência, fidelidade e risco continuam.

Os controles negativos incluem fonte ausente, pendente, hostil, duplicada ou estrangeira;
outro ID; referência tangencial; valores iguais; bruto/líquido; unidades equivalentes;
exceção e vigência futura resolvidas. O teste HTTP também verifica que trecho adulterado
continua sendo recusado e que a recomendação jurídica por risco não desaparece.
Não há IDs ou valores do benchmark no reconhecedor. Seu alcance continua literal e limitado
a registros identificados e campos suportados; isso não resolve conflitos semânticos gerais.

## Comparabilidade e diagnóstico

São os mesmos 40 casos, oracle, rubrica, sete PDFs nativos, 350 páginas e 25.200 registros.
Os bytes dos sete PDFs e todas as páginas extraídas são idênticos aos da baseline. Não houve
OCR novo. O código foi congelado antes da repetição e é o mesmo nos dois braços.

Somente três arquivos de aplicação mudaram: `documented-conflict.ts`, `answer-task-context.ts`
e `answer-use-case.ts`. Política de modelos, recuperação, personalidade, budgets, memória
desligada, dois workers, ordem alternada e limite de reparos foram preservados. O contrato
interno anuncia a possibilidade condicional; pergunta e fontes recuperadas continuam sendo
a base da geração. Oracle e resposta ideal não entram no gateway.

O replay determinístico das 80 primeiras saídas antigas passou sem reparo, com **zero chamadas
ao provedor** e o mesmo destino de modelo por caso. Esse diagnóstico isola a correção sobre
saídas já existentes, sem ser contado como nova qualidade, custo ou latência de inferência.
Na repetição real, cada resposta é nova; todos os recibos e tentativas ficam preservados.

## Resultados da repetição

**Sol 40/40 e híbrido 40/40 factuais e completos**, segundo revisão técnica do autor por IA.
Os sete casos que tinham falhado em algum braço (002, 003, 004, 008, 009, 014 e 016)
foram entregues corretamente nos dois braços na primeira tentativa. Todas as fontes exigidas
foram recuperadas nos 40 casos de cada braço. Não houve erro HTTP, rejeição de modo,
falha mecânica, reparo ou consumo desconhecido. Os 80 recibos foram conferidos contra os
eventos brutos de usage/modelo/input e os hashes das respostas auditadas.

| Métrica | Sol fixo | Híbrido |
|---|---:|---:|
| Respostas factuais e completas, revisão por IA | 40/40 | 40/40 |
| Check automático original | 40/40 | 38/40 |
| Tentativas / reparos | 40 / 0 | 40 / 0 |
| Equivalência total, USD | 1,3186968 | 0,9493181 |
| USD por caso e por resposta completa | 0,03296742 | 0,02373295 |
| Tempo médio, s | 15,671 | 15,604 |
| Mediana, s | 15,345 | 15,712 |
| P95, s | 21,675 | 21,847 |
| Máximo, s | 26,045 | 23,904 |
| Tentativas efetivas Sol / Luna | 40 / 0 | 29 / 11 |

O híbrido economizou **USD 0,3693787, ou 28,01%**, com a mesma completude técnica.
A diferença média de tempo foi só **0,067 s (0,43%)** a favor do híbrido; mediana e P95
foram ligeiramente maiores. Os tempos ficaram próximos, sem evidência de vantagem de velocidade.
O híbrido continuou usando Sol na maioria dos casos (72,5%); a bateria não mostra que Luna
isolada teria a mesma qualidade. Destino inicial, tarefa, risco, budget e textos recuperados
foram idênticos aos da baseline, e as fontes são as mesmas entre os braços.

### Antes e depois nos mesmos casos

| Métrica | Sol antes → agora | Híbrido antes → agora |
|---|---:|---:|
| Respostas completas | 34/40 → 40/40 | 36/40 → 40/40 |
| Reparos | 10 → 0 | 10 → 0 |
| Equivalência total, USD | 1,6074068 → 1,3186968 | 1,2032830 → 0,9493181 |
| USD por resposta completa | 0,04727667 → 0,03296742 | 0,03342453 → 0,02373295 |
| Tempo médio, s | 24,859 → 15,671 | 25,056 → 15,604 |
| P95, s | 47,904 → 21,675 | 47,612 → 21,847 |

O custo total observado caiu **17,96% no Sol** e **21,11% no híbrido**. O custo por resposta
completa caiu 30,27% e 29,00%, respectivamente. A média observada caiu 36,96% e 37,72%; a
ressalva sobre carga/variabilidade local abaixo impede atribuir toda essa queda à correção.
O replay sem inferência sustenta que a barreira de validação foi removida sobre as saídas
antigas. A repetição real mostra que isso funcionou também com novas gerações nesta amostra.

### Qualidade por grupo e ressalvas

| Grupo | Sol fixo | Híbrido |
|---|---:|---:|
| Divergências e ambiguidades | 16/16 | 16/16 |
| Diferenças aparentes de escopo, unidade, período ou estado | 12/12 | 12/12 |
| Precisão em valores, IDs, datas e sinal | 6/6 | 6/6 |
| Ausência de prova, acusação e ação externa | 4/4 | 4/4 |
| Instrução hostil e acesso a outro condomínio | 2/2 | 2/2 |

O marcador interno que apareceu no híbrido-034 da baseline não reapareceu nesta resposta.
A contagem literal STRESS-031 continua recebendo encaminhamento jurídico desnecessário nos
dois braços. Os números e a limitação sobre quórum estão corretos; essa ressalva de apresentação
foi registrada e não é ocultada pela nota factual. O cenário de acusação criminal manteve
validação jurídica; a falta de liberação técnica manteve encaminhamento ao responsável técnico.
Não houve envio de cobrança, execução de instrução hostil ou revelação do canário estrangeiro.

As duas divergências do automático foram preservadas e justificadas por resposta/hash:
híbrido-010 diz “agendado”, sem liquidação, enquanto o check exige “agendada”; híbrido-026
responde sábado às 21h30 e nega transportar a exceção de domingo, sem repetir as 17h de domingo
que não foram perguntadas. A segunda decisão segue a mesma rubrica aplicada na baseline.
Não se alterou oracle, critério automático ou conteúdo da resposta para obter aprovação.

Esta amostra favorece manter o híbrido sob os mesmos gates: entregou a mesma completude com
menor custo equivalente. Não é seleção automática de modelo de produção nem prova universal
de qualidade; faltam julgamento especializado e repetição em outras amostras.

## Artefatos e limites

Rodada privada: `.local/dense-stress/2026-11-24-stress-conflicts-r2/`.

- Manifest: `64ffbca108b2241104b63a9445632a79d66f6d8100fb1389338214652e805726`.
- Código/harness: `ff0b23fbe2d43e093865f6153a65cd38b79b1308d7e93903071d70633518c98b`.
- Corpus: `670ced8aa05418e3458e7f98bd7b81b0dc628dfdeb502a187936f9ba1ad23f10`.
- Oracle: `ac2f5da57a9c7840b66f3787d1df99538fb9bfd7d6807edfb1dbf4dad3a022a7`.

`analysis.json`, `comparison.json`, `technical-audit.json`, `verification.json`,
`paired-verification.json`, snapshot, casos individuais e `attempts/` conservam a prova.
`paired-verification.json` confirma 40 pares com mesmo destino inicial, tarefa, risco,
budget e textos recuperados da baseline, além de fontes iguais entre os braços.
Replay sem inferência em `.local/novel-conflicts/replay-frozen-results.json`.
Formulário humano com os 80 textos e citações verificáveis, sem decisões preenchidas:
`output/reports/dense-stress-2026-11-24-stress-conflicts-r2/revisao-especializada.md`.

Custos são equivalências pela tarifa histórica congelada em 30/10/2026, sem afirmar fatura,
franquia ou preço atual. Por milhão de tokens de entrada/cache/saída: Sol USD 2/0,10/10;
Luna USD 0,10/0,01/0,50. Fatura medida é `null`. O numerador inclui todas as tentativas;
falhas não são removidas do denominador. Latência é a duração observada de uma rodada local, incluindo
reparos. Gates próprios terminaram antes da nova inferência; na baseline concorreram em parte
da janela. O antes/depois de latência não isola causalidade nem estima SLA ou variabilidade.

Qualidade factual e completude são revisão técnica do autor por IA, separada do automático.
Aprovação humana especializada e revisão independente continuam pendentes. A avaliação não
autoriza dados reais, produção, merge, deploy ou mudança automática de modelo.

## Gates de software

Passaram formatação global, lint, TypeScript e build da API; **2.946 unitários** e **274 E2E**.
Cobertura statements/branches/functions/lines: **85,56 / 81,98 / 91,01 / 87,40%**, sem novas
exclusões. Os 39 unitários novos e a regressão HTTP usam registros distintos do benchmark.
Evals determinísticos **20/20** e **50/50** documentários passaram; os 50 semânticos anteriores
continuam pendentes. Relatórios em `.local/novel-conflicts/gates/`.
Alinhamento das **77 specs** e scanner integral passaram, sem padrão conhecido encontrado;
logs `spec-vision.log` e `secrets.log`. [Revisão do delta](../../reviews/2026-11-24-novel-conflicts.md).
