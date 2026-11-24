# Revisão da comparação de balancetes enviados juntos

- **Status:** correção e regressões verificadas; gate global bloqueado por uma falha de apresentação do lote; sem autorização de merge
- **Data:** 2026-10-29
- **Autor e revisor:** Codex, sem revisão independente
- **Escopo:** correção da Spec 049, RQ-4902/4903/4904 e AC-4902a/b, AC-4903a/b/c

## Problema reproduzido

O relato apareceu após o envio conjunto dos documentos. Cinco balancetes originais sintéticos
de janeiro a maio foram localizados pelo SHA-256 do manifesto do pacote, sem consultar
conteúdo de outros arquivos. A extração do PDF manteve as rubricas e os valores. A comparação
também incluía linhas como `05/05/2026 - Folha e encargos`, da seção de compromissos do mês
seguinte. Datas diferentes produziam dezenas de ausências de equivalência entre os meses,
embora as despesas realizadas estivessem disponíveis e fossem comparáveis.

Regime e plano escritos em frases delimitadas eram ignorados por não usarem dois-pontos.
Totais consolidados e o principal em aberto também não estavam entre os rótulos explícitos
aceitos para fechamento e inadimplência. Não há evidência de falha no seletor ou transporte
do lote nesta reprodução.

## Correção e limites

Uma seleção local para o histórico exclui apenas entrada com data válida, posterior à
competência e correspondente ao cabeçalho explícito de compromissos futuros. As linhas
originais permanecem no relatório. Mudança de seção financeira encerra essa seleção;
data isolada, mês divergente ou cabeçalho ambíguo não são descartados por suposição.

Frases completas de regime/plano e os rótulos consolidados do cenário passam a ser aceitos
com fontes literais. Conflitos, ausência de suporte, conciliação e liquidez continuam com
os limites anteriores. A correção não altera PDF original, extração persistida, prompt,
provedor, autenticação, isolamento ou política de upload.

O diff próprio foi conferido contra cópias anteriores à mudança; alterações concorrentes
da Spec 057 e os demais arquivos do workspace foram preservados. Fixture exclusivamente
sintética com páginas e offsets completos. A revisão cobre o novo seletor, sua chamada,
os rótulos adicionais, as declarações citáveis, todos os testes novos e a documentação.
Nenhum achado P0/P1 próprio identificado; isso não substitui revisão independente para merge.

## Validação

Os 48 testes de `financial-history-scope.test.ts` e `financial-review.test.ts` passaram.
O novo módulo `financial-history-scope.ts` teve 100% em statements, branches, funções e linhas.
Os dois módulos juntos atingiram 99,38% / 98,37% / 98,86% / 99,66%, respectivamente.
O replay dos cinco PDFs deixou de gerar ausências de equivalência entre vencimentos futuros,
comparou as quatro competências anteriores de maio e manteve fontes validadas.

A suíte completa final, com um worker e cobertura, executou 1.543 testes: 1.542 aprovados e
uma falha em `tests/e2e/document-upload-batch.e2e.test.ts`. O teste esperava o trecho
`Silêncio após as 22 horas.` no HTML conjunto. Esse caso usa ata, regimento e contrato
sem balancetes; não percorre `buildFinancialReview` nem o seletor alterado nesta correção.
Sua falha bloqueia o gate global e qualquer integração. Não foi alterada sua asserção nem
foi apresentada aprovação geral. A rodada anterior, com dois workers, teve sete falhas,
incluindo quatro timeouts e dois casos de síntese em alteração concorrente no workspace;
ela permanece preservada como diagnóstico, sem atribuir esses resultados à correção.

Cobertura global final: statements 91,15%, branches 86,86%, funções 96,10% e linhas 93,00%.
Os quatro indicadores atendem ao piso de 80%, sem exclusão de código de produção.
Formatação global, lint, typecheck e gate de alinhamento de 57 specs passaram pelos binários
instalados. `evals/run.ts` aprovou 20/20 e `evals/documentary-quality/run.ts` aprovou 50/50
determinísticos. Os 50 casos documentais semânticos permanecem não executados.

O scanner global aprovou uma rodada; repetições encontraram ENOENT em arquivos efêmeros
de `.local/recovery-temp` usados por trabalho concorrente. Uma cópia estática dos oito
arquivos próprios revisados passou pelo mesmo scanner, sem achado. A falha de leitura
nas repetições não é apresentada como aprovação daquelas execuções.

A primeira tentativa de testes foi interrompida antes de executar casos por EPERM no
diretório temporário do sandbox; o diretório temporário local permitiu executar os testes
sem mudar asserções ou limites.
`pnpm run check` não iniciou os gates porque Corepack tentou baixar pnpm 11.19.0 e o registry
estava indisponível. Os binários já instalados são usados para os mesmos gates locais.

Comandos equivalentes executados: Prettier `--check` com os globs de `package.json`, ESLint `.`,
`tsc --noEmit`, Vitest `run --coverage --coverage.reportOnFailure --maxWorkers=1`,
`scripts/validate-spec-vision.ps1`, `scripts/scan-secrets.mjs` e os dois runners de evals.
Relatórios locais: `tmp/balancete-history-full-final-20261029.log`,
`tmp/balancete-history-coverage-final-20261029/coverage-summary.json` e
`tmp/balancete-history-focused-final-20261029.log`. A configuração semântica e os prompts
foram preservados. A API em execução não foi reiniciada por esta correção.

Não foi executada nova inferência nem avaliação semântica por modelo. A mudança não atualiza
automaticamente respostas antigas do chat; sua validação de experiência depende de uma nova
conferência com o backend atualizado.
