# Revisão final da candidata — achados da Infraestrutura

**Estado:** gatilhos abaixo corrigidos e revalidados; leitura e conciliação técnica concluídas,
sem aprovação de merge. **Atualizado:** 11/11/2026.
**Base:** `3b702db6f91dbbeb2ede1a6063053296298d913c`. Inventários de 690/711 arquivos são
capturas históricas. O mapa atual, incluindo arquivos novos e deltas preexistentes, está em
`.local/pilot-operations/full-review/manifest.json`; cada alteração invalida a leitura por hash.
Não é commit de release. O [relatório de consolidação](2026-11-11-full-candidate-infrastructure-review.md)
registra os gates 03/r4, limites de autoria, rastreabilidade e adendo documental AC-2414.
**Revisor por IA:** frente Infraestrutura; não escreveu o journal/integração documental abaixo.
Não é revisão humana/profissional nem aprovação independente dos próprios arquivos operacionais.

As descrições vermelhas abaixo preservam o defeito na revisão identificada; os parágrafos
de contraprova verde registram seu fechamento. Nenhum desses gatilhos P1/P2 permanece aberto
na candidata final r4. Check, 2.459 unidades, 247 E2E, builds/runtime/worker e hashes finais
foram concluídos. O inventário integral teve suas leituras/escopos e hashes conciliados;
isso permanece distinto de aprovação independente global, CI ou liberação real.

## [P1] Revalidar política antes do replay HTTP do journal

**Arquivo:** `apps/api/app/conversation-journal.ts:149–156`, bloco do `saved` no preHandler,
que retorna `saved.response` sem executar o handler documental. SHA-256 revisado:
`2399c74a39ec1a4bb8ebce9e34ac9f6dac35faf58c73ef4a6bb585ff643cc0bd`.
**Dono da correção:** Documentos e IA; janela/gates coordenados por Segurança.
**Requisitos:** AC-7117/7118/7119 (Spec 071), RQ-7204/7206 (Spec 072), abstenção/autorização
atual do briefing §§8–10. A correção anterior no ledger permanece válida e deve ser conservada.

Uma síntese hospedada concluída sob política A é salva no journal. Se o cliente repete o mesmo
POST e `x-conversation-request-id` depois de mudar para B ou revogar autorização, o preHandler
acha a entrada e envia HTTP 200 com a resposta antiga antes de chegar ao gateway/ledger. Apenas
membership/chat são conferidos. A decisão documental atual e sua revisão nunca são consultadas.
Assim, o replay HTTP contorna a recusa de política já implementada no ledger.

Reprodução usa `createApi` real, autenticação sintética de desenvolvimento, catálogo/reader
sintéticos, gateway hospedado com fetch simulado, ledger de arquivo e journal em RAM preservado.
API, executor e ledger são recriados entre chamadas. Ambos os cenários resultaram em:
`firstStatus=200`, `replayStatus=200`, `reusedOriginalResponse=true`,
`authorizationCallsDuringReplay=0`, `providerCalls=1`. Não houve rede/IA/dados reais.
O journal em RAM não é apresentado como prova PostgreSQL; a causa independe do backend porque
o bypass ocorre antes do acesso ao controle de política.

Comando reproduzível, sem `.env`:

```powershell
node node_modules/vitest/vitest.mjs run --config .local/pilot-operations/full-review/vitest.repro.config.ts
```

**Regressão vermelha:** dois casos falharam exigindo que a resposta sob política alterada ou
revogada não seja entregue. Fontes/relatório exclusivos:
`.local/pilot-operations/full-review/journal-policy-repro.test.ts` e `journal-policy-red.json`.
Não editar ou sobrescrever esse relatório ao revalidar a correção.

**Contrato para o dono:** replay documental exige procedência/revisão correspondente e decisão
atual antes da entrega. Revalidar sem nova geração, sem outra reserva de gasto e sem mudar chave
para escapar de resultado incerto. Falta de contrato/procedência falha fechado. Manter consulta
literal do histórico autorizada conforme política, separada da entrega de análise corrente.
Promover os dois cenários à suíte mantida e adicionar recriação/persistência/restore da composição
quando disponível. Revalidar catálogo/versões e demais caminhos de replay documental afetados.

O gate local anterior continua sendo evidência da execução identificada, mas não cobre os dois
cenários novos. Este P1 bloqueia aprovação da candidata até correção pelo dono e revalidação.

**Contraprova independente em 11/11:** os dois cenários originais agora passam: primeira
resposta 200, replay 403, resposta original não entregue, uma consulta de autorização durante
o replay e uma execução simulada total. API/fábrica/ledger são recriados entre chamadas.
Relatório `journal-policy-current-r2-2026-11-11.json`; hashes e limites da captura em
`counterproof-sources-2026-11-11.json` e `counterproof-result-2026-11-11.json`, no diretório
privado acima. A captura inicial cobriu seis fontes sem mudança durante a execução; o hash de
`app/operation-control.ts` foi capturado depois, pois o caminho inicial estava incorreto.
Isso revalida o gatilho original; a revisão dos demais caminhos/procedência e da candidata
final ainda precisa terminar. Não substitui PostgreSQL, restore nem os gates globais.

## [P2] Conservar recibo até confirmar a leitura do corpo HTTP

**Arquivo:** `apps/web/App.tsx:634–638`, função `conversationFetch`, bloco `response.ok` que apaga
`pendingReceipts` antes de o chamador ler/validar o corpo. **Dono sugerido:** Documentos/UI,
em coordenação com Segurança por afetar a retentativa e o consumo.
SHA-256: `da5fd54e4649266d0df83a9c4861b907a7d24715a1f0f1261e581b9e0731ad4d`.
**Requisitos:** AC-5803/5809/5813 (Spec 058) e recuperação sem nova geração da Spec 071.

No caminho HTTP comum, `fetch` resolve assim que recebe os cabeçalhos. O código apaga o recibo
ao receber status 200, antes de `readQuestionResponse`/`response.json`. Se o corpo falha por
queda da conexão, `askQuestion` conserva a pergunta para retentar, mas o próximo envio recebe
outro UUID. O journal e os controles de consumo veem outra operação em vez de recuperar o
resultado já confirmado, permitindo duplicar o trabalho/registro e eventualmente consumo.
O ramo de progresso já aguarda o corpo; o ramo comum precisa da mesma garantia de confirmação.

Reprodução executa a função atual extraída de `App.tsx` e transpilada com o TypeScript instalado,
com os valores de escopo constantes e fetch simulado. Primeira resposta: cabeçalhos 200 e stream
de corpo interrompido; segunda chamada: mesmo endpoint/payload/escopo, outro identificador.
Não monta o navegador nem certifica um provedor; comprova o defeito na função atual sem copiá-la.
Resultado: `requests=2`, `sameRequestId=false`, `externalCalls=0`.

```powershell
node node_modules/vitest/vitest.mjs run --config .local/pilot-operations/full-review/vitest.receipt-repro.config.ts
```

**Regressão vermelha:** `client-receipt-repro.test.ts`, relatório `client-receipt-red.json`,
no mesmo diretório privado. Não sobrescrever a evidência ao corrigir. Conservar a chave enquanto
a entrega permanecer incerta; confirmar a resposta e o contrato antes de descartá-la. Cobrir
também falha de parsing/contrato e sucesso normal, sem transformar falha em reenvio automático.

**Contraprova independente em 11/11:** o cenário original de queda do corpo agora passa,
com duas chamadas e o mesmo identificador (`client-receipt-current-r2-2026-11-11.json`).
O P2 continua aberto por uma regressão concreta no novo validador de sucesso, abaixo.

### [P2] Validar os corpos reais ao concluir o recibo

**Arquivo:** `apps/web/App.tsx:618–625`, função local `confirmedBody`.
SHA-256 observado: `8b71b02aa82f63086b56201e1f052e7f67b1f231daef5264ee7dfc8bb809330c`.
O novo código espera `summary.message`, `name` na raiz do cadastro e
`documentVersionId` na confirmação. Os contratos reais enviam respectivamente
`summary.answer`, `condominium.name` e `{confirmed:true}`. Assim, respostas válidas conservam
o recibo indefinidamente; novo envio explícito com o mesmo payload/escopo reutiliza o journal
antigo, e a atualização da timeline não é solicitada nesse caminho.

Cinco contraprovas executam a função atual extraída, sem duplicar sua implementação. Pergunta
válida libera a chave e JSON incompleto a conserva; síntese em lote, cadastro e confirmação
válidos falham em liberar. Fontes: `client-receipt-contract-repro.test.ts` e
`vitest.receipt-contract-repro.config.ts`; relatório vermelho preservado:
`client-receipt-contract-red-2026-11-11.json` (três falhas, dois aprovados, zero rede externa).
Contratos conferidos em `document-batch-conversation-route.ts`, `create-api.ts:1407–1412`
e `create-api.ts:2244–2254`, além do consumidor `requestDocumentBatchSummary`.
**Dono:** Documentos/UI. Confrontar o validador com cada resposta real; conservar os testes de
corpo incerto e acrescentar sucesso normal, inclusive progresso, à suíte mantida.

**Segunda contraprova de contrato, ainda em 11/11:** o dono corrigiu os três nomes/campos.
Os sucessos de lote/cadastro/confirmação passaram. A ampliação mantém **duas falhas em sete
casos**, artefato `client-receipt-contract-r2-2026-11-11.json`: resposta válida só com `snapshot`
de `analysisOnly` não libera recibo; síntese com `answer/citations`, mas sem o restante do
AnswerPayload, libera recibo antes de o consumidor real `requestDocumentBatchSummary` recusá-la.
Dois envios explícitos desse corpo inválido recebem UUIDs diferentes, repetindo o gatilho
original do P2 no ramo documental. O teste usa o consumidor real, sem reconstruir seu validador.
O caso positivo de lote agora usa AnswerPayload completo; a fonte inicial e o vermelho anterior
foram preservados. Reutilizar o mesmo validador de transporte do consumidor evita divergência
entre “confirmado” no recibo e “incompleto” para a interface. Fontes alheias seguem com o dono.

**Gatilhos do P2 fechados em contraprova independente:** sete casos passaram em
`client-receipt-contract-green-2026-11-11.json`. O harness recebeu somente os imports reais
`isAnswerPayload/isDocumentSnapshot` agora usados pela função extraída; nenhuma assertiva foi
alterada. Corpo incompleto mantém UUID, snapshot válido e demais sucessos liberam o recibo.
Fonte/relatórios vermelhos anteriores preservados. O gatilho original de política do lote
também passou novamente em `journal-policy-current-r3-2026-11-11.json` (2/2).

## [P2] Conferir a posse do alvo antes do reset de restore no ensaio documental

**Arquivo:** `tests/isolated/document-lifecycle-postgres.test.ts`, helper `restore`, primeira
consulta `DROP SCHEMA IF EXISTS app CASCADE`. A URL é validada só como loopback/nome de restore;
o helper não confere sufixo da rodada, `current_database()` ou marcador persistente antes dessa
consulta. O runId é confrontado apenas com o source no início do cenário. Uma URL sintética de
outra rodada é aceita e pode apagar `app` de outro ensaio local. Isso viola o contrato de posse
e destino vazio da Spec 070; o restore operacional seguro em `scripts/pilot-recovery.ts` não usa DROP.

Contraprova extrai e executa o helper atual com Pool/CLI simulados: alvo com outro sufixo e sem
marcador recebe DROP antes de qualquer conferência. **Nenhum SQL real foi executado** e nenhum
banco existente foi tocado. Artefatos `document-restore-guard-repro.test.ts`,
`vitest.document-restore-guard.config.ts` e vermelho `document-restore-guard-red-2026-11-11.json`.
O wrapper desta frente entrega dois alvos próprios novos; o achado é a ausência da negativa no
helper e não invalida a execução positiva identificada do dono. **Dono:** Documentos, preservando
o runner de Infraestrutura. Preferir destino novo/vazio por restauração. Qualquer reset específico
de fixture precisa estar delimitado ao banco próprio da rodada e conferir URL/ID/marcador antes
de efeitos; acrescentar negativas de outro sufixo e marcador ausente/divergente.

**Gatilho fechado após refatoração do dono:** o helper destrutivo foi retirado. O novo
`tests/fixtures/document-lifecycle-restore.ts` usa `restoreLocalApplication`, destino vazio
e novo por repetição; vincula URLs/diretório/runId antes de conectar e confere marcador/posse.
Sete negativas/checagens independentes passaram em
`document-restore-guard-green-2026-11-11.json`: outra rodada, marcador ausente, finalidade/política
erradas, destino ocupado, constructor com URL divergente e ausência de DROP no caminho atual.
Os mocks só executaram SELECT; zero SQL real/transporte. Contraprova foi adaptada à nova API
exportada, com o ensaio original preservado. A execução PostgreSQL positiva da nova composição
e os P1 de conteúdo/locks continuam com o dono; o verde das guardas não os dispensa.

## Cobertura da revisão

O mapa por arquivo foi conciliado, com zero leitura pendente e escopos delimitados no relatório
de consolidação acima; isso não é aprovação independente global. A revisão
cruzada de Documentos foi conferida por hash para 45 arquivos operacionais; sua independência
refere-se à autoria desta rodada, sem inferir a autoria de mudanças preexistentes. Revisões
anteriores são reaproveitadas somente para conteúdo idêntico. Documentos revisa autoria de
Infraestrutura, Segurança revisa autoria documental e Infraestrutura cobre Segurança e áreas
preexistentes de outros autores. O manifesto distingue autorrevisão de revisão cruzada.
