# Resultado da bateria Sol 6.1 e Sol 5.6 — 29/10/2026

## Resultado principal

Foram executados **280 cenários e 1.010 turnos por modelo**, totalizando **560 cenários e 2.020 turnos**. A comparação usa esforço low, memória ligada e a aplicação congelada da Luna R3, que originou os 74,7% citados pelo usuário. A qualidade abaixo corresponde à mesma amostra intencional de **79 posições comparáveis**, auditada tecnicamente por IA pelo autor; não é acurácia global dos 1.010 turnos ou revisão profissional independente. A revisão não foi cega.

| Modelo | Satisfatórias na amostra | Parciais | Falhas | Créditos equivalentes conhecidos | Tentativas sem usage |
|---|---:|---:|---:|---:|---:|
| Luna R3 | 59/79 (74,7%) | 13 | 7 | 21,938936 | 0 |
| Sol 6.1 | 68/79 (86,1%) | 10 | 1 | 465,543300 | 2 |
| Sol 5.6 | 57/79 (72,2%) | 15 | 7 | 914,485120 | 0 |

- **Sol 6.1:** 13 posições passaram a satisfatórias e 4 deixaram de ser satisfatórias; 0 novas falhas. Diferença de 11,4 pontos percentuais frente ao Luna. Subtotal conhecido de consumo 21,22 vezes o da referência, com consumo adicional desconhecido.
- **Sol 5.6:** 7 posições passaram a satisfatórias e 9 deixaram de ser satisfatórias; 5 novas falhas. Diferença de -2,5 pontos percentuais frente ao Luna. Subtotal conhecido de consumo 41,68 vezes o da referência.

As posições mudam tanto por qualidade do texto quanto por reparos, rejeições e disponibilidade do gateway. Esta é uma avaliação do **modelo integrado à Alvitra**. Uma saída rejeitada continua falha de atendimento; não foi substituída por uma nova rodada favorável. Nenhuma configuração do aplicativo foi alterada ou aprovada para adoção. As perguntas e o estado inicial são os mesmos, mas cada modelo produz seu próprio histórico; o input de uma posição posterior pode diferir por causa das respostas anteriores.

## Recortes da mesma amostra

| Modelo | Curtos | Finais longos | Intermediários | Finais 10 turnos | 15 turnos | 20 turnos | 30 turnos |
|---|---:|---:|---:|---:|---:|---:|---:|
| Luna R3 | 17/18 | 23/40 | 19/21 | 8/10 | 5/10 | 4/10 | 6/10 |
| Sol 6.1 | 17/18 | 30/40 | 21/21 | 9/10 | 7/10 | 6/10 | 8/10 |
| Sol 5.6 | 17/18 | 20/40 | 20/21 | 7/10 | 6/10 | 2/10 | 5/10 |

S significa satisfatória; P, parcial; F, falha de atendimento/qualidade; N, oráculo ambíguo excluído. A posição `CONV-crosscutting-06/2`, “qual é a taxa daqui?”, continua excluída uniformemente como na R3. Não foi reescrito o oráculo nem alterado o denominador.

## O que os casos mostram

- Ambos selecionaram U-B e seu principal de R$ 2.200 no fechamento corrigido, distinguiram teto de modernização de contratação concluída e ofereceram orientação sobre dispensa sem justa causa; esses eram pontos falhos da R3.
- O fechamento dos fatos do Alameda continuou em recusa genérica nos dois modelos, após rejeições por cobertura/asserção monetária. Sem a geração bruta rejeitada, o código controlado não demonstra se houve erro semântico do modelo ou falso positivo de validação.
- O fechamento da pauta omitiu três tópicos nos dois modelos; Sol 6.1 explicou que eles não constavam da janela recebida. A nota parcial mede a completude da conversa, sem exigir lembrança inventada da última geração.
- Permaneceram omissões sobre mandato/votação, proposta de acordo de U-A, distinção entre rubricas agregadas e contrato individual e confirmação da liberação técnica após ocorrência no elevador.
- Sol 5.6 apresentou rejeições do gateway com código `codex_tool_disallowed`. O código não identifica por si só qual item foi emitido; não é diagnóstico de uma ferramenta externa específica. As falhas entregues e seus custos foram mantidos.
- A revisão encontrou no Sol 5.6 uma afirmação de data do resumo de seguro sem citação pública (`CONV-duties-15/2`), classificada como parcial. A aprovação mecânica não certifica grounding semântico.

Cada posição tem motivo e hash no [registro completo da auditoria](../../../reports/conversations-2026-10-29-sol-61-56-r1-technical-audit.json). A tabela ao final permite verificar ganhos e regressões sem selecionar apenas exemplos favoráveis.

## Consumo, latência e falhas operacionais

| Modelo | Tentativas | Tokens de entrada | Entrada em cache | Tokens de saída | Latência mediana / p95 (s) |
|---|---:|---:|---:|---:|---:|
| Luna R3 | 1165 | 14.726.347 | 8.401.664 | 322.145 | 5,67 / 13,50 |
| Sol 6.1 | 1108 | 16.147.322 | 8.948.480 | 332.920 | 9,80 / 23,90 |
| Sol 5.6 | 1092 | 16.884.718 | 11.085.952 | 447.498 | 8,22 / 18,86 |

| Modelo | Respostas com modo failed | Falhas mecânicas | Códigos de erro de transporte/gateway |
|---|---:|---:|---|
| Sol 6.1 | 2 | 0 | codex_process_failed: 2 |
| Sol 5.6 | 31 | 0 | codex_tool_disallowed: 31 |

“Modo failed” não inclui todas as falhas semânticas: recusas genéricas podem ter modo abstained, e um fallback de conflito pode continuar parcial. Tokens e cache incluem tentativas concluídas que foram rejeitadas pelo parser/validação. Tentativas sem usage têm consumo desconhecido, não zero.

Tarifas Standard por milhão, conferidas em 29/10/2026: Sol 6.1 50/2,5/250 créditos de entrada/cache/saída; Sol 5.6 100/10/500; Luna 2,5/0,25/12,5. [Tabela oficial de créditos](https://learn.chatgpt.com/docs/pricing). Os preços hipotéticos de API Sol 5.6 são USD 4/0,40/20 por milhão, conforme [página oficial](https://developers.openai.com/api/docs/models/gpt-5.6-sol). Não houve fallback para API paga. Equivalentes não medem fatura nem franquia; `billedCost` permanece nulo.

## Custos separados desta tarefa

| Experimento | Turnos | Tentativas | Créditos conhecidos | Usage ausente |
|---|---:|---:|---:|---:|
| 2026-10-29-sol-61-56-smoke | 4 | 4 | 0,000000 | 4 |
| 2026-10-29-sol-61-56-smoke-access | 4 | 4 | 5,382400 | 0 |
| 2026-10-29-sol-61-56-r1 | 2020 | 2200 | 1.380,028420 | 2 |

Subtotal observável da tarefa: **1.385,410820 créditos equivalentes**, mais **6 tentativas sem usage**. Engenharia/auditoria deste chat não são atribuíveis por experimento. O smoke inicial falhou por acesso local e foi preservado; sua repetição com acesso autorizado consumiu 5,382400 créditos e não substitui as falhas históricas. Os smokes não entram na nota da bateria.

## Protocolo e integridade

Uma rodada por condição, concorrência dois, ordem de despacho alternada por cenário, estado novo por cenário/condição. Memória R3 de oito interações/12.000 bytes e até oito fontes; validação e autorização preservadas. [Plano previamente fixado](run-plan-2026-10-29.md).

Fonte histórica: `50f1705175de5fc5492a4a77940e2c4e0e8d5f94e903117fbf02a4c9e42dd2c4`.
Fonte executada: `19d8a2493331c40f0bce04077922194d4de503a69b0cd41cfb96ee936b57cd0b`.
Os únicos três arquivos diferentes são run.ts, protocol.ts e snapshot.ts do harness; aplicação, corpus, dataset, prompt v26 e alvos são idênticos à R3. As correções posteriores R4 não participaram. O histórico original não foi alterado.

O [verificador](../../../reports/conversations-2026-10-29-sol-61-56-r1-verification.json) conferiu 560 checkpoints, 2020 turnos, 2200 chamadas e 2688 citações, além dos hashes das 160 decisões, dos modelos, dos limites de memória/fontes, da procedência das citações e do isolamento. Não houve oráculo no input do gateway. A referência Luna é histórica: a igualdade da aplicação controla o código, mas data, cache, latência e variação de geração ainda influenciam a comparação. O snapshot local não congela o serviço remoto nem demonstra identidade do runtime do CLI entre datas.

## Gates e limites

O workspace passou em **1.434 testes/155 arquivos**, incluindo dois testes novos do runner. Cobertura: statements 92,04%, branches 87,72%, funções 96,87% e linhas 93,72%. Tipagem, lint, formato, visão de 55 specs, 20 evals legados e 50 documentais determinísticos passaram. A primeira tentativa ampla atingiu timeout no teste de upload; repetição com dois workers, sem mudar timeout/asserções, passou. Logs anteriores preservados. A aplicação histórica não recebeu mudança de produção; sua identidade foi conferida por hashes.

No encerramento, após alterações concorrentes no workspace compartilhado, a suíte atual passou novamente em **1.595 testes/163 arquivos**. Cobertura: statements 92,26%, branches 88,21%, funções 97,05% e linhas 93,92%. Essas alterações foram preservadas e não participaram da aplicação histórica executada. Tipagem, lint, formatação, alinhamento de 57 specs, whitespace e scanner de segredos após a bateria passaram. Os três arquivos do harness no workspace continuam idênticos aos executados.

Os 50 documentais semânticos e a revisão profissional continuam pendentes. Uma rodada e uma amostra intencional não dão significância estatística, acurácia global ou certificação de produção. Três rodadas e revisão especializada permanecem necessárias para seleção definitiva. As falhas novas/remanescentes continuam abertas. Gates finais e revisão do autor são registrados em [revisão local](../../reviews/2026-10-29-comparacao-sol-61-56.md).

Artefatos: [métricas e transições](../../../reports/conversations-2026-10-29-sol-61-56-r1-metrics.json), [auditoria](../../../reports/conversations-2026-10-29-sol-61-56-r1-technical-audit.json), [verificação](../../../reports/conversations-2026-10-29-sol-61-56-r1-verification.json), [custos](../../../reports/conversations-2026-10-29-sol-61-56-r1-task-costs.json), [respostas Sol 6.1](../../../reports/conversations-2026-10-29-sol-61-56-r1-sol61-memory-on-r1.json) e [respostas Sol 5.6](../../../reports/conversations-2026-10-29-sol-61-56-r1-sol56-memory-on-r1.json).

## Todas as posições fixas

| Cenário / turno | Luna R3 | Sol 6.1 | Sol 5.6 |
|---|---|---|---|
| CONV-long-01 / 10 | P | S | P |
| CONV-long-02 / 10 | S | S | F |
| CONV-long-03 / 10 | S | S | S |
| CONV-long-04 / 10 | S | P | P |
| CONV-long-05 / 10 | S | S | S |
| CONV-long-06 / 10 | S | S | S |
| CONV-long-07 / 10 | F | S | S |
| CONV-long-08 / 10 | S | S | S |
| CONV-long-09 / 10 | S | S | S |
| CONV-long-10 / 10 | S | S | S |
| CONV-long-11 / 15 | S | S | S |
| CONV-long-12 / 15 | S | S | S |
| CONV-long-13 / 15 | F | S | S |
| CONV-long-14 / 15 | S | S | S |
| CONV-long-15 / 15 | P | S | P |
| CONV-long-16 / 15 | P | P | P |
| CONV-long-17 / 15 | S | P | S |
| CONV-long-18 / 15 | F | F | F |
| CONV-long-19 / 15 | P | S | F |
| CONV-long-20 / 15 | S | S | S |
| CONV-long-21 / 20 | S | S | P |
| CONV-long-22 / 20 | P | P | F |
| CONV-long-23 / 20 | P | S | P |
| CONV-long-24 / 20 | S | S | P |
| CONV-long-25 / 20 | P | P | P |
| CONV-long-26 / 20 | P | P | P |
| CONV-long-27 / 20 | P | P | P |
| CONV-long-28 / 20 | F | S | S |
| CONV-long-29 / 20 | S | S | S |
| CONV-long-30 / 20 | S | S | F |
| CONV-long-31 / 30 | P | S | S |
| CONV-long-32 / 30 | P | P | P |
| CONV-long-33 / 30 | F | S | F |
| CONV-long-34 / 30 | S | S | S |
| CONV-long-35 / 30 | S | S | S |
| CONV-long-36 / 30 | S | P | P |
| CONV-long-37 / 30 | S | S | S |
| CONV-long-38 / 30 | P | S | P |
| CONV-long-39 / 30 | S | S | S |
| CONV-long-40 / 30 | S | S | P |
| CONV-financial-15 / 2 | S | S | S |
| CONV-labor-15 / 2 | S | S | S |
| CONV-emergency-15 / 2 | S | S | S |
| CONV-duties-15 / 2 | S | S | P |
| CONV-meetings-15 / 2 | S | S | S |
| CONV-conventions-15 / 2 | S | S | S |
| CONV-contracts-15 / 2 | S | P | S |
| CONV-collections-15 / 2 | S | S | S |
| CONV-coexistence-15 / 2 | S | S | S |
| CONV-maintenance-15 / 2 | S | S | S |
| CONV-insurance-15 / 2 | S | S | S |
| CONV-privacy-15 / 2 | S | S | S |
| CONV-handover-15 / 2 | S | S | S |
| CONV-crosscutting-05 / 2 | S | S | S |
| CONV-crosscutting-06 / 2 | N | N | N |
| CONV-crosscutting-24 / 2 | S | S | S |
| CONV-crosscutting-25 / 2 | S | S | S |
| CONV-crosscutting-26 / 2 | F | S | S |
| CONV-crosscutting-30 / 3 | S | S | S |
| CONV-long-01 / 3 | S | S | S |
| CONV-long-01 / 9 | S | S | S |
| CONV-long-05 / 7 | S | S | S |
| CONV-long-06 / 4 | S | S | S |
| CONV-long-07 / 6 | S | S | S |
| CONV-long-09 / 6 | S | S | S |
| CONV-long-09 / 9 | S | S | S |
| CONV-long-18 / 5 | P | S | S |
| CONV-long-18 / 9 | S | S | S |
| CONV-long-19 / 4 | S | S | F |
| CONV-long-19 / 8 | S | S | S |
| CONV-long-21 / 13 | S | S | S |
| CONV-long-22 / 17 | S | S | S |
| CONV-long-24 / 8 | S | S | S |
| CONV-long-24 / 13 | S | S | S |
| CONV-long-25 / 5 | S | S | S |
| CONV-long-26 / 10 | F | S | S |
| CONV-long-29 / 16 | S | S | S |
| CONV-long-31 / 21 | S | S | S |
| CONV-long-36 / 17 | S | S | S |
| CONV-long-39 / 8 | S | S | S |
