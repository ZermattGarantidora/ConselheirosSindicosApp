# Verificação local — navegação por condomínio

- **Status:** implementação local com gates automatizados aprovados; inspeção visual pendente.
- **Escopo:** Spec 044, sem merge ou publicação.
- **Revisão:** revisão do autor; não substitui code review independente exigido para merge.
- **Data:** 2026-10-27.

## Comportamento e revisão

Carteira de condomínios na lateral esquerda, abertura de seus chats e manutenção de novo chat,
renomear/excluir/histórico. A troca só publica o novo contexto depois de autorização e chats
carregados e limpa estados transitórios anteriores. O painel direito solicita só os documentos
do contexto ativo e mantém Perfil. Leituras canceladas ou tardias não publicam catálogo anterior;
filtro de tenant também protege a renderização durante a transição.

Biblioteca em diálogo nativo sobre o chat: categorias, títulos ordenados, pesquisa sem acentos,
filtro de disponibilidade, versão, data em São Paulo, estado e vigência. Original reutiliza o
visualizador privado existente e sua autorização. Porcentagem usa versões prontas do catálogo,
sem confirmação de condomínio pendente e com vigência `confirmed`/`not_applicable`, conforme a
recuperação existente. Método e limites estão visíveis; não há alegação de acurácia ou de
cobertura de todos os assuntos. Não houve nova dependência, serviço ou mudança de pipeline.

Briefing/MVP e notas de substituição das specs antigas preservam a coerência de apresentação.
As asserções de localização no menu foram alteradas por pedido explícito, não para contornar
regressões; autorização, Perfil, tipos e controles continuam exigidos e receberam novos casos.

Há alterações anteriores e simultâneas de outras tarefas, inclusive raio-X de recebimento na
mesma `App.tsx`. Foram preservadas. O diff incremental foi comparado com cópias dos arquivos
no início desta tarefa, além da inspeção das versões finais dos novos módulos e testes.

## Gates e evidências

- Corepack/pnpm: DNS de `registry.npmjs.org` indisponível; executados binários já instalados.
- Formatação global, ESLint global, `tsc --noEmit`, build Vite, gate de visão e scanner de segredos aprovados.
- Testes focados finais: 30 aprovados nos três arquivos associados à Spec 044.
- Suíte completa: 1.033 testes aprovados em 137 arquivos, incluindo 127 E2E; zero falhas.
- Cobertura do escopo canônico existente: statements 90,92%, branches 85,71%, functions 96,34% e lines 92,93%, todos acima de 80%; nenhuma exclusão adicionada.
- Relatórios locais: `tmp/navigation-final-results.json` e `tmp/navigation-coverage-final/coverage-summary.json`.
- Sem mudança de banco/storage/retrieval/prompt/provedor nesta tarefa; integração PostgreSQL e eval semântico externo não se aplicam à mudança visual. Os testes E2E exercitam os contratos reais pelo Fastify `inject`.

A primeira tentativa direta de Vitest falhou antes de coletar testes por `EPERM` na pasta
temporária do sandbox. Usar `TEMP`/`TMP` locais ao processo, em `tmp/test-runtime`, resolveu.
A primeira suíte completa não conseguiu gerar o relatório porque `coverage/.tmp/coverage-29.json`
foi removido durante outra execução; nenhuma asserção foi enfraquecida. A repetição usa
`--coverage.reportsDirectory=tmp/navigation-coverage-final` para não disputar a pasta compartilhada.

## Limitações

Inspeção visual não concluída. A prévia sintética não pôde ser alcançada pelo navegador embutido
(recusa/timeout); a conexão local do sandbox retornou `EACCES`. Ao selecionar a janela existente
do Chrome, Computer Use encerrou o acesso porque não conseguiu determinar a URL atual com
segurança. Nenhuma outra entrada de UI foi emitida depois desse encerramento. A prévia sintética
foi parada. Foco real, layout em 320 px e renderização dos temas aguardam conferência visual;
o diálogo nativo, os controles semânticos e regras responsivas estão implementados.

Sem aprovação de merge, CI remoto ou publicação. A revisão independente continua obrigatória.
