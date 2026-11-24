# Recuperação integral e comparação densa — 23/11/2026

As duas lacunas da Spec 075 foram corrigidas no ensaio: ART-0059 passou a chegar à geração,
e a soma integral passou a conferir o caderno inteiro. No comparativo com recibos completos,
o híbrido custou **52,3% menos em equivalência de API**, com o mesmo resultado técnico:
56 respostas aprovadas em 59 pares. Foi 7,8% mais lento na média local observada.

Isso não demonstra superioridade geral nem qualidade certificada. São sintéticos, uma
rodada local interrompida e retomada, e revisão do autor por IA. Há três falhas de utilidade
compartilhadas; uma tentativa Sol ficou sem resultado confirmado. Não houve troca do
roteador do aplicativo, treinamento de pesos ou liberação de produção.

## Comparação de custo, qualidade e tempo

Os 60 casos foram processados por braço. Uma sessão terminou após o marcador de envio de
`sol-fixed:UNSEEN-012`, sem recibo de resultado. A retomada bloqueou novo envio desse caso.
Para custo e latência, o par UNSEEN-012 inteiro foi excluído: **59 perguntas idênticas em
cada braço, escolhidas por completude do recibo, antes de comparar suas notas**. A falha
continua visível no total de 60, e seu consumo não foi convertido em zero.

| Medida nos mesmos 59 pares | Sol 6.1 low fixo | Híbrido Luna high / Sol low |
|---|---:|---:|
| Aprovação factual/completude, revisão técnica por IA | 56/59 (94,9%) | 56/59 (94,9%) |
| Check automático v2, antes da revisão | 52/59 | 48/59 |
| Tentativas com usage, incluindo reparos e falhas de validação | 62 | 63 |
| Equivalência hipotética de API, USD | 1,7910452 | 0,8550310 |
| Equivalência por pergunta, USD | 0,030357 | 0,014492 |
| Equivalência por resposta tecnicamente aprovada, USD | 0,031983 | 0,015268 |
| Tempo médio de resposta, com recuperação/validação/reparos | 18,445 s | 19,888 s |
| Mediana | 16,959 s | 18,096 s |
| P95, nearest rank | 35,704 s | 41,662 s |
| Máxima | 59,668 s | 59,657 s |
| Destinos efetivos das tentativas | 62 Sol | 31 Sol + 32 Luna |

O custo usa a tarifa **congelada de 30/10/2026**, herdada da Spec 074; não é uma cotação
atualizada, fatura, desconto comercial ou medição da franquia do plano ChatGPT. O OCR é
preparação comum e fica separado. Tempo mede execução local com dois workers, ordem de
submissão alternada por caso, memória desligada e gates concorrentes em parte da janela.
A interrupção separou a janela em dois segmentos. Não são SLA nem experimento causal
isolando a velocidade do modelo.

Nos 60 casos processados, Sol teve 56 aprovações técnicas, três abstenções incompletas
e uma falha de infraestrutura; o híbrido teve 57 aprovações e as mesmas três abstenções
incompletas. Essa diferença de uma resposta não é atribuída à qualidade dos modelos.

## O que foi implementado

- ID completo, com fronteiras e busca complementar autorizada e limitada, reserva a linha
  própria antes de referências e vizinhos. Anexos explicitamente referidos pela cláusula
  são reservados antes de documentos tangenciais; o orçamento continua em até oito trechos.
- Soma de lançamentos pagos em mês/ano usa catálogo e leitor integral autorizados, formato
  tabular fechado, centavos inteiros e recibo privado com páginas/hashes/parcelas/filtro/total.
  Página faltante, qualidade baixa, pertencimento pendente, versão ambígua, linha inválida,
  duplicata, conflito relevante ou mudança concorrente impedem a conclusão.
- O modelo recebe resumo calculado e amostras originais citáveis. Um JSON copiado não
  concede autoridade de cálculo; total diferente e escopo incompatível são recusados.
  O recibo HTTP revalida também páginas que não aparecem nas amostras citadas.
- Comparação qualificada e persistida de minuta pode ser entregue sem promovê-la a vigente.
  O journal exige dono/tenant, resposta/citações exatas, claims qualificadas e catálogo/páginas
  íntegros. O simples rótulo “minuta” não basta. Resumo automático de minuta continua bloqueado.
- Avaliador v2 conserva a avaliação estrita e aceita equivalências delimitadas e declarações
  repetidas. Recibos de envio/resultado e progresso serializado preservam consumo e impedem
  repetição automática de tentativa incerta.

## Corpus e qualidade por camada

São **nove originais, 134 páginas**: cinco cadernos de 24 páginas, com 6.000 registros;
três documentos narrativos de quatro páginas; uma digitalização de duas páginas. Os 60
casos têm 32 perguntas anteriores, 12 registros inéditos, 12 perguntas narrativas e quatro
consultas sobre a digitalização. Gabaritos e fontes esperadas precedem extração e inferência.

As perguntas antigas mantêm os cinco documentos originais como distratores; as novas usam
o conjunto ampliado. Não há seleção pelo gabarito. Os PDFs nativos passam por upload,
processamento e conferência de texto/ordem/original; minuta permanece pendente. A integração
usa API/validação reais, índice e persistência em memória, sem banco remoto ou dado real.

| Prova | Resultado técnico observado |
|---|---|
| ART-0059, DENSE-005 | Ambos citaram a página 2 aprovada: R$ 990,83, 18 dias, aprovado. |
| Soma integral, DENSE-032 | Ambos: R$ 1.049.523,68; 24 páginas, 1.200 registros conferidos, 492 pagos de outubro incluídos. |
| Recibo integral | Parcelas e hashes confrontados com ledger independente; total não confunde marcação “pago” com quitação bancária. |
| Comparação v1/minuta | Três casos por braço entregues por HTTP, com valores e limitações de aprovação corretos. |
| Registros inéditos | 11/11 Sol com geração observada e 12/12 híbrido; um Sol interrompido. |
| Narrativos/anexos | 12/12 por braço na revisão técnica, incluindo abstenção legítima sobre alvará. |
| Consultas após OCR | 4/4 por braço na revisão técnica. |
| Mecânica final | Zero erro de documento/versão/página/trecho/offset observado nas respostas entregues. |
| Isolamento e instrução hostil | Nenhum canário estrangeiro nem marcador hostil nas entradas/respostas verificadas. |

A instrução hostil foi filtrada antes da geração; isso valida a guarda, sem demonstrar
resistência do modelo diretamente exposto a esse ataque. Extração correta e presença da
fonte não equivalem a compreensão certificada.

### Falhas que continuam visíveis

**DENSE-017, 027 e 031 falharam nos dois braços.** Tabela, notas e fontes necessárias foram
recuperadas, mas a coordenação entre detecção de conflito, modo de resposta e cobertura
recusou as gerações. `mode_incompatible` aparece nos três; no reparo híbrido de 017 também
ocorreu `task_coverage_missing`. A fala entregue foi uma abstenção genérica, sem a explicação
solicitada. Não houve conciliação ou acusação de fraude inventada; a utilidade ficou incompleta.

Na baseline 075 esses três casos haviam sido respondidos após reparos. As correções de 005
e 032, portanto, **não autorizam declarar melhora global**: houve ganho nos dois alvos e
regressão observada nesses três casos. É necessário corrigir/testar a classificação de
conflitos intradocumentais e a cobertura antes de seleção definitiva ou liberação.

Há problemas editoriais: o híbrido apresentou dois marcadores internos de citação, um link
interno de evidência e dois escalonamentos desnecessários em consultas literais. Sol inseriu
avisos espontâneos de material fictício em três respostas. Foram separados da nota factual;
não são considerados apresentação aprovada por especialista.

### Discordâncias do avaliador

Os resultados automáticos originais continuam intactos. A revisão técnica por resposta/hash
aprovou quatro discordâncias Sol e oito híbridas, com estas justificativas:

- “Pago/paga” e “aprovado/aprovada” mantêm o mesmo estado, valor e associação à linha:
  UNSEEN-001/002/003/004 no híbrido e UNSEEN-009 nos dois braços.
- UNSEEN-021: o anexo citado contém sozinho 19h, 22h e capacidade 74; a citação adicional
  da página 1 exigida pelo oracle é redundante para a pergunta.
- SCAN-003: a página 2 citada contém sozinha 14 dias e os 9 dias usuais; não falta evidência
  para a comparação, embora o oracle também exija a página 1.
- UNSEEN-024: a resposta se abstém de identificar alvará, pede o documento e não afirma
  sua inexistência. Não apresenta uma regra documental positiva sem citação.

O avaliador v2 ainda não resolve automaticamente todas essas equivalências. As decisões
manuais não substituem os checks brutos nem alteram retroativamente a baseline.

## Digitalização e QA visual

O PDF digitalizado foi rasterizado a 200 dpi e não possui camada de texto. Sem OCR, o pipeline
exigiu `needs_review`. Houve uma inferência visual real Sol local, anterior às perguntas, sem
gabarito, ferramentas, web ou correção manual posterior. As imagens/transcrição exatas foram
reutilizadas nos dois braços e nas retomadas por hash.

Nas duas páginas, precisão e recall do multiconjunto de tokens foram 1,00, e todos os campos
críticos passaram. Isso não mede ordem perfeita por distância de edição, confiança calibrada,
manuscritos, ruído, assinatura autenticada ou OCR universal. A integração do leitor reaplica
a transcrição real medida; mocks determinísticos não contam como qualidade visual.

OCR comum: 19.071 tokens de entrada, 2.346 de saída, 51,696 s e US$ 0,061602 de equivalência.
Não houve nova leitura visual nas retomadas. A compilação de consulta tem 134 páginas;
26 amostras em três contatos e duas ampliações foram inspecionadas, sem corte/sobreposição
observados. Citações continuam referindo a página de cada original.

## Recibos, interrupções e integridade

Rodada principal: `.local/dense-documents/2026-11-23-dense-v2-r3/`.
Há 120 checkpoints de caso auditados por hash, 126 recibos completos de processo e um
marcador de envio incerto. Todos os consumos observados, inclusive reparos/saídas recusadas,
entram no respectivo custo; não se mede somente a última resposta aprovada.

| Rodada da continuação | Uso no relatório | API equivalente conhecida, USD |
|---|---|---:|
| r1 | Diagnóstico completo anterior à correção do journal; não compõe a nota final | 2,7842842 |
| r2 | Dez resultados antes de EPERM no progresso; até um envio adicional incerto | 0,1659115 + desconhecido |
| r3 | Principal; um envio Sol incerto preservado, 59 pares com recibos completos | mínimo 2,6476209 + desconhecido |
| OCR comum, uma vez | Preparação compartilhada, não duplicada por braço | 0,0616020 |

O mínimo conhecido desta continuação é **US$ 5,6594186 equivalentes**, com consumo adicional
incerto nas rodadas r2/r3. Não há total faturado ou custo completo confirmado do experimento.
Não foram reenviados automaticamente os envios incertos nem escondidas as rodadas de diagnóstico.

- Snapshot da medição: `67de90a39333f16693768efe681ee5b46938eb6327da6ce7f9e37c5d9eb78573`.
- Manifest SHA256: `9823c906efdb530bd6bec3d52ff259556621d290ba2920fd9309f1e5d1835424`.
- Corpus SHA256: `858092a3abd81de8b14b4cd4d1e8b6e9e61bb734747c53bd4909f7f007a54e1e`.
- Oracle SHA256: `c287aa84d5b460f6a8e7255b4140f97fd99aa8229f9ca1ad64867f0012d90ef3`.

O código final acrescenta guardas de pertencimento pendente e qualificação explícita de
minuta após o congelamento. O replay dos eventos já recebidos verifica o comportamento
contra o código final sem nova inferência; ele não substitui medição nem torna a latência
do replay uma nova latência do modelo. A revisão/gates finais são registrados na nota
[de revisão local](../../reviews/2026-11-23-dense-integral-comparison.md).

## Uso recomendado desta evidência

Manter o cálculo e a prova integral no servidor, e ampliar formatos apenas com parser,
gabarito e regressões correspondentes. O híbrido mostrou economia neste conjunto e merece
continuidade controlada em perguntas simples; a rodada não justifica trocar o aplicativo
automaticamente. A próxima correção prioritária é a resposta a conflitos intradocumentais,
seguida dos problemas editoriais e da revisão humana do corpus.

O [roteiro especializado](specialist-review.md) e o pacote em
`output/reports/dense-documents-2026-11-23-dense-v2-r3/revisao-especializada.md` estão preparados.
Revisão especializada, revisão independente e aprovação de produção continuam pendentes.
