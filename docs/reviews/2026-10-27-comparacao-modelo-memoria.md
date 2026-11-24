# Revisão do autor — comparação de modelo e memória

- **Status:** revisão técnica do autor concluída; não substitui aprovação independente para integração.
- **Escopo:** Spec 050, runner em `evals/conversation-comparison/`, opção explícita de memória
  no replay da Spec 041, testes de comparação e registro do comando/documentação.
- **Autor e revisor técnico:** Codex; sem revisor independente nesta tarefa.
- **Execução avaliada:** `2026-10-27-sol-luna-memory-r1`, snapshot
  `79086ed3b422f0622757f00a14391604e17b2259bdb2d6955a0391cf084f83f4`.
- **Data:** 2026-10-27.

## Verificações do código

O plano padrão não infere. A execução real exige o gateway local autorizado e não oferece
fallback para API paga. As quatro condições têm parâmetros explícitos; desligar memória
não altera variável global. A ordem gira por cenário e o snapshot evita incorporar
alterações concorrentes do checkout. A cópia não inclui ambiente, autenticação ou dependências.

Checkpoints têm hash de conteúdo/configuração/caso e retomada incompatível é recusada.
O diagnóstico de retomada do smoke reutilizou quatro casos sem gerar; uma cópia adulterada
foi rejeitada antes de chamadas externas. Os resultados originais foram preservados.

O observador mede o transporte antes do parser, conservando usage de gerações posteriormente
recusadas. Erros arbitrários e stdout/stderr não são copiados para observabilidade. Cache
é parte da entrada total e não soma duas vezes. Uso ausente permanece desconhecido e
`billedCost` nulo. A revisão semântica técnica não preenche os formulários dos especialistas.

## Gates executados

- Formatação completa, ESLint, TypeScript e visão de 50 specs: aprovados pelos executáveis instalados.
- Vitest com `--coverage --maxWorkers=2 --coverage.reportsDirectory=coverage/comparison`:
  148 arquivos/1.289 testes aprovados; statements 91,58%, branches 87%, functions 96,66%, lines 93,38%.
- Evals básicos: 20/20; documentais determinísticos: 50/50, sem inferência externa.
- `pnpm run check`: não iniciou os componentes por falha DNS no download do pnpm pelo Corepack.
- Scanner canônico: primeira tentativa interrompida por `ENOENT` em diretório efêmero do Codex
  removido durante o benchmark. A reexecução após o fim da matriz passou sem padrão conhecido.
- Gate final de 50 specs e `git diff --check`: aprovados.

## Limites e pendências

A matriz real terminou com 1.120/1.120 conversas e 4.040 turnos, snapshot íntegro e zero
falhas mecânicas. Uma chamada Luna com memória registrou timeout sem
usage; esse custo é desconhecido. Latências de parede incluem execução local concorrente e
uma interrupção temporal observada, sem atribuição exclusiva ao tempo de serviço do modelo.

A auditoria técnica concluiu os 80 alvos pré-fixados por condição, com um oráculo em revisão excluído
uniformemente das taxas técnicas. Não é amostra aleatória, taxa global, avaliação independente
ou aprovação de produção. O gate de três rodadas e revisão especializada segue pendente.

Na amostra de 79 posições válidas, Sol off/on teve 40/56 satisfatórias e Luna off/on 30/43.
Nos 40 fechamentos longos, Sol com memória teve 22 satisfatórios. Os resultados não aprovam
rollout: há falsificação numérica aceita por Luna, continuação de emergência com risco baixo
na aplicação e falhas de recuperação/validação. O teste encontrou bloqueios reais de qualidade.

As falhas do aplicativo/modelo encontradas pelo experimento são registradas no relatório da
Spec 050; não foram corrigidas durante a medição para preservar a comparabilidade.
Alterações de outras tarefas no checkout não pertencem a esta revisão.

## Decisão

Não houve merge, publicação ou troca da configuração do aplicativo. A conclusão desta tarefa
é a medição exploratória e seus artefatos, mantendo separada a aprovação de qualidade para uso.
O diff desta fatia foi revisado integralmente: novo runner/protocolo/observador/snapshot,
controle de memória no replay, testes e documentação. Não há achado P0/P1 identificado no
harness novo; os bloqueios de qualidade das respostas permanecem registrados, sem escondê-los
por uma média ou promover as revisões técnicas a aprovação especializada.
