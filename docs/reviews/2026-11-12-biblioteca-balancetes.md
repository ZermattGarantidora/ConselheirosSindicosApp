# Validação local — contagem documental e área de balancetes

- **Data:** 2026-11-12
- **Escopo:** Spec 044, RQ-4404/4405, AC-4405/4408.
- **Status:** implementação e validação focada locais; sem aprovação de integração.
- **Revisão:** autor revisou o diff completo desta fatia contra o snapshot anterior em
  `.local/document-library-20261112/before/`, preservando mudanças existentes de outras frentes.
  Não substitui revisor independente, CI nem revisão do branch inteiro.

## Comportamento entregue

A interface destaca a contagem disponível/enviada; percentual e método aparecem somente nos
detalhes fechados, sem barra global. O usuário escolheu explicitamente essa opção, mantendo
a regra de disponibilidade do briefing em vez de criar pontuação de completude.

Painel e biblioteca oferecem área de balancetes. A mesma função local reconhece cabeçalhos
financeiros e rejeita prosa e sinais de outros tipos. O catálogo PostgreSQL lê no máximo 1.024
caracteres de cada página da versão atual sob o mesmo tenant/RLS; somente a classificação booleana
chega ao navegador. O caminho em memória fornece o mesmo campo pelo resumo da extração. O nome
e o tipo sugerido durante upload não vencem a classificação pelo conteúdo. Nenhuma migração,
novo serviço, chamada externa, alteração de autorização ou reprocessamento de OCR foi introduzido.

A classificação é conservadora: sem cabeçalho suficiente ou com tipos conflitantes, o arquivo
permanece em Todos os documentos. Isso organiza arquivos; não certifica natureza contábil,
qualidade, vigência ou possibilidade de concluir sobre suas contas.

## Evidências executadas

- **108/108 testes em 12 arquivos**, incluindo envio de três PDFs sintéticos pela API, leitura,
  catálogo, filtros e apresentação, acesso negado e troca de condomínio. Relatório:
  `.local/document-library-20261112/tests-final-r2.json`.
- **19/19 testes de identificação**, com cobertura focada de `document-identification.ts` em
  100% de statements, branches, functions e lines. Relatório:
  `.local/document-library-20261112/coverage-classification/coverage-summary.json`.
  Esse recorte não substitui nem altera a cobertura unitária global exigida de 80%.
- `node node_modules/typescript/bin/tsc --noEmit`: aprovado.
- ESLint nos arquivos TypeScript/TSX desta fatia: aprovado.
- Prettier nos arquivos TypeScript/TSX próprios: aprovado. A alteração desta fatia em
  `create-api.ts` é somente a exposição do campo opcional no catálogo; os demais trechos pertencem
  à evolução documental concorrente. Blocos preexistentes de outras frentes do CSS foram
  preservados; a validação global de formatação não é declarada aprovada por esta rodada.
- Build web com Vite, `envDir: false` e saída exclusiva em `.local/document-library-20261112/build-web`:
  aprovado, sem carregar `.env` ou sobrescrever build compartilhado.
- `pwsh -NoProfile -File scripts/validate-spec-vision.ps1`: 73 specs aprovadas estruturalmente;
  alinhamento semântico desta alteração conferido contra briefing §§6–10 e gate competitivo.
- `node scripts/run-tsx.mjs evals/run.ts`: **20/20**, zero falhas P0.
- `node scripts/run-tsx.mjs evals/documentary-quality/run.ts`: **50/50 casos determinísticos**,
  zero chamadas a provedor. Os 50 casos semânticos e revisão especializada continuam pendentes,
  conforme o próprio relatório. Saídas próprias em `evals.json` e `evals-documentary.json` no
  diretório local desta rodada.
- Prévia sintética no navegador: desktop claro e 320 px escuro; detalhes fechados/abertos,
  busca, troca de área, categoria exclusiva, ausência de convenção/extrato em Balancetes e
  preservação do aviso de vigência em conflito. Corrigido contraste do botão ativo no tema escuro.

Os binários locais evitaram instalação automática pelo pnpm. Vitest usou TEMP/TMP próprios no
workspace após uma falha de permissão no cache temporário do sandbox. A primeira execução com
cobertura e outras tarefas paralelas ultrapassou 5 s em três testes de PDF; repetição serial sem
cobertura resolveu os testes existentes. O novo E2E, que processa três PDFs com polling real de
um segundo por envio, ainda durou cerca de 5,1 s e recebeu orçamento explícito de 15 s; nenhuma
asserção foi removida ou reduzida. A repetição final serial passou integralmente. Os relatórios
anteriores permanecem no diretório local para comparação.

## Limites de integração

Gates globais e relatórios compartilhados ficam para a candidata estável coordenada, pois havia
alterações concorrentes da evolução documental no mesmo checkout. Não foram executados banco
real, migrations, integrações remotas, CI, merge ou publicação. O SQL da nova projeção do catálogo
foi verificado por testes do adaptador com mocks; a execução em PostgreSQL sintético autorizado
continua necessária antes de integrar. Esta rodada não aprova o branch inteiro nem dados reais.
