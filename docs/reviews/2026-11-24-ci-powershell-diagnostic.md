# Correção do CI — diagnóstico PowerShell portátil

- **Data:** 24/11/2026.
- **Escopo:** teste de AC-7012 / RQ-7003/RQ-7005 da Spec 070, no PR 21.
- **Base:** `69d6753cdb3179b81c31080469e58063d6a3863b`.
- **Revisão:** técnica do autor; não aprova o diff completo acumulado para merge.

## Causa comprovada

O job `quality` da execução `45453227732` falhou com 2.898/2.899 unitários aprovados.
O wrapper recusou a configuração documental ausente, retornou código 1 e o recibo JSON
`pilot_document_config_missing`, com `resourcesCreated=false` e `activationAuthorized=false`.
O teste falhou somente ao buscar a frase contínua `nenhum recurso criado` em stderr.

O PowerShell do runner Linux usou `ConciseView`, sequências ANSI e quebra de linha com
coluna `|` entre `recurso` e `criado`. A mensagem era correta; sua apresentação dependia do
terminal. Os erros posteriores de upload de artefatos foram consequência dos produtores
terem sido pulados após a falha do gate.

## Alteração e regressão

O teste remove controles de terminal com `node:util.stripVTControlCharacters` e exige a
mesma frase, permitindo somente whitespace e a coluna de continuação do PowerShell entre
as duas últimas palavras. Não aceita palavras intermediárias nem ausência da negação.
Três cenários cobrem texto simples, o formato colorido/quebrado observado no CI e CRLF;
um cenário negativo rejeita mensagens com sentido diferente ou sem a recusa.

Continuam obrigatórios: código de saída 1, recibo JSON exato, nenhum evento de exercício de
container e ausência do diretório operacional. O wrapper, as permissões, os limites,
timeouts, as regras do domínio e os gates do workflow não mudaram. Sem dependência nova,
banco, Docker, IA externa ou dados reais. Briefing §§8–10 e 12–14 e ADR 0042 preservados.

## Validação

- `vitest run tests/unit/pilot-local-lifecycle-runner.test.ts --maxWorkers=2`: 16/16 aprovados,
  incluindo os quatro novos cenários, sem Docker ou conexão a banco.
- O commit continua sujeito ao hook original `pnpm run check`, contra a cópia isolada e
  com o orçamento de CPU documentado na consolidação. Nenhuma opção de bypass é usada.
- A nova execução completa do CI do PR 21 valida o diagnóstico no Linux real; o resultado
  remoto precisa ser conferido antes de declarar esta correção concluída.

As alterações concorrentes da Spec 077 permanecem fora desta correção. Não houve mudança
de workflow, timeout ou cobertura. A revisão do delta abrange o teste e a documentação;
revisão independente do diff completo e merge continuam pendentes.
