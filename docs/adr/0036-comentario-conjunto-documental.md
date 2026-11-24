# ADR 0036 — Comentário contextual do conjunto documental

**Status:** aceito para implementação e validação sintética
**Data:** 2026-10-29

O [ADR 0038](0038-roteamento-runtime-e-cache-de-instrucoes.md), de 03/11/2026, sucede somente
a exigência operacional de `routing=single`: híbrido também conserva o comentário, por uma
instância exclusiva de Codex/Sol 6.1 low, sem mudança de payload, destino ou fallback.

## Decisão

Após apresentação da redação, o usuário pediu explicitamente analisar todos os arquivos e fazer
um comentário direto sobre o conjunto, oferecendo solução e ajuda contextual. A Spec 057 usa o
mesmo gateway configurado para as consultas documentais do chat. Não adiciona provedor, conta ou
destino; nomes e trechos passam pelo mesmo contrato de dados não confiáveis e citações do fluxo
documental existente. Isso sucede a restrição de somente enums do ADR 0033 para essa síntese.

Todos os arquivos solicitados precisam estar autorizados, elegíveis e integralmente legíveis no
reader. O teto da síntese é explícito; excesso não vira seleção silenciosa. Cálculos permanecem
locais. Uma fala conjunta substitui falas individuais de status, que usam modo somente relatório;
o progresso e as confirmações de condomínio continuam próprios. Revalidar associação, versões e
catálogo antes de publicar; fontes e claims usam o validador existente.

## Consequências

Detalhe de 03/11/2026 (AC-5716/5817): legenda inequívoca de envio é comunicada com o comentário
conjunto existente, sem consulta adicional ao Luna. O texto original é registrado no journal
como mensagem do usuário, antes do ACK. Não é instrução de análise enviada ao gateway: fontes,
destino e orçamento permanecem os mesmos. Perguntas e pedidos explícitos continuam no fluxo
de consulta. Sem arquivo junto, o aviso usa a conversa breve já existente, sem busca documental.

A revisão automática inicialmente rejeitou o envio integral por falta de autorização de payload
e destino. Depois da explicação, o usuário autorizou explicitamente: “Autorizar esse envio ao
Codex”, em 29/10/2026. A autorização é restrita ao Codex autenticado na conta ChatGPT e ao modelo
`gpt-6.1-sol` atualmente configurado, com tamanho limitado e sem fallback para APIs ou outro
modelo. O servidor só fornece esse gateway ao fluxo quando a configuração coincide e o
roteamento é `single`; outras configurações mantêm o relatório local. Nenhum documento real foi
enviado durante a implementação ou os testes.

Há custo de uma geração no gateway já selecionado; os testes deste trabalho usam somente fixtures
sintéticas. Além dos gateways falsos, três smokes controlados usaram o Codex autorizado com três
arquivos fictícios, sem dados de clientes. Não autoriza fornecedor adicional, deploy ou piloto com clientes.
Relatórios e fala seguem transitórios, sem schema, cache ou logs documentais novos. Por ajuste de
experiência de 29/10/2026, os relatórios passam a ser internos: o chat mostra a fala contextual e
suas fontes. Falha usa indicação operacional curta, sem painel de fallback. A autorização de um
arquivo pronto reutiliza a síntese existente. Testes não certificam leitura semântica universal.
