# Histórico durável — validação técnica de 31/10/2026

A implementação da Spec 058 foi concluída e validada com dados sintéticos antes da nova bateria de modelos. A demonstração aberta pelo usuário não foi reiniciada e o banco principal não foi migrado. As migrações 034–036 foram aplicadas somente no Neon dedicado, com TLS, confirmação e marcador sintético verificados.

## Comportamento entregue

- Journal canônico privado por conta/sessão antes do condomínio e por usuário/condomínio/chat depois da associação explícita. Mensagens originais da assistente vêm somente dos resultados validados pelo servidor; o cliente não pode inserir esse histórico.
- Registro antes do sucesso HTTP, retentativa idempotente e conflito para outra entrada com a mesma chave. Cadastro e recibo de criação são atômicos no PostgreSQL; a chave da sessão permite retomada após perder a confirmação. Gravação e associação do cadastro são serializadas para impedir entradas confirmadas sem vínculo recuperável.
- Perguntas/respostas, cadastro, aberturas, anexos e falas/sínteses documentais são consultáveis com paginação estável. A interface recupera valores confirmados, conserva páginas lidas e evita duplicar a síntese local. Falha de leitura preserva o estado já carregado e informa o problema.
- A atualização inclui backfill literal de perguntas/respostas anteriores, sem IA ou texto retroativo. A migração foi ensaiada com uma interação legada real do adaptador PostgreSQL sintético.
- Memória combina registros internos do mesmo chat, mantendo oito interações/12.000 bytes. Replay documental exige ledger de **todas** as fontes fornecidas anteriormente, incluindo as não citadas, com conteúdo, IDs, versões, páginas, hashes e vigência correspondentes às fontes recuperadas agora. Legado sem ledger, fonte removida, mudança e conflito impedem replay. Orientação geral sem fontes omite falas documentais anteriores.
- Consultas do histórico marcam citações cuja fonte/trecho já não está disponível. O adaptador RAM continua identificado como `volatile`; o PostgreSQL é `durable`.

## Provas executadas

| Aceitação | Evidência |
|---|---|
| AC-5801/5802/5803/5807/5809/5812/5813 | Testes do store/API: autoria, privacidade, associação única, falha antes do ACK, repetição, payload divergente, corrida de chaves e versão documental distinta. |
| AC-5804/5805 | Integração Neon: processo Node novo recupera IDs/textos/ordem dos dois lados; backup serializado com versão/checksum é restaurado em schema isolado, com RLS/FKs e teste de escrita posterior. Destino `app` e checksum inválido são recusados. |
| AC-5810 | Backfill da migração 034 preserva a interação legada e sua identidade. |
| AC-5806/5811 | Regressões de ledger, fonte faltante, troca de versão/hash/vigência/qualidade; memória integrada e 1.010 turnos pelo endpoint real. |
| Recuperação na interface | Testes dos helpers de reconstrução, correções em outra etapa, mescla/paginação entre abas e falha explícita; build React/Vite e testes de fluxo/contrato existentes. Não foi realizado ensaio visual manual de navegador nesta rodada. |

Estado final do código da aplicação/runner: `25a093449ca3a8e7ee6e4ad563356cd3351f162899d7fda060ec89adb72ae2fc` (fingerprint do snapshot; 166 arquivos). O detalhamento dos arquivos fica no manifesto do run.

Gates: **1.688 testes/168 arquivos aprovados**; cobertura statements **91,32%**, branches **87,31%**, funções **96,03%**, linhas **93,00%**. Integração: **15/15**. Formatação, lint, TypeScript e build web aprovados. Evals locais: **20/20** da Spec 001 e **50/50 determinísticos** documentais; os outros 50 documentais semânticos permanecem sujeitos à revisão humana/modelo específica. Não são 100 casos semânticos aprovados.

Foram usados os binários locais equivalentes aos scripts pnpm, com TEMP/TMP dentro do workspace para Vitest. Evidências de execução: `.local/corrections-059/unit-coverage-06.log`, `integration-06.log`, `format-check-11.log`, `type-12.log`, `lint-12.log`, `build-web-02.log`, `evals-base-01.log` e `evals-documentary-01.log`. O scanner passou após concluir os testes; uma tentativa concorrente anterior foi interrompida pela remoção de arquivo temporário, sem apontar segredo.

## Limites operacionais

O ensaio lógico restaura o journal após a fundação de contas, condomínios e chats; não substitui o backup completo de banco/arquivos. O procedimento está em `docs/quality/conversation-history-recovery.md`. RPO/RTO, retenção, chaves, operação real e revisão independente continuam gates de lançamento. Não houve merge nem liberação de produção. A qualidade das respostas dos modelos é medida separadamente pela Spec 059.
