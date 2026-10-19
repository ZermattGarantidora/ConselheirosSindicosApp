# Critérios de aceitação — Spec 033

**Status:** aprovada para implementação local  
**Atualizado em:** 2026-10-16

## AC-3301 — Células e linhas citáveis (P0)

**Dado** uma tabela textual íntegra delimitada por `|`  
**Quando** ela é extraída  
**Então** cada linha e célula mantém página, trecho e offsets em code points.

## AC-3302 — Subtotal não duplica rubrica (P0)

**Dado** linhas de despesa e uma linha explícita de subtotal  
**Quando** a extração termina  
**Então** apenas as despesas aparecem como rubricas financeiras  
**E** o subtotal permanece citável na tabela.

## AC-3303 — Corte exige revisão (P0)

**Dado** uma tabela com coluna terminal vazia ou contagem de colunas inconsistente  
**Quando** a extração termina  
**Então** a tabela fica em `needs_review`  
**E** nenhuma de suas linhas gera rubrica financeira.

## AC-3304 — Rubrica multilinha sustentada (P1)

**Dado** uma linha de continuação imediatamente antes de uma linha tabular íntegra  
**Quando** a extração termina  
**Então** a rubrica conserva as duas linhas  
**E** a fonte cobre o trecho integral usado.
