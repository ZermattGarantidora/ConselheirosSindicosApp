# Revisão do autor — leitura documental densa

- **Status:** REVISÃO DO AUTOR CONCLUÍDA; NÃO APROVA MERGE.
- **Escopo:** delta da Spec 075 no workspace atual, sem incorporar alterações anteriores de outras frentes.
- **Revisor/autor:** Codex; revisão independente e especializada não executadas.
- **Data:** 2026-11-23.
- **P0/P1 encontrados no código deste delta:** nenhum pendente na revisão do autor.
- **Achados de capacidade:** recuperação incompleta em DENSE-005 e cobertura integral insuficiente em DENSE-032; preservados no relatório e nos checkpoints, sem alegação de liberação.

## Escopo examinado

Leitura integral dos novos módulos em `evals/dense-documents/`, seus testes unitários/E2E,
spec/aceitação/resultados e vínculos no README, package, AGENTS e rastreabilidade. No helper
preexistente `evals/full-page-documents/replay.ts`, foram examinados o contrato de contagem
numérica, a opção de vigência e a conferência da minuta por original privado autorizado.
Nenhum módulo de produção foi alterado nesta fatia.

A revisão conferiu independência do oracle em relação ao parser/modelo, preservação de
originais, página/versão/offset de citações, escopo de condomínio e presença dos canários.
Também conferiu que gabaritos não entram na geração, execução exige opção explícita, o
runner não tem fallback pago, checkpoints recusam rodada/caso incompatíveis e consumo
inclui reparos. A revisão das 32 respostas foi vinculada por hash, separada dos checks
lexicais e sem se apresentar como aprovação humana especializada.

O manifesto de arquivos examinados está no artefato privado
`.local/dense-documents/2026-11-23-dense-r2/implementation-review-files.json`. Ele identifica
os arquivos atuais examinados; o snapshot da execução real permanece identificado no relatório.
O presente registro não é uma revisão independente do diff inteiro acumulado do workspace.
O recibo contém 19 arquivos, sem divergências na conferência final; SHA-256 do recibo:
`1cdc16699ae19195bdc61fe386860935dbbb17791f797c16e0e17b39fd770d4a`.

## Gates executados

As etapas do `check` foram executadas por seus binários locais, sem instalação ou resolução
do gerenciador. Testes unitários finais usaram dois workers para reduzir disputa entre
processos; nenhuma asserção ou regra de cobertura foi retirada.

| Gate | Evidência final |
|---|---|
| Prettier global | Aprovado. |
| ESLint global | Aprovado. |
| TypeScript `--noEmit` | Aprovado. |
| `scripts/validate-spec-vision.ps1` | 75 specs aprovadas estruturalmente; alinhamento semântico da fatia revisado pelo autor. |
| Unitários completos | 2.822/2.822 em 219 arquivos, `tests/unit --maxWorkers=2 --coverage.enabled`. |
| Cobertura statements / branches / functions / lines | 85,47% / 81,92% / 90,99% / 87,33%; sem novas exclusões. |
| E2E completo | 273/273 em 45 arquivos, com loopback local autorizado. |
| E2E denso final | 1/1 após alteração apenas do título do teste. |
| `evals` | 20/20, zero falha P0. |
| `evals:documentary` | 50/50 determinísticos; os 50 semânticos históricos continuam pendentes de revisão. |
| Scanner de segredos | Aprovado no workspace completo. |
| Execução real densa | 32/32 casos executados, 34 tentativas; diagnóstico de qualidade separado do êxito do runner. |
| Integridade da auditoria | Checksums e identidade dos 32 casos, resumo e manifest conferidos; 32 hashes de resposta. |
| PDFs | 120 páginas extraídas/conferidas; 15 amostras renderizadas/inspecionadas; compilação de consulta gerada. |
| Whitespace do delta rastreado | `git diff --check` aprovado nos arquivos rastreados tocados pela tarefa. |

Relatórios de teste em `.local/dense-documents/{unit-tests,e2e-tests,dense-e2e-final}.json`;
cobertura em `coverage/coverage-summary.json`. Artefatos de inferência e auditoria em
`.local/dense-documents/2026-11-23-dense-r2/`. O código congelado dessa rodada não foi refeito
para absorver o reforço posterior de validação dos checkpoints do runner.

## Ocorrências e correções

A preparação r1 tentou conferir a minuta no leitor de análise confirmada, que a exclui
corretamente. O helper passou a conferir o original privado autorizado, preservando
`validityStatus=pending`; o teste E2E verifica as 120 páginas e o estado dos chunks da minuta.
Não houve mudança de autorização, promoção de vigência ou inferência na tentativa r1.

Uma execução unitária excedeu os 5 s padrão no teste que abre o CLI do plano denso. Após o
ajuste, o teste equivalente da Spec 074 também excedeu 5 s sob concorrência. Ambos já tinham
deadline de subprocesso de 30 s; o timeout externo do Vitest passou a 35 s para deixar esse
deadline funcionar, preservando todas as asserções de zero chamadas, contagens e modelo.
Registros vermelhos foram preservados em `unit-tests-timeout-before-fix.json` e
`unit-tests-cost30-timeout-before-fix.json`. A suíte completa foi repetida com cobertura e
passou; não foi classificado como sucesso um processo que excedeu seu deadline.

Os checks automáticos da rodada real permanecem inalterados, inclusive os falsos negativos
026/029. O caso de instrução hostil não foi apresentado ao gateway e, portanto, não sustenta
alegação de resistência do modelo exposto. As duas lacunas de capacidade não foram
suprimidas, corrigidas por troca de gabarito ou compensadas por média de custo.

## Limites da decisão

Entrega local de instrumentos de avaliação e diagnóstico. Não aprova CI remoto, merge,
rollout, dados reais ou configuração de produção. Integração PostgreSQL/SQL guardada não
foi executada: não houve mudança de banco, schema, storage persistido ou código de produção.
Não houve dependência nova, alteração de pesos, restart do servidor do usuário ou deploy.

O formato tabular uniforme e a revisão por IA limitam o alcance da evidência. OCR, textos
normativos com redação longa, tabelas visuais complexas, variabilidade entre rodadas e
validação especializada continuam necessários para validar qualidade mais ampla.
