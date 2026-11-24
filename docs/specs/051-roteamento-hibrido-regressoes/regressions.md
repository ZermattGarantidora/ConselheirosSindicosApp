# Erros observados e regressões — Spec 051

Os casos da Spec 050 continuam intactos. Os testes novos exercitam regras gerais com frases e valores variantes; o código não recebe IDs de cenário, resposta esperada ou decisão do avaliador.

| Erro observado | Correção e regressão determinística |
|---|---|
| Resumo altera saldo de 10 mil para 15 mil (`crosscutting-26/2`) | Guarda monetária em `citation-validator`; variantes 9.200→13.400, com e sem R$, negação, hipótese e conta verificável. Roteamento de adulteração para Sol antes da geração. |
| Continuação perde pessoa presa ou vazamento (`emergency-15/2`, `long-06/4`, `long-25/5`) | Resolver contexto de risco; três continuações e controles de assunto novo/emergência encerrada. |
| Mês corrigido e disponibilidade ordinária são perdidos (`long-01/3,9,10`, `long-39/8`) | Correção da competência na consulta, expansão financeira e recuperação de páginas complementares. Histórico persistido não é reescrito. |
| Janela recente é confundida com início da conversa (`long-36/17`) | Contrato informa `recent_only_start_unknown`; busca de nove registros conserva oito na saída e sinaliza recorte. Não recupera preferências que já saíram da janela. Resultado conversacional ainda depende da auditoria real. |
| Contrato do funcionário desaparece quando elevador também é citado (`long-17`) | Penalização de contrato passa a respeitar múltiplos assuntos; teste exige salário, jornada, limites/CCT e manutenção. O corpus não fornece um valor individual de encargos: nenhum é inventado. |
| Fato contratual é afirmado em abstenção sem citação (`labor-15/2`) | Recusar afirmação local positiva reconhecida na guarda de abstenção, mantendo pedido legítimo de fonte faltante. |
| Definição geral de ata/pauta recusada como fato local (`long-36/4,5`, matriz R2) | A guarda adicional exige especificidade local. Quatro definições gerais, seis afirmações locais e um claim sem evidência formam controles positivos e negativos; replay dirigido separado de 60 turnos, preservando a matriz R2. |
| Conclusão genérica não detecta conflito privado de locação (`long-35/30`) | Busca por subpergunta e detecção sobre assunto explícito das evidências, preservando as duas citações obrigatórias. |
| Retenção de imagens foi confundida com locação (`long-14/15`, investigação interrompida) | Extrair prazo da mesma cláusula de locação nas duas fontes e exigir consulta pertinente; controles negativos com imagens e barulho, e valores variantes 120/45 dias. Quatro fixtures unitárias antigas passaram a explicitar locação, mantendo asserções: dizer só “noventa dias” não prova seu assunto. |
| Pedido iniciado por “escreva” e pronomes perde fonte disponível | Continuação de redação e referências reconhecidas sem alterar mensagens persistidas; piso/CCT só vira risco alto em pedido de confirmação, com controle de consulta simples. |
| Versão confirmada e minuta perdem campos comparáveis (`long-03`, `long-23`) | Teste de taxas/horários em ambas as versões; nenhum relaxamento de `pending`/`disputed`. |
| Ampliação da busca poderia misturar tenants ou material ilegível | Controle composto mantém tenant autorizado, qualidade, limite de oito trechos e fontes de ambos os períodos. |
| Custo híbrido seria calculado como se todas as chamadas fossem Luna | Cada observação registra o modelo; teste mistura as duas tarifas e uma tentativa sem usage, mantendo subtotal desconhecido. |

As duas suítes novas são `tests/unit/hybrid-routing-regressions.test.ts` e `tests/unit/hybrid-evidence-regressions.test.ts`. Os testes existentes continuam cobrindo autorização, revalidação de documentos removidos, contrato, citações, isolamento e correção única. Asserções e oráculos da suíte de 280 conversas foram preservados.

As guardas são deliberadamente limitadas: correspondência numérica não prova correspondência de rubrica, regex não constitui revisão semântica e recuperar fonte não garante que o modelo resolva a tarefa completa. Fechamento de conversas longas, prioridade correta e sustentação textual exigem avaliação das saídas. Erros remanescentes devem aparecer no relatório, sem alterar os oráculos para elevar notas.
