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
- [Método de atuação da Alvitra](docs/product/metodo-atuacao-cora.md)
- [Glossário](docs/product/glossary.md)
- [Template obrigatório de spec](docs/specs/TEMPLATE.md)
- [Spec 001 — consulta documental](docs/specs/001-consulta-documental/spec.md)
- [Spec 006 — autenticação real](docs/specs/006-autenticacao-real/spec.md)
- [Spec 007 — criação real de condomínio](docs/specs/007-condominio-real/spec.md)
- [Spec 008 — login com Google](docs/specs/008-login-google/spec.md)
- [Spec 009 — configurações do chat e exclusão do condomínio](docs/specs/009-configuracoes-chat/spec.md)
- [Spec 015 — segurança e recuperação da conta](docs/specs/015-seguranca-da-conta/spec.md)
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

O scaffold local está disponível com API Fastify, cliente React/Vite, worker Node e migrations PostgreSQL/RLS. A seleção de condomínio, a negação de acesso, a revogação, o cache, a recuperação sintética e a ingestão documental já possuem testes. O fluxo B3 registra o original e a versão, enfileira o processamento, extrai PDF por página, encaminha OCR fraco para revisão e preserva versões e vigências. As Specs 006 e 015 adicionam contas reais por e-mail e senha no ambiente persistente, verificação do endereço, recuperação e troca de senha, TOTP MFA, códigos de recuperação e sessões revogáveis por dispositivo, mantendo o isolamento por condomínio.

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

Ao abrir o cliente local, o site real é o padrão e exige `DATABASE_URL`. Ele mostra a entrada e o
cadastro com e-mail e senha. O cadastro usa nome, e-mail e senha de no mínimo 12 caracteres; o
servidor guarda somente o hash da senha e uma sessão opaca em cookie HttpOnly. A conta precisa
confirmar o endereço antes do primeiro acesso. A tela de perfil permite trocar a senha, ativar ou
desativar TOTP MFA, guardar códigos de recuperação e revisar ou revogar sessões por dispositivo. Depois do login,
nenhuma associação é criada automaticamente: a pessoa cria explicitamente seu condomínio e recebe
o papel de síndico somente nesse novo contexto. Esses controles seguem a
[Spec 015](docs/specs/015-seguranca-da-conta/spec.md) e o
[ADR 0020](docs/adr/0020-seguranca-e-recuperacao-da-conta.md).

Para ativar esse modo localmente, suba o PostgreSQL, aplique as migrations e só então inicie a
API com a URL do banco:

```powershell
pnpm run db:up
pnpm run db:migrate
$env:DATABASE_URL = "postgresql://postgres:local-development-only@127.0.0.1:5432/conselheiro"
$env:AUTH_ACCOUNT_SECRET_KEY = "<32-bytes-em-hex-ou-base64url>"
pnpm run dev:api
```

Como nenhum provedor de e-mail foi aprovado, o desenvolvimento pode exibir um link local de
verificação ou redefinição sem enviar mensagem externa. Esse modo é proibido em produção:

```env
AUTH_EMAIL_DELIVERY=development
AUTH_PUBLIC_BASE_URL=http://127.0.0.1:5173/
```

Produção permanece bloqueada até a escolha documentada de um provedor de e-mail. Tokens de
verificação e recuperação nunca devem aparecer em logs.

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

Depois das migrations, importe ou atualize a Constituição Federal oficial na biblioteca legal
compartilhada do aplicativo:

```powershell
pnpm.cmd run legal:import:constitution
```

O comando aceita somente o PDF HTTPS da Câmara dos Deputados, valida o arquivo, preserva versões e
grava páginas, trechos e índice vetorial uma única vez para todos os condomínios.

A demonstração sintética não é ativada automaticamente quando o banco está ausente. Para iniciá-la
deliberadamente, remova `DATABASE_URL` do ambiente, defina `DEMO_MODE=true` e execute a API. Sem
uma dessas duas configurações, o servidor interrompe a inicialização para não substituir o site real
por um ambiente de teste.

O comando remoto registra migrations aplicadas em `app.schema_migrations` e interrompe sem alterar
um banco que já tenha tabelas, mas não tenha esse histórico. O navegador não recebe a credencial do
banco. A primeira execução precisa usar a credencial administrativa do banco para criar o papel
restrito `app_runtime`; depois, a API continua usando a mesma URL e troca para esse papel nas
consultas protegidas. A migration 012 habilita a criação transacional do condomínio e da membership
do síndico e a listagem dos grupos autorizados. O comando `db:migrate:neon` continua reservado ao banco de integração
sintética do ADR 0007.

Para habilitar uma conta administrativa da Zermatt no ambiente controlado, aplique também a
migration 016. Crie a conta pelo fluxo normal, copie o `userId` retornado pela autenticação e
configure no servidor os identificadores autorizados, separados por vírgula:

```env
ADMIN_USER_IDS=00000000-0000-4000-8000-000000000000
```

No desenvolvimento local, essa configuração pode ficar em `.env.admin.local`, arquivo ignorado
pelo Git e carregado automaticamente por `pnpm run dev:api` depois de `.env.local`.

A pessoa acessa novamente sua conta pelo login normal depois que o servidor é reiniciado. Quando o
identificador interno está nessa lista, ela entra diretamente no painel administrativo. O painel mostra somente contas ativas, novos
cadastros e pessoas com acesso nos últimos sete dias; não consulta nem exibe condomínios,
documentos, perguntas, respostas ou contatos individuais. Sem `ADMIN_USER_IDS`, o acesso
administrativo permanece desabilitado. Veja a [Spec 012](docs/specs/012-painel-administrativo-zermatt/spec.md)
e o [ADR 0014](docs/adr/0014-painel-administrativo-minimizado.md).

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
# GEMINI_TIMEOUT_MS=60000
# GEMINI_MAX_ATTEMPTS=3
# GEMINI_RETRY_BASE_DELAY_MS=200
pnpm run dev:api
```

Sem `GEMINI_API_KEY`, o ambiente usa o gateway sintético local. A Gemini recebe somente a pergunta
e os trechos já recuperados para o condomínio autorizado; a saída ainda passa pela validação local
de citações antes de ser mostrada. Para os testes, o padrão é `gemini-3.5-flash-lite`, priorizando
o menor custo; `GEMINI_MODEL` permite uma substituição explícita quando um eval exigir outro modelo.
Falhas transitórias são repetidas até três vezes dentro do orçamento total de
`GEMINI_TIMEOUT_MS`. Se todas falharem e houver evidência suficiente, o sistema mantém uma resposta
curta em modo documental local, sem expor um trecho bruto ou fragmentado como resposta.

Para interpretar fotos sintéticas, a aplicação precisa estar no modo persistido com PostgreSQL e
`DATABASE_URL`. A migration 025 foi aplicada em 2026-10-07 no Neon configurado com o marcador de
integração sintética que atende à prévia local, após autorização explícita. A suíte de integração
não foi executada nessa base porque trunca fixtures e ela contém dados da prévia. Além da chave, configure
`GEMINI_IMAGE_ANALYSIS_ENABLED=true` e `GEMINI_PAID_TIER_CONFIRMED=true` somente após confirmar o
faturamento ativo no projeto associado à chave; essa confirmação é operacional e não é validada pela
API. O modelo visual padrão é `gemini-3.5-flash-lite` (pode ser substituído por
`GEMINI_IMAGE_MODEL`). A tela avisa que a foto escolhida será armazenada no banco do condomínio e
enviada à Gemini paga após o clique de envio. No ambiente atual, use somente imagens sintéticas;
fotos reais/pilotos continuam bloqueadas pelos gates de privacidade. Após 30 dias na lixeira, a
purga remove do banco ativo o original e os dados usados para encontrá-lo novamente. Perguntas,
respostas, feedback e citações ficam no chat; trechos de documentos removidos são identificados como
históricos, sem acesso ao PDF original. O recibo sem conteúdo expira em 30 dias. O
prazo de backups e o procedimento para reaplicar exclusões depois de uma restauração ainda precisam
ser aprovados antes de dados reais. A migration 026 que ativa esse ciclo foi implementada, mas ainda
não foi aplicada à prévia; a validação exige uma base de integração vazia, dedicada e somente sintética.

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
