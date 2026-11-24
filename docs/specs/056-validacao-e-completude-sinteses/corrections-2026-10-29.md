# Continuação das correções Luna/Sol 6.1 — 29/10/2026

Primeira etapa implementada no fluxo compartilhado da Alvitra. Os resultados históricos da
comparação de 79 posições não foram recalculados. Não houve treinamento, troca de modelo,
mudança do system prompt ou execução de outra bateria de 280 cenários.

## Correções entregues

- Validação monetária associa receitas, despesas e resultado às competências e colunas da mesma
  tabela. Três competências consecutivas citadas sustentam seus totais; saldo e taxa não herdam
  esse suporte. Valores, sinal e período incorretos continuam recusados. Cabeçalhos de mês/caixa,
  negrito, notas de rodapé e números sem separador de milhar têm regressão.
- Menção não confirmada e ausência de comprovação de mudança são tratadas na cláusula pertinente.
  Espaço após ponto e vírgula/“mas” não impede reconhecer a negação; outro fato monetário afirmado
  continua validado.
- A cobertura reconhece a coluna de resultado sem exigir repetição numérica em prosa. Pedido
  recente para adicionar fechamento trimestral permanece aspecto próprio; exclusões prevalecem.
- Renovação com data final explícita exige essa data ou lacuna específica. Datas numéricas,
  ISO e por extenso são comparáveis, sem inferir vigência atual. Mandato, votação pertinente e
  condições de reserva recebem verificações próprias quando as páginas estão no contexto.
- Envelope JSON dentro da fala e motivo que contradiz explicitamente a necessidade do especialista
  são recusados. A única tentativa de reparo recebe orientação interna controlada; a confirmação
  baseada em minuta recebe o contrato explícito de interpretação citada e proposta não confirmada.
  O servidor não converte tipo, modo, indicador ou texto para aprovar uma resposta.

Preservados oito turnos, 12.000 bytes UTF-8 de contexto, oito fontes e duas tentativas no mesmo
modelo/esforço. Não houve alteração de persistência, recuperação, banco ou destinos de dados.

## Contraprovas com os modelos

Dados exclusivamente sintéticos, snapshot por rodada, perguntas/fontes iguais por entrada,
Luna high e Sol 6.1 low. Replay de inputs previamente verificados; não reexecuta retrieval,
HTTP, persistência ou a aplicação final da política de risco do caso de uso.

| Rodada | Luna: respostas validadas | Sol 6.1: respostas validadas | Tentativas com usage | Créditos equivalentes conhecidos |
|---|---:|---:|---:|---:|
| R4 — sete entradas por modelo | 4/7 | 6/7 | 20 | 6,7501125 |
| R5 — quatro entradas por modelo | 2/4 | 3/4 | 13 | 4,6582645 |

Validação estrutural não equivale a resposta satisfatória. A R4 encontrou falsos bloqueios na
negação e nos cabeçalhos; a R5 revelou totais por rubrica e estilo de apresentação. Os ajustes
posteriores foram verificados offline, conservando todas as recusas dessas rodadas. O caso
contratual R4/Luna inclui o vencimento, mas ainda omite o preço da versão assinada na comparação.

Na R5, o Luna reparou a claim baseada em minuta e passou a explicitar proposta não confirmada.
O Sol terminou o fechamento trimestral com `codex_tool_disallowed`: esse código não identifica
por si só qual item foi emitido. A falha permanece operacional, mesmo havendo candidato textual
analisável. Não alterar as permissões do gateway para aprovar o ensaio.

A tentativa inicial no sandbox parou após duas falhas de processo, sem usage. A repetição local
autorizada foi registrada separadamente. Total conhecido dos ensaios: **11,408377 créditos
equivalentes**, mais duas tentativas com consumo desconhecido; não é fatura ou medição de franquia.
Engenharia/auditoria deste chat não é consumo atribuível aos ensaios.

Artefatos: [R4](../../../reports/conversations-corrections-056-r4-live-access.json),
[R5](../../../reports/conversations-corrections-056-r4-r5-access.json),
[tentativa inicial](../../../reports/conversations-corrections-056-r4-live.json).

## Revalidação posterior e limites

A revalidação offline conferiu hashes e analisou o último candidato de 88 checkpoints das
rodadas R2, R3, R4 e R5 com os validadores atuais, sem novas chamadas de modelo. Ela reproduz a
correção dos bloqueios financeiros dos dois modelos e da negação monetária; também continua
recusando o JSON e a justificativa contraditória preservados. Um candidato aceito offline não
substitui uma resposta originalmente recusada nem uma falha de processo.

Ver [diagnóstico por checkpoint](../../../reports/conversations-corrections-056-r4-offline-final.json).
É revisão técnica por IA pelo autor, sem revisão independente, jurídica ou contábil. Não mede
acurácia global nem certifica segurança semântica universal.

Continuam pendentes: recuperação das páginas ausentes de acordo, detalhes de negociação/encargos,
completude de preços em certas comparações, formulações semânticas inadequadas como chamar o
resultado total de “ordinário”, e o histórico durável/replay documental da Spec 058. A nova
comparação completa dos modelos deve usar uma única versão atual da aplicação e conservar os
casos e controles históricos.

## Verificação de engenharia

Foram acrescentadas **51 regressões**, incluindo controles negativos de dinheiro, período,
fonte, tipo, modo, escopo, data e limite de tentativas. Suíte completa do workspace, incluindo E2E: **1.650
testes em 165 arquivos**, todos aprovados. Cobertura: statements **92,46%**, branches **88,37%**,
funções **97,16%**, linhas **94,06%**. Sem exclusão de cobertura ou enfraquecimento de asserção.

Lint, tipagem, formatação, scanner de segredos, 20/20 evals legados e 50/50 documentais
determinísticos aprovados. As 50 avaliações documentais semânticas e revisão profissional
continuam pendentes. Não houve alteração de banco/schema que exigisse integração externa nova.

O Corepack tentou baixar o pnpm e falhou por DNS no sandbox. Foram executados os mesmos comandos
pelos binários instalados em `node_modules`; TEMP/TMP ficaram no diretório privado da tarefa
após EPERM no temporário padrão. A cobertura usa dois workers e teto do harness de 20s por teste
e 30s por hook; as asserções e limites específicos dos cenários foram preservados.

Proveniência, gates e revisão: [revisão do autor](../../reviews/2026-10-29-continuacao-correcoes-luna-sol.md)
e [registro verificável](../../../reports/conversations-corrections-056-r4-verification.json).
