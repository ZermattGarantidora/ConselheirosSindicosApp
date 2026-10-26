# Verificação local — novo chat na reentrada

- **Status:** verificação local aprovada; integração e revisão independente pendentes. Sem aprovação de merge/publicação.
- **Base:** `f219fec49b52bb6a5b924f70a7d53a8eceef61e5` e diff da árvore de trabalho nesta tarefa.
- **Autor e revisão local:** Codex.
- **Revisor independente:** pendente.
- **Data:** 2026-10-20.

## Escopo revisado

Spec 038, AC-3801–3805, ADR 0028 e ajustes de coerência na Spec 018/MVP. Revisão dos arquivos
novos de chats, sessão do cliente, migração 032, vínculo/filtro na persistência de respostas,
rotas, servidor, fluxo de entrada/seleção/envio da interface, anexos e testes correspondentes.
As demais mudanças preexistentes da árvore foram preservadas; este registro não aprova a
árvore inteira para integração.

## Comportamento e segurança conferidos

- Cada entrada inicia ID novo e vazio; a lista anterior vem do servidor e não é ativada no lugar
  do novo chat. Chats vazios não são gravados antes do envio ou renomeação.
- A pergunta recebe vínculo na transação que já salva a resposta. O último turno é registrado
  imediatamente e sua apresentação não é duplicada na interface.
- Títulos, agrupamentos e anexos são de usuário e condomínio; RLS e FK composta reforçam o
  vínculo. UUID de chat não concede autorização. Não há conteúdo em localStorage.
- Cada seleção de chat salvo consulta novamente o servidor; troca de condomínio bloqueia envios
  enquanto aguarda o novo contexto. Falha não substitui dados por uma lista vazia.
- Histórico e listagem usam `private, no-store`. Cursor composto evita omissão de IDs com mesma
  data; timestamps de criação dos metadados no banco têm precisão de milissegundos.
- Renomeação não é sobrescrita por novo envio. Ocultação não reativa via upsert nem apaga a trilha
  documental. Histórico legado oculto não reaparece ao listar.
- Idempotência inclui o chat quando informado; abas diferentes não reutilizam a mesma resposta.
- Anexos reabrem o original privado ainda disponível; arquivar/remove-lo do catálogo remove a
  referência retornada. Busca documental e geração de respostas não mudam de escopo.

## Gates e evidências

- `pnpm run check`: 830 testes em 122 arquivos aprovados; formatação, lint, tipagem, 38 specs e
  scanner de segredos aprovados.
- Cobertura: statements 90,16%, branches 84,34%, functions 96,12% e lines 92,33%; quatro pisos
  atendidos sem exclusão nova.
- `pnpm run build:api`, `pnpm run build:web` e `pnpm run test:production`: aprovados. Ensaio
  compilado com dois PDFs/vinte perguntas e nenhuma chamada externa.
- `pnpm run evals`: 20/20; `pnpm run evals:documentary`: 50/50 determinísticos, sem provedor.
- E2E reproduz entrada/recarga, último turno sem troca prévia, abas, nomes, ocultação, legado,
  referências de arquivos, acesso por outro membro/tenant e revogação; 105 mensagens e mais de
  100 chats exercitam paginação. Testes de adapters cobrem vínculo e parâmetros de escopo.
- Foi adicionado cenário RLS de dois membros do mesmo condomínio. A tentativa de aplicar
  migrations e executar integração, com configuração Neon sintética carregada, falhou por DNS
  (`ENOTFOUND`) antes de conectar. A migração 032 e o cenário real de RLS permanecem sem validação.
- Sem inspeção interativa em navegador nesta tarefa; testes verificam a orquestração cliente/API
  e os contratos da interface.

## Pendências e limites

Validar a migração 032 e integração no Neon dedicado com marcador/TLS, revisar o diff completo
por revisor independente e executar checks no commit a integrar. Nenhum merge, push ou publicação.
Na demonstração em memória, sair/entrar e recarregar preservam os chats enquanto o servidor
continua ativo; reinícios ainda apagam esse estado conforme ADR 0021. O adaptador PostgreSQL
foi preparado para persistência entre reinícios e depende da validação de integração pendente.
