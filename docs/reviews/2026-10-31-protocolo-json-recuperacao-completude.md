# Revisão do autor — correções da Spec 060

- **Status:** revisão do delta final de implementação e resultados concluída; não autoriza merge.
- **Base:** cópia do workspace antes desta etapa em `.local/corrections-060/baseline`.
- **Diff:** `.local/corrections-060/delta.diff`, gerado por comparação de conteúdo; mudanças preexistentes preservadas.
- **Revisor:** Codex, autor, com a skill `code-review`; revisão independente pendente.
- **Data:** 2026-10-31.
- **P0/P1 abertos no delta:** zero identificados após corrigir os dois P1 confirmados na bateria intermediária.

## Escopo revisado

Protocolo CLI e diagnóstico, schema documental, fala geral/documental, seleção de páginas,
completude e foco por período/referência, cálculo de diferença anual, contratos do runner,
regressões e documentação. Sem alteração de persistência, migração, system prompt, corpus,
oráculos, orçamento ou autorização. Esta revisão cobre somente o delta desta etapa, não aprova
todo o branch acumulado.

## Achados corrigidos e limites

Achados confirmados após a revisão inicial e corrigidos após preservar a rodada congelada:

- A reserva de proposta escolhe o cabeçalho “cotas e acordos” da página de principal e pode perder a
  página de proposta já ranqueada. A reserva agora prioriza indicadores do trecho de proposta;
  as duas regressões com IDs distintos falham antes e passam depois da correção.
- A inferência de referências a partir da fonte interpreta “data-base” como unidade e exige seu
  estado de acordo; respostas úteis da rodada anterior passam a ser recusadas. Regressões incluem
  metadados hifenizados e unidades reais que não podem desaparecer da validação. A inferência
  pelas fontes agora exige identificação de unidade ou linha financeira. O extrator global de
  entidades não foi ampliado; omissões de assinatura/pagamento das unidades reais continuam recusadas.

A rodada intermediária permanece preservada. Os cinco casos novos/ampliados que falharam antes
passam na correção, e os 22 testes direcionados passam. A consulta recente completa passa a
incluir a página de proposta nas oito fontes; respostas úteis da rodada anterior não são mais
recusadas por “data-base”. Essa revalidação offline não altera notas históricas. A nova bateria
060b valida código diferente, sem substituir respostas ruins da rodada que revelou os defeitos.

- Restringir apenas os IDs de uma claim factual incentivou um candidato a citar a versão errada.
  O schema final exige interpretação em toda a comparação com fonte pendente, sem transformação
  posterior; regressão impede claim factual mesmo com ID confirmado nesse contexto.
- A equivalência do resultado financeiro não era reconhecida e uma tarefa sobre julho herdava
  comprovante de agosto. Agora a competência corrigida e a expressão de diferença são verificadas
  separadamente das guardas de valor, período e reserva.
- O impacto anual correto da diferença entre versões era recusado. A regra nova exige versões do
  mesmo contrato e período explícito; controles negativos conservam rejeição de valor errado,
  outro instrumento e valor anual rotulado mensal.
- JSON com `response` e exemplos adjacentes não era rejeitado; a assinatura é detectada sem
  extrair ou reclassificar a saída. Evento posterior ao fim também é recusado.
- A página de acordo podia desaparecer em pergunta plural sem IDs; a reserva usa somente o
  conjunto já autorizado e ranqueado. Referência singular corrigida mantém seu principal.

As três falhas históricas de protocolo não foram reproduzidas nas quatro contraprovas anteriores
à correção. Suporte a evento passivo e diagnóstico não demonstram sua causa original. Não há
afirmação de execução de ferramentas ou validação profissional.

## Validação

1.717 testes de unidade/E2E aprovados, cobertura de statements 91,36%, branches 87,37%, funções
96,11% e linhas 93,08%; 15 integrações sintéticas aprovadas. Formatação, lint, TypeScript, build
web e evals determinísticos aprovados. Os 50 casos documentais semânticos específicos continuam
pendentes de revisão própria. A bateria intermediária 060 concluiu 560 cenários/2.020 turnos e
160 registros auditados, preservados no relatório intermediário. A bateria final 060b também
concluiu 560 cenários/2.020 turnos e 160 registros auditados no snapshot
`0317dc2309c3f47fbc10872b5ccc6f259cce31dfb799315e0ad118878be07115`, sem divergências de integridade,
autorização, isolamento ou orçamento. Os arquivos exportados correspondem aos checkpoints.

Na amostra de 79 posições comparáveis, Luna high teve 71S/7P/1F (89,9%) e Sol 6.1 low,
76S/3P/0F (96,2%). Permanecem omissões e três respostas em modo `failed` com evento
`item.started/mcp_tool_call` recusado: duas no Luna e uma no Sol; uma integra a amostra Luna.
O diagnóstico não registra eventual efeito externo nem prova a causa das falhas antigas.
Esses eventos não foram aceitos como passivos nem promovidos a resposta. A limitação operacional
permanece explícita na demonstração pessoal/sintética; não há autorização de produção.

O [relatório final](../specs/060-protocolo-json-recuperacao-completude/results-2026-10-31.md)
preserva parciais, falhas, tentativas e custos das duas versões. A conferência de consumo conserva
os 24 grupos anteriores e acrescenta somente os quatro grupos da checagem e bateria finais;
nenhum grupo duplicado. Revisão independente, CI do commit a integrar e revisão profissional
continuam pendentes.

Sem merge, implantação, reinício do aplicativo do usuário ou migração do banco principal.
