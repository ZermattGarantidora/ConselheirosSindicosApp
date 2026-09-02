# Tarefas — Spec 001

**Status:** scaffold e isolamento local implementados; integração PostgreSQL pendente  
**Atualizado em:** 2026-09-01

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

- [ ] **T301** Modelar `Document`, `DocumentVersion`, páginas, chunks e jobs.
- [ ] **T302** Implementar upload privado com validação e hash.
- [ ] **T303** Implementar extração de PDF textual preservando páginas.
- [ ] **T304** Implementar adaptador de OCR e indicador de qualidade.
- [ ] **T305** Implementar versão, vigência e estados de processamento.
- [ ] **T306** Automatizar AC-004 a AC-007.

## Fase 4 — Retrieval

- [ ] **T401** Definir contrato de evidência e estratégia de chunking.
- [ ] **T402** Implementar indexação textual/semântica com metadados obrigatórios.
- [ ] **T403** Implementar busca filtrada antes do ranking.
- [ ] **T404** Implementar reranking e avaliação de suficiência.
- [ ] **T405** Implementar cache escopado por condomínio, permissão e versão.
- [ ] **T406** Criar testes de isolamento em todas as interfaces do retrieval.

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
