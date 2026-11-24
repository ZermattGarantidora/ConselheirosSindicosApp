# Spec 054 — Recuperação de conversas e comparação de esforço

**Status:** implementada e avaliada; critérios qualitativos parcialmente atendidos, sem aprovação de adoção
**Responsável:** engenharia da Alvitra
**Atualizado em:** 2026-10-28

## 0. Alinhamento com a visão do projeto

### Partes do briefing atendidas

<!-- prettier-ignore -->
| Dimensão da visão | Seções do briefing | Como esta spec contribui |
|---|---|---|
| Problema e hipótese | §§2 e 4 | Investiga conclusões incompletas e mantém continuidade do pedido documental. |
| Público | §3 | Exercita dúvidas e verificações recorrentes de síndicos, com fixtures sintéticas. |
| Proposta de valor | §§5 e 6 | Responde às partes sustentadas e explica a evidência ou o esclarecimento faltante. |
| Prioridades do MVP | §7, Blocos 2, 6 e 7 | Corrige conversa e análise já autorizadas, sem nova interface ou módulo. |
| Segurança e confiança | §§8–10 | Preserva fontes atuais, isolamento, conflitos, abstenção e decisão humana. |
| Validação e métricas | §§12–14 | Compara qualidade e consumo das configurações autorizadas, sem presumir benefício. |

### Limites respeitados

Mantém oito interações recentes, 12.000 bytes e oito evidências. Não cria memória global ou resumo documental persistente, nem muda o system prompt v26. Sem dependência, novo provedor, banco, credencial, ação externa, alteração da configuração do aplicativo ou liberação de produção. Fontes continuam recuperadas/revalidadas no fluxo completo; o replay dirigido usa exclusivamente entradas sintéticas identificadas e é distinguido desse fluxo.

### Divergências da visão

Nenhuma. O usuário autorizou executar as três etapas apresentadas: correções, validação Luna e comparação Luna low/high/Sol low. O gate competitivo conserva a conversa, a arquitetura e os controles; a hipótese é reduzir recusas/omissões com benefício medido antes de aceitar complexidade ou custo maior.

### Checklist de alinhamento

- [x] O briefing completo foi lido na versão atual.
- [x] A spec resolve problema e testa hipótese descritos no briefing.
- [x] Público e proposta de valor permanecem coerentes.
- [x] Prioridades e itens fora do escopo foram respeitados.
- [x] Segurança, custo e confirmação humana foram preservados.
- [x] Critérios validam utilidade, evidência e consumo.
- [x] Não existe divergência silenciosa.

## 1. Objetivo

Reduzir recusas genéricas e omissões observadas na R3 e identificar onde maior esforço ou Sol melhora respostas.

## 2. Promessa testada

> A Alvitra mantém o alvo corrigido, cobre o pedido disponível e explica limites específicos sem transformar relato, proposta ou memória em fato.

## 3. Usuário primário

Síndico que corrige unidades/períodos, alterna documentos e pede uma conclusão ou próxima ação humana.

## 4. Escopo

1. Diagnosticar os 20 pontos parciais/falhos da R3; guardar saídas rejeitadas somente em artefatos privados de fixtures sintéticas; corrigir causas demonstradas e adicionar regressões e controles negativos.
2. Validar correções e novas formulações no Luna low com memória; depois executar novamente os 280 cenários/1.010 turnos, incluindo todos os 40 longos, com snapshot congelado e comparar com R3.
3. Comparar Luna low, Luna high e Sol low nos mesmos pontos difíceis e controles fixados antes das saídas, com entradas/evidências iguais por configuração. Não altera a política de roteamento do aplicativo.

## 5. Fora do escopo

Treinar modelos, ampliar janela, consultar outro chat, reter dados reais, usar API cobrada separadamente, alterar prompt sem apresentação/aprovação, aumentar tentativas, compor respostas documentais prontas ou aprovar piloto. Uma rodada exploratória não certifica produção.

## 6. Pré-condições

Specs 026, 041, 043, 050–053; ADRs 0031, 0032 e 0035. Referência imutável R3: 59/79 satisfatórias, 13 parciais, 7 falhas, finais longos 23/40, 21,938936 créditos. Fonte de partida: `50f1705175de5fc5492a4a77940e2c4e0e8d5f94e903117fbf02a4c9e42dd2c4`, preservada em `.local/conversation-recovery/2026-10-28-recovery-baseline/`.

## 7. Requisitos funcionais

### RQ-5401 — Diagnóstico verificável

Replay dirigido mantém ligação ao cenário/turno, fonte e input hash. Registra texto rejeitado apenas em pasta privada ignorada, validada contra corpus sintético. Nenhuma opção de log textual é exposta pelo gateway de produto. Códigos sem texto não provam alucinação ou falso positivo. Reexecução bem-sucedida não substitui falha anterior.

### RQ-5402 — Foco e completude

Identificar entidade corrigida e selecionar o pedido atual entre perguntas recentes; simples menção a ambas não satisfaz pedido sobre uma. Distinguir comparação/exclusão genuínas. Preservar itens materiais de síntese e permitir declaração de lacuna específica. Guardas não podem exigir tópicos negados ou independentes; palavras isoladas não certificam correção. Corrigir omissões e seleção de evidência sem hardcode de IDs de cenário ou respostas.

### RQ-5403 — Estrutura e fidelidade

Diagnóstico deve permitir corrigir modo, classe de claim, citação e recusa monetária sem alterar fatos/tipos para aprovar uma saída. IDs explicitamente referenciados e autorizados podem ser exibidos mesmo em recomendações; IDs desconhecidos continuam bloqueados. Fonte pendente não vira fato, nem orientação geral vira afirmação local. Requisitos de segurança e validação de grounding permanecem rígidos. Orientação temporal não recomenda como futura data já transcorrida quando a referência temporal está disponível.

Sínteses documentais e conflitos podem receber o contrato de modos/claims já na primeira geração, com restrição falha nula, sem fingir erro anterior. A data de referência é dado do contexto e entra no orçamento. A primeira geração não recebe saída pronta, gabarito ou conteúdo de fonte adicional.

### RQ-5404 — Comparação com controle

Adicionar seleção explícita low/high ao adaptador Codex, conservando low por padrão e configuração atual do aplicativo. A observação registra esforço/modelo efetivos. Comparação usa uma rodada por configuração, concorrência dois e o mesmo snapshot/input; contrabalançar a ordem para reduzir viés de cache. Conjunto dirigido fixado antes das saídas: 20 pontos afetados, 10 paráfrases e 10 controles, com oráculos separados do input. A matriz dirigida não substitui conversas completas nem avalia novamente retrieval/persistência.

### RQ-5405 — Custos e resultados

Comando `evals:recovery` mostra plano sem inferência por padrão; execução exige `--execute` e novo run-key. Checkpoints/hashes recusam retomada divergente. Contabilizar todas as tentativas, incluindo rejeições, e marcar usage ausente desconhecido. Separar diagnóstico, ensaio dirigido, bateria Luna completa e matriz de configuração; comparar rodadas completas com completas. Auditoria técnica identifica autoria IA e não aprovação profissional. Toda falha nova fica no relatório.

## 8. Contratos

Entradas HTTP e persistência preservadas. Campos de foco/diagnóstico opcionais são dados não privilegiados dentro do orçamento. Alterações do schema remoto limitam estrutura, mantendo reconstrução das referências e validação local. O runner não recebe credenciais de API e não aceita documentos arbitrários ou clientes reais.

## 9. Requisitos não funcionais

Até duas gerações por pedido, mesmo modelo e esforço, com revalidação. Sem custo externo de classificação ou julgamento por turno. Zero vazamento entre tenants/chats. Cobertura >=80% em statements, branches, funções e linhas. Corpus, oráculos, 280 cenários e resultados históricos permanecem intactos.

## 10. Critérios de sucesso

Causas corrigidas recebem teste e controle negativo; gates aplicáveis passam. A bateria e a matriz são executadas e auditadas ou a interrupção e cobertura são relatadas precisamente. Melhorias/regressões e custo são apresentados sem alegar significância de uma rodada ou aprovação de produção. Falhas semânticas remanescentes impedem declarar solução completa.

## 11. Resultado observado e pendências

As três etapas foram executadas. R4: 280 cenários/1.010 turnos, somente Luna low com memória; 62/79 satisfatórias, 16 parciais e uma falha na amostra comparável, contra 59/79, 13 e sete na R3. Finais longos: 25/40 contra 23/40; os grupos de 20 e 30 turnos regrediram. Consumo: 21,2411895 créditos equivalentes, redução observada de 3,18%.

Matriz dirigida de 40 pontos por configuração: Luna low 31 S/8 P/1 F, Luna high 26 S/12 P/2 F e Sol low 30 S/9 P/1 F. Consumo: 0,951208, 1,524760 e 31,221920 créditos equivalentes. Uma rodada não autoriza inferir superioridade geral ou ampliar roteamento. A configuração do aplicativo foi preservada.

Permanecem omissões materiais, uma nova recusa genérica, afirmação qualitativa local sem citação em alvo excluído e falsos positivos de cobertura/valor relatado. A contraprova lexical do bloqueio do Sol não substitui uma resposta entregue nem altera sua nota. O requisito de fidelidade continua necessário; não foi reduzido para aceitar esses resultados. Ampliação futura de memória depende de spec/ADR própria.

[Resultados, falhas, custos e próximos passos](observed-results-2026-10-28.md). A origem das notas e os critérios parcialmente atendidos constam em [aceitação](acceptance.md). O custo total conhecido dos experimentos desta tarefa é 56,529805 créditos equivalentes, com mais 20 tentativas sem usage; não é fatura nem custo zero para tentativas desconhecidas.

## Gate para mudar o status

Alinhamento, aceitação e rastreabilidade completos; testes/gates e diff revisados; comparações e custos registrados. Sem autorização implícita para merge, deploy ou piloto.
