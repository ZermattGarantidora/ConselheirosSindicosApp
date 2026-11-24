# Critérios de aceitação — Spec 049

| Critério | Requisito | Exemplo verificável |
|---|---|---|
| AC-4901 | RQ-4901 | Enviar balancete sem pergunta entrega dez pontos, até três prioridades e fontes; enviar ata conserva resumo da versão única. |
| AC-4902 | RQ-4902/4904 | Saldo inicial R$ 1.000 + receitas R$ 10.000 − despesas R$ 8.000 versus final R$ 2.500 identifica diferença de R$ -500, com quatro parcelas e competência citadas. Sem saldo inicial, pede essa informação sem presumir zero. |
| AC-4903 | RQ-4903 | Receber março com janeiro/fevereiro disponíveis compara ambos automaticamente. Futuro não participa; mês disponível não é solicitado novamente; lacuna pede o mês exato. Base zero mantém diferença exata e percentual indisponível. |
| AC-4904 | RQ-4902/4904 | Orçamento mensal e extrato do período permitem cruzamentos; documentos de outro período não os confirmam. Comprovante só conta para rubrica/valor/período explicitamente vinculados. Sem apoio, nomeia o documento necessário. |
| AC-4905 | RQ-4903/4904 | Duplicidade de mês/rubrica, caixa versus competência, conflito de plano, período incerto, tabela ambígua e baixa qualidade são expostos; não escolhe fonte silenciosamente nem certifica saúde financeira. |
| AC-4906 | RQ-4905 | Outro tenant, pendências, remoção de apoio ou revogação durante geração não vazam informação. Reader adulterado, instrução hostil e limites estourados falham com mensagem segura. |
| AC-4907 | RQ-4901/4904 | Interface apresenta prioridades, dez estados, pedidos e próximos passos; fontes abrem a página correta e texto é escapado. Falha do gateway preserva conferência local; nenhum conteúdo extra é enviado ao modelo. |

Complementos de AC-4904: extrato segregado do fundo exige conta correspondente e mesma competência; a verificação do saldo não certifica autorização de uso. Relação do mês seguinte com abrangência declarada completa permite somar vencimentos válidos, confrontar seu total e alimentar a liquidez; datas inválidas ou de outro mês não entram nessa soma. Totais conflitantes exigem esclarecimento. Comprovante único não confirma dois lançamentos duplicados.

## Regressão do envio conjunto de balancetes em 29/10/2026

- **AC-4904b:** suporte parcial explicita valor comprovado e parcela pendente, cita os apoios existentes e pede o saldo; ambiguidade/duplicidade/excesso não certifica uma soma nem produz parcela pendente negativa. Exemplo: R$ 9.688,75 = R$ 9.382,80 com suporte + R$ 305,95 pendentes.

- **AC-4904a (caderno financeiro da Spec 073):** uma despesa agregada pode ser apoiada por vários comprovantes com vínculo explícito, identificadores distintos e mesma competência. A soma em centavos deve corresponder ao total. Soma parcial, identificador repetido ou valor ambíguo não confirmam suporte integral; não se presume execução ou pagamento.

- **AC-4903a:** dois balancetes com a mesma rubrica de despesa e seções `Compromissos conhecidos de fevereiro de 2026` / `Compromissos conhecidos de março de 2026`, com datas válidas correspondentes, comparam a despesa realizada e preservam os compromissos nas linhas de origem, sem alertar ausência de equivalência entre vencimentos diferentes.
- **AC-4903b:** datas inválidas, isoladas, anteriores ou de mês diferente do cabeçalho, cabeçalho com mais de um período e lançamentos sob nova seção de receitas/despesas não são excluídos automaticamente. Rubrica realizada ausente continua gerando a limitação específica, sem preenchimento com zero.
- **AC-4903c:** `Regime de caixa. Valores em reais. Plano de contas JH-2026.` nos dois documentos permite comparar com citação da declaração. Regime/plano concorrente ou divergente suspende a comparação; declaração negada ou sem limites claros não é presumida como campo.
- **AC-4902a:** os quatro rótulos consolidados do kit de 40 unidades permitem calcular o fechamento. Junho com inicial R$ 91.310,00, receitas R$ 42.710,00, despesas R$ 68.210,00 e final informado R$ 67.310,00 expõe diferença de R$ 1.500,00, com as quatro fontes. Não infere disponibilidade operacional nem conciliação.
- **AC-4902b:** o principal em aberto no fim de R$ 5.100,00 para R$ 13.290,00 é comparado como inadimplência de principal, mantendo as fontes e a distinção de caixa.

Essa regressão detalha RQ-4902/4903/4904 no Bloco 7, preservando os limites das Specs 028/033: sem reconhecimento geométrico, taxonomia inferida, alteração de prompt, provedor ou nova forma de escrituração.
