# Anexo repetido após a resposta — 03/11/2026

## Causa e correção

O histórico renderizava o upload confirmado antes da resposta da Alvitra, enquanto
`DocumentBatchProgress` mantinha outra bolha para o mesmo arquivo no estado temporário.
A chegada do histórico não reconciliava essas duas representações. Uma regressão sintética
reproduziu a segunda bolha antes da correção.

O cliente agora identifica os uploads confirmados por ID da mensagem, condomínio e versão.
A entrada no histórico conserva o link do original e recebe o progresso, pendência ou falha
da representação temporária correspondente. A bolha temporária deixa de ser renderizada somente
quando existe a entrada confirmada. Sem histórico carregado, ela continua disponível. Nomes
iguais em versões ou condomínios diferentes não são fundidos. A ordem preserva o arquivo antes
da resposta.

Requisito RQ-5802 e aceitação AC-5814. O ajuste atende §§1, 6 e 8 do briefing e reutiliza a
conversa e o journal autorizados, sem mudança no servidor, envio de arquivo ou geração de IA.
Os testes usam somente dados sintéticos; o PDF da imagem não foi reenviado para diagnóstico.

## Verificação

- Regressão de bolha duplicada falhou antes da implementação e passou depois.
- 36 testes focados aprovados, incluindo os componentes de anexo, a atualização do histórico,
  upload pelo HTTP e análise conjunta do lote.
- A suíte de `pnpm run check` aprovou 1.852 testes em 174 arquivos, formatação, lint, tipos e
  alinhamento das 63 specs. Cobertura API: statements 91,39%, branches 87,57%, functions 96,20%,
  lines 93,03%.
- `pnpm run build:web` aprovado. O último estágio do comando `check`, scanner de segredos,
  encontrou um ativo que o build concorrente estava substituindo e encerrou com `ENOENT`.
  Após o build terminar, `node scripts/scan-secrets.mjs` foi repetido isoladamente e aprovado.
  Nenhuma asserção ou exclusão foi alterada para contornar a falha.
- O Vite registrou atualização dos componentes no preview local; a API não precisou reiniciar.

Manifesto dos cinco arquivos de código/testes em
`.local/duplicate-upload-fix/source-manifest.json`, SHA-256
`4ef2c75728970756f68fdf7a778afe35531bc70e38e5565e5469f9214c9159d4`.
Baseline e logs locais ficam no mesmo diretório ignorado pelo Git.

## Limites

Revisão do autor sobre o delta desta correção, preservando as alterações existentes no diretório
compartilhado. Sem commit, merge ou implantação de produção. A verificação sintética de interface
usa os componentes reais e a atualização do histórico; não é uma nova bateria probabilística dos
modelos nem uma nova avaliação do conteúdo documental mostrado pelo usuário.
