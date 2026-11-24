# Revisão cruzada — extensão operacional de manutenção

**Data:** 11/11/2026. **Revisor por IA:** Segurança, sem autoria dos nove arquivos operacionais
desta candidata. **Resultado:** nenhum defeito novo concreto confirmado nesse escopo. Não aprova
o checkout inteiro nem os módulos de controle escritos pela própria Segurança.

**Adendo da candidata r2:** dez entradas de
`.local/pilot-operations/maintenance-candidate-2026-11-11-r2.json` conferidas. Os cinco deltas
foram relidos: configs operations/RLS com `envDir:false`, teste com canário temporário/controle
positivo e os exemplos correspondentes em Spec 070/aceitação. Runners, wrapper e ADR continuam
idênticos; não surgiu defeito novo nesse delta. Os **12 casos do arquivo operacional** passaram
na seleção `crossreview-final-replay-1794420780666-11472/results.json`, sob `envDir:false`.
A seleção completa então tinha uma falha independente de replay documental (40/41), preservada
e depois corrigida; esse resultado não é apresentado como gate global aprovado. O mapa r2
identifica a granularidade e os hashes novos. A validação SQL atual do dono inclui RLS com a
guarda explícita e nova manutenção após o ajuste do callback; não foi repetida integralmente aqui.

**Atualização documental em 11/11:** os dois gatilhos de purga citados no fim deste relatório
foram corrigidos e suas contraprovas SQL passaram, com assertivas preservadas. O dono repetiu
o percurso SQL amplo 2/2 na candidata documental r2 (`container-911401d9b83548b58e82029a849a8fdd`,
encerrado); o delta de retenção foi também revisto independentemente pela Infraestrutura.
O último parágrafo abaixo registra a situação histórica, não um achado ainda aberto.

## Escopo e versão

Foram lidas as nove entradas de `.local/pilot-operations/maintenance-candidate-2026-11-11.json`,
capturada às 14:49:29 -03:00: fontes completas dos três runners TypeScript e wrapper PowerShell,
teste de guardas, configuração, Spec 070, aceitação e ADR 0042. Os hashes foram conferidos antes
e depois dos testes independentes e permaneceram iguais. A captura própria e o mapa estão em
`.local/pilot-security/infrastructure-maintenance-{review-before,cross-review}-20261111.json`.

Foram confrontados confirmação/loopback/nomes antes de conectar, criação exclusiva de destinos,
ambiente mínimo, ferramentas locais sem pull, recibo externo exclusivo/flush que vincula
destino/rodada/snapshot antes da conexão do auxiliar e marcador de quarentena criado pelo
orquestrador. O plano usa os controles dos donos, sem política própria ou reabertura; o runner
confere integridade, repetição, revogação, consumo e outro tenant. O wrapper confere a identidade
antes de encerrar somente seu container. Relatórios/erros não repetem saída nativa sensível.

## Verificação

- **11/11 testes de guardas repetidos por Segurança**, com ambiente mínimo/cache/temporário
  próprios: `.local/pilot-security/crossreview-operation-guards-1794419978142-19976/results.json`,
  JUnit adjacente. Incluem entradas remotas/sem confirmação, config ausente e vínculo de destino
  ausente/divergente negados antes de recursos/conexão. Não foi iniciado Docker por esses testes.
- **Prova SQL do dono conferida:** wrapper
  `.local/pilot-operations/container-46290f5b31ee4966a6772b806268c68b/result.json`, filho
  `5fbf44da245c4b21aa297056f6e394b8/`. Asserções e recibos de restore/manutenção foram lidos;
  hashes dos runners/controles/callback coincidem com os inputs registrados nessa prova.
  Nove recibos, seis chamadas, unknown/login, histórico e B preservados; container encerrado.
  Não repeti integralmente esse SQL nesta revisão. A prova de seis cenários SQL da Segurança
  é uma execução distinta e não substitui a revisão independente de sua própria autoria.

## Limites

Esta revisão cobre o delta operacional publicado, além da revisão anterior de Documentos dos
46 arquivos da candidata original. Não se atribui a Segurança a revisão independente de seus
próprios módulos importados pelo runner. Não certifica retenção/fornecedor/semântica de IA,
CI, serviço remoto, merge ou dado real.

Os achados documentais de original órfão e espera circular em duas purgas continuam em
`2026-11-11-pilot-documents-security-review.md`. A fixture positiva do runner não reproduz esses
estados; seu sucesso não fecha os achados nem congela a candidata global. A próxima mudança
do callback ou de outro input exige conferir os gates afetados e atualizar a cobertura por hash.
