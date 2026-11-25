# Render contratado e domínios — validação do delta de 25/11/2026

- **Status:** preparação local validada; DNS principal aplicado/verificado; TLS, integração e publicação pendentes.
- **Revisão:** autorrevisão do delta das Specs 025/069/070 neste checkout; não é code review
  independente nem aprovação do branch inteiro. Alterações concorrentes preservadas.
- **Revisor independente:** pendente antes de integrar/publicar a candidata completa.
- **Data:** 2026-11-25.
- **Escopo:** configuração de hospedagem, encerramento da API e origem/aliases públicos.

## Mudança e resultado

O web contratado `alvitra-demo-sintetica` usa `1c-2g` em Oregon. O arquivo principal ainda
declarava `free`; foi adequado localmente, com Node 24, publicação manual e 300 s para
encerramento. O perfil persistente reutiliza o mesmo web e prepara o worker adicional, sem
duplicar o site. O parser/testes verificam esse contrato e mantêm segredos fora dos arquivos.

O entrypoint da API agora trata SIGTERM/SIGINT e aguarda `app.close()` uma vez. A origem pública
opcional é validada antes de banco/listen. Aliases explícitos recebem 308 para origem HTTPS
fixa; caminho/query são mantidos, health não redireciona e Host/Forwarded não criam destino
externo. Configuração ausente mantém o comportamento anterior.

No painel Render, auto-deploy foi desligado e confirmado como `Off`. Após login pelo usuário,
os registros A/CNAME de `alvitra.app` e `www` foram alterados no Wix, com backup anterior,
confirmações de sucesso e consulta pública Google DNS coerente. Render confirmou `Verified`
para ambos, mas o certificado apresentou `Certificate Error`; HTTPS/site continuam pendentes.
A navegação ainda chegou à página de domínio não conectado do Wix. O detalhe e os limites
da investigação estão no runbook. `alvitraapp.com` permanece inalterado.
Não houve publicação, migration, criação de worker ou mudança de plano. A revisão publicada
observada permaneceu `6b78117cd47601ec665b0b2b56b4c820c56955c3`.

## Evidências executadas

Binários locais foram usados diretamente, sem instalação implícita do pnpm e sem carregar
arquivos de ambiente. Configurações Vitest focadas usam `envDir:false` e relatórios próprios.

| Verificação | Resultado |
|---|---|
| `vitest run --config tests/vitest.render.config.ts --coverage --maxWorkers=2` (`test:render`) | 4 arquivos, 118 testes aprovados |
| Cobertura da fatia (statements/branches/functions/lines) | 100 / 99,41 / 100 / 100%; os dois módulos novos têm 100% nos quatro indicadores |
| `vitest run --config infrastructure/pilot/vitest.operations.config.ts --coverage --maxWorkers=2` | 6 arquivos, 144 testes aprovados |
| Cobertura operacional nos quatro indicadores | 96,32 / 96,95 / 90,90 / 97,39% |
| ESLint nos arquivos de código/teste alterados e configuração nova | Aprovado |
| `tsc --noEmit` | Aprovado |
| `tsc --project tsconfig.api.json --outDir .local/render-paid/dist` | API compilada aprovada, sem sobrescrever `dist` compartilhado |
| `vite build --config vite.config.ts --outDir ../../.local/render-paid/web` | Web compilado aprovado; 50 módulos, sem esvaziar diretório compartilhado |
| Prettier nos arquivos TS/JSON da tarefa | Aprovado |
| `pwsh -NoProfile -File scripts/validate-spec-vision.ps1` | 77 specs aprovadas estruturalmente; revisão semântica permanece humana |
| Verificador `verify-pilot-preparation.ts` | Configuração válida, zero rede, decisões pendentes e `activationAuthorized=false` preservados |
| `git diff --check` no conjunto de arquivos alterados pela tarefa | Aprovado após corrigir espaço final no status da spec |

Relatório da fatia em `.local/render-paid/coverage-19900/coverage-summary.json`. A configuração
inclui integralmente `canonical-origin.ts`, `server-shutdown.ts` e `pilot-preparation.ts`, sem
exclusão de código de segurança. Essa cobertura focada não substitui a cobertura unitária global.

O smoke compilado em `.local/render-paid/runtime-smoke.mjs` validou HTML do build, health no
alias, 308 com query e encerramento do entrypoint compilado em processo filho com saída 0.
As rotas foram exercitadas por `Fastify.inject`; o filho recebeu SIGTERM emitido internamente
por comando IPC. Sem banco ou IA externos, somente ambiente sintético explícito. A primeira
tentativa de conexão HTTP a loopback foi bloqueada por `EACCES`; isso não é apresentado como
teste de transporte aprovado nem como sinal nativo do Render validado.

O scanner global foi interrompido durante a enumeração ampla do checkout concorrente. A
verificação focada usa cópia isolada dos arquivos desta tarefa em
`.local/render-paid/secret-scan`, com o scanner existente sem alterações. Não varre credenciais
locais nem substitui o scanner completo exigido para integrar/publicar uma candidata estável.
Resultado focado: nenhum padrão conhecido encontrado.

## Tentativas iniciais e correções

- O primeiro comando da nova suíte usou `--cache.dir`, removido no Vitest instalado, e não
  chegou a executar testes. A configuração própria define `cacheDir` e `envDir:false`.
- ESLint recusou a expressão regular com controles. A validação passou a comparar os códigos
  dos caracteres, sem desabilitar regra ou excluir cobertura.
- O teste inicial presumiu que a injeção HTTP conservaria uma barra invertida no request-target.
  O transporte normaliza essa entrada para `/path`. O caso passou a exigir a URL exata segura
  `https://alvitra.app/path`; testes adicionais do alvo bruto exigem recusa de barra invertida,
  `//`, URL absoluta, controles e CRLF. Nenhuma assertiva de origem externa foi removida.
- O `diff --check` geral inicial apontou dois espaços Markdown no novo status da spec; corrigidos.

## Limites para concluir a ativação

O checkout mantém alterações de outras frentes. Por isso não foram executados check/cobertura
globais, E2E completos ou gates que sobrescrevem relatórios compartilhados; não houve commit,
merge ou deploy deste delta. Revisão independente, CI e auditoria de release continuam exigidos.

Supabase e logins/RLS pertencem à frente em andamento. O startup ainda injeta admissão operacional
negativa e adaptadores documentais sem autorização positiva; a assinatura do Render não remove
essas guardas nem comprova conversa, OCR ou embeddings em produção. A ativação requer composição
e prova próprias, restauração no destino, custo do worker e DNS/TLS. O domínio alternativo pode
exceder a franquia de hostnames e deve ter cobrança conferida antes do cadastro.

Procedimento e tabela exata de DNS: [Render pago e domínios](../release/render-paid-2026-11-25.md).
