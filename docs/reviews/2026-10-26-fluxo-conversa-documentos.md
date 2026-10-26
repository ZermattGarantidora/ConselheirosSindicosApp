# Revisão local — conversa, documentos e ambiente sintético

- **Status:** aprovada localmente; revisão independente e merge pendentes.
- **Base:** `origin/main` atualizado em 2026-10-26 e diff preparado na branch desta entrega.
- **Autor e revisor local:** Codex.
- **Data:** 2026-10-26.

## Escopo revisado

Fluxo de conversas, perfil e documentos do cliente; persistência e isolamento de chats; confirmação
de condomínio documental; prévia sintética; cópias legais verificadas; migrações, guardas e workflow
de integração Supabase; especificações, ADRs e testes correspondentes.

## Achados

Nenhum achado P0 ou P1 no diff revisado. A revisão percorreu os caminhos de autorização por
condomínio, persistência de chat, upload e confirmação de documento, recuperação de fontes,
organização do menu e guardas do destino sintético.

## Gates executados

- Formatação, lint e verificação de tipos aprovados.
- `vitest run --coverage`: 912 testes em 127 arquivos aprovados; statements 90,51%, branches
  84,84%, functions 96,23% e lines 92,61%.
- Gate de visão das 40 specs e scanner de segredos aprovados.
- Build web aprovado; a prévia local confirmou o acordeão de condomínios, documentos do condomínio
  selecionado, perfil e nova conversa com saudação.

## Limites

Os testes de integração persistente dependem do destino sintético protegido e são executados pelo
workflow manual. Este registro não autoriza merge automático: a revisão independente e os checks do
PR continuam obrigatórios.
