# Benchmark sintético de PDF com 300 páginas

Execute `pnpm run evals:pdf-300`. O comando compila a API, gera um PDF A4 sintético preenchido
e seu gabarito e inicia um processo Node separado com o código compilado. O processo medido
não carrega tsx nem gera o corpus. Não lê `.env` ou chama provedor de IA.

Confere as 300 páginas integralmente e consulta páginas 1, 150 e 300 em duas passagens.
O JSON em `reports/long-pdf/latest.json` registra tamanho, caracteres, tempos, pico RSS e metas.
Falha de meta ou execução termina com código diferente de zero. `cold` indica primeira passagem;
trechos comuns podem ser reutilizados entre perguntas dessa passagem. `warm` repete as perguntas.

Metas da Spec 067: indexação até 60 s, cada consulta aquecida até 5 s, RSS menor que 512 MiB.
Isso mede parsing/indexação/retrieval locais, não qualidade semântica de uma resposta, OCR,
PostgreSQL ou capacidade do ambiente publicado. A jornada HTTP está em
`pnpm run test:documents:long`; a integração PostgreSQL está em `pnpm run test:integration`.
