# Revisão do autor — valores monetários em tabelas

- **Status:** delta revisado pelo autor; revisão independente para integração pendente
- **Autor/revisor:** Codex
- **Data:** 2026-11-03
- **P0/P1 abertos neste delta:** 0
- **Código/testes:** manifesto `a4ecd24405463a78e3956f5d0f630b5c6fa704623d192418a22d3db80c409e45`
- **Baseline:** `.local/document-validation-fix/baseline/`

Revisados os três arquivos de produção, dois de testes, dois de fixtures, spec/aceitação e
rastreabilidade. A nova leitura fica restrita a versões citadas, moeda explicitamente declarada
e tabela/seção financeira. Fonte autorizada continua determinando título, versão, página,
trecho e origem; `sourceScope` gerado não governa a validação. Controles de outra versão,
legislação, moeda estrangeira, medidas, valores inventados e precisão permanecem recusados.

O ajuste não acrescenta afirmações ou “R$” aos trechos. As regras de resultado ordinário
continuam ativas também para as novas células reconhecidas. Regressões anteriores de cálculos,
minutas, citações e completude foram preservadas. O renderer de teste mantém o comportamento
anterior por padrão e torna explícita a nova opção de linhas posicionadas.

Resultados, falhas intermediárias, replay causal e limites estão no
[relatório da Spec 056](../specs/056-validacao-e-completude-sinteses/table-currency-results-2026-11-03.md).
Os originais privados foram somente inspecionados localmente, separados de fixtures e smoke.
Não houve nova transmissão desses PDFs nem alteração de prompt ou configuração de modelo.

Gate canônico aprovado com 1.950 testes em 178 arquivos e quatro coberturas acima de 80%,
incluindo 100% no novo reconhecedor. Build, 20 evals básicos, 50 documentais determinísticos e
um smoke Sol 6.1 low aprovados; o replay da mesma saída comprova a recusa anterior. Após
autorização explícita, o build foi ativado no preview, com cadastro e quatro PDFs restaurados
localmente e hashes verificados. Zero chamadas à IA na restauração. Saúde e limpeza dos
temporários verificadas; histórico RAM descartado conforme autorizado.

Não autoriza merge, integração sem CI do commit, lançamento ou substituição da revisão
independente do diff completo do branch. Alterações alheias no workspace foram preservadas.
