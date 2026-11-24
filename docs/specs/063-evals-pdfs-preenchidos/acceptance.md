# Aceitação — Spec 063

- **AC-6301 / RQ-6301:** plano enumera 35 PDFs / 80 páginas e 160 perguntas nas duas condições; original e texto integral conferidos; gabaritos não aparecem no gateway.
- **AC-6302 / RQ-6302:** sem `--execute` há zero chamadas. Com execução, telemetria identifica somente Luna high/Sol 6.1 low, sem ferramentas ou fallback pago.
- **AC-6303 / RQ-6303:** grade detecta fato ausente/incorreto e fonte inválida; aprovação mecânica não preenche aprovação semântica. Fonte ausente no input é registrada separadamente.
- **AC-6304 / RQ-6304:** checkpoint íntegro evita repetição; adulteração e snapshot divergente bloqueiam retomada. Falha concluída não é substituída.
- **AC-6305 / RQ-6302–6304:** relatório conserva todos os pontos, respostas, tentativas/usage e limites; revisão técnica de IA e revisão especializada têm estados distintos.
