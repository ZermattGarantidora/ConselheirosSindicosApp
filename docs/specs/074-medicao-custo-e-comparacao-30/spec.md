# Spec 074 — Medição de custo e comparação pareada de 30 casos

**Status:** implementada e verificada localmente; rodada exploratória concluída, sem liberação de produção  
**Responsável:** engenharia e qualidade da Alvitra  
**Atualizado em:** 2026-11-23

## 0. Alinhamento com a visão do projeto

### Partes do briefing atendidas

| Dimensão da visão | Seções do briefing | Como esta spec contribui |
|---|---|---|
| Problema e hipótese | §§2 e 4 | Compara resolução das mesmas tarefas documentais e continuidade. |
| Público | §3 | Reutiliza cenários inteiramente fictícios da rotina dos síndicos. |
| Proposta de valor | §§1, 5 e 6 | Mede utilidade, fontes e tempo da conversa existente. |
| Prioridades do MVP | §7, Blocos 2, 3, 6 e 7; §12 | Corrige observabilidade e avalia o roteamento já autorizado, sem nova experiência. |
| Segurança e confiança | §§8–10 | Preserva isolamento, validação de citações, abstenção e confirmação humana. |
| Validação e métricas | §13 | Mede consumo de todas as tentativas, qualidade por gabarito e custo por resposta aprovada tecnicamente. |

### Limites respeitados

Sem mudança de prompt, retrieval, política de roteamento, provedor, dependência ou banco. Sem
dados reais, rollout, assinatura, contratação ou execução externa pelo produto. A execução
autorizada nesta conversa usa o Codex/ChatGPT pessoal local já configurado; não há chave de API
configurada. Custo equivalente de API sobre tokens do CLI não é fatura ou consumo da franquia.
Não antecipa blocos futuros ou alterações comerciais. Revisão especializada permanece separada.

### Divergências da visão

Nenhuma. O usuário autorizou corrigir a medição e executar os mesmos 30 casos com Sol fixo e
híbrido. O gate competitivo mantém o chat, avalia capacidades existentes, melhora evidência de
decisão de custo, preserva segurança e diferencia a Alvitra por recuperação/citações verificáveis.
Reutilizar corpus, replay e adaptadores compensa a pequena instrumentação adicional.

### Checklist de alinhamento

- [x] O briefing completo foi lido na versão atual.
- [x] A spec testa a utilidade documental e a economia com qualidade do briefing.
- [x] Público e proposta de valor permanecem coerentes.
- [x] Prioridades, sequenciamento e exclusões foram respeitados.
- [x] Segurança, custo e confirmação humana foram preservados.
- [x] Critérios de sucesso contribuem para as métricas do briefing.
- [x] Não existe divergência silenciosa.

## 1. Objetivo

Mostrar diferença observada de qualidade, tempo e consumo entre Sol 6.1 low fixo e o híbrido
atual (Luna high / Sol 6.1 low), sem transformar telemetria ausente em custo zero.

## 2. Promessa testada

> Sei quanto consumo foi necessário, onde houve falhas e quais respostas passaram na mesma amostra.

## 3. Usuário primário

Equipe que valida preço acessível e respostas confiáveis para os síndicos antes de liberar uso real.

## 4. Escopo

Contabilização da Responses API; preservação de uso em falhas; recibo privado nos eventos de
auditoria existentes; amostra fixa e pareada de 30 cenários sintéticos; execução local Codex,
relatórios por tentativa/turno/cenário e avaliação técnica identificada.

## 5. Fora do escopo

API paga nesta rodada, conversão BRL, custo faturado, OCR/áudio/embeddings, novo modelo,
otimização de prompt, alteração dos critérios após ver resultados, seleção de produção e
certificação especializada. Não alterar baterias e relatórios históricos.

## 6. Pré-condições

Specs 041, 042, 043, 050, 051 e 061; ADRs 0003, 0022, 0031 e 0038. Autorização explícita do
usuário em 23/11/2026. CLI local disponível e autenticado; sem fallback para API paga.

## 7. Requisitos funcionais

### RQ-7401 — Consumo íntegro e tarifa versionada

Registrar entrada total, leitura de cache, escrita por TTL de 30m/12h, saída total e raciocínio
quando informados. Raciocínio já integra saída; cache já integra entrada. Aplicar tabela Standard
em USD verificada em 23/11/2026; escrita 30m usa 1,25× e 12h 2,5× entrada. Contadores ausentes,
inválidos ou incompatíveis e modelo sem tarifa produzem estimativa desconhecida, nunca zero.
O campo BRL legado não representa cobrança; expor estimativa USD separada e sua cobertura.

### RQ-7402 — Todas as tentativas e falhas

Capturar consumo antes de validar status, texto, JSON ou citações. Preservar telemetria ao
lançar erro sem mudar sua classificação ou enfraquecer validação/reparo. Falha de transporte
sem usage permanece desconhecida. Recibo sem conteúdo/segredos acompanha o evento de auditoria
da resposta, isolado pelo mesmo condomínio e usuário, sem migration.

### RQ-7403 — Amostra fixa e pareada

Selecionar 30 cenários antes da execução, cobrindo conversa geral, consulta documental,
financeiro, insuficiência/conflito e continuidade. Usar o mesmo corpus, código congelado,
memória ligada, budgets e validadores em ambos os braços. Alternar ordem por cenário;
executar sequencialmente para evitar contenção entre braços. Turnos da mesma conversa
permanecem sequenciais. Gabaritos não entram no prompt.

### RQ-7404 — Execução explícita e recuperável

`pnpm run evals:cost-30` prepara o plano sem inferência. `--execute --run-key=<id>` usa apenas
o CLI autorizado, snapshot sem credenciais e checkpoints íntegros. Preservar falhas, sem repetir
caso concluído ou substituir resposta por resultado melhor. No máximo duas gerações por turno,
conforme o caso de uso. Interromper novas chamadas após falhas repetidas de infraestrutura.

### RQ-7405 — Comparação honesta

Mostrar subtotal de tokens observados, tentativas desconhecidas, custo equivalente API por
resposta/turno aprovado tecnicamente, latência média/mediana/p95 e modelos efetivos. Custos de
falhas e reparos entram no numerador. CLI não informa escrita de cache nem fatura: declarar
que o equivalente não reproduz a cobrança da API e não mede velocidade do transporte API.

### RQ-7406 — Qualidade revisável

Conservar pergunta, gabarito, resposta e hash em artefatos locais privados. Separar verificações
mecânicas de julgamento técnico por IA e revisão profissional pendente. Auditar todos os turnos
dos 30 cenários nos dois braços, registrar correção, suficiência, citações, abstenção/conflito e
escalonamento. Uma rodada pequena permite comparação descritiva, sem aprovação de produção.

## 8. Contratos

Telemetria pode incluir contabilidade versionada, custo USD nulo quando desconhecido e origem
da medição. Erros preservam a classe original e carregam telemetria por associação interna.
Persistir o recibo nos metadados do evento de resposta; não copiar prompt/saída para observabilidade.
O payload público e campos BRL legados permanecem compatíveis. Artefatos em `.local/`.

## 9. Requisitos não funcionais

Nenhuma nova dependência ou migração; testes de regressão para custo, falhas e isolamento.
Cobertura unitária global >=80% nos quatro indicadores. Não executar gates SQL guardados ou
carregar credenciais remotas. Nenhuma chamada externa automática em CI ou no comando padrão.

## 10. Critérios de sucesso

Contabilidade correta sob cache misto e falhas, testes/gates aplicáveis executados, 30 cenários
pareados concluídos ou bloqueios explícitos, qualidade e latência comparáveis e documentação
coerente. Resultados negativos continuam visíveis; nenhuma mudança do modelo em uso é implícita.

## 11. Questões em aberto

Fatura atribuível, cobrança de escrita de cache da API real, variância entre rodadas e validação
por especialistas não são resolvidas pelo CLI. O efeito observado vale para esta amostra.

## Gate para mudar o status

Aceitação, rastreabilidade, revisão do delta e gates registrados; avaliação real identificada
como exploratória. Ausência de acesso ao modelo é bloqueio de execução, nunca dado de qualidade.
