# Revisão da implementação — roteamento híbrido

**Status:** revisão do autor concluída; comparação real e replay dirigido concluídos.  
**Escopo:** Spec 051 / ADR 0035. Não é revisão independente para merge.

## Diff revisado

Revisão integral das mudanças desta fatia em relação à cópia anterior à tarefa, preservada em `.local/hybrid-baseline/` para arquivos já modificados no checkout. Novos módulos e testes foram lidos integralmente. Alterações anteriores de outros trabalhos no checkout não foram atribuídas a esta tarefa nem revertidas.

- Roteador e integração do gateway local; seis motivos complexos controlados, escolha antes da geração e sem fallback de provedor.
- Contexto recente, consulta corrigida e risco contextual; nove registros lidos, somente oito interações enviadas; sem replay de resposta documental.
- Recuperação por subpergunta, páginas complementares e filtros mantidos; cache exclusivo de cada busca autorizada.
- Guarda monetária/abstenção no validador existente; uma correção e recusa segura preservadas.
- Harness, seleção de dois braços e contabilização de cada modelo efetivo, inclusive saída reprovada e tentativa sem usage.
- Documentação, decisão arquitetural, rastreabilidade e 44 testes novos.

## Achados corrigidos durante a revisão e verificação

1. Expansão de eleição trazia lei para pergunta sobre empresa eleita: restringida ao contexto de síndico/conselho/gestão; teste legal existente preservado.
2. Ranking por faceta repetia trabalho e excedia tempo do replay: cache temporário por busca e tokenização reaproveitada; gate de 1.010 turnos passou sem aumentar timeout.
3. Soma derivada poderia exigir trabalho cúbico sobre quantidade arbitrária de moedas: limitada a 64 operandos distintos e três parcelas; ausência de prova continua recusada.
4. Tentativa real de adulterar saldo ainda seguia caminho básico: roteamento explícito de adulteração/ocultação para Sol. Smoke posterior manteve o saldo real e separou hipótese.
5. A ampliação do detector de conflito confundiu retenção de imagens com locação. A exploração foi interrompida e preservada; o detector agora extrai a duração da mesma cláusula de locação nas duas fontes e exige pergunta pertinente. Foram acrescentados controles negativos de imagens/barulho e valores variantes 120/45. Quatro fixtures unitárias passaram a explicitar o assunto da cláusula, sem alterar suas asserções; o dataset de 280 casos permanece intacto.
6. Imperativos e pronomes perdiam antecedentes, e confirmação de piso permanecia simples: contexto passou a reconhecer essas referências e risco de piso/CCT exige confirmação contextual, com controle de consulta simples.
7. A guarda de abstenção confundiu definição geral de pauta/ata com afirmação local: passou a exigir especificidade local. Quatro definições, seis fatos locais e um claim sem evidência verificam aceitação/recusa; os demais validadores permanecem intactos. O diff posterior à R2 está restrito a `answer-fidelity.ts`; replay dirigido de 60 turnos sem falha de validação, preservando a matriz e suas notas anteriores.

## Gates de código

Formatação, lint, typecheck e gate de visão (51 specs) aprovados. Suíte completa final: 150 arquivos, 1.333 testes aprovados; statements 91,77%, branches 87,22%, funções 96,75%, linhas 93,52%. Os testes existentes não foram enfraquecidos. A primeira execução final teve três timeouts sob concorrência com o replay real; outra tentativa foi interrompida pelo ambiente (1073807364), sem conclusão. A repetição final fora do sandbox passou com os mesmos dois workers, timeouts e asserções, sem modelos. Logs de todas as tentativas preservados; `coverage/hybrid/` contém os relatórios finais.

Comandos instalados foram executados diretamente (`node node_modules/...`) devido à indisponibilidade de resolução do Corepack/pnpm no ambiente; os mesmos executáveis e configuração do projeto foram usados. Não houve mudança de schema ou integração de banco; nenhuma operação destrutiva de banco foi executada.

Scanner final de segredos aprovado após o término dos processos Codex: nenhum padrão conhecido encontrado. Gate de alinhamento repetido no estado final: 51 specs aprovadas. A revisão final incluiu os diffs dos módulos existentes contra `.local/hybrid-baseline/`, os novos módulos/testes, configuração, harness e documentação desta fatia. O hash de `prompt-catalog.ts` permaneceu igual ao início da tarefa. A conferência integral do checkout não reatribuiu nem reverteu mudanças anteriores de outras tarefas.

## Limites

Não se afirma qualidade semântica global, aprendizado automático, aprovação especializada ou autorização de piloto/merge. A política pode errar a complexidade; guardas lexicais e numéricas não substituem revisão semântica. O [relatório observado](../specs/051-roteamento-hibrido-regressoes/observed-results-2026-10-28.md) preserva falhas, consumo sem medição, custos de exploração e limitações de conversas longas. Nenhum commit, push, merge ou publicação foi realizado; configuração do aplicativo em execução preservada. Nenhuma aprovação de merge é emitida por esta revisão do autor.
