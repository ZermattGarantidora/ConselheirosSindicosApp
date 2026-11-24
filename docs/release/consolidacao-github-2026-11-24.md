# Consolidação para o GitHub — 24/11/2026

**Finalidade:** preservar e disponibilizar o trabalho acumulado para revisão em PR de rascunho.  
**Branch:** `codex/consolidacao-2026-11-24`.  
**Base:** `ff388497f4ec05e6e9293e3d15f9ecd082c98de5`, `main` após o PR 20.

## Conteúdo reunido

| Frente | Trabalho preservado |
| --- | --- |
| Conversa e contexto | Memória recente, histórico persistido, journal, replay verificável, navegação por condomínio e roteamento de modelos. |
| Acesso | Código fornecido pela equipe, sessões por aparelho, continuidade e limites de tentativas/consumo. |
| Documentos | Upload em lote, biblioteca, leitura integral e PDFs extensos, worker contínuo, recuperação e controles de execução hospedada. |
| Respostas | Evidências e citações, identificadores exatos, conferência integral em centavos, conflitos documentais e pesquisa pública sintética isolada. |
| Autoria | Novos documentos e cópias revisadas em PDF, originais PDF/foto/Word, atas de áudio, confirmação humana e relatórios financeiros. |
| Operação | Preparação do piloto, recibos de consumo, backup/restauração, observação e instrumentos sintéticos de segurança. |
| Qualidade e decisões | Specs até 076, ADRs, rastreabilidade, testes, evals, resultados e workflows. |

O conteúdo funcional é o trabalho já existente; esta consolidação não implementa novas
capacidades. Inclui 915 arquivos alterados/adicionados, além deste registro. O inventário foi
comparado arquivo a arquivo com a cópia isolada usada nos gates: nenhuma divergência.

As alterações antigas de dois worktrees e da cópia `piloto-sintetico` ficam preservadas em
[patches históricos](../archive/worktrees-2026-11-24/README.md). Elas não foram aplicadas sobre
o produto atual. Caches, dependências, credenciais, `.env` privados, temporários e HTML de
cobertura gerado permanecem locais. Os relatórios e fixtures incluídos são os candidatos
publicáveis do projeto; o scanner não encontrou padrões conhecidos de segredos.

## Validação desta consolidação

As dependências foram instaladas com `pnpm 11.19.0`, Node `24.20.0` e lockfile congelado em
uma cópia isolada, sem carregar os arquivos de ambiente privados do workspace. O cache offline
estava incompleto; oito pacotes ausentes foram obtidos do registro, sem alterar o lockfile.
`pnpm_config_verify_deps_before_run=warn` impediu remontagem implícita durante os comandos.

| Gate | Resultado |
| --- | --- |
| Formatação, ESLint e TypeScript | Aprovados na execução de `pnpm run check`. |
| Hook obrigatório de commit | Preservado e executado na cópia isolada; orçamento de três CPUs limita o Vitest a dois workers. |
| Unitários com cobertura | 2.899/2.899 aprovados, `vitest run tests/unit --coverage --maxWorkers=2`. |
| Cobertura statements / branches / functions / lines | 85,45% / 81,88% / 90,84% / 87,32%. |
| E2E | 273/273 aprovados, `vitest run tests/e2e --maxWorkers=2`, com HTTP local permitido. |
| Alinhamento com a visão | 76 specs aprovadas pelo gate estrutural. |
| Scanner de segredos | Aprovado no conjunto isolado publicável, incluindo os patches históricos. |
| Builds web e API | Aprovados. |
| Runtime compilado | Aprovado com dois PDFs, 20 perguntas e zero chamada de provedor. |
| Evals determinísticos | 20/20 sintéticos; 50/50 documentários; 26/26 de atas; 31/31 de autoria. |
| Homologação de autoria | Pacote offline de 24 casos preparado; não mede qualidade de modelo real. |
| Contratos semânticos e conversacionais | Replays sintéticos aprovados; revisão especializada permanece pendente. |
| Instrumentos de homologação | ESLint com `--no-ignore` aprovado. |
| Auditoria de produção | Zero vulnerabilidade alta/crítica; cinco baixas e quatro moderadas reportadas. |

A primeira execução canônica interrompeu nos unitários: dois casos de recuperação excederam
o timeout de cinco segundos sob concorrência padrão. Os 32 testes desse arquivo passaram
isoladamente; a bateria completa passou com dois workers, sem alterar timeout ou assertivas.
O primeiro E2E no sandbox teve 37 falhas de conexão `EACCES` a `127.0.0.1`; a bateria completa
passou ao permitir HTTP local. As tentativas iniciais não são apresentadas como aprovadas.

O hook original repetiu o check sob concorrência padrão e encontrou outro timeout de cinco
segundos, em AC-7345, com 2.898/2.899 aprovados. Para a execução final, a afinidade de CPU
foi limitada somente no processo que executa o commit e seus filhos: o Vitest instalado
calcula o número de workers como CPUs disponíveis menos uma. Isso conserva o hook e o
comando canônico, sem alterar código, timeout, cobertura ou assertivas. Um início de commit
no workspace compartilhado foi interrompido antes de gravar commit; a validação final usa
exclusivamente a cópia isolada.

Logs e relatórios de execução desta publicação ficam em
`.local/github-consolidation-20261124/`, preservados localmente.

## Limites do snapshot e da aprovação

A Spec 077 e sua bateria de estresse começaram a ser editadas em outro chat durante esta
consolidação. Esses arquivos e alterações posteriores dos arquivos compartilhados permanecem
intactos no workspace e fora deste snapshot; ainda não constituem trabalho concluído desta
publicação. O índice Git conserva a versão até a Spec 076 validada na cópia isolada.

Os registros de revisão existentes documentam deltas anteriores. Esta consolidação confere
inventário, testes e conteúdo publicável, sem declarar revisão independente aprovada das
mais de 240 mil linhas acumuladas. O PR fica em rascunho: revisão completa do diff atual e
CI do commit continuam necessários antes de qualquer merge, conforme `AGENTS.md` e
[os gates de qualidade](../quality/quality-gates.md).

Dos 100 casos documentários, 50 foram executados deterministicamente; os outros 50 continuam
dependendo de revisão semântica humana. Os contratos sintéticos não substituem essa revisão.

Não houve merge, deploy, migration remota, chamada externa de IA ou liberação de dados reais.
Evals com modelos reais, SQL guardado, ensaios de restauração e revisão especializada não
foram repetidos para arquivar/publicar este snapshot. Evidências anteriores mantêm suas
datas e limitações; não são resultados novos desta consolidação.
