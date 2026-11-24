# Piloto de 16/11/2026 — Infraestrutura e operação

**Estado em 11/11/2026:** validação local concluída na janela 03/r4; não ativado.
Check, cobertura, E2E, builds, runtime, evals determinísticos e worker local passaram.
O [fechamento global](../reviews/2026-11-11-pilot-integration-local.md) e o
[snapshot final](../reviews/pilot-integration-snapshot-2026-11-11.json) registram as entradas
efetivamente testadas. Esta nota não aprova o piloto nem o branch inteiro.
**Rastreabilidade incorporada:** a seção “Infraestrutura — rastreabilidade final de 11/11”
em `docs/quality/traceability.md` contém as três linhas de RQ-7003/AC-7009,
RQ-7005/AC-7010–7011 e AC-7012, com fontes, testes e recibos conferidos. A oferta original em
`.local/pilot-operations/traceability-offer-2026-11-11.json` permanece preservada.
A consolidação feita por Segurança é documental e posterior aos gates; não altera os dez
arquivos operacionais testados nem substitui o estado da revisão integral.

**Gates finais r4 aprovados:** `global-e2e-window03-1794424690672.{json,log,xml}` em
`.local/pilot-security/`: **247/247**, zero falha, com loopback autorizado e guarda Vite
aninhada ativa. Build web exclusivo passou em `global-build-web-window03-1794424756615.log`;
runtime compilado processou dois PDFs/respondeu 20 perguntas, providerCalls=0, pico RSS 148 MiB
(`global-runtime-window03-1794424800578.log`). Evals r4: core 20/20, documental mecânico 50/50,
280 cenários/1.010 turnos de conversa sem falha mecânica; não aprovam semântica ou modelo real.
Worker local passou nos nove grupos, incluindo dez identidades, 300 páginas, reinício,
concorrência e isolamento. Recibo em
`.local/pilot-operations/container-d89b1317733e49c3b15c80b38feba266/result.json`, com
`containerStopped:true`. As capturas `global-window03-{before,after}-r4.json` confirmam
**910 entradas sem mudança**, com a mesma base Git; o snapshot final preserva os hashes.

**Reconciliação posterior aos gates:** Documentos corrigiu uma linha de AC-2414 na Spec 024
para a escala já vigente na Spec 016/CSS. O recibo
`.local/pilot-documents-2026-11-11/post-gates-ac2414.json` registra os hashes antes/depois e
visão aprovada para 72 specs. Conferência independente em
`.local/pilot-operations/final-window03-r4-closure-2026-11-11.json`: **909/910 entradas atuais
idênticas e um ajuste documental explicado**, com código/testes/configs e os 18 resultados
preservados. O snapshot histórico não foi sobrescrito; nenhuma bateria funcional foi repetida.

**Check final r4 aprovado:** `global-check-window03-1794424246880.log` e cópia exclusiva
`coverage-window03-1794424246880/`, em `.local/pilot-security/`: **2.459/2.459 unidades** em
196 arquivos; statements/branches/functions/lines **87,57/83,70/92,84/89,44%**. Formatação,
lint, tipos, 72 specs e scanner passaram. Os quatro indicadores excedem o piso de 80%.
Nenhuma fonte operacional mudou desde a candidata r2 de dez entradas, revisada
independentemente por Segurança e Documentos. O mapa próprio e seus limites estão em
`.local/pilot-operations/full-review/manifest.json`. A leitura e a conciliação técnica dos
744 arquivos foram concluídas, com zero pendente e hashes conferidos; captura em
`.local/pilot-operations/full-review/final-review-coverage-2026-11-11.json` e
[relatório integral de escopo](../reviews/2026-11-11-full-candidate-infrastructure-review.md).
O mapa distingue leitura integral, estrutural/gerada, autoria própria e limites das revisões
cruzadas. Isso encerra a leitura local atribuída, sem emitir aprovação independente global.

**Limites:** os gatilhos reproduzidos estão corrigidos e revalidados nos deltas identificados.
Permanecem separados o registro independente formal do diff/commit a integrar, CI/status checks remotos, auditoria online,
avaliação semântica especializada, política/fornecedor/retenção e liberação do destino real.
Todos os containers próprios foram encerrados; não houve ativação externa, dados reais,
chamada de IA externa, cobrança, deploy, commit ou merge.

## Registros anteriores da janela — estados históricos

As pendências e falhas abaixo descrevem capturas anteriores. O estado corrente e os gates
finais são os registrados acima; os vermelhos foram preservados para rastreabilidade.

**Contraprova do startup arquivado agora verde:** o reader exige catálogo ativo por
`createSourceReader(catalog)` e o startup injeta o catálogo real. Fonte 200→arquivo 204→fonte
**404**, sem página integral entregue; mesma asserção e helper/cookie reais da reprodução.
Artefatos novos `upload-source-archive-startup-{green,proof-green}-2026-11-11.json` em
`full-review/`. Listener próprio encerrado, zero transporte de IA. Fonte/binding/unidades
foram relidos; unidade mantida cobre A arquivado, B intacto, restauração e versão histórica
ativa. Isso fecha o gatilho reproduzido; nova candidata r4 e gates globais ainda necessários.
**R4 conferida:** 96 entradas iguais por hash e inputs da contraprova do startup ainda
idênticos. **5/5 unidades mantidas do leitor** repetidas independentemente em
`full-review/upload-reader-r4-independent-2026-11-11.json`; fonte/binding e casos de
arquivo/restauração/tenant B/versão histórica ativa relidos. A nova captura pode usar essas
evidências delimitadas; nenhum achado novo pendente nessa fatia. Demais gates globais do
dono continuam necessários contra a captura final atual.
O probe isolado original foi copiado/adaptado somente à nova assinatura obrigatória
`createSourceReader(repository)` e aos nomes de saída: passou com as mesmas assertivas em
`upload-source-archive-api-green-2026-11-11.json`, sem listener. Os vermelhos foram preservados.

**Segurança r6 revisada por esta frente:** quatro deltas do Vite aninhado/RNF/AC-7215 lidos;
24 fontes/13 artefatos conferidos. Contraprova verde, sem importar canário, e **8/8** unidades
mantidas de ambiente repetidas independentemente. Produção/040 não mudaram. Relatório/mapa
próprios de Segurança atualizados; `full-review/nested-vite-env-green-2026-11-11.json` preserva
a prova nova e o vermelho anterior continua intacto. O achado do proxy abaixo está fechado
nesse gatilho; E2E e nova captura global ainda pendentes.

**P2 do novo leitor de upload — vermelho histórico, fechado no gatilho acima:**
`development-document-memory.ts` conserva páginas integrais no novo mapa, e o binding atual
em `server.ts` as entrega sem consultar se o documento continua ativo no catálogo. API real
via `app.inject`: upload sintético 202, fonte 200, arquivamento 204, item ausente do catálogo,
mas GET da mesma fonte permanece **200/corpo integral idêntico**. Esperado 404, conforme
Spec 020 RQ-2006/AC-2007 (fonte removida conserva somente trecho histórico) e o leitor PostgreSQL,
que exige documento ativo. Sem socket/listener, rede, IA ou dado real; origem e remoção no mesmo
tenant autorizado. Vermelhos preservados em
`full-review/upload-source-archive-{red,proof-red}-2026-11-11.json`.
O mesmo gatilho foi confirmado também no **startup demo real**, usando o helper de acesso/
cookie e `app.inject`: 200→DELETE 204→fonte 200 idêntica, ausente do catálogo. Artefatos
`upload-source-archive-startup-{red,proof-red}-2026-11-11.json`. Listener efêmero próprio
encerrado. Essa é a contraprova de integração a repetir após a correção do binding; o teste
isolado inicial documenta o reader sem política do catálogo, não exige colocar essa política
dentro da classe de memória se a composição a aplicar corretamente.
Dono Documentos: no binding/contrato novo, revalidar existência/autorização ativa da fonte antes
de entregar página de upload, conservando permissão/tenant/documento/versão/página e sem
confundir leitura de conflito pending com confirmação de vigência. Cobrir upload→fonte→arquivo
removido negado, recuperação autorizada e outro tenant intacto; não apagar trecho histórico nem
trocar a asserção 404 por 200. Fonte/seed/legislação e versões históricas ativas mantêm seus
contratos próprios. A contraprova usa o reader novo com createApi/catálogo reais, sem stub de SQL.

**P2 novo da execução E2E — fechar antes de repetir o proxy fora do sandbox:**
`tests/e2e/demo-web-research.e2e.test.ts:188` cria outra instância Vite com `configFile:false`,
mas sem `envDir:false`. A guarda da configuração Vitest externa não é herdada por essa
instância. Extraí o objeto real da chamada via AST e o resolvi somente contra raiz temporária
com `.env.test.local` fictício: **canário importado=true**, descoberta desligada=false. Nenhum
arquivo de ambiente do workspace foi aberto pela contraprova, nenhum servidor foi iniciado.
Prova: `.local/pilot-operations/full-review/nested-vite-env-probe-2026-11-11.json`.
Dono Documentos/Segurança: aplicar a mesma guarda explícita na criação do proxy e manter uma
regressão com o objeto real contra canário temporário isolado, antes do próximo E2E com HTTP
local permitido. Não executar o vermelho contra credenciais do workspace. É um delta do
ensaio sintético, não mudança de configuração da aplicação ou autorização de serviços.

**Check global r2 aprovado:** `global-check-window03-1794422747440.log` em
`.local/pilot-security/`: 2.455/2.455 unidades, 196 arquivos, formatação/lint/tipos, 72 specs e
scanner aprovados. Cobertura unitária statements/branches/functions/lines:
**87,55/83,69/92,83/89,42%**, sem alterar piso ou timeouts. Cópia exclusiva de cobertura em
`coverage-window03-1794422747440/`. Primeira falha e captura anterior preservadas. E2E e
demais gates integrados ainda em acompanhamento; não é aprovação do diff inteiro/merge.
**E2E inicial — não aprovado:** `global-e2e-window03-1794423064379.{json,log,xml}` teve
209/247 aprovados. Trinta e sete falhas de transporte correspondem a **`connect EACCES
127.0.0.1`**, não a servidor/provedor remoto: PDF completo (35), PDF longo (1) e proxy web (1).
Repetir o mesmo gate local com a permissão de loopback já autorizada, sem substituir fetch
por mock ou retirar casos. A falha restante é HTTP 403 onde se espera 200 em
`document-answer.e2e.test.ts`, após upload no condomínio de teste criado; dono Documentos
precisa revalidar captura/procedência nessa primeira resposta, preservando revalidação de replay.
Não atribuir esse 403 à restrição de transporte, pois usa `app.inject`.
**Atualização 11/11 — isolamento de ambiente concluído nesta frente:** `envDir:false` nas
configs operations/RLS, após Spec 070/aceitação. Regressão usa apenas `.env` fictício em raiz
temporária própria, com controle positivo; vermelho preservado. **139/139 unidades**, cobertura
96,29/96,91/90,69/97,36 e **17/17 RLS SQL local** passaram. Container próprio encerrado em
`container-34d2a184928947afa135984b38fe716a/result.json`. Não há nova prova por simples limpeza
do ambiente: a descoberta automática pelo framework precisava ser desativada explicitamente.

**Primeiro check da janela 03 — falhou, sem aprovação:** após a tentativa bloqueada do
Corepack, Segurança usou o pnpm 11.19.0 já instalado. A execução
`global-check-window03-1794422113310.log` teve nove falhas: oito timeouts de 5s e a asserção
de retenção sem observer (dois `set_config` esperados, quatro recebidos). Guardas operacionais
desta frente passaram. Não houve download ou mudança de dependências. Hipótese para timeouts:
disputa de recursos; conferir com concorrência limitada, sem aumentar prazo/assertivas.
**Retomada r2:** candidata documental com 95 entradas conferidas iguais por hash; somente
os cinco deltas autorizados mudaram entre as capturas globais. Novo snapshot global tem
910 entradas em `global-window03-before-r2.json`. Segurança repetirá o mesmo check com
`VITEST_MAX_WORKERS=4`; a opção 2 abaixo foi uma alternativa técnica disponível, não o valor
selecionado na repetição. Fontes próprias continuam idênticas à candidata operacional r2.
Revisão independente do ajuste: `docs/reviews/2026-11-11-pilot-retention-infrastructure-review.md`.
O mapa documental cruzado r3 da Segurança foi incorporado somente onde o hash e o escopo de
leitura coincidem. Suas exclusões de autoria/UI permanecem explícitas. Infraestrutura leu
integralmente, de forma independente, as unidades `hosted-policy-continuity`,
`hosted-budget-integration` e `api-operation-control`, cobrindo as exclusões de autoria desses
testes; mapa privado `full-review/manifest.json`. Não amplia essa leitura ao checkout inteiro.
O Vitest 4.1.11 instalado aceita **`VITEST_MAX_WORKERS=2`** no ambiente explícito do runner:
conferido no resolvedor instalado (`node_modules/vitest/dist/chunks/coverage.DM_a_rWm.js`,
linha 380). Segurança pode passá-lo ao filho do mesmo `pnpm run check`, preservando comando,
testes, timeouts e thresholds, sem editar a configuração congelada ou dependências. Registrar
essa condição e repetir o check integral; a falha determinística da retenção exige correção
separada pelo dono antes de atribuir o restante somente à concorrência.

**Contrato concreto ao dono Documentos, sem editar sua fonte:** em
`postgres-document-retention-repository.ts`, a preparação executa `set_config` mesmo sem
`beforePurge`, embora nenhuma consulta escopada ocorra nessa fase sem observer. Mover esse
`set_config` para dentro de `if (beforePurge)` conserva as duas fases necessárias ao observer e
o contexto correto antes de cada purga, evitando duas chamadas redundantes no caminho antigo.
O teste mantido atual reproduz a diferença; preservar a conferência de escopo antes da purga
e acrescentar a ordem de todas as invalidações antes do primeiro trigger quando houver observer.
Alternativa do dono deve demonstrar a mesma propriedade, sem trocar o teste por contagens frouxas.
Reabrir somente esse delta, conferir tipos/lint/regressões e recapturar a candidata antes de repetir
o check completo. Nenhuma edição funcional desta frente durante a janela congelada.
**Revalidação independente do delta de retenção:** a fonte já moveu a configuração para dentro
do observer e preservou a asserção antiga. Li os seis testes completos, incluindo sucesso e
falha na segunda preparação; todos passaram (**6/6**) em
`full-review/retention-window03-independent-2026-11-11.json`, com hashes fonte/teste iguais
antes/depois (`retention-window03-independent-inputs-2026-11-11.json`). A preparação completa
precede qualquer purga; falha conserva rollback e nenhuma purga é iniciada. Sem banco ou rede.

**Preparação da janela global:** Documentos publicou sua candidata com 94 arquivos; todos os
hashes foram conferidos iguais nesta frente. Evidências do dono: 430/430 focados, 356/356
unidades, cobertura 94,88/92,14/98,25/97,10 e SQL local 2/2 sob a guarda explícita. As dez
entradas operacionais da r2 também receberam revisão de Documentos, além da Segurança:
`docs/reviews/2026-11-11-pilot-infrastructure-documents-review.md`, mapa privado r2 desse dono.
Nenhuma dessas verificações equivale à revisão independente do checkout inteiro. Segurança
coordena a captura anterior/posterior e a execução dos gates globais; não iniciar Docker/testes
pesados em paralelo com sua cobertura global.

**Candidata própria r2:** dez entradas em
`.local/pilot-operations/maintenance-candidate-2026-11-11-r2.json`, com delta limitado a duas
configs, regressão e Spec 070/aceitação. **Revisão independente da r2 entregue por Segurança**
no adendo de `docs/reviews/2026-11-11-pilot-maintenance-security-review.md`: dez entradas
conferidas, cinco deltas relidos e **12/12 guardas operacionais** repetidas, sem achado novo
nesse escopo. Runners/wrapper/ADR permanecem iguais; tipos/lint e visão isolada passaram.
Rastreabilidade para consolidação: AC-7009/7012 →
`tests/unit/pilot-local-lifecycle-runner.test.ts` (canário de ambiente, duas configurações),
`infrastructure/pilot/vitest.{operations,rls}.config.ts` e recibos herméticos acima.
Fontes próprias da r2 estão estáveis para a janela global; relatórios/mapas continuam parciais
e atualizados sem aprovar o restante do checkout. Bug novo reabre apenas o delta afetado.

**Restore repetido após a correção do callback documental:**
`container-3b3c9d49692440669f7c0fa1c7410955/result.json`, filho
`c1476f570f34405e9fcf9934dfe8cdb6/`, passou com 49 tabelas/1.148 objetos, 40 migrations,
vínculo externo de destino, processos distintos e manutenção idempotente. Nove recibos/seis
chamadas, consumo unknown/login e tenant B preservados; zero transporte externo. Inputs iguais
antes/depois e conferidos atuais. Container próprio encerrado. Esse é o recibo SQL atual da r2;
os anteriores permanecem preservados, sem inferir cobertura do novo gatilho de replay da página.

**Contraprovas herméticas repetidas:** **113/113** em nove arquivos, incluindo replay de
política 2, recibos UI 7, guarda de restore 7, harnesses de eval 61 e plano Segurança 36.
Sete canários de ambiente da candidata Segurança r5 também passaram independentemente;
23 fontes/11 artefatos conferidos. Revisão atualizada em
`docs/reviews/2026-11-11-pilot-security-infrastructure-review.md`. Nenhuma chamada externa.
Segurança revalidou os gatilhos de órfãos/lote em SQL; fechamento aguarda testes mantidos e
candidata final de Documentos. Segurança encontrou replay de pergunta com página alterada fora
do trecho citado; dono corrige dependência/hash integral. Gates globais continuam sem congelamento.

**Atualização posterior do replay:** fonte de `captureReplay`/`validateReplay` e formato da prova
foram relidos após o hash integral de página. Repetição independente de **42/42 testes mantidos**
passou com `envDir:false`, incluindo oito casos de vigência/página/conflito/histórico, 14 de
recibos UI, sete de posse do restore e 13 de lifecycle. Artefato
`full-review/documents-current-hermetic-2026-11-11.json`. Isso fecha os gatilhos executados;
não congela fontes alheias. A bateria ampliada do dono ainda investiga um timeout de PDF.
O cenário adicional de prova de página ausente também foi relido e repetido: **9/9 perguntas**
passaram em `full-review/question-current-hermetic-r2-2026-11-11.json`, sem mudança do teste
durante a repetição. Não substitui a bateria completa nem a captura final coordenada.

### Registro da continuação — capturas anteriores

As capturas abaixo preservam a sequência de falhas/correções. O estado atual e os recibos
vigentes estão acima; pendências antigas não substituem os fechamentos posteriores.

**Candidata própria anterior:** nove entradas atualizadas em
`.local/pilot-operations/maintenance-candidate-2026-11-11.json`, após a guarda de vínculo do
auxiliar. **138/138 unidades**, cobertura focada 96,29/96,91/90,69/97,36, tipos/lint/formatação e
visão da Spec 070 em cópia isolada passaram. Prova SQL atual:
`container-46290f5b31ee4966a6772b806268c68b/result.json`, em `.local/pilot-operations/`.
Recibo externo exclusivo/flush vincula destino novo, rodada e snapshot antes da conexão do
auxiliar; o marcador de quarentena é criado pelo orquestrador e conferido pelo auxiliar.
Negativas missing/different foram vermelhas antes e verdes depois, sem enfraquecer asserções.
Container próprio encerrado. **Revisão independente entregue por Segurança; ver delta r2 acima.**

Segurança publicou mais um P1 documental: purga do condomínio conserva original/storage órfãos
quando o upload caiu antes de registrar document_version. Relato e SQL revertido estão no
review da Segurança de 11/11; dono Documentos, além do P1 de lote com espera circular. Nossas
provas positivas identificam suas fixtures e não aprovam essas lacunas novas. Janela global aberta.
**Coordenação atual:** janela 03 aberta para correções, conforme o índice de Segurança. A
primeira passagem pelas fontes/configurações da candidata original terminou; testes/evals/docs
e arquivos novos/alterados da extensão continuam em revisão. Os gatilhos originais de política
do replay e de exclusão/FK passaram nas contraprovas. Os P2 do recibo/posse passaram nesta frente
(7/7 cada, relatórios verdes preservados). A Segurança revalidou o gatilho de vigência; seguem
os P1 de purga órfã/lote e o P2 de primeira explicação de conflito. Gate global só após candidata
estável coordenada.

**Atualização da revisão cruzada:** Segurança confirmou outro P1 no replay de perguntas:
vigência da fonte mudou de confirmed para pending, mas página/política iguais ainda devolveram
200. Relato do dono da revisão em `docs/reviews/2026-11-11-pilot-documents-security-review.md`;
Documentos corrige. As contraprovas verdes desta frente são dos gatilhos originais de política
do lote/corpo interrompido, não aprovação dos outros caminhos. Janela global permanece aberta.

**Segurança — revisão independente entregue em 11/11:** 17 entradas lidas/confrontadas,
16 iguais ao manifesto publicado e uma unidade com delta posterior de guarda de temporário,
também lido/retestado. 36/36 unidades passaram nesta frente. Sem novo achado concreto nessa
fatia; relatório `docs/reviews/2026-11-11-pilot-security-infrastructure-review.md`, mapa privado
`full-review/security-stage6-review-2026-11-11.json`. Não aprova o diff inteiro nem nossa autoria.
O teste alterado exige atualizar a captura do dono antes de congelar. README/AGENTS ainda
descrevem dois bancos; Segurança pode registrar o terceiro destino novo do runner de manutenção.

**Reexecução com 040/plano estabilizados:** wrapper
`container-3aab1ddc02de4c2ea60cf4277e8677a2/result.json`, filho
`16fba73a310541ecb9ce9838e806d6ff/`, em `.local/pilot-operations/`, passou integralmente.
Os hashes de 040 e do plano coincidem com a candidata estabilizada da Segurança. Container
próprio encerrado. Relatório próprio: `docs/reviews/2026-11-11-pilot-maintenance-infrastructure-local.md`.
Esta é a prova atual da composição; a anterior permanece histórica.

**Revisão dos harnesses de eval:** 61/61 testes em cinco arquivos passaram sem provedor,
com execução sequencial e o mesmo timeout/assertivas. A primeira execução paralela teve dois
timeouts de PDFs (59/61), preservada em `full-review/eval-review-2026-11-11.json`; a sequência
passou em `eval-review-serialized-2026-11-11.json`. Registrar concorrência da janela global se
o fenômeno repetir; nenhum teste foi editado ou limite aumentado. Isso não aprova semântica.

**Etapa 5 — contraprovas de 11/11:** replay com política alterada/revogada agora retorna 403,
consulta a autorização e não gera novamente (2/2); queda do corpo HTTP conserva o UUID (1/1).
Os relatórios vermelhos originais foram preservados. A ampliação do teste da UI confirmou três
falhas no novo validador: lote usa `summary.answer`, cadastro usa `condominium.name` e confirmação
retorna `{confirmed:true}`. A implementação espera outros campos e não libera o recibo após
sucesso. Cinco casos executados: três falhas de sucesso e dois controles aprovados; zero rede
externa. Achado/contrato para Documentos no relatório de revisão desta frente, artefato
`client-receipt-contract-red-2026-11-11.json`. Fontes alheias não foram editadas. Correções
parciais não aprovam todos os caminhos de replay nem a candidata ainda em edição.

**Atualização do P2 após o ajuste do dono:** os três campos de sucesso foram corrigidos.
Nova ampliação executa sete casos, cinco aprovados e duas falhas: `analysisOnly` com snapshot
válido não libera a chave; lote JSON incompleto libera antes de o consumidor real recusá-lo,
fazendo a retentativa trocar UUID. Relatório privado `client-receipt-contract-r2-2026-11-11.json`.
Contrato sugerido a Documentos: compartilhar a validação de transporte já usada pelo consumidor,
cobrindo corpo inválido e snapshot válido. O P2 permanece aberto; não sobrescrever vermelhos.

**P2 do ensaio documental, sem SQL destrutivo na reprodução:** helper `restore` do teste executa
DROP SCHEMA antes de conferir posse/marcador do destino; o runId só é confrontado com source.
Contraprova com Pool/CLI simulados confirmou DROP para sufixo de outra rodada/sem marcador
(`document-restore-guard-red-2026-11-11.json`). O runner entrega bancos novos próprios e a prova
positiva identificada do dono permanece válida; a negativa do helper precisa fechar. Preferir
outro banco vazio ou delimitar expressamente o reset da fixture com conferência antes de efeitos.
Relatório/contrato no review desta frente. Não executei DROP em banco real nem editei o teste alheio.

**Etapa 6 — runner local estendido, unidades aprovadas em 11/11:** 132/132 testes em seis
arquivos; cobertura focada statements 96,29%, branches 96,91%, functions 90,69%, lines 97,36%.
Tipos estritos, lint e formatação dos trechos do runner passaram. Relatório exclusivo:
`.local/pilot-operations/operations-tests-2026-11-11-71b98e5fc406409aa4d130225723875b.json`.
A primeira tentativa não importou testes por EPERM no temporário virtual do sandbox; repetição
com TEMP/TMP próprios dentro de `.local/pilot-operations/` resolveu sem alterar os gates. O
teste de preflight do PowerShell recebeu prazo específico de 20s para startup nativo frio,
mantendo 15s no subprocesso e todas as assertivas. O diagnóstico de config ausente é JSON
estável; não depende da codificação localizada do stderr. Nenhum banco/container foi criado
nessas unidades. Prova PostgreSQL do novo perfil ainda não executada.

**Etapa 6 — manutenção pós-restore aprovada localmente em 11/11:** o runner integral agora
restaura a cópia original também em um terceiro banco novo, compara 49 tabelas/1.148 objetos
do catálogo e só então reaplica o plano autenticado em processo Node distinto. Revogação de
conta/membership, expurgo de original/páginas/chunks/vetores/resultados, outro tenant intacto,
idempotência, nove recibos/seis chamadas e fence de login/unknown passaram. Resultado posterior
ao backup sem payload na cópia fica uncertain e recusa reserva/reenvio. Plano ausente/adulterado,
chave/política/escopo/elegibilidade divergentes e alteração de RLS negaram antes dos efeitos.
Não foi criada uma segunda política de consumo; módulos de Segurança e callback de Documentos
foram reutilizados sem edição. A cópia permanece em quarentena; o container próprio foi encerrado.

Recibo final do wrapper:
`.local/pilot-operations/container-e059049d39f7480483cb0dfd72fd0c46/result.json`; o campo
`childReportDirectory` aponta ao inventário/manifesto e a `maintenance/result.json`.
Fontes/migrations ficaram idênticas antes/depois da prova. **136/136 unidades em seis arquivos**
passaram; cobertura focada 96,29/96,91/90,69/97,36 (statements/branches/functions/lines).
Tipos estritos, lint e formatação passaram. Relatório unitário exclusivo:
`.local/pilot-operations/operations-maintenance-final-2026-11-11.json`.
Primeira execução ampliada foi preservada como falha do harness: ele exigia invalidated também
para recibo cancelled sem versão, previamente cancelado antes do envio. A expectativa passou
a distinguir esse recibo mínimo legítimo (custo zero/sem payload) de resultado que exige expurgo;
assertivas de privacidade, custo e unknown permanecem. Reexecuções verdes são artefatos novos.

**Pedido de revisão cruzada da candidata própria:** nove entradas/hashes em
`.local/pilot-operations/maintenance-candidate-2026-11-11.json`. Documentos deve conferir o novo
helper `verify-pilot-maintenance-recovery.ts` e o delta de recovery/wrapper/runner/teste/config/
Spec 070/ADR 0042. A revisão anterior de 46 registros não cobre esses hashes novos. Segurança
pode mapear RQ-7005 → AC-7010/7011 → helper/prova SQL e AC-7012 → runner/teste/config fixa.
Não editar esses trechos durante uma janela congelada; esta publicação ainda não congela os
demais donos, e a revisão completa da candidata e os gates globais permanecem pendentes.

**Integração da etapa 6 em 11/11:** Documentos adotou a config fixa
`tests/vitest.pilot-document-lifecycle.config.ts` e o par source/restore do perfil `documents`;
a divergência inicial com o perfil RLS de banco único foi removida nos arquivos atuais. A prova
do dono ainda está em edição; executar depois de sua candidata publicada. Segurança publicou
o contrato/testes de manutenção: 34 unidades e quatro cenários SQL amplos. Infraestrutura está
integrando esses módulos e o callback documental sem os editar. O ensaio integral conserva o
restore anterior e cria **um terceiro banco novo** para conferir o backup original antes de
reaplicar o plano. Isso evita apagar schema ou restaurar sobre o alvo que já recebeu os testes
de retomada. Plano/âncora ficam fora do dump; preparação e verificação usam processos Node
distintos. A prova de manutenção dessa composição passou conforme o recibo acima; o percurso
documental HTTP/fotos/exportação do perfil `documents` ainda depende do fechamento do dono.

### Registro histórico — candidata da janela 02

**Coordenação da extensão anterior: candidata local pronta; mutações suspensas para a janela
`security-local-20261109-02`.** Hashes finais em
`.local/pilot-operations/local-backend-source-hashes-2026-11-09.json`; evidências consolidadas em
`.local/pilot-operations/local-backend-evidence-2026-11-09.json`. A janela 01 terminou no pré-flight.
A edição atômica de AC-7008 terminou; hashes daquela candidata anterior em
`.local/pilot-operations/integration-source-hashes-2026-11-09.json`. A autorização encaminhada pela coordenação
permite integrar/testar localmente as migrations atuais e apoiar a regressão de política do
ledger, sem serviços remotos/cobranças. Estendi somente runners/testes de operação;
migrations 039/040 e módulos documentais/orçamento permanecem com seus donos. A prova anterior
fica preservada; a nova prova abaixo cobre dados de ledger/orçamento/login. Não haverá
mutações durante a próxima janela anunciada; leitura/revisão e recibos exclusivos podem continuar.

### Integração SQL real e restauração — AC-7008

### Etapas de acompanhamento desta frente

1. **Concluída — restauração ampliada e revalidação do P1.** SQL real/SCRAM, dois processos,
   política A/B, estado incerto, cotas/claims/login, journal, originais, vetores e jobs. Recibos abaixo.
2. **Concluída — worker separado e RLS locais.** Backend local guardado e saídas exclusivas;
   127 testes focados passaram; 17 testes da matriz RLS passaram em PostgreSQL real. API/worker
   compilados separados, PDF de 300 páginas e dez identidades passaram, com retomada única.
3. **Concluída localmente — revisão e hashes.** Delta próprio revisto, provas afetadas repetidas,
   contratos/rastreabilidade oferecidos aos donos e versão identificada. O worker passou também
   com LOGIN sintético NOINHERIT dedicado, somente `app_worker`, sem credencial do operador.
4. **Concluída nesta frente — acompanhamento dos gates locais coordenados.** Check completo
   terminou em 0; E2E/RLS/worker/build/runtime passaram e os 834 arquivos do snapshot r3 foram
   conferidos sem diferença. Fontes/configurações/specs continuam sem mutação até o encerramento
   formal da janela por Segurança. Não houve aprovação de merge, CI ou de uso real.

### Acompanhamento solicitado dos gates — janela 02

### Etapa 5 — fechamento e revisão completa em andamento

**P1 NOVO CONFIRMADO — correção documental necessária antes de aprovar a candidata.**
`conversation-journal.ts` retorna `saved.response` antes de consultar a política atual. Dois
ensaios HTTP locais reproduziram resposta de A sob B e sob autorização revogada, após recriar
API/executor/ledger: HTTP 200, resposta idêntica, zero consulta de autorização no replay e uma
execução simulada total. Preservar a correção do ledger; este é outro caminho de entrega.
Achado, contrato e regressão vermelha em
`docs/reviews/2026-11-09-full-candidate-infrastructure-findings.md`; artefatos em
`.local/pilot-operations/full-review/`. Documentos é dono do journal; Segurança deve abrir a
janela de correção e os gates afetados. Esta frente não alterou fonte alheia. A revisão das
demais áreas continua; o relatório completo não está aprovado com este P1 aberto.

**P2 adicional confirmado — recibo da interface descartado antes do corpo HTTP.** Em
`App.tsx/conversationFetch`, cabeçalhos 200 já apagam o recibo; queda ao ler o corpo faz o mesmo
pedido receber UUID novo na retentativa. Prova executando a função atual: duas chamadas,
`sameRequestId=false`, zero rede externa. Relatório acima e `client-receipt-red.json` preservados.
Dono sugerido Documentos/UI; conservar chave até confirmação do corpo/contrato, sem reenvio
automático. A revisão cruzada recebida cobriu 46 registros: 45 arquivos de hash idêntico ao
manifesto original e uma nota de coordenação mutável; isso não aprova o diff inteiro.

O usuário autorizou continuar o fechamento e a revisão da candidata. Inventário integral do
delta contra `3b702db6f91dbbeb2ede1a6063053296298d913c`: **690 arquivos**, incluindo **154 de
fontes/configuração operacional** e alterações anteriores às três frentes. Manifesto com hashes
e acompanhamento por arquivo em `.local/pilot-operations/full-review/manifest.json`.
Leituras/revisões já feitas nesta sessão são reaproveitadas somente para conteúdo idêntico;
lacunas permanecem marcadas como pendentes. Não declarar aprovação independente dos arquivos
de autoria desta frente. Código/configurações/specs continuam congelados; sem commit, CI remoto,
merge, serviço, dados reais ou chamada paga. O registro de review completo ainda não está aprovado.

**Contrato oferecido à Segurança para o ensaio de pós-restore (etapa 6):** plano inteiramente
sintético, versão/checksum/escopo explícitos, default negado e callback de elegibilidade injetado,
sem flag positiva no startup. Eventos posteriores ao snapshot ficam fora de `app`/dump e indicam
somente UUIDs fictícios de condomínio/usuário/versão/sessão e ação fechada. Restaurar primeiro
em quarentena; reaplicar exclusão de derivado/original e revogação aprovadas na fixture antes de
qualquer reabertura. Reaplicação idempotente, outro tenant intacto, recibos de consumo e estados
unknown preservados, sem liberar nova chamada. Plano ausente/adulterado/escopo divergente nega.
Nenhum prazo, base legal, retenção real ou autorização de dados reais é escolhido aqui. Segurança
pode confirmar/ajustar o contrato na sua nota; o mecanismo e a regressão só avançam após spec/
aceitação e a nova janela de correção. Enquanto isso, a revisão continua sem mutação funcional.

**Janela 03 aberta pela Segurança:** o contrato sintético acima foi aceito com plano
autenticado/privado, sequência antes dos efeitos e callbacks de conteúdo do dono. Infraestrutura
pode alterar sua spec/aceitação e a menor integração dos runners. A candidata da janela 02
permanece como evidência histórica; novos gates só certificam os hashes da nova candidata.
O P1 adicional de exclusão/FK 039 confirmado por Segurança está no relatório cruzado documental;
Documentos é dono da correção, preservando recibos/custo. O P2 da interface também deve entrar
na candidata. Nenhum serviço, CI remoto, dado real ou cobrança foi autorizado.

**Etapa 6 — contrato operacional detalhado antes da implementação.** Spec 070 acrescenta
RQ-7005 e AC-7010/7011; ADR 0042 referencia o plano autenticado externo ao dump, o callback
documental e o fence de consumo. Gate canônico de visão passou para 72 specs. A API concreta
publicada pela Segurança (`createSyntheticDataControls`, `captureFence`, `applyPlan`) será
reutilizada após os testes/hashes do dono; Infraestrutura não editará esses módulos nem criará
uma segunda política. Regressão real local deve cobrir processo novo, duas aplicações idempotentes,
plano ausente/adulterado/divergente negado, original/derivados expurgados, sessões/associações
revogadas, tenant B intacto e recibos/unknown preservados. A rastreabilidade global pode apontar
RQ-7005 → AC-7010/7011 quando o runner e seu resultado forem publicados; ainda não está validado.

**Runner oferecido a Documentos para AC-7124:** extensão `-Suite documents` do wrapper existente,
configuração fixa `tests/vitest.pilot-document-lifecycle.config.ts` e dois bancos novos marcados
`alvitra_ops_source_<runId>` / `alvitra_ops_restore_<runId>`. O filho receberá
`PILOT_DOCUMENTS_SOURCE_DATABASE_URL`, `PILOT_DOCUMENTS_RESTORE_DATABASE_URL`,
`PILOT_DOCUMENTS_RUN_ID`, `PILOT_RECOVERY_CONFIRMATION=synthetic-local-only`,
`PILOT_RECOVERY_DOCKER_CONTAINER` e `PILOT_LOCAL_REPORT_DIRECTORY`, sem `.env`/chaves herdadas.
Source estará migrado, restore vazio com vector. O teste do dono deve gravar no diretório privado
`document-lifecycle-proof.json` com `passed=true`, `providerCalls=0`,
`activationAuthorized=false` e seu `runId`; o runner confere também o relatório Vitest exclusivo.
Config ausente é recusada antes de criar recursos. Implementação/gate desse runner em andamento;
não usar como prova até o resultado publicado. Documentos conserva autoria da config/cenários.

Esta atualização é relato operacional; a nota de release não integra o snapshot funcional de
834 arquivos da janela 02.
Recibo de acompanhamento em `.local/pilot-operations/gates-monitor-2026-11-09.json`.

- Dependências recuperadas pela Segurança via cache global, downloaded=0; nenhum código ou
  versão mudou. O primeiro bootstrap pnpm não executou os gates. Repetição com instalação
  automática desativada conserva todas as verificações.
- Check r2: 2.346/2.347 unidades, uma falha no literal antigo do teste OCR offline. Documentos
  corrigiu somente o teste e a numeração da Spec 071 com autorização coordenada; o novo teste
  comprova indisponibilidade/zero fetch por comportamento. Infraestrutura não editou essa área.
- Check r3: 2.347 unidades aprovadas; cobertura global 89,02% statements, 85,09% branches,
  93,92% functions, 90,84% lines. Formatação/lint/tipos/visão e scanner passaram; exit code 0
  do comando completo foi conferido no registro de execução da frente coordenadora.
- E2E 232/232; RLS 17/17 e worker separado aprovados na candidata coordenada, containers
  encerrados. Builds API/web e runtime de dois PDFs/20 perguntas passaram, providerCalls=0.
- Observação operacional para o dono do scanner: `scripts/scan-secrets.mjs` exclui somente
  `.git`, `coverage` e `node_modules`. A leitura do código e a contagem de 54.255 arquivos em
  `.local` explicam a etapa demorada. Ela terminou sem padrão conhecido encontrado; não foi
  necessário excluir diretórios, modificar o script ou interromper processo da outra frente.
  Nenhum achado de segredo ou defeito funcional novo de infraestrutura foi confirmado.
- Conferência independente após os gates: snapshot r3 com 834 entradas e zero diferenças;
  zero alteração funcional nesta frente. Recibo
  `.local/pilot-operations/global-window02-verification-2026-11-09.json`. Apenas esta nota e
  relatórios privados foram atualizados no acompanhamento; o manifesto funcional permanece válido.
- Não foram disparados CI remoto, auditoria de dependências em rede, serviços ou IA externa.
  Revisão completa do diff/commit atual, CI obrigatório, decisões de operação/política e validação
  semântica do gateway efetivo permanecem fora da aprovação obtida por esses gates locais.

### Backend local oferecido para integração

`scripts/local-integration-guard.ts` limita URL a loopback literal e nomes exclusivos
`alvitra_ops_worker_<hex>`/`alvitra_ops_rls_<hex>`, sem query/fragment; confirmação
`synthetic-local-only` e marcador `ops_control.environment` são obrigatórios antes de TRUNCATE.
`synthetic-worker-database.ts` aceita `local` explicitamente; nenhum segredo/fallback remoto.
O alias remoto antigo não deve ser usado nesta rodada. Comandos diretos já guardados:

```powershell
pwsh -NoProfile -File scripts/verify-pilot-recovery-container.ps1 -ConfirmSyntheticLocal -Suite rls
pwsh -NoProfile -File scripts/verify-pilot-recovery-container.ps1 -ConfirmSyntheticLocal -Suite worker
```

O mesmo wrapper cria container próprio com imagem em cache/SCRAM/loopback/tmpfs, executa
`verify-pilot-local-integration.ts` sem `.env`, verifica recibo e encerra somente seu ID/label.
Worker tem build isolado e usa API/worker compilados em processos separados. A extensão da
matriz RLS modifica somente a seleção/guarda local, restart sintético sem env-file e provedor
do backup de journal; seus cenários/assertivas permanecem. Histórico lógico continua
distinto do backup integral. Os relatórios/build não tocam `dist`, `coverage` ou `reports` globais.

Prova RLS: `.local/pilot-operations/container-a961d53f105044468646ee824aaa02cb/result.json` e
`.local/pilot-operations/c5f741a78fd44331905818b768a9808e/rls-result.json` (17/17, zero falhas).
Prova worker final com LOGIN mínimo:
`.local/pilot-operations/container-ab124afd379b44459e60005150101e9c/result.json`, com o diretório
filho identificado no recibo. O operador só prepara/conferre fixtures; o processo compilado de
worker recebe outra URL sintética com membership exclusivo de worker. Nenhum container destas
provas ficou rodando. O runner padrão de recuperação foi repetido após ampliar o wrapper:
`.local/pilot-operations/container-444bd5d7cbd4435387d92202a2a08c2f/result.json`, filho
`.local/pilot-operations/b1cc8dec028748a496ed024a215d656e/result.json`, aprovado com 49 tabelas/
1.145 objetos e os recibos/dados novos. Build e fonte de IA não foram alterados no Blueprint.
Tipos estritos/lint do novo delta passaram. Cobertura focada agora inclui seis módulos:
96,29% statements / 96,91% branches / 90,69% functions / 97,36% lines; 127 testes em cinco
arquivos, sem cobertura global alegada. Acurácia de OCR/IA externa continua sem inferência.

Contrato de propriedade: estes runners/guardas e fixtures operacionais foram alterados aqui;
não houve edição de `server.ts`/`create-api.ts`/`worker.ts`/`processing-worker.ts`, módulos de
orçamento ou migrations 039/040. Segurança mantém package/README/AGENTS/rastreabilidade.
Proposta adicional de aliases: `test:pilot:rls:local` e `test:pilot:worker:local` para os comandos
diretos acima, sem env-file. AC-7009 e AC-6906/6907/6908 se vinculam aos testes de guardas,
matriz SQL e `verify-separated-worker.mjs`; Spec 040 não é aprovada por um backend local.

Durante uma leitura concorrente da Spec 071, o gate de visão falhou por não reconhecer o header
do mapeamento; depois do fechamento dessa edição passou novamente para 72 specs. Não alterei
o validador nem a spec alheia para fazer o gate passar. A janela global deve verificar sua própria
revisão atual. Rastreabilidade proposta AC-7008/7009 e aliases acima aguardam o dono central.

Prova aprovada em PostgreSQL 17/SCRAM com container próprio encerrado:
`.local/pilot-operations/container-4dd23db0eed949be86f02169c1474cf1/result.json` e
`.local/pilot-operations/68c143ec562d415280f5e00c2eb4161b/result.json`.
O mesmo comando do wrapper agora inclui `verify-pilot-ledger-recovery.ts`, executado em dois
processos Node distintos (1112/7672), antes/depois do restore. Ambiente mínimo sem chaves reais;
nenhum transporte externo. O snapshot conserva 49 tabelas/1.145 objetos/40 migrations, com
**quatro registros documentais de chamada, sete recibos operacionais, 101 contadores de login**,
além dos originais/páginas/vetores, contas/códigos/sessões, journal e jobs já exercitados.

- Pools de LOGIN sintético NOINHERIT separados, cada um com somente runtime, worker ou
  `app_ai_executor`; API/worker não recebem o papel documental. Defaults de política são
  negados antes de qualquer fixture positiva. Somente o banco descartável recebe tetos fictícios.
- Corrida de reservas com teto concorrente 1: uma reserva; corrida de três tokens: um claim.
  Compromisso global documental compartilhado entre dois tenants: uma reserva dentro do teto.
  Cancelamento conserva tentativa; excesso monetário é negado. Nenhum recibo é apagado.
- Quatorze tentativas simultâneas da mesma origem: dez permitidas. Outras 990 permitidas de
  hashes fictícios distintos atingem mil globais; tentativa adicional e nova origem após restore
  permanecem bloqueadas. Não há IP/código/token real nos contadores.
- Composição `createBudgetedHostedDocumentControls` + stores PostgreSQL: resultado sob A
  bloqueia B sem entrega/reenvio após recriar processo; A recupera a saída. Envio incerto
  continua bloqueado sob A/B. Falha entre resultado confirmado e ACK operacional conserva
  recibo incerto e recupera somente o resultado, sem outra chamada/reserva/compromisso.
- Replay com usuário/tenant/membership divergente ou membership revogado é negado. Worker
  retoma o recibo reservado; o incerto não aceita novo claim/cancelamento. RLS/grants negam
  leitura direta dos controles e leitura/escrita documental cruzada. Invalidação por versão
  apaga derivados do ledger e conserva compromisso. As transições não alteram o Blueprint.
- Hashes de 14 entradas da integração e dos 40 arquivos SQL são iguais antes/depois da prova.
  Dump 756 ms, restore/comparação 895 ms; ensaio Node total 7.835 ms, sem promessa de RPO/RTO.

Regressão do P1: relatórios red/green da Segurança registram sete falhas antes e sete sucessos
depois; esta frente reexecutou os sete casos e os 15 da composição com sucesso e acrescentou
a prova de SQL/restore/processos acima. O P1 não foi corrigido por Infraestrutura. A revisão
parcial independente dos módulos de Segurança e da correção está em
`docs/reviews/2026-11-09-pilot-security-infrastructure-review.md`; não aprova o branch inteiro.

107 testes operacionais e sua cobertura focada permanecem aprovados (95,80% statements,
96,58% branches, 89,74% functions, 97,00% lines). Tipos/lint dos dois runners passaram;
gate de visão passou para 72 specs. A rastreabilidade oferecida acrescenta AC-7008 → runner
filho + recibos SQL/processos. A nota de Segurança foi lida com a janela em preparação;
a nota de Documentos ainda estava em edição ao fechar esta unidade atômica.

**Próxima dependência local registrada:** backend `local` do ensaio de worker separado,
sem `.env`, loopback/nome/marcador exclusivos e sem fallback Neon/Supabase. Os arquivos
`synthetic-worker-database.ts`/`verify-separated-worker.mjs` pertencem a esta frente; a alteração
aguarda encerramento da janela ativa. Não iniciar esses runners remotos como atalho. Gates globais
e qualquer correção posterior continuam coordenados por Segurança.
Meta: segunda-feira, 16/11/2026, America/Sao_Paulo. Dono de operação e suporte: **a designar**.

## Entrega desta frente

- Spec 070 e ADR 0042 delimitam a preparação e a recuperação local integral.
- `render.pilot.yaml` prepara API/web e worker compilados, um de cada, Node 24, mesma região
  proposta, deploy automático desligado e janela de encerramento de 300 segundos. Não importa
  projetos, faz migrations ou guarda valores secretos. OCR/fotos/Codex/pesquisa de demo permanecem
  desabilitados; a chave do chat fica somente na API.
- `scripts/verify-pilot-preparation.ts` valida o subconjunto escalar revisado desse Blueprint e as
  decisões sem segredos. Não lê `.env.local`, ambiente secreto ou conta remota; não é um parser
  YAML geral nem certificação do schema oficial Render. Configuração desconhecida falha fechada.
- `scripts/pilot-recovery.ts` exporta **todos os dados e objetos de `app`**, incluindo contas,
  sessões, originais `bytea`, páginas, chunks, vetores, fila, citações, histórico e migrations.
  Dump custom e inventário compartilham snapshot; SHA-256 e comparação de catálogo conferem
  conteúdo, sequências, RLS, grants, ownership e funções. ACLs são conservadas no restore.
- `scripts/verify-pilot-recovery.ts` cria dois bancos locais sintéticos exclusivos, aplica a
  fundação apenas na origem, semeia dois usuários/condomínios e uma conta MFA fictícia,
  e exercita a restauração, segredos estáveis e o acesso.
  Não usa `.env.local`, Neon, Supabase, documentos reais ou chamadas de IA.
- `scripts/verify-pilot-recovery-container.ps1` executa o ensaio com a imagem PostgreSQL 17 já
  em cache, SCRAM, tmpfs e porta só em loopback. Verifica recibo e ID/label antes de encerrar
  seu próprio container. O ambiente filho recebe somente variáveis operacionais sintéticas.
- `scripts/pilot-observation.ts` avalia agregados sintéticos com os limiares propostos do runbook,
  identifica amostra antiga, sinais/RPO ausentes e não envia notificações nem autoriza operação.
- SQLs `infrastructure/pilot/operational-observation.sql` e `verify-access.sql` preparam inspeção
  agregada e de permissões. Não foram aplicados em serviço externo.
- Workflow manual `.github/workflows/pilot-operations.yml` prepara a mesma prova em PostgreSQL
  efêmero de CI. Não foi disparado e não conta como CI aprovado.

O checkout tem centenas de alterações anteriores e três frentes no mesmo diretório. Esta frente
não fez checkout/reset/clean/stash/commit/merge, branch/worktree, install explícito, gates globais,
migration remota ou runner destrutivo. Os novos relatórios/temporários ficam exclusivos em
`.local/pilot-operations/` ou no diretório temporário com prefixo `alvitra-pilot-ops-test-`.

## Reproduzir sem contratar

```powershell
# Configuração, sem carregar credenciais nem conectar.
node scripts/run-tsx.mjs scripts/verify-pilot-preparation.ts
# Mesmo exame, falhando enquanto houver decisão pendente (resultado esperado no exemplo).
node scripts/run-tsx.mjs scripts/verify-pilot-preparation.ts --require-decisions
# Testes e cobertura exclusivos desta frente; usa dependências já presentes.
node node_modules/vitest/vitest.mjs run --config infrastructure/pilot/vitest.operations.config.ts --coverage
# Procedimento completo: Docker local disponível e imagem pg17 já em cache, sem download.
pwsh -NoProfile -File scripts/verify-pilot-recovery-container.ps1 -ConfirmSyntheticLocal
# Exemplo de alertas fictícios, com relógio de referência explícito.
node scripts/run-tsx.mjs scripts/verify-pilot-observation.ts --reference-time=2026-11-09T12:00:00.000Z
```

Para registrar decisões, copiar o JSON de exemplo para uma pasta privada de operação e usar
`--decisions=<caminho>`. Guardar referências de aprovações/evidências, **nunca credenciais ou dados
de participantes**. Preencher o JSON não comprova revisão, autorização humana ou implantação.
`activationAuthorized` permanece falso mesmo quando todos os campos estiverem preenchidos.

## Prova de recuperação integral executada localmente

Pré-condições: PostgreSQL local descartável com pgvector; cliente `pg_dump` e `pg_restore`
compatíveis com a versão do servidor no PATH, ou as ferramentas no container pelo wrapper;
um operador **local sintético** capaz de criar
bancos e papéis. CLI de versão igual à do servidor simplifica o ensaio. Não usar banco local com
dados a preservar, projeto de piloto ou credencial administrativa de fornecedor. A conferência
de autenticação exige SCRAM em TCP e recusa de senha errada (`28P01`); o wrapper configura isso
com senha pública de fixture por arquivo. Não trata essa senha fictícia como cofre real.

```powershell
# Preencher somente em ambiente local descartável; valor ilustrativo, não segredo de fornecedor.
$env:PILOT_RECOVERY_CONFIRMATION = 'synthetic-local-only'
$env:PILOT_RECOVERY_ADMIN_URL = 'postgresql://postgres:<senha-local-sintetica>@127.0.0.1:5432/postgres'
node scripts/run-tsx.mjs scripts/verify-pilot-recovery.ts
```

O runner recusa hosts remotos, inclusive nomes que resolvam para loopback; aceita somente os
literais `127.0.0.1` e `[::1]`, sem parâmetros libpq na URL. Não herda chaves de IA nos subprocessos.
Bancos gerados: `alvitra_ops_source_<hex>` e `alvitra_ops_restore_<hex>`, cada qual com marcador
em `ops_control.environment`. Não há exclusão automática; ambos ficam em quarentena. Se o ensaio
falhar, conservar o destino para diagnóstico local sem copiar dados para tickets. Ao encerrar o
ambiente descartável, remover apenas os recursos identificados pelo ensaio, após conferir nomes.

No wrapper, bancos ficam no tmpfs do container próprio e são descartáveis ao encerrá-lo. Não
há `docker rm`, remoção de volumes ou limpeza de arquivos. `-KeepContainer` permite conservar
somente esse ambiente sintético para diagnóstico. São montadas apenas as saídas de operação;
o repositório e `.env.local` não entram no container. Todos os containers criados nesta frente
foram encerrados após a prova, inclusive o container manual de diagnóstico.

1. Origem recebe migrations versionadas, contas/sessões sintéticas, conta com MFA cifrado, documentos textuais,
   páginas/chunks/vetores, mensagens dos dois lados e um documento ainda na fila.
2. Congelar escritores: neste ensaio não existe aplicação ou worker concorrente. Sequências não
   são MVCC; igualdade exata do inventário exige quiescência também durante dump/restauração.
3. Dump de `app` e manifesto em diretório novo; nunca sobrescrever backup existente. Snapshot
   permanece aberto até o `pg_dump` concluir. Manifesto só é escrito após sucesso.
4. Destino marcado não pode conter `app` nem outras tabelas/views de usuário. Papéis restritos e
   mesma versão/schema da extensão vector são pré-condições. O restore usa transação única,
   conserva ACLs e não usa `--clean`, `--create`, TRUNCATE ou cópia parcial de tabelas.
5. Comparar todas as tabelas/sequências e catálogo; ler mensagens literais dos dois lados e
   original binário; autenticar sessão/código sintéticos com segredo estável; negar outro usuário
   e contexto cruzado de condomínio; escrever novo chat e retomar o documento pendente.
6. Recusar corrupção e destino ocupado sem executar restore; alterar RLS, grant e bytes do
   original em transações isoladas, detectar a divergência e reverter. Executar observação SQL
   e conferir dois logins mínimos com SCRAM, sem privilégio elevado ou bypass de RLS.
7. Recuperar MFA com chave fictícia estável, recusar chave diferente e preservar bloqueio de
   código simples para conta com MFA. As chaves não são gravadas no banco/dump/manifesto/relatório.
8. Guardar somente evidência agregada `result.json`. Dump/manifesto não são artefatos públicos
   de CI. O resultado mede o tempo do ensaio local, não um RTO de produção aprovado.

O dump cobre a **aplicação**, não cluster PostgreSQL, WAL/PITR, logins/senhas globais, configurações
dos provedores ou segredos. Ownership é reatribuído ao operador do restore e conferido; esta
versão exige o mesmo operador/papéis locais. Não há mapeamento de ownership para Supabase nem
restauração remota implementada. Antes de dados reais, definir custódia/cifra/acesso, cópia fora
da falha principal e execução no ambiente efetivo. Não aceitar dump de origem não confiável:
restaurá-lo executa SQL. [Referência PostgreSQL para dump](https://www.postgresql.org/docs/current/app-pgdump.html)
e [restore](https://www.postgresql.org/docs/current/app-pgrestore.html).

## Decisões e provas que impedem a ativação

Prova local final: `.local/pilot-operations/container-d056ad98d2ed41f4baf3873263115ab6/result.json`
e `.local/pilot-operations/c10c5c2feab74083ae0275762d6b8516/result.json`. O wrapper confirmou
encerramento do próprio container. O banco de origem/restauração ficou somente no tmpfs local.
O snapshot comparou **49 tabelas, 1.145 objetos de catálogo e três papéis internos**. No ponto
do backup havia três contas fictícias (duas com código e uma MFA), duas associações/chats,
duas entradas com ambos os lados, três originais/versões/jobs e quatro páginas/chunks/vetores.
O terceiro documento ainda estava na fila e foi concluído depois do restore.

Foram aplicados no banco descartável os 40 arquivos de migration presentes no snapshot,
incluindo 039/040. Os hashes constam do recibo e são conferidos antes/depois do ensaio; isso
não aprova a lógica concorrente do ledger 039 nem substitui a validação da frente documental.
`app_ai_executor` é inventariado se presente, sem criar login ou conceder membership à API/worker.
Papéis globais continuam pré-condição separada para restaurar em outro cluster.

Tempos desta máquina: dump 959 ms, restore/comparação 998 ms e ensaio Node completo 7.867 ms.
São medidas sintéticas locais, sem promessa de RPO/RTO ou capacidade do Render/Supabase.

| Decisão/prova | Estado e evidência necessária |
|---|---|
| Fornecedores, região e transferência de dados | Pendentes; Virgínia continua proposta. Render não oferece região brasileira na lista consultada. Supabase deve ter região definida em conjunto com política e latência. |
| Banco Supabase de integração | Não provisionado/validado nesta rodada; distinto do banco de piloto. Neon sintético continua contingência da Spec 040. |
| Banco de piloto | Não provisionado; não reutilizar Neon nem Supabase sintético. |
| Orçamento e meios de pagamento | Não aprovados; nenhum cartão cadastrado pela frente. |
| RPO | A decidir: perda máxima admissível de gravações confirmadas, em minutos, inclusive documentos e histórico. |
| RTO | A decidir: tempo máximo para restaurar e conferir antes de reabrir, em minutos. Sem medição no destino não há promessa. |
| Retenção | A decidir: dias de backup, histórico, logs e incidentes; alinhar cópias, originais e derivados. |
| Restore completo | Prova local em PostgreSQL 17/SCRAM aprovada; prova no destino efetivo continua pendente. |
| Exclusões/revogações após restore | Dependem de política e registro durável fora do ponto recuperado; não presumir resolvidas. |
| Segredos | Recuperação fictícia das chaves de acesso/MFA testada; custódia, acesso de emergência e ensaio reais continuam pendentes. |
| Operador e suporte | Nomear titular/substituto, canal privado e janela presencial; não inventar escala ou contato. |
| Candidata/review/gates | Fixar revisão idêntica na API e worker, revisar diff completo e executar gates coordenados. |
| OCR/fotos e IA hospedada | Contrato e aceitação pertencem à frente Documentos e IA. Este Blueprint não os ativa. |
| Política e aceitação com dados reais | Pertencem à frente Segurança, dados e validação; documentos reais não entraram nesta entrega. |

Regiões e alteração de região precisam ser decididas antes da criação: no Render mudar região
exige novo serviço. [Regiões Render](https://render.com/docs/regions),
[regiões Supabase](https://supabase.com/docs/guides/platform/regions).

## Custos oficiais consultados em 09/11/2026

USD, antes de impostos/câmbio. Valores indicativos, sem orçamento aprovado ou recomendação de ativar.

| Componente | Parcela conhecida | Variável ou indefinido |
|---|---|---|
| Render web `1c-2g` | US$25/mês equivalente contínuo, 1 CPU/2 GB | Cobrança proporcional ao uso por segundo; dimensionamento ainda precisa de prova. |
| Render worker `1c-2g` | US$25/mês equivalente contínuo, 1 CPU/2 GB | Instâncias/tempo adicionais aumentam custo. |
| Workspace Render | Hobby US$0; Pro US$25/mês | Escolha pendente. Hobby inclui 5 GB de saída; Pro 25 GB; excedente US$0,15/GB. |
| Build Render padrão | Hobby 500 min/mês; Pro 1.000 | Excedente US$5/1.000 minutos; contabilizar builds dos dois serviços. |

Fontes: [preços Render](https://render.com/pricing),
[planos de workspace](https://render.com/docs/new-workspace-plans),
[proporcionalidade e limites](https://render.com/docs/faq).

| Componente | Parcela conhecida | Variável ou indefinido |
|---|---|---|
| Supabase Pro | US$25/mês por organização; US$10 de crédito de compute | Micro US$0,01344/h (~US$10/mês) por projeto; integração separada custa compute adicional. |
| Disco do banco Pro | 8 GB/projeto incluídos | US$0,125/GB excedente; PDFs/fotos em `bytea` consomem banco, não franquia de Storage. |
| Saída Supabase Pro | 250 GB incluídos | Saída sem cache US$0,09/GB excedente; incluir backups, leituras API e worker. |
| Backups Pro | Diários, 7 dias | Backup diário não comprova RPO menor que 24 horas; medir/decidir. |
| PITR opcional | ~US$100/mês para 7 dias | Adicional, não escolhido; 14/28 dias ~US$200/400. |
| Recuperação externa, IA/OCR, domínio e suporte | Indefinidos | Custódia/cifra, retenção, volume, páginas/imagens, modelos e número de chamadas faltam. |

Fontes: [preços Supabase](https://supabase.com/pricing),
[compute por hora e crédito por organização](https://supabase.com/docs/guides/platform/manage-your-usage/compute),
[backups e PITR](https://supabase.com/docs/guides/platform/backups).

**Cenários aritméticos, não cotações:** dois serviços Render + Supabase Pro com um Micro ficam
aproximadamente US$75/mês antes dos itens variáveis, se workspace Hobby for compatível com a
decisão de operação. Um segundo Micro de integração na mesma organização acrescenta ~US$10;
workspace Pro acrescenta US$25; PITR de sete dias acrescenta ~US$100. Não foi escolhido cenário.

Free não constitui caminho validado para este piloto: Render Free adormece após 15 minutos e
não oferece worker Free; Supabase Free tem banco de 500 MB, pausa por inatividade e não inclui
backup automático. Não interpretar franquias como capacidade para documentos reais.
[Limites Render Free](https://render.com/docs/free), [Supabase](https://supabase.com/pricing).
O spend cap Supabase não limita compute/PITR e não é um orçamento global; alertas financeiros e
limite de uso de IA continuam decisões necessárias. [Controle de custos](https://supabase.com/docs/guides/platform/cost-control).

## Contratos para integração pelas outras frentes

**Documentos e IA:** não editei `server.ts`, `create-api.ts`, `worker.ts` ou `processing-worker.ts`.
API e worker devem usar a mesma revisão revisada; o worker recebe somente conexão restrita e,
se aprovado no contrato, credencial OCR específica. Não compartilhar chave de conversa por
conveniência. Startup do piloto deve falhar fechado por configuração incompatível e não escolher
demo/Codex/fallback pago silenciosamente. O Blueprint atual desliga OCR/imagens: a liberação
depende do contrato de documentos/política e de ajuste explícito revisado aqui. `/health` atual
nunca comprova sozinho gravação durável, credenciais válidas ou progresso do worker; precisamos
de prova sintética do caminho persistente antes de reabrir. O endpoint é liveness para Render.

**Segurança, dados e validação:** não editei `AGENTS.md`, `README.md`, `package.json` ou
`docs/quality/traceability.md`. Propostas de comandos únicos, sem carregamento automático de env:

```json
{
  "pilot:preparation": "node scripts/run-tsx.mjs scripts/verify-pilot-preparation.ts",
  "test:pilot:operations": "vitest run --config infrastructure/pilot/vitest.operations.config.ts --coverage",
  "test:pilot:recovery:local": "node scripts/run-tsx.mjs scripts/verify-pilot-recovery.ts"
}
```

Os três comandos foram integrados pelo dono de segurança nesses arquivos, conforme a nota
`pilot-2026-11-16-security.md` consultada ao encerrar. Também li a nota
`pilot-2026-11-16-documents.md`: o autorizador documental permanece negativo por padrão e não
há flag positiva nova a incluir no Blueprint. Não foi enviada mensagem entre chats.

Integração ainda pendente: reserva distribuída de custo/trabalho e recibo durável após geração;
teste de redaction na plataforma/banco/borda; rede/proxy efetivo no Render e no local presencial.
`request.ip` não autentica. Não habilitar `trustProxy: true` genérico nem confiar em header
forjado. Conferir a cadeia autorizada antes de configurar confiança em hops: se a API observar
uma única origem de proxy, a sala compartilha o limite de dez tentativas/15 minutos entregue
pela frente de segurança. NAT também pode compartilhar legitimamente a cota. O ensaio deve
usar navegadores sintéticos distintos, rejeitar `x-forwarded-for` forjado e registrar somente
resultado/contagem, sem IP em texto. A edição da configuração Fastify pertence à frente documental.

Antes de dados reais, comprovar que host, banco e roteador não registram corpos, parâmetros
SQL com payloads, Authorization, cookies ou headers de segredo. Não ligar `log_statement` ou
logs de queries/requests com valores documentais para diagnosticar o piloto. A ausência de
logger no Fastify não comprova redaction da plataforma; a prova efetiva continua pendente.

A revisão por IA de segurança em `docs/reviews/2026-11-09-pilot-infrastructure-ai-review.md`
foi lida sem achados confirmados no snapshot ali identificado. Esta frente posteriormente
endureceu parsing de aspas/tipos, inventário de views/sequências, pré-checagem dos CLIs e
asserção de conclusão da fila restaurada; a revisão daquele snapshot não certifica a versão
final alterada. Novo review da candidata continua necessário; não houve aprovação humana.

Rastreabilidade sugerida: RQ/AC-7001 → `tests/unit/pilot-operations.test.ts` (Blueprint/decisões);
7002/7003 → mesmo teste (guardas, corrupção, falha de dump/restore, comparação) e
`scripts/verify-pilot-recovery.ts` (prova integral local executada); 7004/7006 → runner e wrapper
Docker com SQL real, testes de transporte e esta nota; 7005 → runbooks/custos; 7007 →
`tests/unit/pilot-observation.test.ts`. Não há novo eval nesta frente. Guardar políticas de retenção,
exclusão/revogação e tratamento com referências aprovadas, sem valores de segredos.

## Verificação desta rodada

- **107 testes focados aprovados** em três arquivos; cobertura dos quatro módulos de operação:
  statements **95,80%**, branches **96,58%**, functions **89,74%**, lines **97,00%**.
  Os quatro indicadores superam 80%; isso não é cobertura global. Relatórios exclusivos em
  `.local/pilot-operations/`; snapshot final de verificações em
  `.local/pilot-operations/continuation-evidence-2026-11-09.json`.
- Formatação e lint focados aprovados; TypeScript estrito dos scripts, testes e config aprovado.
- Gate de visão aprovado para 72 specs no estado observado (estrutura, não aprovação semântica humana).
- Verificador local: configuração válida, 14 decisões pendentes, nenhuma conexão/ativação.
- A limitação inicial de CLIs no Windows foi superada iniciando o Docker Desktop existente e
  usando a imagem pg17 já em cache, sem instalação/download. AC-7004/7006 executados localmente;
  não usei Neon como substituto nem li `.env.local` ou configuração pessoal do Docker.
- `--require-decisions` terminou em 1 como esperado, listando as 14 pendências. Runner com
  confirmação inválida também terminou em 1 antes de conectar. Com confirmação e URL **local
  sintética explícitas**, a pré-checagem de ferramentas recusou o ambiente antes de criar
  bancos. A prova positiva posterior está nos recibos identificados nesta nota.
- Sem IA paga, migrations remotas, contratação, deploy ou upload real. Nenhum gate global,
  revisão independente da candidata final ou readiness é alegado. Autorrevisão percorreu o
  delta desta frente, incluindo arquivos novos, configuração, scripts, testes, SQLs e runbooks;
  o diff completo do checkout e gates de merge permanecem para a candidata coordenada.

## Causas encontradas e regressões

- `--version` precisava ser o primeiro argumento das ferramentas PostgreSQL. A regressão
  verifica o vetor de argumentos e o ensaio agora usa os CLIs reais.
- O catálogo falhava ao concatenar `"char"` e truncava identidades por inferência do tipo
  `name` no UNION. Casts explícitos e identidade textual única preservam nomes completos;
  a fixture/asserção de ACL padrão e de unicidade exercitam isso em PostgreSQL real.
- ACL NULL e ACL explícita do proprietário podem representar os mesmos privilégios. A
  comparação agora normaliza grantee, grantor, privilégio e grant option, ordenados por nome.
  Alterar grant ou RLS continua falhando; não se removeram asserções de segurança.
- A inspeção de login NOINHERIT precisava resolver objetos por OID do catálogo, sem assumir
  papel ou conceder USAGE. A prova agora executa o SQL com os dois logins restritos.
- O Windows devolvia duas entradas de `docker` no PATH. O wrapper seleciona o executável
  explicitamente e foi executado de ponta a ponta neste ambiente.
- Os logins sintéticos não tinham senha no primeiro modo `trust`. Foram corrigidos e a
  prova final usa SCRAM, exige sucesso com a senha de fixture e recusa senha errada com `28P01`.

Autorrevisão orientada pela skill `code-review`, seguida de correção e revalidação local.
Não há revisão independente ou aprovação humana da candidata final declarada aqui.

## Observação local preparada

`verify-pilot-observation.ts` lê somente o JSON sintético de exemplo ou `--input=<arquivo>`
com o mesmo contrato fechado. `--reference-time=<UTC ISO>` torna o ensaio reproduzível;
sem esse argumento usa o relógio atual e sinaliza quando a fixture estiver antiga.
Campos desconhecidos, métricas negativas/não finitas e datas inválidas são recusados sem eco.

O exemplo detectou fila parada, falha e lease vencido, manteve cinco sinais ausentes e RPO
pendente. O relatório declara `thresholdsApproved=false`, `deliveredNotifications=0` e
`activationAuthorized=false`. Não existe coletor, agendamento ou destinatário ativo.
`healthFailures` representa o contador consecutivo na janela de cinco minutos fornecido pelo
coletor futuro. Pressão de recurso em uma amostra é ponto de conferência; sustentação temporal,
calibração e entrega de alerta dependem do monitor real. Custos e conteúdo documental não
entram nesse JSON; uma ausência de alerta não certifica saúde.

Os novos comandos diretos estão acima. Se o dono centralizar aliases, propostas adicionais:
`test:pilot:recovery:container` → `pwsh -NoProfile -File scripts/verify-pilot-recovery-container.ps1 -ConfirmSyntheticLocal`;
`pilot:observation` → `node scripts/run-tsx.mjs scripts/verify-pilot-observation.ts`.
Não editei arquivos de propriedade das outras frentes para registrá-los.

## Fila por dependência

| Estado | Trabalho | Dependência/limite |
|---|---|---|
| Concluído localmente | Blueprint, pré-flight e decisões sem segredos | Configuração revisável; 14 decisões reais continuam pendentes. |
| Concluído localmente | Dump/restore integral, integridade, RLS/grants, logins e recuperação de segredos fictícios | PostgreSQL 17 local/SCRAM, sem dados reais ou IA externa. |
| Concluído localmente | Procedimento repetível, recibos e encerramento dos containers próprios | Imagem pg17 em cache; nenhum container desta frente ficou em execução. Docker Desktop existente ficou disponível para desenvolvimento. |
| Concluído localmente | SQLs de observação, avaliação de alertas, atualização/rollback/incidente e custos | Alertas são prévia sintética; titular/substituto, canal, RPO/RTO/retenção não foram inventados. |
| Em andamento | Nenhum item local independente restante nesta revisão | Alterações adicionais devem manter os contratos e repetir os gates aplicáveis. |
| Pronto para começar | Revisão da candidata e integração dos contratos/aliases/rastreabilidade oferecidos | Pacote e hashes disponíveis; dono de cada arquivo mantém a edição. Não enviar mensagens entre chats sem autorização. |
| Bloqueado | Gates globais, build integrado e revisão independente da revisão final | Checkout estabilizado e coordenação das três frentes; ainda há trabalho documental concorrente. |
| Bloqueado | Ensaio de OCR/IA, consumo/recibos e redaction/proxy na configuração final | Contratos da frente documental/segurança e validação própria; nenhuma chamada cobrada nova autorizada. |
| Bloqueado | Supabase sintético/real, hospedagem, backup fora da falha e alertas entregues | Decisão de serviços/região/orçamento, política/custódia e autorização explícita de ativação. |
| Bloqueado | Exclusões/revogações pós-restore e suporte real | Política/registro durável aprovados, responsáveis e canal definidos. |

O trabalho segue por dependências, sem lotes diários ou espera por outro dia. 16/11 permanece
o prazo pretendido, sem dispensar decisões, testes ou gates de liberação.
