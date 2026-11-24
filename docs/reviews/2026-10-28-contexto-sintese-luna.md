# Revisão do autor — contexto e preparação Luna

**Status:** revisão do autor e gates locais concluídos.  
**Escopo:** Spec 052; não é aprovação independente para merge.

## Mudanças revisadas

Diff completo desta fatia contra `.local/luna-quality-baseline/` nos arquivos existentes: memória, caso de uso, enum de validação, seleção de condições do runner, comando e documentação. Novo módulo `answer-task-context.ts` e as 22 regressões foram lidos integralmente. Mudanças concorrentes de upload na interface não foram editadas nem revertidas.

- Foco deriva de perguntas literais da janela, permanece não privilegiado e não altera histórico ou pergunta atual.
- Orçamento inclui turnos e foco; não há nova leitura, estado persistente, resposta documental reaproveitada ou log textual.
- Falta de fonte financeira não confunde taxa de salão com saldo e preserva baixa qualidade como causa distinta; perguntas compostas conservam fontes úteis.
- Menção à CCT em contrato não conta como instrumento coletivo; título reconhecido não comprova aplicabilidade ou vigência.
- Cobertura lexical limitada aos tópicos explícitos na resposta principal, com controles de exclusão e ambiguidades lexicais. Não substitui avaliação semântica.
- Correção geral não excede duas tentativas; revalida acesso antes de cada geração e antes de persistir. Claims/citações inválidos e conteúdo protegido continuam recusados; falha sem telemetria continua identificada como tal.
- Condição Luna não tem roteamento e foi testada com processo sintético inclusive em alto risco; o plano não executa modelos por padrão.

## Verificações

As 22 regressões novas passaram. Tipagem, lint, formatação e gate de visão de 52 specs passaram. Fonte do system prompt tem hash idêntico ao início. Não houve chamadas reais a modelos, alteração de `.env.local`, dependência, provedor, schema, migração, commit, merge ou publicação.

A suíte ampla foi repetida após falha de teste da interface concorrente e colisão sobre temporário de cobertura. A saída final fica em `.local/luna-quality-coverage-final`, isolada do diretório que outra suíte limpa. Os logs anteriores foram preservados; testes sintéticos não foram convertidos em aprovação semântica.

Suíte final aprovada: 153 arquivos/1.370 testes; os 22 novos testes desta fatia estão incluídos, assim como testes de upload do trabalho concorrente, preservados. Statements 91,89%, branches 87,39%, funções 96,79%, linhas 93,59%. Novo módulo: 100% nos quatro indicadores. Os limites, timeouts e asserções não foram reduzidos para obter aprovação. O resultado final tem código de saída zero; logs anteriores preservados. O plano executável confirma uma condição Luna, 280 cenários/1.010 turnos e zero chamadas, com hashes históricos dos dados intactos.

Scanner de segredos final aprovado, sem padrão conhecido encontrado (`.local/luna-quality-secrets.log`). Revisão final do diff, tipagem, lint, formatação, visão e verificação de whitespace concluídas. Os comandos instalados foram usados diretamente devido à indisponibilidade anterior de Corepack/pnpm; nenhuma dependência foi instalada. A implementação não altera autorização ou SQL, e não exigiu integração destrutiva de banco. A revisão é do autor e não autoriza merge.

## Limitações

Referências fora da janela podem continuar sem solução automática. Classificação lexical pode falhar ou rejeitar uma formulação legítima. A correção de validação pode aumentar consumo e precisa ser medida. As regras não confirmam fatos, regularidade ou validade jurídica. [Resultados e plano da próxima bateria](../specs/052-contexto-sintese-abstencao/implementation-results-2026-10-28.md) registram essas condições. A próxima bateria real somente Luna permanece pendente de solicitação do usuário.

## Bateria posterior solicitada e revisão dos resultados

O parágrafo anterior descreve a entrega inicial. Após a solicitação explícita, `2026-10-28-luna-quality-r1` concluiu 280 cenários/1.010 turnos somente Luna com memória, sobre snapshot congelado. Nenhum código de produção, prompt ou oráculo foi alterado durante a execução; as alterações desta etapa são relatórios e documentação.

A revisão dos resultados conferiu 280 checkpoints, hashes dos casos/fontes/entradas, modelo Luna, memória de até oito interações/12.000 bytes, fontes do tenant correto, duas tentativas máximas e ausência de geração após 403. As 80 decisões estão vinculadas aos hashes das respostas; uma exclusão prévia permanece, resultando em 79 comparáveis. Foram lidas as respostas e citações dos alvos; decisões iniciais de três calibrações continuam em `revisions`.

Métricas consolidadas: 58 satisfatórias/14 parciais/7 falhas de tarefa, zero operacionais na amostra; zero falhas mecânicas e zero modo failed no conjunto completo. 1.170 tentativas com usage completo, 21,860563 créditos equivalentes; subtotal anterior21,685691 com cinco tentativas desconhecidas. O ganho de8,9pp não oculta cinco regressões parcial→falha e uma satisfatória→parcial; finais longos apenas23/40. A guarda de cobertura não registrou `task_coverage_missing`, apesar das omissões revisadas.

O [relatório completo](../specs/052-contexto-sintese-abstencao/observed-results-2026-10-28.md), artefatos JSON, plano, atualização de status/aceitação, README e rastreabilidade foram revisados quanto a escopo, denominadores, custos e limites. O histórico não foi reescrito. Esta revisão é do autor, não aprovação independente ou liberação de produto. Os gates locais de1.370 testes e cobertura pertencem à implementação anterior; nenhum código foi alterado para repetir a bateria. Gates finais de documentação e scanner são registrados no relatório após execução.

Fechamento desta etapa: gate de visão aprovado para52 specs, scanner sem padrão conhecido encontrado, verificação dos artefatos e whitespace aprovados. Sessão da bateria encerrou com código zero e `complete=true`. Logs e limitações registrados no relatório; nenhuma correção de código ou redução de asserções para mudar a pontuação.
