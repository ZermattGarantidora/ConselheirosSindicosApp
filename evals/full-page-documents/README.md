# Evals com PDFs preenchidos — Spec 063

Usa os mesmos 35 PDFs fictícios da Spec 013: 20 de uma página, dez de duas e cinco de oito.
Cada página recebe uma consulta independente com três fatos do início/meio/fim, os dois itens
pendentes do quadro e a distinção entre recebimento e aprovação técnica. São 80 perguntas por
modelo / 160 respostas. Não há memória entre perguntas.

```powershell
pnpm run evals:full-pages
pnpm run evals:full-pages --execute --run-key=2026-11-03-pdfs-preenchidos-r1 --concurrency=4
```

O primeiro comando apenas prepara o plano. A execução usa exclusivamente o Codex/ChatGPT local
autorizado, com `gpt-6-luna` high e `gpt-6.1-sol` low. O esforço é explícito e não há roteamento,
ferramentas, API paga alternativa ou nova autorização de dados. Reutiliza o reparo limitado da
aplicação e registra todas as tentativas. `--case=pdf-1p-01-p1` seleciona um smoke identificado;
ele não conta como bateria completa.

O snapshot em `.local/full-page-document-evals/<run-key>/snapshot` copia as fontes/corpus
necessários, sem `.env`, credenciais ou dependências. Uma referência local a `node_modules`
permite a mesma extração com fontes padrão. Fingerprints verificam código, corpus e dataset;
checkpoints com hash conservam os resultados e recusam substituição/adulteração. Retomar o mesmo
comando usa somente as perguntas ainda não concluídas.

Os PDFs são enviados e lidos pelo pipeline local antes da inferência, com original e texto
integral conferidos. As perguntas passam pelo endpoint real em processo, recuperador e validador
da Alvitra. O catálogo/original/índice desta rodada são adaptadores em memória, isolados por
documento e condomínio. O modo de lote integral restrito a Sol não é utilizado.

`reports/full-page-evals-<run-key>.json` conserva respostas, evidências efetivamente enviadas,
telemetria, validações, checks automáticos e consumo conhecido/desconhecido. Dados são fictícios;
os artefatos locais permanecem ignorados pelo Git. Tokens não representam fatura ou franquia.

`automatic_complete` significa que os valores esperados, pendências, qualificação textual e
citações passaram nos checks fechados. Não mede sozinho associação semântica, clareza ou
adequação. Revisão técnica de IA fica identificada em artefato próprio; aprovação especializada
permanece nula. Ausência de fato no contexto recuperado é registrada separadamente de omissão
do modelo. Falhas concluídas não são repetidas para melhorar a nota.

Uma rodada textual com uma família de layout não certifica OCR, PDFs arbitrários, navegador,
PostgreSQL, infraestrutura publicada ou qualidade global do modelo. A inferência real não é
executada pelo CI ou pelo comando padrão.
