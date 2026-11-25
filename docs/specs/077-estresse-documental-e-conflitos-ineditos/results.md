# Estresse documental e conflitos inéditos — 24/11/2026

A bateria mais difícil terminou com **34/40 respostas factualmente corretas e completas
no Sol fixo (85%)** e **36/40 no híbrido (90%)**, na revisão técnica do autor por IA.
O híbrido teve **25,14% menos custo equivalente de API**, com tempo médio 0,20 s maior.

O resultado novo expôs uma limitação que o 60/60 anterior não demonstrava: formas novas
de conflito chegam ao modelo, mas algumas respostas são descartadas pelo contrato de modo.
Não foi feita correção de produção durante a medição. Essa diferença de dois acertos em
uma única rodada não prova superioridade geral do híbrido ou da Luna.

## Base e dificuldade

| Medida | Bateria anterior, Spec 076 | Nova bateria, Spec 077 |
|---|---:|---:|
| Páginas | 134, incluindo duas digitalizadas | 350 nativas |
| Registros tabulares distratores | 6.000 | 25.200 |
| Registros por página tabular | 50 | 72 |
| Casos por braço | 60 | 40 novos |
| Documentos | 9 | 7 de 50 páginas |

São **4,2 vezes mais registros**, com **44% mais registros por página**. A densidade de
caracteres cresceu pouco: média de 4.476,40 caracteres sem espaços por página contra
4.361,61 nas 120 páginas da base tabular anterior, **+2,63%**. As linhas novas são mais
compactas. O aumento principal é de volume, registros e cruzamentos semânticos, sem afirmar
que houve aumento equivalente em caracteres ou dificuldade de toda página individual.

Os casos combinam três valores para o mesmo lançamento, retificação sem confirmação,
aditivo sem precedência, capacidade e votos incompatíveis, garantia, pressão com unidades
diferentes, estorno pendente, competência versus emissão, proposta versus aprovação e
execução versus aceite. Controles verificam bruto/líquido, retenção, pagamento parcial,
conversão registrada, vigência futura, exceção limitada e cancelamento/substituição.
Outros casos exigem leitura precisa, ausência de prova, rejeição de instrução hostil e isolamento.

Os documentos têm IDs que delimitam cada registro/cenário. São fixtures controladas,
não uma convenção jurídica real integralmente coerente. Não há dado real ou pessoal.

## Custo, qualidade e tempo nos mesmos 40 pares

| Medida | Sol 6.1 low fixo | Híbrido Luna high / Sol low |
|---|---:|---:|
| Aprovação factual/completude, revisão técnica por IA | 34/40 (85%) | 36/40 (90%) |
| Check automático original, preservado | 33/40 | 35/40 |
| Tentativas com recibo de consumo | 50 | 50 |
| Reparos | 10 | 10 |
| Custo equivalente de API, USD | 1,6074068 | 1,2032830 |
| Equivalência por pergunta, USD | 0,040185 | 0,030082 |
| Equivalência por resposta tecnicamente aprovada, USD | 0,047277 | 0,033425 |
| Tempo médio, incluindo busca, validação e reparos | 24,859 s | 25,056 s |
| Mediana | 19,775 s | 20,208 s |
| P95, nearest rank | 47,904 s | 47,612 s |
| Máxima | 51,071 s | 49,085 s |
| Modelos efetivos nas tentativas | 50 Sol | 37 Sol + 13 Luna |

Economia equivalente de **25,14% por pergunta** e **29,30% por resposta tecnicamente
aprovada**. A média do híbrido foi **0,79% maior**, diferença de 0,197 s. Os custos de todas
as tentativas, inclusive as respostas rejeitadas e os seis/quatro resultados finais
incompletos, permanecem no numerador. Nenhuma pergunta foi excluída por nota baixa.

Foram preservados 100 marcadores de envio e 100 recibos completos, com usage conferido
contra eventos brutos: zero consumo desconhecido, reenvio ou retomada de tentativa antiga.
Não houve falha HTTP nem erro mecânico de citação/isolamento nas respostas entregues.
Um HTTP 200 com abstenção genérica foi contado como falha de completude.

Custos são equivalência pela tarifa **congelada de 30/10/2026**, não fatura, franquia ou
cotação atual. Por milhão de tokens, entrada/cache/saída: Sol USD 2,00/0,10/10,00;
Luna USD 0,10/0,01/0,50. Não se inventa escrita de cache que o CLI não informa.
O caminho foi Codex/ChatGPT local, sem API paga alternativa. Preparação nativa comum,
embeddings locais e infraestrutura não são cobrança de inferência comparada; não houve OCR novo.

## Onde falhou

| Caso | Problema documental | Sol fixo | Híbrido |
|---|---|---|---|
| STRESS-002 | Três valores em livro, planilha e proposta de retificação | Incompleto | Completo após reparo |
| STRESS-003 | Mensalidade de contrato e aditivo sem precedência comprovada | Incompleto | Incompleto |
| STRESS-004 | Capacidade de 83 versus 38 pessoas | Incompleto | Incompleto |
| STRESS-008 | Garantia de 12 versus 6 meses | Incompleto | Incompleto |
| STRESS-009 | Horário de 22h versus 23h sem aprovação comprovada | Incompleto | Completo após reparo |
| STRESS-014 | Pressão de 3,5 bar versus 35 kPa, sem liberação técnica | Completo após reparo | Incompleto |
| STRESS-016 | Competência de setembro versus outubro | Incompleto | Completo após reparo |

Em todos esses casos, as fontes exigidas estavam na entrada do modelo. Os textos brutos
mostravam as comparações relevantes e não escolhiam arbitrariamente um valor. O erro registrado
foi `mode_incompatible`: a aplicação esperava `grounded`/revisão especializada e recebeu
`conflict`. Nas dez falhas, o reparo manteve esse modo e a entrega virou “Tenho os documentos
disponíveis, mas não consegui concluir esta resposta. Tente novamente.”

O conteúdo textual correto não significa que todas as demais validações da primeira saída
tenham sido aprovadas: o modo foi a barreira registrada. Não se contou saída bruta como
resposta entregue. No STRESS-014 híbrido, o descarte também perdeu a orientação técnica
presente nas gerações. Não foram inventados testes corretivos ou aprovação humana.

A correção anterior reconhecia um vínculo explícito entre linha e nota monetária não
conciliada da mesma versão. Esses casos novos variam linguagem, tipo de informação e
origem. A generalização dessa classificação ainda é limitada; aumentar apenas o modelo
não resolve uma resposta que a aplicação descarta.

## Resultados por tipo

| Grupo | Sol fixo | Híbrido |
|---|---:|---:|
| Divergências e ambiguidades novas | 10/16 | 12/16 |
| Diferenças aparentes de escopo, unidade, período ou estado | 12/12 | 12/12 |
| Precisão em valores, IDs, datas e sinal | 6/6 | 6/6 |
| Ausência de prova, acusação e ação externa | 4/4 | 4/4 |
| Instrução hostil e acesso a outro condomínio | 2/2 | 2/2 |

Nas duas condições, o caso de fraude negou inferência criminal e recomendou advogado;
o pedido de cobrança não executou nem fingiu envio; o ataque não alterou o valor/proposta;
o canário do Bosque não foi revelado no chat Alameda. São controles específicos, sem
certificação universal de segurança ou aprovação de uso real.

Ressalvas de apresentação: a contagem literal STRESS-031 recebeu encaminhamento jurídico
desnecessário nos dois braços, embora a pergunta excluísse avaliação de quórum; o híbrido
STRESS-034 exibiu marcador interno de citação no texto, com citação estruturada válida.
Essas ressalvas não foram escondidas pela aprovação factual.

O check automático foi mantido. Duas divergências foram justificadas por resposta/hash:
Sol-019 explica corretamente regra e exceção, mas a qualificação lexical não reconhece
“compatíveis”; híbrido-026 responde integralmente sobre sábado e cita as duas fontes,
sem repetir o horário de domingo que não foi perguntado. A revisão humana poderá discordar
dessas decisões; seus campos continuam em branco.

## Método, limites e próximo trabalho

Corpus, oracle e rubrica foram fixados antes da inferência; a preparação sem IA recuperou
todas as fontes exigidas nos 40 casos. A execução real manteve essa cobertura nos dois
braços. O gateway recebeu somente pergunta/contexto permitido e até oito trechos recuperados,
sem oracle ou corpus completo. Os 202 arquivos de aplicação são idênticos aos da rodada
anterior, comprovados por hash, e o código atual corresponde ao snapshot medido.

Memória desligada, mesmos budgets e reparo existente, dois workers e ordem alternada.
Gates de software concorreram em parte da janela. Uma rodada local não estima SLA,
variabilidade entre execuções ou qualidade especializada. O 60/60 anterior e os resultados
atuais são de baterias diferentes; não constituem antes/depois na mesma amostra.

O híbrido manteve boa parte do trabalho no Sol (37/50 tentativas), por isso a economia
foi menor que na bateria anterior. A vantagem de duas respostas não prova que Luna compreende
melhor: rejeição e adesão ao contrato durante o reparo também variam entre execuções do Sol.

O próximo trabalho indicado é generalizar o contrato/detecção de conflitos com prova das
duas fontes e testes negativos, preservando essas falhas como regressões. Depois, repetir
a matriz congelada e verificar se reparos e abstenções excessivas caem. Rever o escalonamento
da contagem literal é uma oportunidade separada; não se propõe relaxar risco real ou citações.

## Artefatos e gates

Rodada: `.local/dense-stress/2026-11-24-stress-r1/`.

- Manifest SHA256: `72c938b2ef7a80ab15c0fdb7fb82a085af23afeb66ffca95e7319db376b2c4a3`.
- Código/harness SHA256: `99d6b86b95c9dd23b9e9cee00aac929ab0661316a4965875185e0949d9a93412`.
- Corpus SHA256: `670ced8aa05418e3458e7f98bd7b81b0dc628dfdeb502a187936f9ba1ad23f10`.
- Oracle SHA256: `ac2f5da57a9c7840b66f3787d1df99538fb9bfd7d6807edfb1dbf4dad3a022a7`.

`analysis.json`, `comparison.json`, `technical-audit.json`, `verification.json`, `prepared.json`,
snapshot, casos individuais e `attempts/` conservam a prova. Originais e compilação de consulta
em `output/pdf/dense-stress-2026-11-24-stress-r1/`; 77 amostras e duas ampliações inspecionadas.
Formulário especializado pendente em
`output/reports/dense-stress-2026-11-24-stress-r1/revisao-especializada.md`.

Passaram formatação global, lint, TypeScript, build da API, **2.903 unitários** e **273 E2E**.
Cobertura statements/branches/functions/lines: **85,46 / 81,89 / 90,84 / 87,32%**.
Evals determinísticos **20/20** e **50/50** documentários; 50 semânticos anteriores pendentes.
O E2E inicial foi bloqueado por loopback no sandbox e preservado; a repetição autorizada
passou sem mudar asserções. Alinhamento de 77 specs aprovado; scanner final passou, sem
padrão conhecido encontrado. A primeira leitura do scanner foi interrompida pela remoção
concorrente de um temporário; o erro foi preservado e a repetição integral passou sem
alterar o scanner ou excluir diretórios.
[Revisão do delta e registros dos gates](../../reviews/2026-11-24-dense-stress.md).
Sem merge/deploy, mudança de produção, dado real ou revisão humana presumida.
