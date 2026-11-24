# Spec 053 — Fechamentos longos e correção orientada por contrato

**Status:** implementada e avaliada; regressões semânticas pendentes, sem aprovação de adoção  
**Responsável:** engenharia da Alvitra  
**Atualizado em:** 2026-10-28

## 0. Alinhamento com a visão do projeto

### Partes do briefing atendidas

| Dimensão da visão | Seções do briefing | Como esta spec contribui |
|---|---|---|
| Problema e hipótese | §§2 e 4 | Corrige referências e conclusões incompletas observadas nas conversas documentais. |
| Público | §3 | Atende síndicos moradores e profissionais em consultas do condomínio autorizado. |
| Proposta de valor | §§5 e 6 | Entrega verificações e pedidos de evidência úteis dentro da conversa. |
| Prioridades do MVP | §7, Blocos 2, 6 e 7 | Melhora o núcleo já autorizado, sem novos módulos ou etapas. |
| Segurança e confiança | §§8–10 | Mantém revalidação, fontes, abstenção, versões e decisão humana. |
| Validação e métricas | §§12–14 | Mede regressões e qualidade/custo na mesma bateria somente Luna. |

### Limites respeitados

Oito interações recentes, 12.000 bytes incluindo foco e diagnóstico e oito evidências. Sem memória global, resumo de fatos, treinamento, dependência, serviço, schema de banco, ação externa ou mudança do system prompt v26. O schema de saída estruturada é detalhado em RQ-5303. Contexto derivado permanece dado não privilegiado; relatos não são evidência. Nenhum conteúdo documental removido é reaproveitado. O pedido autoriza corrigir as falhas e executar novamente os 280 cenários; não autoriza piloto ou produção.

### Divergências da visão

Nenhuma. O gate competitivo preserva o chat e a fatia autorizada, melhora tarefas documentais com evidência, reutiliza a arquitetura local e mede benefício/consumo sem classificador remoto ou aumento permanente de estado.

### Checklist de alinhamento

- [x] O briefing completo foi lido na versão atual.
- [x] A spec resolve problema e testa hipótese descritos no briefing.
- [x] Público e proposta de valor permanecem coerentes.
- [x] Prioridades e itens fora do escopo foram respeitados.
- [x] Segurança, custo e confirmação humana foram preservados.
- [x] Critérios validam utilidade, evidência e custo.
- [x] Não existe divergência silenciosa.

## 1. Objetivo

Concluir o pedido recente sem perder entidades corrigidas, cláusulas, fontes e pendências, e corrigir respostas inválidas sem repetições genéricas.

## 2. Promessa testada

> A conclusão cobre o pedido disponível e distingue evidência faltante de falha de geração.

## 3. Usuário primário

Síndico que alterna documentos, corrige uma unidade/período e retoma uma conferência.

## 4. Escopo

Seleção da tarefa recente para busca, referências explícitas e sínteses; cobertura limitada de cláusulas e tópicos derivados de perguntas; diagnóstico estruturado da única correção; correção de falso reconhecimento monetário de datas, percentuais e unidades não financeiras; regressões determinísticas e nova bateria Luna/memória.

## 5. Fora do escopo

Alterar prompt, esforço, provedor, roteamento ou configuração do aplicativo; ampliar janela; resposta documental pronta; relaxar autorização, citações, claims, validade ou fidelidade; contabilização profissional completa; corrigir modelos por treinamento.

## 6. Pré-condições

Specs 026, 035, 041, 043, 046, 047, 050–052; ADRs 0002, 0031, 0032 e 0035. A referência é `2026-10-28-luna-quality-r1`, com 58/79 satisfatórias, finais longos23/40 e 21,860563 créditos equivalentes. Fonte anterior preservada em `.local/luna-long-r2-baseline/`.

## 7. Requisitos funcionais

### RQ-5301 — Pedido atual e referências

Selecionar perguntas literais da janela recente pelo assunto atual, correções e entidades explícitas. Sínteses preservam diversidade dos itens solicitados; consultas de cláusula não são dominadas por preços ou assuntos antigos. Reconhecer retomadas de verificações humanas/contador e evidência para aceite. Nunca importar outro chat, inferir fato da pergunta ou inventar item fora da janela. Risco de emergência ativa continua preservado; troca explícita ou encerramento não transfere risco antigo indiscriminadamente.

Consulta exclusivamente de adequação ao piso sem instrumento coletivo recuperado usa orientação geral com lacuna específica, sem tratar contrato tangencial como fonte do piso. Pedidos compostos conservam evidências úteis para as partes respondíveis.

### RQ-5302 — Cobertura observável e limites

Foco pode expor tópicos, cláusulas e referências identificadas nas perguntas literais, sem valores documentais inferidos. Guarda limitada verifica omissões materiais explícitas ou retomadas disponíveis, inclusive aviso/multa, entidades e verificações compostas, sem confundir coincidência lexical com correção. Admite esclarecimento ou lacuna específica quando a fonte/contexto não basta. Exclusões, hipótese, mudança de assunto e consultas independentes têm controles negativos. O diagnóstico de cobertura aponta requisitos faltantes sem armazenar texto em telemetria de produção.

### RQ-5303 — Correção pelo contrato sem enfraquecer validação

Na segunda tentativa, fornecer dados estruturados sobre código, modos permitidos, tipos de claim/especialista e IDs de evidências pertinentes, dentro do contexto já autorizado. Sem texto bruto da resposta rejeitada ou instrução documental. O schema de geração deve representar combinações válidas de especialista e claims, evitando gerar combinações já proibidas pelo validador; não normalizar uma saída inválida para fazê-la passar. Não reconstruir resposta localmente nem promover claim pendente a fato. No máximo duas gerações totais por turno, mesmo modelo/fontes e revalidação antes de cada chamada/persistência. Datas, percentuais, jornadas e prazos não viram valores monetários por proximidade lexical; valores monetários locais sem suporte continuam recusados.

### RQ-5304 — Comparação preservada

Executar `evals:luna` com novo run-key, uma rodada, esforço low e concorrência2, após gates locais e congelamento. Manter 280 cenários/1.010 turnos, corpus/oráculos,80 alvos/79 válidos e memória ligada; zero Sol. Contar todas as tentativas, consumo desconhecido, falhas e calibrações. Relatar melhorias e regressões, sem atribuir causalidade isolada, fatura ou acurácia global à amostra IA. Smokes dirigidos são separados do custo da bateria integral.

## 8. Contratos

Payload HTTP e persistência preservados. Foco interno ganha projeções opcionais de requisitos e contrato de correção; serialização inclui todos os campos no orçamento de bytes. A projeção de saída exibe a união dos IDs explicitamente citados e dos IDs exigidos pelos claims documentais gerados, somente se já recuperados/autorizados; metadados e trechos continuam reconstruídos da fonte. Não altera texto, classe, exigência de evidência ou IDs dos claims; fonte inexistente, claim pendente tratado como fato ou abstenção factual continuam recusados. Não registrar perguntas, entidades ou saídas rejeitadas em logs de produção. Diagnóstico sintético autorizado permanece em artefatos locais ignorados.

## 9. Requisitos não funcionais

Zero contexto entre tenants/chats, máximo8 fontes/interações e12.000 bytes. Até duas gerações, sem chamadas adicionais para planejar ou julgar. Cobertura>=80% nos quatro indicadores. Nenhuma alteração em casos, oráculos, tarifas ou resultados anteriores para obter aprovação.

## 10. Critérios de sucesso

Aceitação e regressões passam nos controles positivos/negativos de contexto, cláusulas, fidelidade, correção e segurança. Gates aplicáveis executados, diff revisado e nova rodada comparada. Resultado real pode continuar com limitações: reportá-las sem classificar a implementação como garantia semântica ou liberar piloto.

## 11. Questões em aberto

Heurísticas e janela recente não garantem completude semântica. O limite de redação do prompt aprovado permanece; mudanças futuras dependem do gate da Spec026. A bateria é exploratória e precisa de revisão especializada para certificação.

### Revisão após experimento R2

A R2 foi interrompida após 247 cenários/330 turnos: os curtos tiveram 16/18 satisfatórias contra 17/18 e consumo observado 65% maior. Snapshot, falhas e subtotal de 11,84908 créditos foram preservados; até dois cenários em andamento têm consumo adicional desconhecido. A nova versão usa schema estável de estrutura e mantém as regras de IDs/modo/validade no validador local. Corrige a abstenção factual vista na R2 e variantes determinísticas de recusa monetária, sem alegar causa do texto rejeitado não retido. A R3 subsequente executou os 280 cenários e foi comparada com a R1 completa, conforme resultado abaixo; R2 parcial nunca substitui esse controle. Custos de exploração são somados separadamente.

## Gate para mudar o status

Alinhamento, aceitação, regressões, rastreabilidade e gates locais; comparação completa e falhas informadas, sem P0 de segurança introduzido. Não autoriza merge, deploy ou piloto.

## Resultado observado da R3

A execução completa `2026-10-28-luna-quality-r3` concluiu 280 cenários/1.010 turnos somente Luna com memória recente ligada. Auditoria técnica: 59/79 satisfatórias, 13 parciais e 7 falhas, contra 58/14/7 na R1; finais longos 23/40. Consumo observado: 21,9389360 créditos equivalentes, sem usage ausente. Não é fatura nem taxa global de acurácia.

As 30 regressões locais passaram nos 1.400 testes, mas a bateria revelou recuperações e novas regressões. Permanecem problemas de cobertura, referência corrigida, metadados e sínteses. A implementação não é certificação semântica; adoção, revisão especializada e repetição continuam pendentes. [Comparação completa e limites](observed-results-2026-10-28.md).
