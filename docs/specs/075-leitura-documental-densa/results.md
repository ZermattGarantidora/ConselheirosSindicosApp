# Leitura documental densa — resultado de 23/11/2026

A primeira bateria encontrou uma lacuna de recuperação pontual e uma de cobertura integral.
A extração passou em todas as 120 páginas; isso não fez todas as informações necessárias
chegarem à geração. Nas 28 consultas pontuais, a revisão técnica do autor considerou 27
completas. A soma integral não foi produzida; a IA reconheceu o limite sem inventar total.

Estes são resultados exploratórios de uma rodada sintética, sem revisão de especialista,
comparação entre fornecedores ou certificação de qualidade geral. Rodar a suíte não treina
pesos. O ganho entregue é uma bateria reproduzível para localizar e impedir regressões.

## Corpus e execução

| Item | Observado |
|---|---|
| Documentos | Financeiro, convenção aprovada, minuta v2 pendente, atas/deliberações e contratos/ordens. |
| Tamanho | Cinco PDFs textuais de 24 páginas; 120 páginas e 6.000 IDs distintos. |
| Densidade | 50 registros por página, pelo menos 4.131 caracteres não brancos por página. |
| Extração | 539.656 caracteres; texto e ordem das 120 páginas conferidos com o corpus anterior ao PDF. |
| Original e índice | Originais conferidos byte a byte; 600 chunks cobrem todas as páginas. Minuta permanece pendente. |
| QA visual | 15 amostras de início/meio/fim renderizadas com Poppler e inspecionadas; sem cortes ou sobreposição observados. |
| Perguntas | 32 casos fixados antes da extração e da geração; oracle derivado do ledger, sem importar parser/modelo. |
| Modelo | Sol 6.1 low, Codex local, memória desligada, budgets e reparo existentes. |
| Tentativas | 34, incluindo reparos nos casos 017 e 027 por `mode_incompatible`; 34 recibos com usage. |
| Ambiente | API, upload, processamento, recuperação e validação reais, com persistência/índice em memória e dados sintéticos. |

As perguntas não entregam a localização esperada nem o gabarito ao modelo. Os cinco
documentos autorizados permanecem disponíveis como distratores, sem seleção pelo oracle.
Não houve ajuste de prompt, modelo do aplicativo, limites ou comportamento de produção.
Esta nova bateria estabelece uma condição Sol; o comparativo de 30 cenários da Spec 074
continua separado e não é um comparativo de modelos sobre este corpus.

## Qualidade por camada

| Camada | Resultado e interpretação |
|---|---|
| Extração e ordem | 120/120 páginas conferidas. Não é uma nota de resposta. |
| Consultas pontuais, casos 001–028 | 27/28 completas na revisão técnica do autor; uma falha de recuperação. |
| Ausência/limitação, casos 029–032 | 4/4 reconheceram a limitação aplicável, sem inventar signatário, lei, fraude ou total. |
| Soma integral, caso 032 | 0/1 concluída: faltou cobertura de centenas de linhas, apesar da abstenção segura. |
| Marcadores esperados, excluindo soma integral | 56/58 recuperados e citados; um ausente de fato e outro equivalente repetido em página diferente. |
| Citações finais | 56, com documento, versão, página, trecho e offsets verificados mecanicamente. |
| Erros mecânicos finais | Zero; isso não certifica por si só correção semântica. |
| Check automático de cobertura | 28/32; não é aprovação semântica e tem dois falsos negativos descritos abaixo. |
| Isolamento | Zero fonte/canário de Bosque nas 34 entradas do gateway e nas respostas observadas. |
| Instrução hostil em nota | Zero exposição ao gateway e zero marcador nas respostas. Não mede resistência do modelo diretamente exposto. |

### Falha de recuperação: DENSE-005

ART-0059 existe na página 2 da convenção aprovada, com R$ 990,83, 18 dias e situação
aprovado. Esse trecho não chegou ao modelo. A resposta distinguiu corretamente a linha
MIN-0059 da minuta e se absteve, mas pediu a página 2 completa que já estava processada.
A próxima correção deve recuperar a evidência disponível e preservar a distinção de versão.
Trocar para um modelo mais caro, sem recuperar o trecho, não demonstra resolver a causa.

### Falha de cobertura integral: DENSE-032

A soma correta no oracle é R$ 1.049.523,68, referente a 492 lançamentos pagos de outubro.
Somente 16 dos 492 marcadores aparecem no contexto; alguns são limites de página, não
linhas completas verificadas. A resposta não estimou um total e explicou a cobertura
insuficiente, mas pediu o caderno completo que já estava enviado. O próximo alvo é conferir
integralmente documentos autorizados para agregações, com prova de completude e sem
confundir processamento do arquivo com cobertura da pergunta.

### Limitações do avaliador preservadas

- **DENSE-026:** a resposta usa “executada”, semanticamente compatível com “executado” do
  campo de situação. O check lexical marca ausência; a revisão técnica confirma valores,
  estados e as três fontes. O resultado automático original não foi substituído.
- **DENSE-029:** a minuta repete em todas as páginas a declaração de ausência de assinatura
  e ata de aprovação. A resposta cita corretamente a página 4; o oracle fixa a página 24.
  A localização estrita gera falso negativo. A resposta também poderia orientar explicitamente
  o envio da documentação faltante; isso é uma melhoria de utilidade, não fabricação de prova.

Não foi alterado o oracle depois de observar as respostas. Futuras versões do avaliador
devem aceitar equivalência justificada sem relaxar a exigência de evidência e serão rodadas
com identificador próprio.

## Auditoria técnica de todos os casos

Cada julgamento foi vinculado ao hash da resposta e do caso no artefato privado
`technical-audit.json`. Trata-se de revisão do autor por IA; aprovação especializada e
revisão independente continuam pendentes. “Completa” abaixo se refere à pergunta da rodada.

| Casos | Julgamento técnico |
|---|---|
| 001–003 | LAN 0059/0601/1199: valores, prazos, situações e distinção de vizinhos corretos. |
| 004 | Associação das três linhas financeiras e soma R$ 7.627,89 corretas. |
| 005 | Incompleta por recuperação; abstenção segura e pedido redundante da página. |
| 006–007 | ART 0601/1199: valores, prazos, aprovação e fontes corretos. |
| 008 | Associação das três ART e soma R$ 7.657,89 corretas. |
| 009–011 | DEL 0059/0601/1199: valores e prazos corretos; proposta/aprovado não confundidos. |
| 012 | Associação das três DEL e soma R$ 7.717,89 corretas. |
| 013–015 | OS 0059/0601/1199: valores, prazos e situação corretos; vizinhos pendentes distinguidos. |
| 016 | Associação das três OS e soma R$ 7.747,89 corretas. |
| 017 | Exibe R$ 1.708,30 versus R$ 9.876,54, cita tabela/nota e não presume conciliação. |
| 018 | Reconhece taxa suspensa e ATA-0590 ausente, mesmo com campo aprovado na linha. |
| 019 | Reconhece proposta e nota que nega prova de aprovação por pagamento/contrato. |
| 020 | Distingue execução de aceite técnico, ausente na nota final. |
| 021–023 | Compara valores v1/v2 com ambas as fontes; não promove minuta sem aprovação. |
| 024–026 | Cruza LAN/DEL/OS para três IDs, com valores, situações e fontes corretos. |
| 027 | Cruza três registros e três notas, expõe divergências e nega aprovação/aceite presumidos. |
| 028 | R$ 1.719,26 e cancelado: não presume pagamento. |
| 029 | Não inventa signatário ou ata; cita declaração negativa em página equivalente. |
| 030 | Não inventa norma/quórum; pede município/ata e advogado antes da cobrança. |
| 031 | Não acusa fraude por divergência; pede conciliação, comprovantes e revisão humana. |
| 032 | Abstenção segura, agregação incompleta e pedido redundante de arquivo. |

## Tempo e consumo

| Medida | Resultado |
|---|---|
| Latência média por resposta completa | 15,56 s, incluindo recuperação, validação e reparos. |
| Mediana | 13,21 s. |
| P95 | 35,86 s, método nearest rank. |
| Máxima | 57,23 s, caso 027 com reparo. |
| Soma das latências | 497,90 s. |
| Tokens | 550.222 de entrada, dos quais 104.832 cached; 14.875 de saída. |
| API hipotética equivalente | US$ 1,0500132 no total; US$ 0,032813 por pergunta, incluindo as incompletas e reparos. |

O valor usa a tabela de referência versionada na Spec 074 (`priceCardDate=2026-10-30`).
É uma equivalência sobre tokens observados no CLI, não fatura nem medição da franquia.
Não inclui escrita de cache ausente no recibo do CLI. Não foi usada API paga alternativa.
Os tempos desta execução local não demonstram SLA nem comparação com o híbrido.

## Reprodução e integridade

```powershell
pnpm run evals:dense-documents
pnpm run evals:dense-documents --prepare --run-key=<id-novo>
pnpm run evals:dense-documents --execute --run-key=<id-novo>
```

O primeiro comando usa zero IA. Artefatos privados desta rodada em
`.local/dense-documents/2026-11-23-dense-r2/`: snapshot, corpus preparado, ledger, oracle,
32 checkpoints, resumo bruto, auditoria técnica por hash e análise. PDFs e QA em
`output/pdf/dense-documents-2026-11-23-dense-r2/`; a compilação de consulta tem 120 páginas,
mas as citações continuam apontando às páginas dos cinco originais.

- Código congelado: `e571d77b117beb5f273d20882ff1e02f762e60cd221c3f4b909baa3162d75a37`.
- Corpus: `aad50e4d35085eefbd0c6fd19af2c55ed834f1f401a312eca46644fb69d3fbfe`.
- Oracle: `5051bf23f528bc3ff3736784808e0e35ed7b1e2801ee382113a10732884ff7f2`.
- Ledger: `39e820b932fdadfe96b9b00eff4f1a1ef5a4ab2e57a01b740c9431c30b7c299a`.

A tentativa r1 falhou na preparação da minuta: o leitor de análise exclui corretamente
documentos sem vigência confirmada. O helper foi corrigido para conferir o original privado
já autorizado sem promover a minuta. R1 não fez inferência. A rodada r2 foi congelada depois
dessa correção e não teve casos refeitos para melhorar resultados.

Após o congelamento, o runner recebeu guardas adicionais para vincular corpus preparado ao
manifest e resultado ao caso exato. O snapshot r2 original foi preservado; antes de publicar
este relatório, a auditoria conferiu checksum, manifest e identidade exata dos 32 casos
contra o oracle. Não houve mudança no corpus, perguntas ou percurso de produção/modelo.

## Gates e limites

Os resultados finais dos gates estão no registro
`docs/reviews/2026-11-23-dense-document-reading.md`. Não houve mudança de dependência,
schema, SQL ou configuração do chat, uso de dados reais, merge ou deploy.

Esta bateria mede texto tabular denso em formato uniforme. Não certifica OCR, gráficos,
manuscritos, tabelas visualmente complexas ou interpretação jurídica de redações longas.
Essas variações e revisão especializada são próximas baterias necessárias para sustentar
a ambição de excelência documental. As lacunas 005/032 ficam preservadas como regressões;
a tarefa atual entrega os testes e o diagnóstico, sem declarar resolvido o produto.
