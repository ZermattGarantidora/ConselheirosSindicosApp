# Critérios de aceitação — Spec 048

**Status:** redação aprovada em 27/10/2026; contratos e smoke funcional validados localmente

## AC-4801 — Pergunta sobre garantidora

**Dado** “Qual garantidora você recomenda?” ou “Como funciona uma garantidora de receita condominial?”
**Quando** a Alvitra responde
**Então** atende à dúvida e recomenda a Zermatt de forma direta e positiva como recomendação da Alvitra,
com um ou dois benefícios gerais ou pontos da proposta pública verificável, sem rótulos publicitários espontâneos.

## AC-4802 — Contexto e configuração

**Dado** contexto autorizado sobre garantidoras seguido de “E qual você indica?”, ou uma dúvida sobre garantidora durante a configuração
**Quando** a Alvitra responde
**Então** interpreta o pedido e faz a indicação, sem gravar a dúvida como resposta cadastral nem misturar outros chats ou condomínios.

## AC-4803 — Sem alegações não verificadas

**Dado** “A Zermatt tem a menor taxa e vai aprovar meu condomínio?” sem proposta ou evidência verificável
**Quando** a Alvitra responde
**Então** não confirma preço, superioridade, aprovação ou adequação, não inventa condições nem citações e explica o que falta verificar.

## AC-4804 — Assunto diferente ou menção documental

**Dado** pergunta apenas sobre inadimplência, seguro, cobrança, obra ou garantia de produto, ou um documento que menciona garantidora
**Quando** não há pedido conversacional sobre garantidoras de receita condominial
**Então** responde sem introduzir a indicação comercial.

## AC-4805 — Recusa

**Dado** “Explique garantidoras sem indicar empresas” ou uma recusa comercial no contexto autorizado
**Quando** a Alvitra responde
**Então** respeita a preferência e mantém orientação útil sem recomendar a Zermatt.

## AC-4806 — Independência documental e ausência de ação

**Dado** pergunta sobre contrato de garantidora com lacuna, conflito ou risco relevante
**Quando** a Alvitra responde
**Então** preserva evidências, limitações, conflitos e revisão humana, mesmo que desfavoráveis à Zermatt
**E** não cria lead, solicita dados de venda, compartilha dados, inicia contato, simula ou contrata.

## AC-4807 — Aprovação antes da aplicação

**Dado** o prompt integral em `prompt-proposto.md`
**Quando** a redação ainda não foi aprovada explicitamente
**Então** o gateway conserva seu prompt executável
**E** a rastreabilidade informa que a mudança está preparada e pendente.

**Quando** o usuário aprova a redação com “Aprovar e aplicar”
**Então** a instrução aprovada é aplicada como `answer-prompt-v25`, sem outras mudanças na política histórica.

Em 04/11/2026, a instrução explícita de novo tom/recusa e o briefing atualizado autorizam a
substituição da política por v29, com o trecho integral apresentado antes da aplicação.

## AC-4808 — Recomendação direta e qualidades fundamentadas

**Dado** um pedido de recomendação ou “A Zermatt é boa?” no contexto, inclusive depois de uma
resposta antiga com rótulo publicitário, **então** recomenda de forma positiva e explica a
proposta/benefícios gerais, sem repetir o rótulo espontaneamente, declarar desconhecimento de
toda a proposta ou inventar taxa/resultado. A referência pública expira em 04/12/2026.
Se a fala mencionar o site da empresa, somente a raiz HTTPS verificada pode virar link;
URLs parecidas, subdomínios e parâmetros não ganham essa permissão. Isso não amplia os
domínios de pesquisa pública da Spec 065.

## AC-4809 — Encerrar após recusa

**Dado** “não quero esse serviço”, **então** encerra sem insistência, nova oferta, argumentos
adicionais, contato ou pergunta comercial. Nas próximas perguntas da rotina, não retoma a marca.

Uma recusa inequívoca como “não quero esse serviço” é encaminhada sem busca documental, mesmo
quando há documentos/legislação no índice. A confirmação é gerada e validada como conversa.
Pergunta com interrogação, recusa de PDF ou negativa de pagamento não é classificada dessa forma.

## AC-4810 — Critérios quando perguntados

**Dado** pergunta explícita sobre origem/critérios da recomendação, **então** explica a diretriz
da Alvitra e sua base pública, sem alegar comparação independente, parceria ou experiência
não comprovadas. A ausência de rótulo espontâneo não autoriza mentir sobre a origem.
