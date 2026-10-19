# ADR 0024 — Análise estruturada sobre páginas autorizadas

**Status:** aceito para implementação sintética
**Data:** 2026-10-16

## Decisão

A integração das Specs 028–032 reutiliza `document_pages` e seu texto já extraído, sob RLS e elegibilidade documental. Os derivados determinísticos são construídos durante o pedido, limitados a 500 páginas e dois milhões de caracteres. Não há nova persistência, cache, envio a provedor ou repetição de OCR.

O relatório operacional acompanha o turno HTTP, separado da fala contextual e do contrato persistido de respostas. Isso permite cálculos verificáveis sem alterar o system prompt aprovado. A restauração de histórico não promete recuperar esse relatório transitório.

## Consequências

Retenção e remoção continuam controladas pelas páginas existentes; uma consulta nova nunca reutiliza derivado de documento removido. O custo computacional é limitado e não há migração de banco. Persistir derivados no futuro exigirá schema/RLS, retenção, purge e migração próprios. Validação de provedor e revisão especializada seguem pendentes, sem liberação de dados reais.
