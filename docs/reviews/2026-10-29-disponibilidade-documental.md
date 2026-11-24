# Revisão do autor — disponibilidade documental

- **Status:** revisão técnica do autor; não autoriza merge nem publicação.
- **Autor e revisor:** Codex, no chat “Esclarecer pedido de ajuda”. Sem revisão independente.
- **Data:** 2026-10-29.
- **Diff revisado:** alterações desta tarefa em `document-availability.ts`, `citation-validator.ts`,
  `document-availability.test.ts`, `synthetic-pdfs.ts`, Spec 046 e rastreabilidade; comparação
  com cópias anteriores privadas em `.local/document-availability-baseline/`.
- **P0/P1 encontrados no diff desta tarefa:** zero.

## Comportamento e revisão

A resposta podia negar acesso a cinco balancetes mesmo quando o caso de uso recuperava os cinco.
Dois testes reproduziram a falha antes da correção: o validador aceitava a recusa e o caso de uso
terminava sem solicitar reparo. A guarda agora detecta contradições explícitas com as fontes
locais recebidas; o caso de uso reutiliza seu único reparo, com o mesmo modelo e evidências.
Se o reparo falhar, conserva a mensagem existente de resposta não validada, sem pedir reenvio.

O controle usa apenas metadados das evidências autorizadas. Não procura outros documentos, não
usa conteúdo documental como instrução, não modifica fontes, modos ou claims para aprová-los e
não altera prompt, provedor, memória, API pública ou persistência. Documentos distintos são
contados por `documentId`, evitando somar páginas/versões. Fontes legais não comprovam acesso a
arquivo local. Lacunas de período, extrato, informação, quantidade e leitura ficam permitidas.
A detecção é limitada a formulações explícitas de ausência, sem pretensão de revisão semântica universal.

A suíte revelou também um erro do fixture: os bytes acentuados eram emitidos sem declarar a
codificação da fonte Helvetica. A declaração `/Encoding /WinAnsiEncoding` corrige o PDF de
teste, conservando a asserção “Silêncio após as 22 horas.”, os timeouts e as regras do produto.

## Validação

- `pnpm run check` foi tentado: Corepack não conseguiu baixar pnpm 11.19.0 por `ENOTFOUND`.
  Foram usados os binários locais equivalentes, sem instalar ou atualizar dependências.
- 31 testes novos de disponibilidade aprovados; reprodução do reparo e da falha segura pelo
  caso de uso com índice real em memória. Módulo novo: 100% em statements, branches, funções e linhas.
- Reexecução isolada de disponibilidade e upload em lote após corrigir o fixture: 33/33 aprovados.
- Evals locais: 20/20 legados e 50/50 documentais determinísticos aprovados, sem provedor externo.
- Formatação, lint, tipagem, build da API, gate estrutural de 57 specs e scanner de segredos
  aprovados nas execuções registradas em `.local/document-availability-*`.
- A primeira suíte ampla teve três timeouts, o PDF mal codificado e quatro falhas em sínteses.
  Os arquivos de síntese foram modificados por outro chat durante a execução; foram preservados.
- A segunda suíte aprovou 1.542/1.543; a falha restante usou o fixture anterior. Cobertura:
  statements 92,24%, branches 88,10%, funções 96,99%, linhas 93,87%.
- A terceira suíte encontrou duas divergências de prompt: o código v26 já estava importado
  quando outro chat atualizou os testes para v27. Isso não é regressão atribuída a esta guarda.
  A validação final é registrada abaixo sem substituir esses resultados anteriores.
- A reexecução seguinte sem cobertura aprovou os 160 arquivos e os 1.543 testes
  descobertos no início daquela rodada (`document-availability-tests-stable.log`).
  Formatação dos quatro arquivos de código desta fatia e `git diff --check` aprovados.
- Depois disso, checks globais observaram arquivos novos em desenvolvimento por outro chat:
  formatação de `document-batch-conversation-route.ts` e dois erros de tipos no teste
  `document-batch-conversation.test.ts` (payload nulo e sobrecarga de `inject`). Essas mudanças
  foram preservadas. O gate global atual permanece pendente; os resultados anteriores não
  certificam arquivos acrescentados ou alterados durante/depois da execução.

## Ambiente e limites

A API pública local em `127.0.0.1:3000/v1/runtime` informou `aiProvider=codex` e
`authMode=development`. O processo da API foi iniciado em 27/10/2026, antes das mudanças desta
correção. Na etapa inicial, nenhum processo da sessão foi reiniciado. O modo de demonstração mantém contexto e
catálogo em memória; reiniciá-lo pode descartar esse estado e exige uma decisão explícita.

O controle do Chrome terminou porque a ferramenta não conseguiu identificar com segurança a
URL atual. Não foi feita verificação visual nem inferência com os arquivos dessa sessão.
Sem migração, merge, publicação ou chamadas novas a modelos. A análise detalhada de produção
e a qualidade semântica global não são certificadas pelos testes determinísticos desta fatia.

## Aplicação local autorizada

Após a pergunta explícita sobre reiniciar a API e perder o estado em memória, o usuário respondeu
“pode”. Em 29/10/2026, formatação, lint e tipagem globais foram reexecutados e aprovados; o gate
de visão de 57 specs e o diff sem erros de whitespace também passaram. Os 21 arquivos do manifesto
final da Spec 057 coincidiram com o código atual, conferindo a execução de 1.569/1.569 testes e
cobertura de statements 92,20%, branches 88,08%, funções 97,05% e linhas 93,87%. Os 53 testes
de disponibilidade e comentário/finalização de lote passaram novamente, com um worker.

Antes de substituir a sessão, a versão atual iniciou em uma porta temporária e respondeu HTTP 200
ao teste de runtime, encerrando-se em seguida. O processo antigo da porta 3000 (33372) teve caminho
e comando conferidos e foi substituído pelo processo 13772, iniciado na pasta do projeto com os
mesmos arquivos de ambiente, em janela oculta. O runtime informou `status=ok`, `aiProvider=codex`
e `authMode=development`; a mesma resposta foi confirmada pelo proxy web na porta 5173.

O reinício foi local e autorizado; a perda do contexto, histórico e catálogo da demonstração em
memória foi informada antes da autorização. O estado anterior não foi copiado nem reconstruído.
Não houve nova chamada a modelos, migração, merge ou publicação.
