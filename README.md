# Alvitra

A Alvitra é uma assistente de IA para síndicos. O aplicativo abre diretamente em uma conversa:
o usuário pede ajuda, envia documentos quando necessário e confere as fontes usadas nas respostas.

A visão canônica está em
[`BRIEFING_PRODUTO_CONSELHEIRO_SINDICO.md`](BRIEFING_PRODUTO_CONSELHEIRO_SINDICO.md). A
reestruturação atual avança bloco a bloco e somente o Bloco 1 está autorizado.

## Estado atual

- a página inicial é o chat, sem landing page, cadastro, formulário de login, onboarding ou telas
  paralelas;
- um único botão “Entrar” pede ao servidor um contexto já autorizado;
- telefone e código pelo WhatsApp são uma direção futura e ainda não fazem parte desta fatia;
- perguntas, histórico, citações, abstenção, conflitos, feedback e escalonamento permanecem no chat;
- PDF, JPEG e PNG podem ser enviados explicitamente pelo compositor;
- armazenamento, processamento, OCR, embeddings e recuperação permanecem isolados por
  `condominium_id`;
- dados reais e pilotos continuam sujeitos aos gates de segurança e privacidade existentes.

Personalidade definitiva, múltiplos chats, barra lateral, menu, perfil conversacional, documentos
sob demanda, raio-X de balancetes e níveis da conta pertencem aos blocos seguintes e não estão
implementados nesta fatia.

## Estrutura

```text
apps/
  api/             API Fastify, domínio, recuperação e processamento documental
  web/             chat React/Vite
infrastructure/
  database/        migrations PostgreSQL/RLS/pgvector
  neon/            proteção do banco sintético de integração
docs/              visão, specs, ADRs, segurança e qualidade
tests/             testes unitários, e2e e integração
evals/             corpus e avaliações sintéticas
scripts/           validações, migrations e utilitários
```

## Documentação principal

- [Briefing — visão canônica](BRIEFING_PRODUTO_CONSELHEIRO_SINDICO.md)
- [Definição operacional do MVP](docs/product/mvp.md)
- [Estratégia competitiva](docs/product/estrategia-competitiva.md)
- [Roadmap da reestruturação](docs/product/roadmap-blocos.md)
- [Spec 016 — chat único, Bloco 1](docs/specs/016-chat-unico-bloco-1/spec.md)
- [Spec 001 — consulta documental](docs/specs/001-consulta-documental/spec.md)
- [ADRs](docs/adr/)
- [Gates de qualidade](docs/quality/quality-gates.md)
- [Rastreabilidade](docs/quality/traceability.md)
- [Modelo de ameaças](docs/security/threat-model.md)

## Requisitos

- Node.js 24
- pnpm 11
- PostgreSQL com pgvector para o modo persistente
- Docker Desktop/WSL apenas quando o banco local em container for usado

## Instalação e gates

```powershell
pnpm install --frozen-lockfile
pnpm run check
pnpm run test:e2e
pnpm run build:web
```

O gate específico de specs pode ser executado separadamente:

```powershell
pwsh -NoProfile -File scripts/validate-spec-vision.ps1
```

Antes de integrar uma mudança, use também o registro de revisão aplicável:

```powershell
pwsh -NoProfile -File scripts/verify-merge.ps1 -ReviewFile docs/reviews/<identificador>.md
```

## Desenvolvimento local

### Demonstração sintética

A demonstração é a forma mais simples de abrir o chat do Bloco 1. Ela usa somente identidades,
documentos e memória em desenvolvimento.

```powershell
$env:DEMO_MODE = "true"
pnpm run dev:api
```

Em outro terminal:

```powershell
pnpm run dev:web
```

Abra `http://127.0.0.1:5173/`. A raiz apresenta diretamente a conversa; ao clicar em “Entrar”, o
servidor resolve o primeiro condomínio sintético autorizado para `sindico-demo`.

### Ambiente persistente

Com `DATABASE_URL`, a API mantém PostgreSQL/RLS, originais privados, fila documental, histórico e
busca vetorial. No Bloco 1, “Entrar” usa somente uma sessão HttpOnly já existente e não oferece
formulário de autenticação ou criação de condomínio. Se não existir sessão ou contexto autorizado,
o chat falha de forma segura e informa a limitação sem carregar dados. A coleta de telefone e o
código pelo WhatsApp serão implementados em uma etapa futura.

```powershell
pnpm run db:up
pnpm run db:migrate
$env:DATABASE_URL = "postgresql://postgres:local-development-only@127.0.0.1:5432/conselheiro"
pnpm run dev:api
```

Para processar a fila em um processo separado:

```powershell
$env:DATABASE_URL = "postgresql://postgres:local-development-only@127.0.0.1:5432/conselheiro"
pnpm run worker
```

O modo real é o padrão seguro: sem `DATABASE_URL` e sem `DEMO_MODE=true`, a API recusa iniciar.

## Documentos e vetorização

O chat aceita PDF, JPEG e PNG. Selecionar um arquivo não o envia; o upload acontece somente após o
clique na seta. O servidor valida identidade, membership, `condominium_id`, tipo e tamanho antes de
armazenar. Em seguida o pipeline preserva o original, extrai texto ou executa OCR/análise visual
quando configurada, gera embeddings e atualiza o estado de processamento.

Para o modo persistente, o worker pode ser incorporado temporariamente à API com a configuração
documentada no ambiente, ou executado pelo comando `pnpm run worker`. Imagens só são aceitas quando
os adaptadores pagos e as confirmações operacionais exigidas estiverem habilitados; fotos reais
continuam bloqueadas até os gates de privacidade.

Uma nova versão de documento pode reutilizar o identificador anterior pelo cabeçalho interno
`x-document-id`. A recuperação continua limitada ao condomínio autorizado, à versão e à página.

## Provedores de IA

Sem chave externa, o ambiente sintético usa o gateway local. Quando a Gemini estiver configurada,
somente a pergunta e os trechos já recuperados para o contexto autorizado são enviados, e a saída
continua passando pela validação local de citações.

```env
GEMINI_API_KEY=
GEMINI_MODEL=gemini-3.5-flash-lite
GEMINI_TIMEOUT_MS=60000
GEMINI_MAX_ATTEMPTS=3
GEMINI_RETRY_BASE_DELAY_MS=200
```

Não grave chaves no repositório nem as informe em conversas.

## Integração sintética com Neon

O Neon é permitido exclusivamente para integração sintética conforme ADR 0007. Use um banco vazio,
dedicado e marcado uma única vez com `infrastructure/neon/001-integration-guard.sql`. Depois defina,
somente no terminal atual:

```powershell
$env:NEON_INTEGRATION_DATABASE_URL = "postgresql://<role>:<password>@<host>.neon.tech/<database>?sslmode=require"
$env:NEON_INTEGRATION_CONFIRMATION = "synthetic-only"
pnpm run db:migrate:neon
pnpm run test:integration
```

Os comandos recusam hosts não Neon, conexão sem TLS, confirmação ausente e banco sem o marcador.
O teste de integração executa `TRUNCATE` das fixtures e nunca deve apontar para uma base com dados a
preservar.

## Evals e segurança

```powershell
pnpm run evals
pnpm run evals:synthetic
pnpm run pilot:synthetic
pnpm run audit:dependencies
```

Fixtures e evals usam apenas conteúdo sintético. Nenhum documento real de cliente ou dado pessoal
deve entrar no repositório. Conteúdo documental é tratado como dado não confiável e nunca como
instrução para o sistema.
