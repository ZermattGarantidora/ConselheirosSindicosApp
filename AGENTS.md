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
pnpm run test:e2e
pnpm run dev:api
pnpm run dev:web
pnpm run build:web
pnpm run worker
pnpm run db:up
pnpm run db:migrate
pnpm run db:migrate:neon
pnpm run test:integration
pnpm run evals
pnpm run audit:dependencies
pwsh -NoProfile -File scripts/verify-merge.ps1 -ReviewFile docs/reviews/<identificador>.md
```

O ambiente Docker local requer WSL e Docker Desktop. No ambiente atual, use o Neon exclusivamente para integração sintética conforme ADR 0007: em um banco Neon vazio e dedicado, aplique uma vez `infrastructure/neon/001-integration-guard.sql`; antes de `pnpm run db:migrate:neon` e `pnpm run test:integration`, defina `NEON_INTEGRATION_DATABASE_URL` com `sslmode=require` ou `sslmode=verify-full` e `NEON_INTEGRATION_CONFIRMATION=synthetic-only`. Os comandos recusam hosts não Neon, URLs sem TLS, confirmações ausentes e bancos sem o marcador persistente; o teste também executa `TRUNCATE` das fixtures. Ao implementar evals, adicione seu comando único ao `package.json`, ao `README.md` e a esta seção antes de declarar a tarefa pronta. Execute os gates aplicáveis antes de encerrar a tarefa.

## Definition of Done

Uma tarefa termina somente quando os requisitos e critérios correspondentes estão atendidos, os gates aplicáveis foram executados, os resultados foram informados e a documentação permanece coerente com a implementação e com a visão canônica do briefing.
