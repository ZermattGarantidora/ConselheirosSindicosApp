# Pesquisa automática e progresso — revisão técnica local

- **Status:** implementação e testes técnicos concluídos; sem aprovação de integração.
- **Diff revisado:** delta privado em `.local/web-automatic-2026-11-04/changes.patch`, contra as cópias anteriores desta fatia; alterações preexistentes preservadas.
- **Revisor independente:** não realizado; esta é revisão técnica por IA do próprio delta.
- **Autor:** Codex.
- **Data:** 2026-11-04.
- **P0/P1 identificados nesta fatia:** nenhum pendente.

## Comportamento

Perguntas sobre os tópicos públicos já habilitados na demonstração podem iniciar pesquisa sem
o síndico pedir a ferramenta. O chat recebe um sinal operacional do servidor e mostra
“Pesquisando na internet” antes da resposta. Recusa explícita, consulta somente documental,
assunto desconhecido, acesso negado e repetição já salva não simulam pesquisa.

O servidor continua enviando ao pesquisador somente o tópico público constante. Perfil,
histórico, pergunta livre e PDFs não entram no subprocesso. Não houve mudança de prompt,
provedor, domínios, credenciais, opt-in ou limite de chamadas.

O transporte negociado antecipa cabeçalhos e mantém um único corpo final. O envelope é aplicado
depois do journal: ambos os lados são gravados antes da resposta final, e falha de gravação
permanece erro. O aviso não entra no histórico como fala da assistente. Clientes antigos
conservam status HTTP e JSON normais; erros depois dos cabeçalhos viajam no status do envelope.

## Validação

- Suíte completa: **2.125/2.125 testes aprovados**, incluindo unitários e E2E (`full-tests-proxy-r3.json`, com `--coverage --maxWorkers=2`).
- Cobertura: statements **91,92%**, branches **88,47%**, funções **96,36%**, linhas **93,51%**.
- Typecheck, ESLint, build web e gate de alinhamento das 66 specs aprovados.
- Formatação e scanner de segredos aprovados. A cobertura foi extraída do mapa no JSON da execução;
  o diretório compartilhado de cobertura pode ser recriado por outras tarefas.
- Evals determinísticos existentes: 20/20 da consulta documental e 50/50 da qualidade documental; avaliação semântica especializada continua pendente.
- Teste HTTP pelo proxy Vite mantém a geração pendente para demonstrar que o sinal chega antes do corpo; confirma histórico recuperável, idempotência, erro posterior e erro do journal. Um byte de whitespace JSON garante o encaminhamento inicial do proxy, sem antecipar o resultado.
- As execuções `full-tests-proxy-final` e `full-tests-proxy-r2` registraram timeouts, incluindo testes preexistentes. O servidor do teste de proxy dispensou watcher, HMR e descoberta de dependências, pois serve somente `/v1`; a inicialização tem prazo de 30 segundos e o fetch, de 10 segundos. A execução final limita a suíte a dois workers. Os relatórios com falhas foram preservados; nenhuma asserção foi removida.
- O comando `test:demo-web` inclui os testes do leitor de progresso. Asserções e validações não foram enfraquecidas para aprovar o gate.

Comandos equivalentes aos scripts do projeto foram executados diretamente com os binários
instalados de Prettier, ESLint, TypeScript, Vitest e Vite. Os relatórios estão em
`.local/web-automatic-2026-11-04/`. A execução determinística não usa internet real.
O delta privado também contém alterações simultâneas preservadas no README e na matriz da
Spec 066; elas não foram implementadas nem revertidas por esta fatia.
O `git diff --check` global também identifica whitespace preexistente em `.env.example` e
na aceitação da Spec 016; esses arquivos, fora do escopo, foram preservados.

## Limites e decisão

Mantém a demonstração local e os sete tópicos públicos da Spec 065; não habilita pesquisa
arbitrária ou produção. Até esta revisão técnica, não houve nova inferência, reinício da API,
merge ou deploy. O build web foi produzido; a ativação da API ficou para autorização posterior.
Revisão independente e gates do commit a integrar continuam obrigatórios antes de merge.

Após autorização explícita do usuário, a API foi recompilada e reiniciada em 04/11/2026,
com os mesmos arquivos de ambiente. Três pesquisas reais pelo proxy concluíram com fontes,
sinal anterior à resposta e histórico recuperável. Os resultados e limites estão em
[reinício e três testes reais](2026-11-04-pesquisa-automatica-tres-testes.md).
