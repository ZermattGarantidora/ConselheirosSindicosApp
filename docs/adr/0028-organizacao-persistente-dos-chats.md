# ADR 0028 — Organização de chats no servidor

**Status:** aceito  
**Data:** 2026-10-20

## Decisão

A Spec 038 substitui a organização efêmera da Spec 018 por metadados de chat no servidor, com
chave composta de condomínio, usuário e chat e RLS forçada. Perguntas recebem vínculo opcional
ao chat na transação que já persiste a interação. Anexos mantêm referências a versões privadas;
ocultar o chat não apaga a trilha documental. Nenhum título ou conteúdo é salvo em localStorage.

O chat vazio começa no cliente com UUID novo em cada entrada. Seu registro no servidor é
idempotente no primeiro envio/renomeação, evitando acumular entradas vazias. Histórico sem chat
explícito aparece sob identificador reservado de legado; o filtro é por usuário e condomínio.
Paginação usa data e ID para não perder turnos simultâneos.

PostgreSQL conserva organização e mensagens entre reinícios. A demonstração conserva os mesmos
contratos em memória e mantém a limitação do ADR 0021: reinícios apagam seu estado. O banco Neon
de integração não é usado como armazenamento da demonstração.

## Consequências e reversibilidade

Não há dependência, provedor ou prompt novo. A migração é aditiva; código antigo pode ignorar o
vínculo opcional e continuar lendo o histórico. Reverter colunas/tabelas de organização conserva
as interações auditáveis e perde apenas agrupamentos/referências de chat; exige backup dos
metadados antes desse rollback. Exclusão de originais remove suas referências auxiliares.
