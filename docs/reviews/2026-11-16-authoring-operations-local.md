# Controles operacionais da autoria — 16/11/2026

**Estado:** implementação e validação locais concluídas; sem IA real, dados reais ou produção.
**Escopo:** Spec 073 RQ-7316/7317, AC-7333–7337; Spec 072 RQ-7209/AC-7216.
**Fechamento da validação:** 17/11/2026; implementação iniciada em 16/11.

## Comportamento

Seis finalidades compartilham orçamento de quantidade/custo/concorrência da Spec 072, com
identidade por usuário/condomínio/chat/origem/etapa e payload. Valores são máximos fictícios,
não fatura. Resultado validado é salvo antes da conclusão do consumo; falha conserva compromisso
e retentativa recupera o resultado salvo sem reservar/chamar novamente. O cofre externo é
provisionado explicitamente; ausência não cria ledger vazio. Migration 043 amplia apenas a
função privada e exige manager para autoria, mantendo política desabilitada.

TTL começa na primeira origem e não renova em edição, confirmação, API nova ou restore.
Expiração e purga impedem uso/entrega. Exportação revalida inclusive fontes de revisões antigas;
purga segue pai → filhos, registra tombstones fora do dump e remove conteúdo dos eventos e
áudios relacionados em transação, preservando hashes/identidades e consumo. Colisões entre
identidades de áudio e rascunho são recusadas. Word/PDF original e derivados independentes ficam
preservados. Falha parcial mantém quarentena; manutenção explícita limitada reaplica decisões.

Instância própria do journal de metadados reutiliza as garantias já testadas de índice/checksum,
arquivo exclusivo, flush e rename atômico. No harness, journal/cofre ficam fora do dump SQL.
Não contêm texto, transcrição, token aberto ou resposta. Restore anterior ao envio sem resultado
confirmado não concede geração novamente, inclusive quando o banco voltou a não ter o pedido.

## Evidências locais

Unitários em `authoring-operations.test.ts`; regressões da autoria em `test:authoring`.
O ensaio PostgreSQL final passou em
`.local/pilot-operations/402663d0ae6d4eaf97b901db41c11628/authoring-proof.json`, com dois cenários
integrais e container próprio encerrado. Inclui as seis finalidades SQL, advisor negado, restore
anterior ao envio, consumo preservado, exportação/purga/TTL, Word intacto e orçamento de áudio.
Wrapper final: `container-b24b849a6b1e46f88ca420c7b2a10fdd/result.json`, com container encerrado.

A revisão própria incluiu fonte de revisão histórica, colisão de IDs, criação de filho durante
purga e metadados de áudio recente após expiração (inclusive se o prazo vence durante a consulta).
As regressões operacionais passaram com 17 casos. A rodada integral usa a candidata congelada de
20 arquivos em `source-manifest.json`; os testes anteriores à última correção permanecem nos logs.

Resultados globais, JSON/JUnit, cobertura e fechamento estão em `.local/authoring-operations/`.
`closure.json` exige os 14 gates efetivos aprovados, 20 hashes preservados e provas SQL atuais.
Comandos usam binários já instalados, testes/build com `envDir:false`, sem carregar `.env` como
configuração, instalar dependências, acessar banco remoto ou executar chamada de IA.

| Gate | Resultado final |
|---|---|
| Unitários globais | 2.660 aprovados em 210 arquivos, incluindo 17 casos operacionais |
| Cobertura unitária | statements 85,49%; branches 82,10%; functions 91,20%; lines 87,37%; quatro pisos de 80% atendidos |
| E2E globais | 261 aprovados em 42 arquivos, zero falhas |
| PostgreSQL real local | Dois cenários integrais aprovados; migration 043, seis finalidades, advisor negado, restore anterior ao envio, purga/expiração e originais preservados |
| Formatação, lint e tipos | Aprovados para os 20 arquivos com hashes preservados |
| Builds e runtime | API/web aprovados; runtime com dois PDFs e 20 perguntas sintéticas, zero chamadas de provedor |
| Evals | 20 principais, 50 documentais determinísticos, 26 de atas e 31 documentais gerais aprovados; modelos/revisores simulados onde aplicável |
| Alinhamento | Gate estrutural aprovado para 73 specs; fatia revisada com briefing e estratégia |
| Scanner completo | Aprovado após os testes; nenhum padrão conhecido encontrado, escopo original preservado |

Nenhuma exclusão de cobertura ou scanner foi acrescentada. A rodada final fechou com todos os
14 gates em exit code zero; os hashes dos 20 arquivos permaneceram os mesmos. As 50 avaliações
semânticas documentais e a revisão especializada da base continuam pendentes; os mocks não
medem a qualidade de uma IA real.

A revisão própria do diff desta tarefa inclui os arquivos novos, chamadores e a baseline
preservada em `.local/authoring-operations/baseline/`. Corrigiu as guardas de leitura no fim
da consulta, fonte histórica na exportação, colisão de identidade e filho concorrente à purga,
com regressões correspondentes. Não identificou P0/P1 remanescentes nesta fatia; não substitui
revisão independente do branch ou CI remoto.

As rodadas anteriores ficaram registradas em `verified-*` e `interrupted-gates.json`. Uma delas
teve timeout de cinco segundos no E2E preexistente AC-6510/6511. O arquivo passou isoladamente
e na rodada integral final, sem alterar timeout/assertivas. O fechamento usa `final-*`, contra
os mesmos hashes da candidata final; interrupções de sessão não contam como gate aprovado.

## Limites

Composição exclusivamente sintética/injetável; o startup não fornece modelos/controles ou
política positiva. Não há agendamento ativo, escolha de prazo/moeda reais, custódia aprovada,
backend de arquivo público, fornecedor, cobrança ou nova dependência. Manutenção opera por
contexto autorizado; plano privilegiado e custódia/recuperação do destino real continuam gates
próprios. Não há reconciliação de consumo por mera passagem de tempo, refund presumido ou
reabertura de serviço. Qualidade real de IA, CI remoto e revisão independente do branch continuam
pendentes; Spec 073 permanece em andamento. Sem commit ou merge nesta tarefa.
