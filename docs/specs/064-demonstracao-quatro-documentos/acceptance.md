# Aceitação — Spec 064

- **AC-6406 / RQ-6404:** plano mostra três roteiros de 30 turnos, seis chats e 180 respostas, Luna high/Sol 6.1 low, sem inferência por padrão; quatro PDFs idênticos às rodadas curtas.
- **AC-6407 / RQ-6404:** cada roteiro usa o mesmo chat e o histórico real do próprio modelo. Um controle determinístico demonstra referência ao turno anterior e registro dos dois lados; outro chat não fornece esse contexto.
- **AC-6408 / RQ-6404:** capturas mostram limites de oito turnos/12.000 bytes, recorte após turnos longos e separação entre fonte ausente, detalhe fora da janela e omissão na geração. Nota não presume memória ilimitada nem transforma relato em prova.
- **AC-6409 / RQ-6404:** checkpoints preservam todos os turnos e resultados, inclusive rejeições; histórico final confere textos/ordem dos dois lados. Roteiro concluído não repete inferências e parcial impede recomeço silencioso. Resultados identificam revisão técnica por IA e limites.
- **AC-6410 / RQ-6404:** recusa definitiva observada não conta como completa nem como limitação legítima no avaliador, mesmo quando há uma mensagem de fallback não vazia. Reparo bem sucedido sem recusa definitiva conserva a avaliação normal; correção do detector não reescreve checkpoints anteriores.

- **AC-6401 / RQ-6401:** quatro PDFs, oito páginas textuais, nome compatível, hashes dos originais e leitura completa; não se inferem fatos reais.
- **AC-6402 / RQ-6402:** plano de 120 e 60 respostas, modelos/esforços fixos, zero chamadas por padrão, até quatro simultâneas e gabarito fora do gateway.
- **AC-6403 / RQ-6402:** snapshot/checkpoint adulterado bloqueia retomada; falhas concluídas permanecem; relatórios separam rodadas e modelos.
- **AC-6404 / RQ-6403:** rubric detecta fato ausente, texto de protocolo, citação inexistente e conclusão sem base. Presença de fonte distingue recuperação de geração; revisão especializada não é declarada concluída.
- **AC-6405 / RQ-6403:** toda correção tem critério e regressão; resultado final informa falhas residuais e não troca o gabarito para aprovar a saída.
