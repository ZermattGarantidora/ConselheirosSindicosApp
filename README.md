# Conselheiro virtual para síndicos

MVP de um conselheiro documental que ajuda síndicos a encontrar informações nos documentos do condomínio, entender a base utilizada e transformar resultados em próximos passos seguros.

Para retomar o desenvolvimento em outra conta ou sessão, use o prompt e o estado registrados em
[`docs/handoff/2026-09-21-continuacao.md`](docs/handoff/2026-09-21-continuacao.md).

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
- [Método de atuação da Cora](docs/product/metodo-atuacao-cora.md)
- [Glossário](docs/product/glossary.md)
- [Template obrigatório de spec](docs/specs/TEMPLATE.md)
- [Spec 001 — consulta documental](docs/specs/001-consulta-documental/spec.md)
- [Spec 006 — autenticação real](docs/specs/006-autenticacao-real/spec.md)
- [Spec 007 — criação real de condomínio](docs/specs/007-condominio-real/spec.md)
- [Spec 008 — login com Google](docs/specs/008-login-google/spec.md)
- [Spec 009 — configurações do chat e exclusão do condomínio](docs/specs/009-configuracoes-chat/spec.md)
- [Spec 002 — fundação local de engenharia](docs/specs/002-fundacao-engenharia/spec.md)
- [Critérios de aceitação](docs/specs/001-consulta-documental/acceptance.md)
- [Plano técnico](docs/specs/001-consulta-documental/plan.md)
- [Tarefas](docs/specs/001-consulta-documental/tasks.md)
- [Decisões arquiteturais](docs/adr/)
- [ADR 0012 — PostgreSQL gerenciado remoto](docs/adr/0012-postgresql-gerenciado-remoto.md)
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

O scaffold local está disponível com API Fastify, cliente React/Vite, worker Node e migrations PostgreSQL/RLS. A seleção de condomínio, a negação de acesso, a revogação, o cache, a recuperação sintética e a ingestão documental já possuem testes. O fluxo B3 registra o original e a versão, enfileira o processamento, extrai PDF por página, encaminha OCR fraco para revisão e preserva versões e vigências. A Spec 006 adiciona contas reais por e-mail e senha no ambiente persistente, com sessões revogáveis e isolamento mantido por condomínio.

A Spec 009 adiciona configurações gerais da conversa e a saída segura da gestão: o síndico pode
confirmar a exclusão permanente do condomínio selecionado, enquanto a conta e os demais condomínios
permanecem intactos.

O B4, B5 e B6 estão implementados com retrieval textual e semântico sintético, respostas fundamentadas, citações verificáveis, abstenção, conflitos, escalonamento, feedback, auditoria e evals. A validação RLS no Neon de integração sintética passou com 7/7 cenários; os 20 evals locais passam na baseline atual. O GitHub Actions executa os gates de qualidade, E2E e build; a proteção obrigatória da `main` permanece pendente de ativação. Dados reais e piloto exigem uma política de dados específica aprovada.

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

Ao abrir o cliente local, o fluxo começa em um acesso demonstrativo. É possível escolher os
condomínios sintéticos existentes ou criar um condomínio de teste temporário; esta criação só é
habilitada quando a API é iniciada sem `DATABASE_URL`, permanece em memória e não recebe
documentos automaticamente.

Quando `DATABASE_URL` está definido, o cliente deixa o modo demonstrativo e mostra a entrada de
conta real. O cadastro usa nome, e-mail e senha de no mínimo 12 caracteres; o servidor guarda
somente o hash da senha e uma sessão opaca em cookie HttpOnly. Depois do login, nenhuma associação
é criada automaticamente: a pessoa cria explicitamente seu condomínio e recebe o papel de síndico
somente nesse novo contexto. Verificação de e-mail, recuperação de senha e MFA ainda são etapas
obrigatórias antes de um piloto público, conforme a [Spec 006](docs/specs/006-autenticacao-real/spec.md),
a [Spec 007](docs/specs/007-condominio-real/spec.md), a [Spec 008](docs/specs/008-login-google/spec.md)
e o [ADR 0011](docs/adr/0011-autenticacao-real-email-senha.md).

Para ativar esse modo localmente, suba o PostgreSQL, aplique as migrations e só então inicie a
API com a URL do banco:

```powershell
pnpm run db:up
pnpm run db:migrate
$env:DATABASE_URL = "postgresql://postgres:local-development-only@127.0.0.1:5432/conselheiro"
pnpm run dev:api
```

Se o Docker não estiver disponível, use um PostgreSQL gerenciado remoto no staging. Crie o banco
vazio no provedor, mantenha a URL somente no ambiente do servidor e exija TLS. Para desenvolvimento
local, você pode salvar a URL em `.env.local` (arquivo ignorado pelo Git); os comandos de API e
migração carregam esse arquivo automaticamente:

```powershell
Copy-Item .env.example .env.local
# Edite .env.local e preencha DATABASE_URL com a string copiada em Connect no Neon.
pnpm.cmd run db:migrate:remote
pnpm.cmd run dev:api
```

O comando remoto registra migrations aplicadas em `app.schema_migrations` e interrompe sem alterar
um banco que já tenha tabelas, mas não tenha esse histórico. O navegador não recebe a credencial do
banco. A primeira execução precisa usar a credencial administrativa do banco para criar o papel
restrito `app_runtime`; depois, a API continua usando a mesma URL e troca para esse papel nas
consultas protegidas. A migration 012 habilita a criação transacional do condomínio e da membership
do síndico e a listagem dos grupos autorizados. O comando `db:migrate:neon` continua reservado ao banco de integração
sintética do ADR 0007.

A migration 014 mantém o endpoint técnico de revogação de membership por compatibilidade. A ação
“Sair da gestão e apagar condomínio” da interface usa a migration 015: somente o síndico responsável
pode confirmar a exclusão permanente do condomínio selecionado, incluindo cadastro, documentos,
conversas, histórico, auditoria e associações. A conta e outros condomínios permanecem intactos.

O login com Google foi preparado no servidor, mas a opção está temporariamente ocultada na
interface. Não é necessário configurar o Google Cloud enquanto esse recurso estiver pausado.
Quando for reativá-lo, crie um cliente OAuth para aplicação web no Google Cloud e cadastre a URI
exata de callback. Em desenvolvimento com o proxy Vite, use
`http://127.0.0.1:5173/v1/auth/google/callback` como URI autorizada e adicione ao `.env.local`:

```env
GOOGLE_CLIENT_ID=seu-client-id
GOOGLE_CLIENT_SECRET=seu-client-secret
GOOGLE_OAUTH_REDIRECT_URI=http://127.0.0.1:5173/v1/auth/google/callback
GOOGLE_OAUTH_SUCCESS_REDIRECT_URI=http://127.0.0.1:5173/
```

Aplique a migration 013 e reinicie a API. O servidor troca o código OAuth, valida o e-mail
verificado pelo Google e cria a sessão local; tokens Google nunca são enviados ao cliente.

Para testar a redação com Gemini, crie uma chave no Google AI Studio e salve-a uma vez em
`.env.local`, que é ignorado pelo Git. A chave não é enviada ao cliente nem gravada no repositório.
Na faixa gratuita, use exclusivamente os documentos sintéticos do projeto.

```powershell
Copy-Item .env.example .env.local
# Edite .env.local e preencha apenas estas duas linhas:
# GEMINI_API_KEY=sua-chave
# GEMINI_MODEL=gemini-3.5-flash-lite
pnpm run dev:api
```

Sem `GEMINI_API_KEY`, o ambiente usa o gateway sintético local. A Gemini recebe somente a pergunta
e os trechos já recuperados para o condomínio autorizado; a saída ainda passa pela validação local
de citações antes de ser mostrada. Para os testes, o padrão é `gemini-3.5-flash-lite`, priorizando
o menor custo; `GEMINI_MODEL` permite uma substituição explícita quando um eval exigir outro modelo.

As perguntas e respostas são registradas pela persistência de respostas e reaparecem ao reabrir o
condomínio pela rota `GET /v1/condominiums/:condominiumId/history`. Sem `DATABASE_URL`, esse histórico
fica em memória enquanto a API estiver ligada; com PostgreSQL, ele usa as tabelas e políticas RLS do
condomínio autorizado.

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

Para executar os 20 casos sintéticos da Spec 001 contra o mesmo endpoint de perguntas e feedback:

```powershell
pnpm run evals
```

O comando bloqueia falhas P0 e regressão abaixo do threshold P1 definido em `evals/baseline.json`.

Para executar o piloto fechado da B7 com 100 cenários e documentos fictícios
gerados por IA:

```powershell
pnpm run pilot:synthetic
```

O comando usa somente o gateway local, não chama provedor externo, não executa
ações externas e imprime apenas métricas agregadas. O piloto não valida dados
reais nem autoriza uso de documentos de clientes.

Para fazer a revisão humana de forma guiada, sem editar uma planilha, abra um
segundo terminal e execute:

```powershell
pnpm.cmd run review:synthetic
```

Depois acesse `http://localhost:5173/?mode=synthetic-review`. A tela mostra um
caso por vez, o documento fictício, a resposta observada e o motivo para
aprovar, deixar para revisar ou reprovar. As decisões ficam somente no
navegador e podem ser baixadas ao final; nenhum dado é enviado para fora.

Para executar os 20 evals sintéticos iniciais pelo endpoint real:

```powershell
pnpm run evals:synthetic
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
