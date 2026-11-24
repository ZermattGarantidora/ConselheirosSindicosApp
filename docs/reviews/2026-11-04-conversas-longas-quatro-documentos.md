# Revisão do autor — conversas longas com quatro documentos

- Autor/revisor: Codex; revisão técnica por IA, não independente.
- Data: 04/11/2026.
- Escopo: extensão da Spec 064, sem mudança de produção, merge ou deploy.
- P0/P1 identificados e pendentes no delta do harness: zero.
- Falhas funcionais do produto: permanecem abertas, descritas nos resultados; não equivalem
  a aprovação de qualidade do fluxo longo ou de lançamento.

Revisados integralmente os novos long-cases.ts, long-assessment.ts, run-long.ts e
demo-long-conversations.test.ts, além dos deltas de comando, README, AGENTS, spec, aceitação,
rastreabilidade e relatório. O corpus e a fixture de upload existentes foram reutilizados.
Alterações anteriores do workspace foram preservadas.

O roteiro usa 30 turnos em um chat por modelo/cenário. A sequência contém falas realmente
produzidas por cada modelo e o gabarito permanece fora do gateway. O runner não força memória
integral, amplia fontes ou substitui a resposta recusada. Concorrência até quatro, dentro do
limite previamente documentado; snapshot e hashes protegem fontes/corpus/checkpoints.

Uma conversa parcial bloqueia reinício silencioso. As seis completas foram retomadas sem
instanciar fixture/gateway ou fazer inferência; conteúdo e mtime de 190 arquivos permaneceram
inalterados. A retomada não reavalia respostas com o detector posterior.

Foi encontrado e corrigido um defeito do avaliador: um fallback conversacional com texto
não vazio podia receber nota automática completa. A correção consulta apenas o diagnóstico
terminal existente, mantém a recusa como falha a revisar mesmo quando a mensagem menciona
limite de contexto e conserva sucesso sem diagnóstico. Teste de regressão foi acrescentado.
Nenhum validador de produção foi relaxado e nenhum resultado medido foi sobrescrito.

As 180 respostas foram lidas e as exceções classificadas separadamente do score automático.
Dois marcadores visuais do Luna são parciais por apresentação, não falhas de fato; o prazo
do Sol é uma associação ambígua entre texto e quadro da ata, não data inventada. A abstenção
correta de memória distante foi separada do bloqueio de lembrança próxima com nota visível.
Notas menores de foco e de pedidos de páginas foram explicitadas para tornar a rubrica revisável.

Testes verificam protocolo, limites, distinção de presença/ausência de memória e integração
real de dois turnos no journal e ausência de contexto no outro chat. Os seis históricos reais
também passaram nas 18 conferências literais e nos controles de chat vazio/usuário 403.
Não houve teste de reinício/restauração durável nesta bateria, portanto não se declara o gate
de lançamento da Spec 058 como atendido.

O gate pnpm run check passou: 2.053 testes em 183 arquivos, formatação, lint, TypeScript,
64 specs e scanner de segredos. Cobertura: statements 91,85%, branches 88,33%, funções
96,36%, linhas 93,43%. Os resultados estão no [relatório da Spec 064](../specs/064-demonstracao-quatro-documentos/long-results-2026-11-04.md).
Sem novo provedor, dependência, schema, dados privados em fixtures ou inferência na sessão
manual. Os 151 arquivos de produção do manifesto anterior mantiveram seus hashes.
API não reiniciada; não houve commit, merge ou autorização de integração.
