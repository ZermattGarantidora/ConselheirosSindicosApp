# Comparação controlada de modelo e memória — Specs 050 e 074

## Amostra pareada de custo, qualidade e tempo — Spec 074

`pnpm run evals:cost-30` prepara, sem inferência, 30 cenários fixos/36 turnos por braço:
Sol 6.1 low fixo e híbrido do runtime (Luna high/Sol 6.1 low), com memória ligada.
São seis cenários de conversa geral, seis documentais, seis financeiros, seis de
insuficiência/conflito e seis de continuidade com dois turnos. A seleção está em
`cost-30-cases.ts`, fora do corpus histórico imutável.

```powershell
pnpm run evals:cost-30 --execute --run-key=<identificador-novo> --rounds=1 --concurrency=1
```

O comando usa apenas Codex/ChatGPT pessoal local já autorizado. Mantém snapshot sem
credenciais, alternância da ordem, checkpoints e o reparo existente. Nunca compra créditos,
seleciona API paga ou substitui caso concluído. A execução tem até 144 tentativas nos
72 turnos; falhas de infraestrutura repetidas interrompem novas tarefas.

O formulário técnico cobre os 72 turnos, separado dos formulários especializados.
`cost-30-assessment.ts` valida decisões por caso/turno/hash e calcula custo por aprovado
incluindo consumo das tentativas recusadas. Revisão ausente não é acerto. Latência é o
tempo local da resposta completa, incluindo recuperação, geração e eventual reparo.

O equivalente de API usa entrada menos cache lido, cache lido e saída observados no CLI.
**Não inclui escrita de cache não informada pelo CLI e não é fatura, franquia ou ensaio
do transporte API.** A correção da Responses API é validada separadamente com mocks:
conta escrita 30m/12h, mantém custo USD nulo quando desconhecido e persiste recibos sem
conteúdo nos eventos privados da resposta. Tarifa e fontes em `usage-accounting.ts`.
Uma rodada pequena não certifica precisão global nem seleciona modelo de produção.


O comando `pnpm run evals:comparison` prepara um plano, sem inferência. A execução real é
explícita e usa somente o gateway Codex local autorizado, não uma API cobrada separadamente:

```powershell
pnpm run evals:comparison --execute --run-key=2026-10-27-sol-luna-memory-r1 --rounds=1 --concurrency=4
```

São quatro células: `sol-memory-off`, `sol-memory-on`, `luna-memory-off` e `luna-memory-on`.
Cada uma recebe os mesmos 280 cenários/1.010 turnos. Uma rodada por célula totaliza 1.120
conversas e 4.040 turnos, sem contar retries internos/fallbacks de validação como casos novos.
O esforço de raciocínio permanece `low` em ambos, conforme o adaptador atual. Não há ajuste
de prompt, troca de modelo do aplicativo ou mutação de variável global de memória.

`--case=<id>` permite um smoke separado; nunca conta como execução da suíte completa.
`--rounds=3` prepara três rodadas por célula, necessárias junto da revisão especializada antes
de selecionar configuração. A rodada única é exploratória e não comprova significância ou rollout.

## Congelamento e retomada

O runner copia somente fontes, metadados de pacote e corpus necessários para
`.local/conversation-comparisons/<run-key>/snapshot/`. Não copia `.env`, login, credenciais,
histórico de cliente ou dependências. O processo de medição importa esse snapshot, mantendo
as outras tarefas livres para editar o workspace sem alterar a comparação em andamento.
Manifestos e checkpoints têm hashes de configuração/código/corpus/dataset; divergência ou
adulteração recusa a retomada. Um caso concluído não é repetido ou substituído após falha.
Interrupção no meio de um caso pode perder telemetria ainda não consolidada: custos de uma
execução incompleta são subtotais observados, nunca uma promessa de custo integral.

## Consumo e custo

`observed-gateway.ts` observa as chamadas CLI e contabiliza usage mesmo quando a aplicação
recusa a saída depois da geração. Não registra stdout/stderr ou prompt na observabilidade.
Falha sem usage é desconhecida, não zero. Telemetria, respostas e contexto dos testes ficam
nos relatórios locais privados conforme a Spec 041, sem dados reais.

`protocol.ts` preserva tabela oficial de 27/10/2026 para velocidade padrão. Exporta:

- tokens totais de entrada, dos quais parte em cache, e tokens de saída;
- tentativas com/sem usage e se a cobertura do consumo está completa;
- `observedCreditsEquivalent`: equivalente pela tabela de créditos sobre tokens observados;
- `hypotheticalApiUsd`: cenário de preço da API sobre esses mesmos tokens, sem medir cobrança de API;
- `billedCost: null`: o CLI não fornece fatura atribuível ao teste.

Não somar cache à entrada total novamente. Não inferir consumo da franquia a partir de créditos
ou preços da API; a cota da conta é compartilhada com outras tarefas. Não há conversão para BRL,
rateio de assinatura, compra de créditos ou uso de resets. Fontes: [créditos Codex](https://learn.chatgpt.com/docs/pricing)
e [API](https://developers.openai.com/api/docs/pricing). O preço hipotético de API não modela
cobranças adicionais não observadas, como política de escrita de cache ou modificadores de serviço.

## Artefatos e qualidade

`reports/conversations-comparison-<run-key>.json` contém resumos por célula/rodada; relatórios
individuais e formulários seguem `conversations-<run-key>-<célula>-r<rodada>*.json`.
Checkpoints e `progress.json` ficam na pasta local da execução.

O resumo separa falhas, abstenções, conflitos, escalonamentos, custo, latência e posição do turno.
Nenhuma dessas contagens é automaticamente acerto semântico. Os formulários de especialistas
permanecem em branco. A amostra técnica foi fixada antes da matriz em `audit-targets.ts`:
80 posições por célula, incluindo todos os finais longos, as 19 continuações curtas e 21
desafios intermediários. Seu formulário separado identifica auditoria por IA, hashes e
cobertura de 80/1.010 turnos por célula; não representa revisão especializada ou taxa global.

O primeiro smoke de três turnos e os testes de disponibilidade têm custos próprios, separados
do total da matriz. A rodada antiga de 240 casos não serve como controle causal de memória,
pois outras correções de código e prompt aconteceram desde aquela medição.

## Primeira execução concluída

A rodada exploratória de 27/10/2026 terminou nas quatro condições: 1.120 conversas/4.040
turnos. O [relatório observado](../../docs/specs/050-comparacao-modelo-memoria/observed-results-2026-10-27.md)
registra consumo por condição, qualidade na amostra intencional, falhas e limitações.
O código e o prompt foram congelados antes de alterações concorrentes do aplicativo.
Os resultados não aprovam configuração de produção; três rodadas e revisão especializada
continuam pendentes. Não substituir uma falha preservada por reexecução bem-sucedida.
## Roteamento híbrido — Spec 051

`pnpm run evals:hybrid` mostra o plano de Luna/memória versus híbrido/memória (280 cenários e 1.010 turnos por condição).
`--execute --run-key=<id> --rounds=1 --concurrency=4` executa com snapshot comum e checkpoints.
É o mesmo runner, com `--suite=hybrid`, esforço low e política `luna-sol-v1`. O modelo efetivo consta de cada observação;
o consumo soma as tarifas correspondentes, sem tratar falha sem usage como zero. Os 80 alvos de auditoria permanecem fixos.
Uma rodada não substitui três rodadas e revisão especializada. Resultados históricos de outro código não isolam o efeito do roteamento.

A [rodada híbrida de 28/10/2026](../../docs/specs/051-roteamento-hibrido-regressoes/observed-results-2026-10-28.md)
concluiu os 280 cenários nos dois braços. O relatório separa a matriz, a exploração interrompida,
o replay dirigido posterior, falhas operacionais e subtotais com usage ausente.

## Bateria somente Luna — Spec 052

`pnpm run evals:luna` prepara uma condição `luna-memory-on`, com `gpt-6-luna`, memória
ligada e sem roteamento para Sol, inclusive em perguntas de alto risco. O tratamento de
risco e a exigência de validação humana continuam ativos. Por padrão, mostra o plano de
280 cenários/1.010 turnos e zero chamadas.

A execução futura usa `pnpm run evals:luna --execute --run-key=<id-novo> --rounds=1 --concurrency=2`.
O runner mantém snapshot, checkpoints, tokens, cache e custos por tentativa. O pacote de
contexto/síntese foi validado primeiro com testes locais; uma nova bateria real não foi
executada automaticamente. Repetições e especialistas continuam necessários para certificação.


## Sol 6.1 e Sol 5.6 — Spec 055

`pnpm run evals:sol` mostra o plano de duas condições com memória ligada e esforço low.
Para reproduzir a aplicação que gerou os 74,7% do Luna:

```powershell
pnpm run evals:sol --execute --run-key=2026-10-29-sol-61-56-r1 --baseline-run=2026-10-28-luna-quality-r3 --rounds=1 --concurrency=2
```

São 280 cenários/1.010 turnos por modelo. A cópia nova valida os hashes da R3 e conserva
sua aplicação, dataset, corpus, prompt e alvos de auditoria. Somente run.ts, protocol.ts e
snapshot.ts recebem o harness novo. Não modifica o histórico ou a aplicação em uso.
Tarifas Standard conferidas em 29/10/2026: Sol 5.6 100/10/500 créditos por milhão de
entrada/cache/saída; Sol 6.1 conserva 50/2,5/250. Nenhum equivalente mede fatura/franquia.
