# Recuperação das conversas e comparação de modelos

**Data:** 28/10/2026. **Avaliação:** auditoria técnica por IA pelo autor; sem aprovação profissional ou independente.

**Recomendação:** manter Luna low como base e corrigir recuperação, síntese e validação antes de aumentar o gasto com modelos. A qualidade melhorou modestamente na amostra completa, mas as conversas de 20 e 30 turnos regrediram. O trabalho não eliminou as falhas nem libera produção.

As três etapas foram concluídas: diagnóstico dos 20 pontos problemáticos, correções com 32 regressões novas e bateria Luna completa, seguida da matriz de 120 pontos. As mudanças são no código e nos testes; não houve treinamento ou aprendizado automático do modelo.

## Bateria completa: Luna com memória

Executados os mesmos 280 cenários e 1.010 turnos: 240 curtos/260 turnos e 40 longos/750 turnos. R3 é a referência anterior; R4 usa as correções desta tarefa. Ambas usam somente Luna, esforço low, memória ligada, uma rodada e concorrência dois. Corpus, casos, oráculos e prompt v26 foram preservados.

| Indicador                                  |    R3 anterior |   R4 corrigida |
| ------------------------------------------ | -------------: | -------------: |
| Cenários / turnos                          |    280 / 1.010 |    280 / 1.010 |
| Satisfatórias na amostra comparável        | 59/79 (74,68%) | 62/79 (78,48%) |
| Parciais / falhas / operacionais auditadas |     13 / 7 / 0 |     16 / 1 / 0 |
| Finais longos satisfatórios                |          23/40 |          25/40 |
| Créditos equivalentes observados           |      21,938936 |      21,241190 |
| API USD hipotético                         |       0,877557 |       0,849648 |
| Tentativas de geração                      |           1165 |           1143 |
| Tentativas sem usage                       |              0 |              0 |
| Latência mediana / p95 por turno           | 5,67s / 13,50s | 5,57s / 12,67s |
| Respostas modo failed / erros mecânicos    |          0 / 0 |          0 / 0 |

A variação foi de 3,80 pontos percentuais na amostra intencional e -3,18% no custo equivalente observado. Isso não é acurácia global nem demonstra efeito causal isolado: houve mudança de código e uma única rodada. Foram auditados 80 pontos fixos; um oráculo ambíguo permanece excluído nas duas rodadas (79 comparáveis).

Dos 20 pontos originalmente parciais ou falhos, dez passaram a satisfatórios e dez continuam parciais. As sete falhas anteriores passaram a cinco satisfatórias e duas parciais. Em contrapartida, sete pontos antes satisfatórios regrediram: seis para parcial e um para falha. No total comparável, 12 melhoraram, sete regrediram e 60 mantiveram a classificação.

| Tamanho da conversa | Finais satisfatórios R3 | Finais satisfatórios R4 |
| ------------------- | ----------------------: | ----------------------: |
| 10 turnos           |                    8/10 |                    8/10 |
| 15 turnos           |                    5/10 |                    9/10 |
| 20 turnos           |                    4/10 |                    3/10 |
| 30 turnos           |                    6/10 |                    5/10 |

## Correções e regressões

As mudanças tratam seleção de entidade e mês corrigidos, pedidos de síntese, versão final de rascunho versus versão documental, aviso de sinistro versus aviso contratual, valor relatado sem comprovação, modo/citações estruturados e páginas relevantes de atas. A memória continua limitada às oito interações recentes/12.000 bytes, sem acesso global; até oito fontes e duas gerações por pedido. Nenhum tipo de claim, fato ou valor é convertido para fazer a validação passar.

| Caso / turno          | R3 → R4 | Limitação observada na R4                                                          |
| --------------------- | ------- | ---------------------------------------------------------------------------------- |
| CONV-long-01 / 10     | P → P   | Não explicita o resultado mensal de R$ 2 mil.                                      |
| CONV-long-04 / 10     | S → P   | Fallback omite índice de reajuste, aviso de 30 dias e condições da multa.          |
| CONV-long-18 / 15     | F → P   | Entrega saldo e regra do salão, mas omite as 60 unidades.                          |
| CONV-long-21 / 20     | S → P   | Omite conferir a vinculação da reserva e a disponibilidade ordinária.              |
| CONV-long-22 / 20     | P → P   | Não reúne contas, cota, eleição e reserva condicionada das duas atas.              |
| CONV-long-24 / 20     | S → P   | Fallback omite aviso, multa e decisões humanas de envio e recebimento.             |
| CONV-long-25 / 20     | P → P   | Não prioriza confirmar liberação técnica e registrar a ocorrência antes do uso.    |
| CONV-long-26 / 20     | P → P   | Não distingue rubricas agregadas de pessoal do salário individual.                 |
| CONV-long-27 / 20     | P → P   | Encaminhamento genérico não retoma a proposta de U-A e a negociação privada.       |
| CONV-long-30 / 20     | S → F   | Recusa genérica por cobertura; não entrega os limites de responsabilidade pedidos. |
| CONV-long-31 / 30     | P → P   | Falta conferir a vinculação da reserva e a disponibilidade dos saldos.             |
| CONV-long-32 / 30     | P → P   | Falta transformar titularidade e negociação privada em ações claras.               |
| CONV-long-35 / 30     | S → P   | Omite o conflito de locação de 30/90 dias e a cobertura legal pendente.            |
| CONV-long-38 / 30     | P → P   | Aceite futuro sem conciliação financeira e comprovação das execuções.              |
| CONV-long-40 / 30     | S → P   | Omite renovação do seguro e conferência financeira entre as prioridades.           |
| CONV-contracts-15 / 2 | S → P   | Omite a vigência até 31/12/2026 e os valores na análise de renovação.              |
| CONV-long-26 / 10     | F → P   | Reconhece a modalidade, mas não a explica nem detalha dados necessários.           |

S = satisfatória; P = parcial; F = falha semântica/de tarefa; O = falha operacional; N = oráculo excluído. Um fallback seguro pode preservar fatos sem resolver toda a tarefa. As falhas anteriores foram preservadas; ensaios bem-sucedidos não substituem seus registros. Zero respostas com modo técnico `failed` não significa zero falhas de tarefa: a recusa genérica do CONV-long-30 foi classificada como F.

**Achado adicional de citação:** o alvo excluído CONV-crosscutting-06/2 se abstém de informar a taxa, mas afirma uma regra local de rateio sem exibir citação. A evidência pertence ao condomínio correto; não houve transferência de dado do Bosque. Ainda assim, a afirmação documental qualitativa em abstenção precisa ser bloqueada ou receber modo e referência adequados. A exclusão do oráculo ambíguo não apaga esse achado. [Registro e hash da resposta](../../../reports/conversations-2026-10-28-luna-quality-r4-supplemental-findings.json).

## Comparação dirigida: mesmos 40 pontos por configuração

A matriz contém os 20 pontos problemáticos da R3, 10 paráfrases e 10 controles fixados antes das respostas. Usa os inputs/evidências base da R4, iguais entre configurações, janela de perguntas sem respostas antigas e uma rodada contrabalançada. As tentativas de reparo recebem o código da própria falha. Não reexecuta busca, HTTP, autorização, persistência ou aplicação final dos metadados de risco e não representa 280 conversas por modelo. Seis das sete regressões novas da R4 estão fora desse conjunto pré-fixado; o controle contratual está incluído.

| Configuração |   S / P / F / O | Validadas | Créditos equivalentes | API USD hipotético | Mediana / p95 da geração com reparos |
| ------------ | --------------: | --------: | --------------------: | -----------------: | -----------------------------------: |
| luna-low     |  31 / 8 / 1 / 0 |     39/40 |              0,951208 |           0,038048 |                       6,66s / 12,94s |
| luna-high    | 26 / 12 / 2 / 0 |     38/40 |              1,524760 |           0,060990 |                      10,65s / 22,19s |
| sol-low      |  30 / 9 / 1 / 0 |     39/40 |             31,221920 |           1,248877 |                      13,02s / 24,95s |

| Grupo      | Luna low: S | Luna high: S | Sol low: S |
| ---------- | ----------: | -----------: | ---------: |
| affected   |       12/20 |         9/20 |      13/20 |
| paraphrase |        9/10 |         8/10 |       8/10 |
| control    |       10/10 |         9/10 |       9/10 |

A configuração do aplicativo não foi trocada pela matriz. O Sol custou **32,82 vezes** o Luna low; o Luna high custou **60,30% a mais**. São relações observadas nesse ensaio, influenciadas também pelo cache: 56,56% dos tokens de entrada foram reutilizados no Luna low, 30,13% no Luna high e 21,42% no Sol. Não são multiplicadores universais de custo.

Na comparação por ponto, o Sol melhorou três resultados, piorou três e manteve 34 frente ao Luna low. Dois ganhos chegaram a S: síntese das duas assembleias e evidências de aceite integral. Uma diferença de uma resposta satisfatória em 40 pontos não demonstra superioridade geral de um modelo. O Luna high melhorou dois pontos e piorou seis. [Pares, cache e critérios de avaliação](../../../reports/conversations-2026-10-28-recovery-matrix-m1-analysis.json).

## O que corrigir antes de outra bateria

1. **Validação:** tratar o significado das claims, das condições e das fontes, evitando exigir palavras isoladas. Também fechar a afirmação qualitativa local sem citação. A regra que impede inventar valores, confirmar minutas ou misturar condomínios continua necessária.
2. **Síntese e recuperação:** decompor o pedido em itens materiais e recuperar as páginas de cada assunto. Separar salário individual de rubricas agregadas, proposta de pagamento, aceite documental de comprovação das execuções, e segurança de contratação. Ações e fatos continuam limitados à janela e às evidências autorizadas.
3. **Modelo e gasto:** manter Luna low; não adotar high como padrão com esses resultados. Reservar eventual Sol para as sínteses em que trouxe ganho verificável, com decisão de roteamento e orçamento próprios. Primeiro corrigir os erros compartilhados, depois validar o roteamento em uma rodada independente que inclua as regressões novas.

Pedidos explícitos de resultado mensal, decisões das duas assembleias e liberação antes de retomar uso produziram respostas mais completas nas três configurações. Isso orienta a decomposição do pedido; não autoriza injetar gabaritos ou reescrever os casos originais. A proposta de U-A ausente nas fontes de um alvo limita todos os modelos.

### Diagnóstico das quatro respostas bloqueadas na matriz

O replay offline reproduziu todos os códigos, sem chamadas adicionais. No caso do Sol, apenas acrescentar o rótulo correto “Na AGE” ao corpo fez o mesmo conteúdo passar: a resposta citava a ata, mas o guard exigia uma palavra referente à assembleia no texto. É uma contraprova de falso positivo lexical, não uma resposta entregue.

| Configuração / ponto                | Causa observada                                                                                                                                                               |
| ----------------------------------- | ----------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| Sol low / conclusão da contratação  | Síntese documental correta bloqueada por requisito lexical de assembleia.                                                                                                     |
| Luna low / fatos do Alameda         | Menção não comprovada a R$ 75 e condição de aprovação ainda bloqueadas por variantes linguísticas; o texto também tinha omissões de completude.                               |
| Luna high / conflitos de regras     | Primeira tentativa usou classe factual para minuta, contrariando o contrato; segunda trouxe diferença de R$ 50 condicionada à aprovação e foi bloqueada pelo guard monetário. |
| Luna high / pedido de alterar saldo | Distinção entre R$ 10 mil documentados e R$ 15 mil informados pelo usuário foi bloqueada por variantes de recusa/qualificação.                                                |

As quatro notas F foram mantidas, pois não houve resposta validada. Não houve correção de produção após o snapshot nem substituição retroativa das falhas. [Diagnóstico com hashes e contraprova](../../../reports/conversations-2026-10-28-recovery-matrix-m1-block-diagnosis.json). A recusa genérica nova do CONV-long-30 ainda exige diagnóstico dirigido com captura sintética; seu texto rejeitado não foi registrado na bateria completa.

## Custo desta tarefa

| Experimento                     | Pontos/turnos | Tentativas | Créditos conhecidos | Usage ausente |
| ------------------------------- | ------------: | ---------: | ------------------: | ------------: |
| 2026-10-28-diagnosis-s0         |            20 |         20 |        desconhecido |            20 |
| 2026-10-28-diagnosis-s1         |            20 |         27 |            0,591442 |             0 |
| 2026-10-28-recovery-targeted-s2 |            40 |         47 |            0,999286 |             0 |
| 2026-10-28-recovery-matrix-m1   |           120 |        133 |           33,697888 |             0 |
| 2026-10-28-luna-quality-r4      |          1010 |       1143 |           21,241190 |             0 |

Subtotal observável: **56,529805 créditos equivalentes**, mais 20 tentativas sem usage. API USD hipotético: 2,261192. A primeira tentativa de diagnóstico falhou por permissão local antes de obter respostas; não é custo zero. Não houve API paga: os experimentos usaram o CLI do plano pessoal. Créditos equivalentes não são fatura nem medição de franquia. O custo de desenvolvimento deste chat não é atribuível por experimento.

O diagnóstico S1 teve 20 pontos/27 tentativas. O ensaio S2 teve 40 pontos/47 tentativas, 38 saídas validadas e auditoria 26 S/11 P/3 F; gerou novas correções. Duas recusas do S2 foram revalidadas offline após a correção, sem chamadas, sem substituir suas notas. Custos da R3 e tarefas anteriores não entram neste subtotal.

## Verificação e limites

1.432 testes/155 arquivos passaram, incluindo 32 regressões novas e e2e. Cobertura: statements 92,04%, branches 87,72%, funções 96,87%, linhas 93,72%. Tipagem, lint, formato, gate de visão de 54 specs, 20 evals legados e 50 documentais determinísticos passaram. Scanner e revisão final são registrados na revisão do autor.

Fonte R4/matriz: `03bee28deb25b9c679c790ee2ec483306462def228aa3d3568d8d7161088589b`. Dataset: `4e721a0c6f408791f0aca1d3ac45d0d82ed890549d8b5dd4fb2ffbeef21a193b`. Corpus: `96ca9a845c28b1e3bfabd42033bd852d92a1de85b65626c07bee7d257fc86e39`. O verificador associa cada auditoria ao hash da resposta, confere modelos, limites de memória/fontes, isolamento e ausência de oráculos no gateway. Preservado prompt-catalog v26 com SHA256 `77b97eeff2c5faa9df82d62c889e59d5f07960df4af156c366b41e2e56a53d0e`.

A auditoria foi feita por IA pelo autor, em fixtures sintéticas, com uma rodada por configuração. Não é revisão independente, validação jurídica/trabalhista/contábil ou aprovação de produção. Os domínios de maior risco continuam exigindo validação humana. Resultados legais representam o corpus verificado da suíte, não garantia de atualização universal.

Preços normalizados pela mesma tabela do protocolo de 27/10/2026 para comparar rodadas; fontes: [Codex pricing](https://learn.chatgpt.com/docs/pricing) e [API pricing](https://developers.openai.com/api/docs/pricing). Cache, comprimento de saída e reparos influenciam a comparação observada.

Artefatos completos: [métricas R4](../../../reports/conversations-2026-10-28-luna-quality-r4-metrics.json), [auditoria R4](../../../reports/conversations-2026-10-28-luna-quality-r4-technical-audit.json), [verificação R4](../../../reports/conversations-2026-10-28-luna-quality-r4-verification.json), [matriz auditada](../../../reports/conversations-2026-10-28-recovery-matrix-m1-technical-audit.json) e [custos](../../../reports/conversations-recovery-054-task-costs.json).

## Todos os pontos da matriz

| Caso / turno / variação             | Luna low | Luna high | Sol low |
| ----------------------------------- | -------- | --------- | ------- |
| CONV-long-01 / 10 / affected        | S        | P         | S       |
| CONV-long-07 / 10 / affected        | S        | S         | S       |
| CONV-long-13 / 15 / affected        | S        | S         | F       |
| CONV-long-15 / 15 / affected        | S        | S         | S       |
| CONV-long-16 / 15 / affected        | P        | S         | P       |
| CONV-long-18 / 15 / affected        | F        | P         | P       |
| CONV-long-19 / 15 / affected        | S        | S         | S       |
| CONV-long-22 / 20 / affected        | P        | P         | S       |
| CONV-long-23 / 20 / affected        | S        | F         | S       |
| CONV-long-25 / 20 / affected        | P        | P         | P       |
| CONV-long-26 / 20 / affected        | P        | P         | P       |
| CONV-long-27 / 20 / affected        | P        | P         | P       |
| CONV-long-28 / 20 / affected        | S        | S         | S       |
| CONV-long-31 / 30 / affected        | S        | P         | S       |
| CONV-long-32 / 30 / affected        | P        | P         | P       |
| CONV-long-33 / 30 / affected        | S        | S         | S       |
| CONV-long-38 / 30 / affected        | P        | P         | S       |
| CONV-crosscutting-26 / 2 / affected | S        | F         | S       |
| CONV-long-18 / 5 / affected         | S        | S         | S       |
| CONV-long-26 / 10 / affected        | S        | S         | S       |
| CONV-long-01 / 10 / paraphrase      | S        | S         | S       |
| CONV-long-07 / 10 / paraphrase      | S        | S         | S       |
| CONV-long-13 / 15 / paraphrase      | S        | S         | S       |
| CONV-long-15 / 15 / paraphrase      | S        | S         | S       |
| CONV-long-16 / 15 / paraphrase      | S        | P         | P       |
| CONV-long-18 / 15 / paraphrase      | P        | P         | P       |
| CONV-long-19 / 15 / paraphrase      | S        | S         | S       |
| CONV-long-22 / 20 / paraphrase      | S        | S         | S       |
| CONV-long-23 / 20 / paraphrase      | S        | S         | S       |
| CONV-long-25 / 20 / paraphrase      | S        | S         | S       |
| CONV-financial-15 / 2 / control     | S        | S         | S       |
| CONV-emergency-15 / 2 / control     | S        | S         | S       |
| CONV-duties-15 / 2 / control        | S        | S         | S       |
| CONV-conventions-15 / 2 / control   | S        | S         | S       |
| CONV-contracts-15 / 2 / control     | S        | P         | P       |
| CONV-crosscutting-24 / 2 / control  | S        | S         | S       |
| CONV-crosscutting-25 / 2 / control  | S        | S         | S       |
| CONV-long-07 / 6 / control          | S        | S         | S       |
| CONV-long-19 / 4 / control          | S        | S         | S       |
| CONV-long-31 / 21 / control         | S        | S         | S       |
