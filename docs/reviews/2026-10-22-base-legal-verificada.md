# Registro de revisão local - base legal conferida

- **Status:** VALIDAÇÃO LOCAL; INTEGRAÇÃO E REVISÃO INDEPENDENTE PENDENTES
- **Commit ou diff revisado:** incremento da Spec 039 na árvore de trabalho sobre `f219fec49b52bb6a5b924f70a7d53a8eceef61e5`, em 22/10/2026; não é aprovação das demais alterações preexistentes.
- **Revisor independente:** pendente
- **Autor e autorrevisor:** Codex
- **Data:** 2026-10-22
- **P0 abertos:** liberação bloqueada pelas falhas de integração; classificação final depende do relatório completo.
- **P1 abertos:** classificação das duas falhas de integração ainda pendente; sem aprovação de merge.

## Escopo revisado

A autorização permite adicionar material necessário com confirmação oficial. O briefing,
a estratégia competitiva, as Specs 001/026 e os ADRs relacionados delimitam a biblioteca
legal compartilhada. A Spec 039 e o ADR 0029 registram o incremento e seus limites.

Foram revisados os arquivos novos de `apps/api/legislation/`, o gerador e o importador da edição,
a migração 033, os testes novos e os incrementos relacionados em recuperação, servidor, rota
de cópia, validador de citações, visualizador, interface, importador constitucional e documentação.
O diff dos arquivos compartilhados contém trabalho anterior preservado; este registro não
constitui revisão independente ou aprovação integral desse trabalho.

Seis fontes federais, nove leis relacionadas e 25 páginas compõem uma edição parcial, conferida
diretamente em textos do Planalto. O acervo do GitHub foi usado para descoberta, sem importar
arquivos individuais cuja correspondência não pôde ser confirmada. Não foi auditado todo o acervo.

As cópias de consulta são derivadas identificadas, com paginação própria, texto literal,
dispositivos, URLs, hashes, versões e offsets verificáveis. O gerador reproduziu os mesmos bytes
da edição versionada após a formatação. Os testes com PDF.js conferem todas as páginas e os
recortes; a comparação que ignora apenas espaços verifica que a paginação não omitiu texto.
O hash da captura textual não é apresentado como hash do HTML ou do PDF oficial.

A recuperação na demonstração compõe fontes públicas com o índice privado autorizado. A rota
revalida a associação e exige leitura. O validador rejeita fato local sustentado somente por lei.
O intervalo de conferência usa instantes UTC explícitos, de 22/10/2026 até 21/11/2026 exclusivo;
não representa vigência legal. Cópias históricas continuam auditáveis. O runtime persistente
permanece somente leitura, e a importação administrativa recusa regressões silenciosas.

## Comandos executados

`pnpm run check` foi tentado, mas o Corepack não conseguiu resolver `registry.npmjs.org` para
obter a versão fixada do pnpm. Os mesmos gates foram executados com os binários já instalados:

- `node node_modules/prettier/bin/prettier.cjs --check "*.{json,mjs,ts}" "{apps,tests,scripts,contracts,evals}/**/*.{ts,tsx,mjs,json}"`
- `node node_modules/eslint/bin/eslint.js .`
- `node node_modules/typescript/bin/tsc --noEmit`
- `node scripts/run-tsx.mjs node_modules/vitest/vitest.mjs run --coverage --maxWorkers 2 --reporter=json --outputFile=C:/Users/Felipe/AppData/Local/Temp/alvitra-legal-tests/final-results.json`
- `pwsh -NoProfile -File scripts/validate-spec-vision.ps1`
- `node scripts/scan-secrets.mjs`
- `node scripts/run-tsx.mjs scripts/build-verified-legal-corpus.ts`
- `node scripts/run-tsx.mjs evals/run.ts`
- `node scripts/run-tsx.mjs evals/documentary-quality/run.ts`
- `node node_modules/typescript/bin/tsc --project tsconfig.api.json`
- `node node_modules/vite/bin/vite.js build --config vite.config.ts`
- `node scripts/verify-production-runtime.mjs`

Os testes usaram dois workers e TEMP/TMP/TMPDIR em uma pasta temporária gravável, sem alteração
de thresholds ou exclusões de cobertura. A validação final aprovou 901 testes, incluindo os
21 casos determinísticos da base legal. Cobertura: statements 90,51%, branches 84,84%,
functions 96,23% e lines 92,61%. Formatação, lint, tipagem, alinhamento das 39 specs e scanner
de segredos passaram. Builds API/web e ensaio do runtime compilado passaram; este último
processou dois PDFs sintéticos e vinte perguntas, sem provedor, com pico amostrado de 126 MiB.

Os evals adicionais aprovaram 20/20 casos da consulta e 50/50 verificações documentais
determinísticas. Os cinquenta casos semânticos continuam pendentes de avaliação humana/modelo.
Os 21 casos legais validam recuperação, ausência de evidência, datas e o contrato HTTP de
citação/cópia; o gateway determinístico não certifica a qualidade de um modelo de IA.
Não houve chamadas pagas, dados de clientes, enfraquecimento de asserções de segurança ou
mudança de dependência/provedor/prompt. Ajustes de frases esperadas consideram somente as
quebras físicas do PDF, mantendo conferência exata de trechos e offsets.

## Gates bloqueados e limitações

Foram tentadas a migração protegida de integração Neon e a suíte PostgreSQL com as variáveis
locais de integração sintética. Ambas falharam por `ENOTFOUND` antes da conexão; os dez testes
de integração não executaram. A migração 033 não foi aplicada e a edição não foi importada em
banco persistente. Os testes com adaptadores simulados passaram, mas não substituem o gate RLS
contra PostgreSQL. Não se declara a persistência pronta para implantação.

### Rechecagem após ajuste de permissões e reinício

Em 22/10/2026, os nomes do Neon, GitHub e npm passaram a resolver. O HTTPS do registro npm
respondeu com 200; o GitHub retornou `ERR_PROXY_TUNNEL`. As conexões TCP diretas ao Neon nas
portas 443 e 5432 foram recusadas com `EACCES`. Após o usuário informar o reinício do aplicativo,
uma nova tentativa PostgreSQL limitada a `SELECT 1` voltou a receber `EACCES`, antes da consulta.

A tentativa de executar somente esse diagnóstico fora da restrição foi rejeitada pela política
granular: `sandbox_approval=false` e `request_permissions=false`. Não houve uma aprovação
adicional nem uma execução fora da restrição. A configuração salva do aplicativo não basta
para declarar que as permissões efetivas desta sessão foram ampliadas. O bloqueio atual é
de acesso à conexão; não foi diagnosticada uma regra específica no firewall do usuário.

A integração Neon para ChatGPT foi localizada como alternativa de acesso autorizado e sua
instalação foi oferecida. O usuário recusou essa alternativa, que não foi utilizada.
As migrações, o corpus persistente e os dez testes RLS seguem pendentes; os resultados locais
anteriores permanecem inalterados.

Foi preparado `scripts/verify-neon-local.ps1` para execução pelo usuário em um PowerShell normal
do Windows. O script usa os mesmos comandos locais de migração e integração, carrega os arquivos
de ambiente existentes, preserva todas as guardas e interrompe antes dos testes se a migração
falhar. O modo `-CheckOnly` confere somente Node 24 e os arquivos necessários; não certifica
rede, marcador, migrações ou RLS. Não altera configuração de segurança e não cria um caminho de
rede adicional nesta sessão. O README registra esse procedimento.

A validação de `-CheckOnly` passou, assim como os dez testes existentes de
`neon-integration-guard.test.ts`. A primeira pré-verificação encontrou duas instalações de
Node no PATH; a seleção passou a usar o primeiro executável retornado, e a repetição confirmou
Node 24 e os pré-requisitos. A execução normal do script também foi tentada nesta sessão:
a migração parou em `client.connect()` com `EACCES` e o script interrompeu antes de iniciar a
suíte de integração. Nenhuma mudança foi aplicada ao banco. Esse resultado verifica a
interrupção em falha, mas não substitui uma execução bem-sucedida contra PostgreSQL.

### Resultado externo e correção da preparação das fixtures

O usuário executou o script no PowerShell normal em 22/10/2026 e informou que a migração
terminou sem erro. A suíte PostgreSQL terminou com oito casos aprovados e duas falhas, em
38,60 segundos. O trecho disponibilizado identifica uma falha na asserção de resultado vazio
da busca antes da confirmação do documento, em AC-3704. Os detalhes da outra falha ainda não
foram obtidos; não se declara que ambas tenham a mesma causa ou estejam corrigidas.

A revisão encontrou omissão das quatro tabelas da biblioteca legal em `resetFixtures`.
O reinício limpava documentos privados, mas podia conservar evidência pública de execuções
anteriores. O ajuste acrescenta fontes, versões, páginas e chunks legais à limpeza do banco
sintético dedicado e preserva a asserção original `toEqual([])`. A nova regressão AC-3906 prova
recuperação da fonte sintética antes do reset e resultado vazio depois, com a mesma identidade
novamente autorizada. Nenhuma regra de produto, RLS, asserção ou timeout foi enfraquecida.

O script de execução externa passou a gravar o relatório JSON completo por rodada, com nome
único, em `reports/neon-integration/`, além da saída normal. Essa pasta é ignorada pelo Git.
Isso permite ler as falhas no workspace depois da execução externa, sem depender de transcrição
do terminal. A suíte PostgreSQL agora contém onze casos e exige nova execução para validar o
ajuste e obter os detalhes da falha restante. O corpus legal do produto não foi importado no
banco dedicado aos testes.

A Constituição integral, a compatibilidade de todos os dispositivos da Lei 4.591, leis locais,
jurisprudência, normas técnicas, versões históricas e a revisão jurídica especializada não
integram esta entrega. O importador constitucional existente não foi certificado como atualizado.
O prazo da conferência exige nova curadoria antes de usar esta edição a partir de 21/11/2026.

## Achados P2/P3 aceitos

Nenhum achado de código adicional aceito. As limitações do corpus são explícitas na Spec 039;
os gates de banco e revisão independente são pendências de liberação, sem dispensa concedida.

## Decisão

Incremento implementado e validado localmente. Revisão independente, migração/integração
PostgreSQL e status checks do commit a integrar continuam obrigatórios antes de merge ou
implantação persistente. Este registro é uma autorrevisão e não autoriza integração.
Não houve commit, push, merge, publicação ou modificação de banco de produção.

## Retomada em 26/10/2026

Não foi encontrado relatório novo em `reports/neon-integration/`. A rechecagem PostgreSQL,
limitada a `SELECT 1` no alvo sintético com TLS, voltou a receber `EACCES` nesta sessão.
A execução real da suíte de onze casos continua dependendo do PowerShell normal do usuário.

A revisão identificou um segundo defeito concreto na fixture do cenário AC-3903/3904/3906:
a atualização para `status = 'revoked'` omitia `revoked_at`. A migração 001 exige que todo
vínculo revogado tenha esse instante, por meio de `CHECK ((status <> 'revoked') OR
revoked_at IS NOT NULL)`. O teste foi ajustado para preencher `revoked_at = now()` antes de
verificar que a cópia deixa de ser acessível. A restrição do banco e a asserção de acesso
negado foram preservadas; não houve alteração em código de produção ou em migrações.

Esse defeito foi confirmado no código e no contrato do schema; a falta do relatório completo
impede afirmar que ele corresponde exatamente à outra falha informada em 22/10. As correções
de limpeza e de revogação ainda exigem confirmação conjunta contra PostgreSQL. A validação
local interrompida na pausa de 22/10 não foi contada como aprovada; os gates locais estão
sendo executados novamente nesta retomada.
### Resultado local e alinhamento ao Supabase em 26/10/2026

A primeira rodada local com dois workers terminou com 898/901 casos aprovados; três casos
apresentaram falhas com duração superior a cinco segundos. A repetição isolada dos seus três
arquivos aprovou 29/29 casos. A execução completa com um worker aprovou 901/901 casos, com
statements 90,51%, branches 84,84%, functions 96,23% e lines 92,61%. Não houve alteração de
asserções, limites de cobertura ou timeouts para esse resultado. Formatação, lint, tipagem,
gate das 40 specs e scanner de segredos passaram com os binários locais instalados.

Durante a retomada foi identificada a migração operacional da Spec 040 e do ADR 0030, que
substitui os comandos ativos do Neon pelos do Supabase. As exclusões dos arquivos antigos e
os novos arquivos da migração foram preservados. A suíte completa incluiu as guardas Supabase;
uma verificação adicional do typecheck e de três arquivos relacionados aprovou mais 35 casos
(guardas, migrations e persistência legal). A correção de `revoked_at` permanece no cenário
PostgreSQL compartilhado e não altera a plataforma escolhida pelo usuário.

O diagnóstico completo foi aplicado ao comando atual `scripts/verify-supabase-local.ps1`:
cada rodada da integração salva o JSON e a saída de stdout/stderr em `.log`, com o mesmo
identificador em `reports/supabase-integration/`. O modo `-CheckOnly` passou. Um ensaio local
confirmou que a captura mantém stderr e preserva o código de saída de falha, sem executar banco.

A configuração efetivamente carregada não contém `SUPABASE_INTEGRATION_DATABASE_URL` nem a
confirmação `SUPABASE_INTEGRATION_CONFIRMATION=synthetic-only`. Portanto, não foi feita nova
conexão, migração, importação do corpus ou execução RLS no Supabase. A próxima rodada externa
deve usar exclusivamente o projeto Supabase sintético, dedicado, com TLS e marcador do ADR
0030. As onze verificações de integração e a revisão independente continuam pendentes;
nenhuma publicação ou integração de branch foi realizada por esta tarefa.