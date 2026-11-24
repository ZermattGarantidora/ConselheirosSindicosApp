# Luna com memória — comparação de 28/10/2026

**Status:** bateria e auditoria técnica concluídas; sem aprovação especializada, piloto ou produção.

Foram executados **280 cenários e 1.010 turnos**, somente com **gpt-6-luna**, memória ligada e esforço low. Os 240 casos curtos têm 260 turnos; os 40 longos têm 750 turnos, em conversas de 10 a 30 turnos. A referência é somente o braço Luna/memória de `2026-10-27-hybrid-r2`, não o braço híbrido.

## Qualidade e falhas

Os mesmos 80 alvos pré-fixados foram revisados novamente. Uma posição previamente ambígua continua excluída nos dois lados: **79 posições comparáveis**. São todos os 40 finais longos, 21 intermediários longos e 18 continuações curtas válidas. A classificação considera o objetivo principal e omissões materiais, sem exigir repetição literal de todos os detalhes do gabarito.

| Indicador | Luna anterior | Luna atual |
|---|---:|---:|
| Cenários / turnos executados | 280 / 1.010 | 280 / 1.010 |
| Satisfatórias na amostra | 51/79 (64,6%) | 58/79 (73,4%) |
| Parciais na amostra | 20 | 14 |
| Falhas de tarefa na amostra | 8 | 7 |
| Falhas operacionais na amostra | 0 | 0 |
| Continuações curtas satisfatórias | 15/18 (83,3%) | 17/18 (94,4%) |
| Finais longos satisfatórios | 22/40 (55,0%) | 23/40 (57,5%) |
| Intermediários longos satisfatórios | 14/21 (66,7%) | 18/21 (85,7%) |
| Falhas mecânicas no conjunto completo | 0 | 0 |
| Respostas com modo failed no conjunto completo | 5 (4 operacionais; 1 validação) | 0 (0 operacionais; 0 validação) |

A diferença observada foi de **8,9 pontos percentuais** na amostra. Oito posições passaram a satisfatórias e uma deixou de sê-lo. A revisão foi feita por IA pelo autor da implementação: não é taxa de acerto global dos 1.010 turnos, revisão independente ou parecer profissional. Os formulários especializados permanecem pendentes.

O ganho não elimina regressões: cinco posições passaram de parcial a falha (long-07/10, long-16/15, long-21/20, long-24/13 e long-31/30), e long-37/30 passou de satisfatória a parcial. Os finais de 30 turnos caíram de 6/10 para 5/10. A tabela detalhada abaixo preserva essas falhas.

Três decisões novas foram calibradas após conferir o critério histórico (índices 9, 16 e 64), com decisão inicial e justificativa mantidas em `revisions`. Os resultados antigos e os oráculos não foram alterados. Isso reduz inconsistências de julgamento, mas não substitui avaliação independente.

| Finais por duração | Luna anterior | Luna atual |
|---|---:|---:|
| 10 turnos | 6/10 | 7/10 |
| 15 turnos | 7/10 | 8/10 |
| 20 turnos | 3/10 | 3/10 |
| 30 turnos | 6/10 | 5/10 |

Modo formalmente válido não significa tarefa resolvida. Abstenções e conflitos podem estar corretos ou esconder omissões; por isso suas contagens não foram usadas como nota de qualidade. A conferência mecânica verifica contrato, autorização, canários e existência de citações/páginas/trechos, mas não prova sustentação semântica de toda frase.

## Consumo observado

| Indicador | Luna anterior | Luna atual |
|---|---:|---:|
| Créditos equivalentes Standard | 21,6856910* | 21,8605630 |
| API USD hipotética | 0,86742764* | 0,87442252 |
| Tentativas de processo | 1.194 | 1.170 |
| Tentativas sem usage | 5 | 0 |
| Tokens de entrada, incluindo cache | 14.629.488 | 14.556.693 |
| Tokens de entrada em cache | 8.279.424 | 8.155.392 |
| Tokens de saída | 299.254 | 305.477 |
| Créditos: 240 curtos | 5,0509125 | 5,4505105 |
| Créditos: 40 longos | 16,6347785* | 16,4100525 |
| Tentativas Sol | 0 | 0 |

Variação dos créditos observados: **+0,8%**. *A referência é subtotal com cinco tentativas sem usage; consumo desconhecido não vale zero. A medição atual tem usage em todas as tentativas. As tentativas recusadas e correções entram no consumo. Não houve API paga adicional nem juiz LLM automatizado; engenharia e auditoria deste chat não são atribuíveis pelo CLI e não estão somadas.

Os créditos aplicam às entradas sem cache/cache/saídas as tarifas 2,5/0,25/12,5 por milhão; o cenário hipotético de API aplica USD 0,10/0,01/0,50. Foram usadas as mesmas tarifas nos dois lados, reconferidas em 28/10: [créditos oficiais](https://learn.chatgpt.com/docs/pricing) e [API oficial](https://developers.openai.com/api/docs/pricing). Não são fatura nem medição exata da franquia. Não se estimam escritas de cache ou encargos não observados. Não dividir custo de todos os turnos pelos acertos amostrados para obter custo por resposta aprovada.

## Tempo e memória

| Indicador | Luna anterior | Luna atual |
|---|---:|---:|
| Mediana por turno | 5,45 s | 5,43 s |
| p95 por turno | 12,35 s | 13,22 s |
| Máximo bruto | 20.120,35 s | 38,26 s |
| Cenários concorrentes | 4 | 2 |
| Chamadas com contexto de memória | 1.194/1.194 | 1.170/1.170 |
| Chamadas com histórico não vazio | 869 | 851 |
| Máximo de interações / bytes | 8 / 2.754 | 8 / 3.404 |
| Chamadas com foco efêmero da tarefa | Não implementado | 432 |

A memória é a janela recente controlada pela Alvitra, de até oito interações e 12.000 bytes; pode começar vazia. Não é memória global nem lembrança completa dos 30 turnos. Respostas documentais antigas não são reaproveitadas como evidência: os documentos precisam ser recuperados novamente. O foco deriva de perguntas literais dentro dessa janela.

A referência teve pausas/timeouts de várias horas, de causa não confirmada; os máximos foram preservados. A diferença de concorrência e o ambiente impedem atribuir a variação de latência apenas ao código ou modelo. O tempo inclui overhead do CLI, validação e correções.

## O que melhorou e o que corrigir

Melhorias observadas incluem pedido do balancete correto ao trocar de condomínio (long-18/5), recusa de adulteração de saldo (crosscutting-26/2), separação entre proposta de U-A e U-B (long-07/6), pendências de transição (handover-15/2) e recusa de afirmar acionamento externo que não aconteceu (long-06/10).

Persistem perda de identificador corrigido (long-07/10), omissões de aviso/multa em conflitos contratuais (long-04/10 e long-24/13), sínteses incompletas de atas, contratos e cobrança e avisos genéricos após validação (labor-15/2, long-16/15, long-21/20 e long-26/10). Códigos de rejeição não provam alucinação: o texto bruto recusado não foi retido, e falsos positivos continuam possíveis. Risco e tipo de especialista ainda podem herdar assunto antigo de modo impreciso.

Houve códigos de rejeição em 177 turnos, incluindo tentativas depois corrigidas; isso não significa 177 respostas finais incorretas. O novo código `task_coverage_missing` não foi registrado em nenhum turno, apesar das omissões encontradas na auditoria. Portanto, a guarda lexical não demonstrou detectar essas omissões nesta bateria. O foco apareceu em 432 chamadas, mas uma rodada não isola seu efeito.

Prioridades para a próxima implementação, sem alterar esta bateria:

1. Preservar entidades e itens pendentes dentro da janela autorizada, pedindo esclarecimento quando o pedido antigo não está disponível.
2. Alinhar recuperação, modo de conflito e validação para responder à cláusula pedida, mantendo a divergência visível.
3. Tornar abstenções úteis e reduzir falsos positivos sem relaxar claims, fontes, isolamento ou validação humana.
4. Reexecutar regressões dirigidas antes de outra bateria completa; manter Luna como referência econômica e medir antes de ampliar o uso de Sol.

Todas as posições parciais/falhas desta amostra já são cenários de regressão preservados. Não houve correção de produção durante a execução; treinamento ou aprendizado automático do Luna não foi realizado.

## Posições que ainda exigem correção

| Caso/turno | Resultado | Motivo técnico |
|---|---|---|
| CONV-long-01/10 | Parcial | Rascunho retoma julho e apresenta33.000recebidos/31.000pagos, saldo14.000, reserva6.000 e ordinária8.000, sem envio. Omite declarar o resultado2.000, assim como a omissão material da referência neste fechamento. |
| CONV-long-04/10 | Parcial | Fechamento preserva preços confirmados/propostos, vigência31/12 e pendência, mas fica restrito a versões; omite índice de reajuste, aviso30dias e condições da multa essenciais para renovar/encerrar. |
| CONV-long-07/10 | Falha | Perde a unidade corrigida: em vez de confirmar U-B e principal2.200, oferece explicação genérica de U-A/U-B e retoma a proposta de U-A. Não resolve o identificador/valor pedido. |
| CONV-long-16/15 | Falha | Conclusão sobre eleição/mandato termina em aviso genérico após abstention_local_assertion; não separa fatos registrados de validação jurídica/documentos faltantes, apesar de preservar cautela e revisão humana. |
| CONV-long-18/15 | Parcial | Mantém dados financeiros corretos e isolados do Alameda, mas conclusão se restringe a julho14.000/reserva6.000/ordinária8.000; omite60unidades e salão150/22h retomados na conversa. |
| CONV-long-21/20 | Falha | A conclusão solicitava conferências do contador sobre extratos, comprovantes/nota, reserva e aprovação; a resposta final é uma abstenção genérica após unsupported_monetary_assertion, sem checklist útil. O texto bruto rejeitado não foi preservado para julgar a causa do bloqueio. |
| CONV-long-22/20 | Parcial | Distingue decisões da AGO, pintura não aprovada e exigência de laudo da AGE, sem declarar execução. Omite teto de24.000, seleção condicionada e uso de até6.000 da reserva, decisões materiais necessárias ao fechamento conjunto AGO/AGE. |
| CONV-long-23/20 | Parcial | Expõe corretamente salão150/22h versus proposta200/23h e aprovação pendente. O fallback por pending_source_as_confirmed omite a disputa de temporada90/30dias, embora a pergunta solicite explicitamente os dois conjuntos de valores. |
| CONV-long-24/20 | Parcial | Fallback de conflito conserva preço4.000/proposta4.400, formalização e aprovação pendente, sem alegar execução. Porém não entrega decisões sobre aviso/multa nem confirmação real de envio/recebimento solicitadas no fechamento. |
| CONV-long-25/20 | Parcial | Mantém equipe habilitada e laudo/análise antes da obra, sem selecionar fornecedor pela emergência. Porém prioriza documentação da contratação e não fecha avaliação/liberação técnica e registros pós-ocorrência antes de retomar uso, mesma lacuna da referência. |
| CONV-long-26/20 | Parcial | Distingue contrato, caixa e limites jurídicos e não inventa data de saída ou regularidade. Contudo usa saldo/manutenção no lugar da distinção entre rubricas agregadas de pessoal do balancete e valores individuais do vínculo, omissão material já usada na rubrica anterior. |
| CONV-long-27/20 | Parcial | Conserva principaisU-A1.100/U-B2.200 e conciliação por unidade, sem baixa fictícia, encargos definitivos ou exposição. O fechamento ainda não diferencia formalizar a proposta de U-A de conferir titularidade/negociar privadamente U-B; próximo passo permanece genérico. |
| CONV-long-31/30 | Falha | Pedido explícito de duas verificações prioritárias para o contador termina em aviso genérico após códigos monetário/especialista. Não entrega nota/comprovantes, extratos ou vinculação da reserva; cautela formal não resolve a tarefa. |
| CONV-long-32/30 | Parcial | Conserva principaisU-A1.100/U-B2.200 sem encargos e orienta conciliar pagamentos/verificar proposta. Omite titularidade/responsável, negociação privada e validação com assessoria antes de cobrar ambas; próxima ação fica incompleta, conforme a mesma rubrica histórica. |
| CONV-long-36/30 | Parcial | Usa título corrigido Reunião de conferência e não inventa reunião/envio/aprovação. Porém a pauta final fica só em versões discordantes, sem integrar demais tópicos/pendências nem pedir esclarecimento sobre itens fora da janela; mesma omissão material da referência. |
| CONV-long-37/30 | Parcial | Pede relatório/comprovante da visita do elevador com fontes atuais e não transforma agenda/aprovação em execução. Contudo deixa de retomar a despesa de manutenção de agosto, sua nota fiscal/detalhamento e conferência de pagamento solicitados no fluxo recente; fechamento documental ficou parcial. |
| CONV-long-38/30 | Parcial | Identifica inventário/documentos pendentes e formalização pela gestão que recebe, sem aceite atual presumido. Porém não inclui comprovação das entregas/execuções e conciliação financeira para um aceite integral futuro; mesma lacuna material da referência. |
| CONV-labor-15/2 | Falha | Preserva recusa segura e validação humana, mas devolve aviso genérico após claim_citation_not_displayed, sem explicar que falta o piso/CCT aplicável nem organizar a conferência. Mantém a falha de atendimento da referência. |
| CONV-long-09/6 | Parcial | Não reutiliza diagnóstico removido e pede o plano, mas afirma atendimento/conteúdo do contrato em abstenção sem citação pública. Mantém o critério da referência para afirmação documental adicional sem citação. |
| CONV-long-24/13 | Falha | Após reenvio, a pergunta pede aviso e multa; o fallback por mode_incompatible devolve somente renovação/preços e conflito, sem os30dias escritos nem a multa de uma mensalidade presentes no trecho recuperado. |
| CONV-long-26/10 | Falha | Não atualiza a explicação para dispensa sem justa causa: termina em abstenção genérica após códigos de claims, sem orientação útil sobre datas, registros e validação profissional. Não permite concluir se o texto rejeitado era falso ou falso positivo. |

## Procedência e verificações

Uma rodada, mesmas perguntas e oráculos, mesmo prompt v26, código diferente. O snapshot atual é `a5895b08d78e9365c09d37f1a1a87d1475883b9e946d08de3f087e75084cf88a`; o anterior era `ec2a07fb4e019dbdfaa21d5b2b330c700e4a83e159af1b975d9f0d81377a5733`. As diferenças abrangem a correção geral posterior à R2, memória/foco, caso de uso, validação e condição do runner; o ganho não é atribuível isoladamente a um componente.

Dataset `4e721a0c6f408791f0aca1d3ac45d0d82ed890549d8b5dd4fb2ffbeef21a193b`; corpus `96ca9a845c28b1e3bfabd42033bd852d92a1de85b65626c07bee7d257fc86e39`. Preservados os 240 originais e todos os gabaritos, hashes dos 280 checkpoints, vínculo das 80 auditorias às respostas e entradas de geração. Somente Luna, fontes do tenant correto, no máximo oito evidências, memória e foco dentro do orçamento, no máximo duas chamadas de geração por turno e nenhuma geração após recusa403 foram conferidos.

Esta suíte executa API em memória e recuperação textual sobre 25 documentos sintéticos já extraídos. Não mede OCR/upload, busca vetorial em produção, persistência SQL, reinício ou reabertura do navegador. A biblioteca legal é a edição congelada do protocolo; não comprova vigência/jurisdição atuais nem qualidade jurídica especializada. Uma rodada exploratória não demonstra causalidade ou significância. Três rodadas e revisão especializada continuam necessárias para certificação.

- [Métricas completas](../../../reports/conversations-2026-10-28-luna-quality-r1-metrics.json).
- [80 decisões e hashes](../../../reports/conversations-2026-10-28-luna-quality-r1-technical-audit.json).
- [Verificação da execução](../../../reports/conversations-2026-10-28-luna-quality-r1-verification.json).
- [Respostas dos 1.010 turnos](../../../reports/conversations-2026-10-28-luna-quality-r1-luna-memory-on-r1.json).
- [Plano autorizado](run-plan-2026-10-28.md).
- [Implementação e gates locais anteriores à bateria](implementation-results-2026-10-28.md).

Manifestos, snapshot, decisões e checkpoints ficam em `.local/conversation-comparisons/2026-10-28-luna-quality-r1/`; log em `.local/luna-quality-r1.log`. Nenhuma alteração de produção, dependência, configuração de ambiente ou prompt foi feita nesta rodada. Não houve commit, merge, deploy ou aprovação de release.

Verificações finais aprovadas: integridade da execução e dos 280 checkpoints, vínculo das 80 auditorias, alinhamento das 52 specs, scanner de segredos e whitespace do diff documental. Logs em `.local/luna-quality-results-vision.log` e `.local/luna-quality-results-secrets.log`. A suíte de 1.370 testes e a cobertura descritas na entrega de implementação são anteriores a esta rodada; não foram repetidas para alterações apenas documentais. Esses checks não substituem os gates semânticos ou de release.
