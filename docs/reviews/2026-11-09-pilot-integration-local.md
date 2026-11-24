# Integração e validação local do piloto — continuação

**Estado:** P1 corrigido; integrações e gates locais aprovados; uso real não liberado.  
**Candidata:** checkout compartilhado sem commit/merge/deploy; base Git
`3b702db6f91dbbeb2ede1a6063053296298d913c`, mais alterações identificadas por hashes.  
**Dados:** inteiramente sintéticos. Nenhum serviço remoto ou chamada de IA/OCR/embedding ativado.

## Etapas e comportamento comprovado

1. **P1 corrigido.** Executor passa revisão ao ledger; o recibo compara a política sob a mesma
   chave antes de reuso e transições. Legado sem revisão falha fechado. Trocar política não
   cria nova chave para contornar resultado incerto. Sete regressões falharam antes e passaram
   depois; processos separados e restore PostgreSQL recuperam A e recusam B sem nova geração.
2. **Consumo composto.** `createBudgetedHostedDocumentControls` liga autorizador, escopo atual,
   orçamento e resultado durável. A Spec 072 é o total autoritativo; compromisso documental
   espelhado não é somado como outra despesa. Custo contabilizado conserva o máximo, sem
   afirmar fatura medida. Replay precede outra reserva; falha entre stores conserva pendência.
3. **HTTP e worker integrados localmente.** Setup, perguntas, upload e mensagens documentais
   têm admissão injetável por sessão/membership. OCR/fotos/síntese/embedding usam os controles
   específicos. Journal não confirma mensagem não gravada; falhas não provocam reenvio automático.
   Startup persistente continua negado; não existe flag positiva nova para uso real.
4. **Gates da candidata.** Janela 02 congelou fontes nas três frentes. Uma falha de teste antigo
   foi corrigida pelo dono e a numeração duplicada da Spec 071 foi resolvida, sem mudança funcional.
   O check completo foi repetido; resultados abaixo distinguem software, SQL e semântica.

## Evidências da candidata global

| Gate | Resultado observado | Artefato exclusivo |
|---|---|---|
| Check, primeira execução efetiva | Formatação/lint/tipos aprovados; 2.346 testes passaram e um falhou por literal antigo do adaptador | `.local/pilot-security/global-check-window02-r2.log` |
| Correção delimitada | Teste agora conserva proibição por ambiente e verifica comportamento: fábrica sem argumentos, OCR indisponível e zero fetch; só teste + dois Markdown da Spec 071 mudaram | Nota documental, seção correção atômica; snapshot r3 |
| Unidade global repetida | **2.347/2.347 em 187 arquivos**; cobertura exclusivamente unitária, sem exclusão nova | `.local/pilot-security/global-check-window02-r3.log`, `coverage/coverage-summary.json` |
| Cobertura global | **89,02% statements / 85,09% branches / 93,92% functions / 90,84% lines**; quatro pisos de 80% atendidos | Mesmo relatório de cobertura |
| Visão | **72 specs** aprovadas estruturalmente; não é revisão humana da coerência | Log do check r3 |
| Scanner de segredos | Aprovado, nenhum padrão conhecido; check terminou em **exit 0** | Log do check r3 |
| E2E completo | **232/232 em 37 arquivos**, zero falhas | `.local/pilot-security/global-e2e-window02.json` |
| API e web compiladas | Aprovadas; sem nova dependência ou alteração do prompt | `global-build-api-window02.log`, `global-build-web-window02.log` |
| Runtime compilado em demonstração sintética | Dois PDFs, 20 perguntas, zero provedor externo; não certifica hospedagem real | `global-runtime-window02.log` |
| RLS integral em PostgreSQL local | **17/17**, matriz/assertivas preservadas, banco novo guardado | Container `1b3850d16a264c28b963aca648585c51`; filho `c33a39a5cf504720a84c2a3c6f8f7171/rls-result.json` |
| API/worker compilados em processos separados | **Nove grupos aprovados**, dez identidades, 300 páginas, interrupção/retomada, fencing, falha terminal e zero OCR externo | Container `ce4b7ecf1267407a9c7095ea9a231978`; filho `79424aeabc3e4c8daf3f2924ef015980/worker-result.json` |

Os nomes de container acima são sufixos dos recibos em `.local/pilot-operations/container-<id>/`;
os diretórios filhos também estão em `.local/pilot-operations/`. Ambos os containers desses
gates foram encerrados. O container próprio mantido por Segurança para suas provas SQL foi
encerrado após conferir nome/imagem/labels; recibo em `.local/pilot-security/own-container-stopped.json`.

## SQL e testes específicos de segurança

- **Três provas SQL locais reais ampliadas:** migration 039/040, reserva concorrente entre
  conexões API/worker, claim único, cota compartilhada por usuários, permissões/RLS, conflito
  de owner, falta de membership e unknown preservado no restore. Login permite dez/origem em
  corrida e mil globais. Processos Node novos recuperam saída sob A e recusam B; journal e
  backup/restore recuperam literalmente os dois lados e negam outra conta. Relatório
  `.local/pilot-security/postgres-1794250651348-7504/`; fixtures e pools só em bancos novos
  do container próprio. Não houve TRUNCATE de banco remoto/compartilhado.
- **158 testes focados em 12 arquivos**, incluindo sete da política e quinze da composição;
  cobertura dos três módulos focados 95,94/94,11/100/97,32. Artefatos em
  `.local/pilot-security/integration-1794250344438-18288/`. Não somar essa seleção aos testes globais.
- **16 testes independentes de admissão API, HTTP e worker** passaram, com stores de arquivo,
  SQL e transportes simulados: `docs/reviews/pilot-http-worker-security-tests-2026-11-09.json`.
- Infraestrutura reexecutou a correção e acrescentou prova com pools LOGIN/NOINHERIT mínimos,
  stores PostgreSQL, resultado/ACK perdido, contador/receipts e restore em processo distinto.
  Essa evidência está na sua nota e em `2026-11-09-pilot-security-infrastructure-review.md`.

## Evals e limites de qualidade

| Bateria | Resultado | Limite |
|---|---|---|
| Consulta documental básica | **20/20**, zero provedor | Contratos determinísticos; também integra o E2E global |
| Qualidade documental | **50/50 determinísticos**; conjunto tem 100 casos | Outros 50 dependem de modelo e revisão especializada |
| Replay documental sintético | **50/50 mecanicamente válidos** | Zero aprovação semântica/zero provedor |
| Conversas sintéticas | **280 cenários / 1.010 turnos**, zero falha mecânica | 1.010 turnos sem aprovação semântica especializada |

Artefatos em `.local/pilot-security/evals-core-window01.json`, `evals-documentary-window01.json`
e `.local/pilot-security/global-window02-evals/`. Os runners sintéticos de replay foram
executados com cwd exclusivo; seus relatórios anteriores em `reports/` não foram sobrescritos.
Fontes funcionais permaneceram iguais entre essas execuções e a candidata corrigida.

## Dependências locais e rastreabilidade

O primeiro `pnpm run check` tentou reinstalar automaticamente antes dos gates (default do pnpm
11). Foi interrompido. O cache de projeto estava incompleto; a recuperação **offline**, pelo
cache global existente, restaurou os mesmos 240 pacotes do lockfile, **downloaded=0**, sem
scripts de instalação. Log `dependency-global-cache-recovery.log`. Não houve dependência nova
nem alteração de lockfile/fonte. A repetição usa `pnpm_config_verify_deps_before_run=warn` para
impedir nova instalação automática; todos os gates de software permanecem habilitados.

Specs 071 AC-7117/7118/7119, 072 AC-7210, 068 AC-6816 e 070 AC-7008/7009 rastreiam as
entregas. Comandos e guardas estão registrados em package.json/README/AGENTS. Nenhum alias
local carrega `.env`; os aliases remotos antigos não foram executados. O `test:coverage`
agora mede somente unidade; E2E ficam separados para não inflar o piso unitário.

Snapshot antes: `.local/pilot-security/global-window02-before.json` (**834 entradas**).
Após correção: `global-window02-r3-before.json`; diferenças permitidas foram somente
`tests/unit/offline-demo-ui.test.ts` e os dois Markdown da Spec 071. Conferência final e
manifesto desta rodada em `pilot-integration-snapshot-2026-11-09.json`. A conferência final
encontrou **zero mudança nas 834 entradas** após a captura r3. Check terminou exit 0, incluindo
scanner sem padrão conhecido. Janela encerrada; alterações futuras repetem gates afetados.
Não é snapshot de um commit limpo.

## Revisões e o que permanece bloqueado

Revisão parcial independente por IA da correção e dos módulos de Segurança foi feita por
Infraestrutura, que não os escreveu. Segurança leu a integração documental e os runners/
guardas/recuperação, testou suas ligações e reexecutou SQL/worker/RLS. Não se transforma essa
inspeção em aprovação do diff inteiro de centenas de alterações preexistentes. Autorrevisão
do delta desta tarefa foi feita; revisão completa da revisão Git a integrar e CI remoto seguem
obrigatórios antes de merge. Nenhum commit/merge/deploy foi realizado.

`git diff --check` do escopo de código/integração desta rodada passou. O comando no checkout
inteiro retornou exit 2 por quatro hard breaks Markdown (dois espaços no fim de linha) já
presentes em `docs/specs/016-chat-unico-bloco-1/acceptance.md:64–67`, fora desta tarefa e
inalterados entre snapshots. Foram preservados; não declarar o diff inteiro aprovado nem
alterar a formatação da spec alheia apenas para ocultar o aviso. Logs `final-diff-check-window02.log`
e `task-diff-check-window02.log` distinguem os resultados.

Uso real continua condicionado a política/fornecedor/payload/custo/retenção aprovados, responsáveis,
privacidade/direitos/exclusões pós-restore, reconciliação de unknown, baseline OCR/IA efetivos,
revisão especializada e configuração do destino. Mocks não validam acurácia ou segurança da
plataforma. Minutas de termos/política/roteiro permanecem rascunhos; nenhum papel jurídico ou
aprovação humana foi inventado. Auditoria externa de dependências e CI/status checks não foram
presumidos executados. Esta rodada termina a preparação/validação local, sem liberar público.
