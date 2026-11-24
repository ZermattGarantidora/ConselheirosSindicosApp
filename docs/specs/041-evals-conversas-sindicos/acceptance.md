# Aceitação — Spec 041

| ID | Requisito | Exemplo verificável |
|---|---|---|
| AC-4101 | RQ-4101 | Ler arquivos paginados, validar tenant/versão/marcador/hash e conciliar os três balancetes; arquivo ausente ou página inválida falha. |
| AC-4102 | RQ-4102 | Dataset contém 15 casos por cada um dos 14 temas e 30 transversais; perguntas iniciais únicas, gabaritos específicos e casos com vários turnos. |
| AC-4103 | RQ-4103 | Executar endpoint com as fontes do turno; capturar apenas evidência autorizada efetivamente enviada; citação inventada ou de outro tenant reprova. |
| AC-4104 | RQ-4103 | Turnos consecutivos usam o mesmo chat e persistência; documento disponibilizado no segundo turno não existe no primeiro; gabarito não entra na entrada do gateway. |
| AC-4105 | RQ-4104 | Sem gateway há zero respostas; replay sintético preserva respostas e falhas, mas qualidade semântica e notas continuam pendentes. |
| AC-4106 | RQ-4104 | Relatório agrupa temas e expõe denominadores, falhas, abstenções, escalonamentos e revisão por turno sem fabricar notas ou custo efetivo. |
| AC-4107 | RQ-4103 e RQ-4104 | Rodada explicitamente autorizada em 27/10 usa o gateway/modelo do chat, registra configuração, fingerprints e respostas por cenário; falhas reais são preservadas, sem fallback pago, sem mudança de prompt/retrieval durante a medição e sem confundir análise por IA com revisão especializada. |
| AC-4108 | RQ-4105 | Preservar integralmente os 240 casos/260 turnos e seu hash anterior; acrescentar 40 IDs estáveis com dez roteiros de cada comprimento 10, 15, 20 e 30, totalizando 280 cenários e 1.010 turnos. Cada pergunta e gabarito são específicos ao roteiro, sem preenchimento por repetição. |
| AC-4109 | RQ-4105 e RQ-4103 | Replay de uma conversa de 30 turnos conserva chat, limita memória e não injeta histórico na pergunta; envio/retirada de arquivo altera de fato as fontes recuperáveis, troca de condomínio não transporta histórico e revogação tardia retorna 403 sem gateway. |
| AC-4110 | RQ-4105 e RQ-4104 | Preparação e replay separam baseline/longos e comprimentos; todos os 1.010 turnos têm revisão especializada pendente. Seleção de apenas 240 casos não aprova a suíte ampliada, e relatórios antigos continuam verificáveis sem alteração. |

Comandos: `pnpm run evals:conversations`, `pnpm run evals:conversations --synthetic`,
`pnpm run check`, `pnpm run test:e2e`, `pnpm run evals`, `pnpm run evals:documentary`.
