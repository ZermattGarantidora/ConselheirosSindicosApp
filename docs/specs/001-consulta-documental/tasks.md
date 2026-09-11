# Tarefas — Spec 001

**Status:** scaffold, B3–B6 e preparação B7 sintética implementados; proteção remota T105 concluída; rollout real permanece pendente
**Atualizado em:** 2026-09-11

As tarefas devem ser concluídas na ordem das dependências. Marcar uma tarefa como concluída exige atualizar a matriz de rastreabilidade e anexar os comandos/gates executados ao registro da entrega.

## Fase 0 — Aprovação e decisões

- [x] **T001** Revisar `spec.md`, `acceptance.md` e questões em aberto com produto. A aprovação é limitada à implementação local com dados sintéticos; pendências de piloto permanecem registradas na spec.
- [x] **T002** Escolher stack de aplicação, persistência, storage, fila e execução de evals; registrar ADRs. ADRs 0001 a 0006 definem o monólito modular, isolamento, estratégia de IA, TypeScript/pnpm, PostgreSQL/RLS/pgvector e adaptadores locais sem SaaS.
- [x] **T003** Definir ameaças aceitas, retenção inicial e classificação de dados. Ver `docs/security/data-handling-inicial.md`; dados reais e piloto permanecem bloqueados até uma política específica.
- [x] **T004** Definir os comandos canônicos e atualizar `README.md` e `AGENTS.md`. Os comandos atuais cobrem a fundação; os comandos de migration, e2e e evals serão adicionados junto das tarefas que os tornam executáveis.

## Fase 1 — Scaffold e gates

- [x] **T101** Inicializar Git, convenções de branch/commit e arquivos ignorados.
- [x] **T102** Criar o scaffold do monólito modular e do worker. API Fastify, cliente React/Vite, worker Node, migration SQL e comandos locais foram criados.
- [x] **T103** Configurar formatação, lint, typecheck, testes e build reproduzível; gerar relatório de cobertura unitária para statements, branches, functions e lines com threshold mínimo de 80% em cada métrica.
- [x] **T104** Configurar CI com gates rápidos, proteção contra segredos, execução de testes e publicação de cobertura. O workflow `.github/workflows/ci.yml` executa instalação bloqueada, `pnpm run check`, E2E e build, publica a cobertura como artefato e usa permissões mínimas.
- [x] **T105** Configurar proteção de branch para bloquear merge sem code review aprovado, testes aprovados e cobertura unitária mínima de 80% no commit atual. Regra criada no GitHub para `main` em 2026-09-11, exigindo Pull Request, 1 aprovação, check `quality` verde, branch atualizada, conversas resolvidas e sem bypass, exclusão ou force-push.
- [x] **T106** Criar configuração local por variáveis de ambiente sem valores sensíveis versionados.

## Fase 2 — Identidade e isolamento

- [x] **T201** Modelar `User`, `Condominium` e `Membership` na migration inicial e nos contratos TypeScript.
- [x] **T202** Implementar `AuthorizedCondominiumContext` e negação por padrão no caso de uso e na API.
- [x] **T203** Implementar políticas de isolamento na persistência. A migration existente no banco Neon exclusivo de integração foi verificada e os testes contra PostgreSQL/RLS real passaram: 4/4 cenários em 2026-09-02.
- [x] **T204** Criar dois condomínios sintéticos com frases-canário distintas para testes de recuperação.
- [x] **T205** Automatizar AC-001, AC-002, AC-003, AC-008 e AC-009 com testes e2e e unitários sintéticos.

## Fase 3 — Documentos

- [x] **T301** Modelar `Document`, `DocumentVersion`, páginas, chunks e jobs. As migrations 002–006 e os contratos TypeScript preservam tenant, imutabilidade de versão, estados, vigência pendente, identidade externa e fence de tentativa do worker. Verificação inicial em 02/09/2026 e integração sintética ampliada em 03/09/2026.
- [x] **T302** Implementar upload privado com validação e hash. O endpoint aceita somente PDF com assinatura válida, limita o tamanho, exige contexto autorizado com permissão de upload, cria uma chave opaca por condomínio, registra original/versão/job em transação e remove o original quando o registro falha. Verificação em 03/09/2026: `pnpm run check` e testes persistidos sintéticos aprovados.
- [x] **T303** Implementar extração de PDF textual preservando páginas. O adaptador local PDF.js extrai texto em ordem, registra índice interno, página humana, hash e sinal de texto ausente; o worker persistido grava as páginas e chunks no tenant do job. Verificação em 03/09/2026: `pnpm run check` e E2E sintético aprovados.
- [x] **T304** Implementar adaptador de OCR e indicador de qualidade. O contrato permite troca de provedor; sem OCR local configurado ou abaixo do piso, a versão fica em `needs_review`, sem publicar resultado como pronto. O adaptador da OpenAI foi autorizado somente para PDFs sintéticos no ADR 0009 e é testado sem rede; dados reais e piloto seguem bloqueados. Verificação em 03/09/2026: `pnpm run check` aprovado.
- [x] **T305** Implementar versão, vigência e estados de processamento. O ciclo de domínio só aceita transições explícitas, impede promoção direta de arquivo enviado, exige confirmação para vigência e para marcar uma versão anterior como substituída, e valida datas. Verificação em `tests/unit/document-model.test.ts` e `tests/unit/version-validity.test.ts`.
- [x] **T306** Automatizar AC-004 a AC-007. O fluxo persistido conecta API, storage privado, fila, extração local, OCR com piso de qualidade, persistência de páginas/chunks e estados finais; a seleção determinística prioriza a versão vigente, preserva versões anteriores para auditoria, não escolhe silenciosamente vigências sobrepostas e rejeita resultados de tentativas antigas. Verificação em 03/09/2026: `pnpm run check`, `pnpm run test:e2e` e integração Neon sintética 6/6 aprovados com fixtures sintéticas.

## Fase 4 — Retrieval

- [x] **T401** Definir contrato de evidência e estratégia de chunking. A primeira fatia mantém
  chunks dentro de uma página, preserva offsets verificáveis e registra metadados de documento,
  versão, vigência, método e qualidade.
- [x] **T402** Implementar indexação textual/semântica com metadados obrigatórios. O worker
  publica `tsvector` e embeddings locais com perfil, modelo, pipeline, dimensões e hash do chunk;
  nenhum provedor externo é usado.
- [x] **T403** Implementar busca textual e semântica filtrada antes do ranking. O adaptador PostgreSQL usa
  contexto autorizado, RLS, estado `ready`, qualidade mínima, vigência aplicável e documento ativo
  antes de aplicar `tsquery` ou distância vetorial; o ranking de aplicação repete o filtro de tenant.
- [x] **T404** Implementar reranking e avaliação de suficiência. O score combina sinais textual,
  semântico e de qualidade, e o resultado distingue evidência suficiente, fraca e ausente.
- [x] **T405** Implementar cache escopado por condomínio, permissão, versão e pipeline. A chave
  também usa hash da pergunta e revisão da membership.
- [x] **T406** Criar testes de isolamento em todas as interfaces do retrieval. A cobertura inclui
  store/cache sintéticos, ranking, índice PostgreSQL e cenário RLS Neon; a execução Neon depende
  das variáveis sintéticas obrigatórias do ambiente. Em 2026-09-04, após as migrations 007 e 008,
  `pnpm.cmd run test:integration` passou com 7/7 testes; os avisos de SSL e de fonte do PDF não
  alteraram o resultado. Em 2026-09-09, após a migration 009 do B6 e a correção do reset das
  fixtures para incluir as tabelas de respostas, o mesmo conjunto passou novamente com 7/7 testes.

## Fase 5 — Respostas e citações

- [x] **T501** Implementar gateway de IA independente de provedor. O contrato permite trocar o provedor e a primeira execução usa o gateway determinístico local, sem enviar dados reais a SaaS.
- [x] **T502** Versionar prompts e definir schema estruturado. O contrato `answer-v1` valida modos, citações, claims, pontos de atenção e encaminhamento.
- [x] **T503** Implementar modos `grounded`, `abstained`, `conflict` e `failed`, com falha fechada quando não há base autorizada ou a validação pós-geração falha.
- [x] **T504** Implementar validação pós-geração das citações, incluindo documento, versão, página, trecho e offsets verificáveis na evidência autorizada.
- [x] **T505** Implementar classificação de risco e escalonamento para advogado, contador, engenheiro, seguradora e especialista em proteção de dados.
- [x] **T506** Implementar tela de pergunta, resposta estruturada, citações e abertura segura do trecho exibido.
- [x] **T507** Automatizar AC-010 a AC-018 e AC-021 com testes determinísticos e os 20 casos sintéticos de eval.

## Fase 6 — Feedback, auditoria e evals

- [x] **T601** Implementar feedback imutavelmente vinculado à resposta. O endpoint autorizado
  registra uma classificação e comentário opcional associados ao `answerId`; o contrato e o
  teste E2E cobrem confirmação, tenant e rejeição de entrada inválida.
- [x] **T602** Implementar trilha auditável e telemetria minimizada. O trace registra hashes,
  referências de fonte, modo, rota, uso, custo, latência e resultado de segurança, sem
  conteúdo bruto; o store em memória e o adapter PostgreSQL preservam imutabilidade e RLS.
- [x] **T603** Criar adapter de eval para o caminho real da aplicação. `evals/synthetic-adapter.ts`
  executa o endpoint Fastify com gateway e retrieval locais sintéticos.
- [x] **T604** Tornar executáveis o corpus sintético e os 20 casos iniciais. A suíte
  `spec-001-synthetic-v1` cobre 19 casos P0 e 1 caso P1, sem documentos reais.
- [x] **T605** Registrar a baseline e calibrar os thresholds P1 sem flexibilizar P0. A baseline
  está em `docs/quality/b6-synthetic-baseline-2026-09-10.md`; P0 exige 100% e o agregado exige
  95%, com limite de p95 documentado.
- [x] **T606** Adicionar evals ao CI ou checklist de release. O workflow executa
  `pnpm run evals:synthetic` e o comando também está documentado no README e nos gates locais.
- [x] **T607** Automatizar AC-019 e AC-020. Os testes E2E validam feedback, trilha de resposta,
  imutabilidade, tenant autorizado e registro de falha segura.

## Fase 7 — Preparação do piloto

- [x] **T701** Executar threat-model review e testes de upload malicioso/prompt injection. Concluída para o piloto sintético em `docs/security/b7-threat-model-review.md`, com testes de endurecimento e sem liberar dados reais.
- [x] **T702** Verificar exportação, exclusão, retenção e revogação de acesso. Exercitada somente com artefatos sintéticos em `docs/security/b7-data-lifecycle-exercise.md`.
- [x] **T703** Preparar procedimento de incidente e rollback/forward-fix. Runbook e exercício sintético registrados em `docs/security/b7-incident-runbook.md` e `docs/security/b7-incident-exercise-2026-09-10.md`.
- [x] **T704** Selecionar corpus sintético representativo e ampliar o dataset com revisão humana. Os 100 casos sintéticos foram executados e revisados manualmente: 100 aprovados, 0 para revisar e 0 reprovados. A tela está disponível em `http://localhost:5173/?mode=synthetic-review` e o resultado está registrado em `docs/reviews/b7-corpus-human-review-2026-09-10.md`. A conclusão é limitada ao escopo sintético/local; dados reais, inclusive anonimizados, ficam fora de testes, evals e benchmarks.
- [x] **T705** Executar revisão completa do diff e checklist de release. Revisão e comandos estão registrados em `docs/reviews/b7-sintetico-2026-09-10.md`; a aprovação é limitada ao piloto sintético e não é aprovação de merge ou produção.

T601–T603 e T607 foram implementadas com stores locais e adapter PostgreSQL coberto por
testes; T604–T606 foram validadas pelo corpus sintético e pelo CI. T701–T705
continuam concluídas somente no escopo do exercício automatizado e humano sintético
explicitamente autorizado. Isso não substitui os gates para qualquer dado de
cliente, usuário externo, armazenamento remoto ou produção.

## Dependência principal

T001–T004 foram concluídas para desenvolvimento local. A Fase 2 só usa dados sintéticos e os adaptadores locais definidos no ADR 0006. Modelo, provedor e qualquer serviço externo continuam dependentes de ADR, avaliação e política de dados específicos.
