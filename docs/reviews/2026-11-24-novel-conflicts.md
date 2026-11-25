# Revisão local — validação de conflitos e repetição da Spec 077

- **Data:** 24/11/2026.
- **Status:** software, repetição real, scanner e alinhamento local concluídos.
- **Tipo:** revisão técnica do autor por IA; revisão independente/especializada pendente.
- **Escopo:** três arquivos de aplicação, dois testes e documentação da continuação.
- **Snapshot:** `ff0b23fbe2d43e093865f6153a65cd38b79b1308d7e93903071d70633518c98b`.
- **Manifest:** `64ffbca108b2241104b63a9445632a79d66f6d8100fb1389338214652e805726`.
- **Merge, deploy, banco remoto e dados reais:** não executados.

## Delta revisado

Briefing vigente completo, estratégia, Spec 077, critérios e ADRs relacionados foram lidos.
RQ-7706 e AC-7708/7709/7710 precederam a implementação. A decisão está registrada no ADR 0048.
Escopo mantém leitura documental com citações nos Blocos 6/7, sem ampliar visão ou provedores.

Conferidos integralmente `documented-conflict.ts`, alterações de `answer-task-context.ts`
e `answer-use-case.ts`, `documented-conflict.test.ts` e `documented-conflict.e2e.test.ts`.
O delta de arquivos já existentes foi confrontado com a cópia anterior em
`.local/novel-conflicts/before/`. Mudanças extensas preexistentes foram preservadas;
esta revisão não aprova o diff inteiro do branch nem substitui revisão independente.

O reconhecedor limita valores à entrada identificada do registro, exige fontes elegíveis
do mesmo tenant, deduplica origem e compara tipos/unidades. A permissão de modo é condicional:
não reclassifica tarefa, não escolhe modelo e não escolhe o vencedor do conflito. O validador
comum de citações/claims roda antes da cobertura adicional. Trecho curto só vale se seus
valores estiverem dentro da entrada do registro; trecho de vizinho não satisfaz a prova.

Conferidos centavos e sinal por inteiro, distinção bruto/líquido/retenção, conversão bar/kPa,
competência versus data completa, dias corridos/úteis, estados pago/agendado, vigência e
exceção resolvidas. A recusa de um vencedor ou conciliação inventados permanece explícita.
Isso é um reconhecedor literal limitado; não representa resolução semântica geral de conflito.

Os 39 novos casos unitários cobrem campos, três lados, contrato inicial/reparo, citação curta,
ID implícito inequívoco e negativos de fonte, tenant, escopo, sinal e resposta incompleta.
A regressão HTTP gera e ingere três PDFs sintéticos próprios, diferentes do benchmark;
verifica entrega/replay, uma chamada, risco jurídico preservado e recusa de trecho adulterado.
Nenhuma asserção existente foi enfraquecida ou exclusão de cobertura adicionada.

O replay das 80 primeiras saídas antigas passou com uma chamada simulada por caso, sem
reparo nem inferência externa, mantendo destino de modelo. A medição real usa novas saídas
e não conta o replay como amostra extra. PDFs/oracle/rubrica/configuração são idênticos à
baseline; a verificação lista exatamente os três arquivos de produção alterados.

## Gates

Binários locais, sem instalação implícita de dependências. Antes da nova inferência:

- Formatação global, ESLint, TypeScript e build da API: passaram.
- Unitários: **2.946/2.946**, incluindo os 39 casos novos.
- E2E: **274/274**, incluindo a regressão HTTP nova.
- Cobertura statements/branches/functions/lines: **85,56 / 81,98 / 91,01 / 87,40%**.
- Evals determinísticos: **20/20** e **50/50** documentários; os 50 semânticos anteriores continuam pendentes.

Relatórios unitário/E2E/cobertura em `.local/novel-conflicts/gates/`. Diagnóstico congelado
em `replay-frozen-results.json`; execuções intermediárias preservadas. Permissão local para
Codex/junction/loopback foi usada no caminho já autorizado, sem fallback de API paga.

Alinhamento das 77 specs e scanner integral passaram (`spec-vision.log` e `secrets.log`),
sem padrão conhecido encontrado. `git diff --check` do escopo passou. Não identifiquei P0/P1
no delta desta tarefa; isso não equivale a revisão independente ou aprovação do branch inteiro.
Hashes finais dos 12 arquivos revisados em `.local/novel-conflicts/reviewed-files.json`.

## Resultados e limites

Repetição concluída e 80 respostas auditadas por hash: **40/40 completas por braço**, sem
reparo nem rejeição de modo; 80 recibos conhecidos e zero consumo desconhecido. Destinos,
tarefas, riscos, budgets e textos recuperados da baseline foram conferidos em 40 pares;
fontes também são iguais entre os braços. O source fingerprint continua idêntico ao medido.

Sol USD 1,3186968 equivalente e média 15,671 s; híbrido USD 0,9493181 e média 15,604 s.
Economia de 28,01%, tempos próximos, híbrido com 29 chamadas Sol e 11 Luna. Os dois braços
mantêm encaminhamento jurídico excessivo na contagem literal 031; marcador interno 034
não reapareceu. As diferenças lexicais do automático em híbrido-010/026 foram justificadas
por resposta/hash, sem alterar checks ou oracle. Formulário especializado mantém 80 decisões
humanas em branco. A baseline 34/40 e 36/40 e seus artefatos permanecem intactos.

O [relatório da continuação](../specs/077-estresse-documental-e-conflitos-ineditos/results-conflicts-r2.md)
registra qualidade, custos, latência e ressalvas, separado da baseline histórica.
Tarifa histórica não é fatura nem preço atual; uma rodada local não estima SLA.
Os campos de aprovação humana ficam em branco. Esta revisão não autoriza integração ou uso real.
