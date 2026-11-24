# Spec 055 — Bateria Sol 6.1 e Sol 5.6 contra Luna R3

**Status:** medição exploratória concluída; seleção e aprovação especializadas pendentes
**Responsável:** engenharia e qualidade
**Atualizado em:** 2026-10-29

## 0. Alinhamento com a visão do projeto

### Partes do briefing atendidas

| Dimensão da visão | Seções do briefing | Como esta spec contribui |
|---|---|---|
| Problema e hipótese | §§2 e 4 | Mede resolução de dúvidas documentais nos mesmos cenários. |
| Público | §3 | Preserva casos sintéticos da rotina de síndicos. |
| Proposta de valor | §§5 e 6 | Avalia utilidade, evidência e próximos passos na conversa. |
| Prioridades do MVP | §7, Blocos 2, 6 e 7 | Mede capacidades existentes sem antecipar blocos. |
| Segurança e confiança | §§8–10 | Conserva isolamento, fontes, abstenção e validação humana. |
| Validação e métricas | §§12–14 | Compara qualidade, tokens, latência e consumo equivalente. |

### Limites respeitados

O usuário solicitou testar Sol 6.1 e Sol 5.6 tomando os 74% do Luna como referência.
Usar a aplicação congelada R3 que originou 59/79 (74,7%), sem as correções R4.
O gate competitivo mantém o chat e mede o diferencial documental com casos existentes;
o benefício é evidência de qualidade/custo com extensão pequena e reversível do runner.
Sem mudança de produto, prompt, provedor, dependência, banco, credencial ou roteamento.
Somente gateway Codex/ChatGPT local e dados sintéticos, conforme ADR 0031.

### Divergências da visão

Nenhuma.

### Checklist de alinhamento

- [x] O briefing completo foi lido na versão atual.
- [x] A spec testa hipótese descrita no briefing.
- [x] Público e proposta de valor permanecem coerentes.
- [x] Prioridades e itens fora do escopo foram respeitados.
- [x] Segurança, custo e confirmação humana foram preservados.
- [x] Critérios contribuem para as métricas de validação do briefing.
- [x] Não existe divergência silenciosa.

## 1. Objetivo

Comparar `gpt-6.1-sol` e `gpt-5.6-sol` com Luna R3 na mesma aplicação e casos.

## 2. Promessa testada

> Sei quantas respostas cada modelo resolveu na amostra fixa e o consumo necessário.

## 3. Usuário primário

Equipe que valida a Alvitra para síndicos antes de selecionar uma configuração.

## 4. Escopo

Uma rodada por modelo, esforço low, memória ligada, Standard e concorrência dois.
280 cenários/1.010 turnos por modelo, incluindo 40 longos: total 560/2.020.
Baseline `2026-10-28-luna-quality-r3`, com ordem alternada por cenário.
Auditar 80 alvos predefinidos, conservando a exclusão histórica: 79 comparáveis.

## 5. Fora do escopo

Correção de produto, nova rodada Luna, ajuste de prompt/oráculo, juiz externo,
API paga, compra de créditos, alteração do chat em uso ou certificação.

## 6. Pré-condições

Specs 041, 050, 052 e 053; ADRs 0031, 0032 e 0035. Snapshot R3 íntegro e
disponibilidade dos dois modelos verificada em smoke separado, sem substituição.

## 7. Requisitos funcionais

### RQ-5501 — Modelo e baseline explícitos

Suite `sol` contém somente os dois modelos com memória. `--baseline-run=<id>` valida
o manifesto histórico e seus hashes antes da cópia. Sobrescrever na nova cópia somente
run.ts, protocol.ts e snapshot.ts do harness; aplicação, corpus, dataset, prompt e
alvos de auditoria permanecem idênticos à R3. Não alterar a R3. Sem `--execute`, zero chamadas.

### RQ-5502 — Consumo por modelo

Registrar todas as tentativas, tokens, cache, latência e modelo efetivo. Usar tarifas
Standard oficiais por modelo verificadas em 29/10/2026, com `billedCost` nulo.
Usage ausente é desconhecido; smokes e bateria têm subtotais separados.

### RQ-5503 — Auditoria pareada

Cada alvo tem nota satisfatória/parcial/falha/excluída, motivo e hash da resposta.
Saída rejeitada permanece falha. Comparar os mesmos 79 alvos, finais longos e falhas
mecânicas. Identificar autoria IA, uma rodada histórica e ausência de revisão especializada.

## 8. Contratos

`pnpm run evals:sol` mostra plano. Execução exige `--execute --run-key=<novo-id>`;
aceita `--baseline-run=2026-10-28-luna-quality-r3 --rounds=1 --concurrency=2`.
Manifestos/checkpoints íntegros recusam retomada divergente.

## 9. Requisitos não funcionais

Zero alteração da aplicação, mistura de condomínios/chats ou ferramentas ao modelo.
Conservar limites de memória R3; executar gates do runner, visão e segredos.
Fontes de tarifas: https://learn.chatgpt.com/docs/pricing e
https://developers.openai.com/api/docs/models/gpt-5.6-sol. Equivalentes não medem fatura/franquia.

## 10. Critérios de sucesso

Bateria executada e auditada ou interrupção registrada com cobertura, custos e falhas.
Comparação verificável contra 59/79, sem chamar a amostra de acurácia global.

## 11. Questões em aberto

A bateria concluiu 560 cenários/2.020 turnos e a auditoria técnica cobriu 80 posições
por modelo, com a mesma exclusão e 79 comparáveis. Sol 6.1: 68 satisfatórias, 10 parciais
e uma falha (86,1%); Sol 5.6: 57 satisfatórias, 15 parciais e sete falhas (72,2%).
Referência Luna R3: 59/79 (74,7%). Finais longos: 30/40, 20/40 e 23/40, respectivamente.

Consumo conhecido da bateria: 465,543300 créditos equivalentes no Sol 6.1, com duas
tentativas sem usage; 914,485120 no Sol 5.6, com usage completo. Os smokes têm subtotal
separado. Não é fatura nem acurácia global. A verificação conferiu 560 checkpoints,
2.020 turnos, 2.200 chamadas, 2.688 citações e 160 hashes de auditoria, sem divergência.

Uma rodada, auditoria por IA pelo autor e comparação Luna histórica não aprovam adoção.
Três rodadas, revisão especializada e resolução das falhas continuam pendentes.
[Resultados, regressões, protocolo e custos](observed-results-2026-10-29.md).
