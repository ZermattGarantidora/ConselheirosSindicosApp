# Revisão local — recuperação integral e comparação densa

- **Status:** revisão técnica local do autor; revisão independente e integração não aprovadas.
- **Autor/revisor técnico:** Codex, por IA; não é revisão especializada humana.
- **Data:** 23/11/2026.
- **Escopo:** delta da Spec 076 sobre o snapshot denso 075, incluindo helpers novos, leitores,
  recuperação, caso de uso, validação, journal, harness, regressões e documentação.
- **Identificação:** snapshot medido `67de90a39333f16693768efe681ee5b46938eb6327da6ce7f9e37c5d9eb78573`;
  hashes dos arquivos finais no artefato privado `reviewed-files.json` da rodada r3.
- **P0/P1 encontrados no delta e pendentes:** nenhum identificado nesta revisão do autor.
- **Merge/deploy:** não executados; este registro não aprova o diff completo preexistente do branch.

## Revisão do delta

Conferidos os diffs de produção contra a baseline congelada e os arquivos adicionados:
IDs completos não aceitam prefixos; busca complementar recebe contexto autorizado e mantém
limites; reserva de anexos preserva filtros e orçamento. Cálculo exige catálogo único,
pertencimento, estado, cobertura/qualidade e linhas reconhecidas; usa centavos e limites,
recusa conflito relevante e conserva hashes/parcelas. Resumo não vira citação inventada.

Prova copiada em JSON não habilita exceção monetária. Revalidação de origem protege a
persistência e o replay HTTP, inclusive alteração em página que não foi citada como amostra.
Recibo e cálculo não são reutilizados como memória antiga. Leitura integral é callback
interno, não opção enviada pelo cliente. Consumo de saída rejeitada permanece registrado.

A entrega/replay de minuta exige resposta já validada/persistida, usuário/tenant, texto e
citações idênticos, claims de interpretação explicitamente qualificadas, propriedade/estado
e páginas. Foi fechado também o caso em que só a palavra “minuta” acompanhava uma afirmação
de vigência. A restrição de resumo automático permanece. Testes cobrem mutação/revogação,
ausência de prova, claims inadequadas e alteração de página não amostrada.

O harness conserva original/gabarito/snapshot/checkpoint, não envia oracle ao modelo nem
reexecuta resposta concluída para melhorar nota. Progresso tem fila própria e retry transitório;
envio tem marcador anterior à chamada e recibo posterior. Envio incerto bloqueia reenvio.
OCR real é separado do adapter determinístico e dos testes mockados. Não houve pacote,
fornecedor, schema, migration ou serviço novo.

O workspace já continha alterações extensas antes desta tarefa. Foram preservadas; esta
revisão cobre o delta funcional identificado, sem se passar por review independente do branch.

## Evidência de avaliação

- 60 casos por braço, 120 checkpoints auditados por hash; 126 recibos de processo com usage
  e um envio Sol incerto. Comparativo monetário/temporal usa somente 59 pares completos.
- Aprovação técnica: 56/59 em ambos; custo equivalente cai 52,3% no híbrido; tempo médio
  sobe 7,8%. Nenhum desses números equivale a aprovação humana ou SLA.
- DENSE-005 e 032 atendidos nos dois braços; soma independente: R$ 1.049.523,68, 492 parcelas,
  24 páginas e 1.200 linhas verificadas.
- Reaplicação de 126 eventos já recebidos no código final: **120/120 casos com entrada,
  corpo, modo, fontes, limitações e status preservados**, zero nova inferência; um envio incerto
  continuou bloqueado. IDs aleatórios e tempo do replay não são nova medição de modelo.
- QA: nove originais, 134 páginas, 26 amostras, três contatos e duas ampliações inspecionadas.
  Duas páginas nítidas de OCR real, tokens/campos aferidos; não comprova OCR universal.

## Gates

Os comandos foram executados com binários locais, evitando instalação implícita do pnpm.
Resultados finais de formatação/lint/tipos, cobertura, E2E, build, alinhamento e scanner
são conservados nos relatórios da rodada. Evals determinísticos: **20/20** da Spec 001
e **50/50** documentários; os 50 casos semânticos documentários continuam pendentes.

Unitários finais: **2.877/2.877**, 224 arquivos; cobertura de **85,40% statements,
81,83% branches, 90,78% functions e 87,28% lines**, sem exclusão nova ou redução de piso.
E2E finais: **273/273**, 45 arquivos. Formatação global, lint, TypeScript, build da API,
alinhamento das 76 specs e scanner de segredos passaram; nenhum padrão conhecido encontrado.
Não houve mudança em banco, fila, armazenamento ou integração externa; gates PostgreSQL
guardados não foram executados implicitamente, e não há autorização remota/real derivada disso.

Tentativas anteriores são preservadas: três E2E antigos usavam stub sem a nova prova
persistida; o fixture foi atualizado para fornecer resposta/claims validadas, mantendo
as mesmas assertivas de status, revogação, conteúdo e número de chamadas. Houve também
oito timeouts e uma falha de confirmação local de consumo durante execução concorrente
com QA/renderização, além de um timeout do E2E denso. A repetição sem essa concorrência
passou, sem elevar timeout ou enfraquecer asserção. A rodada final inclui a regressão adicional
de qualificação explícita de minuta.

## Achados P2/P3 e limites

| Achado | Evidência | Tratamento e responsável |
|---|---|---|
| P2 — conflito intradocumental não concluído | DENSE-017/027/031: fontes presentes, geração recusada por modo/cobertura; abstenção genérica | Engenharia da Alvitra: corrigir classificação/cobertura e repetir esses casos antes de seleção definitiva/liberação. Resultados não substituídos. |
| P2 — envio incerto e janela interrompida | UNSEEN-012 Sol e diagnóstico r2 | Marcadores preservados; sem reenvio automático; custo desconhecido. Excluir par incompleto do comparativo, sem esconder falha no total de 60. |
| P3 — apresentação/escalonamento | Marcadores/links internos e escalonamento desnecessário no híbrido; avisos sintéticos no Sol | Engenharia/produto: regressões editoriais antes de liberação. Nota factual separada. |
| P3 — equivalência automática incompleta | Flexões e fontes redundantes, detalhadas nos resultados | Avaliador bruto preservado; decisões por hash justificadas. Melhorar próxima revisão sem alterar esta nota. |

Revisão especializada e revisão independente continuam pendentes. O pacote humano tem campos
em branco; nenhuma aprovação profissional foi fabricada. O relatório completo está em
[resultados da Spec 076](../specs/076-recuperacao-e-conferencia-integral/results.md).
