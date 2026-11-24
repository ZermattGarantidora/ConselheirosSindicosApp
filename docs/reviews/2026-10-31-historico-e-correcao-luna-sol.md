# Revisão do autor — histórico e correções Luna/Sol

- **Status:** revisão técnica do autor concluída; não autoriza merge.
- **Diff revisado:** mudanças das Specs 058–059 contra `.local/corrections-059/baseline`; aplicação/runner fingerprint `25a093449ca3a8e7ee6e4ad563356cd3351f162899d7fda060ec89adb72ae2fc`.
- **Revisor independente:** pendente.
- **Autor/revisor nesta etapa:** Codex, com a skill `code-review`.
- **Data:** 2026-10-31.
- **P0 abertos no escopo revisado:** 0.
- **P1 abertos no escopo revisado:** 0.

## Escopo

Revisado o delta completo desta tarefa: journal RAM/PostgreSQL, migrações 034–036, backfill, RLS e autorização, recibos/ACK, retomada/paginação da interface, memória e ledger, recuperação de páginas, validação/completude, runner e condições, testes, documentação e rastreabilidade. As alterações preexistentes fora desse delta foram preservadas; esta revisão não declara aprovação de todo o branch acumulado.

## Defeitos identificados e corrigidos na revisão

- Uma gravação de cadastro concorrente com associação poderia ficar fora do chat: serialização no registro da sessão e regressão de concorrência no banco.
- Retentativa após perder a criação, correções durante outra etapa e retomada de contexto existente podiam perder a etapa ou duplicar cadastro: chave estável da sessão, recibo atômico, reconstrução da etapa/contexto e regressões.
- Uma chave repetida em outra versão documental não distinguia os parâmetros; agora parâmetros e metadados de upload entram no hash.
- Mescla após muitas mensagens de outra aba podia ocultar uma lacuna; cursor permanece disponível até completar a leitura. Síntese local/canônica foi deduplicada.
- Na corrida entre duas perguntas com a mesma chave e conteúdo diferente, o ACK poderia confirmar uma resposta que não entrou no journal: hash revalidado antes do ACK e teste com interleaving controlado.
- Replay documental podia acompanhar orientação geral sem fontes no pedido: falas com essa base são removidas desse caminho, preservando respostas gerais e o orçamento.

## Verificação

1.688 testes aprovados e cobertura global acima de 80% nos quatro indicadores; 15 integrações Neon aprovadas, incluindo processo novo, backfill e restauração isolada; formatação, lint, typecheck, build web e evals locais aplicáveis aprovados. Evidências detalhadas em `docs/specs/058-historico-completo-e-duravel/technical-validation-2026-10-31.md`.

Os ajustes de expectativas de testes correspondem ao novo contrato (runtime durable/volatile, transporte com recibo e replay documental revalidado). As asserções de isolamento, fontes atuais, falha segura, janela e conteúdo literal foram preservadas ou ampliadas. Não foram alterados corpus, oráculos nem alvos da comparação.

## Decisão e limites

O estado revisado foi mantido sem alterações na bateria sintética autorizada: 560 cenários/2.020 turnos, verificação íntegra e auditoria técnica de 79 posições comparáveis por modelo. Luna high: 65 satisfatórias, 12 parciais e duas falhas; Sol 6.1 low: 76 satisfatórias e três parciais. As classificações e limitações estão no relatório da Spec 059 de 31/10; não são aprovação especializada ou acurácia global.

Permanecem defeitos de qualidade: envelope com `response` não detectado dentro da fala; omissão da página de acordo em síntese das duas unidades; fechamentos incompletos e recusas de atendimento; pauta incompleta após perda da janela; três respostas `failed` por `codex_tool_disallowed` fora da amostra. Esse último código não comprova execução de ferramenta: o conteúdo bruto rejeitado não foi preservado e as ferramentas são desabilitadas no processo. A próxima correção precisa de diagnóstico e regressão específicos, preservando a rejeição segura.

O diff final de documentação e artefatos foi conferido contra o código congelado. Revisão independente e status checks do commit a integrar permanecem obrigatórios antes de qualquer merge; esta revisão do autor não os substitui. Sem implantação ou aprovação de operação real.
