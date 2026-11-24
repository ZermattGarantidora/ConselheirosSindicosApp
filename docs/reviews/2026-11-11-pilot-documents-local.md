# Documentos e IA — fechamento local de 11/11

**Resultado atual:** preparação documental local **r4 validada** nos gates conjuntos da janela 03.
**Não há trabalho local pendente nesta frente.** Foram concluídos correções, revisão cruzada
atribuída, ciclo de dados e relatórios: 2.459 unidades, 247 E2E, quatro pisos de cobertura,
builds/runtime/evals determinísticos/worker e comparação de 910 entradas sem diferenças.
As 96 entradas documentais coincidem com a captura final r4. Evidências detalhadas na seção
de fechamento; r1–r3 e suas pendências são histórico, não estado atual. Não autoriza merge,
serviço hospedado, dados reais ou cobrança. Base Git
`3b702db6f91dbbeb2ede1a6063053296298d913c`; nenhuma alteração foi commitada por esta frente.

**Complemento documental concluído:** leitura integral de 98 arquivos das Specs 041–067,
sem novo P0/P1 confirmado; 47 relatórios narrativos foram reassumidos e registrados por
Infraestrutura, sem leitura atribuída a Documentos. Os 145 hashes históricos e as 96 entradas
r4 continuam iguais. [Relatório de escopo e limites](2026-11-11-historical-documents-documents-review.md)
e mapa `.local/pilot-documents-2026-11-11/historical-documents-review.json`, SHA
`508a629605c3f4083756daf7afa91b81609d85d24a1bf22eab613b7805c5219f`.
Nenhuma fonte funcional, configuração, teste ou prompt mudou; nenhum gate ou modelo foi
reexecutado. Autoria histórica não inferida, sem aprovação integral ou especializada.

A preparação atende à Spec 071, AC-7101–AC-7128, com composição do orçamento autoritativo da
Spec 072. JPEG/PNG preservam a imagem inteira no OCR preparado. O ledger conserva resultado,
revisão de política e compromisso antes do envio; estado incerto impede reenvio automático.
Os testes usam USD fictício conservador, não uma fatura observada. Startup real permanece negado.

## Correções da revisão independente

- Replay HTTP revalida política, sessão/membership e dependências. Perguntas conservam revisão
  do catálogo e hash integral das páginas citadas: mudar vigência ou conteúdo fora do trecho
  nega replay corrente, sem gerar novamente. Prova legada incompleta também nega. Explicação
  inicial de conflito pending e replay idêntico continuam permitidos; histórico literal é preservado.
- O cliente conserva UUID até consumir o corpo e validar o contrato real de sucesso. Compartilha
  os validadores de síntese/snapshot do consumidor; corpo incompleto não confirma entrega.
- A migration 039 preparada permite excluir o condomínio sem apagar consumo. Guards privados
  invalidam resultados e negam escopo órfão; custos/unknown e tenant B permanecem. Não concede
  papel de ledger à API/worker nem cria login real.
- Purga de vários documentos prepara todas as invalidações externas antes do primeiro trigger
  que mantém o lock do consumo. Não remove esse lock. A purga de todo conteúdo inclui originais
  órfãos; purga de versão individual não amplia escopo. Callback usa a transação do plano autenticado.
- Exportação privada e limitada confere original/checksum, páginas/vetores e histórico próprio.
  Restore usa helper guardado, inventário e destinos novos/vazios; nenhum DROP reseta cópia ocupada.
  Journal externo ao dump conserva decisões; snapshot antigo sem recibos mantém quarentena global.

O ajuste de identidade/UUID e as correções originais de política no ledger são da Segurança;
não são contadas como revisão independente de autoria própria. Infraestrutura revisou os
recibos/replay/restore; Segurança revisou as purgas e dependências documentais. Os relatórios
dessas frentes delimitam as fontes lidas e as exclusões de autoria.

## Histórico — evidência da candidata r1

| Gate                                                        | Resultado                                | Artefato                                                                                         |
| ----------------------------------------------------------- | ---------------------------------------- | ------------------------------------------------------------------------------------------------ |
| Bateria documental sintética, HTTP loopback e mocks         | 430/430, 42 arquivos                     | `.local/pilot-documents-2026-11-09/extension/1794421506579-10612/results.json` e JUnit adjacente |
| Unidades, sem E2E, cobertura V8                             | 356/356, 33 arquivos                     | `.local/pilot-documents-2026-11-09/extension/1794421602789-27088/results.json`                   |
| Cobertura focada: statements / branches / functions / lines | 94,88 / 92,14 / 98,25 / 97,10%           | `1794421602789-27088/coverage-unit/coverage-summary.json` no diretório acima                     |
| PostgreSQL 17/pgvector local, wrapper documents             | 2/2 cenários amplos; container encerrado | `.local/pilot-operations/container-c88c1c6700be421ea96cb0030d7265ef/result.json`                 |
| Prova agregada de sessão/fotos/worker/ciclo/restore         | Aprovada; zero transporte real           | `.local/pilot-operations/06539cf9c0ed46e3a4b6c1c97f4337b2/document-lifecycle-proof.json`         |
| TypeScript completo                                         | Aprovado                                 | `node node_modules/typescript/bin/tsc --noEmit`                                                  |
| Lint do delta e formatação própria                          | Aprovados                                | Binários locais ESLint/Prettier, sem instalação                                                  |
| Alinhamento com a visão                                     | 72 specs aprovadas                       | `pwsh -NoProfile -File scripts/validate-spec-vision.ps1`                                         |

A cobertura focada não substitui o piso global. São 14 módulos selecionados, sem exclusões
novas de produção; `create-api.ts` e a interface dependem também do gate unitário global.
Comandos Vitest: `run --config tests/vitest.pilot-documents.config.ts` e, para cobertura,
o mesmo comando com `--exclude '**/e2e/**' --coverage`. TEMP/TMP apontaram para temporário
próprio no workspace; não houve instalação ou remontagem implícita pelo pnpm.

O SQL exercitou dois documentos na mesma retenção/reaplicação, pools separados e locks com
timeout limitado; órfãos sozinhos e mistos; rollback/repetição; tenant B e seu original intactos.
Três processos worker executaram OCR/embeddings simulados, com perfil sintético de busca
compatível. Exportação conservou checksum. Duas cópias novas receberam restore; API em
quarentena retornou 503 e job antigo não gerou transporte. Oito transportes simulados ficaram
espelhados em recibos/custo fictício; a exclusão de domínio no banco local preservou consumo.

## Isolamento dos ensaios e falhas preservadas

Vite 8 lê `.env*` por padrão mesmo com ambiente filho mínimo. As duas configurações desta frente
agora usam `envDir:false`; AC-7128 resolve Vite contra um canário criado em temporário próprio.
Não abrimos arquivos de ambiente reais para testar. Os gates atuais acima foram repetidos sob
essa proteção. Resultados anteriores continuam históricos; a afirmação de que ambiente mínimo
sozinho impedia descoberta de `.env` fica corrigida, sem alegar o conteúdo dos arquivos existentes.

A primeira bateria guardada terminou **427/429**, com dois timeouts de 5 segundos em parsing de
PDF, enquanto o ensaio Docker local também estava em execução. Artefato preservado:
`1794421229934-28456/results.json`. Os mesmos dois casos, mais ambiente/replay, passaram
21/21 em `1794421458171-4536/results.json`; depois a bateria inteira passou 430/430 sem Docker
simultâneo, com os mesmos limites e asserções. Concorrência é uma hipótese para o atraso,
não causa comprovada. Não aumentamos timeout nem editamos os dois testes para obter verde.

Uma falha isolada anterior no ledger em arquivo (`1794418379463-21804`, 344/345) retornou
`ledger_unavailable` na invalidação de versão errada; causa não confirmada. Sem mudar código
ou asserção do ledger, passaram o recorte 29/29, a cobertura 345/345 e as baterias atuais.
Os vermelhos originais de política, vigência, página, purga órfã/lote, recibo UI e restore
permanecem nos artefatos dos revisores. A tipagem encontrou dois parâmetros implícitos no
novo fixture; foram tipados, e o check completo passou. Nenhum erro histórico foi apagado.

## Candidata e rastreabilidade

Hashes funcionais/contratuais finais em
`.local/pilot-documents-2026-11-11/candidate-source-hashes-2026-11-11-r4.json`; a captura sem
sufixo e r2/r3 são históricas. Notas mutáveis e
relatórios ficam fora do congelamento funcional. Oferta de rastreabilidade para consolidação
pela Segurança em `.local/pilot-documents-2026-11-11/traceability-offer.json`. Revisão própria
do delta e resultados não são aprovação independente do branch.

Revisão independente de Infraestrutura feita por esta frente, limitada a arquivos não editados
por nós: [relatório](2026-11-11-pilot-infrastructure-documents-review.md), candidata r2 com dez
entradas conferidas. A revisão de nossos módulos e os gates globais cabem aos outros donos.
Janela 02 é histórica e não certifica o delta de 11/11. O checkout compartilhado completo e
seus arquivos preexistentes continuam sujeitos ao mapa integral de revisão da Infraestrutura.

Os gates conjuntos locais foram concluídos na r4, conforme a seção final. Consolidação
independente do diff inteiro e CI/merge não foram aprovados por esta frente. Qualidade efetiva
de OCR/modelos, política/fornecedor/retenção,
destino e orçamento real dependem de decisão e prova próprias. Nenhum teste sintético mede
acurácia real ou autoriza ligar os adaptadores a um serviço.

Histórico da primeira coordenação: a Segurança conferiu as três candidatas e congelou
`security-local-20261109-03` para os gates locais. Os 94 hashes documentais foram reconferidos
sem diferença. A primeira tentativa global parou no Corepack antes dos testes, com download
bloqueado; o dono retomou com pnpm instalado, sem mudar dependências. Fontes permanecem
estáveis naquele ponto. A validação foi posteriormente encerrada na r4, registrada ao fim.

## Histórico — correção delimitada e candidata r2

O primeiro check global após Corepack executou 2.453 unidades: 2.444 passaram, oito excederam
o timeout de 5 s e a asserção existente de retenção encontrou contexto duplicado. Vermelho
preservado em `.local/pilot-security/global-check-window03-1794422113310.log`. A reabertura foi
registrada antes da mutação, limitada a cinco arquivos. A preparação configura tenant somente
quando há observador; sem observador mantém exatamente um `set_config` por documento antes
da purga. A asserção anterior não mudou. Duas regressões novas verificam ordem das duas fases
e rollback sem qualquer purga/COMMIT se a segunda preparação falha. O conjunto ficou com seis
unidades de retenção. Nenhum timeout ou asserção de segurança foi relaxado.

| Gate da r2                                                                | Resultado                         | Artefato                                                                                 |
| ------------------------------------------------------------------------- | --------------------------------- | ---------------------------------------------------------------------------------------- |
| Recorte lifecycle/recovery/retention                                      | 32/32                             | `extension/1794422445226-27864/results.json`                                             |
| Unidades sem E2E, 34 arquivos                                             | 362/362                           | `extension/1794422561272-228/results.json`                                               |
| Cobertura focada de 15 módulos, statements / branches / functions / lines | 94,95 / 92,06 / 98,29 / 97,20%    | `extension/1794422561272-228/coverage-unit/coverage-summary.json`                        |
| PostgreSQL local com dois documentos/locks separados/órfãos/restore       | 2/2                               | `.local/pilot-operations/container-911401d9b83548b58e82029a849a8fdd/result.json`         |
| Prova agregada atual                                                      | Aprovada; zero transporte externo | `.local/pilot-operations/963e265ebbe94260a992f8c0acd80886/document-lifecycle-proof.json` |
| Tipos completos, lint/formatação do delta e gate de visão                 | Aprovados                         | Binários locais e 72 specs                                                               |

Os paths `extension/` acima pertencem a `.local/pilot-documents-2026-11-09/`. O container próprio
foi encerrado. As 430 provas focadas da r1 são preservadas, sem apresentá-las como uma bateria
completa reexecutada na r2. O recorte afetado, todas as unidades focadas e o SQL foram repetidos;
os gates globais foram depois repetidos na r4 com concorrência limitada, conservando casos,
timeouts e cobertura. A sobrecarga continua hipótese para os timeouts, sem causa demonstrada.

Captura histórica: `.local/pilot-documents-2026-11-11/candidate-source-hashes-2026-11-11-r2.json`,
95 entradas e cinco deltas enumerados da r1. A captura anterior e o snapshot global da primeira
tentativa ficam históricos. Naquele ponto, as fontes estavam prontas para revisão e recaptura;
os gates locais posteriores foram concluídos na r4. Diff inteiro/CI/merge/uso real não foram aprovados.

## Histórico — check global da candidata r2

A Segurança concluiu o check em
`.local/pilot-security/global-check-window03-1794422747440.log`, exit 0: **2.455/2.455 unidades**
em 196 arquivos, formatação/lint/tipos, 72 specs e scanner de segredos aprovados. Cobertura
global somente unitária: **87,55/83,69/92,83/89,42%** (statements/branches/functions/lines),
todos acima de 80%, sem exclusões novas ou aumento de timeout. Relatório copiado em
`.local/pilot-security/coverage-window03-1794422747440/coverage-summary.json`.

E2E/build/runtime/worker e conferência final ainda estavam pendentes nessa captura. Foram
concluídos na r4, conforme o fechamento abaixo e o
[índice de Segurança](../release/pilot-2026-11-16-security.md). O check r2 não certifica alterações
posteriores; suas 95 entradas e evidências permanecem históricas.

## Histórico — leitor de upload e candidata r3

O E2E global revelou uma composição incompleta no modo demo: a busca lia o upload na memória
dinâmica, mas o leitor de fontes só conhecia seeds estáticos. A nova captura de procedência
negava a primeira pergunta com 403. A guarda foi conservada. A memória agora oferece leitor
privado das páginas completas dos uploads processados; o startup o compõe com os leitores
seed/legislação existentes. IDs, página, condomínio e permissão são conferidos; nenhum leitor
PostgreSQL ou controle de custo foi alterado. Seeds mantêm o comportamento anterior.

O teste existente manteve a exigência de 200/citação e ganhou replay idêntico, leitura da fonte
e negativa de outro condomínio. Duas unidades novas cobrem página longa até a última linha,
confirmada ou pendente, outro tenant/sem permissão e página/documento/versão ausentes. A leitura
do original autorizado não confirma vigência; catálogo/guardas continuam decidindo se pode
afirmar uma regra ou reapresentar uma análise. Não há fallback parcial de texto para contornar
falta de página. O perfil é exclusivamente sintético/local e não ativa serviço real.

**26/26 testes** passaram em
`.local/pilot-documents-2026-11-09/extension/1794423446019-26084/results.json`, com JUnit adjacente,
incluindo os sete E2E de consulta, quatro unidades de memória e 15 regressões de replay de
política/vigência/página. Tipos completos, lint/formatação do delta e visão de 72 specs passaram.
Usou HTTP loopback autorizado, `envDir:false`, dados sintéticos e zero provedor. O vermelho
global e as falhas distintas de sandbox permanecem nos artefatos da Segurança.

`.local/pilot-documents-2026-11-11/candidate-source-hashes-2026-11-11-r3.json` enumera 96 entradas
e sete deltas da r2: memória, binding de startup, duas suítes, config e spec/aceitação 071.
Naquela captura, as fontes ficaram prontas para revisão do delta e recaptura. Check/cobertura r2
passaram a históricos para os arquivos alterados; a repetição global foi concluída na r4. SQL/
ledger/retention/recovery permanecem iguais à prova PostgreSQL r2, sem nova migration ou efeito.

## Correção final — fonte arquivada e candidata r4

A contraprova independente da Infraestrutura encontrou uma lacuna na r3: a página do upload
continuava aberta após arquivamento. O mapa conservava os bytes integrais sem consultar se
o documento ainda estava ativo. Vermelhos preservados em
`.local/pilot-operations/full-review/upload-source-archive-{red,proof-red}-2026-11-11.json`.
O complemento foi registrado antes da mutação, dentro da mesma área do leitor.

O contrato passou de leitor bruto para **`memory.createSourceReader(catalog)`**, com catálogo
autoritativo obrigatório. Cada leitura confere permissão, IDs/página/tenant e documento ativo;
presença de dados em memória não concede acesso. O startup usa o mesmo repository do domínio.
Não restringe leitura de conflito a vigência confirmada e conserva versão histórica de um
documento ativo; a decisão de afirmar regra/replay continua no catálogo/procedência. Os probes
externos devem criar o reader com o catálogo real, mantendo o controle positivo antes de arquivar.

**27/27 testes** passaram em
`.local/pilot-documents-2026-11-09/extension/1794424012186-20868/results.json`, JUnit adjacente:
cinco unidades de memória, sete E2E de consulta e 15 regressões de replay. O percurso mantido
exige 200/fonte/citação/replay, arquiva com 204, exige 404 da página e 403 do replay, conserva
trecho histórico marcado `sourceRemoved`, recupera com 204 e compara a mesma página em 200.
Unidade com catálogo real confirma versão antiga ainda ativa, remoção das duas versões de A
e B intacto. Permanecem os negativos de tenant, permissão e IDs/página ausentes. Nenhuma
asserção 404 foi relaxada; não apagamos trecho histórico para evitar acesso ao arquivo inteiro.

Tipos completos, lint/formatação e visão de 72 specs passaram após anotar explicitamente os
dois parâmetros do método interno. Captura r4:
`.local/pilot-documents-2026-11-11/candidate-source-hashes-2026-11-11-r4.json`, 96 entradas,
seis deltas da r3 e fontes estabilizadas. Check/cobertura anteriores são históricos para
o delta; os gates atuais foram repetidos e concluídos abaixo. Ledger/SQL/PG/custos permanecem iguais à prova r2.
Nenhuma chamada paga, serviço remoto, dado real, migration ou dependência foi introduzido.

Contraprova independente atual da Infraestrutura: startup real sintético passou
200→arquivar 204→página 404 em
`.local/pilot-operations/full-review/upload-source-archive-startup-{green,proof-green}-2026-11-11.json`.
As cinco unidades mantidas também passaram independentemente em
`full-review/upload-reader-r4-independent-2026-11-11.json`. A fonte/binding foram relidos e os
inputs conferidos por hash. A Segurança consolidou a captura
`.local/pilot-security/global-window03-before-r4.json` para repetir os gates. Reconfirmei as
96 entradas documentais e as dez operacionais sem alteração; nossa revisão operacional r2
continua válida por hash. Notas/relatórios seguem mutáveis e não representam aprovação do branch.

## Fechamento dos gates locais da r4

| Gate atual                             | Resultado                                                                                    | Artefato em `.local/pilot-security/`, salvo quando indicado                                                                                                    |
| -------------------------------------- | -------------------------------------------------------------------------------------------- | -------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| Check completo                         | 2.459/2.459 unidades, 196 arquivos; formatação/lint/tipos/72 specs/scanner aprovados, exit 0 | `global-check-window03-1794424246880.log`                                                                                                                      |
| Cobertura global somente unitária      | statements 87,57%; branches 83,70%; functions 92,84%; lines 89,44%; sem exclusões novas      | `coverage-window03-1794424246880/coverage-summary.json`                                                                                                        |
| E2E com HTTP loopback autorizado       | 247/247, zero falha                                                                          | `global-e2e-window03-1794424690672.{json,log,xml}`                                                                                                             |
| Build API / web com guarda de ambiente | Aprovados                                                                                    | `global-build-api-window03-1794424756589.log`, `global-build-web-window03-1794424756615.log`                                                                   |
| Runtime compilado                      | Login, dois PDFs e 20 perguntas; zero provedor, pico RSS 148 MiB                             | `global-runtime-window03-1794424800578.log`                                                                                                                    |
| Evals de contrato determinístico       | Core 20/20; documental mecânico 50/50; 280 cenários/1.010 turnos sem falha mecânica          | `global-evals-core-window03-1794424780953.log`, `global-evals-documentary-window03-1794424780953.log`, `global-evals-conversations-window03-1794424780962.log` |
| Worker separado PostgreSQL local       | Aprovado, container próprio encerrado                                                        | `.local/pilot-operations/container-d89b1317733e49c3b15c80b38feba266/result.json`, filho `5a0d082bd51644c79f61a42c543c9d64`                                     |
| Snapshot final antes/depois            | 910 entradas em ambos, zero diferença; comparação repetida por esta frente                   | `global-window03-before-r4.json`, `global-window03-after-r4.json`                                                                                              |

Os 96 hashes documentais e os dez operacionais permanecem iguais às candidatas revisadas.
Preparação local e revisão cruzada atribuídas a esta frente estão concluídas. A execução
global foi conduzida pela Segurança, sem gate pesado concorrente desta frente; o conjunto
atual conserva os vermelhos de tentativas anteriores e o ajuste de concorrência, sem relaxar
timeouts ou asserções. Não houve nova edição funcional após a captura final.

As avaliações acima são mecânicas, com `semanticApproved=null` e zero provedor; não aprovam
qualidade de modelo/OCR efetivos. A prova sintética de memória/runtime não certifica capacidade
do destino real. Política/fornecedor/retenção, orçamento e destino efetivos, semântica/especialista,
CI e revisão completa independente do diff/commit a integrar permanecem fora desta aprovação.
Nenhum commit, merge, publicação, serviço remoto, dado real ou cobrança foi executado.

## Delta documental posterior aos gates — AC-2414

A revisão integral da Infraestrutura encontrou o exemplo AC-2414 da Spec 024 ainda com
`clamp(21px, 3vw, 28px)`, embora RQ-2412/CSS já usassem a redução autorizada pela Spec 016.
Foi alterada somente essa linha para `clamp(18.9px, 2.7vw, 25.2px)`, com referências concretas
a RQ-1606/AC-1608 e RQ-2412. Alinhamento existente com briefing §§1, 2 e 6 e o gate competitivo
permanece válido: correção de consistência na conversa autorizada, sem escopo ou comportamento novo.

O diff foi comparado com cópia imediatamente anterior, preservando todas as outras edições e
o estilo. Gate documental `validate-spec-vision.ps1`: 72 specs aprovadas. Hash anterior
`2d45c40dfc273d0bb6a8753bb9361e3d189da495a3e6bb0d67732cdf84049dce`;
hash posterior `ab0e7c366a4773dd8c08a0a6ce104e4c91322f570d667dbeb0ad0929338f7999`.
Recibo `.local/pilot-documents-2026-11-11/post-gates-ac2414.json` confirma correspondência da
cópia anterior ao snapshot global e zero alteração nas 96 entradas funcionais da r4.

A igualdade das 910 entradas registrada acima corresponde ao instante dos gates; esta linha
documental posterior é uma diferença declarada, não uma alegação de snapshot ainda idêntico.
Não houve repetição de testes aprovados, mudança funcional, serviço ou cobrança. A frente
permanece concluída localmente, com o ajuste e sua rastreabilidade registrados.
