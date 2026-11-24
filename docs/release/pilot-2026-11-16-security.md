# Piloto 16/11/2026 — Segurança, dados e validação

**Estado em 11/11/2026:** preparação/integração local concluídas na janela 03/r4; uso real não liberado.
**Propriedade:** segurança, identidade/códigos, Spec 011/068, política e gates finais.

## Extensão local — etapas 5 a 7 / janela 03 encerrada

**Fechamento local:** check final, 2.459 unidades, 247 E2E, cobertura
87,57/83,70/92,84/89,44 (statements/branches/functions/lines), 72 specs, scanner, builds,
runtime e worker separado aprovados. Evals: 20 core, 50 documentais determinísticos e
280 cenários/1.010 turnos mecânicos, sem inferência externa. **Zero mudança nas 910 entradas**
da captura r4; snapshot e 18 evidências em
`docs/reviews/pilot-integration-snapshot-2026-11-11.json`. Relatório final:
`docs/reviews/2026-11-11-pilot-integration-local.md`. Worker/container próprio encerrados.
Revisões dos deltas e gatilhos reproduzidos fechadas, com autoria/exclusões explícitas;
leitura/conciliação técnica do inventário concluída por Infraestrutura; aprovação integral
independente, commit/CI e uso real continuam pendentes. Esta janela é evidência histórica
fechada; mudanças futuras exigem nova candidata/gates afetados. Estados de execução e
reaberturas abaixo registram a sequência anterior e não substituem este fechamento.

**Adendo posterior à captura r4:** Documentos corrigiu somente uma linha de AC-2414 na Spec
024, alinhando-a à escala já vigente. Recibo
`.local/pilot-documents-2026-11-11/post-gates-ac2414.json`, com hashes antes/depois e gate de
72 specs executado pelo dono. A captura histórica mantém 910 entradas iguais no encerramento;
conferência posterior tem 909 iguais e essa diferença documental explícita. Código/config/
testes e os 18 resultados não mudaram; não atribuir o hash novo aos testes anteriores nem
sobrescrever o snapshot. O relatório global registra essa distinção.

**Leitura/conciliação técnica concluída, dona Infraestrutura:** os 744 arquivos do inventário
têm leitura/escopo registrados, sem leitura pendente ou novo P0/P1 concreto no fechamento.
Relatório: `docs/reviews/2026-11-11-full-candidate-infrastructure-review.md`; mapa vivo:
`.local/pilot-operations/full-review/manifest.json`. Os números de 307 pendentes/18 mudadas
de 16:14:59 e a leitura de interface/testes registrada às 16:40:48 permanecem históricos.
Tipos de leitura, autoria e limites não viram aprovação integral independente: autorias
preexistentes não comprovadas, commit/configuração a integrar, CI/status checks e uso real
continuam pendentes. Não se repetiram testes por esta atualização documental.

**Conferência documental desta frente:** mapa por arquivo/hash em
`.local/pilot-security/documentation-review-2026-11-11.json`, escopo/autoria em
`docs/reviews/2026-11-11-pilot-security-documentation-review.md`. Identifica autorrevisão,
leitura integral dos quatro documentos de fechamento e leitura delimitada do trecho de piloto
da matriz; não assina as entradas históricas externas a esse escopo nem o diff inteiro.
Essa conferência anterior permanece preservada; o adendo de estado e os hashes atuais dos
três registros ajustados estão em `.local/pilot-security/final-documentation-closure-2026-11-11.json`.

## Histórico das execuções e reaberturas da janela 03

**Check final r4 aprovado:** `global-check-window03-1794424246880.log`, exit 0,
**2.459/2.459 unidades**, 196 arquivos; cobertura statements/branches/functions/lines
**87,57/83,70/92,84/89,44%**, sem exclusão nova ou redução de assertivas. Formatação/lint/
tipos, 72 specs e scanner passaram. Cópia exclusiva `coverage-window03-1794424246880/`.
E2E final em execução com loopback autorizado e Vite aninhado guardado; builds/runtime/worker
e conferência final ainda pendentes. Fontes permanecem congeladas.

**Congelamento r4 final para gates:** Segurança r6 (24), Infraestrutura r2 (dez) e Documentos
r4 (96) conferidos por SHA-256. Seis deltas do leitor foram relidos, 27/27 afetados passaram
pelo dono e a contraprova independente do startup arquivado passou com 404, sem enfraquecer
assertivas. Infraestrutura revisou a r6/8 canários; nenhum gatilho reproduzido permanece aberto
nesses deltas. `global-window03-before-r4.json` captura 910 entradas; fontes/testes/configs/
specs/ADRs/README/AGENTS/dependências voltam a ficar congelados. Segurança repete check,
E2E com loopback autorizado, builds/runtime/evals e worker local. Aguardar estes resultados
e hashes finais; não executar gates pesados concorrentes. Mapas/notas/relatórios podem avançar.

**Reabertura complementar r4 — página arquivada:** Infraestrutura reproduziu o novo leitor
entregando página integral após arquivo 204 e ausência do catálogo (Spec 020/RQ-2006/AC-2007).
Documentos assumiu somente o mesmo delta de leitor/binding/contrato/testes, exigindo catálogo
ativo e preservando trecho histórico, recuperação autorizada e tenant B. R3 não será tratada
como candidata final; check em curso será preservado sem aprovação da correção posterior.
Antes de nova captura/gates, aguardar a contraprova independente do startup arquivado e a
candidata r4 estável. Segurança r6 já recebeu revisão independente: 24 fontes/13 artefatos,
8/8 canários repetidos e probe verde pelo dono Infraestrutura, sem mudança de produção/040.

**Congelamento r3 para repetição integral:** Segurança r6 (24 fontes), Infraestrutura r2 (dez)
e Documentos r3 (96) conferidos por SHA-256. As sete mudanças documentais foram relidas,
incluindo página integral, composição seed/legislação, negativos de permissão e replay. O dono
passou 26/26 afetados sem reduzir a assertiva original. P2 do Vite aninhado passou 8/8.
Captura nova de 910 entradas: `global-window03-before-r3.json`. Nenhum gatilho reproduzido
permanece aberto nesta seleção; fontes voltam a ficar congeladas para check/E2E/builds/runtime/
worker. Notas, mapas e relatórios podem continuar; não iniciar outro gate pesado concorrente.
O par before/after r2 registrou zero mudança antes da reabertura e é preservado.

**Candidata própria r6 estável para revisão:** 24 entradas/13 artefatos em
`.local/pilot-security/stage6-candidate-2026-11-11-r6.json`. Somente quatro deltas da r5:
RNF/AC-7215, regressão e `envDir:false` no proxy E2E. Vermelho preservado (7/8), verde **8/8**
em `crossreview-env-1794423395649-29780/results.json`; objeto real extraído via AST, somente
canário temporário, zero listener. Tipos estritos do teste, lint, formatação e visão passaram.
Produção/040 e todos os controles continuam iguais. Infraestrutura pode revisar esse delta;
não repetiremos E2E antes da correção documental e nova captura coordenada. Build web passou
em diretório exclusivo com `envDir:false` (`global-build-web-window03-1794423283828.log`).

**Segurança assume o P2 de Vite aninhado encontrado por Infraestrutura:** reabertura somente
de AC-7215/RNF 072, `synthetic-test-env.test.ts` e `demo-web-research.e2e.test.ts`. A instância
interna não herda a guarda Vitest; acrescentar `envDir:false` e regressão que extrai o objeto
real, resolvendo-o contra canário temporário, sem iniciar servidor ou ler ambiente real.
As duas execuções E2E anteriores não comprovam esse isolamento aninhado e permanecem
históricas. Documentos conserva a correção do leitor/demo; fontes restantes ficam estáveis.

**E2E com loopback autorizado confirmou a separação:**
`global-e2e-window03-1794423173672.{log,json,xml}`: **246/247**, somente o 403 do PDF novo
permanece. Todos os 37 casos antes bloqueados por EACCES passaram. A próxima repetição usará
essa mesma condição local; não é autorização de rede/serviço remoto. Falta o binding do leitor
documental do demo, já localizado abaixo, antes do gate E2E verde.

**Gatilho 403 localizado para Documentos:** o startup demo recupera uploads por
`developmentDocumentMemory.index`, mas `documentSourceReader` em `server.ts:278` ainda usa
somente `seededDevelopmentChunks`. `captureReplay` agora exige ler a página citada antes de
gravar o journal, e o leitor estático não conhece a versão recém-enviada. Conferir a composição
do leitor autorizado de memória/upload/seed/legislação, conservando hash integral, escopo e
negação de fonte ausente; não remover a guarda para fazer passar. A fixture antiga é um
controle positivo de PDF realmente enviado e não deve passar a aceitar 403. Reabertura
limitada ao binding/contrato/testes desse leitor, com aviso da frente antes da mutação.
O helper estático `createDevelopmentDocumentSourceReader` devolve só o primeiro chunk da
página; expor apenas o array dinâmico a esse helper não basta para o hash integral/offsets.
O leitor do upload precisa reconstruir/conservar a página inteira, incluindo citação no fim,
e negar permissão/tenant/versão divergentes. Reutilizar a leitura autorizada existente quando
possível e acrescentar controle positivo de página longa com mais de um chunk.
Ao reutilizar `analysisReader`, observar que ele filtra vigência confirmed/not_applicable;
o contrato do leitor de fonte também sustenta conflito pending e histórico. Conservar os
controles positivos já verdes para conflito pendente, além do isolamento e da página integral.

**E2E da r2 em investigação, sem aprovação:** `global-e2e-window03-1794423064379.log` e
JSON/JUnit adjacentes: 209/247 passaram. Trinta e sete casos de HTTP loopback falharam com
`connect EACCES 127.0.0.1` no sandbox; serão repetidos com execução local autorizada fora dessa
restrição, sem serviço remoto. Um caso distinto, `document-answer.e2e.test.ts:109`, retornou
403 ao consultar PDF recém-enviado ao condomínio criado no modo sintético. Documentos deve
investigar esse gatilho sem reduzir 200/citação/isolamento exigidos; não presumir que seja a
mesma causa de ambiente. Somente delta concretamente necessário pode ser reaberto com aviso;
demais fontes continuam congeladas. Check unitário r2 permanece evidência histórica válida.

**Check integral da r2 aprovado:** `global-check-window03-1794422747440.log`, exit 0,
2.455/2.455 unidades em 196 arquivos; cobertura statements/branches/functions/lines
87,55/83,69/92,83/89,42%. Formatação/lint/tipos/visão/scanner passaram. A tentativa vermelha
anterior permanece preservada; não houve mudança de timeout, assertiva ou dependência.
E2E/builds/runtime/worker e conferência final de hashes continuam em execução coordenada;
fontes permanecem congeladas. Relatórios podem ser atualizados, sem gates pesados paralelos.

**Retomada congelada r2 (11/11):** Documentos publicou 95 entradas estáveis, 362 unidades e
2/2 SQL atuais (`container-911401d9b83548b58e82029a849a8fdd`, encerrado). As cinco mudanças
autorizadas foram relidas; retenção conserva a asserção anterior e ganhou preparo completo/
rollback sem purga. Infraestrutura repetiu seis unidades independentemente. A captura
`global-window03-after.json` registra somente esses cinco deltas da primeira tentativa.
Novo conjunto de 910 entradas em `global-window03-before-r2.json`; fontes voltam a ficar
congeladas enquanto Segurança repete o check integral com quatro workers, ambiente explícito
e pnpm instalado. Sem outros gates pesados concorrentes; notas/mapas podem ser atualizados.

**Reabertura delimitada pelo primeiro check global (11/11):** 2.444/2.453 passaram;
oito casos excederam 5 s e a retenção sem observador configurou o tenant duas vezes.
Documentos já assumiu o ajuste mínimo no repository, unidade, config focada e exemplos 071,
preservando o vermelho e as assertivas de tenant/ordem. Demais fontes continuam congeladas.
O snapshot `global-window03-before.json` é histórico dessa primeira tentativa; após a nova
candidata será capturado outro snapshot, sem sobrescrever o anterior. A repetição usará
`VITEST_MAX_WORKERS=4`, opção suportada pelo Vitest instalado, sem aumentar timeouts ou
reduzir casos/cobertura. Log: `.local/pilot-security/global-check-window03-1794422113310.log`.

**Congelamento coordenado em 11/11, após a publicação de prontidão dos três donos:**
Segurança r5 (23 entradas), Infraestrutura r2 (dez) e candidata documental de 11/11 tiveram
todos os hashes conferidos sem diferença. Documentos concluiu 430/430 focados, 356/356 unidades
com quatro indicadores acima de 80% e 2/2 SQL amplos sob a guarda de ambiente; Infraestrutura
concluiu 139 unidades/17 RLS e manutenção atual; Segurança concluiu 43 unidades/177 composição/
seis SQL. Nenhum gatilho P0/P1 reproduzido permanece aberto nesta revisão.

A janela `security-local-20261109-03` agora congela fontes, testes, configurações, specs,
ADRs, README/AGENTS e dependências. Donos podem continuar leitura e atualizar notas/mapas/
relatórios, sem alterar entradas executáveis. Bug concreto reabre somente o delta afetado;
avisar pelo índice antes de mutar. Segurança captura o conjunto global e executa os gates
aplicáveis com ambiente explícito, sem dotenv automático, chamada externa ou serviço remoto.
Não é aprovação do diff inteiro, merge, CI ou dados reais. Parágrafos de janela aberta abaixo
pertencem ao histórico da correção e não autorizam edição durante este congelamento.

**Hash da página corrigido — contraprova verde 49/49:** a fonte atual conserva hash privado
da página inteira e o compara no replay. Alteração fora do trecho agora retorna 403, sem segunda
geração; histórico permanece acessível. A cópia do probe original manteve assertivas:
`question-page-content-green-20261111.json`. Os oito casos mantidos, política do lote, UI,
restore e callback passaram em `crossreview-green-replay-1794421374058-26680/results.json`
(49/49), com `envDir:false`. Fontes/novos exemplos foram relidos; os relatos vermelhos abaixo
são históricos. Não há gatilho P1 documental reproduzido ainda aberto nesta revisão; faltam
apenas conferir hashes finais, bateria/SQL atuais do dono e revisão completa antes da candidata.

**SQL próprio repetido sob r5:** `postgres-1794420919101-11476/results.json`, **6/6**; log
`stage6-postgres-1794420951834.log`, prova detalhada
`.local/pilot-operations/security-3684b196f7014f35944a35dfbae24553/maintenance-result.json`.
Container próprio continua reservado ao fechamento; sem IA, remoto ou reabertura.

**P1 restante do mesmo contrato de replay — dono Documentos:** vigência foi corrigida, mas
alterar conteúdo da página fora do trecho citado, com catálogo/trecho iguais, ainda retorna
200/corpo idêntico/uma geração. Prova `question-page-content-probe-20261111.json`, config com
`envDir:false`, em `.local/pilot-security/`. RQ-7115/AC-7125 exigem negar dependência/hash
alterados; capturar/revalidar o conteúdo completo, sem regenerar ou negar histórico literal.
Relato preciso no review de 11/11. Primeiro conflito pending e seu replay idêntico passaram;
essa regressão P2 original está corrigida. Janela global continua aberta pelo hash da página.

**Candidata própria r5 publicada para revisão:**
`.local/pilot-security/stage6-candidate-2026-11-11-r5.json`, 23 fontes e 11 artefatos. Apenas a
guarda de ambiente/AC-7215/configs e documentação mudaram desde r4; módulos de produção/040
permanecem idênticos. **43/43 unidades** (36 plano + sete ambiente), **sete unidades após ajuste
do cleanup**, tipos estritos do delta, lint, Prettier e visão de 72 specs passaram. O lint
inicial encontrou throw no finally do teste; extração da guarda para helper conservou a checagem
de raiz/prefixo e passou. **177/177 da composição** passaram sem leitura automática de `.env`,
em `integration-1794420526261-25620/results.json`. Infraestrutura pode revisar esse delta
delimitado sem repetir os módulos de produção já revisados. Próximas execuções usam a guarda.

**Gatilhos dos P1 de purga revalidados em SQL:** cópias dos dois probes originais mantiveram as
assertivas e passaram no container próprio, com fixture em transação revertida. Zero originais/
storage restantes; duas decisões aplicadas/duas invalidações concluídas sem lock timeout.
Artefatos `orphan-purge-green-20261111.json` e `multi-purge-lock-green-20261111.json` em
`.local/pilot-security/`; vermelhos preservados. Fontes corrigidas foram relidas. Ainda conferir
os testes mantidos de repetição/restore/B e a nova candidata do dono antes de fechar a revisão.

**Correção delimitada de isolamento dos testes — em validação por Segurança:** Vite 8 lê
arquivos `.env*` por padrão mesmo com ambiente filho mínimo. A presença de `.env.local` foi
conferida só por metadados, sem abrir seu conteúdo. Regressão nova AC-7215 usa exclusivamente
um `.env.test.local` criado no temporário sintético: **sete falhas antes, sete sucessos depois**
de `envDir:false` nas duas configs globais e cinco configs da Segurança. Artefatos
`crossreview-env-1794420366827-18516/results.json` (vermelho) e
`crossreview-env-1794420390333-28416/results.json` (verde) em
`.local/pilot-security/`. Spec/aceitação 072 precederam o ajuste. Nenhum segredo foi impresso,
copiado ou consultado para testar; saídas anteriores continuam históricas, mas a afirmação de
que ambiente mínimo por si só impedia leitura de `.env` não se sustenta e fica corrigida aqui.

**Ação dos donos:** Documentos deve aplicar `envDir:false` às suas duas configs Vitest;
Infraestrutura, às configs operations/RLS. Scripts Node/tsx sem env-file continuam distintos.
Próximos testes Vite e build devem desativar leitura automática antes de rodar. Segurança está
preparando candidata r5 e reteste dos gates afetados; root/testes/configs próprios ficam abertos
somente para essa correção. Não ler conteúdo de `.env`, mover/renomear credenciais ou ampliar
exclusões/cobertura. As contraprovas de domínio continuam válidas em seu escopo, mas os ensaios
Vite afetados devem ser repetidos sob a guarda explícita antes de fechar a candidata local.

**Revisão adicional da extensão operacional entregue:** nove entradas atuais de Infraestrutura
foram lidas integralmente e conferidas iguais antes/depois; **11/11 guardas** repetidas por
Segurança passaram. Relatório `docs/reviews/2026-11-11-pilot-maintenance-security-review.md`,
mapa `.local/pilot-security/infrastructure-maintenance-cross-review-20261111.json`. Não inclui
aprovação independente dos controles escritos pela Segurança nem fecha achados documentais.
Pode completar a cobertura operacional da candidata sem esperar que Documentos repita essa
mesma leitura. SQL do dono foi conferido por inputs/asserções, não repetido integralmente aqui.

**Guarda documental de restore revalidada:** fonte/negativas do novo helper foram lidas e as
sete unidades mantidas passaram em `crossreview-restore-1794419849006-24480/results.json`, sem
Docker ou efeito SQL. Usa somente destinos novos/vazios marcados; não executa DROP para resetar
cópia. Prova SQL futura deve usar o helper atual; o sucesso anterior não certifica esse delta.

**Mapa ampliado de leitura publicado:**
`docs/reviews/pilot-documents-security-coverage-2026-11-11-r2.json` preserva o mapa inicial e
acrescenta fontes completas/diffs e testes/contratos da extensão já lidos. É cobertura parcial
de revisão, com exclusões de autoria e pendências explícitas; não aprovação do branch.
`App.tsx` foi revisto em `conversationFetch`, sem declarar o restante do diff lido por esta
frente. Alterações posteriores exigem releitura; achados abertos continuam no review de 11/11.

**Candidata própria r4 — coerência do ADR:** `.local/pilot-security/stage6-candidate-2026-11-11-r4.json`
preserva r3 e altera apenas ADR 0044: a proibição de migration refere-se ao destino real;
as provas SQL locais autorizadas e ligações sintéticas já executadas estão explicitadas.
Produção/testes e sete artefatos permanecem iguais, Prettier passou. Os três deltas documentais
de r3/r4 ficam identificados para conferência de Infraestrutura; não pedem nova autorização
nem mudam os contratos testados. Relatório próprio atualizado distingue a revisão recebida
dos achados documentais ainda pendentes.

**P1 de lote confirmado em SQL — dono Documentos:** duas decisões de purga na mesma
`reapplyDocumentPurges` entram em espera circular: o trigger da primeira conserva o lock global
do ledger; a segunda chama ledger em outra conexão que espera esse mesmo lock. Prova real
guardada/revertida em `multi-purge-lock-red-r2-20261111.json`: duas invalidações iniciadas, uma
concluída, SQLSTATE 55P03 na segunda, sem COMMIT. O caminho de retenção com observer compartilha
o encadeamento. Relato/contrato no review de 11/11. Corrigir e testar lote de dois sem remover
locks/decisão durável ou mudar consumo. Janela global permanece aberta.

**P2 da UI — contraprova ampliada verde:** os sete casos independentes de Infraestrutura foram
reexecutados com o harness adaptado somente aos imports novos de validadores reais (assertivas
intactas), em `.local/pilot-security/crossreview-probes-1794419422649-16524/results.json`.
Snapshot analysisOnly agora libera a chave após sucesso; síntese incompleta recusada pelo
consumidor real conserva a chave. A primeira cópia do harness falhou no import relativo após
mover a pasta; corrigir o caminho permitiu importar, sem mudar produto ou expectativas.

**Contraprova atual de replay — 32/32 mantidos e gatilho original verde:** nova revisão de
catálogo nas perguntas nega confirmed→pending/disputed/superseded; confirmed idêntico recupera
sem nova geração e o histórico continua consultável. Testes do dono repetidos por Segurança:
`.local/pilot-security/crossreview-current-1794419275808-23968/results.json`. Prova original
em cópia sem alterar assertivas passou: `question-validity-green-20261111.json`. O vermelho
foi preservado. Isso fecha o gatilho original, mas apareceu regressão P2 na primeira explicação
de conflito: resposta `answerMode=conflict` citando minuta pending vira 403 ao capturar procedência.
Relato e contraprova no review de 11/11, `question-conflict-red-20261111.json`; dono Documentos.
Não congelar enquanto a purga órfã/P2s estiverem em correção; nenhum arquivo do dono foi editado.

**Candidata própria r3 — ajuste documental delimitado:** README/AGENTS agora descrevem os
dois bancos de backup/restore e o terceiro destino novo de manutenção, todos em quarentena,
conforme o runner e a revisão independente de Infraestrutura. Manifesto preservado em
`.local/pilot-security/stage6-candidate-2026-11-11-r3.json`; somente esses dois hashes mudaram
desde r2. As outras 15 entradas e sete artefatos foram conferidos iguais. Prettier desses
documentos passou; produção/testes não mudaram. Revisão independente de 17 entradas recebida
em `docs/reviews/2026-11-11-pilot-security-infrastructure-review.md`. Janela global continua
aberta pelos achados documentais abaixo; isso não é aprovação integral.

**P1 adicional de ciclo de dados — dono Documentos:** o callback `purge_condominium_content`
retorna sucesso mas conserva original/storage órfãos quando não existe document_version (crash
entre armazenamento e registro do upload). Prova SQL real em transação revertida: um original
e um objeto restantes, esperado zero. Artefatos `.local/pilot-security/orphan-purge-repro.ts`,
`orphan-purge-red-20261111.json`; achado em
`docs/reviews/2026-11-11-pilot-documents-security-review.md`. Correção segue na janela 03 pelo
dono, com teste de órfão/restore/idempotência, B intacto e histórico/recibos preservados. Sem
ampliar a purga de versão individual. Não congelar global até fechar os dois P1 novos.

**P1 novo confirmado na revisão de 11/11 — dono Documentos:** replay de pergunta fundamentada
continua HTTP 200/corpo idêntico quando a vigência da fonte passa de confirmed para pending, com
página e política operacional intactas. A validação nova confere só texto da página nesse ramo;
o catálogo é conferido apenas no lote. Regressão vermelha/prova em
`.local/pilot-security/question-validity-{tests-red,red}-20261111.json`; relato exato em
`docs/reviews/2026-11-11-pilot-documents-security-review.md`. **Janela 03 continua aberta para essa
correção pelo dono**, sem alterar controle/orçamento da Segurança. Não negar leitura histórica,
gerar novamente ou gastar para contornar o conflito. Não congelar a candidata global com esse P1.

**Mapa parcial publicado para a Infraestrutura:**
`docs/reviews/pilot-documents-security-coverage-2026-11-11.json` identifica 22 fontes documentais
de hash idêntico à candidata anterior, com leitura do diff/fonte e contratos, mais exclusões
explícitas de autoria compartilhada. Não aprova o branch: extensão alterada/testes/docs ainda
precisam de fechamento por hash. Contraprova independente atual de replays: **26/28**, duas
falhas do P2 já ampliado pela Infraestrutura (snapshot analysisOnly e consumidor real do lote
incompleto). Log `crossreview-replays-20261111-r1.log`, JSON
`.local/pilot-security/crossreview-replays-1794418460962-20188/results.json`. Os gatilhos originais
do P1 de política do lote e do corpo HTTP interrompido passaram. Nada foi declarado dispensado.

**Retomada em 11/11:** AGENTS atual e briefing relidos. Fontes parciais e evidências preservadas;
etapa 6 continua em edição/teste, não congelada. A última prova SQL tinha três cenários aprovados
e o novo cenário de manutenção negado na aplicação inicial do plano; investigação continua sem
afrouxar guardas. Docker local estava desligado; a revisão automática rejeitou iniciar Docker
Desktop por interpretar a restrição de ativação como abrangendo serviços locais. Permissão
específica pendente; nenhuma tentativa indireta será feita. Revisão/unidades avançam.
Documentos/Infraestrutura podem concluir correções próprias e publicar hashes; a pausa histórica
da janela 02 não se aplica. Nova candidata deve incluir P1 de journal/FK e P2 do recibo da UI.

O usuário autorizou expressamente iniciar **Docker local** após o bloqueio automático; início
concluído sem download/serviço remoto. Novo container sintético próprio
`container-d501dc8877d142b8bf5ea416764cb376` passou recovery e está reservado aos testes desta
frente. Unidades do plano **34/34** passaram; a primeira execução de 11/11 não chegou aos testes
por EPERM no temporário do sandbox; repetir com TEMP/TMP privados resolveu sem enfraquecer teste.
Diagnóstico SQL sintético identificou a negativa: revogação precisa preencher `revoked_at`,
como exige a constraint existente. Ajuste conserva timestamp e idempotência; nova prova segue.

**Coordenação atual:** a janela 02 permanece encerrada e imutável. A janela
`security-local-20261109-03` permite aos donos alterar spec/aceitação e a menor fatia local
necessária às correções e ao ciclo de dados sintético. Ainda não é janela de gates congelada.
Não ativar serviços, credenciais, destinos remotos, CI, IA externa ou dados reais.

- **Documentos:** corrigir o P1 do replay HTTP registrado pela Infraestrutura em
  `docs/reviews/2026-11-09-full-candidate-infrastructure-findings.md`, conservando o P1 já
  corrigido no ledger. É dono da exportação/expurgo de conteúdo e invalidação de resultados,
  inclusive efeito na exclusão do condomínio. Segurança está reproduzindo possível FK nova
  da migration 039 que bloqueia a exclusão; não corrigirá módulos/migrations documentais.
- **Segurança:** revisão cruzada do delta documental, contrato de política sintética explícita,
  decisões restritivas duráveis fora do snapshot, revogação e reconciliação segura de unknown.
  Sem prazo/base legal real presumidos. Recibos/cotas não podem desaparecer nem liberar retry.
- **Infraestrutura:** coordenar mapa da revisão completa e integrar o ensaio pós-restore aos
  seus runners guardados. Restaurar em quarentena, conferir inventário e reaplicar decisões
  posteriores antes de qualquer elegibilidade; sem reabertura automática.

**Contrato local da etapa 6:** plano versionado autenticado, allowlist de UUIDs sintéticos,
política/revisão explícitas e elegibilidade injetada; ausente/adulterado/divergente nega.
Eventos ficam em arquivo privado fora do dump de `app`, antes dos efeitos, com sequência e
reaplicação idempotente. Exportação/expurgo documental é callback do dono; revogação restritiva
é da Segurança. Histórico/citações e derivados seguem o modo sintético declarado, sem escolher
retenção real. Outro tenant deve permanecer intacto. Reconciliação só aceita prova durável de
resultado confirmado ou cancelamento anterior ao dispatch; dispatched/uncertain sem prova
permanece bloqueado. Não apagar recibos, zerar consumo ou reenviar para resolver unknown.

Cada dono publica contrato/candidata/hashes e testes antes de a janela 03 congelar. Segurança
revalida gates afetados e consolida limitações. A revisão de autoria própria não conta como
independente; faltas de cobertura permanecem explícitas no mapa da Infraestrutura.

**P1 documental confirmado:** a FK nova da migration 039 bloqueia a exclusão real do condomínio
com SQLSTATE 23503; a mesma fixture sem recibo exclui normalmente. Ensaio em SQL real local,
integralmente revertido, zero provedor. Achado e contrato da correção documental em
`docs/reviews/2026-11-09-pilot-documents-security-review.md`. Dono Documentos deve conservar
compromisso/custo e eliminar resultado privado sem cascade dos recibos. Janela 03 permite a
correção e regressão; não é preciso aguardar nova permissão. Segurança mantém seu escopo.

**API concreta da etapa 6 em implementação:** `apps/api/security/synthetic-data-controls.ts`
exporta `createSyntheticDataControls({connectionString,confirmation,policy,key,eligible,
applyDocumentDecision})`, `captureFence()`, `applyPlan(path,expectedDigest)` e `close()`.
`synthetic-maintenance-plan.ts` exporta política/plano/decisões e persist/load HMAC. O callback
documental recebe `(PoolClient, decision)` na mesma transação, ações `purge_document_version`
e `purge_condominium_content`. Não duplicar um total monetário: fence une os recibos da Spec 072
e metadados do ledger sem resultados; desconhecido não dá novo envio. Infraestrutura pode usar
o contrato sem editar esses módulos; integração só após testes/hashes publicados. O modo real
continua negado. Migrações/catalog schema são vinculados por `maintenanceInventoryDigest`.

### Contrato da Segurança pronto para integrar — 11/11

**Candidata própria estabilizada para revisão cruzada:** 17 entradas/hashes e seis artefatos em
`.local/pilot-security/stage6-candidate-2026-11-11.json`. **36/36 unidades**, **6/6 cenários SQL/HTTP
amplos**, lint e tipos aprovados; relato em
`docs/reviews/2026-11-11-pilot-security-controls-local.md`. Não alterarei esses módulos/specs/testes
durante a revisão, salvo correção delimitada de achado/gate publicada aqui. Notas e relatórios
podem continuar. Esta estabilização própria **não congela os outros donos** e não é gate global.
Infraestrutura deve revisar `synthetic-maintenance-plan.ts`, `synthetic-data-controls.ts`, helper
de ID, migration 040 e testes/deltas de contrato. A migration 040 inclui **seis definições de
identidade canônica** (resolver + cinco funções legadas); seu hash mudou após a primeira prova
do runner de manutenção. Comparar inputs antes de reaproveitar aquela prova; no gate final,
executar novamente somente o que foi afetado. Documentos deve terminar correções/candidata própria.

**Ajuste delimitado de teste:** acrescentada conferência explícita do caminho absoluto/prefixo
do temporário antes da limpeza recursiva em `synthetic-maintenance-plan.test.ts`, conforme regra
do ambiente Windows. Nenhum módulo/SQL/spec mudou. Repetir somente as 36 unidades e publicar
delta de hash; o manifesto anterior permanece histórico. Não invalida comportamento SQL testado.

**Ajuste revalidado:** 36/36 unidades passaram em `stage6-plan-unit-20261111-r6.json`;
manifesto atual `.local/pilot-security/stage6-candidate-2026-11-11-r2.json`, com **um único hash
alterado** (teste de limpeza). Os outros 16 inputs estão idênticos. Candidata própria volta à
estabilidade para revisão. Nenhuma mudança funcional após o SQL 6/6 registrado.

**Contraprova P1/FK independente aprovada:** AC-7126 na suíte SQL da Segurança passou com ledger
completed e recibo operacional unknown: exclusão real, resultado removido, custo/recibo retidos,
escopo órfão negado e B intacto. Vermelho original preservado. A nova prova 6/6 está em
`.local/pilot-security/postgres-1794417866442-25316/results.json`.

**Novo defeito de integração assumido pela Segurança:** Documentos reproduziu que a sessão
entrega UUID, mas o resolver privado antigo aceita somente auth_subject. RQ-6806/AC-6821 e ADR
0040 detalhados antes da correção: a migration 040 reconhecerá UUID canônico sem fallback para
alias UUID de outra conta; identidade legada não UUID e RLS permanecem. Não editar os adaptadores
documentais em paralelo; corrigir o resolver compartilhado e executar regressão SQL/HTTP própria.

**Correção do resolver entregue para revalidar:** migration 040 passa a reconhecer UUID canônico
por `users.id` e mantém subjects não UUID; conta inativa/UUID ausente não cai em alias homônimo.
Regressão própria SQL/HTTP reproduziu **403 no acesso legítimo** antes da correção: quatro
outros cenários passaram, AC-6821 falhou em
`.local/pilot-security/postgres-1794417195815-29656/results.json` (evidência vermelha preservada).
Documentos pode repetir o runner `documents` em **banco novo migrado**, sem alterar auth_subject
da fixture para contornar o defeito. Não modificar migrations de banco já preparado; os runners
criam destinos novos. Prova verde da Segurança em execução. Spec/gate de visão 72 passaram antes
do SQL. O ajuste da formatação do cabeçalho da Spec 072 conserva o mapeamento e o gate original.

**Verde do resolver e manutenção:** cinco cenários SQL/HTTP amplos passaram no log
`.local/pilot-security/stage6-postgres-1794417345430.log`. AC-6821 reconhece cookie/UUID com
auth_subject distinto, nega condomínio do alias homônimo e conta bloqueada sem fallback; legado
não UUID preservado. A mesma execução conserva todas as provas de consumo/plano/restore. Donos
podem revalidar em banco novo com 040 atual. A candidata ainda passa por revisão e gates afetados.

A ampliação de AC-6821 encontrou o mesmo problema na carteira: a função legada retornava o
condomínio do auth_subject colidente, apesar de membership/HTTP já corrigidos. Vermelho
`.local/pilot-security/postgres-1794417452333-27528/results.json`. A migration 040 agora redefine
explicitamente as cinco operações legadas de condomínio/perfil para delegar a identidade ao
resolver canônico, preservando seus corpos de domínio/grants. Não foram alteradas as migrations
antigas nem arquivos de outros donos. A prova verde ampliada inclui carteira e CRUD/perfil; em
execução antes de publicar hashes finais. Integrações devem usar banco novo migrado.

**Atenção ao dono documental:** a composição ampliada executou 174/175 cenários, com uma falha
em `tests/unit/postgres-hosted-call-ledger.test.ts:123`: o teste antigo proíbe toda ocorrência de
SECURITY DEFINER na migration 039, agora usada pelos guards/triggers da correção de exclusão.
Log `.local/pilot-security/stage6-composition-20261111-r1.log`, JSON exclusivo em
`.local/pilot-security/integration-1794416755423-28768/results.json`. Não enfraquecer isolamento:
o dono deve atualizar o contrato/teste para conferir funções de search_path fixo, grants/RLS,
escopo ativo, invalidação e ausência de login/runtime membership. Segurança não editará esse
teste alheio. A falha antiga não é declarada aprovada pelos cenários SQL novos.

**Quatro cenários SQL amplos passaram** em
`.local/pilot-security/postgres-1794416664392-25664/results.json` (log
`.local/pilot-security/stage6-postgres-1794416684000.log`). O quarto inclui plano HMAC externo
ao dump, reaplicação com recibos de decisão sobreviventes, callback transacional com falha/
rollback, revogação efetiva de códigos/sessões/desafios, membership A revogada com B preservado,
consumo/login posteriores ao snapshot, resultado perdido cercado como uncertain e reconciliação
completed/cancelled/pending sem transporte. Alterar RLS nega; restaurar RLS permite retomar.

Infraestrutura pode **integrar agora** os módulos próprios da Segurança sem os editar. Política
de manutenção é inteiramente explícita e inclui IDs fictícios de todos os recibos do corte;
`migrationDigest = await maintenanceInventoryDigest(client)` vincula schema/constraints/indexes/
funções/policies e privilégios efetivos, com nomes completos e sem depender dos OIDs do restore.
`snapshotDigest` deve ser o hash do manifesto da cópia já conferida. Desabilitar política de
consumo e parar jobs antes de capture/apply; `eligible` é callback obrigatório e falta nega.
Criar plano completo versionado, chamar `persistMaintenancePlan` com chave sintética de pelo
menos 32 bytes, ancorar o digest retornado **fora do dump** e só então `applyPlan`. Arquivo
exclusivo/flush não pode ser sobrescrito. Novo processo usa o mesmo plano/política/chave/âncora.
Callback documental `(client,decision)` usa a mesma transação para as duas ações de expurgo e
deve ser idempotente. Não criar outra política monetária ou somar compromisso espelhado.

O retorno sempre mantém `quarantined=true` e `activationAuthorized=false`. `captureFence`
exporta apenas recibos mínimos, hashes, contadores e cercas; nenhum resultado ou claim aberto.
Plano parcial/diferente, política positiva, trabalho ativo ou esquema adulterado negam. O
onDiagnostic opcional expõe somente fase fechada, sem causa nativa/payload. Gates globais e
revisão independente da candidata atual ainda serão coordenados após estabilizar todos os donos.

**Coordenação atual — janela `security-local-20261109-02` ENCERRADA com gates locais aprovados.**
Check completo exit 0; 2.347 unidades, 232 E2E, cobertura 89,02/85,09/93,92/90,84,
72 specs e scanner aprovados. API/web/runtime, 17 RLS, worker separado local e evals
determinísticos/sintéticos passaram. Zero mudança nos 834 arquivos da captura r3 durante os
gates; zero mudança funcional entre r2 e r3. A pausa pode terminar. Qualquer alteração posterior
invalida as evidências afetadas e exige nova revisão/teste. Nenhuma liberação real é emitida.

Relatório consolidado: `docs/reviews/2026-11-09-pilot-integration-local.md`;
manifesto final: `docs/reviews/pilot-integration-snapshot-2026-11-09.json`.
Containers usados por esta frente foram encerrados; relatórios/backups sintéticos preservados.

O diff-check do escopo da integração passou. O diff-check do checkout inteiro registrou quatro
hard breaks Markdown preexistentes na Spec 016 (linhas 64–67), preservados por não pertencerem
à tarefa. Esse aviso e a revisão completa/CI ainda pendentes impedem chamar o branch de aprovado;
não invalidam os resultados de check/E2E/SQL registrados. Ver os dois logs distintos no relatório.

### Registro histórico da execução e correção da janela 02

**Janela 02 em execução:** Documentos declarou candidata pronta; Infraestrutura registrou
suspensão de mutações na etapa 4. Snapshot de **834 arquivos** em
`.local/pilot-security/global-window02-before.json`, conferido sem alterações antes dos gates.
Manter a pausa de mutações até o resultado/encerramento publicado aqui. Check, E2E e provas
guardadas serão executados; qualquer falha ou mudança será registrada, sem aprovação antecipada.

**Correção atômica solicitada — unidade de startup:** check passou formatação, lint e tipos;
unidade terminou **2.346 aprovados / 1 falha em 187 arquivos**. Falha única em
`tests/unit/offline-demo-ui.test.ts:28`, que exige literalmente `unavailableOcrAdapter,` em
server/worker, agora substituído pela fábrica negada `createHostedDocumentProcessingAdapters()`.
Log `.local/pilot-security/global-check-window02-r2.log`. **Documentos pode ajustar somente
esse teste/contrato afetado**, conservando a negativa por flags/chave e conferindo comportamento
de startup; não remover a proteção ou enfraquecer asserções. Publicar hash/resultado e voltar à
pausa. Demais fontes continuam congeladas. Check/cobertura não estão aprovados; nova execução
será feita sobre o snapshot atualizado. Não corrigirei o teste do dono em paralelo.

Na mesma correção documental delimitada, eliminar a duplicação de `RQ-7110` na Spec 071
(composição em linha 212 e integração central em linha 226). Preservar composição como 7110 e
identificar integração central como 7111, com AC-7119/refs correspondentes coerentes, ou registrar
outro mapeamento único explícito. Não muda comportamento nem autoriza reprocessamento. A pausa
das fontes funcionais continua; o ajuste permitido é no teste citado e na numeração da Spec 071.
E2E/worker/RLS podem avançar porque essas entradas não dependem desse teste unitário/numeração;
os hashes de app e dos próprios cenários serão conferidos ao final.

**Correção atômica recebida e revisada:** o teste conserva proibição de fábrica OCR por ambiente
e acrescenta prova comportamental com flags/chave sintéticas, adaptador indisponível e fetch
nunca chamado. Spec 071 agora tem RQ-7110/7111 distintos. Somente os dois Markdown da Spec 071
e `offline-demo-ui.test.ts` mudaram; **zero mudança funcional** no snapshot de 834 arquivos.
Nova captura `.local/pilot-security/global-window02-r3-before.json`. Documentos voltou à pausa.
Check será repetido integralmente; E2E **232/232 em 37 arquivos**, RLS **17/17** e worker separado
local passaram na janela. Containers desses dois gates foram encerrados. Relatórios exclusivos
em `global-e2e-window02.json`, `global-rls-window02.log` e `global-worker-window02.log`.

API/web compilaram e runtime compilado passou (dois PDFs/20 perguntas, zero provedor). Replays
sintéticos: 50/50 contratos documentais e 280 cenários/1.010 turnos sem falha mecânica;
sem avaliação semântica aprovada. Esses relatórios são exclusivos desta janela e não substituem
o check reprovado. A próxima captura identificará a correção atômica e os gates afetados.

O primeiro `pnpm run check` foi interrompido antes dos gates: pnpm 11 usa
`verify-deps-before-run=install` por padrão e tentou remontar node_modules. Recuperação do mesmo
lockfile concluída **offline**, sem scripts de instalação, usando cache global já existente
(`dependency-global-cache-recovery.log`, downloaded=0). Nenhum dos 834 arquivos da candidata
mudou. O cache de projeto estava incompleto; sua tentativa offline falhou sem baixar nada.
A repetição usa `pnpm_config_verify_deps_before_run=warn` para impedir nova instalação automática;
isso não desliga formatação, lint, tipos, testes, cobertura, visão ou scanner. Mesmas versões do
lockfile, sem dependência nova. Logs da tentativa interrompida são preservados.

## Rodada de integração autorizada — concluída localmente

### Etapas de acompanhamento — sem divisão por dias

1. **Concluída — correção do P1.** Sete regressões red/green, recusa de revisão divergente/
   ausente sob a mesma chave, confirmação após processos/restore e revisão parcial independente
   da Infraestrutura. Não equivale a revisão completa do branch.
2. **Concluída — composição de consumo e recuperação local.** Fábrica pareada, 158 testes
   focados e três provas PostgreSQL reais locais. Cota entre usuários/API/worker, unknown,
   contador de login, processo novo, política e histórico dos dois lados após backup/restore.
   Última prova ampliada: `.local/pilot-security/postgres-1794250651348-7504/`.
3. **Concluída — integração HTTP/worker local.** Ligações centrais e guardas/runners locais
   entregues; 16 testes independentes de admissão/API/worker aprovados, além da bateria global.
   Pré-flight e teste antigo de startup foram corrigidos pelos donos e revalidados.
4. **Concluída — gates locais da candidata estável.** Check completo exit 0, 2.347 unidades,
   cobertura unitária >=80% nos quatro indicadores, 232 E2E, 17 SQL/RLS e nove grupos do worker
   separado, builds/runtime e evals determinísticos/sintéticos aprovados. Scanner concluiu sem
   padrão conhecido. Minutas/IA/gates locais não liberam uso real; revisão completa/CI/destino e
   decisões humanas continuam pendentes. Manifesto registra escopo e estabilidade da candidata.

As etapas são unidades de acompanhamento; a próxima disponível começa automaticamente.

### Janela 02 em preparação — security-local-20261109-02

**Pedido atual aos donos:** concluir edição atômica, inclusive formatação pendente do pré-flight,
publicar candidata/hashes e pausar mutações de código/configuração/spec até encerramento desta
janela. Este pedido substitui a janela 01 encerrada. Segurança já terminou as próprias mutações
funcionais. A captura do snapshot e os gates começarão após a conferência do fechamento; leituras
e relatórios exclusivos podem continuar. Falha será registrada por gate, sem dispensar piso ou
alterar arquivo alheio. A etapa 3 já passou também **16 testes independentes de admissão API,
HTTP e worker** (stores de arquivo e SQL/transportes simulados), relatório
`docs/reviews/pilot-http-worker-security-tests-2026-11-09.json`.

Os novos runners locais de Infraestrutura foram lidos: guardas loopback/nome/marcador, ambiente
mínimo, builds/relatórios exclusivos e sem alteração das assertivas da matriz. A frente já
produziu recibos locais positivos para RLS e worker em containers próprios encerrados. Aliases
`test:pilot:worker:local`/`test:pilot:rls:local` registrados; a execução coordenada será repetida
na candidata congelada. Não executar os aliases remotos que carregam `.env`.

### Janela estável em preparação — security-local-20261109-01

**Janela 01 encerrada no pré-flight, sem candidata global aprovada.** `pnpm run format:check`
falhou em sete arquivos: `apps/api/app/create-api.ts`, `apps/api/app/operation-control.ts`,
`tests/fixtures/hosted-call-ledger-process.ts`, `tests/fixtures/synthetic-document-photo-manifest.json`,
`tests/unit/api-operation-control.test.ts`, `tests/unit/hosted-call-ledger.test.ts` e
`tests/unit/hosted-document-startup.test.ts`. Relatório
`.local/pilot-security/global-format-window01.log`. Donos podem retomar mutações para concluir
integração e corrigir formatação; Segurança não formatará arquivos alheios. Nova janela será
publicada após o fechamento atômico. O protocolo abaixo descreve o pedido da janela 01 e não
mantém pausa após este encerramento. Nenhum gate funcional foi invalidado silenciosamente.

**Protocolo ativo:** Documentos e Infraestrutura concluem somente a edição atômica atual,
publicam hashes/estado nas próprias notas e suspendem mutações da candidata até esta seção
registrar o encerramento da janela. Leitura, revisão e relatórios exclusivos podem continuar.
Segurança está com os módulos/contratos prontos para gates e também congela mudanças funcionais;
correção necessária será registrada, encerrará/invalida os gates afetados e abrirá nova janela.
Nenhum merge, commit, publicação ou uso real está autorizado por esse congelamento.

Evidências já executadas: **158 testes focados em 12 arquivos**, cobertura dos três módulos da
composição 95,94% statements / 94,11% branches / 100% functions / 97,32% lines. **Três provas SQL
reais locais** passaram com bancos exclusivos no container próprio, incluindo migrations 039/040,
cotas/claims concorrentes, dez/origem e mil globais de login, permissões/RLS, processos Node
separados, troca de política sem replay/reenvio, histórico dos dois lados e backup/restore integral.
Relatórios: `.local/pilot-security/integration-1794250344438-18288/`,
`.local/pilot-security/postgres-1794250320944-27808/` e
`.local/pilot-operations/security-a59dd9bc7bb14860ba251ae465acd4b7/security-result.json`.
Nenhuma chamada externa de IA, conexão remota ou segredo real foi usado.

A infraestrutura já declarou candidata local pronta em sua fila. Documentos ainda registra
“em edição”; esta janela pede o fechamento atômico e a identificação da versão para gates,
sem presumir sua aprovação. O snapshot global será capturado após conferência das notas/arquivos.

**Contrato pendente de runner local para Infraestrutura:** `synthetic-worker-database.ts` e
`verify-separated-worker.mjs` hoje aceitam somente Neon/Supabase e o alias carrega `.env`.
Preparar, depois da janela se necessário, backend `local` com URL loopback literal, nomes/marcador
sintéticos exclusivos, sem `.env`/fallback remoto e saídas exclusivas. A suíte de RLS integrada
também precisa de alvo local guardado, sem relaxar sua matriz/assertivas. Não rodar os aliases
remotos como atalho. Segurança pode fornecer seu recibo Docker/bancos novos, sem compartilhar
escrita no mesmo banco; o dono do runner conserva a implementação.

O usuário autorizou corrigir o P1 e continuar integração/validação local. A coordenação reafirmou
as propriedades e pediu janela estável para gates globais. **Segurança em edição**; janela ainda
não iniciada. Antes dessa reafirmação, esta frente aplicou a correção mínima em executor/ledger
documental: `HostedCallKey.policyRevision`, persistência/comparação da revisão sob a mesma chave,
erro `call_policy_conflict` e recusa de recibo legado sem revisão. Sete regressões falharam antes
e passaram depois em `hosted-policy-continuity.test.ts`; relatórios red/green em docs/reviews.
Essas alterações foram escritas por Segurança e não recebem selo de revisão independente desta
mesma frente. O dono Documentos deve integrar/revisar a candidata; não haverá outras edições de
Segurança nos arquivos documentais a partir da nova distribuição. Spec 071 AC-7117/7118 registram
os contratos; AC-7116 da outra frente foi preservado.

### Contrato pronto para o integrador documental

`createHostedOperationBudget` em `apps/api/security/hosted-operation-budget.ts` é o adaptador da
Spec 072. Recebe store e resolvedor privado de escopo tenant + autorizador documental (default
negado). `HostedDocumentCallControl.operationBudget` foi preparado antes da reafirmação de
propriedade; o executor o envolve entre reserva do ledger e dispatch, e depois de resultado
persistido conclui o recibo operacional. As fábricas já passam callControl ao executor. O dono
deve conservar/revisar essa ligação, sem autorizador positivo no startup.

**Atualização para integração:** preferir `createBudgetedHostedDocumentControls({...})` e passar
o par retornado `{authorize,callControl}` inteiro à fábrica/executor. Esse par revalida o escopo
privado também no replay (sem reservar outra quota). Usar somente `operationBudget` e manter um
autorizador externo separado pode omitir essa revalidação do replay. O módulo está em edição
e terá hashes após testes; Documentos mantém a integração central. O container próprio desta
frente já passou pelo restore completo da Infraestrutura e permanece somente para ensaios
sintéticos de segurança; não há execução simultânea no mesmo banco.

- Spec 072 é o total autoritativo de custo/quantidade/concorrência. O compromisso no ledger é
  espelhado para recuperação; não somar ambos como duas despesas. Ambos em USD nesta composição.
- `policy.revision` operacional deve ser `budgetDigest(revisão autorizada)`. UUID determinístico
  deriva do hash integral + condomínio, sem colocar política no ID lógico para escapar de claim.
- Escopo atual deve vir de sessão/membership/job privado, nunca body/header. Síntese confere
  também usuário/membership do request; OCR/foto/embedding exigem resolvedor privado equivalente.
- Custo contabilizado é conservador (máximo reservado), explicitamente não fatura medida.
- Replay confirmado no ledger ocorre antes de outra reserva. Falha entre stores conserva quota;
  resultado confirmado pode ser recuperado, mas não libera recibo operacional incerto.
- Setup/perguntas comuns/upload ainda exigem ligação pelos donos centrais. Este contrato não
  afirma que os controles já cobrem esses caminhos nem autoriza chamadas externas.

Próximos passos desta frente: testes da composição, SQL/RLS/concorrência da migration 040 em
container próprio guardado; ler candidatas das demais frentes, publicar preparação da janela
estável e executar os gates locais disponíveis com saídas exclusivas. A primeira tentativa do
wrapper Docker foi recusada por permissão do sandbox antes de criar container; será tentado
o caminho local autorizado. Isso não é bloqueio de serviço remoto nem autorização de cobrança.

## Restrições desta rodada

Somente dados sintéticos. Sem cartão, contratação, provisionamento, publicação, migration remota,
upload real ou chamada de IA cobrada. Não alterar prompt aprovado. Checkout compartilhado:
sem commit/merge/reset/stash e sem gates globais enquanto houver edições concorrentes.

## Histórico da preparação e contratos de integração

### Fila histórica da preparação — sem lotes diários

Quadro preservado da fase inicial de preparação, anterior ao fechamento 03/r4 de 11/11.
Bloqueios técnicos locais então listados não significam ausência das provas finais descritas
no início desta nota. Aprovações humanas/uso real continuam pendentes.

O prazo de 16/11 é somente a meta final. Concluir um item libera o próximo disponível;
nenhum trabalho local é adiado para outro dia. Estados abaixo não significam release aprovado.

| Estado                                       | Item                                                                      | Dependência concreta / próxima ação                                                                                                             |
| -------------------------------------------- | ------------------------------------------------------------------------- | ----------------------------------------------------------------------------------------------------------------------------------------------- |
| Concluído localmente                         | Minutas, papéis, roteiro, gates, código persistente, abuso e continuidade | Resultados já registrados; revisão profissional/destino seguem pendentes                                                                        |
| Concluído localmente                         | Spec 072: reserva compartilhada de custo/trabalho e recibos               | 30 testes focados e quatro processos independentes; cobertura local acima de 80%; falta ligação central e prova SQL                             |
| Concluído como inspeção parcial              | Revisões por IA da infraestrutura e da fronteira documental               | Leituras e limites registrados; candidatas continuam mudando, sem aprovação do diff completo                                                    |
| Concluído como preparação                    | Pacote de incidente/direitos e contrato de redaction operacional          | Procedimentos revisáveis preparados, sem contato/execução real; implantação e revisão competentes pendentes                                     |
| Corrigido e revalidado localmente            | Reuso documental sob nova política                                        | Sete regressões red/green + SQL/restore/processos + revisão parcial independente por Infraestrutura; review completo da candidata ainda exigido |
| Bloqueado                                    | Ligação de budgets às rotas/gateways/worker                               | Contrato desta frente + edição dos donos dos arquivos centrais                                                                                  |
| Bloqueado                                    | Gates globais, CI e review completo                                       | Candidata estável coordenada, sem edições concorrentes                                                                                          |
| Concluído localmente / destino real pendente | Prova SQL/restore de segurança                                            | PostgreSQL 17 local validado; destino real/políticas/fornecedores/limites/responsáveis continuam pendentes                                      |
| Bloqueado                                    | Aprovações jurídica, técnica humana e semântica especializada             | Profissionais competentes identificados e análise efetiva; minutas/IA não substituem                                                            |

Não há tarefa pronta desta frente sendo retida por data. Os próximos itens exigem integração
dos donos centrais, candidata estável, ferramentas/ambiente ou decisões humanas identificadas.

| Área                      | Estado observado                                                                                                                       | Lacuna que bloqueia uso real / ligação necessária                                                                                                                                                                                                                          |
| ------------------------- | -------------------------------------------------------------------------------------------------------------------------------------- | -------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| Códigos e sessões         | HMAC, hashes, cookie HttpOnly/SameSite/Secure, logout por aparelho e rotação operacional já existem; banco rejeita conta bloqueada/MFA | Validar no destino final, preservar segredo em reinício/restore e testar revogação em duas réplicas. Sessão permanente é contrato aprovado, sem expiração automática nova.                                                                                                 |
| Tentativas de entrada     | Reserva persistente entregue no cofre local; adaptador PostgreSQL/migration 040 preparados                                             | Dez/origem e mil globais/15 min; HMAC sem IP em texto; nenhuma sessão em falha do contador. Testado entre serviços/recriação no mesmo volume; validar SQL e réplicas do destino. Ver Spec 068 RQ-6805.                                                                     |
| Autorização/RLS           | Contexto autorizado e RLS existentes; cabeçalho de desenvolvimento não substitui código ativo                                          | Rodar matriz API/banco/storage/fila/cache/busca/histórico/exportação com duas identidades e tenants na candidata final. Testes antigos não certificam nova configuração.                                                                                                   |
| Custo e abuso autenticado | Spec 072 prepara reserva/claim/recibos duráveis, default negado; limite antigo de rotas ainda em RAM                                   | Contrato local validado, PostgreSQL não executado. Faltam teto/moeda aprovados, ligação central cobrindo setup/OCR/fotos/síntese/embeddings/upload/perguntas, recuperação do resultado e prova no destino. Não confundir módulo preparado com controle já ativo nas rotas. |
| Upload/processamento      | Limites de corpo e contratos de PDF/imagens existentes                                                                                 | Frente documental deve registrar assinatura/formato, bytes/páginas/pixels, timeout, concorrência, repetição, qualidade, retenção de originais/derivados e tenant em cada etapa. Validar fotos/PDF digitalizado no gateway efetivo com corpus sintético.                    |
| Logs/operação             | Fastify criado com logger desligado; erros de acesso públicos genéricos                                                                | Frente operacional deve provar redaction na borda/host/banco/worker, TLS, proxy confiável, menor privilégio e acesso administrativo auditado. Não habilitar logs de corpos/headers/cookies.                                                                                |
| Dados e direitos          | Política atual autoriza exclusivamente sintéticos                                                                                      | Rascunhos não aprovam base legal, papéis, fornecedor, retenção ou transferência. Export/purge devem cobrir histórico e backups, sem apagar outro tenant.                                                                                                                   |
| Histórico/worker          | Há validação sintética anterior                                                                                                        | Exigir recuperação completa e restore da configuração que será liberada; não inferir qualidade da API nem readiness real.                                                                                                                                                  |

O limitador de entrada usará `request.ip` definido pelo servidor, nunca um header arbitrário.
Não habilitar `trustProxy: true` indiscriminadamente. A frente operacional precisa documentar a
cadeia e o endereço efetivo; se todas as pessoas parecerem a mesma origem, compartilham a cota.
Essa informação serve só para defesa contra abuso e nunca autentica ou vincula conta/aparelho.

### Entregas e comandos das outras frentes

Nota documental consultada: [pilot-2026-11-16-documents.md](pilot-2026-11-16-documents.md), ainda
em preparação no momento da leitura. Spec 071/ADR 0043 propõem autorização negada por padrão,
fila/cache locais e fábricas para OCR/fotos/síntese. Isso não substitui reserva compartilhada
de custo nem recibo durável em geração concluída + falha de gravação. Esses pontos seguem
bloqueantes. Não fornecemos autorizador positivo nem sinal de política aprovada por preparar minutas.

Nota de [infraestrutura](pilot-2026-11-16-infrastructure.md) consultada após disponibilização:
Spec 070/ADR 0042, verificador sem conexão, testes mockados e runner integral local guardado.
Comandos `pilot:preparation`, `test:pilot:operations` e `test:pilot:recovery:local` integrados em
package.json/README/AGENTS após leitura do código/contratos. O runner de banco não foi executado
nem passou a estar autorizado implicitamente. Testes/cobertura da operação reportados na nota
pertencem àquela frente; não equivalem a gates globais. A revisão técnica por IA está em
`docs/reviews/2026-11-09-pilot-infrastructure-ai-review.md`, sem atestar revisão humana ou release.
O comando `test:pilot:security` também foi integrado, sem dependência nova.
Os scripts operacionais mudaram depois daquele snapshot; a inspeção complementar está em
`docs/reviews/2026-11-09-pilot-infrastructure-supplement.md` e não certifica a extensão em edição.
Nenhum comando remoto é executado implicitamente. A ligação central em create-api.ts/server.ts
pertence à frente documental; esta fatia não precisa alterá-los porque utiliza os stores existentes.

### Contratos pendentes para integração central

#### Contrato executável de consumo — Spec 072

Módulos em `apps/api/security/operation-budget.ts`, `local-operation-budget-store.ts` e
`postgres-operation-budget-store.ts`. `createBudgetedOperationRunner({store,authorize})`
nasce com autorização negada. `createPostgresOperationBudgetStore(pool,role)` aceita somente
`app_runtime` ou `app_worker`. A migration 040 ampliada ainda não aplicada prepara política
disabled e recibos privados; contas/roles/limites reais não foram alterados.

Sequência de integração para o dono central:

1. Resolver sessão e contexto atuais; UUIDs do banco, condomínio+revision para documentos.
   Setup anterior ao condomínio usa somente conta e finalidade `setup`.
2. Recuperar primeiro o journal/resultado idempotente já salvo. Usar o mesmo UUID de operação
   em todas as retentativas; nunca inventar novo UUID para contornar resultado incerto.
3. Criar `BudgetRequest` com scope, operationId, finalidade fechada, payloadHash do conjunto
   integral, policyRevision e custo máximo conservador na moeda aprovada. Nenhum teto vem de
   header/corpo. Cobrir todos os retries/rotas/caminhos; quantidade inclui cancelamentos.
4. Compor `authorize` com a consulta atual de dados/fornecedor/payload da Spec 071 e permissões.
   Não reservar orçamento dentro dessa consulta repetida. Não inferir autorização de minutas.
5. `execute(request, operation)` reserva, revalida, adquire claim e só então chama `operation`.
   A operação retorna `{value,outputHash,actualCostMicrounits}`; valores/custos usam dados
   conhecidos da mesma moeda e máximo que cubra a chamada. Finalização precede retorno.
6. `completed` sem resposta no journal exige recuperação/reconciliação, nunca outra geração.
   `started/unknown` conservam custo/concorrência mesmo após reinício/dia novo. Cancelamento
   só antes do claim; nenhum lease/takeover automático. Readiness exige resultado durável e
   prova do caso geração concluída + falha ao gravar no caminho hospedado integrado.

O recibo não guarda resposta/documento, apenas hash, UUIDs, finalidade, revisões, moeda, estado,
horários e custo. UUIDs operacionais sobrevivem à exclusão do domínio para não zerar consumo/
idempotência; não concedem leitura sem contexto atual e sua retenção precisa de aprovação.
Não usar cascade nem apagar recibos para liberar nova execução. Troca de moeda com recibos
existentes falha fechada. Política/fornecedor, retenção, limites e reconciliação permanecem gates.

Arquivo local exige `confirmation: synthetic-only`, não é fallback do banco e só compartilha o
mesmo volume. Quatro processos Node independentes disputaram o mesmo claim e produziram uma
execução fictícia. Testes PostgreSQL são contratos mockados, sem certificar SQL/RLS do destino.

#### Demais ligações

A extensão documental acrescentou `HostedCallLedger` para conservar resultado privado e seu
compromisso de custo. A Spec 072 é orçamento operacional/claim sem resultado. Fechar composição
e total monetário autoritativo antes de ativar: não somar compromissos espelhados como duas
despesas, não converter moeda nem cobrar a cada consulta do autorizador. Exigir testes da
composição, inclusive falha entre stores/resultado/journal. O P1 de isolamento por revisão de
política no ledger documental foi reproduzido sem chamada externa; correção e reteste dependem
do dono. O manifesto anterior de 214 testes não certifica a extensão atualmente em edição.

- Aplicar migration 040 antes de ativar a versão nova da API em destino **futuramente autorizado**;
  ausência é 503, sem fallback. Usar o mesmo `ACCESS_CODE_SECRET` estável por réplica; jamais
  imprimir o segredo. Operador mantém capacidade de rotacionar código e revogar sessões.
- Não ativar `trustProxy` genérico. Documentar origem efetiva e ensaiar a rede presencial para
  evitar que dez tentativas de toda a sala pareçam vir da mesma origem do proxy. Não confiar
  em `x-forwarded-for` enviado pelo cliente; NAT pode legitimamente compartilhar a cota.
- Autorização documental positiva exige política/fornecedor/payload aprovados, contexto revalidado,
  teto reservado antes da chamada, idempotência durável e recibo de consumo escopado. Habilitar flag
  de billing, cache em RAM ou default negativo não prova a entrega desses controles.
- Não usar conta de operador/migration owner como runtime nem reabrir ambiente com sessions,
  exclusões ou permissões antigas após restore. Inventário de segredo de acesso integra restore.

## Entregas concretas

- Specs 011/068 e aceitação atualizadas antes do comportamento, preservando a edição anterior
  de 011; rastreabilidade global ampliada sem declarar readiness.
- RQ-6805, ADR 0044 e migration 040: reserva de tentativas persistente/atômica, parsing incluído,
  HMAC de origem, retorno 429/Retry-After e 503 sem sessão em falha. Sessões permanentes e
  autorização por condomínio preservadas; nenhum prompt alterado.
- [Pacote de revisão](../security/pilot-2026-11-16/README.md): termo de participação,
  autorização documental, aviso de privacidade, política candidata e matriz de papéis/D01–D12.
  Rascunhos, sem aprovação/assinatura ou dados de pessoas reais. Fontes oficiais ANPD consultadas.
- [Roteiro presencial](../quality/pilot-2026-11-16-sessions.md): tarefas, métricas, intervenções,
  aparelhos, gravação separada, suporte, pausa/ampliação e quatro semanas de acompanhamento.
- [Registro de gates](../quality/pilot-2026-11-16-release-gates.md) por commit/configuração,
  restauração integral, direitos, gateway a publicar e revisores competentes ainda necessários.
- Spec 072, três módulos de orçamento, testes multiprocesso e comando `test:pilot:budget`,
  sem ligação automática aos gateways nem política positiva.
- Procedimentos revisáveis de incidentes/suporte, direitos/exportação/exclusão e redaction/acesso
  operacional no pacote de segurança. Sem contato, exportação ou exclusão reais.

## Histórico — evidências e limites da preparação inicial

Rodada inicial: **25 testes aprovados em seis arquivos**, sem IA externa, banco remoto ou
documentos reais. Relatório preservado em `docs/reviews/pilot-security-tests-2026-11-09.json`;
escopo/comandos/autorrevisão em `docs/reviews/2026-11-09-pilot-security-local.md`.

Após a confirmação de WhatsApp somente na abertura pública, o comando `test:pilot:security`
usa configuração privada por processo e passou **47 testes em nove arquivos**, incluindo as
novas regressões conjuntas de sessão/histórico. Lint, typecheck e formatação focados aprovados.
O script canônico de visão passou para as **duas specs alteradas em cópia isolada**; o gate do
repositório inteiro continua adiado. Novos resultados, limitações e snapshot em
`docs/reviews/2026-11-09-pilot-continuity-local.md`, sem substituir a evidência anterior.

O piloto usa código fornecido pela equipe; não coleta telefone nem depende de WhatsApp. Sessão
lembrada e histórico completo são exigências do piloto. Código de WhatsApp pertence à futura
abertura pública, conforme o esclarecimento explícito de 09/11/2026. Nenhum serviço foi ativado.

Recriar serviços e alternar duas APIs/cofres prova o contrato local no mesmo volume; testes
mockados do adaptador **não** certificam execução/concorrência do SQL no PostgreSQL. Migration 040
não foi aplicada. Check/cobertura/global/spec-vision/integração destrutiva ficaram adiados por
instrução de concorrência. Não foi executado audit remoto ou eval pago. Sem commit/merge/deploy.

Na verificação de continuidade, sessão local sobrevive à recriação do cofre/API e ao relógio do
servidor dois anos adiante. O cookie é fornecido pelo teste: não é promessa de retenção de dois
anos pelo navegador. O histórico de ambos os lados é lido por duas sessões reais de código na
mesma conta e nega outro usuário; usa RAM e declara `durable=false`, portanto não prova restore
PostgreSQL. Falha de gravação/retentativa conserva o contrato sem falso sucesso ou duplicação.

Na rodada de consumo, **30/30 testes de orçamento** passaram e a seleção ampliada de segurança
passou **77/77 em dez arquivos**. Cobertura dos três módulos novos: statements **94,37%**,
branches **93,95%**, functions **95%**, lines **98,02%**, sem exclusões. Lint e tipos focados
aprovados; formatação corrigida no teste e revalidada. Gate canônico passou em cópia isolada
para Specs 011/068/072. Comandos, relatórios e hashes em
`docs/reviews/2026-11-09-pilot-budget-local.md`; não substitui gates globais ou execução SQL.

Liberação bloqueada por D01–D12, política vigente somente sintética, budgets de trabalho/custo
distribuídos e recibos duráveis, proteção de borda/proxy, configuração do destino, restore integral,
direitos/revogação, evals/revisão semântica no gateway efetivo, gates globais e revisão técnica
independente. Infraestrutura recebeu revisão por IA de snapshot delimitado; a frente documental
ainda não apresentou candidata final para revisão. Não assinar própria revisão nem inferir gate
humano independente do trabalho de outro agente.
