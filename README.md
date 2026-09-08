# Conselheiro virtual para síndicos

MVP de um conselheiro documental que ajuda síndicos a encontrar informações nos documentos do condomínio, entender a base utilizada e transformar resultados em próximos passos seguros.

## Estrutura do repositório

```text
apps/
  api/             API Fastify, regras de domínio e worker
  web/             cliente React/Vite
  prototype/       protótipo estático de produto
infrastructure/
  database/        migrations PostgreSQL/RLS
  docker/          inicialização local do banco
docs/              produto, specs, ADRs, segurança e qualidade
tests/             testes unitários, e2e e integração
evals/             corpus e estratégia de avaliação sintéticos
scripts/           validações e utilitários de desenvolvimento
```

## Estado atual

O projeto possui uma fundação local em TypeScript, pnpm e Git. A Spec 001 foi aprovada para implementação local com corpus sintético; as decisões de arquitetura estão nos ADRs 0001–0009. Não há dados reais ou piloto autorizados. O OCR da OpenAI é permitido exclusivamente para corpus sintético, conforme ADR 0009.

A primeira fatia vertical é a consulta documental com citações e isolamento entre condomínios. O código só deve ser iniciado depois da revisão dos contratos desta fatia.

O briefing é a visão canônica do projeto. Toda spec deve demonstrar, com referências às seções do briefing, que permanece dentro dessa visão.

## Documentação

- [Briefing — visão canônica](BRIEFING_PRODUTO_CONSELHEIRO_SINDICO.md)
- [Definição do MVP](docs/product/mvp.md)
- [Diretriz de estratégia competitiva](docs/product/estrategia-competitiva.md)
- [Glossário](docs/product/glossary.md)
- [Template obrigatório de spec](docs/specs/TEMPLATE.md)
- [Spec 001 — consulta documental](docs/specs/001-consulta-documental/spec.md)
- [Spec 002 — fundação local de engenharia](docs/specs/002-fundacao-engenharia/spec.md)
- [Critérios de aceitação](docs/specs/001-consulta-documental/acceptance.md)
- [Plano técnico](docs/specs/001-consulta-documental/plan.md)
- [Tarefas](docs/specs/001-consulta-documental/tasks.md)
- [Decisões arquiteturais](docs/adr/)
- [Estrutura de banco de dados](docs/architecture/database-schema.md)
- [Protótipo PWA — onboarding e chat](apps/prototype/README.md)
- [Modelo de ameaças](docs/security/threat-model.md)
- [Política inicial de dados e riscos aceitos](docs/security/data-handling-inicial.md)
- [Gates de qualidade](docs/quality/quality-gates.md)
- [Política de merge](docs/quality/merge-policy.md)
- [CI e proteção remota do GitHub](docs/quality/github-deferred.md)
- [Rastreabilidade](docs/quality/traceability.md)
- [Estratégia de evals](evals/README.md)
- [Roadmap diário por blocos B1–B8](docs/product/roadmap-blocos.md)

## Fluxo spec-driven

1. Ler o briefing completo e identificar os limites da visão aplicáveis.
2. Criar a spec pelo template e preencher seu alinhamento com o briefing.
3. Escrever exemplos de aceitação e casos de falha.
4. Registrar decisões arquiteturais relevantes.
5. Atualizar a matriz de rastreabilidade.
6. Criar testes e evals antes ou junto da implementação.
7. Implementar uma tarefa pequena por vez.
8. Executar os gates, validar novamente o alinhamento e revisar o diff.
9. Incorporar bugs e aprendizados como novos casos de regressão.

## Estado da implementação

O scaffold local está disponível com API Fastify, cliente React/Vite, worker Node e migrations PostgreSQL/RLS. A seleção de condomínio, a negação de acesso, a revogação, o cache, a recuperação sintética e a ingestão documental já possuem testes. O fluxo B3 registra o original e a versão, enfileira o processamento, extrai PDF por página, encaminha OCR fraco para revisão e preserva versões e vigências.

O B4 está implementado com retrieval textual e semântico sintético, ranking, suficiência e cache escopados. A validação RLS no Neon de integração sintética passou com 7/7 cenários. O B5 está implementado nesta branch, e o CI remoto executa os gates de qualidade, E2E e build no GitHub Actions. Dados reais e piloto exigem uma política de dados específica aprovada.

## Comandos

Validar se todas as specs possuem a estrutura obrigatória de alinhamento com a visão:

```powershell
pwsh -NoProfile -File scripts/validate-spec-vision.ps1
```

Instalar e validar a fundação:

```powershell
pnpm install --frozen-lockfile
pnpm run check
```

Para uma integração local, use também o registro de review:

```powershell
pwsh -NoProfile -File scripts/verify-merge.ps1 -ReviewFile docs/reviews/<identificador>.md
```

## Desenvolvimento local

Em terminais separados, execute:

```powershell
pnpm run dev:api
pnpm run dev:web
```

Com PostgreSQL disponível e `DATABASE_URL` definido, a API usa identidade, upload e fila persistidos; execute o worker persistido para processar um job:

```powershell
$env:DATABASE_URL = "postgresql://postgres:local-development-only@127.0.0.1:5432/conselheiro"
pnpm run worker
```

Para criar uma nova versão, envie o `x-document-id` da versão anterior no upload; sem esse cabeçalho, a API cria um documento novo.

A API usa `http://127.0.0.1:3000`, o cliente usa `http://127.0.0.1:5173` e ambos trabalham somente com dados sintéticos. Para executar o cenário end-to-end de seleção de condomínio:

```powershell
pnpm run test:e2e
```

Para gerar o cliente estático:

```powershell
pnpm run build:web
```

No Neon, crie um projeto/branch exclusivo e vazio para integração sintética. Antes da primeira execução, aplique uma única vez o marcador de segurança usando a conexão desse banco:

```powershell
$env:NEON_INTEGRATION_DATABASE_URL = "postgresql://<role>:<password>@<host>.neon.tech/<database>?sslmode=require"
psql $env:NEON_INTEGRATION_DATABASE_URL -f infrastructure/neon/001-integration-guard.sql
```

O marcador precisa existir previamente; os scripts nunca o criam automaticamente. Isso faz a migration e o teste falharem antes de qualquer alteração quando a URL aponta para outro banco. Depois, defina as variáveis apenas no terminal atual, aplique a migration e execute a integração de RLS:

```powershell
$env:NEON_INTEGRATION_CONFIRMATION = "synthetic-only"
pnpm run db:migrate:neon
pnpm run test:integration
```

As URLs aceitas devem usar `postgresql:`/`postgres:` e `sslmode=require` ou `sslmode=verify-full`. O Neon é permitido somente para este banco marcado, com dados sintéticos e confirmação explícita; nunca informe essa URL no chat, commit ou arquivo `.env`. Docker continua como alternativa local futura.
