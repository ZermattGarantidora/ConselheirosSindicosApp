# Revisão do autor — falha na síntese documental após confirmação

- **Status:** revisão do autor concluída; não autoriza merge
- **Data:** 2026-11-03
- **Delta:** contrato HTTP e mensagem de erro da Spec 057, aceitação AC-5711 e regressões
  de categoria e privacidade. Hashes de baseline e arquivos finais em
  `.local/confirmation-analysis-fix/source-manifest.json`.
- **Revisor independente:** pendente
- **P0/P1 encontrados no delta:** nenhum

## Escopo revisto

Revisei `document-batch-conversation-route.ts`, `document-condominium-confirmation.tsx`,
seus testes e a atualização da Spec 057/rastreabilidade contra o baseline desta correção.
Preservei alterações preexistentes no workspace, inclusive alterações concorrentes na matriz
de rastreabilidade.

A rota retorna códigos restritos para indisponibilidade do gateway, recusa de validação, limite
de material e falha inesperada. Não devolve mensagem interna ou conteúdo do modelo. O cliente
deixa de recomendar redução do número de arquivos para falhas genéricas. Nenhum prompt, destino,
permissão de leitura, evidência ou validação foi afrouxado; o fluxo continua sem nova tentativa
automática.

Uma única repetição do arquivo do usuário, autorizada para esta finalidade, retornou HTTP 503
com o texto antigo e genérico. A causa interna não estava disponível na resposta. O arquivo
estava com duas páginas processadas, pesquisáveis e completas, com condomínio confirmado. Não
registrei seu conteúdo. Sem outra tentativa autorizada, não atribuo a falha a geração, validação
ou serviço.

## Verificação

- Testes focados: 34/34 em `document-batch-conversation.test.ts` e
  `document-condominium-confirmation.test.ts`.
- Repetição de `pnpm run check`: 1.774 testes em 172 arquivos passaram. Cobertura: statements
  91,45%, branches 87,70%, functions 96,19% e lines 93,14%. Formatação, lint, tipos e validação
de alinhamento passaram. Build web aprovado.
- Na primeira rodada completa, um teste E2E preexistente de leitura excedeu seu prazo; a
repetição isolada passou sem ajuste ou enfraquecimento da asserção.
- Evals e nova transmissão do documento não foram executados além da repetição autorizada.

## Aplicação e limites

A API que originou o HTTP 503 foi iniciada antes deste delta e continua rodando com o catálogo
do anexo em RAM. O backend atualizado ainda precisa de reinício para devolver as novas categorias;
esse reinício invalidaria o registro em memória e exigiria novo upload para continuar o teste.
Vite segue em execução. Nenhum reinício foi feito nesta correção.

Sem commit, merge ou publicação. A revisão independente e o CI do branch completo ainda são
necessários antes da integração.
