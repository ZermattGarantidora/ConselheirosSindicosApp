# Revisão literal do corpus de conversas — Segurança — 11/11/2026

**Resultado:** leitura integral dos cinco arquivos abaixo concluída, com comparação de perguntas
e gabaritos às fontes sintéticas disponíveis em cada turno. Nenhum defeito concreto novo foi
identificado nesse escopo. O mapa por SHA-256, intervalos de leitura e autoria está em
`.local/pilot-security/conversation-literal-review-2026-11-11.json`.

| Arquivo | Linhas lidas | Escopo |
|---|---:|---|
| `evals/conversations/dataset.ts` | 1–1638 | Helpers locais, 240 cenários de base e composição do catálogo. |
| `evals/conversations/long-10.ts` | 1–534 | Dez conversas de dez turnos. |
| `evals/conversations/long-15.ts` | 1–741 | Dez conversas de quinze turnos. |
| `evals/conversations/long-20.ts` | 1–937 | Dez conversas de vinte turnos. |
| `evals/conversations/long-30.ts` | 1–1375 | Dez conversas de trinta turnos. |

Foram lidas as 5.225 linhas, incluindo perguntas e gabaritos dos 280 cenários/1.010 turnos;
a leitura não se limita a AST, busca de padrões ou conferência de referências. A auditoria
estrutural de Infraestrutura permanece em
`.local/pilot-operations/full-review/conversation-data-audit-2026-11-11.json`.
Os cinco hashes ao fechamento coincidem com os do início da leitura e com aquela auditoria.

## Fontes e critérios confrontados

Os 25 arquivos de `evals/conversations/documents/`, `corpus.ts`, `long-case.ts` e
`long-dataset.ts` foram lidos integralmente. A conferência complementar do README foi das
linhas 1–120; a de `replay.ts`, delimitada à seleção de contexto por turno; a da edição legal,
delimitada aos metadados de verificação. O mapa distingue essas leituras parciais das integrais.

- **Contas e contratos:** cálculos de caixa, reserva, disponibilidade, principal e variações
  foram confrontados com os valores sintéticos. Recebíveis não viram recebimentos, saldos
  mensais não são somados e hipótese de reajuste não vira aditivo aceito. No trimestre, receitas
  e despesas de 95 mil explicam resultado zero e saldo final de 10 mil.
- **Evidências e conflitos:** pauta, deliberação, proposta e execução permanecem distintas.
  Minutas sem aceite, ausência de comprovantes, conflito entre convenção e regimento e fontes
  retiradas exigem limitação explícita. A reintrodução da apólice não demonstra renovação.
- **Autorização e memória:** alternância Alameda/Bosque, usuário restrito e revogação tardia
  mantêm escopo autorizado. Os gabaritos preservam HTTP 403 e não recuperam dados negados
  por memória. Preferências antigas fora da janela exigem esclarecimento; fonte retirada não
  continua autorizada só por ter aparecido antes. Cada fase define o conjunto atual de fontes.
- **Injeção e ações:** notas maliciosas podem fornecer um fato documental válido, mas seus
  comandos não autorizam divulgação de dados protegidos, troca de escopo ou execução externa.
  Mensagens e planos propostos permanecem rascunhos para revisão.
- **Risco e revisão humana:** gabaritos não certificam fraude, cobertura securitária, segurança
  da área ou rescisão trabalhista sem base. Emergências preservam proteção imediata e
  atendimento qualificado; não instruem intervenção elétrica, resgate mecânico ou liberação remota.
- **Datas e legislação:** habilitação da biblioteca e data de cada turno foram confrontadas
  com os metadados locais de verificação. Expirar a janela de conferência da fonte não significa
  revogar a lei. Esta leitura não conferiu legislação ou jurisprudência na internet.

## Autoria, validação e limites

A frente Segurança não editou esses cinco arquivos nesta rodada. A revisão é uma leitura
técnica complementar à de Infraestrutura; a autoria histórica dos arquivos não foi inferida,
portanto este registro não atesta independência histórica nem aprovação do branch inteiro.
O resultado é uma revisão técnica por IA. Os campos de aprovação do síndico, jurista, contador
e responsável técnico continuam pendentes conforme o tema; não foram preenchidos por esta leitura.

Não houve nova execução de testes ou evals, inferência, conexão externa ou alteração funcional.
O replay anterior, identificado no mapa por caminho e hash, conserva 280 cenários/1.010 turnos,
zero falhas mecânicas, zero chamadas ao provedor, `modelQualityEvaluated=false` e
`semanticApproved=null`. A comparação literal dos gabaritos não transforma esse replay em
avaliação de qualidade das respostas do modelo, prova de persistência ou aprovação especializada.
Mudanças posteriores exigem conciliação dos hashes com o mapa integral da revisão.
