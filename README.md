# Alvitra

A Alvitra é uma assistente de IA para síndicos. O aplicativo abre diretamente em uma conversa:
o usuário pede ajuda, envia documentos quando necessário e confere as fontes usadas nas respostas.

A visão canônica está em
[`BRIEFING_PRODUTO_CONSELHEIRO_SINDICO.md`](BRIEFING_PRODUTO_CONSELHEIRO_SINDICO.md). A
reestruturação atual segue o briefing e o MVP, que registram os Blocos 1 a 8 autorizados.

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

Personalidade, múltiplos chats, menu, perfil conversacional e documentos sob demanda seguem as
specs próprias. As Specs 028–032 integram a primeira fatia de análise documental estruturada;
os limites e a validação ainda pendente estão descritos abaixo.

## Estrutura

```text
apps/
  api/             API Fastify, domínio, recuperação e processamento documental
  web/             chat React/Vite
infrastructure/
  database/        migrations PostgreSQL/RLS/pgvector
  supabase/        proteção do banco sintético de integração
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
pnpm run build:api
pnpm run test:production
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

Em Supabase, use a URL PostgreSQL direta do projeto no ambiente correspondente. A aplicação não
usa a chave pública nem o cliente JavaScript do Supabase: somente `DATABASE_URL` permanece no
servidor. Aplique migrations no banco persistente autorizado com:

```powershell
$env:DATABASE_URL = "postgresql://<role>:<password>@db.<project-ref>.supabase.co:5432/postgres?sslmode=require"
pnpm run db:migrate:remote
```

Não use o projeto Supabase de integração sintética para esta finalidade.

O modo real é o padrão seguro: sem `DATABASE_URL` e sem `DEMO_MODE=true`, a API recusa iniciar.

## Demonstração online no Render

O arquivo [`render.yaml`](render.yaml) publica uma demonstração gratuita, intencionalmente efêmera
e sintética. Ela executa a API e a interface na mesma origem HTTPS, sem `DATABASE_URL`, chaves de IA
ou dados de clientes. Para criar o serviço, conecte este repositório ao Render e importe o Blueprint;
o health check é `/health`.

Essa URL é somente uma prévia da interface e pode pausar por inatividade no plano gratuito.
Sem provedor de IA configurado, a Alvitra informa indisponibilidade e não oferece conversa
simulada por frases prontas. Para testar a conversa, configure a API em ambiente sintético
controlado, com orçamento e sem dados reais.
Não envie documentos reais, dados pessoais ou credenciais. Um piloto persistente continua bloqueado
pelos pré-requisitos da [Spec 011](docs/specs/011-piloto-real-controlado/spec.md).

## Capacidade da demonstração publicada

O Render compila a API com `pnpm run build:api` durante o build e inicia diretamente
`node dist/api/app/main.js`. `pnpm start` também exige esse build prévio. O desenvolvimento
continua usando `pnpm run dev:api`. O processo publicado não executa pnpm/tsx nem carrega
o leitor de PDFs antes do primeiro documento.

Na demonstração em produção, somente um envio/processamento documental é admitido de cada vez.
A reserva começa antes de aceitar o corpo e só termina quando a leitura em segundo plano acaba;
rejeições e falhas liberam a reserva. Novas operações POST são recusadas com 503 `server_busy`
quando o RSS alcança 320 MiB, preservando margem para a instância de 512 MB. O cliente mantém
o arquivo/mensagem para repetir; originais, catálogo, histórico e saúde permanecem acessíveis.
Nenhum documento é removido automaticamente para liberar espaço.

O servidor registra `server_memory` ao iniciar e a cada minuto, somente com valores agregados de
RSS, heap, memória externa e buffers, sem perguntas, documentos ou identidades. O guard usa RSS
do processo e não é um limite absoluto de memória nativa de um PDF individual. O resultado deve
ser acompanhado no Render após publicar; não há promessa de que 512 MB atende qualquer arquivo
ou volume. A memória documental e o histórico da demonstração continuam efêmeros.

`pnpm run test:production`, executado depois do build da API, valida a versão compilada com dois
PDFs sintéticos, originais integrais e vinte perguntas documentais sem provedor externo, e informa
o RSS medido. Os números locais não substituem a verificação na instância Linux publicada.

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

Configure `OPENAI_API_KEY` ou `GEMINI_API_KEY` apenas no servidor para habilitar as respostas
geradas e as falas de configuração. OpenAI é preferida quando configurada; durante a migração,
Gemini permanece como alternativa e assume quando OpenAI não tiver chave ou estiver indisponível.
Sem nenhuma chave externa, a conversa gerada fica indisponível. O gateway local permanece apenas como
recurso documental sintético e não substitui uma conversa com IA. Somente a pergunta e os trechos
recuperados para o contexto autorizado são enviados, e a saída documental passa pela validação
local de citações. O modelo inicial é `gpt-6.1-sol` e pode ser alterado após evals.

```env
OPENAI_API_KEY=
OPENAI_ANSWER_MODEL=gpt-6.1-sol
OPENAI_ANSWER_TIMEOUT_MS=45000
OPENAI_IMAGE_ANALYSIS_ENABLED=true
OPENAI_IMAGE_BILLING_CONFIRMED=true
OPENAI_IMAGE_MODEL=gpt-6.1-sol
OPENAI_IMAGE_TIMEOUT_MS=45000

# Alternativa temporária durante a migração
GEMINI_API_KEY=
GEMINI_ENABLED=true
GEMINI_MODEL=gemini-3.5-flash-lite
```

Use uma conta na OpenAI Platform com faturamento da API e limite de uso configurado; assinatura
ChatGPT não inclui créditos de API. Configure a chave no `.env.local` para testes locais ou no
gerenciador de segredos do ambiente de publicação. Não use prefixo `VITE_`.

Fotos sintéticas usam OpenAI quando configurada ou Gemini enquanto a alternativa estiver
preservada. O opt-in de imagens e a confirmação de faturamento são operacionais; sem eles, o envio
de fotos fica indisponível. Os perfis vetoriais dos provedores permanecem separados e não podem ser
comparados silenciosamente como se fossem compatíveis.
O OCR OpenAI não é ativado pela chave do chat. O harness sintético direto exige chave específica
`OPENAI_OCR_API_KEY`, `OPENAI_OCR_ENABLED=true` e `OPENAI_OCR_DATA_POLICY=synthetic-only`, fora
de produção. Servidor persistido e worker de uploads mantêm OCR externo desativado mesmo com
essas flags: elas não comprovam que um upload é fictício. PDF textual continua local; digitalizado
fica em revisão. Dados reais exigem classificação confiável e gates de fornecedor, privacidade e piloto.

Na demonstração com provedor `local`, a interface abre com aviso operacional e sem inventar fala
de boas-vindas. Perfis já confirmados podem ser restaurados; um novo cadastro continua pendente
e sem anexos até existir provedor autorizado. Esse modo não substitui a avaliação da IA real.

Não grave chaves no repositório nem as informe em conversas.

## Integração sintética: Neon ativo e Supabase preparado

Até um projeto Supabase vazio passar migrations e a suíte RLS, Neon continua sendo o destino ativo
de integração sintética conforme ADR 0007:

```powershell
$env:NEON_INTEGRATION_DATABASE_URL = "postgresql://<role>:<password>@<host>.neon.tech/<database>?sslmode=require"
$env:NEON_INTEGRATION_CONFIRMATION = "synthetic-only"
pnpm run db:migrate:neon
pnpm run test:integration
```

O banco Neon também exige TLS, confirmação e o marcador em
`infrastructure/neon/001-integration-guard.sql`; os testes executam `TRUNCATE` somente nesse banco
dedicado e sintético.

### Preparação do Supabase

O Supabase está preparado conforme ADR 0030, mas ainda não retira Neon. Quando houver um projeto
vazio, dedicado e marcado com `infrastructure/supabase/001-integration-guard.sql`, execute:
somente no terminal atual:

```powershell
$env:SUPABASE_INTEGRATION_DATABASE_URL = "postgresql://<role>:<password>@db.<project-ref>.supabase.co:5432/postgres?sslmode=require"
$env:SUPABASE_INTEGRATION_CONFIRMATION = "synthetic-only"
pnpm run db:migrate:supabase
pnpm run test:integration
```

Os comandos recusam hosts não Supabase, conexão sem TLS, confirmação ausente e banco sem o marcador.
O teste de integração executa `TRUNCATE` das fixtures e nunca deve apontar para uma base com dados a
preservar.

Se os comandos desta sessão estiverem bloqueados por permissão de rede, execute no PowerShell
normal do Windows, na pasta do projeto:

```powershell
pwsh -NoProfile -File scripts/verify-supabase-local.ps1
```

Esse comando carrega `.env.local` e `.env.admin.local`, aplica a migração protegida existente
e executa a suíte de integração somente se a migração terminar com sucesso. Usa os binários
locais, sem depender do download do pnpm, e mantém todas as guardas do ADR 0030. O diagnóstico
`-CheckOnly` confere Node 24 e arquivos necessários, sem conectar ao banco. A execução não amplia
as permissões do ChatGPT; dentro de uma sessão restrita, a conexão continua sujeita à mesma política.
Cada execução da suíte também grava seu resultado completo em um JSON com nome único em
`reports/supabase-integration/`, inclusive quando há falhas. Esse arquivo permite conferir os erros
sem copiar toda a saída do terminal. Uma cópia completa de stdout e stderr também fica no `.log` da mesma rodada, preservando mensagens que o JSON não apresentar. As fixtures incluem a biblioteca legal sintética e são
reiniciadas entre cenários, sem preservar fontes de uma execução anterior.

### Execução manual no GitHub Actions

Quando a rede local não puder estabelecer TLS confiável com o PostgreSQL, o workflow manual
`Supabase synthetic integration` executa o mesmo comando em um runner do GitHub. Antes de acioná-lo,
cadastre no repositório o segredo de Actions `SUPABASE_INTEGRATION_DATABASE_URL` com a URL do
projeto Supabase dedicado e sintético, usando TLS. Não use a URL de desenvolvimento, staging,
produção ou de outro produto. Em **Actions**, escolha o workflow, clique em **Run workflow** e
selecione `synthetic-only`; ele aplica migrations somente após validar URL, confirmação e marcador.
O artefato da rodada contém o JSON e o log de integração, inclusive em caso de falha.

## Base legal federal conferida

A edição de 22/10/2026 contém seis fontes e 25 páginas de consulta: recortes do Código Civil
(incluindo alterações das Leis 14.309/2022, 14.405/2022 e 14.905/2024), da Lei do Inquilinato,
da LGPD, do CPC, da Lei 15.040/2024 e da Lei 14.327/2022. Os textos foram conferidos no Planalto.
O repositório ctresb/leis foi usado para pesquisa, sem importação automática do seu acervo.

As cópias são PDFs derivados identificados como Alvitra, com paginação própria e origem oficial
registrada; não substituem a publicação oficial. Os recortes e as omissões são explícitos.
A demonstração carrega essa edição compartilhada, exige acesso ao condomínio e mantém a memória
privada isolada. Uma lei sozinha não pode validar uma afirmação classificada como fato local.
O botão **Abrir cópia de consulta** nas citações legais permite conferir a página do PDF.

A conferência desta edição é elegível de 22/10/2026 até 21/11/2026, limite exclusivo. Fora desse
intervalo os recortes não fundamentam novas respostas; isso não significa revogação das leis.
Não há atualização automática. A Constituição integral e as regras locais exigem curadoria própria.

```powershell
pnpm run legal:build
pnpm run evals:legal
```

`legal:build` reproduz os PDFs e verifica texto, páginas e hashes antes de gravar a edição.
Para o runtime PostgreSQL, após aplicar as migrações em um ambiente autorizado (incluindo 033),
execute administrativamente, com `DATABASE_URL` do destino autorizado:

```powershell
pnpm run legal:import:verified
```

O runtime não importa leis ao receber perguntas. A importação preserva versões e recusa regressão
silenciosa da conferência. Dados e perguntas de teste continuam sintéticos; os textos públicos
oficiais ficam identificados como corpus de produto. Detalhes na Spec 039 e no ADR 0029.

## Evals e segurança

```powershell
pnpm run evals
pnpm run evals:synthetic
pnpm run evals:legal
pnpm run evals:documentary
pnpm run evals:documentary:semantic
pnpm run pilot:synthetic
pnpm run audit:dependencies
```

Fixtures e evals usam apenas conteúdo sintético. Nenhum documento real de cliente ou dado pessoal
deve entrar no repositório. Conteúdo documental é tratado como dado não confiável e nunca como
instrução para o sistema.

### Conferência documental integrada

As Specs 028–032 acrescentam extração conservadora, comparação financeira e análise de campos
normativos explícitos. Um pedido como “Compare os balancetes 2026-01 e 2026-02” recebe um relatório
calculado no mesmo turno, com os valores e fontes, separado da fala gerada. Ele reutiliza páginas
autorizadas já processadas, sem novo OCR, cache ou armazenamento de derivados. Documentos removidos,
pendentes e leituras incertas não fundamentam cálculos confirmados. O conjunto máximo é de 500 páginas
e dois milhões de caracteres; exceder o limite interrompe a conferência sem publicar um subconjunto.

O relatório é transitório; a restauração do histórico não promete recuperá-lo. A extração não é um
parser universal de tabelas e a análise normativa depende de rótulos explícitos. O comando
`pnpm run evals:documentary` distingue testes executados, integração pendente e revisão semântica
especializada pendente. Sua aprovação não libera dados reais nem demonstra qualidade de um modelo.

Diferenças e percentuais desse relatório são calculados por código, não pelo modelo. Percentuais
são truncados em duas casas; excesso de precisão deixa o percentual indisponível sem perder a
diferença exata em centavos. Antes de publicar, um validador local confere documento, versão,
título, página, offsets e trecho literal nas páginas autorizadas. Falha invalida o relatório inteiro.
Essa conferência prova a localização do trecho, não sua sustentação semântica nem a fidelidade
do OCR. O relatório pode continuar disponível mesmo quando a geração da conversa falha.

Limites de quantidade de pedidos e de tokens não constituem teto financeiro da API. O bloqueio
monetário global e a contabilização completa de chamadas/fallbacks ainda precisam ser implementados
e configurados antes de habilitar consumo pago com promessa de orçamento rígido.

`pnpm run evals:documentary:semantic` prepara 50 fichas em
`reports/documentary-semantic-review.json`, sem gateway. Com `--synthetic`, exporta também
respostas e telemetria locais em `reports/documentary-semantic-synthetic.json`: é somente replay
de contrato, não avaliação de modelo. Nenhum modo escolhe provedor por credenciais do ambiente.
Os formulários de contador, jurista e síndico permanecem em branco; não há aprovação semântica.
Fontes incompletas e ilegíveis continuam no pacote para revisão, mas não viram evidência completa
na geração. Documentos e perguntas são independentes do gabarito.
