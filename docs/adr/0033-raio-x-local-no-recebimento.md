# ADR 0033 — Raio-X local no recebimento

**Status:** aceito para implementação local  
**Data:** 2026-10-27

## Decisão

A Spec 045 combina fala contextual e resumo local. O gateway recebe somente enums operacionais e marcadores conforme ADR 0027; títulos e nomes continuam interpolados localmente. Nenhum conteúdo documental novo é enviado ao provedor para gerar o raio-X. A revisão automática rejeitou essa transmissão por falta de comprovação do destino dos dados; a alternativa local elimina esse envio.

O reader do ADR 0024 lê exclusivamente a versão recebida. Extratores já existentes fornecem tipo, período e valores; seleção determinística complementa com trechos literais priorizados por assunto. O relatório reutiliza `DocumentAnalysisReport` e a conferência de fontes em code points. Não há schema, cache, reextração ou dependência nova. A fala pode falhar sem impedir o relatório local; a interface identifica a indisponibilidade.

O ADR 0034 sucede a seleção de versão única exclusivamente para balancetes, conforme solicitação explícita do usuário na Spec 049. Mantém o processamento local e o mesmo limite agregado de leitura.

## Consequências

O resumo inicial é uma seleção verificável de dados, não uma síntese semântica integral. Informa limites e próximos passos, sem auditoria, interpretação jurídica ou comparação inventada. Permanece transitório, conforme o relatório calculado atual. Uma futura síntese com conteúdo enviado a um provedor exigirá decisão explícita sobre destino e autorização de dados.
