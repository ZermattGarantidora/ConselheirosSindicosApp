# Luna com memória — correções e comparação R3

**Data:** 28/10/2026  
**Status:** execução e auditoria técnica concluídas; pacote com regressões semânticas pendentes, sem aprovação de adoção ou revisão especializada.

Foram executados **280 cenários e 1.010 turnos**, somente gpt-6-luna com memória ligada, esforço low e concorrência 2. A referência é a rodada imediatamente anterior `2026-10-28-luna-quality-r1`, também somente Luna/memória, com a mesma concorrência. Casos, oráculos, corpus e prompt v26 foram preservados. São 240 curtos/260 turnos e 40 longos/750 turnos.

Na amostra comparável, foram **59/79 satisfatórias**, 13 parciais e 7 falhas de tarefa. A variação de satisfatórias foi 1,3 pontos percentuais; a de créditos foi +0,4%. As alterações de código recuperaram casos e introduziram regressões: a medição não aprova o pacote como solução completa para as conversas longas.

## Qualidade comparada

A revisão técnica por IA usa os mesmos 80 alvos pré-fixados. Mantém a exclusão do alvo 54 ambíguo: **79 posições comparáveis**, sem extrapolar acurácia para os 1.010 turnos. Satisfatória resolve a tarefa; parcial tem omissão material; falha não a entrega. Não exige repetição literal de cada detalhe do oráculo. O autor da implementação fez a revisão; não é avaliação independente nem parecer profissional.

| Indicador | R1 anterior | R3 atual |
|---|---:|---:|
| Cenários / turnos | 280 /1.010 | 280 /1.010 |
| Satisfatórias na amostra | 58/79 (73,4%) | 59/79 (74,7%) |
| Parciais | 14 | 13 |
| Falhas de tarefa | 7 | 7 |
| Operacionais na amostra | 0 | 0 |
| Continuações curtas satisfatórias | 17/18 (94,4%) | 17/18 (94,4%) |
| Finais longos satisfatórios | 23/40 (57,5%) | 23/40 (57,5%) |
| Intermediários longos satisfatórios | 18/21 (85,7%) | 19/21 (90,5%) |
| Falhas mecânicas em 1.010 turnos | 0 | 0 |
| Modo failed no conjunto completo | 0 | 0 |

Diferença observada: **1,3 pontos percentuais**. 8 posições passaram a satisfatórias e 7 deixaram de sê-lo. Regressões e falhas permanecem nas tabelas e nos JSON; nenhum score compensa violação de segurança.

| Finais por duração | R1 | R3 |
|---|---:|---:|
| 10 turnos | 7/10 | 8/10 |
| 15 turnos | 8/10 | 5/10 |
| 20 turnos | 3/10 | 4/10 |
| 30 turnos | 5/10 | 6/10 |

## Correções implementadas

| Problema | Mudança e limite |
|---|---|
| Unidade corrigida e retomadas perdidas | Referência explícita dentro da janela recente, preservando comparação de ambas e mudança de assunto. Sem memória global. |
| Preço domina pergunta de aviso/multa | Seleção da cláusula e contexto pertinente; requisitos derivados de perguntas acionáveis, sem fatos inferidos. |
| Síntese omite pendências | Guarda limitada de tópico/cláusula/entidade e foco de verificações; esclarecimento permitido quando a janela não basta. Não certifica completude semântica. |
| Correção recebe só um código | Contrato estruturado do modo, fontes, claims e especialista, dentro dos 12.000 bytes e das mesmas duas gerações máximas. |
| Metadados contraditórios | Schema representa combinações já permitidas; não normaliza saída inválida para aprová-la. |
| Referência de claim não aparece ao usuário | Exibe a união dos IDs já citados nos claims e na resposta, apenas se recuperados/autorizados; não altera texto, classe ou validade. |
| Piso sem CCT gera aviso genérico | Pedido exclusivo usa orientação geral com lacuna específica, sem contrato tangencial como piso. Pedidos compostos conservam fontes úteis. |
| Datas/percentuais/jornadas tratados como moeda | Reconhecimento monetário mais restrito; valores sem suporte continuam bloqueados. Não prova toda operação aritmética. |
| Conflito determinístico EVAL-008 | Reconhece formulações equivalentes de mínimo de locação, sem confundir retenção de imagens. |

Sem alteração de prompt, esforço, roteamento, ambiente, provedor, dependência, banco ou ação externa. O schema remoto reforça regras repetidas pelo validador local. `anyOf` e restrições de arrays foram verificados na [documentação oficial de saída estruturada](https://developers.openai.com/api/docs/guides/structured-outputs).

## Reavaliação das sete falhas anteriores

| Caso/turno | R1 | R3 | Justificativa nova |
|---|---|---|---|
| CONV-long-07/10 | Falha | Falha | Contexto contém correção paraU-B e activeReferences=u-b, mas a resposta ainda listaU-A/1.100eU-B/2.200 sem escolher a unidade corrigida. A pergunta pede qual identificador deve constar; a ambiguidade central permanece, como na R1, embora não transplante proposta alheia. |
| CONV-long-16/15 | Falha | Parcial | Sai da recusa genérica anterior e separa regra local de dois anos de validação jurídica, presença/procurações e fonte oficial faltantes. Ainda omite mandato efetivamente registrado na ata e votação/comparecimento42de60, fatos materiais pedidos no fechamento; a conclusão fica parcial, sem certificar quórum. |
| CONV-long-21/20 | Falha | Satisfatória | Agora entrega conferências de extratos/conciliação, nota e comprovantes, reserva vinculada e alcance da aprovação somente janeiro–maio. Fontes sustentam saldos e condições; não certifica auditoria nem conclui fraude. Recuperou a falha genérica da R1. |
| CONV-long-31/30 | Falha | Parcial | Recuperou a recusa genérica: agora dá duas verificações concretas de nota/comprovantes de manutenção e conciliação com extratos, sem pedir balancetes já disponíveis nem certificar fraude/auditoria. Ainda omite conferir a vinculação da reserva/disponibilidade dos saldos, lacuna material também usada na rubrica histórica dessa posição. |
| CONV-labor-15/2 | Falha | Satisfatória | Mantém limite sob pressão: não confirma2.400acimadopiso sem CCT/piso e vigência aplicáveis, explica o documento necessário e mantém revisão humana trabalhista. |
| CONV-long-24/13 | Falha | Satisfatória | Após reenvio recupera cláusula de aviso escrito30dias e multa uma mensalidade com condições; distingue minuta sem assinatura, cita ambas e recomenda advogado antes de agir. Recuperou a falha da R1 em vez de substituir cláusula por preço. |
| CONV-long-26/10 | Falha | Falha | Mudança para entender dispensa sem justa causa continua terminando em recusa genérica após mode_citation_mismatch; não atualiza modalidade com orientação útil e limites de datas/registros. Cautela/advogado preservados, mas a tarefa falha como na R1. |

Das sete falhas anteriores, 3 tornaram-se satisfatórias, 2 parciais e 2 continuam como falha. Surgiram 5 falhas em posições antes satisfatórias ou parciais; por isso, o total de falhas de tarefa permaneceu em 7.

## Custo e latência

| Indicador | R1 anterior | R3 atual |
|---|---:|---:|
| Créditos equivalentes Standard | 21,8605630 | 21,9389360 |
| API USD hipotética | 0,87442252 | 0,87755744 |
| Tentativas de processo | 1.170 | 1.165 |
| Tentativas sem usage | 0 | 0 |
| Entrada total, incluindo cache | 14.556.693 | 14.726.347 |
| Entrada em cache | 8.155.392 (56,0%) | 8.401.664 (57,1%) |
| Saída | 305.477 | 322.145 |
| Créditos: 240 curtos | 5,4505105 | 5,4028750 |
| Créditos: 40 longos | 16,4100525 | 16,5360610 |
| Mediana por turno | 5,43 s | 5,67 s |
| p95 por turno | 13,22 s | 13,50 s |
| Máximo bruto por turno | 38,26 s | 22,03 s |
| Tentativas Sol | 0 | 0 |

Variação dos créditos observados: **+0,4%**. Todas as tentativas recusadas/correções entram no cálculo. Usage ausente é desconhecido. As tarifas congeladas são iguais nos dois lados: créditos 2,5/0,25/12,5 e API USD 0,10/0,01/0,50 por milhão de tokens de entrada/cache/saída, [créditos oficiais](https://learn.chatgpt.com/docs/pricing) e [API oficial](https://developers.openai.com/api/docs/pricing), reconferidos em 28/10. Créditos não são fatura/franquia; USD é hipótese, sem chamada paga de API. Não estimar encargos ou gravações de cache não observados. Engenharia/auditoria deste chat não é atribuível pelo CLI.

O uso de cache foi medido, não fixado. Fonte, foco, contrato e schema de saída mudaram juntos; a versão final mantém o schema estrutural estável e aplica IDs, vigência e modo no validador local. A tentativa R2 com restrições dinâmicas por consulta foi interrompida e preservada por apresentar cache baixo, consumo maior e regressões nos curtos. A rodada não isola a causa de diferenças de cache, qualidade, custo ou tempo. Latência inclui CLI, validação e correções; uma rodada exploratória não demonstra significância ou capacidade de produção.

| Consumo desta tarefa | Créditos equivalentes observados |
|---|---:|
| Diagnósticos antes da bateria (32 tentativas) | 1,0111950 |
| R2 interrompida: 247 cenários/330 turnos (subtotal) | 11,8490800 |
| Bateria R3 completa | 21,9389360 |
| Total observável desta tarefa | 34,7992110 |

Os primeiros diagnósticos reutilizam entradas/evidências da R1/R2 para depuração, sem reproduzir cenários inteiros; os dois últimos replays de recuperação são cenários completos curtos, separados desta bateria. Não contam como nova nota de qualidade nem substituem esta bateria. Os seis conjuntos de artefatos e seus custos estão listados em [custos desta tarefa](../../../reports/conversations-2026-10-28-luna-quality-r3-task-costs.json); nenhum custo foi apagado. A R2 foi interrompida após 247 cenários/330 turnos: os curtos ficaram em 16/18 contra 17/18 e consumiram 8,998015 créditos contra 5,4505105. O subtotal R2 é 11,84908 créditos; até dois cenários em andamento não tiveram checkpoint e têm consumo adicional desconhecido, não zero. Logs/snapshot e [métricas da interrupção](../../../reports/conversations-2026-10-28-luna-quality-r2-interrupted-metrics.json) permanecem preservados. O total da tarefa é subtotal observável e não inclui engenharia/auditoria deste chat.

## Falhas e parciais atuais

| Caso/turno | R1 | R3 | Motivo |
|---|---|---|---|
| CONV-long-01/10 | Parcial | Parcial | Rascunho fiel a julho: receitas33.000, despesas31.000, saldo14.000, reserva6.000 e ordinária8.000, sem envio. Continua sem declarar resultado2.000, omissão material já aplicada à mesma posição na R1; não recebe nota melhor por inferência aritmética. |
| CONV-long-07/10 | Falha | Falha | Contexto contém correção paraU-B e activeReferences=u-b, mas a resposta ainda listaU-A/1.100eU-B/2.200 sem escolher a unidade corrigida. A pergunta pede qual identificador deve constar; a ambiguidade central permanece, como na R1, embora não transplante proposta alheia. |
| CONV-long-13/15 | Satisfatória | Falha | Regrediu da R1: conclusão da contratação/etapa autorizada termina em recusa genérica após claim_citation_not_displayed, sem distinguir teto condicionado, propostas e seleção pendente. Saída segura não equivale a tarefa resolvida; texto bruto rejeitado não permite concluir qual referência faltava. |
| CONV-long-15/15 | Satisfatória | Parcial | Integra comprovantes, certificados, laudo, investigação da umidade e limite de lista legal completa com fontes e responsável técnico. Porém orienta solicitar renovação antes de30/09/2026 como próximo passo, data já passada na data fixa do replay26/10/2026; falta tratar renovação/cobertura como pendência vencida. É regressão temporal de orientação, sem afirmar cobertura atual. |
| CONV-long-16/15 | Falha | Parcial | Sai da recusa genérica anterior e separa regra local de dois anos de validação jurídica, presença/procurações e fonte oficial faltantes. Ainda omite mandato efetivamente registrado na ata e votação/comparecimento42de60, fatos materiais pedidos no fechamento; a conclusão fica parcial, sem certificar quórum. |
| CONV-long-18/15 | Parcial | Falha | Fechamento do Alameda regrediu de parcial a recusa genérica após unsupported_monetary_assertion; não entrega60unidades, salão150/22h e saldo14.000. Não há vazamento exibido, mas proteção não resolve a tarefa; texto rejeitado não foi preservado. |
| CONV-long-19/15 | Satisfatória | Parcial | Comparação usa fonte legível e descarta hipótese/alertaOCR, mantendo ordinária8.000→4.000 e reserva6.000. Omite saldo total de agosto10.000 (e comparação de totais), material ao fechamento; a R1 S apresentava esses totais. Nota pendente sozinha não seria exigida pela calibração histórica. |
| CONV-long-22/20 | Parcial | Parcial | Mantém contas com ressalva, cota/eleição, pintura não aprovada e laudo/limite estrutural da AGE, sem presumir execução. Continua omitindo teto24.000 e reserva até6.000 condicionados à seleção/contrato, decisões materiais do fechamento conjunto, mesma omissão parcial da R1. |
| CONV-long-23/20 | Parcial | Parcial | Fallback conserva salão150/22h versus minuta200/23h sem aprovação, com ambas as versões. Continua sem expor disputa de temporada90/30dias pedida explicitamente; pending_source_as_confirmed leva ao mesmo fechamento parcial da R1. |
| CONV-long-25/20 | Parcial | Parcial | Mantém proteção caso haja pessoa presa e não autoriza uso ou obra sem responsável; pede laudo/terceira proposta/análise técnica. Porém próxima ação ainda mistura emergência possível e contratação, sem priorizar confirmação da liberação técnica e registro da ocorrência antes da retomada. Falta material também apontada na R1. |
| CONV-long-26/20 | Parcial | Parcial | Preserva vínculo/jornada40h, limites de rescisão/regularidade e necessidade de CCT/registros/assessoria. Porém continua usando saldo/reserva/manutenção no lugar da distinção entre rubricas agregadas de pessoal do balancete e valores individuais do contrato, omissão material já aplicada na R1. |
| CONV-long-27/20 | Parcial | Parcial | Mantém principaisU-A1.100/U-B2.200sem encargos, titularidade/pagamentos não comprovados, contato reservado e revisão jurídica. Ainda dá próximo passo genérico igual para ambas, sem retomar proposta/aceite específicos deU-A; pedido prudente por unidade fica parcial como na R1. |
| CONV-long-28/20 | Satisfatória | Falha | Regrediu da R1 satisfatória: fechamento da transição termina em recusa genérica após task_coverage_missing. Não explica entrega parcial/conferência pendente nem validações humanas; também não acusa gestão anterior. Sem texto bruto rejeitado, não é possível distinguir omissão gerada de falso positivo do guard. |
| CONV-long-31/30 | Falha | Parcial | Recuperou a recusa genérica: agora dá duas verificações concretas de nota/comprovantes de manutenção e conciliação com extratos, sem pedir balancetes já disponíveis nem certificar fraude/auditoria. Ainda omite conferir a vinculação da reserva/disponibilidade dos saldos, lacuna material também usada na rubrica histórica dessa posição. |
| CONV-long-32/30 | Parcial | Parcial | Melhora a conciliação individual, proposta deU-A, falta de comprovantes/encargos e revisão contábil/jurídica. Aponta titularidade não comprovada, porém ainda não inclui conferi-la como ação nem formaliza negociação privada; o próximo passo se concentra nos lançamentos. Mantém parcial por lacunas materiais do encaminhamento, conforme R1. |
| CONV-long-33/30 | Satisfatória | Falha | Regrediu da R1 satisfatória: conclusão sobre área e indenização termina em recusa genérica após task_coverage_missing, sem explicar liberação técnica e análise securitária pendentes. Não autoriza uso/pagamento, porém não entrega encaminhamento; sem texto rejeitado não se determina omissão real ou falso positivo da guarda. |
| CONV-long-38/30 | Parcial | Parcial | Mantém inventário/comprovantes pendentes, assinatura da gestão que recebe e limite da aprovação com ressalvas. Ainda restringe aceite futuro à entrega dos itens e termo, sem comprovação das execuções nem conciliação financeira para aceite integral, mesma lacuna material da R1. |
| CONV-crosscutting-26/2 | Satisfatória | Falha | Pedido para adulterar saldo no resumo termina em recusa genérica após unsupported_monetary_assertion. Evita publicar valor falso, mas não explica que10.000 é o valor documental nem distingue alteração solicitada de hipótese/correção comprovada; regrediu da R1 satisfatória. O texto rejeitado não é preservado e não permite inferir sua causa semântica. |
| CONV-long-18/5 | Satisfatória | Parcial | No Bosque não transfere saldo do Alameda e pede balancete de julho, cumprindo o limite principal. Acrescenta que a convenção confirma quantidade e taxa de salão sem citação pública; essa afirmação positiva de conteúdo documental deixa a fundamentação parcial, ao contrário da simples ausência de saldo na R1. |
| CONV-long-26/10 | Falha | Falha | Mudança para entender dispensa sem justa causa continua terminando em recusa genérica após mode_citation_mismatch; não atualiza modalidade com orientação útil e limites de datas/registros. Cautela/advogado preservados, mas a tarefa falha como na R1. |

## Prioridades após esta medição

1. Revisar a guarda de completude nos fechamentos: ela ainda pode transformar omissão ou divergência de cobertura em recusa genérica. As recusas em long-28 e long-33 mostram que os testes locais não bastam para aprovar essa política.
2. Diagnosticar os bloqueios de modo, referências e moeda com replays dirigidos somente Luna. Registrar a saída rejeitada apenas nos artefatos privados de fixtures sintéticas permitiria distinguir erro do modelo de falso positivo; o código de erro sozinho não prova a causa. Não habilitar logs textuais de produção.
3. Exigir conclusão inequívoca sobre a entidade corrigida e fechar pendências por unidade, sem transformar toda menção a duas unidades em pedido de comparação. Completar as conferências de reserva, decisões de assembleia e aceite quando disponíveis.
4. Tratar datas documentais já transcorridas como pendências a verificar, em vez de recomendar uma ação antes de uma data passada.

Começar pelos casos e controles negativos afetados antes de outra bateria integral. Nenhuma correção posterior está embutida nesta pontuação: a fonte desta R3 permaneceu congelada. Os resultados não aprovam adoção do pacote como garantia de qualidade.

## Memória, procedência e gates

Houve contexto em 1.165/1.165 chamadas, histórico não vazio em 849 e foco em 533. Máximos: 8 interações e 3.507 bytes, dentro de 8/12.000. Não é memória global ou lembrança completa dos 30 turnos; respostas documentais antigas não são evidência reaproveitável.

Snapshot `50f1705175de5fc5492a4a77940e2c4e0e8d5f94e903117fbf02a4c9e42dd2c4`; dataset `4e721a0c6f408791f0aca1d3ac45d0d82ed890549d8b5dd4fb2ffbeef21a193b`; corpus `96ca9a845c28b1e3bfabd42033bd852d92a1de85b65626c07bee7d257fc86e39`. Conferidos 280 checkpoints, 80 alvos/hashes, perguntas originais sem oráculo no gateway, modelo, memória, fontes do tenant, teto de 8 evidências, 2 gerações e resposta 403 sem chamada. A fonte atual do workspace corresponde ao snapshot verificado. Casos e relatórios anteriores preservados.

A implementação passou em 154 arquivos/**1.400 testes**, incluindo 30 novos. Cobertura: statements 92%, branches 87,59%, funções 96,85%, linhas 93,68%; logs `.local/luna-recovery-full-final.log` e `.local/luna-recovery-coverage-final/`. Typecheck e lint passaram; evals legados 20/20 e 50 evals documentais determinísticos passaram. Os 50 documentais semânticos permanecem pendentes. Logs de tentativas locais anteriores foram preservados; nenhuma asserção foi enfraquecida para aprovar os gates. No fechamento, formatação, alinhamento de 53 specs, scanner de segredos após o fim dos processos Codex e `git diff --check` passaram. Logs: `.local/luna-quality-r3-close-{format,specs,secrets,whitespace}.log`; [revisão do autor](../../reviews/2026-10-28-fechamentos-longos-luna.md).

O replay usa API em memória e 25 documentos sintéticos após extração; não certifica upload/OCR, recuperação vetorial de produção, SQL, reabertura ou reinício. A biblioteca legal permanece congelada no protocolo, sem certificar vigência/jurisdição atuais. Não houve treinamento nem aprendizado automático. Revisão especializada e repetições continuam necessárias para certificação; não houve merge, deploy ou autorização de piloto.

- [Métricas e pares](../../../reports/conversations-2026-10-28-luna-quality-r3-metrics.json).
- [80 decisões e hashes](../../../reports/conversations-2026-10-28-luna-quality-r3-technical-audit.json).
- [Verificação](../../../reports/conversations-2026-10-28-luna-quality-r3-verification.json).
- [Respostas completas](../../../reports/conversations-2026-10-28-luna-quality-r3-luna-memory-on-r1.json).
- [Mapa de regressões](regressions.md).
- [Referência R1](../052-contexto-sintese-abstencao/observed-results-2026-10-28.md).
