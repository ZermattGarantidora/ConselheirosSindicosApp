# Critérios de aceitação — Spec 010

## AC-1001 — Limite de consulta

**Dado** um usuário autorizado no mesmo condomínio  
**Quando** ele excede o limite de perguntas documentais da janela atual  
**Então** a API retorna `429`, inclui `Retry-After` e não executa uma nova consulta.

## AC-1002 — Limite de upload

**Dado** um usuário autorizado no mesmo condomínio  
**Quando** ele excede o limite de uploads da janela atual  
**Então** a API retorna `429`, inclui `Retry-After` e não grava um novo original.

## AC-1003 — Escopo independente

**Dado** que um limite de consulta foi atingido no condomínio A  
**Quando** outro usuário, outro condomínio ou a operação de upload é usada  
**Então** a operação correspondente continua disponível dentro de seu próprio limite.

## AC-1004 — Recuperação e configuração inválida

**Dado** que a janela de limite expirou  
**Quando** o usuário tenta novamente  
**Então** a operação é aceita; e uma configuração sem máximo ou janela positiva é rejeitada ao iniciar.
