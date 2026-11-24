# Revisão cruzada documental — continuação de 11/11

**Estado:** revisão delimitada da r4 e gates locais concluídos. Revisor por IA: Segurança.
Não inclui aprovação independente dos controles/SQL/testes escritos pela própria Segurança.

**Fechamento atual r4:** 96 entradas conferidas sem diferença; mapa vigente
`pilot-documents-security-coverage-2026-11-11-r5.json`. Os seis deltas de fonte/contrato/testes
foram relidos. **27/27** afetados passaram em `extension/1794424012186-20868/results.json`;
contraprova independente do startup arquivado passou com fonte 404 após arquivo 204.
Versão histórica ativa, recuperação, trecho histórico/sourceRemoved, replay negado durante
arquivo e tenant B são mantidos. Nenhum P0/P1/P2 reproduzido permanece aberto neste escopo.
Mapas e relatos anteriores são históricos. Excluem-se autoria própria e a interface completa;
isso não aprova o checkout inteiro, CI, merge ou uso real. Captura global r4/gates finais
foram aprovados separadamente em `2026-11-11-pilot-integration-local.md`, com 910 entradas
sem mudança; a leitura deste relatório, isoladamente, não substitui essa execução.

**P2 reproduzido por Infraestrutura:** o leitor novo entrega a página integral após documento
arquivado e ausente do catálogo, inclusive no startup demo. Contrato Spec 020/RQ-2006/AC-2007:
conservar trecho histórico, negar leitura da página removida. Vermelhos em
`.local/pilot-operations/full-review/upload-source-archive-startup-{red,proof-red}-2026-11-11.json`.
Documentos assumiu correção delimitada r4 para catálogo ativo e testes de arquivo/recuperação/B.
Os mapas r3/r4 abaixo descrevem as leituras anteriores; não fecham esse achado posterior.

**Contraprova verde do startup conferida:**
`upload-source-archive-startup-proof-green-2026-11-11.json` registra fonte 200, arquivo 204,
fonte 404 e ausência no catálogo; um teste independente passou. O novo contrato privado
`createSourceReader(catalog)` exige catálogo ativo além da página integral/escopo/permissão.
Fonte e testes foram relidos: versão histórica de documento ainda ativo continua legível,
arquivo nega ambas as versões, recuperação restaura leitura e tenant B permanece igual.
O E2E preserva trecho histórico com `sourceRemoved:true` e nega replay corrente enquanto
arquivado. Candidata r4/hash e bateria final serão conferidos antes do fechamento.

**Adendo atual r3 — primeira consulta ao upload:** sete deltas da r2 relidos integralmente e
96 entradas conferidas; mapa atual `pilot-documents-security-coverage-2026-11-11-r4.json`.
O E2E global reproduziu 403 porque a busca dinâmica conhecia o PDF novo e o leitor seed não.
O novo leitor privado da memória armazena a página integral processada e exige tenant,
documento, versão, página e permissão; o startup demo o compõe com seed/legislação. Mantém
fontes pending para conferência/conflito, sem promovê-las a vigentes nem mudar o leitor SQL.
As duas unidades novas conferem última linha de página com vários chunks e negativos de
escopo/permissão/IDs. O E2E antigo preservou 200/citação e ganhou replay idêntico e abertura
da fonte com negativa de outro tenant. **26/26 afetados passaram pelo dono** em
`extension/1794423446019-26084/results.json`; tipos/lint/visão também passaram. Sem achado
reproduzido aberto nessa seleção; check/E2E globais serão repetidos na captura r3 congelada.
O mapa separa oito dependências sem diff, assets, autoria própria e leitura parcial da interface.

**Captura histórica r2 conferida:** 95 entradas de
`.local/pilot-documents-2026-11-11/candidate-source-hashes-2026-11-11-r2.json`, todas iguais por
SHA-256. Mapa atual: `pilot-documents-security-coverage-2026-11-11-r3.json`; os mapas anteriores
são históricos. Registra separadamente nove dependências sem diff contra a base, dois assets
sintéticos conferidos por gerador/manifesto/testes, duas regressões escritas por Segurança e
trechos compartilhados excluídos da independência. Em `App.tsx`, somente `conversationFetch`
e seu contrato foram revisados aqui; a interface completa pertence ao mapa de Infraestrutura.
Não é aprovação do checkout inteiro nem autorização de merge.

O delta final de retenção foi relido integralmente: sem observador, configurar o tenant só
antes de cada purga; com observador, preparar todos antes do primeiro trigger. A assertiva
antiga foi preservada, com dois casos adicionais de ordem/rollback. As seis unidades foram
repetidas independentemente por Infraestrutura em
`.local/pilot-operations/full-review/retention-window03-independent-2026-11-11.json`.
O dono passou 362 unidades com quatro indicadores acima de 80% e repetiu SQL real local 2/2,
wrapper `container-911401d9b83548b58e82029a849a8fdd`, filho
`963e265ebbe94260a992f8c0acd80886`, container encerrado. Sem achado reproduzido aberto neste
escopo; preservam-se abaixo os relatos e vermelhos originais. Hashes finais voltarão a ser
conferidos após a bateria global congelada, sem presumir semântica de IA ou prontidão real.

**Fechamento dos gatilhos reproduzidos:** contraprova da página inteira passou após a correção
(`question-page-content-green-20261111.json`). A seleção atual passou **49/49**, em
`.local/pilot-security/crossreview-green-replay-1794421374058-26680/results.json`, com oito
casos de perguntas, política do lote, UI, restore e callback. Primeiro conflito e replay idêntico
passam; mudança de estado/conteúdo nega sem gerar de novo e o histórico literal permanece.
As fontes corrigidas e os exemplos mantidos foram relidos. Vermelhos abaixo são históricos,
preservados para rastreabilidade. Candidata/hashes e SQL mantido final foram conferidos acima;
nenhum P1 reproduzido permanece aberto nos gatilhos deste relatório.

## [P1] Vincular replay de pergunta ao conteúdo completo da página

A nova prova de catálogo fecha mudança de vigência, mas `create-api.ts`, em `validateReplay`,
continua comparando apenas o trecho da citação com a página atual. `sourceCatalog` não contém
o hash do conteúdo lido. Alterar a página fora dos offsets citados, conservando o trecho e o
catálogo, ainda reapresenta a análise como atual: HTTP **200**, corpo idêntico, uma geração.
Isso deixa passar a alteração de dependência/hash que RQ-7115/AC-7125 mandam negar.

Contraprova da mesma API/journal/controle operacional: a página sintética recebe uma exceção
ao final, sem mudar o trecho citado, a vigência ou o catálogo. Prova em
`.local/pilot-security/question-page-content-probe-20261111.json` e teste/config adjacentes;
execução com `envDir:false`, zero rede/IA. O restante da seleção revalidou conflito inicial,
vigência, contratos UI e guardas de restore/operação. Vermelhos não foram substituídos.

**Dono:** Documentos e IA. Capturar/revalidar revisão do conteúdo autorizado das dependências,
incluindo página inteira, além do catálogo/trecho. Falta de procedência deve negar o replay
corrente, sem outra geração/reserva. Acrescentar o controle positivo de conteúdo idêntico e a
alteração fora do trecho; histórico literal continua consultável. Não resolver com hash somente
do excerpt, pois ele permanece idêntico na reprodução.

**Revalidação delimitada:** os gatilhos originais de purga órfã e lote com espera circular
passaram nas cópias verdes dos probes, com as mesmas assertivas, SQL real e ROLLBACK da fixture:
`orphan-purge-green-20261111.json`, `multi-purge-lock-green-20261111.json`. Fontes corrigidas
foram relidas: limpeza por tenant só na ação de conteúdo integral, invalidações externas antes
dos locks de trigger e preparação de todo o lote de retenção antes de purgar. Os relatos vermelhos
abaixo são históricos; fechamento exige conferir regressões mantidas e hashes finais do dono.

## [P1] Evitar espera circular ao purgar mais de um documento

`apps/api/documents/postgres-document-lifecycle.ts`, laço de `reapplyDocumentPurges`, invalida o
ledger por outra conexão antes de cada purga. A primeira purga dispara o trigger 039 e mantém
`hosted_call_control FOR UPDATE` até o COMMIT do lote. Na decisão seguinte, a conexão externa
do ledger espera esse lock, enquanto a transação do lote espera a conexão externa. O mesmo
encadeamento existe em `purgeExpiredDocuments` com `createDocumentPurgeObserver` instalado.
READ COMMITTED resolve o conflito de snapshot anterior, mas não essa espera entre conexões.

Contraprova no PostgreSQL local: dois documentos/versões novos sintéticos e arquivados há 31 dias,
helper real e ledger PostgreSQL real em pool separado. Primeira invalidação/purga conclui;
segunda invalidação fica bloqueada e é interrompida por `lock_timeout=1200`, SQLSTATE **55P03**.
Uma versão/documento ainda existe dentro da transação; a operação não chega ao COMMIT. O envelope
de transação do helper foi interceptado apenas para manter toda a fixture em ROLLBACK externo;
SQL de domínio, triggers e locks são reais. Sem timeout próprio, o caminho pode esperar
indefinidamente. Arquivos `.local/pilot-security/multi-purge-lock-repro-r2.ts` e
`multi-purge-lock-red-r2-20261111.json`; zero transporte externo.

**Dono:** Documentos e IA. Remover a dependência circular mantendo decisão externa antes dos
efeitos, invalidação/consumo e atomicidade declaradas; por exemplo, preparar todas as invalidações
externas antes de adquirir o primeiro lock do trigger, com revalidação do conjunto. Não remover
o lock de serialização para fazer o teste passar. Promover regressão de dois documentos e duas
decisões tanto na reaplicação quanto no worker de retenção, além de repetição/rollback/B intacto.

## [P1] Revalidar o estado documental também no replay de perguntas

`apps/api/app/create-api.ts:749–762`, callback `validateReplay`, ramo de chat fora de document_summary:
as citações são conferidas somente contra o conteúdo atual da página. O catálogo, a vigência,
a elegibilidade e os conflitos que fundamentaram a resposta não entram nessa decisão. A checagem
de catálogo existe somente para a síntese de lote.

Reprodução com API real, journal, controle de orçamento/authorizer reais locais, membership
sintética, AnswerUseCase simulado e DocumentSourceReader com a mesma página. Primeira pergunta
gera resposta grounded sob validityStatus=confirmed. O catálogo passa a pending, sem mudar os
bytes da página ou a política operacional. Repetir o mesmo POST/chave retorna **HTTP 200 e corpo
idêntico**, com uma única geração. Isso entrega novamente a análise como resposta corrente
mesmo quando a fonte já não autoriza confirmar a regra, contrariando RQ-7115/AC-7125 e briefing
§§8–10. Consultar o histórico literal continua sendo permitido e é um caminho distinto.

**Dono:** Documentos e IA. Conservar a correção de política do lote; ampliar procedência/estado
documental das perguntas e demais respostas documentais reexecutáveis. Falta de prova de
dependências atuais deve negar o replay corrente; não gerar novamente nem consumir outra
reserva para contornar o conflito. Preservar histórico/citações históricos conforme política.
Promover o caso à suíte mantida e cobrir mesma fonte elegível como controle positivo.

Prova e regressão vermelhas imutáveis:
`.local/pilot-security/question-validity-red-20261111.json`,
`question-validity-tests-red-20261111.json`, `question-validity-repro.test.ts` e config adjacente.
Zero rede/IA, dados reais ou cobrança. Não sobrescrever os vermelhos na revalidação.

## [P1] Incluir originais órfãos na purga de conteúdo do condomínio

`apps/api/documents/synthetic-document-decisions.ts:68` retorna sem limpar originais quando
não há versões. Mesmo no caso com versões, as exclusões de bytes/storage usam apenas IDs
encontrados em document_versions. Uma interrupção entre storeOriginal e o registro da versão
deixa storage_objects + document_original_contents legítimos sem versão; a ação explícita
purge_condominium_content confirma sucesso e conserva esses bytes privados.

Contraprova SQL local: condomínio novo, PDF integralmente sintético, objeto/original válidos e
nenhuma versão (estado após interrupção do upload). Callback real, política/allowlist sintéticas
explícitas. Retornou sucesso com **um original e um objeto restantes**, esperado zero. Todas as
mutações foram revertidas. `.local/pilot-security/orphan-purge-repro.ts`,
`orphan-purge-red-20261111.json` e log adjacente; sem provedor ou dado real.

**Dono:** Documentos e IA. Purga de todo conteúdo precisa conferir/remover também bytes/storage
órfãos do tenant autorizado, inclusive quando a seleção de versões está vazia. Conservar modo
de histórico e recibos/custo/unknown, não apagar dados de B. Purga de versão individual não pode
ampliar escopo silenciosamente. Promover regressão e testar repetição/restore com original órfão.
O resultado positivo anterior do percurso normal não cobre esse estado de falha do upload.

## Achados anteriores

- **[P2] Não bloquear a primeira explicação de conflito:** o novo `captureReplay` em
  `apps/api/app/create-api.ts` aplica `canSummarizeDocument` a qualquer resposta citada, antes
  de gravar/entregar. Uma resposta válida `answerMode=conflict` que cita uma minuta pending
  agora vira HTTP 403 na primeira consulta; não é o replay de uma afirmação antes confirmada.
  Retrieval inclui pending/disputed justamente para explicar conflitos, como os cenários
  `CONV-contracts-05` e `CONV-conventions-10` mantidos em `evidence-continuity.e2e.test.ts`.
  Contraprova com API/journal/controle de consumo reais locais e AnswerUseCase simulado:
  `.local/pilot-security/question-conflict-red-20261111.json`, primeira resposta 403,
  geração única; fonte/conteúdo sintéticos. Separar elegibilidade para afirmar regra confirmada
  da explicação de conflito. Conservar a negativa de replay após mudança de dependências e
  promover o controle positivo de conflito inicial, sem nova geração ou abrandar a autorização.

- P1 da FK: contraprova independente SQL atual passou em 6/6 cenários amplos, incluindo exclusão
  com resultado privado, recibo unknown, compromisso preservado, escopo órfão negado e tenant B
  intacto. `postgres-1794417866442-25316/results.json`. Relato da Segurança contém o escopo exato.
- P1 de política no replay de lote e P2 do recibo UI: correções novas estão sendo revistas;
  contraprovas independentes da Infraestrutura e testes mantidos do dono estão nas notas próprias.
  O verde de um gatilho não é aprovação de todo replay ou do diff inteiro.

## Cobertura e limitações

Patch documental anterior de 2.285 linhas foi lido por partes, além dos módulos novos de ledger,
executor, OCR/foto/embedding, persistência de páginas, lote/HTTP/worker e ciclo/exportação.
Arquivos atualmente em edição exigem conferência por hash e releitura de seus deltas finais;
o mapa ainda será publicado. Não declarar revisão completa independente enquanto houver arquivo
pendente ou P1 aberto. Infraestrutura coordena o mapa do checkout integral.
