# Revisão técnica da candidata completa — 11/11/2026

**Estado:** revisão técnica e conciliação do inventário concluídas, com os escopos abaixo;
sem aprovação integral independente para merge ou uso real.
**Base:** `3b702db6f91dbbeb2ede1a6063053296298d913c`; working tree compartilhada,
sem commit de release. **Revisor por IA:** Infraestrutura, com revisões cruzadas de
Documentos e Segurança identificadas por arquivo e SHA-256. Autoria anterior não é inferida;
autorrevisão não conta como revisão independente.

## Resultado e escopo

Nenhum gatilho P0/P1 reproduzido permanece aberto nas correções verificadas. A leitura cobre
o delta contra a base, inclusive mudanças preexistentes às três frentes, arquivos novos,
fontes de produção, configurações, SQL, scripts, testes, specs e documentação. O mapa vivo é
`.local/pilot-operations/full-review/manifest.json`. A captura final preservada está em
`.local/pilot-operations/full-review/final-review-coverage-2026-11-11.json`: **744 arquivos,
zero leitura pendente, zero divergência dos hashes registrados**. Tipos de leitura e limites
permanecem explícitos; leitura estrutural ou parcial não vira aprovação integral.

| Cobertura registrada | Arquivos | Limite |
|---|---:|---|
| Fonte/diff ou relato integral lido nesta sessão | 511 | Inclui autorrevisão dos próprios relatórios e arquivos, identificada como tal |
| Revisão cruzada corrente de conteúdo integral/delta | 154 | Reuso por SHA idêntico; autoria histórica e exclusões preservadas |
| Catálogo de dados com auditoria estrutural/procedência | 1 | Municípios: sem atualização externa nem julgamento individual de todos os nomes |
| Relatórios históricos gerados, conferência estrutural/resultados/procedência | 59 | Não recertifica julgamento semântico das respostas nem todas as execuções antigas |
| Assets gerados, conferência delimitada de procedência/texto/estrutura | 18 | Inspeção própria por arquivo, sem certificação geral de layout/OCR |
| Artefato visual histórico | 1 | Inspeção visual delimitada, sem prova da interface atual |
| Pendentes ou alterados após a leitura | 0 | Captura por conteúdo, sem commit de release |

Documentos concluiu a leitura integral de 98 arquivos das Specs 041–067 (754.951 bytes);
Infraestrutura leu os 47 relatórios narrativos históricos. Segurança leu literalmente as
5.225 linhas dos cinco datasets e confrontou perguntas/gabaritos dos 280 cenários/1.010 turnos
aos 25 documentos sintéticos. Os 145 hashes históricos, cinco datasets e 31 apoios do mapa
literal foram conferidos sem diferença. Relatórios:
[specs e resultados históricos](2026-11-11-historical-documents-documents-review.md) e
[gabaritos de conversas](2026-11-11-conversation-corpus-security-review.md).

O diff completo de `App.tsx` e todos os testes anteriormente pendentes foram lidos por
Infraestrutura. A revisão parcial de `conversationFetch` pela Segurança conserva seu escopo
original. R6 de Segurança tem 24 fontes/13 artefatos; r2 de Infraestrutura tem dez entradas
revisadas por Documentos e Segurança; r4 de Documentos tem 96 entradas e mapa cruzado r5.
Reaproveitamento só ocorre quando o SHA atual coincide com o conteúdo efetivamente revisto.

## Correções e contraprovas preservadas

| Gatilho | Fechamento verificável |
|---|---|
| Replay HTTP entregava resultado sob política alterada/revogada | HTTP 403, autorização atual consultada, sem segunda geração; regressão mantida de journal/política |
| Pergunta antiga ignorava mudança de vigência ou da página fora da citação | Revisão de catálogo e hash da página inteira; conflito inicial legítimo e histórico literal preservados |
| Exclusão com ledger falhava por FK; purga deixava órfãos ou travava lote | SQL real local: exclusão, órfãos, duas decisões sem espera circular, custo/unknown e tenant B preservados |
| Interface descartava recibo antes de validar corpo/contrato | Sete contraprovas independentes e regressões mantidas com validadores reais; UUID conservado na falha |
| Helper de restauração apagava schema antes de conferir posse | Helper substituído por destino novo/vazio e guardado; sete negativas independentes, sem DROP |
| Framework/proxy Vite aninhado podia descobrir `.env*` | `envDir:false` nas configurações reais e canários exclusivamente temporários; oito controles independentes |
| PDF novo retornava 403 e fonte arquivada continuava legível | Leitor integral composto ao catálogo: upload 200, arquivo 204, fonte 404, recuperação 200; tenant B e versões históricas ativas preservados |
| Retenção sem observador duplicava configuração de tenant | Preparo condicional, asserção anterior conservada e testes de ordem/rollback; seis unidades independentes |
| AC-2414 descrevia escala tipográfica anterior | Uma linha documental alinhada à Spec 016/CSS; gate de visão passou para 72 specs, sem alterar estilo ou teste |

Os vermelhos e verdes originais não foram sobrescritos. Detalhes dos gatilhos de journal,
recibo e restore: [achados e contraprovas](2026-11-09-full-candidate-infrastructure-findings.md).
Demais fontes e resultados: relatórios delimitados de
[Segurança](2026-11-11-pilot-security-infrastructure-review.md),
[Documentos](2026-11-11-pilot-documents-security-review.md),
[fonte arquivada](2026-11-11-pilot-upload-source-infrastructure-review.md),
[Vite](2026-11-11-pilot-nested-vite-infrastructure-review.md) e
[manutenção](2026-11-11-pilot-maintenance-infrastructure-local.md).

## Gates e identidade da candidata

[Fechamento global](2026-11-11-pilot-integration-local.md): check exit 0,
**2.459 unidades**, **247 E2E**, cobertura unitária
**87,57/83,70/92,84/89,44%** (statements/branches/functions/lines), 72 specs, scanner,
builds API/web, runtime de dois PDFs/20 perguntas e nove grupos de worker aprovados.
Evals core 20/20, documentais determinísticos 50/50 e 280 cenários/1.010 turnos mecânicos
passaram; nenhuma inferência externa ou aprovação semântica foi executada nesta rodada.

[Snapshot histórico](pilot-integration-snapshot-2026-11-11.json): **910 entradas iguais
antes/depois dos gates**, 18 evidências, containers próprios encerrados. Após os gates,
somente AC-2414 mudou dentro dessas entradas: SHA anterior `2d45c40dfc27…`, posterior
`ab0e7c366a47…`. Reconciliação atual: **909 iguais + uma correção documental explicada**;
código/testes/configs e os 18 resultados preservados. Recibos:
`.local/pilot-documents-2026-11-11/post-gates-ac2414.json` e
`.local/pilot-operations/final-window03-r4-closure-2026-11-11.json`.
O novo hash documental não é atribuído aos testes anteriores. Não se repetiram gates verdes
sem mudança funcional, falha ou dúvida concreta.

## Rastreabilidade e limites

A [matriz](../quality/traceability.md) incorpora RQ-7003/AC-7009,
RQ-7005/AC-7010–7011 e AC-7012, com fontes, regressões e recibos existentes. O diff completo
da matriz foi lido por Infraestrutura. A leitura parcial histórica da Segurança continua
identificada no seu mapa; não é promovida a revisão independente do arquivo inteiro.

Relatórios JSON antigos foram conferidos quanto à estrutura, resultados e procedência;
falhas históricas permanecem. Assets gerados têm escopo de inspeção próprio: quatro PDFs
fictícios tiveram todas as oito páginas extraídas e lidas, sem certificação visual/OCR.
O catálogo de municípios teve validação estrutural/procedência, sem atualização externa.
A revisão técnica dos gabaritos não substitui julgamento jurídico, contábil ou de engenharia.

Não foi emitido registro `APROVADO` de merge. A leitura do inventário está encerrada; continuam
necessárias a identificação/assinatura de revisão independente perante as autorias preexistentes
não comprovadas, o commit/configuração a integrar, CI/status checks e auditoria online.
O diff-check global preserva os quatro hard breaks Markdown preexistentes da Spec 016;
o escopo das candidatas passou. Não se alteraram assertivas, cobertura ou limites para passar.

## O que depende de decisão humana e do destino

| Decisão | Evidência/ação posterior |
|---|---|
| Pessoas responsáveis, suporte e revisores competentes | Titular/substituto, canal, coorte/agenda e revisão técnica e de domínio identificadas |
| Política e documentos permitidos | Resolver D01–D12 em `docs/security/pilot-2026-11-16/responsabilidades.md`; aprovar política/termos/aviso com responsáveis competentes e poderes por condomínio |
| Fornecedores, região, conta/plano e orçamento | Escolher destino separado de integração, modelos/OCR, teto monetário e de chamadas, payloads permitidos e retenção; nenhum preço ou plano aprovado aqui |
| Recuperação e operação | Definir RPO/RTO, retenção, custódia/recuperação de segredos, tombstones fora do backup e canais de incidente |
| Liberação efetiva | Autorizar uma configuração concreta e depois executar provisão/configuração, CI, isolamento/TLS/proxy/logs, restore no destino e baseline sintética do gateway/OCR com revisão especializada |

Startup persistente continua negando chamadas externas; ligações injetáveis foram testadas.
Após as decisões, ainda é necessário preparar e revisar a composição positiva restrita e
provar a configuração efetiva. Preencher decisões ou habilitar uma flag não libera o piloto.
WhatsApp pertence à abertura pública, sem bloquear o piloto fechado por código.

Nenhum serviço remoto, cobrança, dado real, deploy, commit, merge ou migration remota foi
executado neste fechamento. O [registro de liberação](../quality/pilot-2026-11-16-release-gates.md)
permanece **NÃO LIBERADO**.
