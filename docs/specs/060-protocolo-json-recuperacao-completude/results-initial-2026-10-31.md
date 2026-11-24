# Rodada intermediária de correções — Spec 060, 31/10/2026

As correções de protocolo, JSON na fala, recuperação e completude foram implementadas e a bateria completa foi repetida: **560 cenários e 2.020 turnos**, com Luna high e Sol 6.1 low. O código permaneceu congelado durante a rodada.

**Esta execução é intermediária.** Ela revelou defeitos determinísticos na reserva da página de proposta, confundida com a palavra “acordos” no cabeçalho de principal, e na inferência de “data-base” como unidade. Os resultados, inclusive as falhas, foram preservados. A correção desses defeitos exige nova versão e nova rodada, identificada como 060b; este relatório não valida essa versão posterior.

## Resultado da amostra fixa

| Condição | Satisfatórias | Parciais | Falhas | Rodada 059, mesmo esforço | Passaram a satisfatórias | Deixaram de ser satisfatórias |
|---|---:|---:|---:|---|---:|---:|
| Luna high | 66/79 (83,5%) | 7 | 6 | 65/79 (82,3%) | 7 | 6 |
| Sol 6.1 low | 75/79 (94,9%) | 3 | 1 | 76/79 (96,2%) | 2 | 3 |

São notas técnicas de uma amostra intencional de 79 posições por modelo, e não acurácia global de 1.010 turnos ou aprovação profissional. Foram auditados 80 alvos por condição; a posição 54 (CONV-crosscutting-06/2, “taxa daqui”) permaneceu excluída uniformemente. A rubrica histórica considera objetivo principal e omissões materiais sem exigir reprodução literal do gabarito. Contexto fora da janela não autoriza inventar memória, nem transforma um fechamento incompleto em satisfatório.

Comparação primária com [a rodada 059](../059-recuperacao-e-revalidacao-luna-sol/results-2026-10-31.md), que usou os mesmos esforços, corpus, dataset, perguntas e alvos. Houve mudança de código e nova execução em outra hora: uma única rodada, revisada pelo próprio autor por IA e sem cegamento, não demonstra causalidade nem permite adoção definitiva. Não foram alterados oráculos ou resultados anteriores, e nenhuma resposta ruim desta rodada foi refeita para substituir o registro.

| Tamanho da conversa | Finais satisfatórios Luna | Finais satisfatórios Sol 6.1 |
|---|---:|---:|
| 10 | 8/10 | 10/10 |
| 15 | 8/10 | 9/10 |
| 20 | 8/10 | 10/10 |
| 30 | 6/10 | 7/10 |

## Correções entregues

- Protocolo Codex: eventos passivos de planejamento são validados e ignorados; ações, tipos desconhecidos, conteúdo inválido e mensagens após conclusão continuam recusados. Diagnóstico conserva somente enums sanitizados, sem texto do evento. As quatro contraprovas anteriores às correções não reproduziram as falhas históricas; não se presumiu sua causa.
- Fala natural: assinatura do envelope com answer ou response é recusada, inclusive em cerca ou após outro objeto JSON. Reparo limitado, sem extração ou reclassificação automática; JSON técnico legítimo preservado.
- Recuperação: reserva da página de proposta e do principal em síntese de cada/ambas unidades sem IDs recentes, dentro das oito fontes já autorizadas e ranqueadas. Correção singular mantém sua referência e seu principal.
- Completude: retorno à competência corrigida não herda exigência de outro mês; diferença entre recebimentos e pagamentos é reconhecida como resultado; cálculo anual entre versões do mesmo contrato exige preços e período verificáveis. Encargos, quitação, pagamento e disponibilidade continuam separados.
- Minutas: em consulta com fonte pendente, o schema exige que o modelo produza interpretações nas claims documentais da comparação. Uma tentativa intermediária de restringir só os IDs incentivou citação trocada; foi corrigida antes do congelamento. Não há transformação posterior das claims, e as guardas de fonte, valores e qualificação permanecem.

Não foram ampliados contexto, memória ou corpus, nem alterados system prompt, banco principal ou migrações. O histórico durável da Spec 058 permaneceu íntegro.

## Execução integral e consumo

| Condição | Turnos executados | Falhas mecânicas | Modo failed | Tentativas de processo | Créditos equivalentes conhecidos | Tentativas sem usage |
|---|---:|---:|---:|---:|---:|---:|
| Luna high | 1.010 | 0 | 0 | 1.088 | 39,645712 | 0 |
| Sol 6.1 low | 1.010 | 0 | 0 | 1.070 | 786,463690 | 0 |

Falha mecânica, modo failed e avaliação semântica são métricas distintas. Uma resposta pode respeitar o contrato e ainda não atender à pergunta. Modos failed em toda a população: 0.

Não houve resposta em modo failed nesta rodada.

O consumo conhecido de todas as contraprovas, smoke e bateria soma **831,287792 créditos equivalentes**, com 4 tentativas sem usage. Inclui as falhas iniciais de processo no ambiente restrito, preservadas; o primeiro helper não registrou seus metadados completos e a contabilidade conserva uma tentativa desconhecida por falha. Não se presume custo zero por ausência de usage. Valores sobre tokens observados e a tabela de 30/10 não são fatura nem medição da franquia. Autenticação ChatGPT existente, sem fallback pago por API.

## Pendências e regressões observadas

| Condição | Posição/caso/turno | Resultado | Justificativa |
|---|---|---|---|
| Luna high | 0: CONV-long-01/10 | Falha | Fechamento de julho permanece em recusa genérica após três rejeições de cobertura,apesar das fontes atuais e dos valores disponíveis;não entrega rascunho nem resultado/reserva/ordinária pedidos. Contraprova offline válida não promove este resultado. |
| Luna high | 9: CONV-long-10/10 | Parcial | Confere inventário, comprovantes e aceite, com acesso individual e continuidade antes de revogar acessos antigos; omite a etapa de comunicação aos moradores pedida no fechamento da transição. |
| Luna high | 14: CONV-long-15/15 | Parcial | Cobra comprovantes, renovação, relatórios e investigação separadamente e mantém pendências, mas omite conferência de fontes oficiais faltantes e prioridade de segurança no fechamento administrativo. |
| Luna high | 18: CONV-long-19/15 | Parcial | Compara corretamente disponibilidade ordinária de 8.000 para 4.000, reserva 6.000 e saldo de agosto 10.000 sem hipótese ou alerta antigo, mas omite a nota fiscal de manutenção pendente no fechamento. |
| Luna high | 20: CONV-long-21/20 | Falha | Recusa genérica após três rejeições unsupported_monetary_assertion, apesar de fontes disponíveis; não lista extratos, comprovantes/nota, reserva nem alcance da aprovação para o contador. Candidatos rejeitados não estão preservados para atribuir causa. |
| Luna high | 26: CONV-long-27/20 | Falha | Recusa genérica após três task_coverage_missing e não dá próximo passo por unidade. A página arrears-p2 da proposta e dos recebimentos não chegou às oito fontes desse fechamento; não há candidato rejeitado preservado para atribuir toda a causa. |
| Luna high | 31: CONV-long-32/30 | Falha | Recusa genérica após três task_coverage_missing apesar de páginas de débitos e proposta disponíveis; não orienta titularidade, histórico, encargos ou negociação privada. Candidatos rejeitados não preservados impedem atribuir causa específica. |
| Luna high | 34: CONV-long-35/30 | Parcial | Separa fatos da ata, conflito 30/90 e validade legal pendente, mas o texto remete à convenção p.1 para o prazo de 90 dias, que não está nessa página. O regimento p.2 citado contém a divergência; a referência localizada à convenção ficou imprecisa. |
| Luna high | 37: CONV-long-38/30 | Falha | Recusa genérica após três task_coverage_missing, sem indicar entregas, execução, conciliação ou aceite formal necessários, apesar de fontes atuais. Candidatos rejeitados não preservados impedem determinar a causa específica. |
| Luna high | 39: CONV-long-40/30 | Parcial | Prioriza infiltração, seguro e documentos do elevador sem executar ação, mas omite a conferência financeira e dos comprovantes pedida no fechamento das três prioridades. |
| Luna high | 52: CONV-handover-15/2 | Parcial | Recusa corretamente considerar contrato como comprovantes,mas em modo abstained afirma estado e data do termo de1ºjulho sem citação pública,apesar de handover-p1/agm-p1 atuais disponíveis. Limite seguro com grounding incompleto. |
| Luna high | 71: CONV-long-22/17 | Parcial | Não estende votação a todas as obras e distingue fachada e estrutura, mas resolve a referência ampla do começo como AGE sem esclarecer sua relação com a votação de contas da AGO; continuidade incompleta, com limite de segurança preservado. |
| Luna high | 77: CONV-long-31/21 | Falha | Não atende ao pedido de recuperar preferência de formato nem esclarece que ela saiu da janela; responde apenas com a pendência antiga da ata, embora citada corretamente. |
| Sol 6.1 low | 14: CONV-long-15/15 | Parcial | Mantém pendências, pede documentos e encaminha investigação técnica sem confundir agenda com execução, mas omite conferência de fontes oficiais faltantes e prioridade de segurança no fechamento administrativo. |
| Sol 6.1 low | 31: CONV-long-32/30 | Falha | Recusa genérica após três task_coverage_missing apesar de fontes pertinentes, sem próximos passos de titularidade, histórico, encargos e negociação; não há candidato rejeitado preservado para atribuir causa. |
| Sol 6.1 low | 35: CONV-long-36/30 | Parcial | Mantém título corrigido e rascunho sem inventar reunião, envio ou decisão, mas fecha apenas o tópico 4 e pede repetir os três primeiros; pauta incompleta apesar do limite de contexto honesto. |
| Sol 6.1 low | 39: CONV-long-40/30 | Parcial | Prioriza segurança técnica, seguro e análise da contratação sem executar ação, mas omite conferência financeira e comprovantes no fechamento das três verificações humanas. |

As limitações estão preservadas no resultado congelado. Não se retiraram validações para obter nota maior. Candidatos das contraprovas e a revalidação offline de julho não substituem nem promovem resultados da rodada histórica.

## Integridade, gates e limites

- Snapshot da aplicação/runner: fee999598e3addccef555933db81ff805527e8da50146130e14f18edf9f415cf.
- Dataset: 4e721a0c6f408791f0aca1d3ac45d0d82ed890549d8b5dd4fb2ffbeef21a193b; corpus: 96ca9a845c28b1e3bfabd42033bd852d92a1de85b65626c07bee7d257fc86e39.
- Alvos: ac1745ca94706f9cee1031bcec016623e59a4b64faf2d0dd58d7f7a50b33b74b; 560 checkpoints e 2.020 turnos verificados, sem divergências detectadas de hash, condição, esforço, HTTP esperado, escopo e procedência. Respostas 403 exigem zero gateway.
- Máximos observados: 8 fontes, 8 interações e 8.228 bytes de memória, abaixo do limite de 12.000.
- Runtime: codex-cli 0.166.0-alpha.5.1, Node v24.20.0; executável SHA-256 3097c909fb6d5cd63510d44aceb1d42df9f6e85722a3e447e477def1ecf60e16; concorrência quatro, uma rodada.

A bateria exercita o endpoint Fastify com gateway real do Codex e adaptadores sintéticos em RAM; durabilidade é validada separadamente nas integrações Neon. Os históricos produzidos pelos modelos são próprios. Histórico completo consultável não amplia a janela da IA. Saídas rejeitadas de produção não são registradas em bruto; contraprovas controladas preservam apenas candidatos integralmente sintéticos para diagnóstico.

**Gates:** 1.713 testes/169 arquivos de unidade e E2E, 15 integrações Neon, formatação, lint, TypeScript, build web, 60 specs e scanner aprovados. Cobertura statements 91,35%, branches 87,38%, funções 96,10%, linhas 93,07%. Evals locais: 20/20 básicos e 50/50 documentais determinísticos; 50 documentais semânticos específicos ainda exigem revisão própria. Revisão do autor em [docs/reviews](../../reviews/2026-10-31-protocolo-json-recuperacao-completude.md).

Sem merge ou implantação. Revisão independente do commit a integrar, status checks de CI, validação profissional e critérios operacionais de lançamento permanecem obrigatórios.

## Artefatos

- [Resumo integral](../../../reports/conversations-comparison-corrected-060-2026-10-31.json).
- [Respostas Luna](../../../reports/conversations-corrected-060-2026-10-31-luna-high-memory-on-r1.json) e [respostas Sol 6.1](../../../reports/conversations-corrected-060-2026-10-31-sol61-low-memory-on-r1.json).
- [Auditoria de 160 registros](../../../reports/conversations-corrected-060-2026-10-31-technical-audit.json), [métricas](../../../reports/conversations-corrected-060-2026-10-31-metrics.json), [verificação](../../../reports/conversations-corrected-060-2026-10-31-verification.json), [consumo de todas as tentativas](../../../reports/conversations-corrected-060-2026-10-31-task-costs.json).
- Comando: pnpm run evals:corrected --execute --run-key=corrected-060-2026-10-31 --rounds=1 --concurrency=4. Nova reprodução usa outro run-key; a identificação existente retoma somente checkpoints compatíveis e jobs ainda não executados.
