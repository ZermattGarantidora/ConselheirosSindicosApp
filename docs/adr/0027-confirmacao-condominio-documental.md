# ADR 0027 — Conferência de condomínio na extração existente

**Status:** aceito  
**Data:** 2026-10-20

## Contexto

A Spec 037 exige questionar nomes divergentes sem permitir consulta prematura nem bloquear a recepção assíncrona. A extração já ocorre uma vez no pipeline privado e `needs_review` já impede retrieval e análise.

## Decisão

- Identificar sinais explícitos deterministicamente no título e identificação inicial das páginas existentes, sem prompt ou provedor novo.
- Capturar o nome selecionado no servidor ao registrar cada upload. Persistir esse snapshot e `condominium_check` no estado da versão, protegido pela RLS existente. O título original de cada versão fica em `document_versions.source_description`, evitando conferir uma versão nova pelo nome do primeiro arquivo.
- Havendo divergência, conservar páginas e derivados no mesmo tenant e manter `processing_status = needs_review`. Índices não ficam elegíveis para busca enquanto a pendência existir.
- A confirmação autorizada registra usuário e instante e restaura somente o estado da extração; não modifica vigência, condomínio ou documento original.
- Reutilizar o mesmo comparador na demonstração e no worker persistente. Documentos anteriores sem snapshot não são reclassificados automaticamente.

## Consequências

Nenhuma nova dependência, chamada externa ou reextração. A migração é aditiva e reversível removendo as duas colunas após rollback do código; remover as colunas descarta as decisões e exige reprocessar os anexos afetados antes de liberar sua consulta. Reconhecimento semântico e nomes implícitos permanecem fora da promessa. Pendência em original de outro condomínio é dado explicitamente enviado e privado do contexto de recepção, nunca autorização para consultar o tenant cujo nome aparece no arquivo.
