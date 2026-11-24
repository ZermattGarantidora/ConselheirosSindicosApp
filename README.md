# Alvitra

Pesquisa web pública experimental para a apresentação local (Spec 065):
ALVITRA_DEMO_WEB_SEARCH_ENABLED=true exige DEMO_MODE=true e CODEX_ANSWER_ENABLED=true,
fora de produção. Desligada por padrão; false seguido de reinício desativa a opção.
No chat, pergunte por exemplo “Quais são as regras para assembleias virtuais em condomínios?”.
A Alvitra decide pesquisar os temas públicos compatíveis, mostra “Pesquisando na internet”
durante a tentativa e depois responde com as fontes, sem exigir um comando para pesquisar.
Temas disponíveis: assembleias virtuais, deveres do síndico, prestação de contas,
convenção/regimento, manutenção preventiva, acessibilidade e LGPD. Esses temas usam fontes oficiais
gov.br/leg.br/jus.br e consultas públicas constantes: pergunta livre, histórico e PDFs
não são enviados ao pesquisador. Links aparecem na fala; isso não comprova fatos locais.
Uma retomada ambígua como “e isso?” não dispara nova busca sem identificar o assunto público.
Também procura empresas de limpeza/higienização de caixas d’água quando o pedido informa
município/UF, por exemplo “Indique empresas de limpeza de caixa d’água em Pinhais PR”.
Nesse caso, consulta páginas empresariais públicas e usa só serviço e município/UF canônicos;
não envia endereço ou cadastro. “Pesquise na internet” pode retomar o último pedido suportado
no mesmo chat. A busca não confirma qualidade, licença, disponibilidade ou contratação.

    pnpm run test:demo-web

Esse comando é determinístico, não chama a internet. Smoke real e limites ficam na
[Spec 065](docs/specs/065-pesquisa-web-demonstracao/spec.md).

Conversas longas com a convenção e três atas fictícias: o plano abaixo não chama modelos.

    pnpm run evals:demo-long

Execução local autorizada: três roteiros de 30 turnos por modelo, Luna high e Sol 6.1 low,
mantendo o mesmo chat durante cada roteiro.

    pnpm run evals:demo-long --execute --run-key=<id-novo> --concurrency=4

Checkpoints ficam em .local/demo-document-evals/. Uma conversa concluída não repete chamadas;
turnos parciais ficam preservados e impedem recomeço silencioso.

As 180 respostas e as falhas funcionais abertas estão no
[resultado das conversas longas](docs/specs/064-demonstracao-quatro-documentos/long-results-2026-11-04.md).

Para avaliar a convenção e as três atas fictícias da demonstração, o comando abaixo
imprime somente o plano da Spec 064:

    pnpm run evals:demo-documents

Execução autorizada da rodada inicial de 120 respostas:

    pnpm run evals:demo-documents --execute --round=baseline --run-key=<id-novo>

Depois das correções, usar round=validation e outro identificador executa as 60 respostas
reservadas. Ambas usam Luna high e Sol 6.1 low, até quatro inferências simultâneas;
relatórios locais ficam em .local/demo-document-evals/.

A Alvitra é uma assistente de IA para síndicos. O aplicativo abre diretamente em uma conversa:
o usuário pede ajuda, envia documentos quando necessário e confere as fontes usadas nas respostas.

A visão canônica está em
[`BRIEFING_PRODUTO_CONSELHEIRO_SINDICO.md`](BRIEFING_PRODUTO_CONSELHEIRO_SINDICO.md). A
reestruturação atual segue o briefing e o MVP, que registram os Blocos 1 a 8 autorizados.

## Estado atual

- a página inicial pede somente o código fornecido pela equipe e “Entrar”, sem cadastro público,
  landing page, onboarding ou telas paralelas;
- uma sessão válida retoma automaticamente o chat; Perfil contém o código para conectar outros
  aparelhos, sem identificação por IP (Spec 068);
- telefone e código pelo WhatsApp são uma direção futura e ainda não fazem parte desta fatia;
- perguntas, histórico, citações, abstenção, conflitos, feedback e escalonamento permanecem no chat;
- PDF, JPEG e PNG podem ser enviados explicitamente pelo compositor;
- após o envio, a Alvitra confirma o recebimento e entrega automaticamente um raio-X inicial
  quando a leitura segura termina, mesmo sem pergunta. Tipo, período, valores explícitos e
  trechos em destaque são extraídos localmente da versão recebida, com fontes e limitações;
  pendências de condomínio, leitura ou vigência continuam bloqueando conclusões (Spec 045);
- balancetes recebem os dez pontos de conferência, comparação com o histórico anterior disponível,
  prioridades, documentos faltantes e próximos passos com evidências do condomínio (Spec 049);
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

Abra `http://127.0.0.1:5173/` e use um código emitido pela equipe com `pnpm run access:issue`.
O servidor resolve a identidade pelo código e lista somente seus contextos autorizados.
Para preservar um acesso sintético anterior, use `--demo-name`, conforme a seção da Spec 068 abaixo.

### Ambiente persistente

Com `DATABASE_URL`, a API mantém PostgreSQL/RLS, originais privados, fila documental, histórico e
busca vetorial. A entrada por código exige a migration 037, `ACCESS_CODE_SECRET` estável e
provisionamento operacional da identidade. A sessão HttpOnly permanece neste navegador;
sem código ou sessão válidos, nenhum dado é carregado. Não existe cadastro público nem
criação de condomínio por formulário. Cadastro e recuperação pelo WhatsApp continuam futuros.

```powershell
pnpm run db:up
pnpm run db:migrate
$env:DATABASE_URL = "postgresql://postgres:local-development-only@127.0.0.1:5432/conselheiro"
pnpm run dev:api
```

Para processar a fila em um processo separado:

```powershell
$env:DATABASE_URL = "postgresql://postgres:local-development-only@127.0.0.1:5432/conselheiro"
$env:DOCUMENT_WORKER_IN_API = "false"
pnpm run worker:continuous
```

Na API, use também `DOCUMENT_WORKER_IN_API=false` e `DEMO_MODE=false`. O comando `worker`
continua como diagnóstico de uma tarefa; `worker:continuous` aguarda novos documentos e renova
as reservas. Depois do build, `worker:start` inicia o JavaScript compilado.

A preparação da publicação está em [`render.pilot.yaml`](render.pilot.yaml), separada da
demonstração existente. O Blueprint não foi importado e só deve ser ativado após a decisão de
contratação e os gates de piloto. Procedimento completo, atualização e recuperação:
[`worker documental separado`](docs/release/worker-documental-separado.md).

`pnpm run test:worker:separate -- --provider=neon` valida API e worker compilados em processos
distintos, retomada após queda, PDF de 300 páginas e dez identidades sintéticas, sem chamadas
de IA. **Apaga fixtures com TRUNCATE no banco sintético dedicado escolhido**, após TLS,
confirmação e marcador; execute isoladamente de outras suítes. O padrão é Neon, ativo conforme
Spec 040; `--provider=supabase` exige o projeto Supabase sintético validado e seu certificado.
Relatório: `reports/worker-separated/latest.json`. O ensaio não certifica hospedagem, OCR real,
autenticação de produção ou qualidade das respostas da IA.

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

`pnpm run evals:full-pages` prepara o plano da Spec 063 sem inferência. Para executar os dois
modelos sobre os 35 PDFs preenchidos, use
`pnpm run evals:full-pages --execute --run-key=<id-novo> --concurrency=4`.
São 80 perguntas por modelo (Luna high e Sol 6.1 low), uma por página, totalizando 160 respostas
reais pelo Codex local autorizado. O runner extrai os PDFs, usa recuperação/validação do produto,
congela código/corpus/perguntas e preserva checkpoints por resposta. Gabaritos não entram no
gateway. Checks automáticos de fatos/citações, revisão técnica e aprovação especializada são
estados distintos. Veja `evals/full-page-documents/README.md` para artefatos e limites.

`pnpm run test:documents:full-pages` executa 35 casos da Spec 013 com PDFs fictícios A4
preenchidos: 20 de uma página, dez de duas e cinco de oito, totalizando 80 páginas. Cada página
tem ao menos 50 linhas e 3.000 caracteres não brancos, com parágrafos, listas e tabelas textuais.
O teste envia o binário por HTTP pelo cliente de upload, grava o original em storage privado
local, compara o arquivo recuperado byte a byte, verifica a completude e compara o texto integral
de cada página reconstruída dos chunks com o corpus de entrada. São 240 consultas sobre o início,
meio e fim das páginas, com verificação de documento, versão, página, offsets, hash e isolamento.
O catálogo e o índice usam os adaptadores de demonstração em memória. A suíte não chama IA e
não certifica OCR, qualidade de modelo, PostgreSQL, navegador ou o ambiente publicado.

`pnpm run test:documents:long` valida upload HTTP de um PDF fictício com 300 páginas A4
preenchidas, reconstrução integral, fontes até a última página, identificação tardia/conflitante,
isolamento e bloqueio de leitura incompleta. `pnpm run evals:pdf-300` compila a API e mede o
runtime Node em processo isolado, sem inferência, OCR ou geração de fixtures dentro da medição.
O relatório fica em `reports/long-pdf/latest.json`; as metas locais são indexação em até 60 s,
consultas aquecidas em até 5 s e pico de RSS abaixo de 512 MiB. Isso não valida capacidade do
ambiente publicado, OCR ou qualidade semântica de modelo. Limites: 500 páginas/25 MB; análise
estruturada: até dois milhões de caracteres. Veja a Spec 067 e o ADR 0040.

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

### Plano ChatGPT/Codex nas conversas locais

Para uso pessoal e dados sintéticos, o adaptador da [Spec 042](docs/specs/042-conversas-locais-plano-codex/spec.md)
usa o Codex CLI autenticado com ChatGPT em todas as mensagens geradas: boas-vindas, configuração,
orientação e respostas com evidências. A chamada envia perguntas, contexto recente e trechos
sintéticos autorizados ao Codex/OpenAI e consome a cota do plano. O operador deve autorizar esse
envio; não usar documentos reais ou esse modo em serviços públicos.

Instale o CLI e execute `codex login` escolhendo ChatGPT. Confira `codex login status`.
No `.env.local`, ignorado pelo Git, configure:

```env
APP_ENV=development
DEMO_MODE=true
CODEX_ANSWER_ENABLED=true
CODEX_ANSWER_MODEL=gpt-6.1-sol
CODEX_ANSWER_ROUTING=hybrid
CODEX_ANSWER_TIMEOUT_MS=120000
```

Se `codex` não estiver no PATH, defina `CODEX_CLI_PATH` com o caminho do executável nativo.
Inicie `pnpm run dev:api` e `pnpm run dev:web` em terminais separados e abra
`http://127.0.0.1:5173/`. Reinicie a API após alterar o ambiente. `/v1/runtime` identifica
`aiProvider: "codex"`; depois da configuração inicial, o chat mostra “Online · seu plano Codex”.
Não é necessário definir `OPENAI_API_KEY` nem copiar `auth.json`.

Para simular a análise de convenções, atas e balancetes de teste sem recusa apenas por serem
fictícios, adicione `ALVITRA_LOCAL_TEST_DOCUMENTS_ENABLED=true` no `.env.local`. A
[Spec 066](docs/specs/066-documentos-teste-locais/spec.md) exige `APP_ENV=development`, demo e
Codex ativos, fora de produção. A Alvitra responde naturalmente, sem repetir avisos de teste
na fala rotineira; se perguntada sobre existência real, autenticidade ou validade jurídica,
explica o limite das fontes. Evidências, citações, permissões, isolamento e abstenção por lacunas
continuam obrigatórios; originais e trechos citados são preservados. A variante tem sufixo
`-local-test-v3` na versão do prompt. Sem fontes, o contrato pede somente fala natural; com
evidências, mantém o JSON documental e suas validações. A opção vem desativada por padrão. Para reverter, use
`false` e reinicie a API. Reiniciar a demonstração em RAM perde cadastro, catálogo e histórico
voláteis; arquivos em disco não os restauram automaticamente.

O processo da API precisa de acesso normal ao executável e aos diretórios temporários do CLI.
Em 03/11/2026, o mesmo ensaio fictício falhou com `codex_process_failed` no ambiente de automação
restrito e concluiu no terminal normal. Uma checagem de portas dentro desse ambiente também
não enxergou o preview ativo; confirme a saúde HTTP no ambiente normal antes de reiniciar.
O subprocesso do modelo mantém sua própria execução somente leitura e ferramentas desabilitadas.
Erros registram apenas códigos, etapa e latência, sem conteúdo documental. Quando `/v1/runtime`
informar `historyPersistence: "volatile"`, reiniciar a API descarta cadastro, catálogo e histórico
em RAM; os originais privados em disco não restauram esses registros automaticamente.

O modo híbrido é o padrão: perguntas simples, boas-vindas e configuração usam Luna high;
risco alto, conflitos e análises complexas usam Sol 6.1 low. A escolha acontece antes da geração,
sem chamar os dois modelos para cada pergunta. O comentário automático do conjunto de arquivos
conserva exclusivamente Sol 6.1 low pelo Codex, com os mesmos limites e sem fallback.
Para fixar novamente um modelo, use `CODEX_ANSWER_ROUTING=single` e `CODEX_ANSWER_MODEL`;
esse modo conserva esforço low. Reinicie a API para aplicar qualquer alteração.

O modo Codex tem prioridade exclusiva sobre as chaves de conversa existentes. Se login, modelo,
cota ou processo falharem, a Alvitra informa indisponibilidade sem chamar OpenAI API ou Gemini.
Cada geração usa uma sessão efêmera separada, sem ferramentas de computador, navegação, MCP,
plugins ou histórico compartilhado. As citações continuam limitadas às evidências recuperadas.
Os tokens e a latência são registrados; o custo legado em BRL não mede a cota restante nem uma
cobrança de API. O harness do Codex influencia a geração; não equivale a testar a API de produção.

Esse opt-in vale para conversas. OCR, embeddings e análise de fotos não passam a usar o plano;
na demonstração sintética esses caminhos externos não são ativados. Evals determinísticos
continuam sem provedor; o runner semântico exige integração explícita e não é ativado por essa flag.
Para voltar à seleção de APIs abaixo, use `CODEX_ANSWER_ENABLED=false` e reinicie a API.

### APIs com faturamento próprio

Configure `OPENAI_API_KEY` ou `GEMINI_API_KEY` apenas no servidor para habilitar as respostas
geradas e as falas de configuração. OpenAI é preferida quando configurada; durante a migração,
Gemini permanece como alternativa e assume quando OpenAI não tiver chave ou estiver indisponível.
Sem chave externa e sem o modo Codex local, a conversa gerada fica indisponível. O gateway local permanece apenas como
recurso documental sintético e não substitui uma conversa com IA. Somente a pergunta e os trechos
recuperados para o contexto autorizado são enviados, e a saída documental passa pela validação
local de citações. A API também usa híbrido por padrão, com Luna high para solicitações simples
e Sol 6.1 low para as complexas. `OPENAI_ANSWER_ROUTING=single` fixa `OPENAI_ANSWER_MODEL`
com esforço low. O comentário integral de lote da Spec 057 continua exclusivo do Codex autorizado;
essa configuração não habilita seu envio pela API.

```env
OPENAI_API_KEY=
OPENAI_ANSWER_MODEL=gpt-6.1-sol
OPENAI_ANSWER_ROUTING=hybrid
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
$env:SUPABASE_INTEGRATION_DATABASE_URL = "postgresql://<role>:<password>@<pooler-host>:5432/postgres?sslmode=verify-full"
$env:SUPABASE_INTEGRATION_CONFIRMATION = "synthetic-only"
$env:SUPABASE_INTEGRATION_CA_CERT = "-----BEGIN CERTIFICATE-----..."
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
cadastre no repositório os segredos de Actions `SUPABASE_INTEGRATION_DATABASE_URL` e
`SUPABASE_INTEGRATION_CA_CERT`. A URL deve usar o Session pooler com `sslmode=verify-full`; o
certificado é o PEM raiz baixado em **Database Settings > SSL Configuration**. Não use a URL de
desenvolvimento, staging, produção ou de outro produto. Em **Actions**, escolha o workflow, clique
em **Run workflow** e selecione `synthetic-only`; ele aplica migrations somente após validar URL,
certificado, confirmação e marcador. O artefato da rodada contém o JSON e o log de integração,
inclusive em caso de falha.

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
pnpm run evals:conversations
pnpm run evals:zermatt
pnpm run pilot:synthetic
pnpm run audit:dependencies
```

Fixtures e evals usam apenas conteúdo sintético. Nenhum documento real de cliente ou dado pessoal
deve entrar no repositório. Conteúdo documental é tratado como dado não confiável e nunca como
instrução para o sistema.

`pnpm run evals:zermatt` prepara doze cenários e dezessete turnos para a recomendação direta da Zermatt,
respeito à recusa e explicação de critérios quando perguntados (ajuste de 04/11/2026).
`--synthetic` verifica contratos locais e `--codex` usa exclusivamente o gateway pessoal já
habilitado na demonstração. A recomendação respeita recusas e não comprova taxas ou condições.
Consulte [os comandos, relatórios e limites da avaliação](evals/zermatt/README.md).

### Conferência documental integrada

Ao receber um balancete, a Spec 049 executa automaticamente os dez pontos de conferência e
compara as rubricas com todos os meses anteriores elegíveis do condomínio. Mostra até três
prioridades, os estados de cada ponto, documentos faltantes, próximos passos e fontes abríveis.
Fechamento, orçamento mensal, saldo bancário e comprovantes usam valores e vínculos explícitos;
competência, conta e bases incompatíveis impedem o cruzamento. Sem suporte suficiente, o ponto
fica pendente em vez de presumir regularidade. Não é auditoria ou aprovação de contas.
O cálculo é local, não exige que o síndico digite os meses e não envia conteúdo adicional ao modelo.
Os demais anexos conservam o resumo inicial restrito à versão recebida.

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

`pnpm run evals:conversations` prepara 280 cenários distintos em 14 temas de sindicatura
e segurança transversal: os 240 originais e 40 conversas de 10 a 30 turnos, totalizando 1.010 turnos,
com 25 arquivos fictícios paginados e formulários de revisão por turno.
O pacote fica em `reports/conversations-review.json`. Com `--synthetic`, executa o endpoint real
local e grava respostas, evidências e verificações de contrato em
`reports/conversations-synthetic.json`. Não chama provedor externo e não aprova qualidade de modelo.
Casos com vários turnos mantêm chat e persistência, sem acrescentar histórico artificialmente ao
prompt. Veja [dataset, rubrica e limites](evals/conversations/README.md).
`--baseline` seleciona os 240 originais e `--long` os 40 longos; podem acompanhar `--synthetic`,
com arquivos separados. A avaliação expõe resultados por segmento e duração, e só o conjunto
completo vigente pode aprovar uma rodada de qualidade após revisão especializada.

`pnpm run evals:comparison` prepara a matriz Sol/Luna × memória desligada/ligada, sem inferência.

`pnpm run evals:dense-documents` prepara o plano de leitura densa: cinco PDFs, 120 páginas,
6.000 registros e 32 perguntas de detalhe, associação, nota final, conflito e cruzamento.
`--prepare --run-key=<id>` exporta PDFs e verifica extração sem IA; `--execute --run-key=<id>`
executa Sol 6.1 low pelo Codex pessoal local, com snapshot e checkpoints. Sem API paga,
gabaritos no prompt, alteração de pesos ou troca do modelo do chat. Resultados separam
extração, recuperação, presença factual e auditoria técnica; veja os
[resultados da Spec 075](docs/specs/075-leitura-documental-densa/results.md).

`pnpm run evals:dense-comparison` mostra, sem inferência, o plano da Spec 076: os 32 casos
originais, 24 inéditos e quatro consultas a uma digitalização real sintética, Sol fixo versus
híbrido. `--prepare --run-key=<id> --python=<python-com-reportlab>` valida 132 páginas nativas
e gera duas páginas digitalizadas sem IA. `--execute` no mesmo id faz OCR visual pelo Codex
local e compara os 60 casos por braço, com dois workers, ordem alternada, snapshot e recibos.
Consumo de OCR fica separado das respostas; não usa API paga e não muda o roteamento do chat.
Veja [método e limites](evals/dense-documents/README.md).
O [resultado de 23/11/2026](docs/specs/076-recuperacao-e-conferencia-integral/results.md)
separa os 59 pares com recibos completos, o envio incerto, as falhas de utilidade e o OCR comum.
Na [repetição de 24/11/2026](docs/specs/076-recuperacao-e-conferencia-integral/results-2026-11-24.md),
os três conflitos foram corrigidos e os 60 casos repetidos por braço: 60/60 factuais/completos
na revisão técnica por IA, 49,54% menos custo equivalente no híbrido e média 2,36% maior.
Revisão humana permanece pendente; OCR anterior reutilizado, sem nova chamada visual.

`pnpm run evals:cost-30` prepara 30 cenários fixos (36 turnos por braço), Sol low versus
híbrido do runtime (Luna high/Sol low). `--execute --run-key=<id>` executa uma rodada
sequencial pelo Codex pessoal local, com snapshot, checkpoints e auditoria técnica de todos
os turnos. Não chama API paga. Custo equivalente USD exclui escrita de cache não observada
pelo CLI e não representa fatura ou franquia. A Responses API registra consumo completo,
inclusive escrita 30m/12h e uso de saídas rejeitadas, em recibos privados da auditoria da
resposta; ausência de usage/tarifa produz estimativa desconhecida. Veja a Spec 074.
`pnpm run evals:hybrid` prepara Luna com memória versus roteamento Luna/Sol com memória, também sem inferência.
`pnpm run evals:corrected` prepara a rodada da Spec 059: Luna **high** e Sol 6.1 **low**, memória ligada, 280 cenários/1.010 turnos por condição (560/2.020 no total). Sem flags executa somente o plano, com zero chamadas. A execução autorizada usa `pnpm run evals:corrected --execute --run-key=<id-novo> --rounds=1 --concurrency=4`, snapshot congelado, checkpoints e a autenticação CLI existente. O histórico durável da Spec 058 e os gates precedem esta bateria. Não inclui Sol 5.6. A auditoria conserva os 79 alvos comparáveis; a baseline Luna low não isola o efeito do código frente a Luna high.

`pnpm run evals:sol` prepara Sol 6.1 versus Sol 5.6 com memória ligada, sem inferência.
Use `--baseline-run=2026-10-28-luna-quality-r3` para conservar a aplicação que gerou os 74,7% do Luna; veja a [Spec 055](docs/specs/055-comparacao-sol-61-56/spec.md).
Na [bateria de 29/10/2026](docs/specs/055-comparacao-sol-61-56/observed-results-2026-10-29.md),
os dois modelos concluíram 280 cenários/1.010 turnos cada: Sol 6.1 teve 68/79 respostas
satisfatórias (86,1%) e Sol 5.6, 57/79 (72,2%), frente à referência Luna 59/79 (74,7%).
Consumo conhecido de 465,543300/914,485120 créditos equivalentes, com duas tentativas
sem usage no Sol 6.1. Auditoria técnica por IA em amostra fixa, sem aprovação de adoção;
créditos equivalentes não são fatura ou consumo exato da franquia.

`pnpm run evals:luna` prepara somente Luna com memória: 280 cenários e 1.010 turnos,
sem Sol nem chamadas por padrão. A execução real exige `--execute` e um `--run-key` novo.
O pacote de [contexto, síntese e abstenção](docs/specs/052-contexto-sintese-abstencao/spec.md)
foi medido na [bateria Luna com memória de 28/10](docs/specs/052-contexto-sintese-abstencao/observed-results-2026-10-28.md):
280 cenários/1.010 turnos, 58/79 satisfatórias na amostra técnica e 21,860563 créditos equivalentes observados.
Finais longos ficaram em 23/40; revisão especializada e correções permanecem pendentes.
A [bateria posterior da Spec 053](docs/specs/053-fechamentos-longos-luna/observed-results-2026-10-28.md)
concluiu novamente 280 cenários/1.010 turnos somente Luna/memória: 59/79 satisfatórias,
13 parciais, 7 falhas e 21,9389360 créditos equivalentes observados.
Recuperações e regressões ficaram preservadas; o pacote ainda não foi aprovado para adoção.
Para repetir somente Luna, use `pnpm run evals:luna --execute --run-key=<id-novo> --rounds=1 --concurrency=2`.

Use `--execute --run-key=<id> --rounds=1 --concurrency=4` para executar os mesmos 280 cenários por braço.
O custo híbrido considera o modelo efetivo de cada tentativa. A [Spec 051](docs/specs/051-roteamento-hibrido-regressoes/spec.md)
define regressões e limites históricos. A [Spec 061](docs/specs/061-custo-operacional-luna-sol/spec.md)
torna híbrido o padrão das fábricas de ambiente locais e da API, com Luna high/Sol 6.1 low;
`single` conserva o modelo configurado com esforço low. Isso não habilita Codex em produção
nem altera os braços e esforços dos relatórios históricos.

`--execute --run-key=<id> --rounds=1 --concurrency=4` executa explicitamente pelo Codex pessoal local
já autorizado, sobre snapshot congelado, sem API paga. Uma rodada completa contém 1.120 conversas
e 4.040 turnos; `--case=<id>` permite smoke separado. Checkpoints e relatórios preservam tentativas,
tokens, cache, latência e custo equivalente por rodada, incluindo saídas recusadas pela validação.
Créditos equivalentes e USD hipotético de API não são valor faturado ou consumo exato da franquia.
Veja a [Spec 050](docs/specs/050-comparacao-modelo-memoria/spec.md); três rodadas e revisão especializada
continuam necessárias antes de selecionar configuração.
O [resultado exploratório de 27/10/2026](docs/specs/050-comparacao-modelo-memoria/observed-results-2026-10-27.md)
traz as quatro condições completas, custos observados, auditoria técnica e correções indicadas.
Fontes incompletas e ilegíveis continuam no pacote para revisão, mas não viram evidência completa
na geração. Documentos e perguntas são independentes do gabarito.

### Custo operacional da conversa

O roteamento não adiciona classificador remoto ou segunda resposta para escolher a melhor.
O reparo por validação permanece limitado. OCR, texto e embeddings já processados continuam
reutilizados; perguntas recuperam somente evidências pertinentes e memória recente dentro dos
limites existentes, mantendo o histórico completo consultável e os cálculos locais.

Na Responses API, Luna/Sol recebem somente as instruções genéricas do prompt aprovado em um
prefixo com cache explícito de 30 minutos; pergunta, contexto, IDs e evidências ficam fora dele.
O texto v27 não foi alterado. Não há cache de respostas, dispensa de autorização ou uso de
resposta antiga como evidência. Modelos customizados conservam o transporte anterior.
O Codex usa o cache do próprio CLI, sem esses parâmetros de API.

Cache depende de repetição e cobra escrita; nenhum percentual de economia é garantido.
Tokens, cache e latência permitem medir consumo. A comparação de qualidade e custo em produção
exige tráfego representativo da API; os resultados Codex não a substituem. A mensalidade ainda
depende de volume, documentos, infraestrutura, suporte e margem. Não há alteração de planos
ou cobrança nesta implementação.

### Recuperação dirigida e comparação de esforço

`pnpm run evals:recovery` prepara 40 pontos dirigidos da [Spec 054](docs/specs/054-recuperacao-conversas-comparacao/spec.md), sem chamadas:
20 parciais/falhos da R3, dez paráfrases e dez controles fixos. `--stage=targeted` usa Luna low;
`--stage=matrix` compara Luna low, Luna high e Sol low (120 pontos, uma rodada exploratória).
Execução exige `--execute --run-key=<id-novo> --reference=<bateria-luna-completa> --concurrency=2`.
O replay usa contexto e evidências sintéticas da bateria indicada, com snapshot, hashes, usage,
saídas recusadas em artefatos privados e custos por configuração. Não é nova conversa completa,
teste de retrieval ou autorização de produção. Nenhum gabarito entra no gateway.

No [resultado de 28/10/2026](docs/specs/054-recuperacao-conversas-comparacao/observed-results-2026-10-28.md),
a R4 somente Luna low/memória concluiu 280 cenários/1.010 turnos: 62/79 respostas satisfatórias
na amostra comparável, 16 parciais e uma falha; custo equivalente 21,2411895 créditos.
Na matriz de 40 pontos por configuração, Luna low teve 31 S, Luna high 26 S e Sol low 30 S,
com custos de 0,951208/1,524760/31,221920 créditos equivalentes. Há omissões e regressões
documentadas; testes automáticos aprovados não equivalem a aprovação de adoção.

### Continuidade e diagnóstico documental

`pnpm run evals:answer-quality` mostra o plano da [Spec 056](docs/specs/056-validacao-e-completude-sinteses/spec.md), sem inferência.
O plano fixa 30 pontos por configuração (Luna high e Sol low, memória ligada), incluindo as novas
regressões da R4 e os bloqueios da matriz; o alvo ambíguo permanece excluído da taxa semântica.
Para executar, acrescente `--execute --run-key=<id-novo> --reference=2026-10-28-luna-quality-r4 --concurrency=2`.
São 60 replays dirigidos de perguntas/fontes pré-selecionadas; não é outra bateria de 280 cenários.
As tentativas, respostas rejeitadas sintéticas, hashes e custos ficam separados dos resultados anteriores.

A memória recente usa somente o mesmo usuário, condomínio e chat autorizados: até oito
interações completas e 12.000 bytes UTF-8. O foco opcional da tarefa contém perguntas literais
e lacunas da consulta, dentro do mesmo orçamento, sem resumo de fatos nem armazenamento adicional.
Respostas documentais antigas não voltam ao modelo; a Alvitra recupera as fontes novamente.
Não há resumos nem memória entre chats. A configuração
`ALVITRA_CHAT_MEMORY_ENABLED=false` desliga o envio desse histórico; RAM permanece volátil.
Falha de leitura retorna 503; turno concorrente no mesmo chat retorna 409 com `retry-after`.

No PostgreSQL, a guarda usa um pool dedicado de sessão do mesmo banco, limitado a dez conexões
e cinco segundos para conectar. Neon usa endpoint direto e Supabase usa modo de sessão (5432).
Não há transação aberta durante inferência. Pool transacional não garante esse lock; o
construtor de persistência sem pool de sessão recusa a guarda. Veja a Spec 043 e o ADR 0032.

A Spec 046 distingue ausência de trecho, baixa qualidade comprovada, vigência pendente e saída
não validada. A geração pode corrigir uma saída documental uma vez com as mesmas fontes e um
código fechado; não repete conteúdo protegido. Conflitos recuperados permanecem visíveis e
minutas não confirmam regras vigentes. Os modos automáticos e CI continuam sem chamadas externas.

O Codex distingue falhas de processo, stdin, parsing e saída recusada por códigos controlados,
sem registrar stderr ou conteúdo. O adaptador não faz retry automático nem fallback para API
paga. A correção documental explícita pertence ao caso de uso da Spec 046; veja também a Spec 047.

Comparação sintética real da Spec 046, no snapshot v24 original de 240 cenários/260 turnos:
229 cenários satisfatórios na revisão técnica por IA, ante 180 na baseline; dez parciais e
uma falha de atendimento permanecem. Não é aprovação especializada, medição das conversas
longas ou validação das alterações posteriores. Veja o
[relatório e os artefatos](docs/specs/046-correcoes-evidencias-e-busca/observed-results-2026-10-27.md).

## Entrada por código fornecido — Spec 068

A equipe fornece o código; não existe cadastro público. O navegador conserva um cookie HttpOnly
persistente, sem identificação por IP. Em Perfil, “Conectar outro aparelho” mostra o código da
própria conta e permite copiá-lo. Sair encerra apenas este navegador; emitir outro código para a
mesma identidade revoga o anterior e todos os aparelhos. Limpar cookies exige nova entrada.
Cadastro e recuperação pelo WhatsApp continuam futuros.

Esclarecimento de 09/11/2026: WhatsApp pertence à abertura para todo o público. O piloto fechado
usa o código fornecido pela equipe e não exige telefone ou esse serviço. No uso normal o aparelho
lembrado restaura a sessão; reinício da API não impõe novo login. O segundo aparelho acessa a
mesma conta e as mensagens originais de ambos os lados. Saída manual, limpeza do navegador e
revogação continuam exceções explícitas. A Spec 058 exige histórico durável antes de liberar o piloto.

Na demonstração (`DEMO_MODE=true`, sem `DATABASE_URL`), emitir para um acesso sintético anterior
preserva seu identificador, seus vínculos e os dados ainda disponíveis no servidor:

```powershell
pnpm run access:issue -- --demo-name "acesso-sintetico-anterior"
```

Para uma identidade escolhida pela equipe:

```powershell
pnpm run access:issue -- --user-id <identidade>
```

A CLI é operacional e imprime a credencial para entrega privada ao titular: não encaminhar sua
saída para logs, CI ou documentação. Não há endpoint público de emissão. Guardar a pasta
`ACCESS_CODE_DIRECTORY` (padrão `.local/access-codes`) e seu segredo em armazenamento privado
persistente com backup. Não apagar ou regenerar o segredo durante deploy. O cofre local possui
lock entre processos e escrita atômica; após queda durante a escrita, investigar o lock antes
que um operador o remova. Os arquivos locais exigem o mesmo volume e não atendem hosts isolados; credenciais persistentes
não tornam durável o histórico da demonstração em RAM.

No modo real, aplicar `037_access_codes_and_device_sessions.sql` pelo procedimento de migrations,
configurar `ACCESS_CODE_SECRET` estável e usar PostgreSQL. A CLI pode usar
`ACCESS_CODE_OPERATOR_DATABASE_URL`, conexão de operador com permissão de provisionar; o runtime
não recebe essa permissão. `--user-id <uuid>` usa conta existente; `--new` adicional cria identidade
nova sem e-mail/senha e sem associações a condomínios. Contas bloqueadas ou com MFA não ganham
bypass por código. Se o segredo não estiver configurado, a nova entrada não é ativada e a UI
informa a configuração pendente; não há fallback para identidade escolhida no navegador.

A migration é aditiva e reaplicável. Para reverter a ativação, retirar `ACCESS_CODE_SECRET` do
runtime e restaurar a versão anterior da interface; conservar tabelas e segredo para retomada,
sem DROP nem exclusão de contas ou histórico. Sessões do mecanismo antigo conservam suas regras.
Validação dedicada:

```powershell
pnpm exec vitest run tests/unit/access-code.test.ts tests/unit/access-session.test.ts tests/e2e/access-code.e2e.test.ts
pnpm run test:integration
```

## Preparação do piloto presencial — 16/11/2026

O uso real continua bloqueado pela política atual e pelos gates; segunda-feira, 16/11/2026,
America/Sao_Paulo, é uma meta. O [índice de segurança e integração](docs/release/pilot-2026-11-16-security.md)
registra entregas locais e dependências. O [pacote para revisão](docs/security/pilot-2026-11-16/README.md)
contém termo de participação, autorização documental, aviso de privacidade, política candidata e
papéis ainda a nomear. Nenhum desses rascunhos aprova tratamento de dados reais. O
[roteiro presencial](docs/quality/pilot-2026-11-16-sessions.md) e o
[registro de liberação por candidata/configuração](docs/quality/pilot-2026-11-16-release-gates.md)
incluem documentos digitalizados/fotos, aparelhos, suporte e acompanhamento.

As tentativas de login passam a ser reservadas no armazenamento de acesso: dez por origem e
mil globais por 15 minutos, antes do parsing, com 429/Retry-After e falha fechada em 503.
Reinício e alternância entre serviços no mesmo cofre não renovam a cota. A chave de origem é
HMAC; não se persiste IP em texto nem se usa IP para autenticar. Isso não limita gasto de IA,
OCR ou uploads. Budgets compartilhados dessas operações e proteção de borda continuam pendentes.

O caminho PostgreSQL requer `040_access_login_attempt_limits.sql` antes da API que a utiliza;
o arquivo está apenas preparado, sem aplicação remota nesta rodada. Falta de migration não
habilita contador em memória. O cofre local atende processos no mesmo volume; réplicas entre
hosts exigem PostgreSQL e ensaio de concorrência sintético autorizado. Validar proxy confiável
antes de exposição: pessoas atrás do mesmo NAT/proxy podem compartilhar a cota de origem.

Teste focado sem serviço/IA externos, sem carregar `.env` e com temporários exclusivos:

```powershell
pnpm run test:pilot:security
```

A configuração dedicada `tests/vitest.pilot-security.config.ts` mantém cache exclusivo por
processo, desliga cobertura e inclui regressões de acesso, abuso, journal e continuidade entre
aparelhos. A sessão foi verificada com relógio do servidor dois anos à frente e cofre/API
recriados; isso não simula a conservação de cookie pelo navegador. As regressões conjuntas de
histórico usam o journal em memória e verificam o contrato de acesso/autoria, sem certificar
restore ou persistência PostgreSQL no ambiente efetivo.

O comando não executa cobertura, integração destrutiva, evals pagos ou migrations. Enquanto as
frentes editam o checkout compartilhado, os gates globais ficam adiados. Não há aprovação de
release, revisão jurídica/especializada ou revisão técnica independente inferida desses testes.

A [frente de operação](docs/release/pilot-2026-11-16-infrastructure.md) prepara configuração e
recuperação integral de `app`, com gates próprios. Comandos registrados após leitura da nota:

```powershell
pnpm run pilot:preparation
pnpm run test:pilot:operations
```

O primeiro apenas inspeciona Blueprint/decisões locais, sem conectar; preencher decisões não
autoriza ativação. O segundo testa mocks e gera cobertura exclusiva em `.local/pilot-operations/`;
essa cobertura não substitui os quatro indicadores globais exigidos para a candidata.

`pnpm run test:pilot:recovery:local` é um ensaio **manual e guardado**: exige PostgreSQL/pgvector
local descartável, CLI pg_dump/pg_restore e confirmação `synthetic-local-only` no procedimento
da nota. Cria dois bancos com marcadores sintéticos para backup/restore e um terceiro destino
novo para reaplicar o plano de manutenção; conserva os três em quarentena, sem dados reais
ou fallback remoto. A continuação executou o caminho guardado por container, incluindo restore
integral, histórico e controles de consumo. Isso não autoriza provisionamento remoto ou uso
de um banco a preservar; RPO/RTO/custódia do destino real continuam pendentes.

A Spec 072 prepara reserva durável de consumo, com teto por condomínio/conta e global, claim
único e recibo após execução. Política PostgreSQL nasce disabled; a composição documental é
injetável e o startup permanece negado. Autorizar dados e reservar consumo são etapas distintas. Uma resposta
perdida não autoriza gerar de novo; estados `started/unknown` exigem conferência e `completed`
exige recuperar o resultado/journal existente. O recibo contém hashes/custos, nunca o texto.

```powershell
pnpm run test:pilot:budget
```

Teste exclusivamente sintético: inclui quatro processos Node independentes disputando o mesmo
claim e cobertura dos três módulos em diretório exclusivo por processo. Não faz IA externa ou
SQL remoto. O adaptador PostgreSQL/migration 040 receberam prova SQL em container local sintético, sem ativação real; o
arquivo sintético só atende processos no mesmo volume. Contrato de ligação e limitações estão
em `docs/release/pilot-2026-11-16-security.md`. O trabalho segue por dependências, sem lotes diários.

Continuação local: `test:pilot:integration:local` testa orçamento + ledger + política/retomada,
`test:pilot:documents` testa os adaptadores documentais e `pilot:observation` avalia agregados
sintéticos sem notificação. `test:coverage` mede exclusivamente testes unitários; E2E têm gate separado.

`test:pilot:data:local` valida plano HMAC, integridade, escopo e elegibilidade negada sem banco
ou provedor externo. A Spec 072 detalha os planos sintéticos fora do snapshot; não escolhe retenção
real nem liga autorização positiva ao startup. `test:pilot:security:postgres` inclui reaplicação,
revogação, consumo e reconciliação com SQL real local; exige `PILOT_SECURITY_CONFIRMATION=synthetic-local-only` e
`PILOT_SECURITY_CONTAINER_REPORT` apontando para o `result.json` de um container próprio criado
pelo wrapper com `-KeepContainer`. Confere imagem, porta loopback, labels, mounts e marcador;
cria bancos novos exclusivos e valida migrations, login, quotas/claim/RLS, processos separados,
política, histórico e backup/restore integral. Não lê `.env` nem usa conexão remota. Sem essas
guardas, falha antes de conectar. Não entra no check nem é executado implicitamente.
Para criar o container, seguir o procedimento manual de Infraestrutura; `test:pilot:recovery:container`
executa o ensaio padrão e encerra o seu container. Não remover ou reutilizar o container de outra frente.

As configurações globais e focadas da Segurança usam `envDir: false` para impedir a leitura
automática de `.env*` pelo Vite/Vitest. Ambiente mínimo do processo e conexão explícita continuam
necessários. A regressão AC-7215 usa apenas um arquivo de ambiente criado no temporário sintético;
não consulta credenciais do workspace.

`test:pilot:worker:local` e `test:pilot:rls:local` usam o mesmo wrapper guardado com suítes
distintas: cada execução cria seu próprio container/banco, compila e grava relatórios em pasta
exclusiva e encerra somente seu container. Reutilizam a matriz de worker/RLS, sem carregar `.env`,
usar Neon/Supabase ou chamar IA. Não entram no check e não são testes de ambiente real.

O par `{authorize,callControl}` de `createBudgetedHostedDocumentControls` deve ser integrado
inteiro para revalidar escopo também no replay. O total da Spec 072 é autoritativo e o ledger
documental espelha compromissos; não somar os dois como despesas diferentes. Valores dos testes
são fictícios e a contabilização conserva o máximo, sem afirmar fatura real. Setup/perguntas
comuns/upload recebem ligação específica da API; autorização positiva do startup e decisões
reais continuam pendentes.

Na candidata local final, as ligações injetáveis de setup/perguntas/upload foram acrescentadas
e testadas; startup persistente mantém autorização negada. A janela coordenada passou check,
2.347 testes unitários e 232 E2E, com os quatro indicadores de cobertura acima de 80%, além de
RLS/worker/PostgreSQL/restore locais e builds/runtime. Relatório e limites em
[validação local integrada](docs/reviews/2026-11-09-pilot-integration-local.md).
CI remoto, review completo do branch, política/fornecedor e baseline semântico real não foram aprovados.
## Agente documental — preparação local (Spec 073)

O [pacote de homologação sintética](docs/specs/073-agente-documental-e-pdf/pacote-homologacao.md)
contém 24 casos (12 documentos, 12 roteiros de áudio), gabaritos separados das entradas,
formulários humanos pendentes e oito ensaios operacionais. A
[proposta operacional](docs/specs/073-agente-documental-e-pdf/proposta-operacional.md) traz
valores/regras para revisão: rascunhos por sete dias, áudio/transcrição por 24 horas, cotas,
custódia, manutenção e restore. Permanece inativa, gasto externo zero e dez decisões pendentes,
incluindo compatibilidade com histórico permanente. Nenhum runtime importa o arquivo.

```powershell
pnpm run evals:authoring:homologation
pnpm run evals:authoring:homologation:audio
```

O primeiro comando é offline e multiplataforma; prepara `.local/authoring-homologation/` e
relatórios JSON/JUnit em `reports/authoring-homologation-*`. Não chama IA e mantém aprovação
semântica/produção em zero. O segundo é opcional no Windows: voz pt-BR já instalada gera dez
WAVs fictícios, sem rede, download, instalação ou reprodução. Sem voz compatível, falha sem
fallback. Manifesto de voz, PCM, hashes e tempos em `audio/latest.json`/`audio/run-<id>/manifest.json`.
Escuta humana, transcrição real e diarização não são avaliadas pela síntese local.

As [instruções específicas](docs/specs/073-agente-documental-e-pdf/instrucoes-homologacao-propostas.md)
mantêm a personalidade e o startup intactos; a autorização local de 18/11 está descrita abaixo. O workflow
de CI foi preparado para rodar só os contratos sintéticos e guardar o pacote, sem disparar
workflow remoto nesta rodada. Proposta e amostras não encerram a homologação real da Spec 073.

Continuação autorizada em 18/11: homologação técnica sintética com Codex já contratado e
whisper.cpp gratuito local, sem cobrança adicional de API (ADR 0046). A proposta de limites
continua inativa por decisão explícita; não há política real aprovada ou injeção no startup.

```powershell
pwsh -NoProfile -File scripts/prepare-authoring-local-asr.ps1 -ConfirmDownload
pnpm run evals:authoring:local -- --confirm-synthetic-local
pnpm run evals:financial-300 -- --python=<python-local-com-reportlab>
pnpm run test:authoring:financial
pnpm run test:authoring:financial:browser
# Retomar recibos existentes, sem repetir dispatch incerto:
pnpm run evals:authoring:local -- --confirm-synthetic-local --resume=run-<32hex>
```

A preparação baixa somente binário/modelo MIT fixados por hash para `.local/`, sem instalação
global. O eval exige Codex autenticado com ChatGPT (`codex login status`) e os WAVs do comando
anterior. Não lê `.env`, não encaminha chaves e não tem fallback pago. Resultados/recibos/PDFs
ficam em `.local/authoring-homologation/real/run-<id>/`; `--case=<id>` permite ensaio focado.
Falha incerta não é reenviada; resultado resolvido só admite nova avaliação explícita quando
as instruções/entrada mudarem. Revisão por modelo e interação humana simulada para testar PDF
não são aprovação humana especializada nem liberação de produção. O ASR recebe WAV PCM mono
16 kHz/16 bits, sem conversão ou truncamento implícitos. Não faz diarização nem identifica pessoas.

Continuação de 17/11: após análise de um único original, `syntheticOriginalImprovements: true`
permite ao harness oferecer organização de espaços/quebras no chat. Palavras, pontuação,
números e ordem de todos os blocos permanecem. Antes/depois e fontes são conferíveis; aceitar
abre rascunho não confirmado, e o PDF exige confirmar a revisão exata. Texto idêntico não gera
oferta, recusa não insiste e envio incerto não é repetido. Não há ativação no startup/ambiente.
Referências integrais mantêm o teto de mil caracteres por bloco/citação: excesso é explícito,
sem truncamento. Revisões mais amplas exigem pedido explícito no fluxo geral.

```powershell
pnpm run test:authoring:originals
pnpm run test:authoring:originals:browser
```

O segundo comando usa `ALVITRA_TEST_PLAYWRIGHT_MODULE` e
`ALVITRA_TEST_CHROMIUM_EXECUTABLE` para reutilizar instalações locais, sem downloads. A demonstração
automatizada compõe API e componentes reais do chat com original/redator/conferente fictícios:
análise → oferta → aceite/recusa → editor → confirmação → PDF → reload e troca de chat.
Servidores temporários em loopback, `envDir: false` e bloqueio de destinos externos; API em memória.
Evidências/PDF/capturas em `.local/authoring-originals/browser/`. Não valida reinício durável do
produto, qualidade real de IA ou layout fiel ao original. O harness encerra navegador/servidores.

Estado consolidado: [matriz com todos os ACs e pendências](docs/specs/073-agente-documental-e-pdf/matriz-aceitacao.md).

O editor do chat inclui **Relatório financeiro**: selecione o caderno completo/confirmado e o
balancete por título e página, prepare explicitamente, revise o texto e confirme a revisão exata
para baixar PDF. A consulta não gera conteúdo. Manutenção explicita automaticamente suporte
parcial de R$ 9.382,80 e R$ 305,95 pendentes no caso sintético homologado. Apoios ambíguos,
duplicados ou excessivos não confirmam suporte; outra competência é excluída da soma.
Pedidos salvos são paginados; recuperação concluída funciona sem modelo e preserva edição humana.
Envio incerto exige reconciliação, sem repetição automática ou fallback.

`test:authoring:financial:browser` usa as mesmas variáveis locais de Playwright/Chromium descritas
acima, bloqueia destinos externos e grava provas em `.local/financial-flow/20261118/browser/`.
A API desse navegador é em memória. `test:authoring:postgres` acrescenta a prova financeira
específica: PDF real de 300 páginas processado em PostgreSQL, novo processo sem modelo e restore
em banco separado, com original/edição/PDF iguais por hash, revogação e alteração da página 300
bloqueadas. O wrapper exige Docker/imagem em cache e confirmação local sintética; encerra seu
container. Não lê `.env` nem usa credenciais remotas. Relatório em
[fluxo financeiro e persistência](docs/reviews/2026-11-18-financial-chat-persistence-local.md).
Startup e proposta operacional continuam inativos. Os modelos dos novos ensaios são programados;
a homologação humana anterior permanece restrita ao artefato aprovado.

Controles operacionais da continuação de 16/11 são exclusivos do harness sintético:
`syntheticAuthoringOperations` compõe TTL fixo, exportação/purga dos derivados e orçamento da
Spec 072 nas seis finalidades (ASR, redação/conferência documental, redação/conferência de ata
e melhoria). Não há custo/preço real: contabiliza máximo fictício conservador. O resultado é
validado e persistido antes de concluir o orçamento. Falha conserva reserva; replay salvo não
reserva outra vez, e envio incerto não é repetido.

O cofre compartilhado e o journal de retenção/purga devem ficar **fora do dump da aplicação**,
em diretórios privados distintos e provisionados explicitamente; o cofre ausente não é recriado.
A fábrica local não é backend público nem fallback de PostgreSQL. Perda/corrupção ou restore
com purga ainda não reaplicada mantém quarentena do contexto afetado. A migration **043** amplia
somente as finalidades privadas da Spec 072 e exige gestão para autoria; não habilita política.
Não foi executada migration remota.

Na composição explícita, `GET .../document-drafts/:id/export` e
`GET .../document-proposals/:id/export` exportam a família privada e revalidam inclusive fontes
de revisões anteriores. `DELETE` nessas origens registra tombstone antes de remover conteúdo;
nenhum original Word/PDF é alterado. Áudio tem seu caminho de exportação/exclusão próprio e
participa da mesma retenção dos derivados. Os caminhos estão sob
`/v1/condominiums/:condominiumId/chats/:chatId` e exigem contexto atual de gestão.

`maintain(context, scope, limit)` reaplica purgas e expurga expirados por lote de até 50 origens,
com família limitada a 100 IDs e inventário de 10 mil eventos. É chamada explícita do harness,
sem cron/daemon. Prazo começa na primeira criação e não renova em edição, confirmação, retry,
API nova ou restore; legado sem recibo exige decisão de migração. O ensaio PostgreSQL restaura
pontos anteriores ao envio e à exclusão e mantém consumo/cercas nos arquivos externos, sem IA.
Política/custódia/agendamento reais e revisão independente permanecem pendentes.

```powershell
pnpm run test:authoring:operations
pnpm run test:authoring:postgres
```

Esses comandos usam somente sintéticos; o segundo exige Docker local/imagem já em cache,
cria bancos novos descartáveis e encerra seu container. Nenhum startup seleciona os controles,
adiciona serviço ou habilita redator, transcritor ou chamada paga.

Em **Documentos em preparação → Propor documento com fontes**, o fluxo geral permite pedir
criação, revisão ou melhoria, selecionar versões autorizadas e declarar um relato opcional.
Cada proposta apresenta antes/depois, justificativas, trechos de apoio, procedência, cobertura
integral e pendências. Aceitar abre um novo rascunho; a confirmação para PDF é separada.
Versões conflitantes do mesmo original exigem seleção explícita. Texto incompleto ou excesso
é recusado sem corte silencioso. Relatos são identificados e não viram prova documental.

O startup mantém a redação geral **desabilitada**. `documentAuthoringModel` só é injetado nos
harnesses sintéticos; nenhuma chave, provedor, assinatura, transporte ou novo prompt foi ativado.
Propostas e decisões usam o journal existente; fonte alterada/revogada impede recuperar ou
entregar seu derivado. Retry do mesmo pedido reutiliza resultados salvos; envio sem resultado
exige reconciliação, sem outra chamada automática.

`evals:document-authoring` exercita saídas e conferências simuladas, incluindo números/fontes
inventados, omissões, perda de negação e relato promovido indevidamente a fato. Não mede a
qualidade de um modelo real. Resultados em `.local/general-authoring/evals/`.
`test:authoring:general:browser` usa o Playwright/Chromium locais já disponíveis (as mesmas
variáveis descritas abaixo), somente loopback e fontes/modelos simulados. Verifica seleção sem
geração, proposta, perda de resposta sem chamada repetida, revisão, PDF e recuperação da edição;
evidências em `.local/general-authoring/browser/`. Não instala programas ou pacotes.

`pnpm run test:authoring:postgres` executa a validação em container PostgreSQL local descartável,
somente com sintéticos, imagem pgvector:pg17 já em cache e sem carregar `.env` ou acessar remoto.
O runner cria bancos novos exclusivos, conserva os alvos em quarentena e encerra seu container.
Não habilita IA, faturamento, dados reais ou produção.

O chat permite selecionar uma resposta para revisão em **“Revisar texto para PDF”** ou abrir
**“Documentos em preparação”**. Informe título/tipo, revise o texto, salve e confirme a versão
exata antes de baixar. Uma edição exige outra confirmação. Não há assinatura, envio ou alteração
do original. O PDF é rascunho; não se torna fonte vetorial. No modo em memória há aviso de
volatilidade; em PostgreSQL, revisões e decisões usam o histórico existente com RLS.

DOCX textual pode ser enviado no mesmo controle de documentos: máximo 10 MiB, 256 entradas,
32 MiB descompactados, 8 MiB por entrada, 500 blocos e 120 mil caracteres. Macros, criptografia,
vínculos externos e XML ativo são rejeitados. Objetos, numeração e partes não suportadas deixam
o arquivo em `needs_review`; blocos de leitura não são páginas Word. A migration **041** amplia
somente os formatos/checks existentes; precisa ser validada e aplicada no destino antes do uso
persistente. Não foi autorizada migration remota.

A continuação local de 16/11 valida a migration 041 em PostgreSQL descartável, com recuperação
dos bytes Word, blocos e revisão confirmada em outra API e após backup/restore. Isso não aplica
essa migration em nenhum destino remoto.

Com agente editorial explicitamente injetado, salvar um rascunho pode apresentar uma oferta
contextual de melhoria na conversa. Texto proposto e alterações ficam conferíveis; aceitar
cria outra revisão ainda não confirmada, e recusar conserva a base sem insistência. Esta fatia
preserva todas as palavras/números e sua ordem, permitindo ajustes de apresentação/pontuação.
Não substitui revisão semântica ou profissional. Não há agente, fala pronta ou transporte
habilitado pelo startup; os ensaios usam somente sugestões simuladas.

Áudio tem contratos/API e recibos de tentativa preparados para relato (`dictation`) e reunião
(`meeting`). WAV PCM é o primeiro formato local: 25 MiB, até 10/60 minutos respectivamente,
respeitando ambos os limites. Falantes não são identificados por nome; tempos e incertezas são
conservados. O startup **não injeta transcritor**: sem ele, recebe-se 503, sem guardar nem enviar
o áudio. Um adaptador só é usado em testes simulados. No menu de anexos, **“Enviar áudio e pedir
ata”** abre a prévia, os modos relato/reunião e o pedido. Selecionar arquivo não envia dados.
O envio explícito pede uma redação resumida por assuntos, com discussões, propostas, deliberações
relatadas e encaminhamentos separados. Um conferente recebe toda a transcrição e o plano para
verificar apoio e omissões; referências literais, números, cobertura e hashes também passam por
regras determinísticas. Falha ou indisponibilidade impede a proposta, sem fallback extrativo.
Trechos incertos e identificação ausente ficam pendentes; a transcrição integral é consultável
separadamente. O editor permite revisar antes da confirmação exata do PDF.
“Recuperar áudios já enviados” retoma transcrição e proposta sem repetir a chamada; falhas
incertas permanecem pendentes de verificação. Captação de microfone no app não faz parte desta
fatia: o síndico grava no aparelho e envia o arquivo.
Áudio continua negado no modo persistente genérico, mesmo com transcritor injetado. A composição
local específica `syntheticDurableAudio` usa a migration **042**, RLS por usuário/condomínio/chat,
original/transcrição privados, expiração configurada e recibos de tentativa. O harness usa
retenção de uma hora, dez entradas/dia por usuário/condomínio e duas tentativas concorrentes;
são parâmetros sintéticos, não política real. Estados incertos conservam a concorrência mesmo
após purga. A gravação do resultado precede o ACK e permite recuperar falha posterior do journal.
Exportação escopada e DELETE removem conteúdo dos originais, transcrições, atas e melhorias;
o tombstone sem conteúdo conserva a identidade consumida. A leitura nega material expirado.
Purga de material expirado é operação explícita no harness, sem agendamento de produção.
O journal privado de decisões fica fora do dump: ausência/corrupção ou decisões ainda não
reaplicadas mantêm o acesso em quarentena; `reconcile` reaplica purgas e conserva unknown para
tentativas posteriores ao snapshot. O storage documental genérico não habilita áudio.
Somente o harness positivo em loopback injeta essa composição e os modelos simulados. Não há
provedor, orçamento monetário/limite global de produção, retenção real ou transporte aprovado.

```powershell
pnpm run test:authoring
pnpm run test:authoring:postgres
pnpm run test:authoring:pdf
pnpm run test:authoring:audio:pdf
pnpm run test:authoring:browser
pnpm run evals:audio-minutes
pnpm run evals:document-authoring
pnpm run test:authoring:general:browser
```

São comandos sintéticos, sem `.env`, transporte externo ou cobrança. `test:authoring:pdf` escreve somente
`.local/authoring/pdf/rascunho-sintetico.pdf`; conferir todas as páginas renderizadas antes de
validar layout. Não substituem check/cobertura global, E2E, PostgreSQL/RLS ou revisão independente.

Atas extensas usam até 160 mil caracteres/175 mil bytes JSON no rascunho e até 100 páginas no
PDF. O texto integral fica no recibo da revisão, com ação curta no histórico; excesso é recusado
sem truncar. Referência de áudio, original e transcrição são revalidados em edição/confirmação/download.
O ensaio de navegador exige `ALVITRA_TEST_PLAYWRIGHT_MODULE` apontando a um módulo Playwright
local já disponível e, se necessário, `ALVITRA_TEST_CHROMIUM_EXECUTABLE`. Não instala navegador
ou pacote. Usa somente loopback, storage em memória e uma fixture WAV de hash fixo; o adaptador
de teste recusa qualquer outro conteúdo. Evidências em `.local/authoring/audio-browser/`.

O startup também **não injeta redator/conferente de atas**. O adaptador Responses exige modelo
e transporte explícitos, usa saída estruturada e não lê chave nem cria conexão. As instruções
específicas estão [propostas para revisão](docs/specs/073-agente-documental-e-pdf/redacao-ata-prompt-proposto.md)
e são exercitadas somente com respostas simuladas; não alteram o prompt de personalidade.
Nova gravação só é enviada pelo cliente se transcrição e redação estiverem disponíveis.
Recibos separados de redação e conferência evitam repetição após concorrência/perda de resposta;
envio sem resultado salvo exige reconciliação. Uma ata extrativa antiga não é promovida a redação
semântica: o pedido novo reutiliza a transcrição e recebe ID novo. Limites adicionais: 2.000
segmentos, 220 mil bytes de entrada, 300 mil bytes de requisição e 60 mil bytes de saída JSON
por etapa, 80 afirmações e 20 assuntos; nenhum limite autoriza cortes silenciosos.
`evals:audio-minutes` valida cenários sintéticos com saídas roteirizadas e conferências rotuladas;
não mede qualidade de um modelo real nem substitui revisão humana. PDFs sintéticos da ata ficam
em `.local/authoring/semantic-pdf/`.
