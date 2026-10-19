# Pacote de revisão especializada — avaliação semântica documental

Este pacote usa somente documentos e identidades sintéticas. Cada ficha é gerada por `cases.ts` e contém pergunta, fontes com documento/versão/página/trecho, resultado esperado, severidade, rubricas e revisores requeridos.

Para cada caso, o revisor deve registrar independentemente: resultado correto (`aprovar`, `reprovar` ou `insuficiente`), citação que o sustenta, eventual extrapolação, necessidade de abstenção/conflito/escalonamento e justificativa curta. Contador revisa cenários financeiros; jurista revisa atas, normas e contratos; síndico revisa utilidade, clareza e próximo passo.

O replay do gateway verifica apenas contrato de entrada, isolamento sintético e citação válida. Mesmo quando concluir sem erro, seu estado é `pending_specialist_review`: não mede correção de modelo e não substitui revisão humana.
