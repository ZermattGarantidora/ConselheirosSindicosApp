# Tarefas — Spec 001

**Status:** scaffold, isolamento local, B3 e primeira fatia local do B4 implementados; gate Neon do B4 pendente
**Atualizado em:** 2026-09-04

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
- [ ] **T104** Configurar CI com gates rápidos, proteção contra segredos, execução de testes e publicação de cobertura. Adiado até a adoção de GitHub; ver `docs/quality/github-deferred.md`.
- [ ] **T105** Configurar proteção de branch para bloquear merge sem code review aprovado, testes aprovados e cobertura unitária mínima de 80% no commit atual. Adiado até a adoção de GitHub; o verificador local é obrigatório enquanto isso.
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
- [ ] **T406** Criar testes de isolamento em todas as interfaces do retrieval. A cobertura inclui
  store/cache sintéticos, ranking, índice PostgreSQL e cenário RLS Neon; a execução Neon depende
  das variáveis sintéticas obrigatórias do ambiente. Os testes foram criados, mas o gate de
  execução permanece pendente porque `NEON_INTEGRATION_DATABASE_URL` e
  `NEON_INTEGRATION_CONFIRMATION=synthetic-only` não estavam configurados.

## Fase 5 — Respostas e citações

- [ ] **T501** Implementar gateway de IA independente de provedor.
- [ ] **T502** Versionar prompts e definir schema estruturado.
- [ ] **T503** Implementar modos `grounded`, `abstained`, `conflict` e `failed`.
- [ ] **T504** Implementar validação pós-geração das citações.
- [ ] **T505** Implementar classificação de risco e escalonamento.
- [ ] **T506** Implementar tela de pergunta, resposta estruturada e abertura da fonte.
- [ ] **T507** Automatizar AC-010 a AC-018 e AC-021.

## Fase 6 — Feedback, auditoria e evals

- [ ] **T601** Implementar feedback imutavelmente vinculado à resposta.
- [ ] **T602** Implementar trilha auditável e telemetria minimizada.
- [ ] **T603** Criar adapter de eval para o caminho real da aplicação.
- [ ] **T604** Tornar executáveis o corpus sintético e os 20 casos iniciais.
- [ ] **T605** Registrar a baseline e calibrar os thresholds P1 sem flexibilizar P0.
- [ ] **T606** Adicionar evals ao CI ou checklist de release.
- [ ] **T607** Automatizar AC-019 e AC-020.

## Fase 7 — Preparação do piloto

- [ ] **T701** Executar threat-model review e testes de upload malicioso/prompt injection.
- [ ] **T702** Verificar exportação, exclusão, retenção e revogação de acesso.
- [ ] **T703** Preparar procedimento de incidente e rollback/forward-fix.
- [ ] **T704** Selecionar documentos anonimizados e ampliar o dataset com revisão humana.
- [ ] **T705** Executar revisão completa do diff e checklist de release.

## Dependência principal

T001–T004 foram concluídas para desenvolvimento local. A Fase 2 só usa dados sintéticos e os adaptadores locais definidos no ADR 0006. Modelo, provedor e qualquer serviço externo continuam dependentes de ADR, avaliação e política de dados específicos.
