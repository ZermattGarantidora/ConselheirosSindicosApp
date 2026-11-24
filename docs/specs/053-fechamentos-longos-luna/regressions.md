# Falhas anteriores e regressões — Spec 053

Referência imutável: `2026-10-28-luna-quality-r1`. As posições abaixo continuam no dataset original; nenhum oráculo foi relaxado. Os testes locais validam regras e controles negativos, não provam que a nova saída do Luna resolverá cada caso. Essa conclusão depende da auditoria da R3 completa; a R2 foi interrompida e seus resultados e custos permanecem preservados.

| Família observada | Casos da R1 | Requisito / regressão local |
|---|---|---|
| Entidade corrigida perdida | long-07/10 | RQ-5301; identificador corrigido, negação da unidade antiga, comparação de ambas e fronteira de assunto. |
| Síntese parcial financeira/documental | long-01/10, long-18/15, long-22/20, long-23/20 | RQ-5302; tópicos/requisitos de perguntas acionáveis, extratos/reserva/comprovantes e controles de definição/conversa independente. |
| Aviso/multa substituídos por preço e versão | long-04/10, long-24/13, long-24/20 | RQ-5301/5302/5303; seleção de cláusula, detecção de omissão, modo de conflito e projeção das fontes já citadas nos claims. |
| Falha após validação | long-16/15, long-21/20, long-31/30 | RQ-5303; contrato de correção e schema de especialista/claims. Datas, percentuais e jornadas não viram dinheiro por proximidade. Não garante correção de qualquer cálculo. |
| CCT ausente e alteração de modalidade | labor-15/2, long-26/10, long-26/20 | RQ-5301/5303; lacuna de CCT, orientação geral útil no pedido exclusivo e preservação de evidências em pedido composto. Mudança de assunto/contexto segue coberta pelas suítes de memória. |
| Próxima ação/aceite ou unidade incompletos | long-25/20, long-27/20, long-32/30, long-36/30, long-37/30, long-38/30 | RQ-5301/5302; continuação de verificações humanas, perguntas literais, omissões e esclarecimento de janela parcial. Não procura detalhes fora da janela. |
| Afirmação sem citação pública | long-09/6 | RQ-5303/AC-5304b; exibir somente referências autorizadas dos claims. Não inventar claim ou reaproveitar documento retirado. |
| Regressão determinística de conflito | EVAL-008 | RQ-5301; mínimo de locação por formulações equivalentes e plural, sem confundir prazo de retenção de imagens. |

Regressões novas em `tests/unit/long-conversation-regressions.test.ts`, junto às suítes existentes de contexto, memória, conflitos, recuperação, parser e segurança. Casos positivos e negativos mantêm fonte inexistente, minuta como fato, abstenção documental, revogação, teto de duas gerações e isolamento bloqueados. Esforço, Luna/memória, datasets e prompt permanecem iguais.

## Resultado observado da R3

O teste local valida o comportamento das regras; não ensina o modelo nem substitui a avaliação da resposta real. Os 280 cenários e oráculos foram preservados e executados. As 7 falhas e 13 parciais atuais continuam registrados como regressões a tratar.

Recuperações incluem conferências do contador em long-21, aviso/multa em long-04 e long-24/13, pauta em long-36 e fechamento documental em long-37. Permanecem a seleção inequívoca de U-B em long-07, a orientação trabalhista em long-26/10 e omissões de reserva, assembleias e aceite. Novas recusas genéricas aparecem em long-13, long-18, long-28, long-33 e crosscutting-26; o código de validação não prova o conteúdo rejeitado. A orientação temporal em long-15 e a citação pública em long-18/5 também precisam de correção.

[Todas as decisões pareadas e limitações](observed-results-2026-10-28.md). Nenhuma falha foi substituída por um replay bem-sucedido; os replays anteriores de recuperação e a R2 interrompida continuam separados.
