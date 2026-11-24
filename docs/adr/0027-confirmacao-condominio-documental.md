# ADR 0027 — Conferência de condomínio na extração existente

**Status:** aceito  
**Data:** 2026-10-20

## Contexto

A Spec 037 exige questionar nomes divergentes sem permitir consulta prematura nem bloquear a recepção assíncrona. A extração já ocorre uma vez no pipeline privado e `needs_review` já impede retrieval e análise.

## Decisão

- Identificar sinais explícitos deterministicamente no título e identificação inicial das páginas existentes, sem prompt ou provedor novo.
- Ao extrair o nome do título, tratar “Preenchida” após o nome explícito como descritor genérico do arquivo, não como parte do nome do condomínio.
- Capturar o nome selecionado no servidor ao registrar cada upload. Persistir esse snapshot e `condominium_check` no estado da versão, protegido pela RLS existente. O título original de cada versão fica em `document_versions.source_description`, evitando conferir uma versão nova pelo nome do primeiro arquivo.
- Havendo divergência, conservar páginas e derivados no mesmo tenant e manter `processing_status = needs_review`. Índices não ficam elegíveis para busca enquanto a pendência existir.
- A confirmação autorizada registra usuário e instante e restaura somente o estado da extração; não modifica vigência, condomínio ou documento original.
- Reutilizar o mesmo comparador na demonstração e no worker persistente. Documentos anteriores sem snapshot não são reclassificados automaticamente.

## Consequências

Nenhuma nova dependência, chamada externa ou reextração. A migração é aditiva e reversível removendo as duas colunas após rollback do código; remover as colunas descarta as decisões e exige reprocessar os anexos afetados antes de liberar sua consulta. Reconhecimento semântico e nomes implícitos permanecem fora da promessa. Pendência em original de outro condomínio é dado explicitamente enviado e privado do contexto de recepção, nunca autorização para consultar o tenant cujo nome aparece no arquivo.

## Ajuste de experiência — 2026-10-27

A pedido do usuário, a conferência e seus resultados passam a ser falas geradas pelo gateway
existente, recebendo apenas enums operacionais e marcadores genéricos. Nomes e título permanecem
locais e substituem os marcadores em uma única passagem depois da geração. A identificação de nomes e a decisão continuam
determinísticas e separadas da geração: a IA não renomeia, confirma ou muda contexto. O servidor
revalida acesso e estado antes de devolver a fala. Sem alteração do system prompt, pacote,
provedor, schema ou autorização de dados reais. A afirmação acima sobre ausência de chamada
externa continua aplicável à identificação; gerar a fala usa o provedor já configurado.

## Ajuste da identificação de nome no arquivo — 2026-11-03

O sufixo “Preenchida” em título de arquivo, quando vem após o nome explícito do condomínio, é
um descritor genérico do documento e não parte da identificação. Cabeçalho e título que identificam o mesmo
condomínio não devem criar uma confirmação. Outros nomes adicionais continuam divergências; não
há comparação semântica ou autorização automática.

## Decisão pela conversa e cabeçalho com competência — 2026-11-03

Mês e ano explícitos anexados ao cabeçalho são metadados do período, não parte do nome.
Qualificadores como “Norte” continuam divergências. A confirmação de uma divergência real passa
a ser digitada no compositor, substituindo botões de sim/não por pedido explícito do usuário.
Aceitação e recusa inequívocas são reconhecidas por um contrato determinístico compartilhado e
revalidadas no servidor; dúvida ou texto ambíguo não executa decisão. O journal registra o texto
original do usuário, com idempotência e vínculo à versão/chat autorizados. Nenhuma geração decide
pertencimento nem altera cadastro. Sem provedor, dependência, schema ou chamada de interpretação nova.
