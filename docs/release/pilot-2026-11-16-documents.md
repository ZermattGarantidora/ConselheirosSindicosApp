# Piloto 16/11/2026 — Documentos e IA

**Complemento de revisão concluído:** leitura integral de 98 arquivos das Specs 041–067
(754.951 bytes), com observações/SHA por arquivo e sem novo P0/P1 confirmado no recorte.
Infraestrutura reassumiu e registrou a leitura dos 47 relatórios narrativos; eles constam
como delegados, sem leitura atribuída a Documentos. Os 145 hashes históricos e os 96 da r4
permanecem iguais. Mapa `.local/pilot-documents-2026-11-11/historical-documents-review.json`,
SHA `508a629605c3f4083756daf7afa91b81609d85d24a1bf22eab613b7805c5219f`.
[Escopo, conclusões e limites da revisão](../reviews/2026-11-11-historical-documents-documents-review.md).
Sem fonte funcional, configuração, teste ou prompt alterado, sem repetição dos gates ou
chamadas de modelo. Autoria histórica desconhecida; não aprova o branch inteiro ou semântica.
Não resta trabalho local atribuído a esta frente.

**Ajuste exclusivamente documental após os gates:** AC-2414 da Spec 024 agora usa
`clamp(18.9px, 2.7vw, 25.2px)` e referencia RQ-1606/AC-1608 da Spec 016 e RQ-2412.
Era uma divergência do exemplo, já corrigida na spec e no CSS. Diff desta intervenção:
uma linha de aceitação; estilo/histórico preservados. Gate de visão: 72 specs aprovadas.
SHA-256 posterior `ab0e7c366a4773dd8c08a0a6ce104e4c91322f570d667dbeb0ad0929338f7999`;
recibo `.local/pilot-documents-2026-11-11/post-gates-ac2414.json`. É um delta documental
explícito posterior ao snapshot global; os 96 hashes funcionais da r4 permanecem iguais.
Não foram repetidos testes funcionais nem alterados fonte, configuração ou testes.

**Fechamento local da r4 — etapas 5–7 concluídas nesta frente:**
**Nenhum trabalho local pendente nesta frente.** Os blocos de estabilização e execução
intermediária abaixo são históricos; o estado atual é este fechamento e seu relatório final.
Check final **2.459/2.459 unidades**, **247/247 E2E**, builds API/web, runtime compilado,
evals determinísticos e worker separado passaram na janela 03. Cobertura global unitária
87,57/83,70/92,84/89,44% (statements/branches/functions/lines), quatro pisos atendidos.
Comparação independente dos snapshots globais antes/depois: **910 entradas, zero diferença**.
Worker `container-d89b1317733e49c3b15c80b38feba266`, filho `5a0d082bd51644c79f61a42c543c9d64`,
passou e encerrou seu container. As 96 entradas documentais continuam iguais à captura r4.
Evidências finais e limites no [relatório local](../reviews/2026-11-11-pilot-documents-local.md).
Sem dado real, provedor pago, serviço remoto ou cobrança; startup de envio real continua negado.
Não é aprovação do diff integral/CI/merge ou liberação do piloto. Qualidade semântica/OCR real,
política, fornecedor, destino e orçamento efetivo permanecem decisões/provas posteriores.

**Histórico da estabilização r4:**

**Candidata r4 estável — fonte exige catálogo ativo:**
`.local/pilot-documents-2026-11-11/candidate-source-hashes-2026-11-11-r4.json`, 96 entradas,
seis deltas da r3, dentro da mesma reabertura autorizada. Contrato privado agora é
`memory.createSourceReader(catalog)`: exige o catálogo real, confere documento ativo em cada
leitura e não oferece leitor bruto que ignore arquivamento. Startup passa o mesmo repository.
**27/27** testes passaram em `extension/1794424012186-20868/results.json`: upload/fonte/replay
200 antes da remoção; arquivar 204; página 404 e replay 403; trecho histórico com sourceRemoved;
recuperar 204 e mesma página 200; versão histórica de documento ativo e tenant B preservados.
Tipos completos, lint/formatação e 72 specs passaram. A candidata ficou pronta para releitura,
adaptação do probe e recaptura; esses passos e os gates foram concluídos no fechamento acima.
SQL/ledger/custo não mudaram desde r2; zero provedor/serviço remoto/cobrança nesta validação.

**Histórico do complemento da r3:**

**Complemento delimitado da r3 — arquivo removido:** Infraestrutura reproduziu a página
inteira ainda aberta após arquivamento. Reabrir os mesmos arquivos do leitor para exigir
catálogo ativo no próprio contrato privado, sem usar mera presença no mapa. Conservar apenas
o trecho histórico, negar a página removida e permitir recuperação autorizada. R3 histórica;
nova captura r4 após regressões de arquivo/restauração e tenant B. Nenhum outro módulo reaberto.

**Candidata r3 estável — leitor do upload corrigido:**
`.local/pilot-documents-2026-11-11/candidate-source-hashes-2026-11-11-r3.json`, 96 entradas,
sete deltas enumerados da r2. O leitor privado conserva páginas integrais dos uploads
processados, com condomínio/documento/versão/página e permissão exatos; não serve só um chunk.
Startup demo compõe esse leitor com seed/legislação, preservando o leitor PostgreSQL e as
guardas de replay. **26/26** testes passaram em `extension/1794423446019-26084/results.json`:
upload/pergunta/replay/fonte com 200, página longa até a última linha, confirmação pendente,
negação de outro tenant/sem permissão/IDs ausentes e os 15 casos de política/página do journal.
Tipo/lint/formatação e 72 specs passaram. As fontes ficaram estáveis para releitura e recaptura.
Unitários/cobertura da r2 passaram a históricos para esse delta e foram repetidos na r4.
Ledger/SQL/ciclo PostgreSQL não mudaram desde a prova r2. Zero transferência externa.

**Histórico da reabertura do leitor:**

**Reabertura delimitada pelo E2E de PDF enviado:** o check r2 ficou verde; o E2E
`document-answer.e2e.test.ts` revelou 403 na primeira pergunta após upload. A busca usa a
memória dinâmica, mas o binding de fontes do startup demo usa apenas seeds estáticos.
Preparar leitor privado das páginas integrais do upload no mesmo escopo, composto com o
leitor seed/legislação existente. Não remover hash/guarda nem relaxar o 200/citação do teste.
Delta autorizado: memória documental, binding em server.ts, testes e contrato 071. A r2
permanece histórica até a nova captura r3; outros arquivos continuam congelados. As falhas
de loopback do sandbox são tratadas separadamente pelo dono dos gates, sem alteração dos testes.

**Candidata r2 estável após a correção delimitada:**
`.local/pilot-documents-2026-11-11/candidate-source-hashes-2026-11-11-r2.json`, 95 entradas,
somente cinco deltas da r1 (repository/teste de retenção, config e spec/aceitação 071).
As seis unidades de retenção e 32 do recorte afetado passaram sem mudar a asserção anterior.
362/362 unidades passaram; cobertura focada agora inclui 15 módulos:
94,95/92,06/98,29/97,20% (statements/branches/functions/lines), artefato
`extension/1794422561272-228/` na saída documental. SQL atual 2/2, wrapper
`container-911401d9b83548b58e82029a849a8fdd`, filho `963e265ebbe94260a992f8c0acd80886`,
container encerrado. Tipos/lint/formatação e 72 specs passaram. A candidata ficou pronta para
releitura e recaptura; a validação posterior terminou na r4.

**Histórico da reabertura abaixo:**

**Reabertura delimitada após o primeiro check global:**
`global-check-window03-1794422113310.log` registrou 2.444/2.453: oito timeouts e uma asserção
determinística no caminho de retenção sem observador. A primeira fase nova configura escopo
sem necessidade nesse caminho, duplicando os dois `set_config` esperados. Não enfraquecer o
teste: mover a configuração de preparação para dentro de `beforePurge`, preservando escopo
por efeito e a preparação completa antes de qualquer trigger quando houver observador.
Delta reaberto: repository de retenção, sua unidade, config focada e exemplos 071. A candidata
de 94 hashes é histórica para esse delta; nova captura r2 será publicada após as regressões.
Fontes restantes permanecem congeladas. Não alterar timeout dos oito casos nem apagar o vermelho.

**Histórico — estado da candidata r1 antes dos gates conjuntos da janela 03.**
430/430 testes focados e 356/356 unidades com cobertura passaram sob `envDir:false`.
Cobertura statements/branches/functions/lines: 94,88/92,14/98,25/97,10%. PostgreSQL local
passou 2/2 cenários amplos, wrapper `container-c88c1c6700be421ea96cb0030d7265ef`, filho
`06539cf9c0ed46e3a4b6c1c97f4337b2`; container encerrado. Tipos/lint/formatação/visão passaram.
Hashes históricos da r1: `.local/pilot-documents-2026-11-11/candidate-source-hashes-2026-11-11.json`.
Relatório atual: [fechamento local de 11/11](../reviews/2026-11-11-pilot-documents-local.md).
Naquele momento, as fontes ficaram estáveis para revisão; o fechamento atual é o da r4 no topo.

**Histórico imediato da validação:**
Identidade/membership foi corrigida pela Segurança, sem equiparar auth_subject ao UUID da
fixture. A prova documental local atual passou duas purgas no mesmo lote, órfãos, exportação,
restore em destinos novos e exclusão com recibos/custos preservados. A bateria anterior passou
425/425; seus resultados permanecem históricos. Estamos repetindo os gates após bloquear
explicitamente a leitura automática de `.env*` nas duas configurações Vite desta frente.
Lista de variáveis no filho, isoladamente, não garantia esse bloqueio; a afirmação anterior
fica corrigida. Nenhum arquivo de ambiente real foi aberto manualmente para a contraprova.

O P1 adicional da revisão de Segurança (página muda fora do trecho citado) recebeu hash privado
da página inteira, além do catálogo e trecho. Os nove casos mantidos de perguntas passaram,
incluindo página alterada e prova legada ausente, sem outra geração. AC-7128 testa as duas
configurações com canário sintético temporário. O primeiro reteste teve dois timeouts de PDF
preservados; a sequência completa passou sem mudar testes/limites. Revisão final e gates
globais seguem distintos.

**Registro histórico:** a janela
`security-local-20261109-02` foi encerrada pela Segurança com os gates aprovados. Sua candidata
e histórico são preservados. Naquela retomada: etapa 5, revisão cruzada independente de Infraestrutura;
etapa 6, lacunas executáveis de ciclo de dados/restore/reconciliação; etapa 7, prova integrada e
relatório final. Leitura/revisão e relatórios avançam; mudança funcional exige spec/aceitação e
nova candidata/janela coordenada. Não é aprovação de merge ou uso de dados reais.

## Etapas de acompanhamento — por dependência

1. **Concluída — OCR integral de fotos.** JPEG/PNG integralmente sintéticos conservam a página
   inteira, texto acima de 250 caracteres e fontes por versão/página/offset. Trinta testes de
   conversão/OCR e quatro cenários HTTP com fetch simulado passaram. Acurácia real não medida.
2. **Concluída — ledger e orçamento compartilhado.** Resultado durável, compromisso antes do
   envio, bloqueio de unknown e revisão de política; composição com Spec 072 sem duplicar gasto.
   Cinquenta e quatro testes de ledger/política/composição/admissão passaram. SQL real local e
   restauração em processo novo recusaram política B e recuperaram A sem reenvio.
3. **Concluída — integração central sintética.** Setup, perguntas, upload e mensagem documental
   recebem admissão por sessão/membership; OCR/fotos/síntese/embeddings usam a composição
   específica. Seis cenários HTTP e um worker com SQL/transportes simulados passaram. A bateria
   ampliada passou 359/359 em 33 arquivos; os sete cenários afetados pelo ajuste final passaram
   novamente. Sem política positiva ligada ao startup persistente.
4. **Concluída localmente — candidata estável e gates globais.** Check completo, cobertura,
   E2E, builds/runtime e provas locais de PostgreSQL/worker passaram. A correção delimitada
   do teste antigo e da numeração da spec foi revisada e revalidada. Hashes finais conferidos;
   a consolidação está no fim desta nota. Fontes permanecem congeladas até o encerramento
   formal da coordenação; revisão completa/CI/merge e liberação real continuam distintos.
5. **Concluída — revisão cruzada atribuída.** Candidata operacional r2, dez entradas e mapa
   de cobertura por hash entregues; nenhum arquivo de autoria própria foi aprovado como independente.
6. **Concluída — ciclo de dados local.** Exportação, purgas em lote/órfãos, isolamento,
   conservação de consumo, rollback, reconciliação negada por padrão e restore em quarentena
   tiveram provas sintéticas e PostgreSQL local, com negativos e recuperação autorizada.
7. **Concluída — candidata final r4 e relatórios.** 2.459 unidades, 247 E2E, cobertura global,
   builds/runtime/evals determinísticos/worker, hashes finais e notas atuais concluídos.

## Comportamento entregue

A [Spec 071](../specs/071-adaptacao-documental-hospedada/spec.md), sua
[aceitação](../specs/071-adaptacao-documental-hospedada/acceptance.md) e o
[ADR 0043](../adr/0043-adaptacao-documental-hospedada.md) precedem o comportamento.
Não houve alteração do prompt principal, personalidade, dependência ou serviço externo.

- Fotos documentais são convertidas localmente em PDF transitório de uma página, com o prompt
  OCR existente. JPEG conserva o fluxo original; PNG de 8 bits não entrelaçado conserva pixels
  e transparência. Original privado, hash original e hash do payload permanecem distintos.
  Não há corte ou redução silenciosa. Limites: 10 MiB, 12 milhões de pixels, dimensão 16.384,
  64 MiB decodificados; 120.000 caracteres, 16.000 tokens e 60 segundos para OCR. Formato não
  suportado, falha/completude/qualidade insuficiente mantém revisão. Números financeiros OCR
  continuam exigindo conferência independente, mesmo com score alto.
- PDF textual continua local. OCR de PDF preparado tem máximo de dez páginas/25 MiB, uma
  tentativa, entrada inline e `store:false`; sem Files API, URL ou ferramenta. Acima disso,
  mantém original/revisão. Modo visual é separado: 500 tokens/45 segundos e texto curto;
  sua descrição não vira transcrição literal.
- Ledger privado registra reserva, dispatch e resultado validado antes do ACK. Arquivo de
  ensaio usa lock entre processos, flush e rename; não é backend público nem garantia de
  sobreviver à perda do disco. PostgreSQL tem adaptador transacional e migration 039.
  Timeout/queda/falha de resultado depois de dispatch conserva compromisso e impede retry,
  mesmo após reinício/dia novo. Cancelar só antes do envio libera compromisso. Invalidação
  por versão remove derivado e impede replay/reenvio, conservando recibo/custo mínimo.
- Revisão de política é persistida e conferida sob a mesma chave lógica. B não reutiliza A
  nem cria chamada para contornar resultado incerto; recibo legado sem revisão falha fechado.
  A correção mínima foi escrita por Segurança; esta frente a conservou, integrou e acrescentou
  prova em processo separado. A revisão parcial independente de Infraestrutura está em
  [2026-11-09-pilot-security-infrastructure-review.md](../reviews/2026-11-09-pilot-security-infrastructure-review.md).
- `createBudgetedHostedDocumentControls` deve ser passado como par `{authorize,callControl}`:
  revalida escopo privado também no replay, sem consumir quota no autorizador. **Spec 072 é o
  total monetário autoritativo** para custo/quantidade/concorrência. O ledger espelha compromisso
  para recuperação; seus valores não são somados como segunda despesa. Testes usam USD/tarifa
  fictícios. `actualCostMicrounits` contabiliza o máximo conservador, não fatura medida.
  Resultado confirmado precede conclusão operacional; falha entre stores conserva a reserva
  desconhecida e permite só recuperar resultado confirmado, sem reenvio ou liberação otimista.
- Síntese hospedada continua injetável, vinculada a usuário/condomínio/chat/membership, com
  fontes atuais e journal antes do ACK. Máximo de 50 versões/500 páginas/120.000 caracteres/
  1.200 tokens, modelo único e sem fallback. Dois destinos configurados são recusados.
- API deriva escopo da sessão/membership atuais e revalida antes/depois do trabalho. Chave de
  repetição é dado do cliente; UUID lógico, fingerprint, finalidade, revisão e custo são do
  servidor. Payload ou revisão alterados não ganham outro claim da mesma tentativa. Upload
  reserva quantidade/custo zero; setup/pergunta reservam máximo que cobre tentativas internas.
  Inclui endpoint legado de respostas e fala documental. Journal salvo precede nova reserva;
  recibo concluído sem journal exige pendência/reconciliação, sem regenerar automaticamente.
- Worker recebe fábrica de embedding por condomínio/versão/sinal do job persistido validado.
  Rollback após confirmar OCR/vetores não repete os transportes na tentativa seguinte. Vetor
  exige perfil/dimensão/hash válidos. Consulta futura precisa do mesmo perfil antes de ativação.
- Startup persistente injeta admissão negativa; fábricas documentais não recebem autorização,
  chave ou controlador positivos do ambiente. Flags legadas não ativam OCR/fotos/vetores/síntese.
  Fila local continua uma ativa/quatro esperando; cache RAM não ignora ledger no modo durável.

## Histórico — evidências da candidata inicial

| Verificação                     | Resultado e limite                                                                                                                                                                                                                                 |
| ------------------------------- | -------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| Bateria documental ampliada     | 359/359 testes em 33 arquivos, sintéticos e transportes/SQL simulados; `.local/pilot-documents-2026-11-09/extension/1794250920395-26824/`                                                                                                          |
| Revalidação final HTTP/worker   | 7/7 após ajuste de hash binário e limpeza; `.local/pilot-documents-2026-11-09/extension/1794251075982-23176/`                                                                                                                                      |
| Cobertura unitária focada       | 305/305 em 27 arquivos; nove módulos preparados: statements 95,46%, branches 93,34%, functions 100%, lines 97,76%; sem exclusões de produção; `.local/pilot-documents-2026-11-09/extension/1794250631975-9680/coverage-unit/coverage-summary.json` |
| P1 por novo processo            | A concluída/B negada/A recuperada e A enviada/B negada, um único provedor simulado; teste `hosted-call-ledger.test.ts`                                                                                                                             |
| PostgreSQL real local e restore | Wrapper `.local/pilot-operations/container-f3f1b40b619d43ea8a1aa865a310284b/result.json`; ensaio `.local/pilot-operations/0e756b6b9549459e9b132f09db5a892c/`                                                                                       |
| Matriz RLS real local           | Wrapper `.local/pilot-operations/container-fd7b02b7208f4b1ca4e914d87f494113/result.json`; ensaio `.local/pilot-operations/daeb748f78ba4a79bdf9dd7fbe6b22ab/`                                                                                       |
| API/worker compilados separados | Wrapper `.local/pilot-operations/container-9a99569916ce497a9b1d1ac628706948/result.json`; ensaio `.local/pilot-operations/81a8fca30aea40b3854109024ba2386a/`                                                                                       |
| Tipos/lint/formatação           | TypeScript do checkout observado passou; lint e Prettier do escopo passaram. Correção do lint de cleanup e revalidação preservadas. Não substitui check global congelado.                                                                          |
| Visão                           | Script canônico copiado com briefing/Spec 071 atuais para sandbox exclusivo; gate passou. Formatação inicialmente expandiu o cabeçalho exigido; tabela marcada `prettier-ignore`, cabeçalho restaurado e ambos gates revalidados.                  |
| Revisão                         | Autorrevisão do delta documental com skill code-review; diff-check sem erros. Revisão independente parcial do P1/composição já existe, mas não é aprovação do branch inteiro.                                                                      |

A prova PostgreSQL foi executada com imagem pg17 já existente, loopback/SCRAM/tmpfs, bancos
marcados descartáveis e pools restritos separados. Migrations 039/040 somente no banco local;
API/worker não recebem `app_ai_executor`. Verificou corrida de reserva/claim, teto global/tenant,
recibos/login, RLS, recuperação por novo processo, política A/B, invalidation, journal completo,
originais/páginas/chunks/vetores/fila e restore integral (49 tabelas/1.145 objetos/40 migrations).
Os três containers desta execução foram encerrados e os recibos confirmam zero provedor externo.
A primeira tentativa Docker foi negada pelo sandbox; a repetição com a permissão local autorizada
passou. Não houve rejeição do auto-review ou uso de alternativa remota.

## Rastreabilidade oferecida ao dono global

Captura e oferta atuais: `candidate-source-hashes-2026-11-11-r4.json` e `traceability-offer.json`
em `.local/pilot-documents-2026-11-11/`. O relatório final registra RQ-7112–7118 e AC-7120–7128.
A tabela de integração inicial abaixo é histórica.

| Requisito/aceitação                   | Prova principal                                                                                                                                         |
| ------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------- |
| RQ-7101 / AC-7101/7104                | `hosted-document-execution.test.ts`, `hosted-document-startup.test.ts`: autorização, fila/cache/escopo e default negativo                               |
| RQ-7102/7105 / AC-7102/7103/7105/7107 | `hosted-document-processing.test.ts`, `ocr-quality.test.ts`, `ocr-consistency.test.ts`: completude, limites e conferência financeira                    |
| RQ-7104/7105 / AC-7106/7108           | `hosted-document-batch.test.ts`, `document-batch-conversation.test.ts`, `conversation-store.test.ts`: fontes, revogação, ausência de fallback e journal |
| RQ-7106 / AC-7109/7110                | `photo-document-ocr.test.ts`, `photo-document-durable.e2e.test.ts`: pixels, formatos, texto integral, original e citações                               |
| RQ-7107/7108 / AC-7111–7114           | `hosted-call-ledger.test.ts`, `postgres-hosted-call-ledger.test.ts`, ensaio SQL/restore: limites, processo novo, unknown, cancelamento e invalidação    |
| RQ-7109 / AC-7115                     | `hosted-document-embedding.test.ts`, `hosted-worker-budget.e2e.test.ts`: contexto privado, perfil/hash/vetor e rollback sem reenvio                     |
| RQ-7107 / AC-7116                     | `hosted-transport-preconditions.test.ts`: controlador ausente/inválido, teste interno sem fetch e ambiente de produção recusados                        |
| RQ-7107 / AC-7117                     | `hosted-policy-continuity.test.ts`, processo separado no ledger e SQL/restore: revisão divergente/legada bloqueada sob identidade estável               |
| RQ-7107/7108 / AC-7118                | `hosted-budget-integration.test.ts`, HTTP da foto, worker e SQL/restore: stores compostos e um total autoritativo                                       |
| RQ-7111 / AC-7119                     | `api-operation-control.test.ts`, `operation-budget-http.e2e.test.ts`, startup: sessão/membership, limites privados, journal falho e default negado      |

Não editei `package.json`, README, AGENTS, rastreabilidade global, módulos de orçamento/migration
040 ou runners de Infraestrutura. Config de teste própria e comandos diretos usam dependências
existentes; nenhum comando novo de eval. Segurança pode incorporar a tabela e registrar os gates.

## Reproduzir localmente

```powershell
node node_modules/vitest/vitest.mjs run --config tests/vitest.pilot-documents.config.ts
node node_modules/vitest/vitest.mjs run --config tests/vitest.pilot-documents.config.ts --coverage --exclude 'tests/e2e/**'
node node_modules/typescript/bin/tsc --noEmit
pwsh -NoProfile -File scripts/verify-pilot-recovery-container.ps1 -ConfirmSyntheticLocal
pwsh -NoProfile -File scripts/verify-pilot-recovery-container.ps1 -ConfirmSyntheticLocal -Suite rls
pwsh -NoProfile -File scripts/verify-pilot-recovery-container.ps1 -ConfirmSyntheticLocal -Suite worker
```

Manifesto atual de arquivos/hashes: `.local/pilot-documents-2026-11-09/extension/candidate-source-hashes-2026-11-09.json`.
Não é commit nem certificação do checkout inteiro. Relatórios da primeira fatia (214 testes,
`focused-tests.json`, `coverage/` e `review-manifest.json`) permanecem históricos e não identificam
a extensão atual. O checkout preexistente e o prompt aprovado foram preservados; sem commit,
merge, publicação, segredo real, documento real, contratação ou chamada de IA externa.

## Pendências que não são resolvidas por mocks

- Revisão independente completa do branch e CI/merge. Os gates locais finais da janela 03/r4
  foram concluídos e estão consolidados no relatório; não equivalem a revisão humana ou
  liberação de uso real. Nenhuma execução local desta frente está pendente.
- Baseline OCR/API e semântica com inferência efetiva, orientação de foto e qualidade de fontes;
  preços/modelos/limites aprovados, provedor/payload/política/retenção e revisão especializada.
  A chamada real não está autorizada nesta rodada; acurácia não pode ser inferida do mock.
- Aplicação no destino real de retenção/expurgo/tombstones, backups e reconciliação de unknown,
  sob política aprovada. As provas locais de ciclo de dados foram concluídas; não escolhem
  retenção real nem permitem apagar recibo para liberar consumo. Nenhum serviço remoto foi ativado.

## Correção atômica durante a janela 02

O check global aprovou formatação/lint/tipos e encontrou uma falha em 2.347 testes:
`offline-demo-ui.test.ts` exigia o literal antigo `unavailableOcrAdapter,`. Com autorização
específica da coordenação, o teste mantém a proibição de fábrica de OCR por ambiente e exige
uso da fábrica sem argumentos. Acrescenta prova comportamental com flags/chave sintéticas:
adaptador é exatamente o indisponível, recognize retorna unavailable, fotos não são habilitadas
e fetch não é chamado. Os cinco testes de offline/startup passaram; lint/formatação passaram.
Relatório: `.local/pilot-documents-2026-11-09/extension/startup-fix-tests.json`.
Duas tentativas iniciais de CLI usaram opções não suportadas e não executaram testes; a prova
válida usou config exclusiva em `.local/`, sem relatórios compartilhados.

A coordenação também detectou duplicação de RQ-7110: composição conserva esse ID, integração
central passa a RQ-7111 e AC-7119 acompanha. Não há alteração funcional, flexibilização de
asserção ou mudança de limite. Teste e numeração são as únicas entradas de candidata alteradas
nesta correção, além desta nota de coordenação. Hashes serão recapturados; volta à pausa para
repetir o check/cobertura. A falha anterior não é declarada aprovada por esses testes focados.

## Resultado técnico consolidado — etapa 4 concluída localmente

A repetição do check terminou com **2.347/2.347 testes unitários em 187 arquivos**,
formatação/lint/tipos aprovados, **72 specs** aprovadas estruturalmente e scanner sem padrões
conhecidos de segredo. Cobertura global: statements **89,02%**, branches **85,09%**, functions
**93,92%**, lines **90,84%**; todos acima de 80%, sem reduzir thresholds ou excluir produção.

Na mesma candidata: **232/232 E2E em 37 arquivos**, **17/17 RLS em PostgreSQL real local**,
API/worker compilados em processos separados, builds de API/web e runtime compilado passaram.
O runtime exercitou dois PDFs e vinte perguntas com zero provedor externo. Replays determinísticos
passaram em 50 contratos documentais e 280 cenários/1.010 turnos; não é aprovação semântica
por modelo/especialista. Provas SQL/restore próprias estão registradas acima.

Evidências coordenadas da Segurança em `.local/pilot-security/`: `global-check-window02-r3.log`,
`global-e2e-window02.json`, `global-rls-window02.log`, `global-worker-window02.log`,
`global-build-api-window02.log`, `global-build-web-window02.log`, `global-runtime-window02.log`
e snapshot `global-window02-r3-before.json`. Esta frente conferiu novamente os **834 arquivos**,
com **zero divergência** após os gates: `.local/pilot-documents-2026-11-09/extension/global-integrity-after-gates.json`.
Infraestrutura também confirmou o término dos gates na sua etapa 4. A nota de coordenação não
integra os 834 arquivos congelados; sua atualização não altera código/testes/config/spec validados.

As fontes funcionais permanecem congeladas até o registro formal de encerramento pela Segurança;
esta frente não precisa de outra correção funcional para o escopo local solicitado. Rastreabilidade
oferecida, candidata, hashes, limitações e resultados permanecem revisáveis. Revisão independente
completa do branch/CI/merge e decisões para dados reais, qualidade efetiva de OCR e ativação não
foram dispensadas nem declaradas aprovadas. Sem serviço externo ativado, documento real ou cobrança.

## Etapa 5 concluída — revisão cruzada de Infraestrutura

Revisão de 46 arquivos operacionais/contratos/testes e seus deltas contra a base, sem autoria
operacional desta frente na rodada. Não foi confirmado novo defeito concreto. Cobertura por
arquivo/hash em `.local/pilot-documents-2026-11-09/closure/infrastructure-review-coverage.json`;
relato e limites em `docs/reviews/2026-11-09-pilot-infrastructure-documents-review.md`.
Os gates da etapa 4 foram reaproveitados para conteúdo idêntico; não repetidos sem motivo.
A nota de Segurança já registra a janela 02 ENCERRADA com exit 0; os verbos de espera acima
pertencem ao histórico da janela, não a testes ainda pendentes. Não aprova o branch de 690
arquivos nem os módulos documentais que escrevi. Infraestrutura coordena a cobertura restante.

Etapa 6 em análise: o contrato sintético autoriza exportar o escopo próprio, invalidar derivados
em exclusão, manter histórico/citações históricos segundo a política vigente e reaplicar decisões
fora do snapshot antes de reabrir. Há lacuna entre OCR/foto via HTTP simulado em memória e
sessão/worker/restore PostgreSQL: preparar prova integrada guardada e as menores ligações locais
necessárias. Retenção real e retry de unknown não serão inventados.

## Histórico — etapa 6 em edição antes da validação final

Janela 02 encerrada e candidata anterior preservada. Spec 071 foi estendida antes do código:
RQ-7112/7113/7114 e AC-7120–7124. Nova candidata local será publicada ao terminar a edição;
Segurança coordena a próxima janela/gates. Os resultados da etapa 4 continuam válidos para
seu snapshot e não certificam a extensão futura.

Contratos para coordenação: journal sintético separado do dump, observador de purga, verificador
privado de recuperação de ledger/orçamento negado por padrão, exportação própria e reconciliação
com prova explícita. Spec 072 continua autoritativa para dinheiro; não editarei seus módulos nem
migration 040. Recibo ausente após restore mantém transferências globais bloqueadas, sem fingir
reconstrução automática de orçamento. Histórico/citações seguem a política existente.

Prova integrada planejada em banco/container próprios, guardados e sem concorrência com suites
alheias. Novos arquivos de teste/documentos pertencem a esta frente; runners operacionais não
serão editados. Se Infraestrutura oferecer um runner configurável para config de teste exclusiva,
registro a integração por contrato; nenhum fallback remoto ou carregamento de `.env` é permitido.

### Histórico da retomada em 11/11 — correções em edição

RQ-7115–7117 / AC-7125–7127 precedem as correções dos P1 HTTP/039 e P2 UI.
Regressões mantidas `journal-policy-replay.e2e.test.ts` e `conversation-receipt.test.ts`:
3 falhas funcionais antes, 3 sucessos depois; relatórios exclusivos
`.local/pilot-documents-2026-11-11/replay-receipt-{red,green}.json`.
A tentativa anterior falhou no temporário virtual antes de importar casos; TEMP/TMP próprios
resolveram. Evidências vermelhas originais de Infraestrutura/Segurança permanecem intactas.
O gate de visão encontrou edição concorrente do mapeamento da Spec 072; não foi relaxado.

**Contrato conciliado com Infraestrutura:** removidos os rascunhos de runner próprio e config
`tests/vitest.pilot-documents-postgres.config.ts`. A suíte usa agora a config canônica oferecida
`tests/vitest.pilot-document-lifecycle.config.ts`, URLs `PILOT_DOCUMENTS_SOURCE_DATABASE_URL` /
`PILOT_DOCUMENTS_RESTORE_DATABASE_URL`, runId, confirmação e saída exclusivos do perfil
`-Suite documents`. Source migrado, restore vazio/vector; restaura em outro banco guardado.
O teste cria somente três logins de execução sintéticos NOINHERIT (runtime/worker/ai_executor)
no cluster descartável e usa workers Node separados. `document-lifecycle-proof.json` conserva
passed/providerCalls/activationAuthorized/runId. Config e cenário ainda em validação, não prova.
O callback `createSyntheticDocumentDecisionApplier` recebe o PoolClient da Segurança, sem
BEGIN/COMMIT/conexão própria, allowlists sintéticas explícitas e histórico preservado.
Migration 039 expurga resultado na mesma transação de exclusão, preserva compromisso e bloqueia
escopo órfão; ainda requer ensaio SQL e revisão cruzada da nova candidata.

**Novo achado integrado em 11/11 — identidade/membership (dono Segurança):** o primeiro
ensaio `documents` chegou ao PostgreSQL e falhou ao resolver contexto da sessão criada pelo
serviço de código. `authenticate/login` entrega UUID de usuário, mas
`createPostgresMembershipRepository.findMembership` sempre chama `app.resolve_user_id`,
cuja migration 005 procura apenas auth_subject. Fixture UUID com auth_subject FICTICIO-USER
(mesmo contrato que um usuário importado) retorna membership ausente apesar de vínculo ativo.
Prova vermelha preservada: wrapper `container-89b186b72ca04a959ba84301330ce9a7` (encerrado),
filho `2584f57752134cebbb602c50737d46d2/document-lifecycle-tests.json`, AccessDeniedError em
resolveAuthorizedCondominiumContext. Não contornei com auth_subject=UUID nem alterei identidade
alheia. Sugestão para o dono: reconhecer UUID e aplicar a mesma consulta RLS escopada, com
regressão login/cookie/membership para auth_subject distinto. Não é o P1 HTTP já corrigido.

### Etapa 6 — percurso PostgreSQL aprovado em 11/11

Wrapper `container-e05fcf39b866467680d8800cf121d1b5/result.json`, filho
`7777f5e8455b4e1c951d7d111b42c1d3/document-lifecycle-{tests,proof}.json`: **2/2 cenários amplos**
passaram. Sessão PostgreSQL com auth_subject distinto, JPEG/PNG, OCR integral simulado, três
processos de worker, vetores e consulta com perfil sintético compatível, original idêntico,
fontes/página/offset, exportação privada/checksum/histórico literal e negativas de tenant/usuário.
Arquivo arquivado há 31 dias na fixture foi purgado; restore em outro banco ficou em quarentena,
reaplicou exclusão de forma idempotente e não recuperou original/versão. Callback transacional
reverteu integralmente com ROLLBACK; purga de conteúdo conservou histórico e recibos.
Exclusão real do condomínio com ledger completed/uncertain/cancelled preservou compromisso,
removeu resultados e não alterou B. Snapshot anterior ao consumo manteve transferências globais
negadas. Container próprio encerrado, providerCalls=0, activationAuthorized=false.

Histórico de falhas preservado: identidade no primeiro filho 2584f577... (corrigida pela Segurança);
FK aprovada isoladamente em c46d373a...; depois identidade resolvida revelou conflito de snapshot
na reaplicação, em 931105c8.... Exportação permanece REPEATABLE READ; purga usa READ COMMITTED e
row locks atuais, para não invalidar ledger em outra conexão depois de fixar snapshot antigo.
O mesmo teste mantido falhou antes e passou depois, sem diminuir guardas/assertivas.

P2: minha primeira correção conferia três nomes de campos errados; a contraprova independente
da Infraestrutura identificou-os. Corrigidos conforme API real e promovidos à suíte mantida;
24/24 testes de replay/exportação/callback/contratos passaram no resultado 1794417433324-14272.
Teste antigo que proibia qualquer SECURITY DEFINER foi substituído por verificações dos dois
escopos exatos, search_path fixo, revokes, grants mínimos, RLS/triggers e ausência de papel ao runtime.
Não há exclusão de cobertura ou permissão de função genérica para fazer o gate passar.
