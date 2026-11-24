# Revisão local — nome preservado e conversa documental

- **Status:** implementação e gates locais aprovados; sem aprovação de merge
- **Diff revisado:** correção incremental das Specs 020, 021, 026 e 037 nesta sessão, sobre árvore já modificada
- **Revisor:** Codex, autorrevisão; revisão independente não executada
- **Data:** 2026-10-27
- **P0 abertos nesta correção:** 0
- **P1 abertos nesta correção:** 0

## Escopo e constatação

O clique isolado na confirmação já não executava escrita no perfil. O teste novo compara todo o
perfil antes/depois do upload divergente, confirmação e retomada da pergunta, sem mudança.
Não foi possível atribuir o relato do usuário à memória recente ou confirmar uma correção anterior.
O aprendizado de perfil aceitava “o condomínio se chama…” sem exigir pedido para mudar o nome;
agora somente um pedido direto com o novo nome autoriza a atualização. Nomes do caso real não
foram usados em fixtures, nem o cadastro atual do usuário foi alterado.

A pergunta de pertencimento passa de cartão fixo a fala da Alvitra gerada pelo gateway existente.
Leitura, confirmação e cancelamento usam o mesmo fluxo. O provedor recebe somente enums
operacionais e marcadores; nomes e título são substituídos localmente em uma única passagem,
depois da geração, e renderizados como texto escapado pelo React. A geração não confirma
documento nem escreve perfil. Acesso, revisão da associação e estado da versão são revalidados.
O limite por usuário/condomínio também se aplica à geração da fala.

A apresentação de respostas deixa de acrescentar selo de conflito, prefixos “Atenção” e “Próximo
passo” e o bloco automático de trechos insuficientes. Ressalvas específicas, próximos passos,
recomendação humana e fontes permanecem visíveis em parágrafos da conversa. O system prompt já
aprovado não foi alterado; suas orientações de linguagem simples e explicação de termos técnicos
continuam válidas.

## Validação

Os 57 testes focados finais passaram. A primeira bateria completa passou em 982 casos e identificou um erro de fixture: o
JSON `null` estava sendo enviado sem `content-type: application/json`, recebendo 415 antes do
validador. A fixture foi corrigida para testar o 400 de corpo inválido, preservando a asserção.
Evals determinísticos passaram em 20/20 e 50/50 casos, sem chamadas externas.

Na rodada completa seguinte, os testes desta correção passaram; a suíte terminou com 981/983
aprovados e duas falhas em `account-menu-ui.test.ts`, cujas asserções ainda esperavam a navegação
antiga, alterada simultaneamente pela Spec 044. O `pnpm run check` também encontrou formatação
pendente nos novos arquivos da biblioteca, externos a esta correção. Não foram enfraquecidas
essas asserções nem revertido o trabalho simultâneo.

Fechamento: a suíte completa passou em **1.032/1.032 testes, 137 arquivos**, incluindo as
alterações simultâneas já incorporadas, com `--maxWorkers=1` e diretório de cobertura exclusivo
`.local/name-conversation-coverage`. As tentativas paralelas tiveram timeouts e uma disputa em
`coverage/.tmp`; a execução final preservou todas as asserções e timeouts. Cobertura final:
statements **90,92%**, branches **85,71%**, functions **96,34%** e lines **92,93%**.

Formatação, lint, tipagem, builds API/web, scanner de segredos, `git diff --check` e gate de
alinhamento das 45 specs passaram. Foram executados todos os componentes do `pnpm run check`;
o componente de cobertura usou os parâmetros acima para evitar disputa entre as tarefas.
Os relatórios de cobertura desta rodada permanecem no diretório exclusivo, sem sobrescrever
os de outra execução. Evals adicionais mantêm 20/20 e 50/50 determinísticos aprovados.

## Limites

- Nenhuma migração, persistência SQL ou adaptador de banco foi alterado; integrações reais de
  PostgreSQL não foram repetidas nesta fatia. Autorização e isolamento foram exercitados por E2E.
- A renderização React foi verificada automaticamente. A prévia visual pelo navegador ficou
  indisponível: localhost expirou e a política do navegador bloqueou o protocolo de arquivo local.
  Não foi contornada; inspeção visual interativa não é declarada aprovada.
- Prosa de modelo real e revisão semântica humana não foram executadas nesta sessão.
- A árvore contém outras mudanças prévias e alterações simultâneas de navegação/biblioteca;
  foram preservadas. Esta revisão não aprova o conjunto para merge ou publicação.
- A revisão automática rejeitou a primeira proposta que enviaria nomes e título ao gerador.
  A implementação final elimina esse payload: somente enums e marcadores deixam o processo.

## Decisão

Revisão própria da correção sem achados P0/P1. Nenhum commit, merge, deploy ou restauração de
cadastro foi executado. Merge continua sujeito ao review independente da revisão integral final.
