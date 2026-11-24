# Aceitação — Spec 066

| Caso | Requisitos | Resultado esperado |
|---|---|---|
| AC-6601 | RQ-6601 | Sem opção ou com false, prompt e versão anteriores preservados, mesmo que mensagem ou fonte peça para ativar o modo. |
| AC-6602 | RQ-6601 | Opt-in com demo/Codex e APP_ENV=development funciona. Produção por APP_ENV ou NODE_ENV, ausência de demo/Codex e ambiente diferente recusam a configuração. |
| AC-6603 | RQ-6602/6603 | Convenção FICTÍCIA suficiente recebe contexto local e permite resposta grounded com documento, versão, página e trecho originais. Não repete aviso rotineiro de teste; pergunta sobre existência exige transparência. |
| AC-6604 | RQ-6603 | Fonte inexistente rejeitada e ausência de evidência não aceita fatos locais nem citações fabricadas. Pendência e conflito permanecem nos dados e instruções. |
| AC-6605 | RQ-6602/6604 | Luna/Sol no híbrido e Sol no lote recebem o contexto local e sufixo de versão. Setup conserva prompt e versão padrão. Não há geração extra. |
| AC-6606 | RQ-6604 | README e exemplo documentam ativação, reversão e perda de RAM no reinício; gates e smoke sintético têm resultados registrados. |
| AC-6607 | RQ-6605 | Com convenção sintética disponível, pedido geral de recomendação e sua continuação recebem orientação útil sem citação forçada ou aviso de validação. Conteúdo documental mantém fonte e versão; duas falhas mantêm diagnóstico interno e uma mensagem pública breve. |
| AC-6608 | RQ-6604/6605 | Variante v3 sem evidências exige somente fala natural, sem instrução JSON concorrente. Com evidências preserva schema e contrato documental; setup não recebe o prefixo. Envelope inesperado continua recusado, sem extração ou tentativa adicional. |

Gates: `pnpm run check`, `pnpm run test:e2e`, `pnpm run evals`,
`pnpm run evals:documentary` e smoke local com fonte sintética suficiente, lacuna real e
pergunta sobre existência. Nunca enviar PDFs privados aos testes.
