# Notas de integração — Spec 033

`StructuredTable.rows[].cells[]` é o contrato público para consumidores que precisam exibir ou auditar uma tabela. Só tabelas em estado `known` podem fornecer entradas financeiras; `needs_review` requer solicitação de página completa ou revisão humana.

O mapa `tableExecutors` está conectado ao runner canônico `pnpm run evals:documentary`; os três cenários usam o contrato real do extrator e contam somente após suas asserções passarem.

Limite deliberado: `|` é um delimitador textual de fixture e integração, não prova de que toda tabela de PDF real poderá ser reconhecida.
