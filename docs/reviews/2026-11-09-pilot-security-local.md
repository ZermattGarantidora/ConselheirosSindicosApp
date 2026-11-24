# Evidência local — segurança do piloto de 16/11/2026

- **Status:** testes focados aprovados; SEM APROVAÇÃO INDEPENDENTE / SEM LIBERAÇÃO.
- **Autor da preparação e autorrevisão:** agente desta frente, 09/11/2026.
- **Base observada:** `3b702db6f91dbbeb2ede1a6063053296298d913c` com centenas de alterações
  preexistentes/concorrentes. Esse hash não representa o trabalho não commitado nem uma candidata.
- **Snapshot desta frente:** `pilot-security-snapshot-2026-11-09.json`, hashes por arquivo;
  qualquer alteração posterior exige revalidar evidência afetada.
- **Revisor técnico independente:** pendente. **Jurídico/privacidade e especialistas:** pendentes.
- **P0/P1 do diff completo:** não certificados; gates de release continuam pendentes/bloqueados.

## Escopo e rastreabilidade

Spec 011 RQ-1101–1106/AC-1101–1110: política vigente preservada, minutas revisáveis, responsáveis
a nomear, roteiro presencial, métricas e registro de liberação por commit/configuração. Preservada
a edição recente da Spec 011 recebida do chat de origem, ampliando aceitação e gates.

Spec 068 RQ-6805/AC-6813–6816, ADR 0044: substitui o Map volátil de login por reserva persistente
antes do parsing. Dez/origem e mil globais/15 min; HMAC temporário, 429/Retry-After e 503 sem
cookie quando falha o armazenamento. Reaproveita segredo/store de acesso; não altera prompt,
permanência da sessão, logout por aparelho, rotação operacional ou autorização por condomínio.

Arquivos de produção revistos integralmente nesta fatia: `access-code.ts`,
`local-access-code-store.ts`, `postgres-access-code-store.ts`, `access-code-routes.ts`,
`security/login-attempt-limit.ts` e migration 040. Foram lidos também os dois testes novos e
testes existentes de código/sessão/CLI/E2E. Documentos e diff dos arquivos compartilhados foram
conferidos para preservar alterações alheias. Isso é autorrevisão, não code review independente
do checkout inteiro, cuja candidata ainda está em edição por outras frentes.

## Comandos e resultados executados

1. Seleção focada registrada em `pnpm run test:pilot:security`:
   `access-code`, `access-code-cli`, `access-session`, `login-attempt-limit` e os dois E2E de acesso.
   **25 testes em seis arquivos passaram**, sem cobertura, migrations ou IA externa.
2. Reexecução direta do Vitest instalado com a mesma seleção, `--coverage.enabled=false
   --reporter=json --outputFile=docs/reviews/pilot-security-tests-2026-11-09.json`:
   **25 aprovados, zero falhas**; relatório exclusivo desta frente. Não carrega `.env` por comando.
3. `node node_modules/eslint/bin/eslint.js` nos cinco arquivos TypeScript de produção e dois
   novos testes: **aprovado**, exit 0.
4. `node node_modules/typescript/bin/tsc --noEmit --target ES2024 --module NodeNext
   --moduleResolution NodeNext --strict --noUncheckedIndexedAccess --exactOptionalPropertyTypes
   --skipLibCheck` nos mesmos sete arquivos: **aprovado**, exit 0. Isso é typecheck focado, não
   a compilação global da candidata.
5. Prettier instalado: escrita somente nos sete arquivos da fatia e check nesses arquivos mais
   package.json: **aprovado**, exit 0; nenhuma formatação global.
6. `git diff --check` limitado aos arquivos rastreados desta fatia: espaços finais adicionados
   na aceitação foram corrigidos; execução final aprovada. Avisos CRLF/LF dos arquivos existentes
   não foram tratados com conversão global.

A primeira invocação usou `pnpm exec vitest`; o gerenciador tentou consultar metadados de sua
versão e reportou falha de rede. Os testes passaram; não foi executado `pnpm install`. As
execuções seguintes usaram os binários já instalados diretamente, sem atualização de dependência.

## Evidência de segurança e seus limites

- Duas instâncias locais reservam concorrentemente 14 tentativas: dez permitidas, quatro
  bloqueadas. Recriar serviço/API conserva limite. Janela vencida permite nova tentativa e
  descarta contadores; origens tardias sobrevivem à virada global sem corromper o cofre.
- Mil origens distintas atingem o teto global; excesso não cria contador nem verifica o código.
  `x-forwarded-for` forjado não muda origem sem trustProxy. JSON quebrado e corpo excessivo contam.
- Cofre anterior sem contadores permanece legível; corrupção/falha gera 503 sem cookie, eco
  privado ou chamada ao login. HMAC no cofre não contém IP em texto. Limite de login não revoga
  sessões já abertas; logout e rotação/isolamento anteriores continuam passando.
- Adaptador PostgreSQL parametrizado rejeita resultado ausente/inválido e usa relógio do banco.
  SQL foi lido: tabela privada/RLS, função com search_path fixo, PUBLIC revogado, somente execução
  para runtime, linha global travada antes de atualizar as cotas. **Não foi executado em banco**;
  mocks não comprovam atomicidade SQL, privilégios efetivos ou concorrência entre hosts.
- Cofre local compartilhado requer mesmo volume/lock. Arquivo perdido, lock órfão, segredo
  trocado, restore antigo e proxy/NAT requerem operação competente; não apagar lock/cofre nem
  regenerar segredo automaticamente para recuperar disponibilidade.

## Gates adiados por instrução desta rodada

Não executados: check global, cobertura global, script global de alinhamento de specs,
integração destrutiva/remota, build/relatórios compartilhados, audit de rede, evals cobrados,
verify-merge ou CI no commit a integrar. O motivo é checkout concorrente e restrição de
ativação/serviços. Não há aprovação da cobertura >=80% nem dos demais gates da candidata.
Foi feita leitura semântica da compatibilidade de 011/068 com briefing/MVP/diretriz; falta o
gate estrutural canônico e revisão independente após estabilização.

Não foram feitos commit/merge/branch/worktree/reset/stash, provisionamento, contratação, cartão,
deploy, migration remota, leitura de valores de segredos, envio real, contatos ou chamadas de IA.

## Bloqueios que permanecem explícitos

Política e papéis D01–D12; minutas ainda não aprovadas; fornecedor/região/transferências e retenção;
budgets autenticados compartilhados e recibos de custo/execução duráveis; borda/proxy; configuração
do destino; validação SQL/migration 040; histórico/restore integral e reaplicação de exclusões/
revogações; export/purge completos; evals do gateway efetivo e revisão semântica especializada;
gates globais/cobertura/CI e revisão técnica independente do diff completo da candidata. A nota
documental consultada ainda estava em preparação. O snapshot operacional recebeu revisão técnica
por IA delimitada em `2026-11-09-pilot-infrastructure-ai-review.md`, sem aprovar merge ou o gate
humano independente. Esses bloqueios impedem dados reais e liberação em 16/11 até serem resolvidos.

Integração adicional: comandos propostos na nota de infraestrutura registrados nos três arquivos
compartilhados, após leitura do código. O verificador sem conexão foi executado nesta frente:
configuração válida, 14 decisões pendentes e `activationAuthorized=false`. O runner local de
banco não foi executado. Não há recibo de aprovação de política/fornecedor fornecido à frente
documental por preparar estas minutas.
