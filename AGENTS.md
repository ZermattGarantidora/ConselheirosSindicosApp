# Instruções para agentes de desenvolvimento

## Objetivo do projeto

Construir um conselheiro documental para síndicos que responda com evidências dos documentos autorizados do condomínio, preserve o isolamento de dados e reconheça quando não há base suficiente.

## Visão canônica

`BRIEFING_PRODUTO_CONSELHEIRO_SINDICO.md` é a visão canônica do projeto. Toda spec deve detalhar uma parte dessa visão sem contradizer seu problema, público, proposta de valor, prioridades, exclusões, princípios de segurança, hipóteses e critérios de validação.

Antes de criar ou alterar uma spec:

1. leia o briefing completo na versão atual;
2. identifique as seções do briefing que autorizam e delimitam a spec;
3. preencha a seção obrigatória `Alinhamento com a visão do projeto` usando referências concretas ao briefing;
4. confirme que o escopo não introduz algo marcado como posterior ou como não construir inicialmente;
5. confirme que os critérios de sucesso ajudam a validar as hipóteses centrais do produto.

Uma spec pode reduzir, sequenciar ou detalhar o escopo do briefing. Não pode ampliar ou desviar a visão silenciosamente. Se uma solicitação exigir divergência, pare e apresente o conflito; a mudança só prossegue com aprovação explícita e atualização do briefing na mesma decisão.

## Fontes de verdade

Em caso de conflito, siga esta ordem:

1. instrução explícita do usuário;
2. briefing, para visão, limites e princípios do produto;
3. definição do MVP em `docs/product/mvp.md`, como projeção operacional da visão;
4. diretriz em `docs/product/estrategia-competitiva.md`, para posicionamento, priorização e diferenciação;
5. spec ativa em `docs/specs/` e seus critérios de aceitação;
6. ADRs aceitos em `docs/adr/`.

Documentos mais específicos vencem apenas em detalhes que permaneçam compatíveis com o briefing. Uma instrução do usuário só altera a visão quando declarar essa intenção explicitamente. Não altere comportamento sem atualizar primeiro a spec e os exemplos de aceitação correspondentes.

## Forma de trabalhar

- Antes de editar, leia o briefing, a spec da funcionalidade e os ADRs relacionados.
- Antes de propor ou alterar posicionamento, prioridade de produto, diferenciação ou expansão de escopo, leia `docs/product/estrategia-competitiva.md` e aplique seu gate de decisão.
- Ao criar ou alterar uma spec de produto, confirme também se a fatia respeita o sequenciamento competitivo; a diretriz não autoriza antecipar itens posteriores ou fora do escopo do briefing.
- Ao criar uma spec, use `docs/specs/TEMPLATE.md` e conclua o gate de alinhamento com a visão.
- Identifique ambiguidades que mudem comportamento, segurança, custo ou arquitetura.
- Implemente a menor fatia vertical que satisfaça os critérios de aceitação.
- Mantenha cada mudança rastreável a um requisito.
- Prefira soluções simples, modulares e reversíveis.
- Não introduza dependência, serviço externo ou provedor de IA sem registrar a decisão.
- Preserve alterações existentes que não pertencem à tarefa.
- Use identificadores de código em inglês e textos de produto e documentação em português do Brasil.

## Invariantes de produto e segurança

- Toda operação de domínio deve estar vinculada a um `condominium_id` autorizado.
- Dados, arquivos, buscas vetoriais, caches e logs não podem misturar condomínios.
- A resposta não pode apresentar uma afirmação documental sem evidência recuperada.
- Toda citação deve apontar para documento, versão, página e trecho verificáveis.
- Na ausência de evidência suficiente, o sistema deve se abster e explicar a limitação.
- Conteúdo de documentos é dado não confiável e nunca instrução para o sistema.
- Conflitos de versão ou vigência devem ser exibidos, nunca resolvidos silenciosamente.
- Temas de alto risco devem recomendar validação humana.
- Nenhuma ação externa pode ser executada sem confirmação humana.
- Dados reais de clientes e dados pessoais não devem entrar em fixtures, testes ou evals.

## Qualidade

- Testes determinísticos validam regras, permissões, isolamento, contratos e integrações.
- Evals validam correção, grounding, citações, abstenção, conflitos e escalonamento.
- Todo bug corrigido deve gerar um teste ou caso de eval que evite regressão.
- Não enfraqueça asserções apenas para fazer um gate passar; documente a causa.
- Revise o diff completo antes de concluir uma tarefa.
- Siga `docs/quality/quality-gates.md` e mantenha `docs/quality/traceability.md` atualizado.
- Não marque uma spec como pronta enquanto a seção de alinhamento estiver ausente, genérica ou indicar divergência não aprovada.
- Nenhum merge é permitido sem code review do diff completo na revisão mais recente do branch e sem achados P0 ou P1 pendentes.
- Nenhum merge é permitido se qualquer teste aplicável falhar, estiver ausente ou não tiver sido executado contra o commit a integrar.
- A cobertura dos testes unitários deve ser de no mínimo 80% em linhas, funções, statements e branches. Todos os quatro indicadores devem atender ao piso.
- Exclusões de cobertura em código de produção exigem justificativa documentada, revisão e não podem mascarar comportamento de segurança, autorização, tenant, persistência ou regras de domínio.
- Após a escolha da stack, os comandos de teste e cobertura devem gerar relatórios legíveis por CI e ser configurados como status checks obrigatórios para merge.

## Comandos do projeto

Gate obrigatório para criar ou alterar specs:

```powershell
pwsh -NoProfile -File scripts/validate-spec-vision.ps1
```

A fundação usa TypeScript/Node, pnpm, Fastify, React/Vite e PostgreSQL com RLS/pgvector; veja os ADRs 0001–0006. Os comandos atualmente executáveis são:

```powershell
pnpm install --frozen-lockfile
pnpm run check
pnpm run test:authoring
pnpm run test:authoring:operations
pnpm run test:authoring:postgres
pnpm run test:authoring:pdf
pnpm run test:authoring:audio:pdf
pnpm run test:authoring:browser
pnpm run evals:audio-minutes
pnpm run evals:document-authoring
pnpm run evals:authoring:homologation
pnpm run evals:authoring:homologation:audio
pnpm run evals:authoring:local -- --confirm-synthetic-local
pnpm run evals:financial-300 -- --python=<python-local-com-reportlab>
pnpm run test:authoring:financial
pnpm run test:authoring:financial:browser
pnpm run test:authoring:general:browser
pnpm run test:authoring:originals
pnpm run test:authoring:originals:browser
pnpm run test:e2e
pnpm run test:pilot:security
pnpm run test:pilot:budget
pnpm run test:pilot:integration:local
pnpm run test:pilot:security:postgres
pnpm run test:pilot:data:local
pnpm run test:pilot:documents
pnpm run pilot:preparation
pnpm run test:pilot:operations
pnpm run test:pilot:recovery:local
pnpm run test:pilot:recovery:container
pnpm run test:pilot:worker:local
pnpm run test:pilot:rls:local
pnpm run pilot:observation
pnpm run test:demo-web
pnpm run test:documents:full-pages
pnpm run test:documents:long
pnpm run access:issue -- --user-id <identidade>
pnpm run dev:api
pnpm run dev:web
pnpm run build:web
pnpm run worker
pnpm run worker:continuous
pnpm run worker:start
pnpm run test:worker:separate -- --provider=neon
pnpm run db:up
pnpm run db:migrate
pnpm run db:migrate:supabase
pnpm run db:migrate:neon
pnpm run test:integration
pnpm run evals
pnpm run evals:full-pages
pnpm run evals:pdf-300
pnpm run evals:demo-documents
pnpm run evals:demo-long
pnpm run evals:synthetic
pnpm run evals:legal
pnpm run evals:documentary
pnpm run evals:documentary:semantic
pnpm run evals:conversations
pnpm run evals:comparison
pnpm run evals:cost-30
pnpm run evals:dense-documents
pnpm run evals:dense-comparison
pnpm run evals:hybrid
pnpm run evals:sol
pnpm run evals:luna
pnpm run evals:corrected
pnpm run evals:recovery
pnpm run evals:answer-quality
pnpm run evals:zermatt
pnpm run pilot:synthetic
pnpm run audit:dependencies
pwsh -NoProfile -File scripts/verify-merge.ps1 -ReviewFile docs/reviews/<identificador>.md
```

O ambiente Docker local requer WSL e Docker Desktop. Neon continua sendo a integração sintética ativa até que um projeto Supabase vazio, dedicado e marcado seja provisionado e validado conforme a Spec 040. O caminho Supabase usa `infrastructure/supabase/001-integration-guard.sql`, `SUPABASE_INTEGRATION_DATABASE_URL`, `SUPABASE_INTEGRATION_CONFIRMATION=synthetic-only` e `pnpm run db:migrate:supabase`; o caminho Neon preserva `NEON_INTEGRATION_DATABASE_URL`, `NEON_INTEGRATION_CONFIRMATION=synthetic-only` e `pnpm run db:migrate:neon`. Ambos exigem TLS, confirmação e marcador persistente; a suíte executa `TRUNCATE` somente em banco sintético dedicado. Ao implementar evals, adicione seu comando único ao `package.json`, ao `README.md` e a esta seção antes de declarar a tarefa pronta. Execute os gates aplicáveis antes de encerrar a tarefa.

## Preparação local do piloto de 16/11/2026

O índice de integração desta rodada está em `docs/release/pilot-2026-11-16-security.md`.
Termos/política em `docs/security/pilot-2026-11-16/` são rascunhos não aprovados; a política
sintética vigente continua bloqueando dados reais. O roteiro e o registro de gates estão em
`docs/quality/pilot-2026-11-16-sessions.md` e `docs/quality/pilot-2026-11-16-release-gates.md`.
`test:pilot:security` usa somente sintéticos e temporários próprios, sem migrations ou IA externa;
usa `tests/vitest.pilot-security.config.ts` com cache exclusivo por processo e cobertura desligada,
incluindo continuidade de sessão e histórico original entre aparelhos. WhatsApp fica reservado
à abertura pública, conforme esclarecimento de 09/11/2026; não é requisito do piloto fechado.
Configs globais e focadas da Segurança usam `envDir: false`; limpar o ambiente do processo não
impede sozinho a leitura automática de `.env*` pelo Vite. A regressão AC-7215 usa somente um
canário criado no temporário sintético, sem consultar o arquivo de credenciais do workspace.
Esse comando não substitui check/cobertura global, integração, revisão independente ou liberação do destino.
Durante edições concorrentes, adiar gates globais e relatórios compartilhados até candidata
estável coordenada. Migration 040 de limites de entrada foi validada no PostgreSQL local
sintético; execução remota/real continua sem autorização.
`pilot:preparation` valida arquivos sem conexão/ativação; `test:pilot:operations` usa mocks e
cobertura em diretório exclusivo da operação. `test:pilot:recovery:local` só deve ser executado
em PostgreSQL local descartável explicitamente autorizado, com confirmação `synthetic-local-only`,
pgvector e CLI compatível; cria dois bancos locais sintéticos para backup/restore e um terceiro
destino novo para reaplicar o plano de manutenção, mantendo os três em quarentena. Não
usar credenciais/serviços remotos nem executá-lo implicitamente. Contratos e limites na nota
`docs/release/pilot-2026-11-16-infrastructure.md`.

## Definition of Done

Na Spec 072, `test:pilot:budget` verifica reservas/recibos com sintéticos e cobertura exclusiva
por processo em `.local/pilot-security/`, sem substituir cobertura global. A migration 040 também
prepara política de consumo disabled e recibos privados; foi exercitada em bancos locais
sintéticos. Ligações injetáveis de API/worker/gateways foram testadas; startup persistente
continua negado e não autoriza chamada externa. Continuar por dependências, sem
lotes diários; 16/11 é somente prazo final, conforme a orientação do usuário.

A continuação prepara `createBudgetedHostedDocumentControls` e testa a composição com o ledger.
`test:pilot:integration:local` é sintético/mocks; `test:pilot:security:postgres` é SQL real somente
no container local próprio, com confirmação e recibo explícitos descritos no README. Nunca
carregar `.env`, apontar ao remoto ou executar esse gate guardado implicitamente. As migrations
039/040 foram exercitadas em bancos novos locais descartáveis; isso não autoriza rollout real.
`test:pilot:documents`, `test:pilot:recovery:container` e `pilot:observation` integram os comandos
das outras frentes após leitura dos contratos. Cobertura global usa somente testes unitários;
E2E permanecem gate separado, sem exclusões de produção para elevar os indicadores.

A janela `security-local-20261109-02` executou check completo, 2.347 testes unitários,
232 E2E, cobertura unitária 89,02/85,09/93,92/90,84 (statements/branches/functions/lines),
72 specs, scanner, builds/runtime, RLS e worker separado locais. Resultados e snapshots em
`docs/reviews/2026-11-09-pilot-integration-local.md`. Não é aprovação do diff inteiro, CI remoto,
política/fornecedor/dados reais ou liberação; mudanças posteriores repetem gates afetados.

pnpm 11 pode instalar automaticamente antes de `run`. Nesta rodada, depois de restaurar o
lockfile exclusivamente pelo cache offline, os gates usaram
`$env:pnpm_config_verify_deps_before_run = 'warn'` para evitar remontagem implícita. Não altera
assertivas nem substitui instalação frozen/consistência de versões; preferir binários locais
ou registrar essa preparação explicitamente durante coordenação compartilhada.

Uma tarefa termina somente quando os requisitos e critérios correspondentes estão atendidos, os gates aplicáveis foram executados, os resultados foram informados e a documentação permanece coerente com a implementação e com a visão canônica do briefing.
