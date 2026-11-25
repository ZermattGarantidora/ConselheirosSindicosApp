# Matriz de rastreabilidade — Specs 001–078

### Runtime persistente autorizado — Spec 078

| Requisito | Aceitação | Implementação e prova |
|---|---|---|
| RQ-7801 | AC-7801/7802 | `security/persistent-execution.ts`: manifesto estrito, hash canônico, contas, expiração, modelo e referências de revisão; `persistent-execution.test.ts`. |
| RQ-7802 | AC-7803/7804/7805 | Composição de `createApiOperationControl` com store PostgreSQL, consulta da política corrente e guardas da Spec 072; testes de revogação, replay, duplicação e resultado incerto. Migration 044 preparada, sem aplicação remota presumida. |
| RQ-7803 | AC-7806/7807 | `persistent-database.ts`, preflight somente leitura e `server.ts`; `persistent-startup.test.ts` verifica fechamento dos pools, ausência de listener e de fallback. TLS remoto verifica certificado. |
| RQ-7804 | AC-7808/7809 | Stores PostgreSQL preservados e guardas documentais mantidas; comando `test:persistent-runtime` com relatórios exclusivos. Runbook `persistent-runtime-2026-11-25.md`; provas remotas e aprovação registradas separadamente. |

### Render contratado e domínios — 25/11/2026

| Requisito | Aceitação | Implementação e prova |
|---|---|---|
| RQ-2503 / RQ-6905 / RQ-7001 | AC-6908 / AC-7001 | `render.yaml`, `render.pilot.yaml`, `pilot-preparation.ts`: espelham web pago `1c-2g`, Oregon, Node 24, publicação manual, encerramento de 300 s e perfil persistente sem segundo web. `pilot-operations.test.ts` confere nomes/planos/região idênticos e mantém guardas negativas. |
| RQ-6907 | AC-6909 | `main.ts` e `server-shutdown.ts`: SIGTERM/SIGINT fecham Fastify uma vez e aguardam hooks; falha usa código fixo. `server-shutdown.test.ts` cobre sinais repetidos, espera, limpeza e falhas síncronas/assíncronas. |
| RQ-6908 | AC-6910 | `canonical-origin.ts` e `server.ts`: origem HTTPS fixa, aliases explícitos, 308, caminho/query e health preservados; configuração inválida falha antes do banco. `canonical-origin.test.ts` e `server.test.ts` cobrem Host/Forwarded, request-targets hostis, validação e atendimento real das rotas. |

`pnpm run test:render` tem cache/cobertura próprios e `envDir:false`; 118 testes aprovados,
cobertura 100/99,41/100/100 (statements/branches/functions/lines). Operações: 144 testes
aprovados em execução separada. Builds isolados e limites de execução estão em
`docs/reviews/2026-11-25-render-paid.md`. Não substitui check global, review independente,
CI, jornada persistente, integração Supabase ou DNS/TLS. Painel: auto-deploy desligado e
`alvitra.app`/`www` com DNS Wix aplicado, Google DNS conferido e domínio `Verified` no Render;
última emissão TLS com `Certificate Error`, página efetiva pendente. Sem worker novo ou deploy.

### Estresse documental e conflitos inéditos — 24/11/2026

| Requisito | Aceitação | Implementação e prova |
|---|---|---|
| RQ-7701/7702 | AC-7701/7702 | `stress-fixture.ts`, `stress-pdf.py` e `dense-stress.test.ts`: 350 páginas, 25.200 registros, 40 casos novos, conflitos reais/aparentes, ausência e segurança. |
| RQ-7703 | AC-7703/7704 | `stress-run.ts` reutiliza ingestão/HTTP, snapshots, marcadores e recibos duráveis; oracle não entra no gateway. |
| RQ-7704/7705 | AC-7705/7706/7707 | Auditoria por hash, métricas pareadas, preservação de falhas e formulário humano pendente; resultados e gates registrados na Spec 077. |
| RQ-7706 | AC-7708/7709/7710 | `documented-conflict.ts`, contrato interno e caso de uso: registro/campo/pendência, valores e citações por posição, sem reclassificar tarefa/modelo; testes `documented-conflict.test.ts` e regressão HTTP/replay em `documented-conflict.e2e.test.ts`. Baseline e mesmos 40 casos preservados. |
| RQ-7707 | AC-7711 | `answer-performance.ts`, processo/gateway Codex, caso de uso e replay: relógio monotônico, etapas/marcos sem conteúdo, observador protegido e recibos duráveis. `answer-performance.test.ts`, `codex-process.test.ts`, `dense-durability.test.ts` e HTTP. |
| RQ-7708/7709 | AC-7712/7713 | `codex-reference-layout.ts`: bijeção por chamada, schema equivalente e cwd genérico vazio, com schema privado por geração; opt-in fixado no manifest. `codex-cache-layout.test.ts`, `codex-cache-context.test.ts`, `local-test-documents.test.ts` e `codex-cache-layout.e2e.test.ts`; repetição dos mesmos 40 pares condicionada a zero regressão de qualidade. |
| RQ-7708/7709 | AC-7714 | Decoder recusa referência interna no corpo e usa reparo; `question-document-citations.ts` reconhece negativa de comprovação de aprovação sem remover guardas. Testes de codec, HTTP e `question-document-citations.test.ts`; replay r3 403 → corretiva 200 sem inferência; r3 preservada como reprovada. |

Rodada `2026-11-24-stress-r1`: 80 respostas auditadas, 100 recibos completos e zero consumo
desconhecido. Sol 34/40 e híbrido 36/40 factuais/completos, com seis/quatro falhas de entrega
na validação. Fontes exigidas recuperadas nos 40 casos de cada braço. Software: 2.903 unitários,
273 E2E, cobertura 85,46/81,89/90,84/87,32 e alinhamento de 77 specs aprovados.
[Resultados e limites](../specs/077-estresse-documental-e-conflitos-ineditos/results.md),
[revisão do delta](../reviews/2026-11-24-dense-stress.md); revisão humana/independente pendente.

Continuação `2026-11-24-stress-conflicts-r2`, RQ-7706: mesma matriz, PDFs, oracle, modelos
iniciais e fontes recuperadas; replay das 80 primeiras saídas antigas sem inferência passa.
Nova rodada: **40/40 completos por braço**, 80 recibos e zero reparos/consumo desconhecido;
equivalência USD 1,3186968 Sol e 0,9493181 híbrido (28,01% menor), médias 15,671/15,604 s.
2.946 unitários, 274 E2E, cobertura 85,56/81,98/91,01/87,40, alinhamento das 77 specs
e scanner integral aprovados.
[Resultado da correção](../specs/077-estresse-documental-e-conflitos-ineditos/results-conflicts-r2.md)
e [revisão do delta](../reviews/2026-11-24-novel-conflicts.md); revisão humana/independente pendente.

Instrumentação/cache: r3 reprovada e preservada; r4 com 40/40 por braço na revisão técnica
por IA, automático 40/40 e 38/40 preservado, desacordos justificados. 83 recibos conhecidos,
médias 13,115/13,628 s e equivalência USD 1,0877432/0,84342878. Cache 28,23%/25,17%; P95
híbrido piorou a 25,107 s por reparos e o candidato permanece opt-in. 2.979 unitários, 275 E2E,
cobertura 85,67/81,99/91,10/87,50 aprovados. [Resultados](../specs/077-estresse-documental-e-conflitos-ineditos/results-cache-r4.md)
e [revisão](../reviews/2026-11-24-latency-cache.md); humana/independente pendentes.

### Recuperação e conferência integral — 23–24/11/2026

| Requisito | Aceitação | Implementação e prova |
|---|---|---|
| RQ-7601 | AC-7601 | `exact-identifiers.ts` e `text-retrieval.ts`: ID com fronteiras, busca complementar limitada e fontes próprias antes de referências; consulta direta preserva versões/ressalvas relacionadas. `exact-record-retrieval.test.ts`. |
| RQ-7602/7603 | AC-7602/7603/7604 | `integral-document-sum.ts`, callback interno da API e `answer-use-case.ts`: catálogo/leitor autorizados, centavos, recibo integral, resumo contextual e revalidação; prova fabricada/total alterado/tenant/versão/página/linha inválidos recusados. `integral-document-sum.test.ts` e E2E denso. |
| RQ-7602/7603 | AC-7603/7609 | `question-document-citations.ts`, `findValidatedAnswer` e recibo HTTP: interpretação persistida permite comparação de minuta; mudanças nas páginas (inclusive não citadas no total), estado e autorização invalidam replay. `question-document-citations.test.ts`, `question-source-replay.e2e.test.ts` e E2E denso. |
| RQ-7604 | AC-7605 | `assessment-v2.ts` conserva o check estrito e valida equivalências e recibo contra oracle independente; `varied.ts` acrescenta 24 casos inéditos com 12 páginas narrativas. |
| RQ-7605/7606 | AC-7606/7607/7608 | `compare.ts`, `attempts.ts`, `progress.ts`, `scan.ts` e `render-scan.py`: matriz pareada, snapshot, checkpoints, recibos por envio e reuso sem inferência, OCR real local separado de mocks, digitalização sem texto e QA visual. `dense-durability.test.ts`. Resultado e revisão da Spec 076. |
| RQ-7607 | AC-7610/7611/7612 | `record-note-conflict.ts`, detector/caso de uso e contrato de tarefa: mesma origem, ID completo, valores distintos e nota não conciliada; modo estrito e duas evidências no contrato inicial/reparo; cobertura por associação citada. `record-note-conflict.test.ts` e regressões HTTP 017/027/031 no E2E denso. |

Validação local de 23/11: 2.877 unitários, 273 E2E, cobertura 85,40/81,83/90,78/87,28
(statements/branches/functions/lines), replay de 120 casos sem inferência, tipos/build,
alinhamento e scanner aprovados. [Resultados e limites](../specs/076-recuperacao-e-conferencia-integral/results.md)
e [revisão do autor](../reviews/2026-11-23-dense-integral-comparison.md); revisão humana pendente.

Continuação de 24/11: 2.899 unitários, 273 E2E, cobertura 85,45/81,88/90,84/87,32.
Replay de seis saídas antigas sem inferência e nova comparação completa: 60/60 factuais e
completas por braço, três conflitos na primeira tentativa; 120 recibos completos, sem reparos.
[Resultados e limites](../specs/076-recuperacao-e-conferencia-integral/results-2026-11-24.md)
e [revisão do delta](../reviews/2026-11-24-dense-conflicts.md); aprovação humana/independente pendente.

### Leitura documental densa — 23/11/2026

| Requisito | Aceitação | Implementação e prova |
|---|---|---|
| RQ-7501/7503 | AC-7501/7503 | `evals/dense-documents/corpus.ts` e `oracle.ts`: 120 páginas, 6.000 registros e 32 casos; fontes/gabaritos anteriores ao PDF, notas, conflitos, soma e ausência. `dense-documents.test.ts`. |
| RQ-7502 | AC-7502 | `prepareDocument` reutiliza upload/extração integrais; minuta conferida no original privado sem mudar seu estado pendente. QA com Poppler/Python e recibos por original. |
| RQ-7504/7506 | AC-7505/7506 | `run.ts`/`replay.ts`: snapshot, checkpoints e Sol local; gabarito não enviado, fontes escopadas, canário estrangeiro e ataque em nota. Plano sem inferência testado. |
| RQ-7505/7506 | AC-7504/7507/7508 | `assessment.ts`: cobertura de fontes/fatos separada de revisão; remoção de fonte, troca de valor e ausência de citação falham no teste. Relatório e auditoria em `docs/specs/075-leitura-documental-densa/results.md`. |


### Medição de custo e comparação pareada — 23/11/2026

| Requisito | Aceitação | Implementação e prova |
|---|---|---|
| RQ-7401 | AC-7401/7402 | `usage-accounting.ts`: tarifa USD versionada, leitura/escrita 30m/12h, raciocínio sem duplicação e consumo desconhecido explícito. `usage-accounting.test.ts`. |
| RQ-7402 | AC-7403/7404 | Gateway OpenAI preserva classe/telemetria dos erros; caso de uso guarda todas as tentativas no evento privado existente. Reparo e JSON entregue à persistência SQL com escopo testados, sem migration. |
| RQ-7403/7404 | AC-7405/7406 | `evals:cost-30`, amostra fixa 30 cenários/36 turnos, Sol low versus híbrido Luna high/Sol low; snapshot, ordem alternada e checkpoints do runner existente. `cost-30-comparison.test.ts`. |
| RQ-7405/7406 | AC-7407/7408 | `cost-30-assessment.ts`: revisão vinculada por hash, aprovação técnica separada da mecânica/especializada, custo de falhas no numerador e latência incluindo reparos. `cost-30-assessment.test.ts`. |
| RQ-7401–7406 | AC-7409 | Gates e resultados da execução real em `docs/specs/074-medicao-custo-e-comparacao-30/results.md`; sem aprovação de merge ou produção. |


### Homologação real local e preservação de histórico — 18/11/2026

| Requisito | Aceitação | Implementação e prova |
|---|---|---|
| RQ-7322 | AC-7346 | `codex-authoring-model.ts`, `local-whisper-transcriber.ts`, `prepare-authoring-local-asr.ps1`, ADR 0046: plano ChatGPT e ASR offline, hashes/licenças, sem ferramentas/chave/fallback pago/startup positivo. `local-authoring-models.test.ts`. |
| RQ-7322 | AC-7347 | `evals:authoring:local`, `run-local.ts`, `bindExecutionInputs`, `local-storage.ts`: 24 casos com redação/conferência reais; ASR/percursos medidos separadamente; recibos, retomada e origem da execução preservados em revisão de rubrica. Sem aprovação humana fabricada. |
| RQ-7323 | AC-7348 | `authoring-artifacts.ts`, `postgres-audio-storage.ts`: payloads purgados com mensagens públicas intactas e recibos internos ocultos. Unitários, PostgreSQL local, restauração e projeção pública. Proposta operacional permanece disabled. |

Comando novo registrado no package.json/README/AGENTS. Relatório:
`docs/reviews/2026-11-18-authoring-real-local.md`. A prova técnica local não aprova política,
qualidade humana/especializada, CI de integração ou liberação de dados reais.

### Pacote de homologação e proposta operacional — 17/11/2026

| Requisito | Aceitação | Implementação e prova |
|---|---|---|
| RQ-7320 | AC-7342/7343 | `evals/authoring-homologation/corpus.ts`, `protocol.ts` e comando offline: 24 casos com fatos/proibições/fontes, hashes, entradas sem gabarito, formulário pendente e agregação sem aprovação simulada. `authoring-homologation.test.ts`. |
| RQ-7320 | AC-7344 | `generate-authoring-homologation-audio.ps1`, `audio.ts`/`assemble-audio.ts`: voz pt-BR instalada, dez WAVs locais com tempos/sha, conferência prévia do corpus, BOM e WAVEFORMATEX local normalizados sem alterar a validação de produção. Casos incerto/multifalante não recebem áudio falso. |
| RQ-7321 | AC-7345 | Proposta JSON/Markdown disabled, dez decisões pendentes, orçamento externo zero; validação contra limites implementados. `rehearsal.ts` exercita oito situações com artefatos em memória/cofres locais reais, sem mudar política. |

Comandos `evals:authoring:homologation` e `evals:authoring:homologation:audio` em package.json,
README e AGENTS. CI localmente preparado para pacote sintético/artefatos, sem execução remota.
Referência: `docs/reviews/2026-11-17-authoring-homologation-local.md`. Qualidade real, revisão
humana, política/custódia/histórico e liberação continuam pendentes.

Estado consolidado da Spec 073: [matriz de aceitação](../specs/073-agente-documental-e-pdf/matriz-aceitacao.md).
As continuações históricas abaixo não representam novas pendências quando a matriz registra prova posterior.

### Proatividade do original e demonstração — 17/11/2026

| Requisito | Aceitação | Implementação e prova |
|---|---|---|
| RQ-7318 / RQ-7301/7303 | AC-7338/7339 | Hook sintético após síntese, `document-authoring.ts`, contrato `original-document-improvements.ts`: original completo e igual ao analisado, espaços/quebras sem mudar palavras/pontuação/números/ordem, identidade estável, `unchanged`, recusa e claims. Unitários e `original-document-improvements.e2e.test.ts`. |
| RQ-7318 / RQ-7315 | AC-7340 | Revalidação de fonte/contexto, concorrência, fonte revogada durante avaliação e falha incerta; erro operacional preserva síntese válida. UI consulta sem gerar e não oferece proposta recusada. |
| RQ-7319 | AC-7341 | `verify-original-authoring-browser.ts` com API/componentes reais e modelos simulados: perda de resposta, oferta, aceite/recusa, edição, confirmação/PDF, recuperação, chat e mobile. Projeção do journal não atribui recibos automáticos ao usuário; E2E conserva oferta pública e recibo interno. Matriz única de todos os ACs; documentação consolidada. |

Comandos `test:authoring:originals` e `test:authoring:originals:browser` em package.json/README/AGENTS;
sem dependência, serviço, `.env`, provedor, chamada paga ou ativação real. Evidências em
`docs/reviews/2026-11-17-original-document-authoring-local.md`. Qualidade de IA, política/custódia,
integração no destino, revisão independente e CI de merge continuam pendentes.

Esta matriz preserva registros de versões, datas e baterias diferentes. Expressões de
pendência nas entradas antigas descrevem aquela rodada, sem desfazer evidência posterior.
O fechamento local vigente desta preparação está em **Fechamento local de 11/11 — janela
03/r4** e **Infraestrutura — rastreabilidade final de 11/11**, ao final do arquivo. Nenhuma
entrada aprova implicitamente o branch inteiro, CI, política, fornecedor ou uso real.

## Spec 044 — Contagem de arquivos e área exclusiva de balancetes — 12/11/2026

| Requisito | Aceitação | Implementação e evidência |
|---|---|---|
| RQ-4404 — contagem em destaque | AC-4405 | `DocumentLibrary.tsx`, `document-library.test.ts`: uma convenção mostra 1 de 1, sem percentual fora dos detalhes fechados e sem barra; mantém fórmula, estados impeditivos e orientação sem anexos. Cinco regressões falharam antes da mudança de interface. |
| RQ-4405 — somente balancetes na área | AC-4408 | `document-identification.ts`, `document-processing.ts`, catálogo PostgreSQL e `create-api.ts`: mesma classificação por cabeçalhos limitados do conteúdo já extraído, com tenant/versão e sem nomes de arquivo como autoridade. Testes de cabeçalho, prosa, extrato, pacote conflitante, metadado inicial incorreto e campos privados omitidos. |
| RQ-4403/4405 — acesso, filtros e isolamento | AC-4404/4408 | `App.tsx`, `DocumentLibrary.tsx`, `document-library.ts`, `styles.css`: acesso direto, área e contagem próprias, categoria separada, busca e estado vazio específico. E2E sintético envia PDFs pela API e verifica catálogo até apresentação; outro tenant e acesso negado continuam excluídos. |

Inspeção em prévia sintética no navegador: desktop claro, 320 px escuro, detalhes fechados/abertos,
busca e troca de área; convenção e extrato permanecem fora de Balancetes e vigência em conflito
permanece visível. Gates e limites em `docs/reviews/2026-11-12-biblioteca-balancetes.md`.

## PDFs de 300 páginas — Spec 067 — 2026-11-05

| Requisito | Aceitação | Implementação e evidência |
|---|---|---|
| RQ-6701 — leitura integral e fontes até a última página | AC-6701 | `tests/fixtures/full-page-documents.ts`; `tests/e2e/long-pdf-ingestion.e2e.test.ts`: upload HTTP, original byte a byte, 300 páginas reconstruídas e 18 consultas verificáveis, com isolamento. |
| RQ-6702 — identificação conservadora em todas as páginas | AC-6702 | `document-identification.ts`; `document-processing.ts`; testes unitários de identificação e E2E: sinal na página 300 e conflito sem escolher o primeiro tipo. |
| RQ-6703 — vetores reutilizados e agrupamento | AC-6703 | `in-memory-scoped-retrieval.ts`; `local-embedding.ts`; `document-analysis-reader.ts`; testes de permissão, invalidação, falha, remoção e equivalência exata do vetor anterior. |
| RQ-6704 — lotes atômicos limitados | AC-6704 | `persist-document-pages.ts`; `postgres-document-processing-repository.ts`; `persist-document-pages.test.ts`; `postgres-document-adapters.test.ts`; `persisted-processing.test.ts`; integração Neon de 300 páginas sob RLS, revisão, vetores multimodais e rollback. |
| RQ-6705 — falha segura e medição | AC-6705, AC-6706 | E2E da página 300 ilegível e de 501 páginas; `evals/long-pdf/`; `pnpm run evals:pdf-300`; `reports/long-pdf/latest.json`. |

Decisão técnica: ADR 0040. Resultado e limites dos gates em
`docs/specs/067-pdfs-de-300-paginas/results-2026-11-05.md`. A validação é local e sintética;
não certifica OCR, semântica de modelo, dados reais ou capacidade do ambiente publicado.

## Conferência de nome documental e sufixo genérico de arquivo — Spec 037 — 2026-11-03

| Requisito | Aceitação | Implementação e evidência |
|---|---|---|
| RQ-3701 — identificação explícita e prudente | AC-3702 | `document-condominium-check.ts` ignora somente o sufixo “Preenchida” no título do arquivo; cabeçalho com o nome cadastrado não abre uma pendência falsa. `document-condominium-check.test.ts` cobre o nome do Jardim do Horizonte e mantém um controle para nome adicional significativo (“Norte”). |

Validação: regressão do comparador 24/24; fluxo E2E existente de confirmação 14/14; formatação,
lint, typecheck, scanner de segredos e alinhamento das 62 specs aprovados. `evals` aprovou 20/20;
`evals:documentary` aprovou os 50 casos determinísticos, mantendo 50 casos semânticos pendentes
de revisão humana/modelo.

A suíte global com cobertura terminou com 1.774 testes aprovados e dois reprovados em arquivos de
interface não alterados por esta fatia (`conversational-setup-ui.test.ts` e `chat-turn-ui.test.ts`).
Como a suíte não concluiu, o piso global de cobertura não foi confirmado e o gate `check` permanece
parcial. O Corepack não conseguiu baixar o pnpm fixado por falta de acesso ao registro; os comandos
locais equivalentes foram executados diretamente.

## Abertura direta das conversas do condomínio atual — Spec 044 — 2026-10-29

| Requisito | Aceitação | Implementação e evidência |
|---|---|---|
| RQ-4401 — iniciar a lateral no contexto ativo | AC-4401 e AC-4407 | `App.tsx` seleciona `context?.condominiumId` ao abrir a lateral. Reaberturas usam o contexto atual e “Todos os condomínios” continua mostrando a carteira explicitamente, sem trocar o condomínio. Sem contexto, a carteira permanece disponível. `chat-sidebar-ui.test.ts` verifica o vínculo da abertura ao contexto e o retorno à carteira, sem chamada de troca ou recarga de histórico. |

Validação focada: 50/50 testes em sete arquivos aprovados, incluindo navegação entre condomínios,
histórico, reentrada, biblioteca e foco. Formatação dos arquivos alterados, alinhamento das
57 specs, typecheck global, lint dos arquivos alterados, build web e diff sem erros de whitespace
aprovados. O gate geral de formatação encontrou
`tests/unit/document-availability.test.ts`, arquivo fora desta fatia; ele não foi alterado.

O ajuste muda somente o destino inicial da lateral, sem regra de domínio, persistência, API,
prompt, modelo ou recuperação documental. Não exige nova bateria de evals ou integração de
banco. A suíte completa, já registrada com falhas na rodada anterior, não foi repetida para
esta mudança de navegação; não há declaração de aprovação global ou de merge. O diff desta
fatia foi revisado integralmente contra o estado inicial, preservando as mudanças anteriores
e as alterações simultâneas de outras funcionalidades.

## Respostas diretas e apresentação conjunta — Spec 057

| Requisito | Aceitação | Implementação e evidência |
|---|---|---|
| RQ-5701 — análise na fala | AC-5701/5702/5705 | `App.tsx` mostra a fala gerada e suas fontes, sem painel ou relatório calculado adicional. Conferências continuam internas em `financial-review.ts`; regressões de renderização e escape em `document-analysis-presentation.test.ts` e `document-analysis-ui.test.ts`, fontes internas em `financial-review.test.ts`. |
| RQ-5702 — fontes agrupadas | AC-5703/5703a/5705 | Uma entrada por documento/versão, com páginas e trechos individuais; escopo e disponibilidade da fonte continuam separados. Fonte histórica indisponível não é descrita como excluída sem confirmação. `document-analysis-presentation.test.ts` verifica expansão por páginas, rótulos e callbacks. |
| RQ-5703 — apresentação conjunta | AC-5704 | `document-upload-batch.ts` finaliza leituras antes da pergunta; `App.tsx` solicita somente a síntese contextual do lote. `requestDocumentConversationReply` usa a mesma síntese para documento autorizado pronto. Testes HTTP de lote, confirmação, falha e descarte de resultado tardio preservados. |
| RQ-5704 — redação ajustada pelo usuário | AC-5706 | Prompt v27: análise do conjunto, comentário natural, solução proporcional e pergunta específica; regressões em `prompt-catalog.test.ts`. |
| RQ-5705 — avisos essenciais | AC-5710/5711 | `ChatDocumentAttachments.tsx` retira o aviso repetido de arquivo pronto; erro da conversa vira linha operacional, sem cartão. Rota e gateway registram categoria, código fixo de causa, etapa, latência e marcadores de protocolo, sem conteúdo. `chat-document-presentation.test.ts` preserva progresso, pendências e falhas; `document-condominium-confirmation.test.ts` verifica falha sem relatório ou fala inventada. |
| RQ-5705 — transporte íntegro | AC-5712 | `generation-limits.ts` alinha os prazos HTTP ao teto do gateway. O cliente recusa JSON, fala e snapshot incompletos; testes com relógio simulado cobrem resposta após 60 s, falha de rede, timeout e ausência de nova geração após snapshot inválido. |
| RQ-5703 — revisão humana sem perda da fala | AC-5713 | `answer-risk-policy.ts` compartilha a política de alto risco entre perguntas e síntese. Regressões em `document-batch-conversation.test.ts` preservam texto, citações e uma geração, recusando metadados inválidos ou contraditórios. |
| RQ-5703 — síntese integral autorizada | AC-5707/5707a/5708/5709 | `document-batch-conversation.ts`, rota própria e gateway Codex restrito pelo servidor; leitura completa, Unicode, limites, conteúdo hostil, fonte alheia, falha e revalidação em `document-batch-conversation.test.ts`. Callback da extração transmite contagem/completude ao catálogo de demonstração, validado no E2E. Histórico anterior e cláusulas da mesma página preservam provas distintas. ADR 0036 registra a autorização específica. |

Spec 057, ajuste para análise somente na conversa: 1.599 testes/164 arquivos aprovados;
cobertura de statements 92,26%, branches 88,14%, funções 97,05% e linhas 93,92%. As checagens
de código, build web e gate de 58 specs passaram. A confirmação final da interface teve 40
testes aprovados. Não houve reinício da API ou nova chamada a modelo; resultados e limites em
[revisão local](../reviews/2026-10-29-analise-somente-na-conversa.md).

Rodada anterior da Spec 057: 1.569 testes/161 arquivos aprovados; cobertura de statements 92,20%,
branches 88,08%, funções 97,05% e linhas 93,87%. Formato, lint, tipagem, visão, segredos, build
web e evals determinísticos existentes (20 + 50) aprovados. Três smokes no Codex autorizado
usaram somente material fictício; R3 teve dois parágrafos, encaminhamento e pergunta específica.
[Resultados e limites](../specs/057-respostas-diretas-e-analise-conjunta/observed-results-2026-10-29.md)
e [revisão local](../reviews/2026-10-29-respostas-diretas.md). Não houve merge ou publicação.

## Anexos fora da caixa durante o envio — Spec 020 — 2026-10-29

| Requisito | Aceitação | Implementação e evidência |
|---|---|---|
| RQ-2007 — liberar a caixa de mensagem ao confirmar o envio | AC-2011 | `App.tsx` transmite o estado de envio a `PendingDocumentAttachments`, que oculta a seleção durante envio e acompanhamento da leitura. O progresso continua em `DocumentBatchProgress`. A seleção conserva arquivos não recebidos para reapresentá-los após falha e mantém a remoção existente dos originais aceitos. Três regressões de renderização em `document-upload-batch.test.ts` cobrem um arquivo, lote e retorno após falha parcial; `chat-document-upload-ui.test.ts` verifica o vínculo com o estado real do envio. |

Validação focada: 44/44 testes em oito arquivos aprovados, incluindo os E2E de envio individual
e em lote, confirmação de condomínio, foco do compositor e tipografia da conversa. Build web
e alinhamento das 56 specs aprovados. O teste novo recebeu tipagem explícita dos estados de
progresso após a checagem identificar seu alargamento indevido para `string`.

Após esse ajuste, typecheck, lint e formatação geral aprovados. A suíte completa com cobertura,
relatório em falha e oito workers terminou com 1.410 aprovados, 38 reprovados e 26 ignorados
em 1.474 testes/156 arquivos. Houve timeouts em diversos fluxos de API, segurança e documentos,
inclusive nos E2E de envio que passaram na execução focada, e no hook de
`conversation-evals.test.ts`. Três asserções falharam fora desta fatia: duas em
`answer-synthesis-quality.test.ts` (responsabilidade/fundo de reserva e definições/tarefas) e uma
em `long-conversation-regressions.test.ts` (tópico omitido). Nenhuma dessas asserções ou limites
foi alterada. Cobertura: statements 91,92%, branches 87,40%, functions 96,75% e lines 93,63%;
todos acima do piso de 80%. O gate global não está aprovado e não há autorização de merge.
O scanner de segredos foi executado, mas ficou inconclusivo por `ENOENT` ao ler um módulo
temporário do Vitest removido entre a listagem e a leitura; esse gate não foi declarado aprovado.

O ajuste reutiliza o fluxo existente: não altera recepção, persistência, autorização, recuperação
de falha, sequência de uploads, prompt ou chamadas de IA. Não exige nova bateria de evals nem
integração de banco. A validação de apresentação usa renderização dos componentes reais, sem
declarar conferência visual no navegador. O diff completo desta fatia foi revisado em relação
ao estado inicial do workspace; alterações anteriores foram preservadas.

## Tipografia uniforme nas falas da Alvitra — Spec 024 — 2026-10-29

| Requisito | Aceitação | Implementação e evidência |
|---|---|---|
| RQ-2412 — manter a tipografia grande em toda fala | AC-2414 | `styles.css` compartilha fonte editorial, `clamp(21px, 3vw, 28px)` e entrelinha `1.42` entre os parágrafos da assistente e suas orientações. Abrange configuração, respostas atuais e históricas, falas documentais e confirmação de condomínio; preserva a tipografia de controles e relatórios. `chat-turn-ui.test.ts` verifica a regra compartilhada e impede a redução separada das respostas; `conversational-setup-ui.test.ts` mantém a regressão da configuração. |

Validação focada: 18/18 testes em cinco arquivos aprovados. Build web, formatação geral, lint,
typecheck, diff sem erros de whitespace e alinhamento das 56 specs aprovados. O Corepack tentou
baixar o pnpm, mas a rede do sandbox estava indisponível; os comandos equivalentes usaram as
dependências locais instaladas. Os testes usaram TEMP/TMP em `.vitest-temp`, pois o diretório
temporário isolado do sandbox impediu a renomeação dos módulos do Vitest.

A primeira execução completa aprovou 1.463/1.466 testes, com timeout no lote de PDFs e falhas
de asserção em `conversation-evals.test.ts` (28 turnos aprovados em vez de 29) e
`long-conversation-regressions.test.ts` (síntese recusada por tópico omitido). A execução com
relatório de cobertura mesmo em falha e quatro workers aprovou 1.462/1.466, mantendo essas
falhas e acrescentando timeout em `conversation-comparison.test.ts`. Cobertura: statements
92,14%, branches 87,81%, functions 96,96% e lines 93,81%; todos acima de 80%. As falhas são de
suítes fora dos arquivos desta fatia, cujas asserções e limites não foram alterados. Não houve
mudança de prompt, parsing ou recuperação que exigisse nova bateria de IA. Scanner de segredos
aprovado após a execução.

A conferência visual não foi concluída: o controle de interface interrompeu o acesso à janela
Chrome por não conseguir validar sua URL no Windows. Nenhuma nova tentativa de automação foi
feita após essa interrupção. A implementação e o diff desta fatia foram revisados, preservando
as alterações existentes no workspace. A validação global permanece sujeita às falhas registradas
na suíte completa; este ajuste não autoriza merge ou publicação.

## Azul principal solicitado — Spec 024 — 2026-10-27

| Requisito | Aceitação | Implementação e evidência |
|---|---|---|
| RQ-2411 — azul principal `#0A1330` | AC-2413 | `styles.css` centraliza a base em `--alvitra-primary`, separa os preenchimentos dos acentos legíveis no modo escuro e deriva hover, sombras e foco da paleta. Marca, botões e mensagens compartilham os tokens; ícones e progresso deixam de usar o azul anterior fixo. |

Validação: 52/52 testes existentes de interface em oito arquivos aprovados; as asserções de
cores em `chat-single-page.test.ts` e `conversational-setup-ui.test.ts` passam a usar os tokens
da nova paleta, preservando dimensões e apresentação. Build web, formatação dos testes alterados,
lint, typecheck, diff sem erros de whitespace e gate de 50 specs aprovados. Conferência visual
na janela estreita do navegador validou os modos claro e escuro e o foco visível do seletor;
a preferência clara anterior foi restaurada. A alteração foi carregada pelo Vite, sem reiniciar
a API. Não há alteração de regra de domínio ou novo teste de lógica para esta mudança de CSS.
O diff desta fatia foi revisto integralmente, preservando as demais alterações do workspace.

## Documentos essenciais para a ajuda local — Specs 020, 024 e 026 — 2026-10-27

| Requisito | Aceitação | Implementação e evidência |
|---|---|---|
| Spec 020, RQ-2001 e Spec 024, RQ-2403 — explicar a importância do envio | AC-2001 e AC-2404 | `setup-message.ts` e a instrução de conclusão em `prompt-catalog.ts` apresentam documentos essenciais, dificuldade de ajudar com precisão sem eles e convite ao envio. Regressões em `setup-message.test.ts`, `conversational-setup-ui.test.ts` e `prompt-catalog.test.ts` recusam a oferta antiga de adiamento. |
| Spec 026, RQ-2603 — explicar a lacuna documental | AC-2608 | A orientação geral do prompt reforça a necessidade do documento pertinente e mantém ajuda geral enquanto aguarda a fonte; não exige upload para conversar nem permite conclusão local sem evidência. |

A instrução explícita do usuário substitui a comunicação “não precisa enviar” e a oferta
espontânea de adiamento. As asserções antigas foram atualizadas para o comportamento solicitado,
preservando as verificações de cadastro sem etapa obrigatória de anexos, isolamento, evidências
e contratos. O prompt completo atualizado foi apresentado por link antes da aplicação da
revisão `answer-prompt-v26`; não há novo provedor, dependência ou chamada adicional no produto.

Validação focada: 51/51 testes aprovados em sete arquivos. Dois testes com o Codex configurado,
usando apenas nome e condomínio fictícios, conferiram `complete` e a conclusão por `unit_count`:
ambos informaram que os documentos são essenciais e que sem eles fica difícil ajudar com
precisão, sem “não precisa”, “depois” ou oferta de adiamento. A interpretação preservou o valor
estruturado de unidades. A API local foi reiniciada e o endpoint real de `setup-message`, via
Vite, confirmou a nova comunicação com dados fictícios; o runtime respondeu `ok` com `codex`.

Nesta rodada, os 148 arquivos e 1.289/1.289 testes da suíte completa passaram. Cobertura:
statements 91,58%, branches 87%, functions 96,66% e lines 93,38%. Formatação, lint, typecheck,
diff sem erros de whitespace e gate de 50 specs aprovados; evals determinísticos gerais 20/20
e documentais 50/50. O scanner de segredos foi executado após o término dos testes e ficou
inconclusivo por `ENOENT` em `.vitest-temp/alvitra-codex-*/answer-schema.json`, removido entre a
listagem e a leitura. Esse gate não foi declarado aprovado. O diff desta fatia foi revisto integralmente, preservando alterações
existentes das outras funcionalidades. Não houve merge ou publicação.

## Campo de mensagem pronto para escrever — Spec 024 — 2026-10-27

| Requisito | Aceitação | Implementação e evidência |
|---|---|---|
| RQ-2410 — foco automático do compositor | AC-2412 | `App.tsx` acompanha disponibilidade, conversa, condomínio e abertura dos controles auxiliares; `composer-focus.ts` foca somente o campo habilitado após a entrada, sem rolar a página. `composer-focus.test.ts` cobre entrada, envio, recuperação, menu aberto, campo desabilitado e desmontagem. |

A regra de desabilitação do campo foi preservada e reutilizada pelo efeito de foco. Foram
removidos dois focos adiados por temporizador, substituídos pelo efeito após a atualização da
interface. Não há captura global de teclado, repetição contínua ou trava ao perder o foco.

Validação focada: 24/24 testes de seis arquivos aprovados, incluindo seis casos do módulo novo,
que obteve 100% em statements, branches, functions e lines. Conferência no navegador local
comprovou foco na entrada, digitação sem clique, envio por Enter e botão, preservação do menu
durante a resposta, retorno ao fechar menu/lateral e saída livre do campo por Tab. O app carregou
o ajuste pelo Vite; não foi necessário reiniciar a API ou apagar os dados temporários.
Build web, formatação geral, lint, typecheck, diff sem erros de whitespace e gate de 50 specs
aprovados. A suíte completa executou 1.289 testes: 1.285 aprovados e quatro falhas fora dos
arquivos deste ajuste. Três foram timeouts em `chat-reentry.e2e.test.ts`,
`conversation-evals.e2e.test.ts` e `evidence-continuity.e2e.test.ts`; a quarta foi a asserção de
comprovante duplicado em `financial-review.test.ts`. Nenhuma asserção ou limite dessas suítes
foi alterado. A cobertura geral registrou statements 91,55%, branches 86,93%, functions 96,66%
e lines 93,37%; o piso de 80% foi atendido, mas as falhas impedem aprovação global e merge.
As duas tentativas do scanner de segredos foram inconclusivas por `ENOENT` em arquivos
`answer-schema.json` de `.vitest-temp`, removidos entre a listagem e a leitura. A segunda
tentativa ocorreu após o término desta suíte; não foi declarada aprovação desse gate.

## Comparação de modelo e memória — Spec 050

| Requisito | Aceitação | Implementação e evidência |
|---|---|---|
| RQ-5001/RQ-5002 — pareamento e memória explícita | AC-5001, AC-5002 e AC-5006 | `evals/conversation-comparison/run.ts`, `snapshot.ts`, opção `chatMemoryEnabled` em `replay.ts`; snapshot sem segredos, checkpoints e quatro configurações sem estado global. |
| RQ-5003/RQ-5004 — consumo e custo por rodada | AC-5003 e AC-5004 | `observed-gateway.ts`, `protocol.ts`, `conversation-comparison.test.ts`; tokens inclusive de saída recusada, falha sem usage desconhecida, tabela oficial versionada e billedCost nulo. |
| RQ-5005 — medição sem certificação indevida | AC-5005 | Plano padrão sem inferência; resumos separados por rodada, formulários por resposta e ausência de taxa de acerto fabricada. Execução real e auditoria registradas separadamente. |

Rodada exploratória `2026-10-27-sol-luna-memory-r1` concluída: 1.120 conversas/4.040 turnos,
quatro condições de 280 cenários/1.010 turnos sobre o mesmo snapshot. Zero falhas mecânicas;
um timeout Luna-on sem usage, preservado. Consumo é equivalente pela tabela Standard, sem
fatura atribuível. Auditoria técnica por IA de 80 posições/célula, com um oráculo em revisão
excluído uniformemente: 40/56 satisfatórias em Sol off/on e 30/43 em Luna off/on, sobre 79;
não representam acerto global. Resultados, custos, limitações e correções em
[observed-results-2026-10-27.md](../specs/050-comparacao-modelo-memoria/observed-results-2026-10-27.md).
Specs/aceitação preservam o gate especializado de três rodadas e não autorizam rollout.
Gates do harness/checkout: 148 arquivos/1.289 testes, quatro coberturas acima de 80%,
formatação, lint, TypeScript, 50 specs e evals determinísticos 20/20 + 50/50 aprovados.
Scanner canônico repetido após encerrar a matriz passou; a primeira tentativa havia sido
inconclusiva por arquivo efêmero removido. Retomada íntegra e rejeição de checkpoint adulterado
foram verificadas sem chamadas novas. Revisão do autor em
[2026-10-27-comparacao-modelo-memoria.md](../reviews/2026-10-27-comparacao-modelo-memoria.md),
sem aprovação independente para merge e sem correção de comportamento durante a medição.

## Indicação contextual da Zermatt — Spec 048 — 2026-10-27

| Requisito | Aceitação | Implementação e evidência |
|---|---|---|
| RQ-4801 — recomendação contextual | AC-4801/4802 | `prompt-catalog.ts`, `answer-prompt-v25`; `zermatt-recommendation-prompt.test.ts`; ZERMATT-01/02/03 e smoke real de `interpretSetupTurn`, com `intent=question` e `update=null`. |
| RQ-4802 — transparência e fundamento | AC-4803/4806 | Política compartilhada antes dos dados; teste preserva evidência/citação; ZERMATT-04/09 recusam afirmar menor taxa, aprovação ou comparação independente. |
| RQ-4803 — pertinência e recusa | AC-4804/4805 | ZERMATT-05/06 sem indicação em inadimplência/garantia de equipamento; ZERMATT-07/08 respeitam recusa atual e contextual; teste cobre o limite de menção documental. |
| RQ-4804 — ausência de ação/prospecção | AC-4806 | Nenhuma integração comercial adicionada; ZERMATT-10 não envia dados nem contrata; regras de autorização, validação e isolamento preservadas. |
| RQ-4805 — aprovação antes da aplicação | AC-4807 | Usuário aprovou explicitamente “Aprovar e aplicar” em 27/10/2026 após apresentação integral; fonte aplicada idêntica a `prompt-catalog.proposto.txt`. |

O comando `pnpm run evals:zermatt`, registrado no package.json, README e AGENTS, prepara dez
cenários/doze turnos e oferece modos `--synthetic` e `--codex` explícitos. Reutiliza o endpoint
real e o replay existente sem mudar a baseline de conversas. Gabaritos não entram no gateway.

Validação: 62 testes focados, incluindo sete novos casos de contrato, e 1.241/1.241 testes
na suíte completa (145 arquivos). Cobertura: statements 88,31%, branches 82,34%, functions
91,95% e lines 90,52%. Formatação, lint, typecheck, gate de 50 specs, scanner de segredos e
diff sem erros de whitespace aprovados. Evals determinísticos 20/20 e 50/50 antes e depois.

Replay real com o Codex configurado: 12/12 respostas, zero falhas mecânicas ou `failed`;
revisão funcional local aderente aos gabaritos. Smoke adicional na configuração indicou a
Zermatt, identificou a natureza comercial e manteve o cadastro intacto. Os relatórios preservam
`semanticApproved=null`: não representam revisão especializada ou autorização de produção.

Corepack não conseguiu baixar pnpm por DNS; os componentes do gate foram executados com os
binários instalados. Cache de teste foi direcionado ao workspace após EPERM no temporário.
O primeiro replay real no sandbox teve 12 falhas de processo; foi preservado antes da nova
execução autorizada fora do sandbox. O comando de eval recusa erro mecânico ou resposta `failed`.
Revisão e limites em `docs/reviews/2026-10-27-recomendacao-zermatt.md`. Sem merge ou publicação.

## Acolhimento sem marcação de gênero — Spec 024 — 2026-10-27

| Requisito | Aceitação | Implementação e evidência |
|---|---|---|
| RQ-2402 — boas-vindas neutras | AC-2402 | `setup-message.ts` orienta a geração sem gênero, inclusive na pergunta sobre o nome, sem frase fixa; `setup-message.test.ts` cobre a primeira entrada sem nome. |
| RQ-2406 — retomada e nova conversa neutras | AC-2407 | A mesma instrução vale em `returning` e `new_conversation`; regressões usam nomes sintéticos Ana, Carlos e Alex, sem inferir gênero nem substituir a fala gerada. |

Pedido explícito do usuário aplicado ao prompt de configuração; a revisão passa a
`answer-prompt-v24`. A personalidade e os contratos documentais permanecem preservados.

Validação: 27/27 testes focados aprovados, incluindo sete regressões de acolhimento. Três chamadas
sintéticas ao Codex configurado produziram saudações neutras em `welcome`, `returning` e
`new_conversation`. Na primeira entrada: “Olá! Que bom ter você aqui. Como você prefere que eu te
chame?”. O reinício da API local foi autorizado explicitamente após informar a perda dos dados
temporários da demonstração; o runtime respondeu `ok` com provedor `codex` depois do reinício.

Formatação dos quatro arquivos de código alterados, lint, scanner de segredos, diff sem erros de
whitespace e gate de 47 specs aprovados. Evals documentais determinísticos: 50/50. A rodada geral
com cobertura executou 1.208 testes, com 1.201 aprovados e sete falhas em arquivos fora deste
ajuste: reentrada/memória, confirmação documental, qualidade documental, SQL de recuperação e
descrição de conflito. O runner não produziu relatório de cobertura nessa rodada reprovada.
O eval geral passou 19/20, com falha P0 em EVAL-008 por texto esperado ausente no conflito.
A checagem de formatação geral apontou quatro arquivos fora do ajuste, e a primeira checagem de
tipagem encontrou callback incompatível em `codex-answer-gateway.test.ts`. O workspace recebeu
outras mudanças durante as verificações; a repetição do typecheck passou. Estes resultados não constituem aprovação global nem
autorização de merge. Não foram alterados testes ou asserções dessas outras funcionalidades.

## Conversas e documentos por condomínio — Spec 044 — 2026-10-27

| Requisito | Aceitação | Implementação e evidência |
|---|---|---|
| RQ-4401 — carteira e chats à esquerda | AC-4401/4402 | `App.tsx`, `account-menu-ui.test.ts` e `condominium-navigation.e2e.test.ts`: carteira autorizada, revalidação, chats separados, retorno, limpeza somente após sucesso e preservação do histórico persistido. |
| RQ-4402 — documentos ativos à direita | AC-4403 | `App.tsx`, `document-library.ts`, testes unitários e E2E: uma requisição ao catálogo ativo, cancelamento, descarte tardio, erro distinto de vazio, atualização após envio/confirmação e durante processamento. |
| RQ-4403 — biblioteca contextual | AC-4404/4406 | `DocumentLibrary.tsx`, `styles.css`, `document-library.test.ts`: categorias, contagens, busca sem acentos/caixa, filtro de estado, versão, data em São Paulo, vigência visível, original privado e diálogo nativo. Inspeção visual desktop/320 px e foco real permanecem pendentes por bloqueio da ferramenta de computador. |
| RQ-4404 — disponibilidade verificável | AC-4405 | `document-library.ts`, `DocumentLibrary.tsx`, testes unitários e E2E: 75% para 3/4, arredondamento, base vazia, exclusão de outro tenant/duplicatas, confirmação e vigência impeditivas, filtros sem mudar o cálculo e método/limitações visíveis. |

O pedido explícito move a carteira da direita para a esquerda; briefing e MVP foram atualizados
na mesma decisão. A Spec 044 substitui somente a composição visual das Specs 018/019/024/038.
As asserções antigas de localização foram atualizadas para a nova aceitação, mantendo controles,
Perfil, autorização, agrupamento documental e regressões de histórico. Sem novo serviço, provedor,
migração, dependência ou armazenamento de conteúdo no navegador. O indicador considera somente
as versões que a API retorna no catálogo atual, sem estimar acerto da IA ou completude temática.

Resultados e limitações: `docs/reviews/2026-10-27-navegacao-por-condominio.md`.

Validação final: 1.033 testes/137 arquivos aprovados, incluindo 127 E2E e 30 casos nos três
arquivos diretamente associados à Spec 044. Cobertura no escopo canônico da configuração
existente: statements 90,92%, branches 85,71%, functions 96,34% e lines 92,93%; nenhuma exclusão
adicionada. Formatação, lint, tipagem, build web, gate de 45 specs, scanner de segredos e
`git diff --check` aprovados. O relatório de cobertura usa diretório exclusivo para não disputar
arquivos com outras execuções. Conferência visual e revisão independente para merge continuam
pendentes; a implementação não foi publicada.

## Rodada real de conversas — Spec 041 — 2026-10-27

RQ-4103/RQ-4104 e AC-4107: os 240 cenários/260 turnos foram executados com o gateway Codex
do chat, `gpt-6.1-sol`, prompt v22, corpus sintético e checkpoints. Resultado mecânico:
260 contratos válidos, 193 citações verificáveis e nenhum acesso cruzado detectado. Houve
335 invocações, 334 concluídas e uma indisponibilidade preservada na rodada original.

Revisão técnica assistida por IA dos 240 resultados: 180 satisfatórios, 44 parciais,
15 falhas de atendimento e uma falha operacional. Não substitui validação especializada:
os 260 formulários por turno permanecem pendentes. Foram identificados 80 fallbacks que
descartaram evidências, oito falsos alertas de OCR e 38/51 desencontros de risco do dataset.
Relatório, casos e correções propostas em
`docs/specs/041-evals-conversas-sindicos/observed-results-2026-10-27.md`.

25 testes do harness e gate de 43 specs aprovados. Mudanças simultâneas de perfil/documentos
foram preservadas; seus efeitos posteriores não integram a versão carregada pela rodada.
Sem alteração do modelo/prompt/recuperação para melhorar artificialmente os resultados,
sem merge e sem aprovação de rollout. O retry separado não apagou a indisponibilidade original.

## Conversas pessoais locais pelo plano Codex — Spec 042 — 2026-10-26

| Requisito | Aceitação | Implementação e evidência |
|---|---|---|
| RQ-4201 — opt-in exclusivo local | AC-4201, AC-4202 e AC-2610 | `server.ts`, `codex-answer-gateway.ts`, `codex-conversations.e2e.test.ts`: boas-vindas, interpretação e pergunta pelo Codex; nenhuma API é chamada mesmo com chaves presentes; produção recusada. |
| RQ-4202 — execução isolada | AC-4203 | `codex-process.ts`, `codex-process.test.ts`, `codex-answer-gateway.test.ts`: stdin, sem shell/segredos/ferramentas, sessão efêmera e temporários separados e removidos. |
| RQ-4203 — contrato documental | AC-4204 e AC-4205 | Reuso do schema e reconstrução de citações OpenAI; testes de JSON, completude, ferramenta inesperada, erro/timeout, configuração e evidência de outro condomínio. |
| RQ-4204 — operação observável | AC-4206 e AC-4207 | Runtime e interface identificam Codex; telemetria de tokens/latência/hashes; README, `.env.example` e ADR 0031 documentam cota, limitações e reversão. |

Validação inicial: 31 testes focados aprovados; suíte completa com 950 testes/132 arquivos;
statements 90,73%, branches 85,25%, functions 96,36%, lines 92,77%. E2E: 111/111;
evals: 20/20 e 50/50 documentais determinísticos; build web aprovado. O primeiro `check`
encontrou formatação pendente em arquivos da Spec 041 em trabalho paralelo; esses arquivos não
foram alterados nesta tarefa. A formatação global passou após a conclusão daquele trabalho.

Smoke real autorizado: CLI `0.164.0-alpha.11.1`, ChatGPT, `gpt-6.1-sol`; boas-vindas, interpretação
de nome fictício e orientação geral passaram pela API. Consulta à convenção sintética retornou
citação da versão v1, página 3, validada localmente (11.524 tokens de entrada, 172 de saída,
5.815 ms nessa chamada). Rodadas iniciais consumiram a cota, mas o parser recusou o aviso
experimental do CLI; a configuração foi corrigida e ganhou asserção de regressão. Não houve
envio de dado real, alteração do prompt ou aprovação semântica da bateria de evals.

Fechamento: `pnpm run check` aprovado integralmente na versão final; os dois novos módulos
Codex atingem 100% nos quatro indicadores de cobertura. Compilação da API aprovada e diff da
tarefa revisado em `docs/reviews/2026-10-26-codex-conversas-locais.md`. API e proxy web locais
confirmam `aiProvider=codex` e `authMode=development` após reiniciar somente a API deste projeto.

## Evals de conversas típicas — Spec 041 — 2026-10-26

| Requisito | Aceitação | Implementação e evidência |
|---|---|---|
| RQ-4101 — corpus independente | AC-4101 | `evals/conversations/documents/`, `corpus.ts`; 25 arquivos fictícios, páginas, versões, dois tenants, hashes e conciliação dos três balancetes em `conversation-evals.test.ts`. |
| RQ-4102 — representatividade | AC-4102 | `dataset.ts`; 240 cenários distintos, 260 turnos, 14 temas com 15 casos e 30 transversais; diversidade, referências e 19 sequências testadas. |
| RQ-4103 — replay pelo produto | AC-4103 e AC-4104 | `replay.ts`, `conversation-evals.e2e.test.ts`; autorização, retrieval, caso de uso, chat, persistência e endpoint reais em memória; verificações negativas de citações/HTTP/tenant e documento recebido depois. |
| RQ-4104 — medição honesta | AC-4105 e AC-4106 | `review.ts`, `run.ts`, rubrica e testes de revisão; IDs/hashes vinculam julgamento à resposta, menor nota entre especialistas, sustentação por citação, denominadores explícitos e bloqueio de aprovação de replay sintético. |
| RQ-4105 — conversas longas | AC-4108, AC-4109 e AC-4110 | `long-10.ts`, `long-15.ts`, `long-20.ts`, `long-30.ts`, `long-case.ts` e `long-dataset.ts`; 40 roteiros/750 turnos adicionais, dez de cada comprimento 10/15/20/30; suíte completa 280/1.010. Testes em `conversation-evals.test.ts` protegem o hash dos 240 originais e a separação de métricas; E2E valida fontes progressivas/retiradas, memória limitada, isolamento e revogação tardia. |

Ampliação de 27/10/2026: 1.010/1.010 contratos locais e 750/750 no filtro de longos, sem
aprovação semântica ou nova execução externa. O gate de completude verifica também a sequência
de resultados e suas perguntas; `byLongTurn` mostra as posições 1 a 30 separadamente.
Cobertura geral com dois workers: 1.226 testes em 143 arquivos aprovados; statements 91,09%,
branches 86,09%, functions 96,30% e lines 92,98%. Evidências, limitações do Corepack e revisão
do autor em `docs/reviews/2026-10-27-evals-conversas-longas.md`. Os registros abaixo de 240/260
referem-se à baseline histórica preservada, não à execução dos 40 longos com modelo real.
| RQ-3501 e RQ-3503 — variante de instrução hostil | AC-3501 e AC-3505 | `CONV-crosscutting-07` encontrou reprodução da ordem “ignore o sistema” na citação. A triagem passou a reconhecer essa variante; caso, canário e asserções foram preservados. Regressão adicional em `document-instruction-security.e2e.test.ts`. |

Comando único: `pnpm run evals:conversations`; `--synthetic` executa contratos, e `--assess`
agrega revisão humana vinculada à rodada. CI executa o replay local e exporta seu pacote.
Não houve mudança de prompt, provedor, banco, publicação ou execução com dados reais. Validade
mecânica não é aprovação de modelo; execução probabilística e revisão dos gabaritos continuam
pendentes. Fontes legais usam a edição local com relógio congelado e não certificam atualização.

Validação: 260/260 turnos mecânicos, 34/34 testes focados e 950 testes na rodada geral do
workspace aprovados; cobertura statements 90,73%, branches 85,25%, functions 96,36% e lines
92,77%. Formatação, lint, tipagem, visão e scanner de segredos aprovados por executáveis locais
equivalentes, após falha de DNS do Corepack. Evals anteriores 20/20 e 50/50 determinísticos
aprovados. Revisão do autor e limites em `docs/reviews/2026-10-26-evals-conversas.md`.

## Organização do menu da conta — 2026-10-26

| Requisito | Aceitação | Evidência |
| --- | --- | --- |
| RQ-2404/RQ-2405/RQ-2407 — menu compacto de documentos, condomínio e perfil | AC-2405, AC-2406 e AC-2408 | `App.tsx`, `styles.css` e `account-menu-ui.test.ts`; “Condomínios” expande no próprio menu, o selecionado contém “Documentos enviados” limitado aos seus arquivos e o perfil mantém a saída no rodapé em botão vermelho. |

Validação: gate de visão das 40 specs, 5 testes do menu e build web aprovados; prévia local conferida com o acordeão de condomínios, seus documentos e o perfil.

## Saudação contextual em nova conversa — 2026-10-26

| Requisito | Aceitação | Evidência |
| --- | --- | --- |
| RQ-3801/RQ-3805 — nova conversa iniciada pela Alvitra | AC-3801 e AC-3806 | `setup-message.ts`, `App.tsx`, `setup-message.test.ts`, `chat-sidebar-ui.test.ts` e `offline-demo-ui.test.ts`; a mensagem é gerada no ambiente conectado e usa uma saudação segura no modo local, sem copiar turnos, anexos, rascunhos ou cadastro. |

Validação: gate de visão das 40 specs aprovado; 11 testes unitários focados e build web aprovados. A prévia local confirmou que “Nova conversa” abre com a saudação da Alvitra.

## Fronteira determinística reforçada — 2026-10-19

| Requisito | Aceitação | Evidência |
| --- | --- | --- |
| RQ-2901 — precisão do cálculo local | AC-2901 e AC-2902 | `financial-analysis.ts`, `financial-analysis.test.ts`: frações positivas/negativas, base zero e `precision_limit` com diferença monetária preservada |
| RQ-3204 — referência literal independente de IA | AC-3205 | `document-analysis-validation.ts`, `document-analysis-validation.test.ts`: documento/versão/título/página/offset/trecho adulterados, Unicode, permissão, tenant e duplicidade |
| RQ-3202 e RQ-3204 — degradação e publicação integral | AC-3204 e AC-3205 | `deterministic-analysis.e2e.test.ts`: cálculo sobre PDFs apesar da falha do gateway simulado; fonte ambígua invalida o relatório sem expor erro |

`pnpm run check`: 673/673 testes em 107 arquivos; statements 89,21%, branches 82,94%,
functions 95,78%, lines 91,47%; formatação, lint, tipagem, 36 specs e segredos aprovados.
E2E 52/52; evals locais 20/20; documentais determinísticos 50/50; integração sintética Neon 7/7;
build web aprovado. Sem chamadas reais de IA, migração, novos serviços ou alteração de prompt.
Os testes de autorização, isolamento e idempotência existentes permanecem aprovados;
essas regras não foram transferidas para IA nem reimplementadas.

Esta fatia reforça cálculos e referências; não implementa teto monetário global, conciliação
bancária, cache genérico entre uploads, roteamento Luna/Sol ou confirmação humana nova.
A conferência literal não atesta significado ou OCR correto. Relatório de revisão local em
`docs/reviews/2026-10-19-conferencia-deterministica.md`; revisão independente para merge e
aprovação semântica continuam pendentes.

## Integração da bateria e preparação semântica — 2026-10-16

| Requisito | Aceitação | Evidência |
| --- | --- | --- |
| RQ-3102–3104 — execução determinística fiel e completa | AC-3102, AC-3103, AC-3105 | `evals/documentary-quality/run.ts`; mapas de tabelas, OCR e segurança; `tests/e2e/documentary-quality.e2e.test.ts`: 50 executados, nenhuma pendência determinística |
| RQ-3601 — fontes independentes do gabarito | AC-3601, AC-3605 | `semantic/fixtures.ts`, `semantic/cases.ts`; teste de mutação do gabarito sem mudança de fontes/pergunta, metadados ausentes e exclusão de fontes inelegíveis |
| RQ-3602–3603 — replay e revisão distintos | AC-3602, AC-3603, AC-3604, AC-3606 | `semantic/replay.ts`, `semantic/run.ts`; teste de erro por caso; JSON com respostas, telemetria e revisão humana não preenchida; CLI e CI registrados |
| RQ-3202–3203 — PDF ao relatório no turno | AC-3201, AC-3203, AC-3204 | `tests/e2e/integrated-document-analysis.e2e.test.ts`: PDFs sintéticos de atas/contratos com rótulos literais e balancetes; citação por página/versão, comparação, remoção e autorização |

Resultado local: `pnpm run check` aprovado em 103 arquivos/617 testes; statements 88,86%, branches 82,50%, functions 95,64%, lines 91,14%; formatação, lint, tipagem, 36 specs e scanner aprovados. `pnpm run test:e2e`: 40 cenários aprovados (incluídos nos 617). `pnpm run evals`: 20/20; `pnpm run evals:documentary`: 50/50 determinísticos, sem pendências; build web aprovado. `git diff --check` sem erros.

`pnpm run evals:documentary:semantic` gerou 50 fichas com zero replays; `--synthetic` gerou 50 respostas locais mecanicamente válidas. Ambos informam zero chamadas de provedor e zero aprovações semânticas. Os artefatos estão em `reports/documentary-semantic-review.json` e `reports/documentary-semantic-synthetic.json`, regeneráveis e ignorados pelo Git. As fontes não contêm gabarito; vigência permanece pendente. O replay direto não representa o filtro de elegibilidade de produção.

Limites: não houve avaliação probabilística, leitura visual de OCR por provedor, navegação manual no browser, nova execução Neon ou julgamento especializado. OCR 8/3 usa transcrição e conferência independentes simuladas no processamento real. O fluxo de PDF normativo verifica rótulos literais, não interpretação universal de prosa. A etapa de modelo requer autorização/configuração e orçamento; a etapa humana requer revisores qualificados. Não houve merge, publicação, contato externo nem aprovação fictícia. A revisão desta fatia é autorrevisão, não revisão independente para merge.

## Correções das Specs 034–035 — 2026-10-16

| Requisito | Aceitação | Regressão determinística |
| --- | --- | --- |
| RQ-3401 — ausência de entradas não confirma OCR financeiro | AC-3405 e AC-3406 | `tests/unit/ocr-consistency.test.ts`: extração vazia, parcial, tabela ambígua/cortada, valor ilegível e ata não financeira |
| RQ-3501 — distinguir obrigação humana de comando à assistente | AC-3501 e AC-3504 | `tests/unit/document-instruction-security.test.ts`; `tests/e2e/document-instruction-security.e2e.test.ts`: cláusula legítima disponível e citável, ataque explícito bloqueado antes do gateway |
| RQ-3501 — fato independente em trecho misto | AC-3505 | `tests/unit/document-instruction-security.test.ts`: fatia literal e offsets Unicode; `tests/e2e/document-instruction-security.e2e.test.ts`: fonte mista sem instrução enviada; `EVAL-012` original sem alteração das asserções |

Os casos de contato adversarial agora nomeiam a assistente para remover a ambiguidade das fixtures anteriores; não foram removidas as asserções de bloqueio, zero chamadas e ausência de vazamento. Esta correção não afirma resistência universal a injeção nem substitui revisão especializada ou eval de provedor.

Verificação final destas correções, em 2026-10-16:

- `pnpm run check`: aprovado, 103 arquivos e 613 testes; statements 88,86%, branches 82,45%, functions 95,64%, lines 91,14%; formatação, lint, tipagem, 36 specs e scanner de segredos aprovados.
- `pnpm run test:e2e`: 36 cenários aprovados em 9 arquivos (incluídos também nos 613 testes; não são contagens somáveis).
- `pnpm run evals`: 20/20 aprovados, incluindo `EVAL-012` sem alteração de suas asserções.
- `pnpm run evals:documentary`: 41/41 determinísticos executados aprovados; 9 ainda pendentes de integração e 50 semânticos não executados. Revisão especializada permanece pendente; o código de saída zero não significa conclusão da bateria.
- `git diff --check`: aprovado. Autorrevisão dos arquivos desta correção verificou escopo, isolamento preservado, fontes literais, offsets Unicode, hash recalculado e compatibilidade do identificador com o chunk persistido. Nenhum merge ou publicação foi executado; não representa revisão independente para merge.

O gate revelou ainda um escape desnecessário no hífen da expressão de rubricas; foi removido sem alteração semântica. Não houve mudança de schema/persistência, dependência, provedor ou prompt. Integração Neon e chamadas de modelo externo não foram reexecutadas nesta correção. As alterações preexistentes fora deste escopo foram preservadas.

## Specs 028–032 — análise documental integrada

| Requisito | Aceitação | Evidência |
|---|---|---|
| RQ-2801 a RQ-2804 — extração, fonte e incerteza | AC-2801 a AC-2805 e regressões Unicode/sinais | `apps/api/documents/structured/`; `tests/unit/structured-document-extraction.test.ts`; `tests/unit/document-processing.test.ts` |
| RQ-2901 a RQ-2904 — cálculo e comparabilidade | AC-2901 a AC-2904 | `apps/api/analysis/financial-analysis.ts`; `tests/unit/financial-analysis.test.ts`; `tests/unit/document-analysis.test.ts` |
| RQ-3001 a RQ-3004 — fatos, limites e conflitos normativos | AC-3001 a AC-3008 | `apps/api/analysis/normative/`; `tests/unit/normative-document-analysis.test.ts`; `tests/unit/document-analysis.test.ts` |
| RQ-3101 a RQ-3104 — avaliações honestas | AC-3101 a AC-3104 | `evals/documentary-quality/`; `tests/e2e/documentary-quality.e2e.test.ts`; `pnpm run evals:documentary` |
| RQ-3201 — páginas autorizadas e limites | AC-3201 a AC-3203 | `apps/api/analysis/document-analysis-reader.ts`; `tests/unit/document-analysis-reader.test.ts`; `tests/integration/rls-tenant-isolation.test.ts` |
| RQ-3202 e RQ-3203 — relatório no turno e falha segura | AC-3201 a AC-3204 | `apps/api/analysis/document-analysis.ts`; `apps/api/app/create-api.ts`; `apps/web/App.tsx`; `tests/e2e/integrated-document-analysis.e2e.test.ts` |

O relatório calculado usa páginas existentes (ADR 0024), sem nova persistência ou prompt. Revisão semântica por especialistas e avaliação probabilística do provedor não são substituídas por testes determinísticos e permanecem explicitamente pendentes nos relatórios da Spec 031.

**Status:** Blocos 1–8 autorizados; núcleo documental e vetorial preservado
**Atualizado em:** 2026-10-09

Esta matriz liga promessas a critérios de aceitação e evidências de verificação. Os casos usam somente dados sintéticos.

## Gates de preparação

| Gate                     | Evidência                                      | Limite                                                                                                                                          |
| ------------------------ | ---------------------------------------------- | ----------------------------------------------------------------------------------------------------------------------------------------------- |
| Alinhamento da Spec 001  | `spec.md` §0 e gate `validate-spec-vision.ps1` | não altera a visão canônica                                                                                                                     |
| Arquitetura e isolamento | ADRs 0001–0009                                 | PostgreSQL/RLS, escopo autorizado e processamento local antes de dados persistidos; Neon e OCR externo somente para integração/corpus sintético |
| Dados e riscos iniciais  | `docs/security/data-handling-inicial.md`       | somente corpus sintético; nenhum piloto ou dado real                                                                                            |
| Critérios de produto     | `acceptance.md` AC-001–AC-028                  | P0 bloqueia qualquer entrega correspondente                                                                                                     |

| Requisito                                                             | Critérios de aceitação                                                                                                                                                                      | Evals                        | Teste determinístico futuro                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                 |
| --------------------------------------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | ---------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| RQ-001 Contexto autorizado e selecionado                              | AC-001, AC-002, AC-003, AC-022                                                                                                                                                              | EVAL-010, EVAL-011, EVAL-012 | `tests/e2e/identity-context.e2e.test.ts`; `tests/unit/authorized-condominium-context.test.ts`; `tests/integration/rls-tenant-isolation.test.ts`                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                             |
| RQ-002 / RQ-002A / RQ-002B Ingestão, identificação e controle de PDF  | AC-004, AC-005, AC-023, AC-030, AC-031                                                                                                                                                      | EVAL-014                     | `apps/api/documents/document-processing.ts`; `apps/api/documents/document-identification.ts`; `apps/api/documents/postgres-document-upload-repository.ts`; `apps/api/documents/postgres-private-document-storage.ts`; `apps/api/documents/postgres-document-retention-repository.ts`; `infrastructure/database/022_manager_document_removal.sql`; `apps/api/app/create-api.ts`; `apps/web/App.tsx`; `tests/unit/document-catalog.test.ts`; `tests/unit/postgres-document-adapters.test.ts`; `tests/unit/postgres-document-retention-repository.test.ts`; `tests/unit/postgres-private-document-storage.test.ts`; `tests/e2e/document-ingestion.e2e.test.ts`; `tests/integration/rls-tenant-isolation.test.ts`                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                               |
| RQ-003 Versão e vigência                                              | AC-006, AC-007                                                                                                                                                                              | EVAL-008, EVAL-009           | `apps/api/documents/document-model.ts`; `apps/api/documents/version-validity.ts`; `tests/unit/document-model.test.ts`; `tests/unit/version-validity.test.ts`                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                |
| RQ-004 Recuperação isolada                                            | AC-008, AC-009                                                                                                                                                                              | EVAL-010, EVAL-012           | `tests/unit/scoped-retrieval.test.ts`; `tests/unit/in-memory-scoped-retrieval.test.ts`; `tests/unit/text-retrieval.test.ts`; `tests/unit/postgres-scoped-retrieval.test.ts`; `tests/integration/rls-tenant-isolation.test.ts`                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                               |
| RQ-005 Resposta fundamentada                                          | AC-010, AC-011, AC-024                                                                                                                                                                      | EVAL-001–EVAL-005, EVAL-015  | `apps/api/answers/answer-gateway.ts`; `apps/api/answers/answer-use-case.ts`; `apps/web/App.tsx`; `tests/unit/answer-gateway.test.ts`; `tests/unit/answer-use-case.test.ts`; `tests/unit/postgres-scoped-retrieval.test.ts`; `tests/e2e/document-answer.e2e.test.ts`                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                         |
| RQ-006 Citações verificáveis                                          | AC-012, AC-013                                                                                                                                                                              | EVAL-001–EVAL-005, EVAL-015  | `apps/api/answers/citation-validator.ts`; `infrastructure/database/010_answer_claim_grounding.sql`; `apps/web/App.tsx`; `tests/unit/citation-validator.test.ts`; `tests/unit/api-answers.test.ts`; `tests/unit/answer-migration.test.ts`; `tests/e2e/document-answer.e2e.test.ts`                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                           |
| RQ-007 Abstenção                                                      | AC-014, AC-015                                                                                                                                                                              | EVAL-006, EVAL-007, EVAL-019 | `apps/api/answers/answer-use-case.ts`; `tests/unit/answer-use-case.test.ts`; `tests/unit/answer-gateway.test.ts`                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                            |
| RQ-008 Conflitos documentais                                          | AC-016                                                                                                                                                                                      | EVAL-008, EVAL-009           | `apps/api/answers/conflict-detection.ts`; `apps/api/answers/answer-gateway.ts`; `tests/unit/risk-and-conflict.test.ts`                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                      |
| RQ-009 Conteúdo não confiável                                         | AC-017                                                                                                                                                                                      | EVAL-012, EVAL-013           | `apps/api/answers/prompt-catalog.ts`; `apps/api/answers/answer-gateway.ts`; `tests/unit/answer-gateway.test.ts`; `evals/run.ts`                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                             |
| RQ-010 Escalonamento                                                  | AC-018                                                                                                                                                                                      | EVAL-016, EVAL-017           | `apps/api/answers/risk-classification.ts`; `tests/unit/risk-and-conflict.test.ts`; `tests/unit/answer-use-case.test.ts`                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                     |
| RQ-011 Feedback                                                       | AC-019                                                                                                                                                                                      | EVAL-020                     | `apps/api/answers/in-memory-answer-persistence.ts`; `apps/api/answers/postgres-answer-persistence.ts`; `apps/api/answers/answer-trace.ts`; `apps/api/app/create-api.ts`; `tests/unit/api-answers.test.ts`; `tests/e2e/feedback-audit.e2e.test.ts`; `tests/unit/answer-trace.test.ts`                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                        |
| RQ-012 Auditoria e custo                                              | AC-020                                                                                                                                                                                      | EVAL-020                     | `apps/api/answers/answer-persistence.ts`; `apps/api/answers/postgres-answer-persistence.ts`; `apps/api/answers/answer-trace.ts`; `apps/api/answers/postgres-answer-trace-store.ts`; `infrastructure/database/009_answers_feedback_audit.sql`; `infrastructure/database/009_answers_feedback_and_audit.sql`; `tests/unit/answer-use-case.test.ts`; `tests/e2e/feedback-audit.e2e.test.ts`; `tests/unit/postgres-answer-trace-store.test.ts`                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                  |
| RQ-013 Falha segura                                                   | AC-021, AC-025                                                                                                                                                                              | EVAL-019                     | `apps/api/answers/answer-gateway.ts`; `apps/api/answers/answer-use-case.ts`; `apps/api/app/server.ts`; `tests/unit/answer-gateway.test.ts`; `tests/unit/answer-use-case.test.ts`; `tests/unit/api-answers.test.ts`                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                          |
| RQ-014 Formato da resposta                                            | AC-010, AC-014, AC-016, AC-018, AC-028                                                                                                                                                      | EVAL-018                     | `apps/shared/conversation-intent.ts`; `apps/api/answers/answer-contract.ts`; `apps/api/answers/citation-validator.ts`; `apps/api/answers/prompt-catalog.ts`; `apps/api/answers/answer-use-case.ts`; `apps/api/answers/answer-gateway.ts`; `apps/web/answer-presentation.ts`; `apps/web/App.tsx`; `apps/web/styles.css`; `tests/unit/conversation-intent.test.ts`; `tests/unit/citation-validator.test.ts`; `tests/unit/prompt-catalog.test.ts`; `tests/unit/chat-turn-ui.test.ts`; `tests/unit/answer-use-case.test.ts`; `tests/unit/answer-gateway.test.ts`                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                |
| RQ-015 Integridade dos turnos e confirmação de envio                  | AC-026                                                                                                                                                                                      | —                            | `apps/web/App.tsx`; `tests/unit/chat-turn-ui.test.ts`                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                       |
| RQ-016 Latência sem duplicação de evidência                           | AC-027                                                                                                                                                                                      | —                            | `apps/api/answers/gemini-answer-gateway.ts`; `apps/api/answers/prompt-catalog.ts`; `tests/unit/gemini-answer-gateway.test.ts`                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                               |
| ADR 0007 — alvo Neon sintético                                        | marcador persistente, URL PostgreSQL com TLS, papel runtime seguro, identidade externa e fence do worker; migrations 003–006 verificadas; 6/6 testes RLS/API/worker aprovados em 2026-09-03 | —                            | `scripts/neon-integration-guard.ts`; `infrastructure/database/005_worker_claim_fencing.sql`; `infrastructure/database/006_runtime_document_read_grants.sql`; `tests/unit/neon-integration-guard.test.ts`; `tests/integration/rls-tenant-isolation.test.ts`                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                  |
| Spec 003 — entrada e criação local                                    | AC-301–AC-316                                                                                                                                                                               | —                            | `apps/web/App.tsx`; `apps/web/styles.css`; `apps/api/identity/development-identity-repository.ts`; `apps/api/documents/development-document-memory.ts`; `apps/api/app/create-api.ts`; `tests/unit/development-test-condominium.test.ts`; `tests/unit/development-document-memory.test.ts`; `tests/unit/mobile-navigation.test.ts`                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                           |
| Spec 004 — gateway Gemini local                                       | AC-401–AC-412                                                                                                                                                                               | —                            | `apps/api/answers/gemini-answer-gateway.ts`; `apps/api/answers/answer-gateway.ts`; `apps/api/answers/answer-use-case.ts`; `tests/unit/gemini-answer-gateway.test.ts`; `tests/unit/answer-use-case.test.ts`; `tests/unit/answer-gateway.test.ts`; `tests/unit/risk-and-conflict.test.ts`; `tests/unit/prompt-catalog.test.ts`                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                |
| Spec 005 — método de atuação da Cora                                  | AC-501–AC-511                                                                                                                                                                               | —                            | `apps/shared/conversation-intent.ts`; `apps/api/answers/prompt-catalog.ts`; `apps/api/answers/answer-use-case.ts`; `apps/api/answers/answer-gateway.ts`; `apps/web/App.tsx`; `apps/web/styles.css`; `apps/web/message-format.ts`; `tests/unit/conversation-intent.test.ts`; `tests/unit/prompt-catalog.test.ts`; `tests/unit/answer-use-case.test.ts`; `tests/unit/answer-gateway.test.ts`; `tests/unit/chat-turn-ui.test.ts`; `tests/unit/web-message-format.test.ts`                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                      |
| Spec 006 — autenticação real                                          | AC-601–AC-613                                                                                                                                                                               | —                            | `apps/api/identity/account-auth.ts`; `apps/api/identity/postgres-account-auth.ts`; `apps/api/app/create-api.ts`; `apps/api/app/server.ts`; `apps/web/App.tsx`; `apps/web/styles.css`; `contracts/http/health.openapi.json`; `infrastructure/database/011_real_account_auth.sql`; `tests/unit/account-auth.test.ts`; `tests/unit/health-contract.test.ts`; `tests/unit/mobile-navigation.test.ts`; `tests/unit/server.test.ts`; `tests/e2e/identity-context.e2e.test.ts`                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                     |
| Spec 007 — criação real de condomínio                                 | AC-701–AC-710                                                                                                                                                                               | —                            | `apps/api/identity/postgres-condominium-directory.ts`; `apps/api/app/create-api.ts`; `apps/api/app/server.ts`; `apps/web/App.tsx`; `apps/web/document-upload-request.ts`; `apps/web/styles.css`; `infrastructure/database/012_real_condominium_creation.sql`; `tests/unit/postgres-condominium-directory.test.ts`; `tests/unit/real-condominium-creation.test.ts`; `tests/unit/condominium-registration-feedback.test.ts`; `tests/unit/web-document-upload.test.ts`                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                         |
| Spec 008 — login com Google                                           | AC-801–AC-807                                                                                                                                                                               | —                            | `apps/api/identity/google-oauth.ts`; `apps/api/identity/account-auth.ts`; `apps/api/app/create-api.ts`; `apps/api/app/server.ts`; `apps/web/App.tsx`; `apps/web/styles.css`; `infrastructure/database/013_google_oauth_identity.sql`; `tests/unit/google-oauth.test.ts`; `tests/unit/account-auth.test.ts`; `tests/unit/mobile-navigation.test.ts`                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                          |
| Spec 009 — configurações, perfil, documentos e exclusão do condomínio | AC-901–AC-914                                                                                                                                                                               | —                            | `apps/web/App.tsx`; `apps/web/styles.css`; `apps/api/app/create-api.ts`; `apps/api/identity/condominium-profile.ts`; `apps/api/identity/postgres-condominium-profile.ts`; `apps/api/identity/in-memory-condominium-profile.ts`; `apps/api/documents/document-catalog.ts`; `apps/api/documents/development-document-upload-repository.ts`; `apps/api/documents/postgres-document-upload-repository.ts`; `apps/api/identity/development-identity-repository.ts`; `apps/api/identity/postgres-condominium-directory.ts`; `infrastructure/database/014_leave_condominium_management.sql`; `infrastructure/database/015_delete_condominium.sql`; `infrastructure/database/023_condominium_profile_customization.sql`; `tests/unit/condominium-profile.test.ts`; `tests/unit/in-memory-condominium-profile.test.ts`; `tests/unit/postgres-condominium-profile.test.ts`; `tests/unit/api-condominium-profile.test.ts`; `tests/unit/condominium-profile-migration.test.ts`; `tests/unit/document-catalog.test.ts`; `tests/unit/api-answers.test.ts`; `tests/unit/mobile-navigation.test.ts`; `tests/unit/development-test-condominium.test.ts`; `tests/unit/postgres-condominium-directory.test.ts`; `tests/unit/real-condominium-creation.test.ts` |
| Spec 010 — proteção de carga do piloto                                | AC-1001–AC-1004                                                                                                                                                                             | —                            | `apps/api/operations/tenant-work-limiter.ts`; `apps/api/app/create-api.ts`; `tests/unit/tenant-work-limiter.test.ts`; `tests/unit/api-answers.test.ts`; `tests/unit/b7-input-hardening.test.ts`                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                             |
| Spec 011 — piloto real controlado                                     | AC-1101–AC-1106                                                                                                                                                                             | —                            | Evidências pendentes: decisão de ambiente, política LGPD, testes no ambiente efetivo, termo de participação e checklist operacional; nenhuma entrada de dado real é autorizada enquanto estiver em rascunho.                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                |
| Spec 012 — painel administrativo da Zermatt                           | AC-1201–AC-1208                                                                                                                                                                             | —                            | `apps/api/admin/admin-dashboard.ts`; `apps/api/app/create-api.ts`; `apps/api/app/server.ts`; `apps/web/App.tsx`; `apps/web/styles.css`; `infrastructure/database/016_admin_dashboard_metrics.sql`; `infrastructure/database/017_admin_account_directory.sql`; `tests/unit/admin-dashboard.test.ts`; `tests/unit/admin-dashboard-ui.test.ts`; acesso restrito à conta administrativa confirmada.                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                             |
| Spec 015 — segurança e recuperação da conta                           | AC-1501–AC-1520                                                                                                                                                                             | —                            | `apps/api/identity/account-security.ts`; `apps/api/identity/account-security-crypto.ts`; `apps/api/identity/postgres-account-security.ts`; `apps/api/identity/account-action-delivery.ts`; `apps/api/app/create-api.ts`; `apps/api/app/server.ts`; `apps/web/App.tsx`; `apps/web/styles.css`; `infrastructure/database/027_account_security.sql`; `infrastructure/database/028_preserve_active_mfa_setup.sql`; `infrastructure/database/029_track_account_session_activity.sql`; `tests/unit/account-security.test.ts`; tokens de ação armazenados somente como hash, segredo TOTP cifrado, entrega externa bloqueada sem provedor aprovado e novas ativações de MFA indisponíveis enquanto houver somente prévia local de e-mail.                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                          |
| ADR 0012 — PostgreSQL remoto de staging                               | TLS, migrations ordenadas e credencial somente no servidor                                                                                                                                  | —                            | `scripts/database-migrations.ts`; `scripts/migrate-database.ts`; `package.json`; `.env.example`; `docs/adr/0012-postgresql-gerenciado-remoto.md`                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                            |
| ADR 0014 — painel administrativo minimizado                           | allowlist no servidor, agregação mínima e separação de finalidade                                                                                                                           | —                            | `docs/adr/0014-painel-administrativo-minimizado.md`; `apps/api/admin/admin-dashboard.ts`; `infrastructure/database/016_admin_dashboard_metrics.sql`; `tests/unit/admin-dashboard.test.ts`                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                   |

AC-912–AC-913 têm implementação vinculada à Spec 009 e à migration 023. A validação e normalização do perfil, assinaturas JPEG/PNG/WebP, tamanho, limite, capa, leitura, remoção e purge em memória são cobertos por `tests/unit/condominium-profile.test.ts` e `tests/unit/in-memory-condominium-profile.test.ts`. O adaptador PostgreSQL, o contrato de RLS/funções da migration e as rotas HTTP autorizadas são cobertos por `tests/unit/postgres-condominium-profile.test.ts`, `tests/unit/condominium-profile-migration.test.ts` e `tests/unit/api-condominium-profile.test.ts`. AC-914 descreve a navegação por abas das configurações; sua verificação automatizada permanece pendente.

Em 2026-10-06, a migration 024 corrigiu a permissão mínima do worker para ler e identificar
documentos apenas no `condominium_id` de processamento. `tests/unit/identity-migration.test.ts`
verifica os grants e policies, e `tests/integration/rls-tenant-isolation.test.ts` passou com 7/7
cenários no Neon sintético marcado, incluindo upload, processamento, recuperação isolada e
revogação de acesso.

Na primeira fatia do B4, a verificação determinística de RQ-004 também está em
`tests/unit/text-retrieval.test.ts`, `tests/unit/postgres-scoped-retrieval.test.ts` e
`tests/integration/rls-tenant-isolation.test.ts`. T401–T405 são exercitadas por
`tests/unit/retrieval-contract.test.ts`, `tests/unit/local-embedding.test.ts`,
`tests/unit/retrieval-ranking.test.ts` e `tests/unit/scoped-retrieval.test.ts`.

Para B5 e B6, a execução local de `pnpm run evals` aprovou 20/20 casos, com 14/14
casos P0 e 6/6 casos P1 aprovados. A última execução de `pnpm run test:coverage`
registrou 94,12% de statements, 86,49% de branches, 96,90% de functions e 94,07%
de lines. O banco PostgreSQL foi coberto por testes determinísticos do adaptador e a
migration 009 foi aplicada no Neon dedicado e sintético.

Em 2026-09-04, o Neon dedicado aplicou as migrations pendentes 007 e 008 e aprovou
`pnpm.cmd run test:integration`: 7/7 cenários de RLS e retrieval passaram.
Em 2026-09-09, a migration 009 foi aplicada no mesmo alvo e `pnpm run test:integration`
passou com 7/7 cenários; o setup dos fixtures passou a limpar as tabelas B6 antes das
tabelas documentais.

## Rastreamento da Fase 6

| Tarefa | Requisito/gate relacionado            | Evidência                                                                                                                                                                                             | Status                                                      |
| ------ | ------------------------------------- | ----------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | ----------------------------------------------------------- |
| T601   | RQ-011, AC-019                        | `apps/api/app/create-api.ts`; `apps/web/App.tsx`; `apps/api/answers/answer-trace.ts`; `tests/e2e/feedback-audit.e2e.test.ts`                                                                          | concluído — sintético/local                                 |
| T602   | RQ-012, TM-018, telemetria minimizada | `apps/api/answers/answer-trace.ts`; `apps/api/answers/postgres-answer-trace-store.ts`; `infrastructure/database/009_answers_feedback_and_audit.sql`; `tests/unit/postgres-answer-trace-store.test.ts` | concluído — adapter coberto; Neon não executado nesta etapa |
| T603   | gate de eval pelo caminho real        | `evals/synthetic-adapter.ts`; `tests/e2e/synthetic-evals.e2e.test.ts`                                                                                                                                 | concluído — sintético                                       |
| T604   | EVAL-001–EVAL-020                     | `evals/datasets/consulta-documental.yaml`; `tests/e2e/synthetic-evals.e2e.test.ts`                                                                                                                    | concluído — 20 casos                                        |
| T605   | thresholds P0/P1 e baseline           | `docs/quality/b6-synthetic-baseline-2026-09-10.md`; `evals/synthetic-adapter.ts`                                                                                                                      | concluído — P0 em 100%                                      |
| T606   | CI e release gate                     | `.github/workflows/ci.yml`; `package.json`; `docs/quality/quality-gates.md`                                                                                                                           | concluído — comando no CI                                   |
| T607   | AC-019, AC-020                        | `tests/e2e/feedback-audit.e2e.test.ts`; `tests/unit/answer-trace.test.ts`; `tests/unit/postgres-answer-trace-store.test.ts`                                                                           | concluído — sintético/local                                 |

## Rastreamento da preparação B7

| Tarefa | Requisito/gate relacionado                             | Evidência esperada                                                                                                                                                                                            | Status                                                                                              |
| ------ | ------------------------------------------------------ | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | --------------------------------------------------------------------------------------------------- |
| T701   | TM-001–TM-013, AC-002, AC-008, AC-013, AC-017, AC-021  | `docs/security/b7-threat-model-review.md`; `tests/unit/b7-input-hardening.test.ts`; suítes existentes de upload, isolamento e gateway                                                                         | concluído — piloto sintético                                                                        |
| T702   | TM-003, TM-004, TM-014, TM-015, TM-020; AC-003, AC-009 | `docs/security/b7-data-lifecycle-exercise.md`; `tests/unit/b7-data-lifecycle.test.ts`; E2E de revogação                                                                                                       | concluído — exercício sintético                                                                     |
| T703   | TM-011, TM-013, TM-016, TM-019                         | `docs/security/b7-incident-runbook.md`; `docs/security/b7-incident-exercise-2026-09-10.md`                                                                                                                    | concluído — piloto sintético                                                                        |
| T704   | RQ-005–RQ-010; EVAL-001–EVAL-019                       | `tests/e2e/synthetic-pilot.e2e.test.ts`; `apps/web/SyntheticReview.tsx`; `docs/release/b7-piloto-sintetico-2026-09-10.md`; `docs/reviews/b7-corpus-human-review-2026-09-10.md`; corpus e fixtures artificiais | concluído — 100 casos revisados; 100 aprovados; 0 para revisar; 0 reprovados, limitado ao sintético |
| T705   | gates de qualidade e release                           | `docs/reviews/b7-sintetico-2026-09-10.md`; `pnpm run check`; `pnpm run pilot:synthetic`; `pnpm run test:e2e`; `git diff --check`                                                                              | concluído — aprovação limitada ao sintético                                                         |
| T706   | RQ-1001, RQ-1002; AC-1001–AC-1004                      | `apps/api/operations/tenant-work-limiter.ts`; `tests/unit/tenant-work-limiter.test.ts`; `tests/unit/api-answers.test.ts`; `tests/unit/b7-input-hardening.test.ts`                                             | concluído — proteção local; não libera rollout externo                                              |

Os casos desta preparação são exclusivamente sintéticos. A conclusão acima não
autoriza dados reais, rollout externo ou integração. A Fase 6 e T704 estão concluídas
apenas no escopo sintético/local; T105 e T208 estão concluídas quanto à proteção
remota da `main`, sem autorizar dados reais ou produção.

## Rastreamento da proteção remota

| Tarefa | Evidência                                                                                                                                                                           | Status             |
| ------ | ----------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | ------------------ |
| T105   | Regra de proteção da `main` criada no GitHub em 2026-09-11; Pull Request, 1 aprovação, check `quality`, branch atualizada, conversas resolvidas, sem bypass, exclusão ou force-push | concluído — remoto |
| T208   | `.github/workflows/ci.yml` com check `quality` tornado obrigatório pela regra remota da `main`                                                                                      | concluído — remoto |

Em 2026-09-04, o Neon dedicado aplicou as migrations pendentes 007 e 008 e aprovou
`pnpm.cmd run test:integration`: 7/7 cenários de RLS e retrieval passaram.

Na fase inicial do B5, `tests/e2e/document-answer.e2e.test.ts` exercita o endpoint
autorizado de respostas com citação, abstenção e tentativa de acesso cruzado, usando
exclusivamente o corpus de desenvolvimento sintético.

A T507 concluiu a cobertura determinística de AC-010 a AC-018 e AC-021 nos testes
de respostas e gateway local. A Fase 6 adiciona feedback, trilha auditável e evals
sintéticos, mantendo o bloqueio para dados reais, rollout externo e seleção definitiva
de modelo até as revisões e gates correspondentes.

Em 2026-09-18, `pnpm run check` aprovou 58 arquivos e 314 testes após a integração
da autenticação persistente, da criação real de condomínios, do login Google, das
configurações do chat, da landing page responsiva e do runner remoto de migrations. A cobertura ficou em 89,11% de
statements, 80,36% de branches, 97,04% de functions e 90,42% de lines. A autenticação real ainda não foi
exercitada contra um banco local neste ambiente, pois Docker/PostgreSQL não está
disponível; a suíte usa o adaptador em memória e cobre o contrato das migrations.

Em 2026-09-22, `pnpm run check` aprovou 61 arquivos e 346 testes após a inclusão do
painel administrativo minimizado e do diretório operacional de contas. A cobertura
ficou em 89,30% de statements, 80,82% de branches, 96,17% de functions e 90,57% de
lines. As migrations 016 e 017 e o adaptador PostgreSQL foram verificados de forma
determinística. Em seguida, as duas migrations foram aplicadas ao banco remoto
controlado para habilitar a conta administrativa confirmada pelo usuário e listar no
máximo 100 contas ativas somente com nome e e-mail. A validação operacional não
consultou dados condominiais nem conteúdo documental.

Em 2026-09-22, a correção de roteamento de orientações operacionais da AC-408 foi
verificada por `pnpm run check`, com 61 arquivos e 348 testes aprovados e cobertura de
89,63% de statements, 81,25% de branches, 96,17% de functions e 90,93% de lines.
`pnpm run evals` também aprovou os 20 casos da Spec 001, incluindo 14/14 casos P0.

Na mesma data, a recuperação do login real após reinício foi verificada por
`pnpm run check`, com 61 arquivos e 349 testes aprovados e cobertura de 89,62% de
statements, 81,27% de branches, 96,18% de functions e 90,91% de lines. O caso de
regressão confirma que um cookie antigo não bloqueia `/health` nem `/v1/runtime`, e a
interface não rebaixa falha de conexão para demonstração. `pnpm run evals` permaneceu
com 20/20 casos aprovados e 14/14 P0.

Também em 2026-09-22, a linguagem da Cora foi ajustada para um tom cordial, simples e
pouco formal, sem gírias, linguagem infantil ou juridiquês. `pnpm run check` aprovou
62 arquivos e 350 testes, com cobertura de 89,62% de statements, 81,27% de branches,
96,18% de functions e 90,91% de lines. `pnpm run evals` permaneceu com 20/20 casos
aprovados e 14/14 P0.

Em 2026-09-23, o fluxo de consulta passou a buscar primeiro nos documentos para toda
pergunta substantiva. Evidência suficiente gera uma resposta formulada para a pergunta
com fonte destacada; ausência, baixa qualidade ou trecho tangencial geram orientação
geral identificada, sem citação nem regra local inventada. O transporte Gemini foi
movido para `generateContent`, conforme ADR 0015, depois que a API Interactions expirou
e o método suportado respondeu com o mesmo modelo. `pnpm run check` aprovou 62 arquivos
e 354 testes, com cobertura de 89,10% de statements, 80,52% de branches, 96,03% de
functions e 90,30% de lines. `pnpm run evals` aprovou 20/20 casos, incluindo 14/14 P0.
A verificação real com `gemini-3.5-flash-lite` e a pergunta sobre perturbação do sossego
foi concluída em cerca de nove segundos; a interface exibiu `Orientação geral`, risco
alto, limitação documental, indicação de advogado e zero fontes inventadas. Uma segunda
verificação, somente com evidência sintética, produziu `answerMode: grounded` e preservou
título, página 4 e trecho integral reconstruídos localmente.

Também em 2026-09-23, a retomada de um cadastro interrompido passou a reconhecer o
condomínio que já pertence à mesma conta e continuar o envio dos documentos, sem criar
outro condomínio ou outro vínculo. Um CNPJ pertencente a uma conta diferente continua
bloqueado sem revelar dados do cadastro existente. `pnpm run check` aprovou 62 arquivos
e 357 testes, com cobertura de 89,21% de statements, 80,57% de branches, 96,22% de
functions e 90,41% de lines.

Ainda em 2026-09-23, as configurações do condomínio passaram a listar somente os
documentos ativos do contexto autorizado, com tipo, versão mais recente, processamento
e vigência, e a permitir o envio confirmado de múltiplos PDFs. O catálogo usa o mesmo
escopo de membership e `condominium_id` do upload, com estados de carregamento, vazio e
falha na interface. `pnpm run check` aprovou 63 arquivos e 362 testes, com cobertura de
89,00% de statements, 80,18% de branches, 95,97% de functions e 90,18% de lines. A
verificação visual local confirmou a listagem e o formulário responsivo sem erros no
navegador.

Também em 2026-09-23, o modo real com e-mail e senha tornou-se o padrão obrigatório.
Sem `DATABASE_URL`, a API não inicia nem expõe dados sintéticos; a demonstração local
passou a exigir `DEMO_MODE=true` de forma explícita. `pnpm run check` aprovou 63 arquivos
e 363 testes, com cobertura de 89,01% de statements, 80,24% de branches, 95,97% de
functions e 90,20% de lines.

Na mesma data, a autenticação real passou a recuperar de forma automática e limitada
falhas temporárias de DNS, timeout e conexão encerrada. A retomada reconhece contas e
sessões que a própria tentativa anterior tenha criado, sem converter perda de confirmação
em duplicidade indevida; indisponibilidade persistente retorna `503` sem expor detalhes do
banco. `pnpm run check` aprovou 63 arquivos e 366 testes, com cobertura de 89,05% de
statements, 80,58% de branches, 95,74% de functions e 90,40% de lines. A verificação
final, incluindo a preservação do erro entre módulos, aprovou 367 testes e cobertura de
89,15% de statements, 80,39% de branches, 95,74% de functions e 90,50% de lines.

Também em 2026-09-23, o envio documental passou a declarar o cookie de mesma origem e,
após `401` ou `403`, revalidar o mesmo `condominium_id` antes de repetir o arquivo uma
única vez. A repetição só ocorre quando o servidor confirma `document:upload`; falhas de
armazenamento e negações persistentes não são repetidas. `pnpm run check` aprovou 64
arquivos e 370 testes, mantendo cobertura de 89,15% de statements, 80,39% de branches,
95,74% de functions e 90,50% de lines.

Em 2026-09-24, o chat passou a remover a resposta anterior da área ativa antes de
mostrar a espera da pergunta seguinte, mantendo cada resposta no turno correto e
confirmando o envio com um som curto que não bloqueia a requisição. Uma resposta
concluída com sucesso produz um segundo som, diferente do envio, sem transformar falhas
em confirmação de sucesso. Cumprimentos e perguntas sociais passaram a receber uma frase
curta, orientações gerais ficaram limitadas a três frases ou dois passos e a interface
deixou de repetir alertas e blocos vazios de fontes. O contrato Gemini passou a solicitar
somente o `evidenceId` de cada citação e a reconstruir localmente os metadados verificáveis,
reduzindo saída redundante sem alterar o grounding. O comando `pnpm run check` aprovou 65
arquivos e 375 testes, com cobertura de 89,16% de statements, 80,52% de branches, 95,75%
de functions e 90,47% de lines.

Na mesma data, o acesso às configurações no cabeçalho móvel recebeu um ícone de
engrenagem de 22 pixels, área de toque de 44 por 44 pixels, contraste reforçado e
espaçamento lateral seguro. A verificação visual em viewport de 390 por 844 pixels
confirmou o ícone centralizado e sem corte; `pnpm run check` permaneceu com 65 arquivos
e 375 testes aprovados.

Também em 2026-09-24, o RQ-014 e os AC-028, AC-509 e AC-510 passaram a reservar pontos
de atenção e próximo passo para abstenção, falha, conflito, risco alto, validação
profissional ou degradação relevante. Respostas documentais comuns de risco baixo ou
médio deixam esses campos vazios, e a interface reúne toda ressalva essencial no mesmo
cartão da resposta. A verificação determinística está em
`tests/unit/answer-use-case.test.ts`, `tests/unit/prompt-catalog.test.ts` e
`tests/unit/chat-turn-ui.test.ts`. `pnpm run check` aprovou 65 arquivos e 377 testes,
com cobertura de 89,28% de statements, 80,65% de branches, 95,94% de functions e
90,59% de lines. `pnpm run evals` aprovou 20/20 casos, incluindo 14/14 casos P0.

Ainda em 2026-09-24, o RQ-013 e os AC-025 e AC-406 passaram a exigir recuperação
limitada de falhas transitórias da Gemini antes do fallback. O gateway usa até três
tentativas dentro de um único orçamento de tempo, respeita `Retry-After` e não repete
falhas permanentes de autenticação ou configuração. O fallback documental deixou de
copiar blocos brutos: transforma valores e datas recuperados em frases curtas ou se
abstém quando não consegue formular uma conclusão completa sem distorcer a fonte. Os
testes de regressão estão em `tests/unit/gemini-answer-gateway.test.ts` e
`tests/unit/answer-gateway.test.ts`. `pnpm run check` aprovou 65 arquivos e 380 testes,
com cobertura de 89,29% de statements, 80,63% de branches, 95,70% de functions e
90,68% de lines. `pnpm run evals` aprovou 20/20 casos, incluindo 14/14 casos P0.

Também em 2026-09-24, o RQ-014 e o AC-511 calibraram a completude das respostas
substantivas. O prompt `answer-prompt-v14` elevou o limite de 70 para 90 palavras e
passou a pedir, depois da conclusão, um ou dois detalhes úteis sustentados, como
condição, prazo, exceção ou consequência, sem permitir introdução, repetição ou texto
de preenchimento. A regra está verificada em `tests/unit/prompt-catalog.test.ts`.
`pnpm run check` aprovou 65 arquivos e 380 testes, com cobertura de 89,29% de
statements, 80,63% de branches, 95,70% de functions e 90,68% de lines. `pnpm run
evals` aprovou 20/20 casos, incluindo 14/14 casos P0.

Ainda em 2026-09-24, o RQ-017 e o AC-029 definiram a legislação oficial compartilhada
como base principal das perguntas substantivas, sem misturá-la aos documentos privados
dos condomínios. A migration 018 cria fontes, versões, páginas e trechos legais somente
leitura para o runtime; a recuperação combinada identifica `legislation` e preserva o
escopo do condomínio na mesma consulta. O importador administrativo valida o domínio
oficial da Câmara, o PDF, o hash e a versão da Constituição atualizada até a EC 139/2026.
O prompt `answer-prompt-v15` exige diferenciar lei e documento interno e impede citação
legal irrelevante. `pnpm run check` aprovou 66 arquivos e 384 testes, com cobertura de
89,29% de statements, 80,72% de branches, 95,70% de functions e 90,68% de lines.
`pnpm run evals` aprovou 20/20 casos, incluindo 14/14 casos P0. Após confirmação
explícita, a migration 018 foi aplicada no banco remoto e o PDF oficial foi importado
como versão 1, com 152 páginas e 529 trechos pesquisáveis. Uma consulta de leitura
confirmou a versão vigente e recuperou, na página 3, o trecho constitucional sobre o
direito de propriedade. A API foi reiniciada e o endpoint de saúde confirmou o modo
real de autenticação e o provedor Gemini.

## Regra de manutenção

## Rastreamento da Spec 013 — Leitura integral de PDFs

Ampliação de avaliação — Spec 063: RQ-6301–6304 / AC-6301–6305 →
`evals/full-page-documents/`, corpus em `tests/fixtures/full-page-documents.ts` e regressões em
`tests/unit/full-page-document-evals.test.ts`. Comando `pnpm run evals:full-pages`: plano sem
chamadas; execução explícita Luna high/Sol 6.1 low, 35 PDFs e 80 perguntas por modelo, snapshot,
checkpoints, respostas e evidências preservadas. Gabaritos separados e checks factuais sem
aprovação semântica automática. Rodada concluída em 03/11/2026, 160/160 respostas e revisão
técnica por IA: Luna 72 satisfatórias / 5 parciais / 3 falhas; Sol 75 / 2 / 3. Pendências e
limites em `docs/specs/063-evals-pdfs-preenchidos/results-2026-11-03.md`.

Ampliação solicitada em 03/11/2026: RQ-1307 / AC-1309 →
`tests/fixtures/full-page-documents.ts` e
`tests/e2e/full-page-document-ingestion.e2e.test.ts`, comando
`pnpm run test:documents:full-pages`. Matriz de 35 PDFs / 80 páginas A4 preenchidas
(20 × 1, 10 × 2, 5 × 8), envio e recuperação binária por HTTP, storage privado local,
completude, reconstrução integral dos chunks e 240 consultas com fontes e isolamento.
Somente conteúdo fictício, sem provedor; catálogo/índice em memória. Validado em 03/11/2026:
35/35 casos e 1.811/1.811 testes na regressão com cobertura. Resultados e limites em
`docs/specs/013-leitura-integral-pdf/results-2026-11-03.md`.

| Requisito/critério        | Evidência                                                                                                                                                                                        | Status                                                                             |
| ------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------ | ---------------------------------------------------------------------------------- |
| RQ-1301, AC-1301, AC-1307 | `apps/api/documents/extract-pdf-text.ts`; `apps/api/documents/document-processing.ts`; `infrastructure/database/019_document_extraction_completeness.sql`; `tests/unit/extract-pdf-text.test.ts` | implementado — páginas, hash, limite de 500 e falha recuperável                    |
| RQ-1302, AC-1302          | `apps/api/documents/extract-pdf-text.ts`; `tests/unit/extract-pdf-text.test.ts`                                                                                                                  | implementado — quebras de linha preservadas                                        |
| RQ-1303, AC-1303, AC-1304 | `apps/api/documents/document-processing.ts`; `apps/api/documents/ocr-quality.ts`; `tests/unit/document-processing.test.ts`                                                                       | implementado — completude e OCR insuficiente mantêm revisão                        |
| RQ-1304, AC-1305          | `apps/api/documents/document-catalog.ts`; `apps/api/documents/postgres-document-upload-repository.ts`; `apps/web/App.tsx`; `tests/unit/document-catalog.test.ts`                                 | implementado — catálogo exibe leitura e páginas a revisar                          |
| RQ-1305, AC-1306, AC-1308 | `apps/api/documents/postgres-document-upload-repository.ts`; `apps/api/documents/postgres-document-processing-repository.ts`; `tests/unit/postgres-document-adapters.test.ts`                    | implementado — resumo escopado por condomínio; OCR indisponível não publica pronto |

Em 2026-10-05, a Spec 013 elevou o limite de PDF para 25 MB, preservando o máximo de 500 páginas. A migration 019 mantém o resumo de extração por versão documental e bloqueia o estado `ready` quando as contagens não indicam completude.

## Rastreamento da Spec 014 — Interpretação visual de fotos

| Requisito                           | Evidência esperada                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                          | Status                                                                                                                                                                                                                                                            |
| ----------------------------------- | --------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | ----------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| RQ-1401, AC-1401–1402               | `apps/web/App.tsx`; `apps/web/document-upload-request.ts`; `tests/unit/chat-document-upload-ui.test.ts`; `tests/unit/web-document-upload.test.ts`                                                                                                                                                                                                                                                                                                                                                                           | implementado e testado localmente; ainda depende da migration 025 para ativação persistente                                                                                                                                                                       |
| RQ-1402, AC-1403                    | `apps/api/documents/upload-document.ts`; `infrastructure/database/025_document_photo_analysis.sql`; `tests/unit/upload-document.test.ts`                                                                                                                                                                                                                                                                                                                                                                                    | validadores implementados; migration aplicada e schema conferido por leitura; teste de integração PostgreSQL não executado                                                                                                                                        |
| RQ-1403–1404, AC-1404–1406, AC-1409 | `apps/api/documents/gemini-image-analysis.ts`; `apps/api/retrieval/gemini-multimodal-embedding.ts`; `apps/api/documents/postgres-document-processing-repository.ts`; `apps/api/worker/worker.ts`; `tests/unit/gemini-visual-image.test.ts`; `tests/unit/persisted-processing.test.ts`                                                                                                                                                                                                                                       | implementado e testado com imagens sintéticas/fetch simulado; provedor real não chamado                                                                                                                                                                           |
| RQ-1405–1407, AC-1407–1408          | `apps/api/retrieval/postgres-scoped-retrieval.ts`; `apps/api/documents/document-processing.ts`; `tests/unit/postgres-scoped-retrieval.test.ts`; `tests/unit/document-processing.test.ts`                                                                                                                                                                                                                                                                                                                                    | implementado e testado; consulta PostgreSQL real pendente                                                                                                                                                                                                         |
| RQ-1409–1412, AC-1410–1414          | `infrastructure/database/026_document_derived_data_retention.sql`; `apps/api/documents/postgres-document-retention-repository.ts`; `apps/api/documents/postgres-document-upload-repository.ts`; `apps/api/answers/postgres-answer-persistence.ts`; `apps/web/App.tsx`; `tests/unit/document-retention-migration.test.ts`; `tests/unit/postgres-answer-persistence.test.ts`; `tests/unit/postgres-document-retention-repository.test.ts`; `tests/unit/postgres-document-adapters.test.ts`; `tests/unit/chat-turn-ui.test.ts` | implementado: purge remove arquivo e índice após 30 dias, preservando mensagens, respostas, feedback e citações históricas; testes automatizados aprovados; migration não aplicada nem validada em PostgreSQL; backups/restore e dados reais continuam bloqueados |

Verificação local em 2026-10-07: 77 arquivos e 451 testes passaram; cobertura geral 88,41% statements, 80,85% branches, 95,11% functions e 90,11% lines. Lint, formatação, build Web, gates de spec, scanner de segredos e typecheck de `apps/` passaram; o typecheck integral continua falhando em callbacks implicitamente `any` preexistentes de diversos testes fora desta funcionalidade. Evals sintéticos: 20/20, incluindo 14/14 P0. A migration 025 foi aplicada ao Neon configurado com o marcador `synthetic-only`, compartilhado com a prévia local, após autorização explícita; uma consulta de leitura confirmou o registro, as colunas e as restrições. A suíte de integração não foi executada porque trunca fixtures e a base contém dados da prévia. O provedor Gemini não foi chamado e dados reais/pilotos seguem bloqueados.

Verificação da retenção em 2026-10-07: suíte completa passou, 78 arquivos e 457 testes, com 88,43% statements, 80,86% branches, 95,11% functions e 90,13% lines; evals sintéticos passaram 20/20, sem chamadas ao provedor. Formatação, lint, build web, scanner de segredos, gate de visão e `git diff --check` passaram. O typecheck integral continua falhando somente por parâmetros implicitamente `any` em testes preexistentes de outras funcionalidades; nenhum erro de typecheck apareceu nos arquivos alterados nesta tarefa. A migration 026 não foi aplicada nem validada em PostgreSQL e nenhuma base/prévia foi alterada; a integração da prévia contém dados e o comando de integração trunca fixtures. A exclusão lógica no banco ativo não cobre snapshots/WAL/backups do provedor nem replay externo após restore; dados reais/pilotos seguem bloqueados.

Verificação da segurança da conta em 2026-10-08: suíte completa passou, 80 arquivos e 476 testes,
com 88,50% statements, 81,24% branches, 95,34% functions e 90,48% lines. Lint, formatação,
build web, scanner de segredos, gate de visão e `git diff --check` passaram. O fluxo integrado
sintético confirmou cadastro 202 sem o antigo 503, link local de verificação, confirmação 204,
login 200 e sessão listada. As migrations 027–029 foram aplicadas ao banco controlado configurado;
elas protegem tokens por hash, segredo TOTP cifrado, MFA ativo contra reconfiguração silenciosa e
atualização de atividade por sessão. O typecheck integral mantém 43 erros preexistentes em testes
de outras funcionalidades; nenhum erro apareceu nos arquivos desta entrega. Produção continua sem
envio real de e-mail até aprovação de um provedor e dados reais/piloto permanecem bloqueados.

Ainda em 2026-10-08, a simplificação do MFA foi verificada por `pnpm run check`: 80 arquivos e 477
testes passaram, com 88,52% de statements, 81,30% de branches, 95,34% de functions e 90,49% de
lines. O gate incluiu formatação, lint, typecheck, cobertura, alinhamento da visão e scanner de
segredos. Os 22 cenários E2E também passaram e o cliente web compilou. Testes determinísticos
confirmaram que a prévia local de e-mail informa `mfaEnrollmentAvailable: false`, bloqueia setup e
ativação com `503` e mantém desafio, acesso e desativação para contas que já tinham MFA ativo. Não
houve mudança de schema, uso de dados reais nem chamada a provedor externo.

Ainda em 2026-10-08, a regressão da consulta de atas foi corrigida no caminho completo de upload e
pergunta. O gateway local passou a priorizar a linha eleitoral em vez de uma lista de perguntas do
próprio PDF, extrair nome e período do mandato e citar a página correta. Quando o provedor principal
se abstém, a extração local só o substitui se encontrar esse fato eleitoral determinístico; nos demais
casos, a abstenção segura é preservada. A busca de perguntas sobre síndico e mandato também reduz a
consulta aos termos que aparecem na ata, evitando que o PostgreSQL selecione apenas o anexo com a
lista de perguntas e exclua a página da eleição. Similaridades cosseno negativas retornadas pelo banco são
normalizadas para zero antes da persistência, preservando o contrato de score entre 0 e 1. A suíte completa
aprovou 80 arquivos e 482 testes, com 88,75% de statements, 81,66% de branches, 95,71% de functions
e 90,72% de lines; formatação, lint, typecheck, gate de visão e scanner de segredos passaram. A
validação manual no aplicativo local, com conta, condomínio e documento exclusivamente sintéticos,
confirmou a resposta fundamentada e a citação da página 3 no ambiente persistente configurado.

Ainda em 2026-10-08, o teste manual de abstenção identificou que uma orientação geral podia afirmar
categoricamente a inexistência de protocolo local sem evidência. A validação posterior passou a remover
esse tipo de afirmação e preservar somente a orientação prática segura; a limitação da busca continua
visível, sem citação. A regressão sintética está em `tests/unit/answer-use-case.test.ts` e cobre RQ-007,
AC-014 e AC-028. O gate completo aprovou 80 arquivos e 483 testes, com 88,77% de statements,
81,66% de branches, 95,73% de functions e 90,74% de lines; formatação, lint, typecheck, alinhamento
da visão e scanner de segredos também passaram. As 20 evals sintéticas passaram, incluindo todos
os 14 casos P0, sem custo estimado de provedor.

## Spec 016 — chat único, Bloco 1

| Requisito                                                        | Critérios de aceitação | Evidência determinística                                                                                                                                                  |
| ---------------------------------------------------------------- | ---------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| RQ-1601 e RQ-1605 — entrada direta e ausência de telas paralelas | AC-1601 e AC-1606      | `apps/web/App.tsx`; `apps/web/main.tsx`; `tests/unit/chat-single-page.test.ts`                                                                                            |
| RQ-1602 — contexto automático e seguro                           | AC-1602 e AC-1603      | `GET /v1/chat/bootstrap`; `tests/unit/chat-bootstrap.test.ts`; testes existentes de autorização e RLS                                                                     |
| RQ-1603 — conversa documental                                    | AC-1604                | `apps/web/App.tsx`; `tests/unit/chat-turn-ui.test.ts`; `tests/e2e/document-answer.e2e.test.ts`                                                                            |
| RQ-1604 — documento no chat                                      | AC-1605                | `apps/web/document-upload-request.ts`; `tests/unit/chat-document-upload-ui.test.ts`; `tests/unit/web-document-upload.test.ts`; `tests/e2e/document-ingestion.e2e.test.ts` |
| Layout responsivo e acessível                                    | AC-1607                | `apps/web/styles.css`; `tests/unit/chat-single-page.test.ts`; build do cliente                                                                                            |
| RQ-1606 — reduzir em 10% a tipografia das falas da Alvitra       | AC-1608                | `apps/web/styles.css`; escala anterior multiplicada por 0,9                                                                                                              |

A Spec 016 substitui somente a experiência de telas das Specs 003, 006, 007, 008, 009, 012 e 015. Controles internos de autorização, sessão, tenant, auditoria, retenção e migrations são
preservados porque continuam protegendo o núcleo documental e preparam capacidades posteriores.
Os Blocos 2–6 foram autorizados explicitamente pelo usuário. Os Blocos 7 e 8 permanecem fora do
escopo até nova autorização explícita.

## Spec 018 — múltiplos chats e barra lateral, Bloco 3

| Requisito                                             | Critérios de aceitação | Evidência de verificação                                                                                                            |
| ----------------------------------------------------- | ---------------------- | ----------------------------------------------------------------------------------------------------------------------------------- |
| RQ-1701 — barra recolhida e responsiva                | AC-1701 e AC-1702      | `apps/web/App.tsx`; `apps/web/styles.css`; `tests/unit/chat-sidebar-ui.test.ts`                                                     |
| RQ-1702 — criar, alternar, nomear, renomear e excluir | AC-1703 e AC-1704      | `apps/web/conversation-title.ts`; `apps/web/App.tsx`; `tests/unit/conversation-title.test.ts`; `tests/unit/chat-sidebar-ui.test.ts` |
| RQ-1703 — contrato documental preservado              | AC-1703 e AC-1705      | `apps/web/App.tsx`; `tests/unit/chat-sidebar-ui.test.ts`; testes existentes da Spec 016 e de autorização/RLS                        |

O Bloco 3 não persiste a organização de chats, nem remove registros documentais. Essa decisão evita
introduzir armazenamento de conteúdo ou metadados sem modelagem explícita de tenant, RLS, retenção e auditoria.

Ajuste verificado em 2026-10-13: a primeira pergunta substantiva agora recebe um título curto
derivado localmente do assunto; saudações são ignoradas, títulos longos são cortados entre palavras
e a renomeação manual permanece disponível. O gate completo aprovou 83 arquivos e 486 testes, com
88,52% de statements, 81,47% de branches, 95,49% de functions e 90,54% de lines. O build web, o
gate de visão para 24 specs, o scanner de segredos e a conferência visual local também passaram.

Verificação do Bloco 1 em 2026-10-09: 78 arquivos e 464 testes passaram. A cobertura atingiu
88,59% de statements, 81,49% de branches, 95,45% de functions e 90,58% de lines. Os 23 cenários
E2E, o build web, a formatação, o lint, o scanner de segredos, o gate de visão para 16 specs e
`git diff --check` passaram. O typecheck estrito dirigido aos arquivos alterados passou. O
typecheck integral continua apontando parâmetros implicitamente `any` preexistentes em testes não
relacionados ao Bloco 1; nenhuma asserção ou regra de compilação foi enfraquecida.

## Spec 017 — personalidade da Alvitra, Bloco 2

| Requisito                                        | Critérios de aceitação | Evidência determinística                                                                                                                                                                                                |
| ------------------------------------------------ | ---------------------- | ----------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| RQ-1701 e RQ-1702 — tom e franqueza útil         | AC-1701–AC-1703        | `apps/api/answers/prompt-catalog.ts`; `tests/unit/prompt-catalog.test.ts`; `tests/unit/gemini-answer-gateway.test.ts`                                                                                                   |
| RQ-1703 e RQ-1704 — verdade documental e limites | AC-1704–AC-1705        | `apps/web/answer-presentation.ts`; `apps/web/App.tsx`; `tests/unit/chat-turn-ui.test.ts`; testes de grounding, citações, conflitos, abstenção e risco existentes; `tests/unit/prompt-catalog.test.ts`; evals sintéticos |
| RQ-1705 — aprovação antes de aplicação           | AC-1706                | `docs/specs/017-personalidade-alvitra/system-prompt.md`; versão `answer-prompt-v16`                                                                                                                                     |

O usuário aprovou o prompt em 2026-10-09. Ele foi aplicado ao gateway na versão
`answer-prompt-v16`; a verificação inclui testes determinísticos e evals sintéticos.

Em 2026-10-13, a apresentação de respostas sem evidência foi simplificada: o modo interno de
abstenção e a explicação natural permanecem, enquanto a interface deixou de exibir etiquetas
técnicas ou repetir a limitação em um bloco automático de atenção. O gate completo aprovou 82
arquivos e 482 testes, com 88,52% de statements, 81,47% de branches, 95,49% de functions e 90,54%
de lines. O build web, o gate de visão para 24 specs e a conferência visual local também passaram.

## Spec 019 — menu contextual, Bloco 4

| Requisito                         | Critérios de aceitação | Evidência de verificação                                                                                        |
| --------------------------------- | ---------------------- | --------------------------------------------------------------------------------------------------------------- |
| RQ-1901 — menu contextual         | AC-1901                | `apps/web/App.tsx`; `apps/web/styles.css`; `tests/unit/account-menu-ui.test.ts`                                 |
| RQ-1902 — condomínios autorizados | AC-1902 e AC-1903      | `GET /v1/chat/condominiums`; `GET /v1/condominiums/:condominiumId/context`; `tests/unit/chat-bootstrap.test.ts` |
| RQ-1903 — criação pela conversa   | AC-1904                | `apps/web/App.tsx`; `tests/unit/account-menu-ui.test.ts`                                                        |

## Spec 020 — documentos sob demanda, Bloco 6

| Requisito                                                         | Critérios de aceitação | Evidência de verificação                                                                                  |
| ----------------------------------------------------------------- | ---------------------- | --------------------------------------------------------------------------------------------------------- |
| RQ-2001 e RQ-2002 — envio posterior e pedido contextual           | AC-2001 e AC-2002      | `apps/api/answers/prompt-catalog.ts`; `tests/unit/prompt-catalog.test.ts`; testes de abstenção existentes |
| RQ-2003 — memória autorizada                                      | AC-2003                | `apps/web/document-upload-request.ts`; testes de upload, vetorização, autorização e RLS existentes        |

## Spec 023 — base para níveis da conta, Bloco 8

| Requisito                 | Critérios de aceitação | Evidência de verificação                                                                                                             |
| ------------------------- | ---------------------- | ------------------------------------------------------------------------------------------------------------------------------------ |
| Campo e cálculo ajustável | AC-2101 e AC-2102      | `infrastructure/database/030_account_level_foundation.sql`; `apps/api/identity/account-level.ts`; `tests/unit/account-level.test.ts` |

## Spec 022 — raio-X de balancetes, Bloco 7

| Requisito                                 | Critérios de aceitação | Evidência de verificação                                                                                                     |
| ----------------------------------------- | ---------------------- | ---------------------------------------------------------------------------------------------------------------------------- |
| RQ-2201 — raio-X orientado por evidência  | AC-2201                | `skills/alvitra-balancete-analysis/SKILL.md`; `apps/api/answers/prompt-catalog.ts`; `tests/unit/prompt-catalog.test.ts`      |
| RQ-2202 — comparação prudente             | AC-2202                | `apps/api/answers/prompt-catalog.ts`; `tests/unit/prompt-catalog.test.ts`                                                    |
| RQ-2203 — limites financeiros e evidência | AC-2203                | `apps/api/answers/prompt-catalog.ts`; contrato de citações, risco e abstenção existente; `tests/unit/prompt-catalog.test.ts` |

## Spec 021 — perfil pela conversa, Bloco 5

| Requisito                             | Critérios de aceitação | Evidência determinística                                                                                                                                         |
| ------------------------------------- | ---------------------- | ---------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| RQ-2001 — coleta natural              | AC-2001                | `apps/api/answers/prompt-catalog.ts`; `tests/unit/prompt-catalog.test.ts`                                                                                        |
| RQ-2002 — confirmação explícita       | AC-2002                | `apps/api/identity/condominium-profile.ts`; `tests/unit/condominium-profile.test.ts`                                                                             |
| RQ-2003 — perfil autorizado e isolado | AC-2003                | `apps/api/app/create-api.ts`; `apps/api/identity/condominium-profile.ts`; `tests/unit/condominium-profile.test.ts`; `tests/unit/api-condominium-profile.test.ts` |

## Spec 024 — jornada inicial conversacional

| Requisito                                        | Critérios de aceitação | Evidência determinística                                                                                                                                                         |
| ------------------------------------------------ | ---------------------- | -------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| RQ-2401 — entrada mínima separada                | AC-2401                | `apps/web/App.tsx`; `apps/web/styles.css`; `tests/unit/chat-single-page.test.ts`                                                                                                 |
| RQ-2402 e RQ-2403 — cadastro guiado pela Alvitra | AC-2402 e AC-2403      | `apps/web/App.tsx`; `apps/api/answers/setup-message.ts`; `apps/api/app/create-api.ts`; `tests/unit/conversational-setup-ui.test.ts`; testes de criação real e de desenvolvimento |
| RQ-2403 — documentos necessários, enviados depois | AC-2404               | `apps/api/answers/setup-message.ts`; `apps/api/answers/prompt-catalog.ts`; `apps/web/App.tsx`; `tests/unit/setup-message.test.ts`; `tests/unit/conversational-setup-ui.test.ts`; testes existentes de upload e vetorização |
| RQ-2404 — documentos organizados em Perfil      | AC-2405                | `GET /v1/chat/condominiums`; `GET /v1/condominiums/:condominiumId/documents`; `apps/web/App.tsx`; `tests/unit/account-menu-ui.test.ts`; testes de autorização/RLS                |
| RQ-2405 — tela documental do condomínio atual    | AC-2406                | `apps/web/App.tsx`; `apps/web/styles.css`; `tests/unit/account-menu-ui.test.ts`; contratos de autorização/RLS existentes                                                         |
| RQ-2406 — continuidade conversacional            | AC-2407                | `apps/web/App.tsx`; `tests/unit/conversational-setup-ui.test.ts`; `tests/unit/chat-bootstrap.test.ts`                                                                            |

A apresentação das mensagens da Alvitra prevista em RQ-2402 e AC-2402 é verificada por
`tests/unit/conversational-setup-ui.test.ts`: sem rótulo repetido de autoria, com fundo
transparente, tipografia editorial e linha lateral anil alinhada à esquerda. A troca entre uma
saudação do síndico e a resposta da Alvitra também foi conferida no navegador local em viewport
móvel.

Verificação da Spec 024 em 2026-10-09: 82 arquivos e 480 testes passaram. A cobertura atingiu
88,51% de statements, 81,45% de branches, 95,49% de functions e 90,53% de lines. Os 23 cenários
E2E, o build web, a formatação, o lint, o gate de visão para 24 specs, o scanner de segredos e
`git diff --check` passaram. O typecheck integral mantém erros `implicit any` preexistentes em testes
não relacionados; nenhum erro apareceu nos arquivos alterados. A validação manual no navegador
local configurou dois condomínios sintéticos em sequência, continuou sem documentos e confirmou
“Dados” agrupando documentos autorizados por tipo e condomínio.

Ajuste da jornada em 2026-10-13: a pergunta seguinte à quantidade passou a ser calculada por
`apps/web/setup-conversation.ts`. O caso de um condomínio segue direto ao nome, sem “um por vez” ou
“1 de 1”; o caso com três mantém a sequência e mostra “1 de 3”. A suíte completa aprovou 82 arquivos
e 481 testes, com 88,51% de statements, 81,45% de branches, 95,49% de functions e 90,53% de lines.
Build web, lint, formatação, typecheck, gate de visão, scanner de segredos e validação manual dos dois
caminhos no navegador local passaram.

## Spec 025 — demonstração online sintética no Render

| Requisito                              | Critérios de aceitação | Evidência determinística                                      |
| -------------------------------------- | ---------------------- | ------------------------------------------------------------- |
| RQ-2501 — demonstração sem dados reais | AC-2501                | `render.yaml`; `apps/api/app/server.ts`; ADR 0021             |
| RQ-2502 — mesma origem                 | AC-2502                | `apps/api/app/web-assets.ts`; `tests/unit/web-assets.test.ts` |
| RQ-2503 — implantação verificável      | AC-2503                | `render.yaml`; `/health`; `tests/unit/server.test.ts`         |

## Spec 026 — conversa aberta e contextual

| Requisito                          | Critérios de aceitação     | Evidência planejada                                                                                                                                                                                                                                                                                                                                |
| ---------------------------------- | -------------------------- | -------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| RQ-2601 — mensagens geradas        | AC-2601 e AC-2606          | `apps/api/answers/setup-message.ts`; `apps/api/answers/setup-turn.ts`; `apps/api/answers/prompt-catalog.ts`; `apps/web/App.tsx`; `tests/unit/setup-message.test.ts`; `tests/unit/setup-turn.test.ts`; `tests/unit/api-setup-message.test.ts`                                                                                                           |
| RQ-2602 — perguntas abertas        | AC-2602 e AC-2603          | `apps/api/answers/prompt-catalog.ts`; `apps/api/answers/openai-answer-gateway.ts`; `tests/unit/prompt-catalog.test.ts`; evals novos pendentes                                                                                                                                                                                                      |
| RQ-2603 — fatos locais e anexos    | AC-2604, AC-2607 e AC-2608 | `apps/api/answers/answer-use-case.ts`; `tests/unit/openai-answer-gateway.test.ts`; testes existentes de isolamento e anexos; evals novos pendentes                                                                                                                                                                                                 |
| RQ-2604 — franqueza construtiva    | AC-2605                    | `apps/api/answers/prompt-catalog.ts`; evals de tom e firmeza pendentes                                                                                                                                                                                                                                                                             |
| RQ-2605 — provedores e validação   | AC-2606, AC-2607 e AC-2609 | `apps/api/answers/openai-answer-gateway.ts`; `apps/api/answers/gemini-answer-gateway.ts`; `apps/api/answers/answer-gateway.ts`; `apps/api/app/server.ts`; `tests/unit/openai-answer-gateway.test.ts`; `tests/unit/gemini-answer-gateway.test.ts`; ADRs 0022–0023                                                                                   |
| RQ-2606 — fotos durante a migração | AC-2609                    | `apps/api/documents/openai-image-analysis.ts`; `apps/api/documents/gemini-image-analysis.ts`; `apps/api/retrieval/openai-image-embedding.ts`; `apps/api/retrieval/gemini-multimodal-embedding.ts`; `apps/api/retrieval/postgres-scoped-retrieval.ts`; `tests/unit/openai-visual-image.test.ts`; `tests/unit/gemini-visual-image.test.ts`; ADR 0023 |

O prompt da Spec 026 foi aprovado em 2026-10-15 e incorporado à versão `answer-prompt-v22`.
O adaptador foi verificado por transporte simulado; ativação com dados reais, evals novos e
verificação ao vivo do provedor permanecem pendentes.
Na migração gradual para OpenAI, os adaptadores dos dois provedores foram preservados e verificados
com transporte simulado; a reindexação de fotos antigas, a verificação ao vivo e os evals
específicos de recuperação visual permanecem pendentes. O runtime prefere OpenAI quando
configurada e usa Gemini como alternativa temporária, sem misturar perfis vetoriais.

Em 2026-10-15, após a decisão explícita de não excluir a Gemini, o gateway de resposta, a análise
visual e o embedding Gemini foram preservados no runtime. Uma verificação local real confirmou
`aiProvider: gemini` e gerou com sucesso a pergunta inicial da Alvitra sem expor a chave. O gate
`pnpm run check` aprovou 89 arquivos e 516 testes, com 88,00% de statements, 80,46% de branches,
95,37% de functions e 90,15% de lines; o build web também passou. Dados reais continuam bloqueados.

Ainda em 2026-10-15, a validação do nome de tratamento passou a rejeitar saudações e respostas
genéricas antes de persistir o perfil, além de entender construções naturais de apresentação.
Perfis locais incompletos gravados anteriormente com “olá” como nome deixam de ser restaurados e
retornam à pergunta correta. Saudações recebem uma resposta cordial antes da nova pergunta, sem
exemplos ou nomes sugeridos. A regressão está coberta em `tests/unit/development-identity.test.ts`,
`tests/unit/conversational-setup-ui.test.ts` e `tests/unit/setup-message.test.ts`.
Em 2026-10-15, `pnpm run check` passou: cobertura 88,09% em statements, 80,54% em branches,
95,74% em functions e 90,13% em lines; `pnpm run test:e2e` passou 23 testes, `pnpm run evals`
passou 20 casos sintéticos e `pnpm run build:web` concluiu. Não houve chamada paga ao provedor.
Após a correção da resposta a saudações, o gate completo passou novamente com 89 arquivos e 519
testes, cobertura de 87,98% em statements, 80,44% em branches, 95,37% em functions e 90,13% em
lines. O build web também passou, e a jornada foi conferida no navegador local: ao receber “Olá”,
a Alvitra respondeu à saudação antes de perguntar o nome, sem exemplos ou nomes sugeridos.
Na verificação sintética desta implementação, `pnpm run check` passou com 505 testes e cobertura
de 87,93% em statements, 80,02% em branches, 95,30% em functions e 90,08% em lines. O build web,
23 cenários E2E e os 20 evals sintéticos existentes também passaram. Nenhuma chamada paga ao
provedor foi executada.

Em 2026-10-15, a orientação documental foi corrigida para distinguir necessidade de envio imediato
de necessidade para uma conclusão local: o cadastro continua sem anexos, mas a Alvitra informa que
os documentos relevantes são necessários para conhecer o condomínio e podem ser enviados depois,
aos poucos. O prompt `answer-prompt-v22` proíbe chamar esses documentos de opcionais e mantém apenas
orientação geral enquanto a evidência local não chega. `pnpm run check` aprovou 90 arquivos e 528
testes, com cobertura de 87,99% em statements, 81,06% em branches, 95,44% em functions e 90,35% em
lines. O build web, os 23 testes E2E e os 20 evals sintéticos também passaram.

## Spec 027 — identidade provisória e cadastro único

| Requisito                                        | Critérios de aceitação | Evidência determinística                                                                                                                         |
| ------------------------------------------------ | ---------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------ |
| RQ-2701 — entrada provisória transparente        | AC-2701                | `apps/web/App.tsx`; `apps/web/styles.css`; `tests/unit/chat-single-page.test.ts`                                                                 |
| RQ-2702 — identidade sintética estável e isolada | AC-2702 e AC-2705      | `apps/web/development-identity.ts`; `tests/unit/development-identity.test.ts`; testes de autorização existentes                                  |
| RQ-2703 — cadastro uma única vez                 | AC-2703                | `apps/api/answers/setup-turn.ts`; `apps/api/app/create-api.ts`; `apps/web/App.tsx`; `tests/unit/setup-turn.test.ts`; `tests/unit/api-setup-message.test.ts`; `tests/unit/conversational-setup-ui.test.ts`; `tests/unit/chat-bootstrap.test.ts` |
| RQ-2704 — tratamento pelo nome                   | AC-2704                | `apps/api/answers/answer-use-case.ts`; `apps/api/answers/setup-message.ts`; `tests/unit/api-answers.test.ts`; `tests/unit/setup-message.test.ts` |

A interpretação conversacional de RQ-2703 é feita pelo modelo a partir da etapa e do histórico
recente, com decisão estruturada validada no servidor. O navegador não classifica a intenção por
frases ou palavras-chave. `tests/unit/setup-turn.test.ts`, `tests/unit/api-setup-message.test.ts` e
`tests/unit/conversational-setup-ui.test.ts` cobrem pedidos de exemplo que permanecem na pergunta,
números por extenso, correção de nome durante outra etapa, limites dos campos e remoção de marcas de
Markdown antes da exibição. `tests/unit/development-identity.test.ts` limita-se a validar valores já
confirmados antes de persistir o perfil local.
Na verificação de 2026-10-15, `pnpm run check` aprovou 90 arquivos e 527 testes, com cobertura de
87,99% em statements, 81,06% em branches, 95,44% em functions e 90,35% em lines. O build web e os
23 testes E2E também passaram, assim como os 20 evals sintéticos. A jornada foi conferida com o
provedor configurado no navegador local: um pedido de exemplo recebeu explicação sem virar nome;
uma dúvida sobre o motivo da pergunta permaneceu na etapa; “Cuido de dois hoje” foi interpretado
como quantidade; e uma correção de nome retomou a pergunta de condomínio sem perder o contexto.
Na verificação de 2026-10-15, `pnpm run check` aprovou 89 arquivos e 520 testes, com cobertura de
87,96% em statements, 80,42% em branches, 95,37% em functions e 90,11% em lines. O build web e os
23 testes E2E também passaram. O fluxo foi conferido no navegador local com pedido de exemplo,
declaração inicial e correção do nome no meio da configuração.

Verificação da Spec 027 em 2026-10-15: depois de separar o nome de usuário do nome de tratamento, 41
testes focados em sete arquivos passaram. No gate completo, 87 arquivos e 501 testes passaram, com
88,04% de statements, 80,31% de branches, 95,74% de functions e 90,08% de lines. Também passaram o
build web, a formatação, o lint, a tipagem, o gate de visão das 27 specs e o scanner de segredos.

- Novo requisito exige ao menos um critério de aceitação.
- Requisito de segurança exige teste determinístico.
- Comportamento probabilístico exige eval.
- Nenhum requisito pode ser marcado como entregue enquanto sua evidência de verificação estiver ausente.

## Correções de segurança e degradação local — 2026-10-19

| Requisito | Aceitação | Implementação e regressão |
| --- | --- | --- |
| RQ-3503 — impedir literal protegido na saída completa | AC-3503 | `document-instruction-policy.ts`, `answer-use-case.ts`; `tests/unit/document-instruction-security.test.ts`, `tests/e2e/protected-document-output.e2e.test.ts` (10 cenários, incluindo erro, fallback e persistência) |
| RQ-3404 — chave não habilita OCR de uploads | AC-3407 | `openai-ocr.ts`, `server.ts`, `worker.ts`; `tests/unit/openai-ocr.test.ts`, `tests/unit/offline-demo-ui.test.ts` |
| RQ-2705 — abrir demonstração sem inventar conversa | AC-2706 | `App.tsx`, `styles.css`; `tests/unit/offline-demo-ui.test.ts`; conferência visual desktop e 390 × 844 com identidade fictícia nova |

Verificação desta árvore local: `pnpm run check` passou 638 testes em 105 arquivos;
cobertura: statements 89,04%, branches 82,72%, functions 95,77%, lines 91,31%.
Também passaram 50 testes E2E, 20 evals locais, 50 casos documentais determinísticos,
build web e 7 testes de integração Neon exclusivamente sintéticos (sem migração).
O gate das 36 specs e o scanner de segredos passaram. Nenhuma chamada real de IA foi feita.

A revisão local das correções não é aprovação independente do branch nem autorização de merge.
Limites: defesa lexical não universal; OCR de uploads permanece indisponível; novo cadastro
offline continua pendente; 50 casos semânticos e revisão especializada continuam sem aprovação.
Detalhes em `docs/reviews/2026-10-19-correcoes-seguranca-local.md`.

## Correções após revisão do PR 14 — 2026-10-19

| Requisito | Aceitação | Implementação e regressão |
| --- | --- | --- |
| RQ-2606 — fotos usam exclusivamente o perfil ativo | AC-2609 | `postgres-scoped-retrieval.ts`; `tests/unit/postgres-scoped-retrieval.test.ts`, `tests/unit/retrieval-profile-isolation.test.ts`; `tests/integration/rls-tenant-isolation.test.ts` com OpenAI/Gemini e dois condomínios sintéticos |
| RQ-2802 — sinais negativos tipográficos não viram positivos | AC-2806 | `extract-structured-document.ts`; `tests/unit/structured-document-extraction.test.ts`, cobrindo PDF/OCR e hífen interno legítimo |
| RQ-3501 e RQ-3503 — títulos também são dados não confiáveis | AC-3501 e AC-3503 | `document-instruction-policy.ts`; `tests/unit/document-instruction-security.test.ts`, `tests/e2e/protected-document-output.e2e.test.ts`, incluindo erros, fallback e persistência |
| RQ-3504 e RQ-3204 — relatório não contorna a barreira documental | AC-3506 | `document-analysis.ts`; `tests/e2e/document-analysis-security.e2e.test.ts`, com páginas fora da seleção do retriever, título e controle de obrigação humana legítima |

Verificação final desta rodada: 718 testes em 109 arquivos; cobertura de statements 89,26%,
branches 83,02%, functions 95,80% e lines 91,52%. Gates de formatação, lint, tipagem, 36 specs
e segredos passaram. Também passaram 66 E2E, 7 integrações Neon sintéticas sem migração,
20 evals locais, 50 casos documentais determinísticos e build web. Não houve chamada paga
de IA; os 50 casos semânticos e a revisão especializada permanecem pendentes.
Registro dos defeitos, correções e limites em `docs/reviews/2026-10-19-revisao-pr-14.md`.
Autorrevisão não é aprovação independente nem autorização de merge.

## Publicação e contrato de cadastro Gemini — 2026-10-19

| Requisito | Aceitação | Evidência |
| --- | --- | --- |
| RQ-2501 e RQ-2503 — demonstração atualizada e sem banco | AC-2501 e AC-2503 | Serviço e Blueprint Render passam a acompanhar `main`; commit `725d911` publicado, cliente `index-RcE-rAYV.js`, runtime de desenvolvimento; ADR 0025 registra autorização da chave somente no serviço |
| RQ-2504 — conversa externa autorizada para teste fictício | AC-2504 | Chave transferida por autorização explícita, segredo fora do repositório, `GEMINI_MAX_ATTEMPTS=1`; observações e limitações em `docs/reviews/2026-10-19-render-gemini-testes.md`; conferência final deve ser registrada no PR |
| RQ-2601, RQ-2605 e RQ-2703 — formato da interpretação não depende só do prompt | AC-2601 e AC-2703 | `gemini-answer-gateway.ts`; `tests/unit/gemini-setup-contract.test.ts` verifica schema e rejeição de campo extra; testes de conversa geral e documental preservados; teste real local confirmou nome e pergunta seguinte após a correção |

O ensaio publicado encontrou uma falha real de contrato e não foi contado como jornada aprovada.
Os seis testes novos incluem cinco falhas reproduzidas antes da correção e um controle de
rejeição local mantido. Nenhuma asserção foi relaxada. O prompt e o modelo não foram alterados.
Somente mensagens e identidades fictícias foram utilizadas. Não se aprovou avaliação semântica,
dados reais, piloto ou teto monetário global; consumo real e testes simulados são distintos.

## Correção de envio e visualização documental — 2026-10-20

| Requisito | Aceitação | Implementação e regressão |
| --- | --- | --- |
| RQ-2004 — mensagem acompanha o anexo | AC-2004 e AC-2006 | `apps/web/App.tsx`, `document-processing-request.ts`; `tests/unit/document-processing-request.test.ts`, `tests/unit/chat-document-upload-ui.test.ts`, `tests/e2e/chat-document-send.e2e.test.ts` |
| RQ-2005 — recepção sem aguardar leitura | AC-2005 e AC-2006 | `apps/api/app/create-api.ts`; extração demonstrativa em segundo plano, catálogo com estado terminal; `tests/e2e/chat-document-send.e2e.test.ts`; regressões documentais aguardam a versão exata no catálogo |
| RQ-2006 — original completo e autorizado | AC-2007 | `apps/web/DocumentViewer.tsx`, `App.tsx`, `styles.css`; `tests/unit/document-processing-request.test.ts`, `tests/e2e/chat-document-send.e2e.test.ts`; bytes integrais, MIME seguro, original disponível antes da leitura, revogação, acesso cruzado e remoção |

O parser, o prompt, os provedores e o contrato de evidência não foram alterados. Os testes antigos
que exigiam `memoryStatus: ready` na recepção agora exigem 202 com `processingStatus: uploaded`
e, separadamente, `ready` para a mesma versão antes das consultas; as asserções de conteúdo,
citações, cálculos e segurança foram preservadas. Validação final registrada no review desta data.

Verificação local: 745 testes em 112 arquivos, 70 E2E, 20 evals locais, 50 documentais
determinísticos e build web aprovados. Cobertura: statements 89,72%, branches 83,52%,
functions 96,01%, lines 91,98%. Conferência visual bloqueada pelo acesso ao servidor local;
revisão independente e publicação pendentes. Detalhes em
`docs/reviews/2026-10-20-envio-visualizacao-documental.md`.

## Apelido com números na configuração — 2026-10-20

RQ-2703/RQ-2704 e AC-2707: `setup-turn.ts` e `development-identity.ts` aceitam `teste4` como
apelido confirmado e o restauram sem mudar identidade/permissões. `create-api.ts` distingue
interpretação inválida (502) de indisponibilidade do provedor (503); `App.tsx` preserva o texto
em erro. Regressões em `tests/unit/setup-turn.test.ts`, `tests/unit/development-identity.test.ts`
e `tests/unit/api-setup-message.test.ts`: sete falhas reproduzidas antes da correção e 28 testes
focados aprovados depois, com os controles anteriores preservados.

Gate completo desta correção: 755 testes em 112 arquivos aprovados; cobertura de statements
89,77%, branches 83,55%, functions 96,01% e lines 92,04%. Formatação, lint, tipagem, 36 specs,
segredos e build web aprovados. Pelo painel do Render foi confirmada também uma queda da
instância por exceder 512 MB às 14h33; essa falha operacional não foi corrigida pela mudança de
apelido e não é atribuída à mesma requisição sem evidência. Detalhes em
`docs/reviews/2026-10-20-apelido-e-indisponibilidade.md`. Correções ainda locais, sem publicação.

## Consumo e admissão de trabalho da demonstração — 2026-10-20

| Requisito | Aceitação | Implementação e evidência |
| --- | --- | --- |
| RQ-2505 — runtime compilado e PDF sob demanda | AC-2505 | `tsconfig.api.json`, `main.ts`, `package.json`, `render.yaml`, `extract-pdf-text.ts`; `build:api`, `test:production`, regressões existentes de extração/consulta e CI |
| RQ-2506 — reserva documental e pressão de RSS | AC-2506 e AC-2507 | `demo-work-admission.ts`, `create-api.ts`, `server.ts`; `tests/unit/demo-work-admission.test.ts`, `tests/e2e/demo-memory-admission.e2e.test.ts` |
| RQ-2507 — medição agregada | AC-2508 | `memory-diagnostics.ts`, `server.ts`, `scripts/verify-production-runtime.mjs`; teste de timer/fechamento e ensaio compilado sintético |

No mesmo ensaio local sem documentos, RSS após 40 health checks caiu de aproximadamente 305 MiB
em tsx/PDF antecipado para 70 MiB no Node compilado/PDF sob demanda. O ensaio compilado com dois
PDFs e vinte perguntas terminou com pico de 126 MiB e nenhuma chamada externa. Não se atribui a
operação exata do OOM no Render a partir desses números, nem se declara estabilidade publicada.
ADR 0026 registra orçamento, limites e necessidade de verificar o serviço Linux após publicação.

Gate final: 767 testes em 114 arquivos aprovados, cobertura de statements 89,85%, branches
83,69%, functions 95,89% e lines 92,11%; formatação, lint, tipagem, 36 specs e scanner de segredos
aprovados. Builds da API/web e avaliações documentais (20 + 50 determinísticas) passaram. O
ensaio compilado repetido após o ajuste final passou com pico de 127 MiB. Revisão e limites em
`docs/reviews/2026-10-20-memoria-demonstracao.md`; publicação e medição no Render pendentes.

## Perfil compacto e aparência — 2026-10-20

| Requisito | Critérios de aceitação | Evidência de verificação |
|---|---|---|
| RQ-2407 — substituir Dados por Perfil | AC-2405 e AC-2408 | `apps/web/App.tsx`; `tests/unit/account-menu-ui.test.ts`; conferência visual desktop e celular pendente por ausência de navegador nesta sessão |
| RQ-2408 — escolha de tema, claro por padrão | AC-2409 | `apps/web/appearance.ts`; `apps/web/main.tsx`; `apps/web/styles.css`; `tests/unit/appearance.test.ts`; `tests/unit/account-menu-ui.test.ts` |
| RQ-2409 — saída e retomada explícita | AC-2410 e AC-2411 | `apps/web/profile-session.ts`; `tests/unit/profile-session.test.ts`; contrato de logout existente em `tests/unit/account-auth.test.ts` |

A saída remove apenas a lembrança do último acesso e recria a página para descartar estado e
operações pendentes. Preserva perfis sintéticos e tema; no modo real aguarda revogação na API.
Não altera autorização, isolamento, documentos ou prompts. O Bloco 4 do briefing e o MVP refletem
o ajuste de apresentação solicitado pelo usuário.

Validação desta fatia: build web, typecheck, scanner de segredos e gate das 37 specs aprovados.
Os 29 testes específicos de perfil/entrada/sessão passaram. A suíte completa passou 811 testes
em 119 arquivos com `vitest run --coverage --coverage.reportOnFailure --maxWorkers 2`:
statements 89,99%, branches 83,78%, functions 95,95% e lines 92,21%. A concorrência foi limitada
após uma execução simultânea com compilação e lint exceder os timeouts; nenhuma asserção foi
reduzida. As ferramentas foram executadas pelos binários locais: o shim de pnpm tentou baixar
sua versão e a rede deste ambiente não conseguiu resolver o registro.

Formatação e lint dos arquivos de perfil aprovados. O lint global ainda aponta duas ocorrências
de `no-useless-escape` em `apps/api/documents/document-condominium-check.ts`, criado por outra
alteração durante esta tarefa e preservado. A inspeção visual desktop/celular permanece pendente:
o inventário de navegadores retornou vazio. Esses bloqueios não foram tratados como aprovação
dos gates gerais nem como autorização para integrar ou publicar a árvore de trabalho.

### Ajuste da escolha de aparência — 2026-10-20

RQ-2408 e AC-2409: “Aparência” oferece “Claro” e “Escuro” em um seletor nativo com rótulo
associado. Sem preferência válida salva, a entrada e o chat usam sempre o claro, inclusive se
o sistema operacional estiver em modo escuro ou o armazenamento falhar. A escolha explícita
continua salva para recarga e saída. `appearance.test.ts` cobre o padrão e a restauração dos dois
temas; `account-menu-ui.test.ts` confere as opções e o rótulo acessível. A área documental existente
permanece como está; este ajuste não adiciona opções ao perfil.

Validação do ajuste: formatação, lint global, typecheck, build web, scanner de segredos e gate
das 37 specs aprovados. A suíte completa passou 813 testes em 119 arquivos, com concorrência
limitada a dois workers: statements 89,99%, branches 83,88%, functions 95,95% e lines 92,21%.
O lint global desta execução passou, substituindo o bloqueio registrado na validação inicial
do perfil. Diff incremental completo revisado; a limitação de inspeção visual registrada acima
permanece.

## Conferência de condomínio no envio — 2026-10-20

| Requisito | Aceitação | Implementação e evidência |
| --- | --- | --- |
| RQ-3701 — nomes explícitos e equivalência | AC-3701, AC-3702 e AC-3705 | `document-condominium-check.ts`, `document-processing.ts`; `tests/unit/document-condominium-check.test.ts` e OCR no E2E |
| RQ-3702 — pendência antes de consulta | AC-3701 e AC-3703 | estado `needs_review`, memória e persistência; `tests/e2e/document-condominium-confirmation.e2e.test.ts` valida abstenção antes e citação depois |
| RQ-3703 — confirmar ou cancelar com ambos os nomes | AC-3703 | `document-condominium-confirmation.tsx`, `document-processing-request.ts`, `App.tsx`; renderização React, transporte e preservação da pergunta nos testes unitários/E2E |
| RQ-3704 — versão, autorização, retomada e decisão persistente | AC-3704 e AC-3705 | catálogo, adaptadores, rota de confirmação, migração 031 e ADR 0027; testes de tenant, revogação, arquivo removido, versão antiga e decisão concorrente; caso RLS em `tests/integration/rls-tenant-isolation.test.ts` |

Spec 037 mantém o envio 202 assíncrono e reutiliza a extração existente. Confirmação não altera
condomínio, leitura ou vigência silenciosamente. Migração/integração Neon bloqueadas por DNS;
nenhuma publicação ou aprovação de merge. Resultados e pendências em
`docs/reviews/2026-10-20-confirmacao-condominio-documental.md`.

Gate local final desta fatia: `pnpm run check` aprovado, 813 testes/119 arquivos, statements
89,99%, branches 83,88%, functions 95,95% e lines 92,21%. Builds API/web, ensaio compilado e
evals (20/20 + 50/50 determinísticos) aprovados. A migração 031 e os testes RLS no Neon continuam
sem validação por falha de DNS; revisão independente e publicação pendentes.

## Novo chat na reentrada — 2026-10-20

| Requisito | Aceitação | Implementação e evidência |
| --- | --- | --- |
| RQ-3801 — novo chat em cada entrada | AC-3801 e AC-3802 | `chat-session.ts`, `App.tsx`; `chat-session.test.ts` e `chat-reentry.e2e.test.ts` validam lista anterior separada do novo chat, sem salvar entradas vazias |
| RQ-3802 — último turno, títulos e referências | AC-3801, AC-3802 e AC-3805 | repositórios de chat, vínculo na persistência de perguntas, upload e UI; regressões de reentrada, renomeação, ocultação, último turno e anexo |
| RQ-3803 — usuário, tenant e cursores | AC-3803 e AC-3804 | rotas, filtros de histórico, migração 032 e RLS; `chat-repository.test.ts`, `postgres-answer-persistence.test.ts`, E2E com outro membro/tenant/revogação e paginação de 105 turnos |
| RQ-3804 — legado e abas | AC-3804 e AC-3805 | chat reservado de legado, IDs novos por entrada e idempotência inclui chat; testes E2E de abas, chave repetida e legado oculto |

Spec 038 e ADR 0028 substituem a restrição de organização efêmera da Spec 018. Testes de inspeção
da sidebar passaram a exigir carregamento de chats separados e operações assíncronas no servidor,
em lugar de agregar todo o histórico em um título; controles, fontes e isolamento permanecem
exigidos. O teste PostgreSQL manteve autor/limite e acrescentou o vínculo e o cursor opcionais;
nenhuma asserção de segurança foi removida. Conteúdo não é copiado para armazenamento do navegador.

Verificação final da Spec 038: `pnpm run check` aprovado com 830 testes/122 arquivos; cobertura
statements 90,16%, branches 84,34%, functions 96,12%, lines 92,33%. Builds API/web, runtime
compilado e evals 20/20 + 50/50 determinísticos aprovados. Migração 032 e integração RLS bloqueadas
por DNS do Neon; revisão independente e publicação pendentes. A demonstração mantém a limitação
de perda de estado no reinício do servidor (ADR 0021). Registro completo em
`docs/reviews/2026-10-20-novo-chat-na-reentrada.md`.

## Ajustes da prévia e nova conversa sem duplicação — 2026-10-20

| Requisito | Aceitação | Implementação e evidência |
| --- | --- | --- |
| RQ-2405/RQ-2407 — menu até a base, itens no topo e perfil sem atalhos repetidos | AC-2406/AC-2408 | `App.tsx`, `styles.css`, `account-menu-ui.test.ts`; documentos permanecem em Perfil → Documentos enviados, com identificação e autorização por condomínio |
| RQ-3703 — uma confirmação azul-escura sem alerta duplicado | AC-3701/AC-3703 | `App.tsx`, `styles.css`; a pendência preserva a pergunta e continua bloqueando consulta até confirmação; falhas operacionais reais continuam visíveis |
| RQ-3805 — nova conversa sem cópia do cadastro, turnos, anexos ou rascunho | AC-3806 | `chat-session.ts`, `App.tsx`, `chat-session.test.ts`, `chat-sidebar-ui.test.ts`; mensagens iniciais vinculadas ao chat de origem e descarte somente de rascunhos vazios não salvos |

O teste anterior do atalho documental foi atualizado porque sua retirada foi explicitamente
solicitada; o catálogo autorizado e seus controles de leitura/confirmar permanecem exigidos.
Sem mudança de API, banco, provedor, prompt ou autorização. Validação final registrada em
`docs/reviews/2026-10-20-ajustes-previa-e-nova-conversa.md`.

Validação final: `pnpm run check` aprovado com dois workers, 832 testes/122 arquivos; cobertura
statements 90,16%, branches 84,34%, functions 96,12% e lines 92,33%. Build web e inspeção na prévia
local aprovados, incluindo menu em 320 px e 1280 px, cartão azul sem alerta duplicado e criação
de chat sem copiar saudação/rascunho, preservando o chat anterior. Sem publicação ou merge.

## Base legal federal conferida — 2026-10-22

| Requisito | Aceitação | Implementação e evidência |
|---|---|---|
| RQ-3901 — curadoria e integridade | AC-3901 | `curated-source-texts.ts`, `legal-edition-contract.ts`, `verified-legal-edition.ts`; seis fontes oficiais, nove leis relacionadas e 25 páginas; testes de corrupção e origem em `verified-legal-library.test.ts` |
| RQ-3902 — paginação honesta | AC-3902 | `consultation-pdf.ts`, `build-verified-legal-corpus.ts`; reprodução dos PDFs, texto e offsets em `verified-legal-library.test.ts`; leitura autorizada e visualização em `legal-copy-viewer.test.ts` e eval HTTP |
| RQ-3903 — compartilhamento autorizado | AC-3904 e AC-3905 | `verified-legal-library.ts`, `server.ts`, rota de cópia; índice privado preservado; `citation-validator.ts` recusa fato local sustentado só por lei; regressões unitárias e HTTP |
| RQ-3904 — intervalo da conferência | AC-3903 | filtro de 22/10/2026 até 21/11/2026 exclusivo; fronteiras e ausência de fonte em unitários/evals; seleção PostgreSQL por `verified_at` e `review_due_at` |
| RQ-3905 - persistência administrativa | AC-3906 | migração 033, importador genérico e `legal:import:verified`; idempotência, recusa de regressão, rollback e cópia histórica testados com adaptadores simulados; execução PostgreSQL externa informou migração concluída e 8/10 casos aprovados, duas falhas em investigação; suíte ampliada para onze casos após ajuste das fixtures |
| RQ-3906 — avaliação | AC-3907 | `pnpm run evals:legal`, 21 casos determinísticos sem provedor; não mede qualidade semântica de IA nem substitui revisão jurídica |

A autorização permite adicionar material confirmado; não houve importação integral do GitHub,
publicação, mudança de prompt ou importação em banco de produção. A edição é parcial e as páginas
são das cópias Alvitra, não da publicação oficial. O ADR 0029 registra curadoria, limites e revisão.
O importador constitucional anterior continua sem certificação de atualização integral.
Resultados finais e limitações em `docs/reviews/2026-10-22-base-legal-verificada.md`.

Validação local final da Spec 039: 901 testes aprovados, incluindo 21 casos legais;
cobertura statements 90,51%, branches 84,84%, functions 96,23% e lines 92,61%.
Formatação, lint, tipagem, gate de 39 specs, scanner de segredos, builds API/web e runtime
compilado aprovados. Evals adicionais: 20/20 e 50/50 determinísticos, sem chamadas pagas.
Os gates equivalentes foram executados diretamente porque o Corepack não resolveu o registro
do pnpm. Migração e dez testes de integração Neon bloqueados por DNS antes da conexão;
sem ativação persistente, revisão independente, merge ou publicação.

Rechecagem posterior em 22/10/2026: DNS Neon/GitHub/npm resolvido e HTTPS npm acessível;
a conexão PostgreSQL de leitura com o Neon continua recusada com `EACCES`, inclusive após
reinício informado pelo usuário. O teste fora da restrição foi rejeitado pela política da
sessão, que não admite `sandbox_approval`. Nenhuma migração, importação ou teste RLS adicional
foi executado. A alternativa de integração Neon para ChatGPT foi recusada pelo usuário.
`scripts/verify-neon-local.ps1` prepara a retomada pelo PowerShell normal do Windows, preservando
as guardas do ADR 0007; `-CheckOnly` valida somente pré-requisitos locais. A execução real dos
comandos de banco continua pendente e não foi substituída pela conferência do script.
Pré-verificação local e dez testes das guardas aprovados. A tentativa normal do script
interrompeu na conexão da migração com `EACCES`, sem iniciar os testes de integração ou alterar
o banco; nenhuma validação PostgreSQL foi declarada aprovada.

Execução externa informada pelo usuário em 22/10/2026: a migração terminou sem erro e a suíte
PostgreSQL executou dez casos, com oito aprovados e dois reprovados. O trecho recebido aponta
resultado não vazio na busca antes da confirmação do documento (AC-3704); a outra falha ainda
exige o relatório completo. Foi identificada limpeza incompleta das fixtures: as quatro tabelas
legais não participavam do reinício do cenário. Foram incluídas no `TRUNCATE` exclusivo do banco
sintético, mantendo a asserção de busca vazia e as regras de autorização sem mudanças.
Uma regressão AC-3906 importa evidência pública sintética, comprova sua leitura e exige ausência
após reiniciar as fixtures com a mesma identidade autorizada. A suíte passa a ter onze casos.
O script externo grava JSON por rodada em `reports/neon-integration/`; a nova execução real é
necessária para confirmar ambas as falhas. Não houve relaxamento de asserções ou timeouts.

Retomada em 26/10/2026: corrigida também a fixture de revogação do cenário
AC-3903/3904/3906 para preencher `revoked_at = now()`, conforme o CHECK da migração 001.
A verificação de cópia inacessível após a revogação permanece exigida. O ajuste preserva
schema e código de produção; o resultado PostgreSQL dos onze cenários ainda está pendente.
A sessão continua recebendo `EACCES` no teste de conexão somente leitura. Não há relatório
externo novo confirmado até esta retomada.

## Migração operacional para Supabase — 2026-10-26

| Requisito | Aceitação | Implementação e evidência |
| --- | --- | --- |
| RQ-4001 — destino protegido | AC-4001 e AC-4002 | `scripts/supabase-integration-guard.ts`, `scripts/migrate-supabase-integration.ts`, `infrastructure/supabase/001-integration-guard.sql`, `.github/workflows/supabase-integration.yml` e testes unitários do guard mantêm endpoint Supabase, TLS, confirmação e marcador persistente. O workflow é somente manual, consome URL por segredo e exige `synthetic-only`. |
| RQ-4002 — isolamento e vetorização | AC-4003 | `tests/integration/rls-tenant-isolation.test.ts` aceita explicitamente o destino Neon ativo ou Supabase preparado, mantendo a mesma validação RLS e de perfis vetoriais. |
| RQ-4003 — corte condicionado | AC-4004 | Os artefatos Supabase foram preparados, mas `package.json`, `.env.example`, `README.md`, `AGENTS.md` e `scripts/verify-neon-local.ps1` preservam Neon até a validação externa. |

O projeto Supabase sintético dedicado `alvitra-integration-synthetic` foi criado fora do
repositório e recebeu o marcador persistente. A tentativa protegida de migrations e integração
não alcançou o banco porque o Node local rejeitou uma cadeia TLS autoassinada; nenhuma migration
ou fixture foi aplicada. O workflow manual no GitHub Actions foi preparado para executar a mesma
validação a partir de um runner externo, depois de receber o segredo do projeto sintético.

Validação da retomada em 26/10/2026: 901/901 testes locais aprovados com um worker, cobertura
statements 90,51%, branches 84,84%, functions 96,23% e lines 92,61%. A rodada inicial com dois
workers teve três falhas; os 29 casos dos arquivos envolvidos passaram isoladamente, e a
rodada completa serial passou sem relaxamento de asserções ou timeouts. Guardas Supabase,
migrations e persistência legal tiveram ainda uma verificação focada com 35 casos aprovados.
A Spec 040/ADR 0030 passou a definir o destino ativo. O comando atual de retomada é
`scripts/verify-supabase-local.ps1`, com JSON e log completo em `reports/supabase-integration/`.
A captura preservou stderr e o código de falha no ensaio local. URL e confirmação da integração
Supabase não estão configuradas; os onze casos PostgreSQL continuam sem nova execução, e a
validação persistente não é considerada concluída.

## Nome preservado e confirmações pela conversa — 2026-10-27

| Requisito | Aceitação | Implementação e evidência |
| --- | --- | --- |
| Spec 021, RQ-2002 — renomear somente a pedido direto | AC-2002 | `condominium-profile.ts`; unitários rejeitam confirmação de anexo, relato, citação, negação e hipótese; E2E compara o perfil completo antes/depois da confirmação e da pergunta retomada e permite pedido explícito. |
| Spec 037, RQ-3703 — fala contextual em vez de cartão de aviso | AC-3701, AC-3703 e AC-3706 | `document-conversation.ts`, rota `/conversation`, `document-condominium-confirmation.tsx` e `App.tsx`; geração com enums e marcadores, interpolação local de nomes/título e renderização como mensagem da assistente com respostas sugeridas. |
| Spec 037, RQ-3704 — autorização, decisão separada e falha segura | AC-3704 e AC-3706 | E2E cobre outro tenant, falta de upload, revogação durante geração, estado alterado, documento removido, provedor indisponível e ausência de mutação na geração/cancelamento. |
| Spec 020, RQ-2005 — resultado de leitura conversacional | AC-2005 e AC-2006 | Resultado comunicado pelo mesmo gateway; progresso compacto; mensagem original preservada em revisão/falha, sem alerta duplicando a fala. |
| Spec 026, RQ-2604 — consultora acessível | AC-2610 | `AnswerMessage`, `answer-presentation.ts`, `styles.css` e `chat-turn-ui.test.ts`; remove prefixos mecânicos e selo de conflito, conserva ressalvas específicas, próximo passo, especialista e fontes. O system prompt aprovado não foi alterado. |

O endpoint de confirmação já não escrevia no perfil; não foi reproduzida uma renomeação a partir
do clique isolado. A regra de aprendizado, porém, aceitava declarações sobre o nome sem exigir
pedido de alteração. Essa autorização foi restringida. A memória recente da Spec 043 permanece
fora desta correção; não há base para atribuir o relato a uma correção já feita naquela memória.
O cadastro existente do usuário não foi alterado nem presumido restaurado.

A revisão automática rejeitou enviar título e nomes ao provedor. A solução adotada mantém esses
metadados locais e envia somente enums de estado e marcadores genéricos, sem novo provedor,
dependência, schema ou alteração de autorização. Resultados finais e limites estão em
`docs/reviews/2026-10-27-nome-e-conversa-documental.md`.

Fechamento local desta correção: 57 testes focados e 1.032/1.032 da suíte completa aprovados
(137 arquivos), esta última com um worker e relatório exclusivo para evitar disputa de
cobertura entre tarefas simultâneas. Statements 90,92%, branches 85,71%, functions 96,34% e
lines 92,93%. Formatação, lint, tipagem, builds API/web, scanner de segredos, diff sem erros de
whitespace e gate de 45 specs aprovados; evals determinísticos 20/20 e 50/50. Sem revisão
independente, merge, deploy, validação de modelo real ou restauração do cadastro do usuário.

## Recebimento e raio-X automático — Spec 045, 2026-10-27

| Requisito | Aceitação | Implementação e evidência |
|---|---|---|
| RQ-4501 — confirmação após registro | AC-4501 | Evento `received` e callback `acknowledge`; testes de sequência em `document-processing-request.test.ts` e fluxo HTTP bloqueando a extração em `document-snapshot.e2e.test.ts`. |
| RQ-4502 — resumo sem pergunta | AC-4502/4505 | `document-snapshot.ts` reutiliza reader e extrator locais; testes sintéticos de balancete, ata, contrato, convenção, regimento e texto genérico em `document-snapshot.test.ts`; resumo geral restrito à versão enviada. A Spec 049 sucede esse limite exclusivamente para balancetes. |
| RQ-4503 — evidência e segurança | AC-4503/4504 | Fontes conferidas pelo validador existente; testes de escopo, vigência, pendência, confirmação, qualidade, ambiguidade, Unicode, instrução hostil e revogação; relatório não depende de gateway disponível. Entrada do gateway continua sem evidências, nomes ou conteúdo. |
| RQ-4504 — apresentação e continuidade | AC-4504/4505 | `DocumentSnapshot` dentro da conversa, fontes abríveis, escape de conteúdo e guarda contra resultado tardio em `App.tsx`; regressões de pergunta junto do anexo preservadas. |

ADR 0033 registra o resumo local após rejeição automática do envio de conteúdo documental ao
gateway. Não há novo provedor, dependência, schema ou reextração. O resumo é seleção inicial,
transitória e verificável; não é síntese semântica integral nem autorização para piloto real.

Validação local: 137 arquivos e 1.032 testes aprovados na suíte completa com cobertura;
statements 90,92%, branches 85,71%, functions 96,34% e lines 92,93%. O módulo novo teve
98,33% de statements e 100% de branches. Os sete cenários HTTP da Spec 045 também passaram
na rodada focada final. Formatação, lint, typecheck, gate das 45 specs, scanner de segredos,
builds API/web e evals determinísticos 20/20 e 50/50 aprovados. O Corepack não acessou o registry
por DNS; os equivalentes foram executados com os binários já instalados. O cache temporário
dos testes foi direcionado a `node_modules/.cache/alvitra-tests` após EPERM no temporário
do sandbox, sem relaxar testes. Não houve migração, integração PostgreSQL nova, chamada a
provedor real, merge ou publicação. Revisão local em `docs/reviews/2026-10-27-raio-x-automatico.md`.

## Evidências e continuidade — Specs 043/046 e integração 047, 2026-10-27

| Requisito | Aceitação | Implementação e evidência |
|---|---|---|
| RQ-4301 — autorização e escopo da memória | AC-4301 | conversation-memory, rota questions e answer-use-case; testes de usuário/condomínio/chat, sem chat, chat oculto, revisão de associação e revogação durante geração. |
| RQ-4302 — janela íntegra | AC-4302 | conversation-memory.test.ts confere oito interações, 12.000 bytes UTF-8, ordem e omissões sem cortar mensagem nem buscar turnos antigos para preencher lacunas. |
| RQ-4303 — procedência não privilegiada | AC-4303 | Auditoria transacional marca somente orientação validada sem evidência enviada; testes omitem respostas documentais/legadas, fonte removida, ataques e metadados antigos. |
| RQ-4304 — referência, busca e risco | AC-4304 | contextualQuestion usa perguntas anteriores em continuações explícitas; nova busca e maior risco entre pergunta atual/contexto. Testes HTTP de três turnos e pergunta original preservada. |
| RQ-4305 — concorrência e falhas | AC-4305 | Guarda por armazenamento RAM e lock de sessão PostgreSQL; 409/retry-after, 503, idempotência, liberação em erro e timestamps monotônicos. Integração real entre dois clientes e identidade canônica. |
| RQ-4306 — observação reversível | AC-4306 | Contagens minimizadas e procedência na auditoria; ALVITRA_CHAT_MEMORY_ENABLED=false; sem resumo ou chamada adicional de memória. Tokens/latência no replay real separado. |
| RQ-4601 — contrato/diagnóstico | AC-4601 | citation-validator, schemas e answer-use-case; answer-evidence-recovery.test.ts cobre fonte legal/local, especialista permitido, claims, modo, IDs, offsets e códigos Codex nas três rotas. |
| RQ-4602 — estado e conflitos | AC-4602 | Uma correção com as mesmas evidências; fallback literal mantém divergências, preços e vigência. evidence-continuity.e2e.test.ts força saídas inválidas em cinco casos de minuta/regra aprovada. |
| RQ-4603 — recuperação limitada | AC-4603 | retrieval-query/text-retrieval e evidence-recovery-regressions.test.ts: intervalo inclui julho, U-B discriminante, checklist/transição, cobertura composta e campo complementar da mesma versão; filtros repetidos e máximo oito trechos. |
| RQ-4604 — literal e causas | AC-4604 | literal-sentences/document-instruction-policy; data 18/08, Markdown, milhares e Unicode preservados; comandos/canários bloqueados; qualidade, relevância e vigência têm diagnósticos distintos. |
| RQ-4605 — continuidade integrada | AC-4605 | AC-4301–4306 e regressões de resposta geral, documental, fontes progressivas/retiradas, três turnos, revalidação e risco contextual. |
| RQ-4606 — comparação imutável | AC-4606 | Baseline r1, corpus e gabaritos preservados; r7 usa snapshot/prompt v24 e 240/260 originais. Relatório da Spec 046 separa IA, especialista e ampliação posterior para conversas longas/v25. |
| RQ-4701/RQ-4702 — risco proporcional | AC-4701–AC-4706/AC-4711 | risk-classification.test.ts e answer-conversation-memory.test.ts; integração conserva especialista em orientação, documental e degradação, sem chamar risco de prova de fraude. |
| RQ-4703/RQ-4704 — processo e diagnóstico | AC-4707–AC-4710 | codex-answer-gateway/codex-process e testes próprios; códigos tipados capturados centralmente, sem stderr/causa livre na auditoria, retry de transporte ou fallback pago. |

Gates locais e revisão do autor: `docs/reviews/2026-10-27-evidencias-continuidade.md`.
Os 12 testes de integração Neon passaram com confirmação e marcador sintéticos; nenhuma
migration foi necessária. A comparação e as limitações de qualidade ficam em
`docs/specs/046-correcoes-evidencias-e-busca/observed-results-2026-10-27.md`.

## Conferência automática de balancetes — Spec 049, 2026-10-27

| Requisito | Aceitação | Implementação e evidência |
|---|---|---|
| RQ-4901 — conferência no recebimento | AC-4901/4907 | `document-snapshot.ts` aciona `financial-review.ts`; dez estados e três prioridades em `financial-review.test.ts`; PDFs de vários meses pelo fluxo HTTP em `document-snapshot.e2e.test.ts`. |
| RQ-4902 — fechamento e cruzamentos | AC-4902/4904 | Inteiros em centavos; totais, caixa disponível, orçamento mensal, banco/conta, reserva segregada, comprovante vinculado e obrigações do próximo mês; testes positivos, divergências, datas inválidas e apoios de outro período/conta. |
| RQ-4903 — histórico automático | AC-4903/4905 | Todos os meses anteriores disponíveis; diferenças exatas, base zero, rubrica ausente, versões/rubricas duplicadas, conflitos de regime/plano/escopo e recusa de mês futuro nos testes unitários e HTTP. |
| RQ-4904 — evidências e abstenção | AC-4902/4904/4905/4907 | Fontes das parcelas, competências, conta e vínculos verificadas por `validateDocumentAnalysisSources`; casos Unicode, páginas ruins, valores não estruturados, ausência de inadimplência e documentos faltantes; interface escapada e ações contextuais. |
| RQ-4905 — segurança e concorrência | AC-4906 | Filtro antes do reader, identidade contra catálogo, limites agregados e revalidação de todas as versões elegíveis antes de publicar; HTTP recusa remoção/revisão de histórico durante a geração. Tenant adversário, pendência, revogação, conteúdo hostil e gateway indisponível permanecem cobertos. |

ADR 0034 amplia a seleção de fontes exclusivamente para balancetes, mantendo leitura local,
prompt aprovado, retenção, isolamento e ausência de envio documental ao provedor. Não há novo
serviço, dependência, schema ou comando de eval; as regressões entram nas suítes unitárias/HTTP
existentes. Revisão local em `docs/reviews/2026-10-27-conferencia-balancetes.md`.

Validação final sobre cópia isolada e congelada do estado atual, com fontes e testes desta tarefa
idênticos ao diretório original: 148 arquivos e 1.289 testes aprovados. Cobertura global:
statements 91,58%, branches 87,00%, functions 96,66% e lines 93,38%; `financial-review.ts`:
99,65%, 97,39%, 100% e 100%, respectivamente. Relatório em `reports/049-quality-final.log`
e resumo em `reports/049-coverage-summary.json`. O isolamento evita mudanças concorrentes
de prompts/testes em outra tarefa; não modifica o comportamento ou os pisos de cobertura.

Formatação, lint, tipagem, builds API/web, gate de visão das 50 specs e scanner de segredos
aprovados. Evals existentes: 20/20 e 50/50 determinísticos; os 50 semânticos continuam pendentes
de revisão humana/modelo. Corepack/pnpm indisponível por DNS; executados os mesmos binários
instalados, sem instalar dependências. `reports/049-source-manifest.json` registra os hashes
dos oito arquivos funcionais/testes conferidos entre origem e cópia. Sem novo prompt,
migração, integração PostgreSQL, commit, merge ou publicação.
## Roteamento e regressões — Spec 051

| Requisito | Implementação | Verificação |
|---|---|---|
| RQ-5101 | answers/answer-model-routing.ts, codex-answer-gateway.ts | hybrid-routing-regressions.test.ts; evals:hybrid |
| RQ-5102 | conversation-memory.ts, answer-use-case.ts | conversation-memory.test.ts; hybrid-routing-regressions.test.ts |
| RQ-5103 | retrieval-query.ts, text-retrieval.ts, conflict-detection.ts | evidence-recovery-regressions.test.ts; hybrid-evidence-regressions.test.ts |
| RQ-5104 | answer-fidelity.ts, citation-validator.ts | hybrid-routing-regressions.test.ts; suite completa de respostas |
| RQ-5105 | evals/conversation-comparison | conversation-comparison.test.ts; relatórios da rodada híbrida |

Validação em 28/10/2026: 150 arquivos/1.333 testes aprovados, incluindo 44 novas regressões.
Statements 91,77%, branches 87,22%, funções 96,75%, linhas 93,52%; typecheck, lint,
formatação e alinhamento de 51 specs aprovados. AC-5104b distingue definições gerais de
afirmações locais sem relaxar claims/citações; controles positivos e negativos na suíte híbrida.

A matriz `2026-10-27-hybrid-r2` concluiu 560 conversas/2.020 turnos, com 160 registros de
auditoria técnica IA; uma posição ambígua foi excluída uniformemente. A correção posterior
de AC-5104b recebeu replay separado de 60 turnos e não altera a pontuação R2. Consumo
desconhecido, falhas operacionais e exploração interrompida foram preservados no
[relatório observado](../specs/051-roteamento-hibrido-regressoes/observed-results-2026-10-28.md).
Os resultados não aprovam piloto nem produção; revisão especializada continua pendente.

## Contexto da tarefa e abstenção útil — Spec 052

| Requisito | Implementação | Verificação |
|---|---|---|
| RQ-5201 | conversation-memory.ts, answer-task-context.ts | answer-task-context.test.ts; conversation-memory.test.ts |
| RQ-5202 | answer-task-context.ts, answer-use-case.ts | controles de fonte financeira, CCT e baixa qualidade em answer-task-context.test.ts |
| RQ-5203 | answer-use-case.ts, citation-validator.ts | síntese geral/documental, duas tentativas, claims inválidos e revogação em answer-task-context.test.ts |
| RQ-5204 | protocol.ts, run.ts, evals:luna | plano de 280/1.010 sem chamadas e condição Luna única, inclusive alto risco |

Dados de foco são efêmeros e não privilegiados; nenhum resumo documental ou aumento de
janela. Após nova solicitação explícita, AC-5207 foi exercitado em `2026-10-28-luna-quality-r1`:
280 cenários/1.010 turnos, 1.170 tentativas somente Luna com memória, zero falhas mecânicas e
usage completo. Verificação de hashes, fontes, contexto, modelo e 80 auditorias aprovada;
58/79 satisfatórias na amostra, contra 51/79 anteriores; finais longos 23/40. Consumo observado
21,860563 créditos equivalentes; fatura/franquia e aprovação especializada desconhecidas.
[Comparação e falhas preservadas](../specs/052-contexto-sintese-abstencao/observed-results-2026-10-28.md).

## Envio de vários documentos pelo chat — Spec 020, 2026-10-28

| Requisito | Aceitação | Implementação e verificação |
|---|---|---|
| RQ-2007 — seleção múltipla | AC-2008 | `document-upload-batch.ts`, `PendingDocumentAttachments` e input `multiple` em `App.tsx`; testes de acréscimo, repetição, limites individuais, nomes escapados e remoção acessível. |
| RQ-2007 — sequência e estados | AC-2009 | `sendDocumentBatch` aguarda cada leitura, preserva o endpoint individual e apresenta `DocumentBatchProgress`; teste HTTP de três PDFs com guard de capacidade, chat único, originais, estados prontos e isolamento. |
| RQ-2004/2007 — pergunta e falhas | AC-2009/2010 | Pergunta única após todos prontos, nenhuma pergunta sem texto, falha parcial não interrompe os demais, contexto antigo interrompe o lote; testes unitários e HTTP com PDF inválido. |
| RQ-2007 e Spec 037 — confirmações | AC-2010 | Fila de pendências por versão, confirmação/cancelamento individual e controles de interface quando a fala está indisponível; teste manual no navegador com dois PDFs sintéticos divergentes. |

Validação da fatia: suíte completa com 153 arquivos/1.370 testes aprovados e cobertura de
statements 91,89%, branches 87,39%, functions 96,79% e lines 93,59%. O helper novo tem 100%
nos quatro indicadores. Formatação, lint, tipagem, builds API/web, gate de 52 specs e scanner
de segredos aprovados pelos binários locais equivalentes; Corepack não acessou o registry.
O runtime compilado processou dois PDFs e vinte perguntas sintéticas, com pico local de 145 MiB;
esse ensaio não garante capacidade no Render ou para arquivos maiores.

A rodada inicial com muitos workers teve nove timeouts; repetição com `--maxWorkers=2`, sem
alterar asserções ou timeouts, aprovou todos os testes. No navegador, a versão compilada recebeu
três PDFs na mesma seleção, permitiu remover/reacrescentar sem duplicar, terminou os três e
conservou duas pendências independentes ao confirmar uma e cancelar a outra. Só dados sintéticos,
servidor isolado e nenhum provedor externo foram usados.

O comando adicional `evals` do backend permanece com 19/20, falhando em EVAL-008 (esperava
`conflict`, recebeu `grounded`), em código que esta fatia não modifica nem importa. O adapter
HTTP sintético coberto na suíte e os 50 evals documentais determinísticos passaram. A falha
do runner adicional fica registrada e impede declarar o gate global de evals aprovado ou
autorizar release. Revisão do autor em `docs/reviews/2026-10-28-envio-multiplos-documentos.md`;
sem migração, merge ou publicação.

Esse resultado descreve o código da entrega de upload. A correção posterior da Spec 053
reconhece as formulações equivalentes de mínimo de locação e aprovou 20/20 no runner
adicional, incluindo EVAL-008; os artefatos anteriores permanecem preservados.

Validação em 28/10/2026: 153 arquivos/1.370 testes aprovados, incluindo 22 novas regressões
desta fatia. Statements 91,89%, branches 87,39%, funções 96,79%, linhas 93,59%; novo módulo
de contexto com 100% nos quatro indicadores. Tipagem, lint, formatação e visão de 52 specs
aprovados. A primeira execução encontrou teste de upload em alteração concorrente; a segunda
sofreu colisão de diretório de cobertura. A execução final usa diretório exclusivo e passou
sem reduzir limites ou asserções. [Entrega e limites](../specs/052-contexto-sintese-abstencao/implementation-results-2026-10-28.md).
Scanner final de segredos aprovado; system prompt v26 e `.env.local` preservados. Nenhuma
nova bateria real foi executada na entrega inicial; a etapa posterior solicitada está registrada
em AC-5207 acima. O plano somente Luna permanece sem chamadas por padrão.

## Fechamentos longos e correção orientada por contrato — Spec 053

| Requisito | Aceitação | Implementação e verificação |
|---|---|---|
| RQ-5301 — retomadas, entidade e cláusulas | AC-5301 | `conversation-memory.ts`, `retrieval-query.ts` e `answer-task-context.ts`; correção de unidade, comparação de ambas, mudança de assunto, aviso/multa e CCT ausente em `long-conversation-regressions.test.ts`. |
| RQ-5302 — cobertura e limites | AC-5302 | Requisitos derivados de perguntas acionáveis e guardas de tópico/cláusula/entidade em `answer-task-context.ts`; definição, exclusão e consulta independente como controles negativos. |
| RQ-5303 — correção e fidelidade | AC-5303, AC-5304 a AC-5304d | `answer-use-case.ts`, `answer-fidelity.ts`, `openai-answer-gateway.ts` e `citation-validator.ts`; contrato dentro do orçamento, schema estável, união de fontes autorizadas, valores sem suporte, abstenção factual, duas tentativas e revogação. |
| RQ-5301 — conflito de locação | AC-5305 | `conflict-detection.ts`; regressões de prazo mínimo/plural e controle de retenção de imagens; runner legado 20/20. |
| RQ-5304 — medição preservada | AC-5305 | `evals:luna`, snapshots e checkpoints; R3 completa somente Luna/memória, referência R1 completa e R2 interrompida preservadas, com custos separados. |

Gates locais: 154 arquivos/1.400 testes, incluindo 30 novas regressões; cobertura de
statements 92%, branches 87,59%, funções 96,85% e linhas 93,68%. Tipagem, lint,
formatação, alinhamento de 53 specs, 20 evals legados e 50 documentais determinísticos
aprovados. Os 50 documentais semânticos continuam pendentes. A bateria real R3 usou
snapshot congelado e concluiu 280 cenários/1.010 turnos. Auditoria técnica: 59/79
satisfatórias, 13 parciais e 7 falhas; finais longos 23/40. Consumo observado:
21,9389360 créditos equivalentes, sem usage ausente. Não é fatura nem aprovação semântica.
[Comparação, novas regressões e custos da exploração](../specs/053-fechamentos-longos-luna/observed-results-2026-10-28.md).
A R2 interrompida e os diagnósticos somam mais 12,860275 créditos observados; cenários em
andamento da interrupção e engenharia deste chat têm consumo adicional desconhecido.
Na conclusão daquela etapa, fonte e snapshot coincidiam; casos, oráculos, prompt e resultados anteriores foram preservados.

## Recuperação de conversas e comparação de esforço — Spec 054

| Requisito | Aceitação | Implementação e verificação |
|---|---|---|
| RQ-5401 — diagnóstico | AC-5401 | Replays privados dos 20 alvos R3, com respostas rejeitadas sintéticas, hashes e usage; indisponibilidade inicial preservada separadamente. |
| RQ-5402 — foco e recuperação | AC-5402, AC-5403, AC-5403c | `answer-task-context.ts`, `conversation-memory.ts`, `retrieval-query.ts`, `text-retrieval.ts`; testes de rascunho/versão, aviso de sinistro, unidade corrigida e páginas materiais de ata em `conversation-recovery-regressions.test.ts`. |
| RQ-5403 — estrutura e fidelidade | AC-5403b, AC-5404 | `openai-answer-gateway.ts`, `answer-fidelity.ts`, `answer-use-case.ts`; recomendação referenciada, relato não confirmado, abstenção documental, explicação trabalhista e controles negativos. |
| RQ-5404 — esforço explícito | AC-5405, AC-5406 | `codex-answer-gateway.ts`, `protocol.ts`, `observed-gateway.ts`, `recovery-cases.ts`; default low, high explícito, configuração enviada ao CLI, modelo/esforço por observação e 40 alvos fixos. |
| RQ-5405 — medição preservada | AC-5401, AC-5407 | `evals:recovery` em package/README/AGENTS; plano sem chamadas, snapshots, origem sintética e inputs sem oráculos; R4 completa, matriz de 120 pontos e custos auditados. |

O diagnóstico S1 e o ensaio dirigido S2 não substituem a bateria completa. S2 teve 40 pontos,
38 saídas validadas e auditoria técnica de 26 satisfatórias, 11 parciais e 3 falhas; esses
resultados foram preservados. Duas saídas recusadas receberam revalidação offline após a
correção, sem nova inferência nem substituição da nota. O ensaio revelou também uma paráfrase
de referência não reconhecida e falta de páginas na recuperação; testes correspondentes foram
adicionados antes da bateria final.

Fonte `03bee28deb25b9c679c790ee2ec483306462def228aa3d3568d8d7161088589b`: 1.432 testes/155 arquivos,
incluindo 32 regressões novas; cobertura statements 92,04%, branches 87,72%, funções 96,87% e
linhas 93,72%. Tipagem, lint, formato, visão de 54 specs, 20 evals legados e 50 documentais
determinísticos aprovados. R4 concluiu 280/1.010, com memória e somente Luna low;
62/79 satisfatórias, 16 parciais, uma falha, finais longos 25/40. Consumo 21,2411895 créditos
equivalentes, sem usage ausente. Na matriz, Luna low 31/40, Luna high 26/40 e Sol low 30/40
satisfatórias; custos 0,951208/1,524760/31,221920 créditos equivalentes. Auditoria técnica por IA,
não taxa global nem aprovação de adoção. Fonte atual, snapshot, dados e prompt conferidos.

Critérios qualitativos permanecem parciais: omissões, recusa genérica nova, falsos positivos
lexicais/monetários e afirmação qualitativa local sem citação. Contraprova offline não promove
saída rejeitada. As seis regressões novas fora da matriz fixa precisam entrar na próxima
comparação. Subtotal desta tarefa: 56,529805 créditos equivalentes e mais 20 tentativas sem usage;
engenharia deste chat não é atribuível. [Resultados e pendências](../specs/054-recuperacao-conversas-comparacao/observed-results-2026-10-28.md).

## Comparação Sol 6.1 e Sol 5.6 — Spec 055

| Requisito | Aceitação | Implementação e verificação |
|---|---|---|
| RQ-5501 — modelos e baseline | AC-5501, AC-5502 | Suite sol; cópia validada da R3 e substituição de três arquivos de harness; testes de baseline íntegro/adulterado. |
| RQ-5502 — consumo | AC-5503 | Tarifas por modelo, cache e tentativas em protocol.ts; transporte e soma mista testados. |
| RQ-5503 — auditoria pareada | AC-5504 | Bateria completa 560 cenários/2.020 turnos; 160 auditorias, mesma exclusão R3 e 79 comparáveis por modelo; hashes e procedência verificados. |

Sol 6.1 teve 68/79 satisfatórias (86,1%), 10 parciais e uma falha; Sol 5.6, 57/79
(72,2%), 15 parciais e sete falhas, contra Luna R3 59/79 (74,7%). Finais longos:
30/40, 20/40 e 23/40, respectivamente. Aplicação, prompt, corpus, dataset e alvos
idênticos à R3; alterações posteriores da aplicação não participaram.
Consumo conhecido: 465,543300 e 914,485120 créditos equivalentes; duas tentativas da
bateria sem usage no Sol 6.1, mais quatro desconhecidas no smoke inicial separado.
Smokes acessíveis somaram 5,382400 créditos; engenharia/auditoria não são atribuíveis.
Não é fatura, acurácia global ou aprovação de adoção. 1.434 testes e cobertura
92,04%/87,72%/96,87%/93,72% passaram; visão, tipagem, lint, formato e evals determinísticos
aprovados. No fechamento, após mudanças concorrentes preservadas, a suíte atual passou
em 1.595 testes/163 arquivos, com cobertura de 92,26% statements, 88,21% branches,
97,05% funções e 93,92% linhas; tipagem, lint, formato, visão de 57 specs, whitespace e
scanner de segredos aprovados. A aplicação histórica da bateria permaneceu imutável.
[Resultados e limitações](../specs/055-comparacao-sol-61-56/observed-results-2026-10-29.md).

## Validação e completude das sínteses — Spec 056

| Requisito | Aceitação | Implementação e verificação |
|---|---|---|
| RQ-5601 — cobertura documental | AC-5601 | `answer-completion-plan.ts` e `answer-task-context.ts`: decisão e citação autorizada, sem dependência literal de AGE; controles de citação tangencial e atenção sem corpo. |
| RQ-5602 — fidelidade | AC-5602, AC-5603 | `answer-fidelity.ts`: relato, condição, recusa e diferença suportada; bloqueio de regra local qualitativa sem fonte e controles contra outra afirmação falsa. |
| RQ-5603 — completude | AC-5604, AC-5605, AC-5606 | Seleção de pedidos concretos e checklist transitório com IDs atuais; exclusões, definições antigas, palavras parciais, vigência, resultado, reserva, rubricas agregadas e aceite em `answer-synthesis-quality.test.ts`. |
| RQ-5604 — reparo limitado | AC-5607 | `citation-validator.ts` e `answer-use-case.ts`: chaves internas conhecidas, duas tentativas e mesmo modelo/esforço; teste pelo caso de uso com rejeição e reparo efetivo. |
| RQ-5605 — ensaio e custo | AC-5608, AC-5609 | `evals:answer-quality`, `recovery.ts` e `recovery-cases.ts`: plano sem inferência; 30 pontos fixos/configuração, 54 excluído uniformemente, hashes e consumo por configuração. R2 completa e R3 suplementar, custos e limites auditados. |

48 testes novos e 1.566 testes/161 arquivos na suíte ampla aprovados;
cobertura statements 92,18%, branches 88,04%, funções 96,91% e linhas 93,84%.
Formato, lint, tipagem, visão, 20 evals legados, 50 documentais determinísticos e scanner passaram.
Na R2: Luna high 21 S/3 P/5 F e Sol low 26 S/3 P/0 F nos 29 pontos comparáveis;
nove controles satisfatórios em ambos, custos 1,3903025/14,611870 créditos equivalentes.
A R3 tem 4 S/1 P/1 F em seis contraprovas Luna high, com custo 0,2576715, sem substituir notas.
A R2 usa prompt v26; a R3 incorpora v27 de outra fatia, portanto não isola efeito de código.
Reforço final de qualificação tem regressão e revalidação offline das cinco saídas aceitas da R3,
sem alterar notas anteriores ou executar outra inferência.
Subtotal observado 19,532758 créditos, com consumo adicional desconhecido no ensaio interrompido.
Qualidade permanece parcial e revisão independente/integração não foram aprovadas.
[Resultados e pendências](../specs/056-validacao-e-completude-sinteses/observed-results-2026-10-29.md).

## Comparação de balancetes enviados juntos — regressão de 29/10/2026

| Requisito | Aceitação | Implementação e verificação |
|---|---|---|
| RQ-4903 — realizados e compromissos futuros | AC-4903a, AC-4903b | `financial-history-scope.ts` separa somente vencimentos válidos sob cabeçalho futuro explícito; a extração original é preservada. `financial-history-scope.test.ts` cobre datas inválidas, isoladas, mês divergente, mudança de seção e rubrica realizada ausente. |
| RQ-4903/4904 — declaração e fonte | AC-4903c | `financial-review.ts` aceita frases delimitadas sobre regime e plano, cita sua linha e conserva o bloqueio de bases concorrentes ou divergentes. Controles de negação e menção incidental. |
| RQ-4902/4904 — totais e principal | AC-4902a, AC-4902b | Rótulos consolidados e principal em aberto no fim são reconhecidos sem inferir caixa livre; o teste demonstra a diferença deliberada de R$ 1.500,00 de junho e as quatro parcelas citadas. |
| Reprodução do relato | AC-4903a, AC-4903c | Fixture `financial-history-jardim-horizonte.json`: texto extraído localmente dos cinco PDFs sintéticos encontrados por SHA-256 do manifesto, sem dados reais, gabarito, modelo ou rede. Maio compara quatro meses anteriores, sem tratar compromissos futuros como despesas realizadas. |

A revisão e os resultados dos gates desta correção ficam em
`docs/reviews/2026-10-29-comparacao-balancetes-enviados.md`. A reprodução local não altera
mensagens já salvas; a mudança é aplicada às próximas conferências do backend atualizado.

## Disponibilidade documental nas respostas — correção da Spec 046 em 29/10/2026

| Requisito | Aceitação | Implementação e verificação |
|---|---|---|
| RQ-4602 — negação indevida de acesso | AC-4602b | `document-availability.ts` e `citation-validator.ts` recusam negações explícitas incompatíveis com as fontes locais recebidas. A contagem usa documentos distintos, sem somar páginas, versões ou legislação. |
| RQ-4602 — reparo e limite preciso | AC-4602b | `document-availability.test.ts` reproduz cinco balancetes no índice real em memória, preserva fontes/pergunta no reparo único e verifica a abstenção de validação após duas recusas. Controles preservam mês, extrato, quantidade, leitura e informação faltantes. |

Os 31 testes desta correção passaram; o módulo novo atingiu 100% nos quatro indicadores de
cobertura. O fixture de PDF passou a declarar WinAnsi para representar corretamente os bytes
acentuados já emitidos pelo gerador: a asserção existente sobre “Silêncio” foi preservada.
As alterações simultâneas de outros chats foram conservadas. Resultados completos e limites
de aplicação na sessão local estão em
`docs/reviews/2026-10-29-disponibilidade-documental.md`.

Validação desta correção: 48 testes direcionados aprovados, novo seletor com 100% nos quatro
indicadores, 20 evals legados e 50 documentais determinísticos aprovados. A suíte geral final
teve 1.542/1.543 testes aprovados, com uma falha de apresentação no E2E do lote sem balancetes,
registrada na revisão e bloqueando integração. Cobertura global de statements 91,15%,
branches 86,86%, funções 96,10% e linhas 93,00%; formato, lint, tipagem e visão de 57 specs
aprovados. Scanner da cópia estática própria aprovado; os limites das repetições globais
estão documentados. Não houve reinício da API, merge, publicação ou nova chamada de modelo.

## Perfil cadastral nas respostas — Spec 021, correção de 29/10/2026

| Requisito | Aceitação | Implementação e verificação |
|---|---|---|
| RQ-2104 — cadastro no contexto | AC-2104 | `confirmed-profile-context.ts`, `create-api.ts` e `answer-use-case.ts` fornecem nome, unidades e ID do condomínio autorizado com procedência cadastral, sem copiar contatos ou tratar o perfil como prova documental. Testes HTTP exercitam cadastro e perguntas seguintes. |
| RQ-2003/2104 — autorização e dados atuais | AC-2003/2104 | Perfil recarregado por consulta; ID divergente e falha de leitura impedem geração, corpo forjado é ignorado, troca de condomínio/usuário preserva isolamento. |
| RQ-4302 — orçamento e procedência | AC-4302b | `conversation-memory.ts`, `answer-task-context.ts` e projeção mínima conservam oito turnos inteiros e 12.000 bytes de dados junto ao foco/reparo; cadastro continua disponível com replay desligado e em chat novo, sem histórico agregado. |

Validação final: 1.595/1.595 testes em 163 arquivos, incluindo 26 regressões novas; cobertura
statements 92,26%, branches 88,21%, funções 97,05%, linhas 93,92%. Módulo novo com 100% nos
quatro indicadores. Formatação, lint, tipagem, build API, gate de 57 specs, scanner original e
20/20 evals legados mais 50/50 documentais determinísticos aprovados. Após autorização explícita
do payload ao Codex/OpenAI da conta ChatGPT, três consultas por HTTP com cadastro fictício
recuperaram nome e unidades. Não é garantia de memória ilimitada ou comprovação documental.
Revisão, autorização e limites em `docs/reviews/2026-10-29-contexto-cadastral-nas-respostas.md`.

## Histórico completo e durabilidade de lançamento — Spec 058

**Estado:** requisito definido por solicitação do usuário em 29/10/2026; implementação das
lacunas e validação de produção pendentes. Não há aprovação de lançamento.

| Requisito | Aceitação | Estado e evidência necessária |
|---|---|---|
| RQ-5801 — dois lados e falas auxiliares | AC-5801 | Perguntas/respostas normais existem em `AnswerPersistence`; falas mantidas em `setupMessages`/`documentConversationMessages` ainda precisam de persistência/reexibição completas. Testes de cobertura total pendentes. |
| RQ-5802 — recuperação e isolamento | AC-5802/5803 | Reutilizar os contratos de chats e RLS do ADR 0028; verificar também configuração anterior ao condomínio, falas auxiliares, ordem e idempotência. Cobertura completa pendente. |
| RQ-5803 — durabilidade e recuperação | AC-5804/5805 | Gate de lançamento adicionado a `quality-gates.md`; faltam ensaios completos de reinício/atualização, falhas e restauração com mensagens de ambos os lados. RAM não aprova esse gate. |
| RQ-5804 — considerar respostas anteriores | AC-5806/5807 | Replay geral seguro existe na Spec 043; replay documental com dependências atuais e histórico das falas auxiliares permanece pendente. Nenhum limite ou controle de evidência foi enfraquecido. |
| RQ-5805 — ambiente de teste | AC-5808 | `server.ts` seleciona repositórios em memória no modo de demonstração; usuário esclarecido de que reiniciar a API apaga o estado. A decisão não alterou esse runtime. |

Mudança documental: briefing, MVP, Spec 038, Spec 058, gate de qualidade e esta matriz foram
reconciliados na mesma decisão. O gate estrutural de visão não comprova persistência de produção.

## Continuação das correções Luna/Sol 6.1 — Spec 056, 29/10/2026

| Requisito | Aceitação | Implementação e verificação |
|---|---|---|
| RQ-5602 — cálculo com procedência | AC-5610/5610b/5616 | `answer-fidelity.ts` e `financial-result-table.ts` associam totais às rubricas, competências e coluna. Controles de falta, conflito, período, sinal, saldo/taxa, estilo e valor incorreto em `answer-correction-regressions.test.ts`. |
| RQ-5602 — negação e apresentação | AC-5611/5615 | Negação permanece na cláusula; JSON na fala e motivo de especialista contraditório são recusados por `citation-validator.ts`, sem extração/reclassificação automática. |
| RQ-5603 — completude pertinente | AC-5613/5615 | `answer-completion-plan.ts`, `answer-task-context.ts` e `documentary-dates.ts`: data contratual, mandato/votação, condições da reserva e fechamento trimestral, respeitando escopo e fontes atuais. |
| RQ-5604 — reparo limitado | AC-5611/5612 | Orientações internas controladas para envelope, especialista e minuta; mesmo modelo, fontes e duas tentativas. Mocks verificam reparo e falha final; caso Luna/minuta R5 reparou a claim sem conversão pelo servidor. |
| RQ-5605 — contraprova rastreável | AC-5614/5615/5616 | R4/R5 sintéticas congeladas, todas as falhas e custos preservados; revalidação offline final de 88 candidatos não promove notas históricas ou falha operacional. |

Validação: 51 regressões novas; 1.650 testes/165 arquivos do workspace aprovados. Cobertura statements 92,46%,
branches 88,37%, funções 97,16%, linhas 94,06%. Os limites e resultados qualitativos ficam em
`docs/specs/056-validacao-e-completude-sinteses/corrections-2026-10-29.md`; revisão do autor em
`docs/reviews/2026-10-29-continuacao-correcoes-luna-sol.md`. Não há nova taxa global de acerto nem
aprovação de integração/produção; recuperação de páginas ausentes e Spec 058 continuam pendentes.

## Specs 058–059 — histórico e revalidação após correções (31/10/2026)

| Requisito | Aceitação | Implementação e evidência |
|---|---|---|
| RQ-5801/5803 — registro antes da confirmação | AC-5801/5809/5813 | Journal RAM/PostgreSQL, hooks internos de respostas validadas, recibos e falha segura; `conversation-store.test.ts`, migrações 034–036 e integração sintética. |
| RQ-5802 — histórico íntegro privado | AC-5802/5803/5810/5812 | Conta/sessão antes do condomínio, associação explícita, RLS owner/tenant/chat, paginação, backfill e interface canônica; `conversation-timeline.test.ts` e integração `rls-tenant-isolation.test.ts`. |
| RQ-5803 — reinício e restauração | AC-5804/5805 | Processo Node novo recupera o journal PostgreSQL; backup serializado com checksum restaurado em schema sintético isolado, preservando RLS, FKs e escrita posterior; integração `rls-tenant-isolation.test.ts` e relatório técnico da Spec 058 de 31/10. |
| RQ-5804 — lembrança com procedência atual | AC-5806/5807/5811 | Ledger completo em auditmetadata, hashes/versões/páginas/vigência atuais, auxiliares internos, supressão documental no caminho geral; `corrections-059.test.ts`, memória integrada e 1.010 turnos pelo endpoint real. |
| RQ-5901 — páginas pertinentes | AC-5901/5902 | Reserva por unidade e campos comparáveis de versões, com filtros de escopo/qualidade/vigência; regressões `text-retrieval.test.ts`. |
| RQ-5902 — categorias e completude | AC-5902/5903/5904 | Preço por versão, aceite/encargos por unidade e rejeição de resultado ordinário sem segregação, inclusive tabelas; `corrections-059.test.ts`. |
| RQ-5903 — comparação congelada | AC-5905/5906 | `evals:corrected`: Luna high/Sol 6.1 low, 560 cenários/2.020 turnos, 560 checkpoints e 160 decisões com 79 posições comparáveis/modelo. Relatório `docs/specs/059-recuperacao-e-revalidacao-luna-sol/results-2026-10-31.md`; métricas, custos e verificação em `reports/conversations-corrected-059-2026-10-31-*.json`. Fonte congelada e exclusão 54 preservadas; notas não equivalem à acurácia global ou liberação. |

O procedimento e limites do ensaio ficam em `docs/quality/conversation-history-recovery.md`.

## Spec 060 — protocolo, JSON, recuperação e completude (31/10/2026)

| Requisito | Aceitação | Implementação e evidência |
|---|---|---|
| RQ-6001 — protocolo e diagnóstico | AC-6001 | `codex-answer-gateway.ts`: lista passiva validada/ignorada, tipos e ações desconhecidos recusados, fim do turno único; diagnóstico sanitizado preservado pelo runner. Regressões em `codex-answer-gateway.test.ts`; quatro contraprovas não reproduziram a falha histórica, sem presumir sua causa. |
| RQ-6002 — fala natural | AC-6002 | `citation-validator.ts`: assinatura com `answer`/`response`, cercas e objetos adjacentes; regressões de fala geral/documental e reparo limitado em `answer-correction-regressions.test.ts`. JSON técnico legítimo preservado. |
| RQ-6003 — páginas e referências | AC-6003/6003b | `text-retrieval.ts` reserva acordo e principal por versão para síntese plural sem IDs recentes, priorizando indicadores da faceta sobre o cabeçalho repetido; `text-retrieval.test.ts` varia identificadores e testa orçamento, qualidade e isolamento, com regressões que falham antes e passam depois da correção. |
| RQ-6004 — completude pertinente | AC-6003c/6004/6005/6005b/6005c/6005d | `answer-task-context.ts`, `answer-completion-plan.ts`, `answer-fidelity.ts` e schema Codex: competência corrigida, equivalência do resultado, principal por referência, interpretação de minuta e cálculo anual com procedência. Inferência pelas fontes exige identificação de unidade ou linha financeira; “data-base” não cria requisito de acordo. Regressões em `corrections-060.test.ts`; candidatos sintéticos e todas as falhas preservados nas contraprovas locais. |
| RQ-6005 — bateria comparável | AC-6006 | `evals:corrected`, Luna high/Sol 6.1 low, mesmos corpus/dataset/alvos e exclusão 54. Rodadas intermediária 060 e final 060b preservadas, ambas com 560 cenários/2.020 turnos e 160 registros auditados. Na final: Luna 71S/7P/1F (89,9%) e Sol 76S/3P/0F (96,2%), por 79 posições comparáveis; três eventos MCP recusados na população, um dentro da amostra Luna. Integridade, escopo, memória e HTTP aprovados no snapshot `0317dc2309c3f47fbc10872b5ccc6f259cce31dfb799315e0ad118878be07115`. [Relatório e artefatos](../specs/060-protocolo-json-recuperacao-completude/results-2026-10-31.md), sem aprovação profissional ou liberação de produção. |

## Spec 061 — custo operacional no runtime (03/11/2026)

| Requisito | Aceitação | Implementação e evidência |
|---|---|---|
| RQ-6101/6102 — seleção e esforço | AC-6101/6102 | Fábricas OpenAI/Codex, regra compartilhada e esforço Luna high/Sol 6.1 low; `runtime-cost-routing.test.ts`. Orientação geral conserva o motivo fechado na persistência; E2E da API em `runtime-cost-routing.e2e.test.ts`. |
| RQ-6103 — prefixo estável | AC-6103/6104 | Cache explícito somente de instruções genéricas na API; igualdade com prompt v27 e controles negativos em `runtime-cost-routing.test.ts`, citações em `openai-answer-gateway.test.ts`. |
| RQ-6104 — reutilização sem perda de evidência | AC-6104 | Pipeline, cálculos, memória, fontes e histórico existentes preservados; regressões de documentos, recuperação e isolamento. |
| RQ-6105 — ambiente local | AC-6105 | `.env.example`, configuração local ignorada e README; E2E `codex-conversations.e2e.test.ts`. |
| RQ-6106 — lote Sol preservado | AC-6106 | Gateway exclusivo Codex/Sol em `server.ts`; limites e revalidação existentes de `document-batch-conversation.test.ts`, seleção em `runtime-cost-routing.test.ts`. |

Gates aprovados, dois smokes reais pelo Codex e limitações ficam no
[resultado da Spec 061](../specs/061-custo-operacional-luna-sol/results.md).

## Spec 021 — tratamento confirmado sem aviso contraditório (03/11/2026)

| Requisito | Aceitação | Implementação e evidência |
|---|---|---|
| RQ-2002 — preferência explícita | AC-2105 | `development-identity.ts` aceita “Síndico”/“Síndica” confirmados, com ou sem acento, sem conceder papel ou permissão. Quatro regressões em `development-identity.test.ts` falharam antes e passaram após a correção; verificam gravação, restauração e isolamento, mantendo os controles negativos existentes. |

## Spec 057 — análise única após confirmações do lote (03/11/2026)

| Requisito | Aceitação | Implementação e evidência |
|---|---|---|
| RQ-5703 — preservar o envio completo | AC-5704a/5704b | `document-batch-response.ts` aguarda todos os arquivos e bloqueia duplicatas, cancelamento, resposta incerta e contexto antigo. `App.tsx` liga confirmações ao lote, acompanha a leitura e não dispara análise individual; aviso de recebimento deixa de gerar fala extra. Testes em `document-batch-response.test.ts`, `chat-document-presentation.test.ts` e E2E HTTP com três PDFs, dois com confirmação real e uma geração conjunta em `document-upload-batch.e2e.test.ts`. |

## Spec 057 — motivo da falha de síntese sem orientação incorreta (03/11/2026)

| Requisito | Aceitação | Implementação e evidência |
|---|---|---|
| RQ-5705 — retorno operacional fiel | AC-5711 | A rota `document-batch-conversation-route.ts` devolve apenas categorias seguras (`analysis_unavailable`, `answer_validation_failed`, `analysis_size_limit`, `analysis_failed`). Logs internos acrescentam códigos fixos para leitura, elegibilidade, extração, qualidade, segurança, análise local e saída recusada; o gateway registra falhas do processo e validação, sem conteúdo documental. `requestDocumentBatchSummary` não recomenda reduzir arquivos após falha genérica. A causa da repetição anterior continua indeterminada; nenhum conteúdo foi inspecionado ou reenviado. |

## Geração de cópias documentais revisadas — Spec 062 (03/11/2026)

| Requisito | Aceitação | Estado e evidência necessária |
|---|---|---|
| RQ-6201/6208 — oferta, confirmação, autorização e isolamento | AC-6201/6202/6210 | A pergunta acontece após mudanças seguras identificadas; criação exige confirmação do conjunto proposto. Implementação e testes sintéticos pendentes. |
| RQ-6202/6203/6204 — mudanças e evidência | AC-6204/6205/6206 | Escopo limita mudanças factuais a fontes autorizadas; regressões de sentido, conflito e abstenção pendentes. |
| RQ-6205/6209 — origem e instruções não confiáveis | AC-6203/6211/6212 | Original imutável, derivado vinculado e não indexado; purge e proteção contra instruções hostis precisam de validação em implementação. |
| RQ-6206/6207 — fidelidade e apresentação | AC-6207/6208 | PDF de rascunho somente quando ordem, dimensões e conteúdo forem validados; bateria sintética de layout e ADR pendentes. |
| RQ-6210 — não promoção automática | AC-6209 | O derivado não é fonte até novo envio explícito; integração futura deve provar que busca e respostas documentais não o incluem. |

Esta entrada registra a decisão de escopo e os critérios, não uma implementação aprovada. Nenhum artefato de usuário é gerado ou indexado nesta tarefa; os gates de implementação e liberação continuam pendentes.

## Specs 024/026 — pergunta pendente antes da conclusão (03/11/2026)

| Requisito | Aceitação | Implementação e evidência |
|---|---|---|
| RQ-2402 e RQ-2605 — fala coerente com a transição | AC-2403a | `setup-turn-flow.ts` deriva a próxima pergunta das transições validadas; `setup-turn.ts` fornece as transições e permite uma reparação limitada sem alterar os dados. Regressões em `setup-turn.test.ts` cobrem conclusão após o nome, perguntas de unidades, correções e vários condomínios; `api-setup-message.test.ts` verifica HTTP e que a fala rejeitada não entra no histórico. `gemini-setup-contract.test.ts` mantém os mesmos controles negativos de schema com falas válidas para a etapa. |

## Spec 058 — uma bolha por upload confirmado (03/11/2026)

| Requisito | Aceitação | Implementação e evidência |
|---|---|---|
| RQ-5802 — reconciliar anexo temporário e histórico | AC-5814 | `recordedDocumentUploads` identifica entradas confirmadas por mensagem/versão no escopo atual. `RecordedDocumentUpload` conserva o estado de leitura na entrada histórica; `DocumentBatchProgress` deixa de repetir o mesmo condomínio/versão. `chat-document-presentation.test.ts` cobre chegada do histórico, atualização repetida, recarga, ordem, pendência, erro e nomes iguais; `conversation-timeline.test.ts` cobre identificação e ausência de contexto. A regressão falhou antes da correção. |

## Spec 058 — aceitar ajuda documental sem perder a fonte (03/11/2026)

| Requisito | Aceitação | Implementação e evidência |
|---|---|---|
| RQ-5804 — continuidade depois do comentário documental | AC-5815 | `conversation-memory.ts` resolve aceitações breves com citações recentes somente como referência local de busca; a pergunta final de ajuda identifica a intenção aceita no foco, com fonte atual da mesma versão/página. `answer-use-case.ts` recupera novamente as evidências e conserva a pergunta original; o corpo da fala antiga continua omitido sem ledger. `document-summary-continuation.e2e.test.ts` envia uma convenção fictícia de oito páginas preenchidas e cobre três aceitações, reparo, ausência de evidência, novo chat e mudança de assunto. `conversation-memory.test.ts` cobre limites, instrução hostil, fonte removida, legislação e janela. `document-availability.test.ts` recusa a falsa negação de acesso acompanhada de finalidade. Quatro regressões falharam antes da correção. Gates, smoke Luna/Sol e limites em `docs/reviews/2026-11-03-continuidade-apos-convencao.md`. |

## Spec 057 — escopo da convenção e inferência de vigência (03/11/2026)

| Requisito | Aceitação | Implementação e evidência |
|---|---|---|
| RQ-5703/5704 — não introduzir tarefa financeira ausente | AC-5714 | `document-batch-conversation.ts` condiciona a orientação financeira à análise local do envio. `prompt-catalog.ts` v28 proíbe mencionar balancetes ou sua ausência no comentário sem escopo financeiro. `document-batch-conversation.test.ts` cobre convenção com cláusulas de rateio, apoios financeiros no catálogo e lote misto; `prompt-catalog.test.ts` preserva pedidos financeiros explícitos. |
| RQ-5703/5704 — distinguir registro de aprovação/subscrição | AC-5715 | Prompt v28 distingue ausência de registro, ausência de comprovação e pendência explícita. Regressão em `prompt-catalog.test.ts` e três smokes reais Sol 6.1 low com convenções fictícias aprovadas, pendentes e sem prova. Cinco regressões falharam antes da correção; o PDF do usuário não foi usado nos testes ou smokes. |

## Specs 037/058 — competência no cabeçalho e confirmação pela conversa (03/11/2026)

| Requisito | Aceitação | Implementação e evidência |
|---|---|---|
| RQ-3701 — período não altera o nome | AC-3702/3705 | `document-condominium-check.ts` separa mês/ano explícito antes do corte do ano. `document-condominium-check.test.ts` cobre os doze meses, formatos alternativos e qualificadores reais; E2E com PDFs fictícios confirma ausência de bloqueio e de geração para nomes equivalentes. |
| RQ-3703 — decisão no compositor normal | AC-3701/3707 | `document-condominium-confirmation.tsx` apresenta somente a fala; `App.tsx` recebe a decisão pelo envio normal. `document-use-decision.ts` compartilha reconhecimento prudente com a API, sem autorizar perguntas, texto ambíguo ou conteúdo documental. Testes de HTML, contrato e E2E validam o fluxo, incluindo recusa sem liberação. |
| RQ-3703 — uma pendência atual | AC-3707 | `App.tsx` apresenta a próxima divergência depois da decisão da atual; `queueDocumentConfirmation` preserva ordem e vínculo com o lote ao reabrir pela biblioteca. Regressões em `document-batch-response.test.ts`; bloqueio e análise única do lote continuam cobertos pelos testes existentes. |
| RQ-5801 — texto original e retomada | AC-5816 | Journal registra a aceitação/recusa literal na versão e conversa autorizadas. `document-condominium-confirmation.e2e.test.ts` cobre recuperação, recibo repetido e falha de gravação após a aplicação da decisão: retorna 503, permite concluir o registro e não duplica a mensagem. |

Resultados e limites em [resultado da Spec 037](../specs/037-confirmacao-condominio-documental/results-2026-11-03.md).

## Spec 056 — valores sem símbolo em tabelas financeiras (03/11/2026)

| Requisito | Aceitação | Implementação e evidência |
|---|---|---|
| RQ-5602 — fidelidade monetária | AC-5617 | `source-monetary-amounts.ts` reconhece células literais com moeda declarada nos trechos citados da mesma versão e cabeçalho/seção financeira local. `financial-source-amounts.test.ts` cobre formatos, percentuais, áreas, prazos, contagens, precisão, moeda estrangeira, trecho independente e versão divergente. Não altera citações nem presume moeda pelo nome. |
| RQ-5602 — origem canônica | AC-5617 | `citation-validator.ts` usa citações já validadas na guarda de fidelidade; omissão ou falsificação de `sourceScope` não trata legislação como tabela financeira do condomínio. Regressões negativas no mesmo arquivo de testes. |
| RQ-5602 — fluxo documental | AC-5617 | E2E com PDF fictício de três páginas, extração e recuperação reais: análise correta fica `grounded` na primeira tentativa; valor adulterado permanece bloqueado após duas tentativas. Excerpt original sem “R$” conservado. Um smoke real Sol 6.1 low passou, e o replay da mesma resposta no validador antigo reproduziu `unsupported_monetary_assertion`. |

Gates, snapshot, consumo, diagnóstico local e limites em
[resultado da Spec 056](../specs/056-validacao-e-completude-sinteses/table-currency-results-2026-11-03.md).

## Specs 046/056 — regressões dos três balancetes (04/11/2026)

| Requisito | Aceitação | Implementação e evidência |
|---|---|---|
| RQ-5602 — contexto monetário entre páginas | AC-5618 | `source-monetary-amounts.ts` e `citation-validator.ts` acrescentam somente contexto autorizado da mesma versão; fragmentos contíguos conservam tabela sem alterar trechos públicos. `financial-source-amounts.test.ts` cobre declaração recuperada, conflito, versão, qualidade, estado, contiguidade e unidades não monetárias. |
| RQ-5602 — células e contas em centavos | AC-5619 | `financial-arithmetic.ts` verifica igualdades, operandos, diferenças e totais por coluna; recusa equação incorreta, precisão insegura, troca de rubrica/ano, cabeçalho de outra tabela e autorreferência. `financial-arithmetic.test.ts` e `financial-source-amounts.test.ts` conservam controles positivos e negativos, sem exceção por documento ou valor da bateria. |
| RQ-4603 — consulta financeira não é cadastro | AC-4603b | `confirmed-profile-context.ts` mantém rateio, emissão, reserva e inadimplência no caminho documental. Testes unitários e `registered-profile-context.e2e.test.ts` exercitam a pergunta composta pelo endpoint com perfil cadastrado; perguntas somente de nome/quantidade continuam dispensando busca. |
| RQ-4603 — faceta e contexto dentro do orçamento | AC-4603b | `retrieval-query.ts` reconhece títulos separados por sublinhados. `text-retrieval.ts` prioriza notas/células explicitamente pedidas e moeda da mesma versão, com filtros de tenant, estado, qualidade e vigência e máximo de oito fontes. `text-retrieval.test.ts` usa distratores e controles de outro condomínio, baixa qualidade e data futura. |

O trabalho dessa bateria foi pausado por autorização do usuário; sua revisão e seu relatório
semântico ainda não foram concluídos. O gate determinístico consolidado passou conforme
o resultado da Spec 057 abaixo.

## Specs 057/058 — legenda de envio e diagnóstico (04/11/2026)

| Requisito | Aceitação | Implementação e evidência |
|---|---|---|
| RQ-5703/5705 — aviso não é pergunta | AC-5716 | `conversation-intent.ts`, `answer-use-case.ts` e coordenação de upload distinguem aviso inequívoco de pergunta/ressalva. Unitários cobrem positivos e negativos; E2E espera todas as confirmações e gera uma fala para o lote. Smoke real: aviso sem busca e lote Sol fundamentado. |
| RQ-5801 — legenda literal recuperável | AC-5817 | Transporte, endpoint e `conversation-journal.ts` conservam legenda no mesmo chat/condomínio antes do ACK. E2E verifica texto literal uma vez, repetição sem nova geração, conflito de conteúdo e recusa de pergunta pelo contrato de legenda. |
| RQ-5705 — diagnóstico seguro | AC-5717 | Lista de 24 códigos no validador e observador opcional no caso de uso/servidor. Testes cobrem recusa conhecida, código desconhecido, falha do observador e reparo bem sucedido, sem vazamento do sentinela privado. |

Gates, reprodução, revisão e limites no [resultado da Spec 057](../specs/057-respostas-diretas-e-analise-conjunta/upload-caption-results-2026-11-04.md).

## Spec 064 — convenção e três atas para demonstração

| Requisito | Aceitação | Implementação e evidência |
|---|---|---|
| RQ-6401 — corpus sintético | AC-6401 | Quatro originais em tests/fixtures/demo-documents, com duas páginas cada; fixture usa upload, extração e leitura privada reais. Teste verifica oito páginas prontas, original idêntico e recusa de outro usuário. |
| RQ-6402 — duas rodadas congeladas | AC-6402/6403 | Comando evals:demo-documents, 60 e 30 situações distintas para Luna high/Sol 6.1 low; snapshot e checkpoints reutilizam integridade da Spec 063. Plano não chama modelo. |
| RQ-6403 — medição e diagnóstico | AC-6404/6405 | Avaliação registra fatos ausentes na resposta e no input, citações, protocolo, tentativas e consumo. Testes recusam resposta vazia, citação falsa e protocolo; aceitam fonte equivalente e abstenção correta. 120 + 60 respostas originais, revisão técnica por ponto, replays e duas contraprovas reais registrados. |
| RQ-5602/5604 — execução não presumida | AC-5620 | documentary-execution.ts impede afirmar ocorrência com fonte apenas prospectiva; testes preservam execução comprovada, hipóteses e recomendações e verificam o reparo limitado. |
| RQ-5702 — fontes na apresentação própria | AC-5718 | Validador retira somente marcador decorativo isolado ao final da fala já validada, conservando fontes e trechos; regressões positivas e negativas. |
| RQ-5602/5604 — cronologia explícita | AC-5621 | answer-temporal-order.ts compara antes/depois entre mandato/posse e assembleia com datas citadas, controla igualdades/associação/ausência de fonte e aciona reparo; teste do caso de uso verifica duas tentativas. |
| RQ-5602 — negativa de proposta monetária | AC-5622 | Fidelidade aceita negativa isolada de multa/taxa com uma quantia, inclusive negrito; valores positivos, adicionais ou confirmados depois da negativa continuam recusados. Regressões usam três quantias distintas do eval. |

Resultados originais, gates e limites em [Spec 064](../specs/064-demonstracao-quatro-documentos/results-2026-11-04.md).

## Spec 064 — extensão de conversas longas

| Requisito | Aceitação | Implementação e evidência |
|---|---|---|
| RQ-6404 — continuidade real | AC-6406/6407 | evals:demo-long fixa três roteiros de 30 turnos por modelo, mantém um chat por roteiro e usa respostas reais na sequência. Teste determinístico verifica memória do turno anterior e os dois lados no journal, sem contexto no outro chat. |
| RQ-6404 — limite e omissão distintos | AC-6408 | Capturas de memória, fontes e foco por tentativa; sondagens próximas/distantes de anotação do usuário separam presença no input, resposta, limitação declarada e lembrança sem suporte. Sem ampliar oito turnos/12.000 bytes/oito fontes. |
| RQ-6404 — resultados preservados | AC-6409 | 180 respostas em seis chats; 18 conferências literais de histórico e seis controles de chat vazio/usuário recusado aprovados. Retomada das seis conversas sem novas inferências, com 190 arquivos de checkpoint/manifesto inalterados. Revisão técnica por IA concluída; revisão especializada pendente. |
| RQ-6404 — falha explícita no avaliador | AC-6410 | long-assessment.ts recebe o diagnóstico terminal já capturado. Regressão impede fallback não vazio de parecer completo ou limitação legítima; sucesso sem recusa mantém a nota. Checkpoints originais não são reavaliados ou sobrescritos. |

Protocolo, resultados por modelo e falhas funcionais abertas em [conversas longas da Spec 064](../specs/064-demonstracao-quatro-documentos/long-results-2026-11-04.md).

## Spec 065 — pesquisa pública isolada na demonstração

| Requisito | Aceitação | Implementação e evidência |
|---|---|---|
| RQ-6501 — opt-in | AC-6501/6502 | Factory exige demo/Codex fora de produção; classificador aceita só pedido explícito e mapeia sete temas para constantes públicas. Testes de configuração e temas desconhecidos. |
| RQ-6502 — privacidade | AC-6503 | Use case pula retrieval, memória e perfil; gateway recusa contexto e só encaminha tópico fixo. Testes com canários e E2E com conversa anterior privada. |
| RQ-6502 — protocolo/fontes | AC-6504 | Somente web hospedada no subprocesso isolado; conclusão, URLs reais oficiais e referências verificadas. Regressões de ferramenta local, evento inválido, link inventado e ausência de pesquisa. |
| RQ-6503 — apresentação | AC-6505 | Parser de links HTTPS oficiais conserva HTML literal; JSX usa noopener/noreferrer. Textos públicos não simulam citação de PDF. |
| RQ-6503 — histórico e falhas | AC-6506/6507 | Journal normal conserva ambos os lados, idempotência impede nova chamada e replay seguro é falso. E2E distingue chat privado 404 e condomínio sem autorização 403. Sem fallback pago. |
| RQ-6501–6503 — verificação | AC-6508 | Nove testes dedicados, gate completo com 2.062 testes e três pesquisas técnicas públicas, inclusive no preview ativo; [resultados e limites](../specs/065-pesquisa-web-demonstracao/results-2026-11-04.md). |

## Spec 065 — decisão automática e progresso de pesquisa — 04/11/2026

| Requisito | Aceitação | Implementação e evidência |
|---|---|---|
| RQ-6501 — pesquisar quando o assunto exigir fonte pública | AC-6502 | `demo-web-research.ts` compartilhado reconhece os temas públicos sem comando explícito, preserva recusa e consultas documentais e retorna somente tópicos constantes. Unitários cobrem os sete temas, recusa, documento enviado, consulta local e retomada ambígua. |
| RQ-6503 — aviso antes da resposta | AC-6509 | `question-research-progress.ts` antecipa o sinal apenas depois da autorização e do início da tentativa; `question-response.ts` e `App.tsx` mostram “Pesquisando na internet” enquanto o corpo é aguardado e limpam o estado ao terminar. E2E HTTP segura a geração e verifica que o sinal chega antes do corpo. |
| RQ-6502/6503 — histórico e falha preservados | AC-6503/6506/6509 | Envelope final é aplicado depois do journal. E2E confirma ambos os lados recuperáveis, aviso ausente do histórico, repetição sem nova pesquisa, acesso negado sem aviso e falha de gravação com status de erro. `question-response.test.ts` cobre protocolo incompleto, erro e interrupção; clientes sem negociação conservam JSON normal. |

Gates e limites em [pesquisa automática e progresso](../reviews/2026-11-04-pesquisa-automatica-progresso.md).
Ativação após reinício autorizado e três pesquisas reais aprovadas em
[reinício e três testes reais](../reviews/2026-11-04-pesquisa-automatica-tres-testes.md).

RQ-6504 / AC-6510–6512: `public-service-research.ts` reconhece limpeza de caixas d’água e
valida município/UF em lista pública incorporada do IBGE; só a consulta canônica atravessa
a fronteira. O gateway mantém políticas separadas de fonte oficial e empresarial observada.
`public-service-research.test.ts` cobre sanitização, homônimos, fontes e URLs perigosas;
`demo-web-research.e2e.test.ts` cobre retomada pelo último pedido, mudança de assunto,
outro chat e autorização, com canários privados ausentes do subprocesso.
Gates e pesquisas reais em [prestadores e retomada](../reviews/2026-11-04-pesquisa-prestadores-retomada.md).

## Spec 066 — documentos de teste locais

| Requisito | Aceitação | Implementação e evidência |
|---|---|---|
| RQ-6601 — opt-in local | AC-6601/6602 | Factory Codex valida ambiente antes da seleção; `local-test-documents.test.ts` cobre padrão, mensagem não confiável e ambientes proibidos. |
| RQ-6602 — análise natural | AC-6603/6605 | Contexto confiável adicional no gateway local; rótulos não causam recusa nem aviso rotineiro, sem atestar autenticidade. Citações originais preservadas. |
| RQ-6603 — limites | AC-6604/6605 | Mesmos schemas/validadores; regressões de fonte inventada, versão pending, ausência de evidência e setup inalterado. |
| RQ-4601/4602 e RQ-6605 — modo/citação e fala útil | AC-4601c/6607 | Instrução específica de reparo, contexto vazio somente para esse erro, v2 local e falha pública breve; `mode-citation-repair.test.ts` conserva duas chamadas, fontes e auditoria. Oito turnos reais sintéticos passaram na primeira geração. [Gates e limites](../specs/066-documentos-teste-locais/results-2026-11-04-mode-citation.md). |
| RQ-6604 — reversibilidade | AC-6605/6606 | Sufixo de versão, propagação híbrida/lote sem geração extra; README e .env.example documentam ativação, reversão e RAM. 2.128 testes e gate completo aprovados na última execução, oito turnos reais sintéticos; API reiniciada com autorização. [Resultados atuais](../specs/066-documentos-teste-locais/results-2026-11-04-mode-citation.md). |

## Spec 048 — tom direto e respeito à recusa — 04/11/2026

| Requisito | Aceitação | Implementação e evidência |
|---|---|---|
| RQ-4801/4802 — recomendação positiva | AC-4808 | v29 recomenda diretamente, com benefícios gerais/proposta pública verificada em 04/11; referência da empresa é omitida antes da verificação e a partir de 04/12. Unitários cobrem fronteiras e ausência da instrução antiga de rótulo espontâneo. |
| RQ-4803 — encerrar oferta | AC-4809 | Política proíbe insistência e nova oferta; recusa inequívoca vira service_decline e dispensa retrieval/citação. Unitários têm formas curtas e controles negativos; E2E conserva memória e quatro mensagens sem consultar o índice na recusa. A contraprova real confirmou reconhecimento sem fallback. |
| RQ-4802 — explicar critérios | AC-4810 | Se perguntada, explica diretriz da Alvitra sem alegar experiência, comparação independente ou relação financeira não comprovada. Rótulo automático removido por instrução explícita e briefing/MVP atualizados na mesma decisão. |
| RQ-4805 — apresentação e validação | AC-4807/4808–4810 | Trecho integral apresentado em prompt-ajuste-2026-11-04.md antes da aplicação; comando existente evals:zermatt agora prepara 12 cenários/17 turnos. Sondagem real de quatro turnos por modelo usa Luna high/Sol 6.1 low, sem documentos privados. |

[Resultados e limites do ajuste da Zermatt](../specs/048-recomendacao-zermatt/results-2026-11-04.md).

## Spec 068 — entrada por código e aparelhos lembrados

| Requisito | Aceitação | Implementação e evidência |
|---|---|---|
| RQ-6801 — código fornecido | AC-6801/6806 | CLI `access:issue`, HMAC e hash no cofre; sem emissão pública. `access-code.test.ts` e `access-code.e2e.test.ts`. |
| RQ-6802 — retorno automático | AC-6802/6807/6808 | Cookie HttpOnly renovável, segredo estável, arquivos atômicos e PostgreSQL; `access-session.test.ts` distingue 401 de rede/503 e não usa localStorage. |
| RQ-6803 — conectar aparelhos | AC-6803 | `AccessCodeConnection.tsx` mostra e copia somente código da sessão; E2E conecta duas sessões independentes à mesma identidade. |
| RQ-6804 — autorização/revogação | AC-6804/6805/6808 | Servidor ignora identidade de desenvolvimento com código ativo; isolamento por condomínio, logout e rotação testados. Integração verifica bloqueio/MFA, persistência e privilégios mínimos. |

Resultados e limites: [validação da entrada por código](../reviews/2026-11-05-entrada-por-codigo.md).

Decisão de evolução de 05/11/2026: nova entrada por telefone e código temporário em cada aparelho,
sem revogar os demais. FUT-6809–6812 registram mesma conta, sessões independentes, saída local,
códigos vinculados à tentativa e independência de IP. **Somente planejamento:** integração,
provedor, testes de execução e entrega pelo WhatsApp ainda não implementados. Não confundir nova
emissão temporária com a rotação administrativa do código permanente da demonstração.

## Spec 069 — worker documental contínuo e separado

| Requisito | Aceitação | Implementação e evidência |
|---|---|---|
| RQ-6901 — processo contínuo | AC-6901 | `continuous-worker.ts`, configuração validada e `worker/main.ts`; testes de ociosidade, sequência, erro, sinal e fechamento do pool. |
| RQ-6902/6903 — reserva e retomada | AC-6902/6903 | Renovação escopada e fencing na gravação; fila conclui tentativas esgotadas e mantém falha transitória em processamento. Regressão da versão já reservada em `worker-processing-ownership.test.ts`. |
| RQ-6904 — retomada no chat | AC-6904/6905 | API sem worker incorporado, monitor de catálogo também para uploads recuperados e `recovered-document-progress.ts`, sem geração de fala ou análise automática. |
| RQ-6905 — preparação operacional | AC-6908 | `render.pilot.yaml`, comandos contínuo/compilado e runbook de publicação, rollback compatível e recuperação completa. Não houve contratação ou deploy. |
| RQ-6906 — ensaio sintético | AC-6904/6906/6907 | `test:worker:separate` valida processos distintos, dez identidades, 300 páginas, interrupção, retomada, dois workers, tentativa antiga e falha terminal em destino guardado. Relatório em `reports/worker-separated/latest.json`. |

Gates, resultados e limites em [validação da Spec 069](../specs/069-worker-documental-separado/results-2026-11-05.md).

## Reexecução das baterias — 06/11/2026

[Resultados desta rodada](test-results-2026-11-06.md): 2.226 testes de unidade/E2E, cobertura exclusivamente unitária, 17 integrações Neon, 9 grupos do worker separado, PDFs de 300 páginas e contratos sintéticos documentais/conversacionais. Os 50 casos da Spec 036 foram gerados pelo gateway Codex local autorizado: 46 contratos válidos e quatro rejeições `answer_body_protocol_json`, sem aprovação semântica especializada. O replay sintético da Spec 041 conservou a falha de atendimento em `CONV-long-36/30`. Resultados mecânicos e julgamentos de qualidade permanecem separados; nenhuma spec recebeu aprovação ou ampliação de escopo por essa reexecução.

## Correções da bateria — 06/11/2026

| Requisito | Aceitação | Implementação e evidência |
|---|---|---|
| RQ-6002 e RQ-6604/6605 | AC-6002b e AC-6608 | `codex-answer-gateway.ts` seleciona fala natural sem fontes e conserva JSON com fontes; variante v3. `local-test-documents.test.ts` cobre os dois contratos, setup e rejeição de envelope sem extração. Os quatro casos históricos passaram na nova geração real. |
| RQ-6004 | AC-6005e | `synthetic-agenda.ts`, `synthetic-agenda.test.ts` e asserções acrescidas a `conversation-evals.e2e.test.ts` preservam título, versões e rascunho na janela existente. Replay final: 280 cenários/1.010 turnos sem `failed`; sequência real: 30 turnos e fechamento alvo válido. |

[Resultados e limitações](../specs/060-protocolo-json-recuperacao-completude/results-2026-11-06.md): zero JSON na nova rodada, 49 contratos documentais válidos e uma rejeição financeira diferente preservada. Revisão especializada e revisão independente para merge continuam pendentes.

## Preparação local do piloto de 16/11/2026 — segurança e dados

| Requisito | Aceitação | Artefato e limite da evidência |
|---|---|---|
| RQ-1101 — participação/autorização | AC-1102/1110 | Minutas em `docs/security/pilot-2026-11-16/`: termo, autorização, aviso, política candidata e matriz D01–D12. Não aprovadas; política sintética permanece vigente. |
| RQ-1102/1104/1105 — isolamento e liberação | AC-1101/1103/1105/1107/1108 | Inventário em `docs/release/pilot-2026-11-16-security.md` e registro de gates por commit/configuração. Restore integral, export/purge, revogação, OCR/fotos, revisão independente e gateway efetivo ainda bloqueiam liberação. |
| RQ-1103/1106 — tarefa e acompanhamento | AC-1104/1106/1109 | Roteiro presencial de 60 min, tarefa sem anexo inicial, fontes, abstenção, aparelhos, consentimento separado para eventual gravação, métricas, suporte, pausa e quatro semanas. Não houve sessão/convite real. |
| RQ-6805 — abuso persistente | AC-6813/6814/6815 | `login-attempt-limit.ts`, cofre local, serviço e rota: reserva atômica antes do parsing; dez/origem e mil globais/15 min, HMAC, 429/503. Novos testes `login-attempt-limit.test.ts` e `access-code-abuse.e2e.test.ts` demonstram concorrência entre instâncias locais, recriação, janela, teto, parsing, corrupção e sessões preservadas. |
| RQ-6805 — PostgreSQL | AC-6816 | Adaptador parametrizado e migration `040_access_login_attempt_limits.sql`, tabela privada/RLS e linha global travada, relógio do banco. Contrato mockado validado localmente; migration/concorrência em PostgreSQL não executadas nesta rodada. ADR 0044. |

Comando registrado: `pnpm run test:pilot:security`. Resultados e limites finais desta fatia em
`docs/reviews/2026-11-09-pilot-security-local.md`. Gates globais adiados durante edição concorrente;
não declarar cobertura, qualidade semântica, conformidade jurídica ou readiness real.

## Integração da preparação operacional — Spec 070

| Requisito | Aceitação | Artefato e limite da evidência |
|---|---|---|
| RQ-7001 — preparação sem ativação | AC-7001 | `pilot:preparation`, Blueprint e decisões de exemplo; `pilot-operations.test.ts`. Validar arquivo não ativa nem aprova decisão. |
| RQ-7002/7003 — backup/restore integral | AC-7002/7003/7004 | `pilot-recovery.ts`, guardas locais, manifesto/checksum/inventário, testes mockados e runner `test:pilot:recovery:local`. AC-7004 pendente de execução real local com PostgreSQL/CLI. Sem prova no destino remoto. |
| RQ-7004 — operação e decisões | AC-7005 | Nota `pilot-2026-11-16-infrastructure.md`, runbooks e matriz de decisões; custos não aprovam orçamento. Comandos integrados em package.json/README/AGENTS, sem dependência nova. |

Revisão técnica por IA desta integração registrada em
`docs/reviews/2026-11-09-pilot-infrastructure-ai-review.md`, com hashes e limites próprios;
não certifica liberação, aprovação jurídica, revisão humana independente ou gates globais.

## Continuidade do piloto sem WhatsApp — esclarecimento de 09/11/2026

| Requisito | Aceitação | Evidência e limite |
|---|---|---|
| RQ-6802 — aparelho lembrado | AC-6817 | `access-code-continuity.e2e.test.ts`: recria API/cofre com relógio dois anos à frente, renova cookie sem nova chamada de login e recupera de 503 sem limpar sessão. Não é ensaio de retenção do cookie pelo navegador. |
| RQ-6803 e RQ-5801/5802 — histórico da conta | AC-6818 | Abertura da Alvitra e mensagem/resposta são lidas literalmente por outro aparelho da mesma conta. Logout de A preserva B e histórico; outra conta do mesmo condomínio recebe 404. Journal em RAM não prova durabilidade PostgreSQL. |
| RQ-6803 e RQ-5803 — confirmação segura | AC-6819 | Falha de append devolve 503, outro aparelho não recebe fala não salva e retry idempotente registra os dois lados uma vez. Suítes de journal/timeline conservam os cenários existentes. |
| RQ-6801 e RQ-1101 — sequenciamento | AC-6820/1111 | Código da equipe no piloto fechado, sem telefone/WhatsApp. Integração de WhatsApp reservada à abertura pública; sessões persistentes e histórico completo seguem obrigatórios no piloto. |

`test:pilot:security` agora usa configuração própria com cache exclusivo por processo e sem
cobertura. Resultado desta rodada e hashes em `docs/reviews/2026-11-09-pilot-continuity-local.md`;
nenhuma chamada externa, migration ou modificação de prompt integra essa verificação.

## Spec 072 — reserva durável de consumo

| Requisito | Aceitação | Implementação / limite |
|---|---|---|
| RQ-7201 — política e tetos | AC-7201/7202 | `operation-budget.ts`, arquivo sintético com lock e adaptador PostgreSQL. Tetos de custo/quantidade/concorrência por escopo e global; default negado. Política real/SQL/integração não aprovados. |
| RQ-7202 — idempotência | AC-7203 | Claim por token aleatório salvo por hash; quatro processos Node independentes comprovam uma execução sintética. Mesmo condomínio compartilha teto entre usuários. |
| RQ-7203 — conclusão/incerteza | AC-7204/7205 | Cancelamento só antes do claim, custo máximo conservado, moeda registrada, unknown retém reserva e dia novo não apaga concorrência. Migração privada 040 preparada, não aplicada. |
| RQ-7204 — composição | AC-7206 | Wrapper revalida autorização e finaliza antes do retorno. Falha de journal ou confirmação de commit perdida não chama novamente; resultado não é armazenado no recibo e recuperação permanece contrato externo. |
| RQ-7205 — isolamento | AC-7207/7208 | Schema fechado sem payloads, SQL parametrizado/transação/roles, políticas privadas e erros fechados. Contratos PG mockados não certificam RLS/SQL. UUIDs operacionais sem cascade preservam consumo/idempotência; retenção precisa de aprovação. |

Comando `test:pilot:budget` registrado em package.json/README/AGENTS; evidências em
`docs/reviews/2026-11-09-pilot-budget-local.md`. Gates globais aguardam candidata estável;
ligação central pertence à frente documental, sem autorização positiva de dados nesta entrega.

AC-7209 é coberto por regressão de relógio anterior ao recibo confirmado e pela finalidade
`photo_ocr` distinta da análise visual. Resultado final desta seleção: 30 testes de orçamento,
77 na seleção ampliada; cobertura focada dos três módulos acima de 80% nos quatro indicadores.

## Histórico — integração documental da Spec 071 antes da correção

| Requisito | Aceitação | Implementação / limite da evidência |
|---|---|---|
| RQ-7101 — autorização explícita | AC-7101 | Executor e guardas de startup negados por padrão; testes da frente documental. Nenhuma política positiva fornecida. |
| RQ-7102/7106 — processamento e foto integral | AC-7102/7103/7105/7109/7110 | Adaptador hospedado, conversão foto→PDF e finalidade `photo_ocr` em preparação. OCR/modelos não executados nesta frente; nova extensão exige evidência própria. |
| RQ-7103 — deduplicação e política | AC-7104 | Fila/cache e ledger durável. P1 então aberto em `2026-11-09-pilot-documents-security-review.md`; corrigido/revalidado na continuação mapeada abaixo. |
| RQ-7104/7105 — síntese e falhas | AC-7106/7107/7108 | Gateway de lote e journal antes do ACK; mocks anteriores não comprovam persistência PostgreSQL ou qualidade semântica real. |
| RQ-7107/7108 — ledger de chamada e isolamento | AC-7111/7112/7113/7114 | Ledger transacional/arquivo sintético/adaptador PostgreSQL em edição; resultado privado, claim e custo exigem composição revisada com Spec 072 e prova SQL/restore. |

Nota da frente: `docs/release/pilot-2026-11-16-documents.md`. O manifesto anterior de 214 testes
não certifica a extensão nova. Inspeção parcial por IA e contraprova sintética não aprovam
diff completo, dados reais, fornecedor, integração central ou gates globais.

## Continuação local autorizada — composição e SQL real

| Requisito | Aceitação | Evidência e limites |
|---|---|---|
| RQ-7103/7107/7108 — revisão durável | AC-7117 | `hosted-policy-continuity.test.ts`: sete falhas antes/sete sucessos depois; mesma chave, comparação da revisão e legado fechado. SQL local + processos + restore recusam B e recuperam A. P1 corrigido; revisão parcial independente por Infraestrutura, sem review completo do branch. |
| RQ-7110 e RQ-7206 — composição | AC-7118/7210 | `hosted-operation-budget.ts`, fábrica pareada de autorização/controle, quinze testes novos e seleção de 158 testes. Teto antes do envio, quota conservadora, replay sem reserva nova e falhas entre stores/journal. |
| RQ-7201/7202/7205 — PostgreSQL | AC-7202/7203/7207/7208 | `tests/isolated/pilot-security-postgres.test.ts`: migrations 039/040 em bancos próprios, reservas concorrentes API/worker, claim único, cota entre usuários, RLS/grants, falta de membership, unknown preservado após restore. Nenhum alvo remoto. |
| RQ-6805 — contador SQL | AC-6816 | Mesma prova local: dez/origem em corrida, mil globais, funções privadas e contadores no backup. Contratos locais anteriores preservados. |
| RQ-5801/5803 e RQ-7002/7003 | AC-5801/5803/7008 | Processos Node separados + ledger/budget/journal PostgreSQL + dump/restore integral, conferência literal dos dois lados e negativa de outra conta. Não prova política de retenção/exclusão nem IA externa. |

Resultados exclusivos: `.local/pilot-security/integration-1794250344438-18288/` (158 casos,
cobertura focada 95,94/94,11/100/97,32), `.local/pilot-security/postgres-1794250651348-7504/`
(três provas SQL ampliadas) e recibos em `.local/pilot-operations/security-*/`. Infraestrutura
acrescentou prova independente AC-7008; ver sua nota e revisão identificada. Comandos registrados
em package.json/README/AGENTS. Gates globais são coordenados por janela, sem esconder falhas.

## Candidata local integrada — janela 02

| Requisito | Aceitação | Evidência final |
|---|---|---|
| RQ-7111 — admissão da API | AC-7119 | `operation-control.ts`, bindings de create-api e startup negado; nove testes unitários da fábrica, seis HTTP e caso de worker da integração. Controle vem do servidor, não do payload. |
| RQ-7002/7003 e integração ampliada | AC-7008 | Restore integral PostgreSQL com ledger/orçamento/login, pools mínimos, processos distintos, política A/B, unknown e histórico dos dois lados. Recibos da Infraestrutura e três provas adicionais de Segurança. |
| Backend local de validação | AC-7009 e AC-6906/6907/6908 | `local-integration-guard.ts`, wrapper por suíte e runners sem env-file: 17 testes RLS e nove grupos de worker/API separados, 300 páginas e dez identidades. Bancos exclusivos; containers encerrados. |
| RQ-201/202 e critérios de lançamento | Gates aplicáveis | Check completo aprovado, 2.347 unidades, 232 E2E; cobertura unitária 89,02/85,09/93,92/90,84, 72 specs, scanner, builds/runtime e evals determinísticos. Sem excluir produção ou reduzir assertivas. |

Relatório final em `docs/reviews/2026-11-09-pilot-integration-local.md`; hashes de 834 entradas
conferidos após a correção delimitada do teste de startup e da numeração RQ-7110/7111.
Falhas anteriores preservadas. Replays sintéticos (50 documentos e 280 cenários/1.010 turnos)
comprovam contrato mecânico, com zero inferência externa/aprovação semântica especializada.
Review completo, CI remoto, decisões de dados/fornecedor/limites e destino real continuam pendentes.

## Histórico da continuação local de 11/11 — planos restritivos e identidade canônica

| Requisito | Aceitação | Evidência e limite atual |
|---|---|---|
| RQ-7207 — decisões fora do snapshot | AC-7211/7212 | `synthetic-maintenance-plan.ts`, `synthetic-data-controls.ts`; 36 unidades e seis cenários SQL amplos. HMAC/âncora/allowlists, elegibilidade negada, callback transacional/rollback, revogações e reaplicação idempotente. Somente política sintética explícita. |
| RQ-7208 — consumo e reconciliação | AC-7213/7214 | Checkpoint sem resultado/claim aberto, união de transições, custo/quantidade/login conservados, lost result cercado; completed/cancelled comprovados ou pending. SQL local com restore anterior e tenant B preservado; sem provedor/refund/reabertura. |
| RQ-6806 — identidade da sessão | AC-6821 | Migration 040, resolver canônico e cinco funções legadas de condomínio/perfil; red/green de cookie/membership/carteira com auth_subject distinto e colidente, UUID bloqueado negado, legado não UUID preservado. CRUD/perfil no runtime e transação revertida. |
| RQ-7116 — contraprova da exclusão | AC-7126 | Cenário independente em `pilot-security-postgres.test.ts`: domínio exclui com ledger, resultado removido, consumo/unknown conservados, escopo órfão negado e outro tenant intacto. Não é revisão independente dos módulos de Segurança. |
| RNF da Spec 072 — ambiente sintético explícito | AC-7215 | `synthetic-test-env.test.ts`: sete falhas antes e sete sucessos depois de `envDir:false`, com arquivo canário exclusivamente temporário. Configs globais/focadas próprias não carregam `.env*`; os gates afetados precisam ser reexecutados sob essa guarda. |

Relatório e caminhos exatos: `docs/reviews/2026-11-11-pilot-security-controls-local.md`.
Comando novo `test:pilot:data:local` registrado em package.json/README/AGENTS; SQL usa o comando
guardado existente. Nessa captura, gates globais da janela 03 e revisão cruzada ainda estavam
pendentes; seu fechamento posterior está na seção 03/r4 abaixo. Não somar resultados de
candidatas diferentes como uma aprovação única.

## Histórico de Documentos — candidata de 11/11 r2 e adendos r3/r4

| Requisito | Aceitação | Testes mantidos e evidência |
|---|---|---|
| RQ-7112 — exportação/purga escopadas | AC-7120/7121/7124 | `postgres-document-lifecycle.test.ts` e `document-lifecycle-postgres.test.ts`: bytes/checksum/fontes/histórico próprio; purga elegível, outro tenant idêntico. |
| RQ-7113 — decisões e quarentena | AC-7121/7122/7124 | `document-recovery-controls.test.ts`, `document-lifecycle-restore.test.ts`, `postgres-document-retention-repository.test.ts` e SQL: duas decisões sem espera circular, originais órfãos, destinos novos, job antigo negado. Preparar todo lote antes do primeiro trigger; falha na segunda preparação impede qualquer purga. |
| RQ-7114 — reconciliação sem reenvio | AC-7123/7124 | Controles unitários/SQL negam prova ausente, política/owner/checksum divergentes; somente conclusão conhecida, sem nova chamada ou liberação de custo. |
| RQ-7115 — replay documental atual | AC-7125 | `journal-policy-replay.e2e.test.ts`, `question-source-replay.e2e.test.ts`, `evidence-continuity.e2e.test.ts`: política/vigência/hash integral da página/legado incompleto negados; mesmo conflito pendente permitido, histórico literal conservado, sem geração adicional. |
| RQ-7116 — exclusão preserva consumo | AC-7126 | `postgres-hosted-call-ledger.test.ts`, lifecycle unitário/SQL: completed/uncertain/cancelled, rollback/repetição, remoção do resultado privado, escopo órfão negado e tenant B preservado. |
| RQ-7117 — confirmação do corpo entregue | AC-7127 | `conversation-receipt.test.ts` e `conversation-receipt-contract.test.ts`: stream interrompido/JSON ou contrato inválido conservam UUID; validadores reais compartilhados aceitam sucesso e snapshot analysisOnly. |
| RQ-7118 — ensaio sem dotenv automático | AC-7128 | `document-test-env.test.ts`: duas configs `envDir:false`, canário exclusivamente sintético/temporário. Não lê arquivos de ambiente reais para provar a guarda. |

Candidata: `.local/pilot-documents-2026-11-11/candidate-source-hashes-2026-11-11-r2.json`,
95 entradas conferidas. Unidades 362/362, cobertura 94,95/92,06/98,29/97,20; SQL 2/2 em
`container-911401d9b83548b58e82029a849a8fdd`, encerrado. Revisão delimitada de Segurança:
`docs/reviews/2026-11-11-pilot-documents-security-review.md` e mapa r3, com exclusões explícitas
de autoria e leitura parcial da interface. Não aprova o diff inteiro ou dados reais.

Adendo r3/AC-7125: `development-document-memory.ts` conserva a página integral do upload;
`server.ts` compõe o leitor autorizado com seed/legislação. Duas unidades de
`development-document-memory.test.ts` cobrem página longa/última linha, vigência pendente,
tenant/permissão/IDs divergentes. `document-answer.e2e.test.ts` conserva o controle original
200/citação e confere replay/fonte/negação cruzada. Seleção 26/26 em
`extension/1794423446019-26084/results.json`; candidata documental r3 de 96 entradas e mapa
de revisão r4. RNF/AC-7215 inclui Vite aninhado: proxy E2E com `envDir:false` e canário do
objeto real, vermelho 7/8 e verde 8/8. Não amplia autorização de serviço nem escopo do produto.

Adendo r4/AC-7125 e Spec 020/RQ-2006/AC-2007: `createSourceReader(catalog)` exige documento
ativo antes de entregar página integral, inclusive após arquivamento. Versão histórica de
documento ativo, recuperação e tenant B permanecem legíveis; trecho antigo continua histórico
com `sourceRemoved:true`, enquanto página e replay atuais são negados. **27/27** afetados em
`extension/1794424012186-20868/results.json`; candidata documental r4 de 96 entradas, mapa de
Segurança r5 e contraprova independente do startup com 404, mais cinco unidades repetidas por
Infraestrutura. Produção PostgreSQL/ledger/SQL permanecem iguais à prova r2; não atribuir os
gates globais antigos ao novo leitor antes de sua repetição coordenada.

## Fechamento local de 11/11 — janela 03/r4

Check integral: **2.459/2.459 unidades**, cobertura statements/branches/functions/lines
**87,57/83,70/92,84/89,44%**, formato/lint/tipos/72 specs/scanner aprovados. **247/247 E2E**,
builds API/web, runtime compilado (dois PDFs/20 perguntas) e worker separado (nove grupos,
dez identidades/300 páginas) passaram. Evals sintéticos: core 20/20, documental 50/50
determinísticos, 280 cenários/1.010 turnos mecânicos sem falhas; zero aprovação semântica.
910 entradas iguais antes/depois, containers próprios encerrados. Relatório e 18 artefatos
com SHA-256 em `docs/reviews/2026-11-11-pilot-integration-local.md` e
`docs/reviews/pilot-integration-snapshot-2026-11-11.json`. Candidatas: Segurança r6,
Infraestrutura r2 e Documentos r4; limites de autoria/revisão e provas SQL reutilizadas
estão identificados. Review integral/CI/status checks/uso real permanecem gates separados.

Adendo documental após os gates: AC-2414 da Spec 024 foi alinhado à escala já vigente na
Spec 016/CSS. Recibo `.local/pilot-documents-2026-11-11/post-gates-ac2414.json`, uma linha,
hash anterior `2d45c40dfc27…` e posterior `ab0e7c366a47…`; o dono validou 72 specs e manteve
96 entradas da candidata documental iguais. O snapshot 03/r4 não foi sobrescrito: 910 entradas
eram iguais no fechamento; na conferência posterior, 909 permanecem e há esse único adendo
documental. Código/config/testes e 18 resultados preservados, sem nova bateria funcional.

## Infraestrutura — rastreabilidade final de 11/11

Oferta conferida: `.local/pilot-operations/traceability-offer-2026-11-11.json`; candidata
operacional r2, dez hashes estáveis. Fontes, testes e recibos abaixo existem; o resultado
hermético confirma 139/139 unidades e os wrappers registram sucesso/containers encerrados.

| Requisito | Aceitação | Implementação, regressões e evidência existente |
|---|---|---|
| RQ-7003 — restauração/validação local isolada | AC-7009 | `tests/unit/pilot-local-lifecycle-runner.test.ts`, `tests/integration/rls-tenant-isolation.test.ts`; `infrastructure/pilot/vitest.operations.config.ts`, `infrastructure/pilot/vitest.rls.config.ts` e `scripts/verify-pilot-local-integration.ts`. Canário temporário/controle positivo com `envDir:false`; 139 unidades, 17 RLS reais locais e nove grupos de worker da candidata final. Recibos: operações, RLS e worker abaixo. |
| RQ-7005 — reaplicação restritiva após restore | AC-7010/7011 | `tests/unit/pilot-local-lifecycle-runner.test.ts`, `scripts/verify-pilot-recovery.ts` e `scripts/verify-pilot-maintenance-recovery.ts`. Plano autenticado fora do dump; vínculo alvo/rodada/snapshot antes da conexão auxiliar; faltas/divergências de chave, política, escopo, elegibilidade, inventário/RLS negadas. Processo distinto reaplica idempotentemente; tenant B/histórico, nove recibos/seis chamadas, unknown/login preservados, sem reenvio/reabertura. Recibos: restore e manutenção abaixo. |
| RQ-7003/RQ-7005 — ciclo documental guardado | AC-7012 | `tests/unit/pilot-local-lifecycle-runner.test.ts`, `tests/isolated/document-lifecycle-postgres.test.ts`; `scripts/verify-pilot-local-integration.ts`, `scripts/verify-pilot-recovery-container.ps1` e `tests/vitest.pilot-document-lifecycle.config.ts`. Config fixa obrigatória antes de Docker/recursos, ambiente filho mínimo, origem/destino novos e marcados, confirmação local explícita; exigir êxito Vitest e prova agregada correspondente, sem transporte externo. Recibo: documentos abaixo. Regressão de portabilidade: diagnóstico PowerShell simples, ANSI/quebrado no Linux e CRLF preserva a recusa literal; mensagens sem a recusa continuam rejeitadas. Evidência: `docs/reviews/2026-11-24-ci-powershell-diagnostic.md`. |

Recibos, todos em `.local/pilot-operations/`:

- Operações: `operations-env-hermetic-green-2026-11-11.json` (139/139, zero falhas).
- RLS: `container-34d2a184928947afa135984b38fe716a/result.json` (17 casos).
- Worker final: `container-d89b1317733e49c3b15c80b38feba266/result.json` (nove grupos).
- Restore: `container-3b3c9d49692440669f7c0fa1c7410955/result.json`.
- Manutenção: `c1476f570f34405e9fcf9934dfe8cdb6/maintenance/result.json`.
- Documentos: `container-911401d9b83548b58e82029a849a8fdd/result.json` (dois cenários amplos).

Esta incorporação é documental; reutiliza as provas já verificadas, sem novo teste ou alteração
da candidata. Não aprova retenção/fornecedor reais, o diff inteiro, CI, serviço ou dados reais.
## Spec 073 — agente documental: primeira fatia local

| Requisito | Aceitação | Implementação e prova local |
|---|---|---|
| RQ-7301/7302 | AC-7301/7302/7304/7310 | `authoring/document-drafts.ts`, `document-draft-routes.ts`, `DocumentDraftComposer.tsx`; `tests/unit/document-drafts.test.ts` e `tests/e2e/document-authoring.e2e.test.ts`. Revisão explícita; proatividade semântica ainda pendente. |
| RQ-7303/7307 | AC-7303/7309 | Fontes atuais, hash de página inteira e escopo usuário/condomínio/chat; testes de fonte alterada, revogação e concorrência. Histórico usa store/RLS existente; PostgreSQL dessa fatia ainda não validado. |
| RQ-7304 | AC-7305 | `extract-docx-text.ts`, processamento/upload e migration 041; `tests/unit/docx-reading.test.ts` e E2E de bytes privados. Recursos desconhecidos ficam needs_review. |
| RQ-7305 | AC-7306/7307/7311 | `audio-transcription.ts`, `audio-inputs.ts`, `audio-input-routes.ts`; testes unitários de duração, falantes, limites, recuperação e recibo incerto. A continuação abaixo integra UI/rascunho; transcrição real e ledger permanecem negados. |
| RQ-7306 | AC-7308 | `draft-pdf.ts`, `scripts/verify-authoring-pdf.ts`; teste multipágina, acentos e fim do texto. QA visual em `.local/authoring/pdf/`. |
| RQ-7308 | AC-7309/7310 | Recuperação/listagem via histórico e API privada; sem indexação ou envio. Retenção/restore de áudio e seus derivados ainda precisam da integração completa. |

Comandos: `pnpm run test:authoring`, `pnpm run test:authoring:pdf`. Não representam conclusão da
Spec 073 nem liberação do piloto. Nenhum serviço, dado real ou cobrança autorizado por esses testes.

Fechamento desta fatia: `docs/reviews/2026-11-12-document-authoring-local.md` (36 testes específicos,
2.509 unidades, 250 E2E, quatro pisos de cobertura, builds/runtime e QA de PDF). A Spec 073
permanece em andamento; a continuação abaixo atualiza o estado da interface e do rascunho de áudio.

### Continuação de áudio solicitada em 12/11/2026

| Requisito | Aceitação | Implementação e prova |
|---|---|---|
| RQ-7305/7308 | AC-7312 | `AudioMinutesComposer.tsx`, `audio-minutes-request.ts` e menu de anexos do `App.tsx`; abrir/selecionar não envia. `audio-minutes-ui.test.ts`, `audio-minutes.e2e.test.ts` e `verify-audio-minutes-browser.ts` verificam pedido explícito e cancelamento por escopo. |
| RQ-7303/7305 | AC-7313 | A montagem extrativa inicial foi substituída pela redação semântica da continuação abaixo. Transcrição integral continua separada, com tempos/certeza; `audio-minutes.test.ts` agora cobre síntese, decisões, recuperação e referências. |
| RQ-7303/7307 | AC-7314 | `audio-source.ts` e revalidação da origem no serviço de rascunhos/PDF. Unitários e E2E verificam original/transcrição alterados, outra conversa/condomínio e leitor sem escrita. |
| RQ-7302/7307/7308 | AC-7315 | Recibo por pedido, consulta privada de áudios anteriores e recuperação da revisão atual. E2E cobre perdas de resposta/corpo; navegador recarrega e recupera a ata confirmada, com uma única transcrição simulada. |
| RQ-7306/7307 | AC-7316 | Limites de 160 mil caracteres/175 mil bytes de conteúdo, sem duplicar texto no journal; teto PDF de 100 páginas. Unidade de revisão longa e QA visual dos dois modos de ata. |

Comandos adicionais: `test:authoring:audio:pdf`, `test:authoring:browser`. Integração real de
transcrição/storage/retenção/consumo continua bloqueada; os ensaios usam somente sintéticos.

Fechamento da continuação: `docs/reviews/2026-11-12-audio-minutes-local.md` — 53 testes focados,
2.519 unidades, 257 E2E, quatro pisos de cobertura, builds/runtime, PDFs de relato/reunião e
fluxo de navegador com recuperação após reload e uma única transcrição simulada.

### Continuação — redação de ata a partir do áudio

| Requisito | Aceitação | Implementação e prova local |
|---|---|---|
| RQ-7309 | AC-7317/7318/7319 | `semantic-minutes-contract.ts`, `semantic-minutes-model.ts`, `semantic-minutes-renderer.ts`: plano redigido por assuntos, afirmações com trechos literais/tempos, conferência separada de cada afirmação/categoria e segmento, limites e bloqueio na falta de suporte. `semantic-minutes-contract.test.ts`, `semantic-minutes-model.test.ts`, `audio-minutes.test.ts`, `evals/audio-minutes/run.ts`. |
| RQ-7310 | AC-7320 | `audio-minutes.ts`: dispatch/resultado por fase, recuperação sem novas chamadas, concorrência, falha ao gravar resultado/proposta, cancelamento e revalidação de fonte/permissão entre etapas. `audio-minutes.test.ts` e `audio-minutes.e2e.test.ts`. |
| RQ-7309/7310 | AC-7321 | Capacidades distinguem ASR e redator; cliente impede envio novo sem ambos. Pedidos semânticos versionados; legado usa transcrição com novo ID, sem promover ata extrativa. Testes UI/API/E2E e ensaio de navegador. |

Comando novo: `pnpm run evals:audio-minutes`, 26 casos com respostas e conferências roteirizadas.
Não mede a qualidade real de IA. Instruções específicas propostas para revisão em
`redacao-ata-prompt-proposto.md`, sem alterar personalidade, ligar transporte ou gerar cobrança.
O [relatório da continuação](../reviews/2026-11-12-semantic-minutes-local.md) registra a candidata
e os gates atuais. Validação de fornecedor real, integração durável de áudio e liberações
de dados/política/consumo continuam pendentes; a Spec 073 não está concluída.

### Continuação local de 16/11/2026 — melhorias, Word e áudio durável

O estado acima é histórico. Sem novos serviços, dados reais ou chamadas pagas:

| Requisito | Aceitação | Implementação e prova |
|---|---|---|
| RQ-7311 / RQ-7301–7303 | AC-7322/7323 | `document-improvements.ts`, rotas de rascunho e `DocumentDraftComposer.tsx`: oferta editorial injetável, texto/alterações conferíveis, recusa persistente, aceite como revisão não confirmada, tokens/números preservados, claim durável e disputa com edição humana. `document-improvements.test.ts`, `document-authoring.e2e.test.ts`, ensaio real de componentes no navegador com agente simulado. |
| RQ-7312 / RQ-7304/7307 | AC-7324 | Migration 041, stores/processor PostgreSQL existentes, `authoring-postgres.test.ts`: bytes Word/blocos/revisão confirmada recuperados após recriar API e restore em banco vazio, RLS, contexto cruzado e fonte arquivada negados. |
| RQ-7313 / RQ-7305/7307/7308 | AC-7325/7326 | Migration 042, `postgres-audio-storage.ts`, `audio-recovery-journal.ts`, áudio/atas/rascunhos e rotas: original/transcrição privados, resultado durável anterior ao ACK, retenção explícita, export/purge, tombstone e decisões fora do dump. PostgreSQL real sintético prova recuperação, expiração, isolamento, revogação, B preservado e unknown pós-snapshot sem ASR repetido. |
| RQ-7303/7307 | AC-7314/7325 | Normalização de propriedades de segmentos/referências ao ler JSONB; regressão `audio-recovery-journal.test.ts` e confirmação/PDF no ensaio PostgreSQL. |
| RQ-7313 | AC-7309/7325 | `audio-inputs.test.ts`: resultado salvo no storage antes de falha do journal volta como transcrito na lista e no replay, com uma chamada. |

Comando novo: `pnpm run test:authoring:postgres`, registrado em package.json, README e AGENTS.
O wrapper usa imagem já em cache, ambiente mínimo, `.env` desabilitado, container/bancos próprios
e encerra seu container. Referência de resultados e limitações:
`docs/reviews/2026-11-16-authoring-continuation-local.md`. RQ-7301/7303 gerais, qualidade real
de IA, política/retentor/custódia, orçamento monetário/global e revisão independente do branch
continuam pendentes; a composição sintética não libera piloto/produção.

### Agente documental geral — 16/11/2026

| Requisito | Aceitação | Implementação e prova |
|---|---|---|
| RQ-7314 / RQ-7301–7303 | AC-7327/7328 | `document-proposal.ts`, `document-authoring-contract.ts` e `document-authoring.ts`: pedido explícito, páginas/blocos integrais autorizados, plano tipado, procedência, antes/depois e referências literais, números, cobertura, especialista e limites sem truncar. `document-authoring.test.ts` e `evals:document-authoring`. |
| RQ-7314 | AC-7329 | Redação e conferência injetáveis separadas; revisão exige resultado positivo de cada parágrafo, mudança e fonte; sem base gera somente pedido de contexto. Recusa/saída malformada não produz rascunho. Saídas e revisores simulados; não é medida de qualidade real. |
| RQ-7315 / RQ-7307 | AC-7330/7331 | Journal imutável, claims por etapa, hash de pedido/proposta/fontes, decisão exata e replay sem reverter edição humana; referência preservada no rascunho e PDF, origem revalidada. Unitários, `document-proposals.e2e.test.ts` e `authoring-postgres.test.ts` (API nova e backup/restore com RLS). |
| RQ-7315 | AC-7332 | Rotas `/document-proposals`, `DocumentAuthoringComposer.tsx` dentro do editor do chat, seleção sem geração, aceite explícito e confirmação separada. Ensaio de navegador com resposta perdida, recuperação, PDF e mobile. Startup sem modelo geral. |
| RQ-7313 | AC-7326 | Regressão encontrada no gate global em Windows: substituição atômica do índice do journal admite cinco tentativas somente para EPERM/EACCES/EBUSY, conservando lock/índice e quarentena em falha. `audio-recovery-journal.test.ts` injeta erros transitórios, persistentes e não recuperáveis, sem repetir modelo/transcritor. |

Comandos registrados em package.json/README/AGENTS: `evals:document-authoring` e
`test:authoring:general:browser`; a suíte `test:authoring` inclui a fatia. Resultados e limites em
`docs/reviews/2026-11-16-general-document-authoring-local.md`. Sem novas dependências, serviço,
dados reais, chamada paga ou aprovação de destino. Spec 073 permanece em andamento.

### Controles operacionais da autoria — 16/11/2026

| Requisito | Aceitação | Implementação e prova |
|---|---|---|
| RQ-7316 / RQ-7209 | AC-7333/7334, AC-7216 | `authoring-operations.ts`, `authoring-budget.ts`, seis serviços/fases e Spec 072: reserva/claim/maximum conservador, resultado persistido antes do complete, cofre externo obrigatório e nenhuma cota recriada após perda. `authoring-operations.test.ts` e SQL local da migration 043 (gestor positivo/advisor negado). |
| RQ-7317 | AC-7335 | Journal privado reutilizado com instância própria, TTL inicial sem renovação e lote explícito. Expiração/clock regressivo/legado sem recibo negam. Testes unitários e PostgreSQL validam edição/confirmação, API nova e restore. |
| RQ-7317 | AC-7336 | `authoring-artifacts.ts`, rotas/serviços de exportação/purga; fontes históricas revalidadas; grafo pai → filhos e tombstone antes do scrub. Falha parcial/restore mantém quarentena e manutenção reaplica exclusão. Word original e outro contexto preservados no SQL real local. |
| RQ-7316/7317 | AC-7337 | `test:authoring:operations` e `test:authoring:postgres` usam mocks, diretórios próprios, loopback e bancos novos com RLS; sem nova dependência ou startup positivo. Relatório em `docs/reviews/2026-11-16-authoring-operations-local.md`. |

### Caderno financeiro integral e ajustes humanos — 18/11/2026

| Requisito | Aceitação | Implementação e prova |
|---|---|---|
| RQ-7324 | AC-7349/7350 | `financial-dossier.ts`: separação explícita, inventário de todas as páginas, cálculos locais e citações remapeadas ao original. Corpus e oracle independentes do parser/modelo em `evals/financial-dossier/`; comparação de todo o texto extraído e de cada documento detalhado. |
| RQ-7325 / RQ-4903/4904 | AC-7351/7352, AC-4904a | `financial-report.ts`/rotas: redação e conferência distintas, journal sem repetição incerta, origem integral revalidada, rascunho/PDF comum; suporte agregado somado em centavos, parcial/ID repetido não confirmado. Unitários e E2E novos; `evals:financial-300` offline ou Codex explícito, sem API paga/startup. |
| RQ-7326 | AC-7354 | Política do servidor para reprodução literal simples em criação de comunicado/relato; alterações substantivas continuam protegidas. Unitários, instruções do adaptador e novas redações/conferências reais H073-001/002, sem remover investigação técnica ou editar texto/pendências para fabricar aprovação. |

Relatório da rodada: `docs/reviews/2026-11-18-financial-300.md`. O usuário homologou o caso
financeiro estruturado de 300 páginas com ajuste aplicado na revisão 2; isso não aprova
dados reais, política operacional, OCR arbitrário ou outros casos. Limites propostos inativos.

### Fluxo financeiro no chat e persistência específica — 18/11/2026

| Requisito | Aceitação | Implementação e prova |
|---|---|---|
| RQ-7327 / RQ-4904 | AC-7355/7356, AC-4904b | `financial-review.ts`: soma em centavos, classificação parcial com apoio/parcela pendente e citações; ambiguidades, duplicidades, excesso e outra competência protegidos. Unitários e caderno integral com gabarito independente. |
| RQ-7328 | AC-7357/7358 | `FinancialReportComposer.tsx`, rotas e serviço: seleção por título/página sem geração, pedido explícito, journal paginado, editor comum, confirmação/PDF e recuperação sem repetir fases ou perder edição. Navegador desktop/mobile e E2E sintéticos. |
| RQ-7329 | AC-7359/7360 | `financial-report-postgres.test.ts` e processo filho: PDF original de 300 páginas processado em SQL, edição confirmada e PDF recuperados por processo novo e banco restaurado sem modelo, hashes iguais, página 300 alterada e revogação bloqueadas. Política permanece desabilitada. v1 concluído preservado, incompleto bloqueado. |

Resultados e limites em `docs/reviews/2026-11-18-financial-chat-persistence-local.md`.
Comandos novos `test:authoring:financial` e `test:authoring:financial:browser` registrados em
package.json, README e AGENTS. Sem API paga, nova dependência, serviço ou ativação dos limites.

| Requisito | Aceitação | Evidência de homologação humana |
|---|---|---|
| RQ-7306/7325 | AC-7302/7303/7308/7353 | Decisão explícita `003-financial-300.json`, revisão 2 via serviço existente de rascunhos, fontes literais adicionais, R$ 9.382,80 com suporte parcial e R$ 305,95 pendentes. PDF de 27 páginas, QA e confirmação por hash; originais/gabarito/candidato anterior preservados, zero modelo/API paga e proposta operacional inalterada. Edição manual do artefato, sem alterar código do analisador. |
