# Spec 050 — Comparação controlada de modelo e memória

**Status:** medição exploratória concluída; revisão especializada e seleção pendentes  
**Responsável:** qualidade e engenharia  
**Atualizado em:** 2026-10-27

## 0. Alinhamento com a visão do projeto

### Partes do briefing atendidas

| Dimensão da visão | Seções do briefing | Como esta spec contribui |
|---|---|---|
| Problema e hipótese | §§2 e 4 | Mede se a continuidade resolve tarefas documentais em vez de apenas produzir conversa fluente. |
| Público | §3 | Usa os 280 cenários fictícios de síndicos da Spec 041. |
| Proposta de valor | §§5 e 6 | Compara respostas com e sem contexto recente nas mesmas tarefas. |
| Prioridades do MVP | §7, Blocos 2, 3, 6 e 7 | Avalia memória e consulta já autorizadas, sem criar jornada ou módulo novo. |
| Segurança e confiança | §§8–10 | Preserva autorização, fontes, isolamento e validação humana em todas as configurações. |
| Validação e métricas | §§12–14 | Relaciona qualidade observada, latência, tokens e custo equivalente por rodada. |

### Limites respeitados

- O usuário solicitou testar mudança de modelo e antes/depois da memória e escolheu explicitamente Sol e Luna.
- Mesmo gateway Codex/ChatGPT autorizado no ADR 0031; sem API paga, fornecedor, dependência, banco ou prompt novos.
- Somente dados sintéticos; nenhum segredo, stderr ou saída arbitrária de processo nos relatórios públicos.
- Não altera a configuração do chat em uso. A memória é parâmetro isolado do replay, não variável global compartilhada.
- Uma rodada exploratória não substitui o gate de três rodadas por configuração da Spec 041 nem a revisão especializada.
- Não usa juiz LLM, não seleciona modelo de produção e não aprova rollout. Auditoria técnica por IA é identificada e separada.

### Divergências da visão

Nenhuma.

### Checklist de alinhamento

- [x] O briefing completo foi lido na versão atual.
- [x] A spec testa as hipóteses de utilidade e continuidade do briefing.
- [x] Público e proposta de valor permanecem coerentes.
- [x] Prioridades e exclusões foram respeitadas.
- [x] Segurança, custo e confirmação humana foram preservados.
- [x] Critérios de sucesso contribuem para as métricas do briefing.
- [x] Não existe divergência silenciosa.

## 1. Objetivo

Medir o efeito da memória recente e da troca entre `gpt-6.1-sol` e `gpt-6-luna` no mesmo snapshot da aplicação, com consumo por rodada e resultados auditáveis.

## 2. Promessa testada

> Sei se a memória ajudou, em quais casos cada modelo falhou e quanto consumo foi necessário para obter essas respostas.

## 3. Usuário primário

Equipe que valida o conselheiro para síndicos, antes de selecionar configuração ou liberar piloto.

## 4. Escopo

Matriz 2×2: Sol sem/com memória e Luna sem/com memória. Uma rodada exploratória de cada célula sobre 280 cenários/1.010 turnos: 1.120 conversas e 4.040 turnos, sem reaproveitar respostas entre células. Rodadas adicionais são configuráveis e identificadas separadamente. Turnos dentro da conversa são sequenciais; cenários independentes podem concorrer com limite explícito. Manter raciocínio `low` e velocidade padrão do adaptador atual em ambos os modelos, sem otimizar prompt/modelo durante a medição.

## 5. Fora do escopo

Dados reais, gravação da conversa no fornecedor, memória global/resumos, cobrança de API, compra de créditos, uso de resets do plano, juiz LLM, alteração da política de segurança ou certificação de precisão global sem revisores.

## 6. Pré-condições

Specs 041, 042, 043, 046 e 047; ADRs 0002, 0003, 0031 e 0032. CLI local autenticado com ChatGPT e acesso aos dois modelos, confirmado por smoke. Sem esse acesso, registrar célula indisponível; nunca substituir modelo ou provedor silenciosamente.

## 7. Requisitos funcionais

### RQ-5001 — Experimento pareado e congelado

Congelar código, corpus, dataset e prompt em cópia local ignorada, sem credenciais. Os mesmos casos entram nas quatro células. Registrar hashes e rejeitar checkpoints de outra configuração. Alternar a ordem das células por cenário/rodada para reduzir viés de aquecimento. Retomar somente checkpoints íntegros; não substituir falha por retry bem-sucedido. O teste antes/depois usa o mesmo código com memória desligada/ligada, não a rodada histórica anterior a outras correções.

### RQ-5002 — Memória controlada sem estado global

O replay recebe `chatMemoryEnabled` explícito, repassa ao caso de uso e registra o valor resolvido. Desligada: nenhuma chamada recebe histórico. Ligada: janela, procedência, autorização e limites da Spec 043, com novo estado por cenário/célula. Não concatenar histórico na pergunta nem enviar gabaritos ao gateway. Casos novos não herdam memória de outra execução.

### RQ-5003 — Consumo de todas as tentativas

Observar o transporte CLI para capturar tokens de entrada, cache e saída até quando o parser ou a validação recusa a resposta. Tentativas sem telemetria são desconhecidas, não zero. Registrar contagens, falhas controladas e latência por tentativa, turno, cenário e rodada; nunca copiar stdout, stderr, prompt ou erros arbitrários para logs de observabilidade. Relatórios de respostas sintéticas seguem privados no workspace conforme Spec 041.

### RQ-5004 — Custo honesto e versionado

Aplicar tabela oficial conferida em 27/10/2026 para velocidade padrão: créditos por milhão (Sol: entrada 50, cache 2,5, saída 250; Luna: 2,5/0,25/12,5). Cache é parte da entrada total, não parcela adicional. Exportar créditos equivalentes e cenário hipotético de preço da API em USD separadamente (Sol: 2/0,10/10; Luna: 0,10/0,01/0,50 por milhão). Não chamar nenhum deles de valor faturado ou consumo exato da franquia. `billedCost` permanece nulo. Telemetria faltante torna o total observado incompleto, com subtotal explícito. Não converter para BRL sem câmbio conferido nem ratear assinatura arbitrariamente. Uso da conta é compartilhado com outros chats e não permite atribuir a variação de cota só ao experimento.

### RQ-5005 — Qualidade e limites visíveis

Comparar integridade, falhas, risco, conflitos, abstenções, latência e consumo por baseline/longos, tema, duração e posição do turno. Aprovação mecânica não implica acerto. Exportar formulários por turno com hash da resposta. Toda auditoria técnica deve identificar seu autor, cobertura, limitações e observações por caso, sem se passar por especialista independente. Revisões ausentes continuam pendentes; não fabricar uma taxa global de acerto. Uma única rodada permite diferenças descritivas, não seleção definitiva ou significância estatística.

## 8. Contratos

`pnpm run evals:comparison` prepara o plano sem inferência. `--execute` é opt-in explícito no ambiente local do ADR 0031; aceita identificador de execução, rodadas e concorrência limitada. Artefatos ignorados em `.local/conversation-comparisons/` e `reports/`, com manifestos, snapshot, checkpoints e resumos por célula. Modos canônicos anteriores e CI continuam sem chamadas externas automáticas.

## 9. Requisitos não funcionais

Sem alterações de fornecedor, dependência ou prompt; sem cópia de `.env` ou autenticação para snapshot; sem subprocessos visíveis; limites de timeout do gateway permanecem. Falhas repetidas de provedor interrompem novas tarefas e preservam resultados. Comandos nunca compram créditos nem usam resets.

## 10. Critérios de sucesso

Matriz completa ou bloqueios explicitamente contabilizados, memória demonstrada ligada/desligada no transporte, custo com cobertura de telemetria e resultados vinculados ao mesmo snapshot. Gates determinísticos e de visão aprovados; revisão especializada e três rodadas continuam necessárias antes de selecionar configuração.

Gate competitivo: preserva chat e capacidades autorizadas; mede benefício para tarefas reais de sindicatura; mantém fontes/tenant/abstenção; distingue de IA genérica por auditoria de evidências e contexto; comprova por replay pareado; reutiliza gateway e corpus sem serviço novo.

## 11. Questões em aberto

Variação entre rodadas, validação de especialistas, total faturado indisponível pelo CLI e consumo da franquia compartilhada; disponibilidade efetiva de cada modelo depende da conta.

## Gate para mudar o status

Exigir aceitação, rastreabilidade, testes e resultados transparentes. Não marcar qualidade aprovada sem o gate da Spec 041. Fontes: [modelos](https://learn.chatgpt.com/docs/models), [créditos](https://learn.chatgpt.com/docs/pricing) e [API](https://developers.openai.com/api/docs/pricing), conferidas em 27/10/2026.
