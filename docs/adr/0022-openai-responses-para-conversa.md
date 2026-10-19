# ADR 0022 — OpenAI Responses para a conversa da Alvitra

**Status:** aceito para testes sintéticos; dados reais bloqueados pelos gates do ADR 0012
**Data:** 2026-10-15

## Contexto

A conversa precisa responder perguntas gerais sem exigir documentos e gerar também as falas de
entrada. O gateway existente já separa recuperação autorizada, geração e validação local. O
provedor deve ser substituível, e a contratação da API não equivale a um plano ChatGPT.

## Decisão

- Usar a Responses API da OpenAI no servidor, pelo `AnswerGateway` existente, com
  `gpt-6.1-sol` como modelo inicial configurável.
- Usar OpenAI como primeira opção quando `OPENAI_API_KEY` estiver presente. Por decisão explícita
  do usuário em 2026-10-15, manter Gemini como alternativa temporária até sua retirada ser aprovada.
  Não expor chaves ao navegador, armazenar a resposta no provedor (`store: false`) nem registrar
  prompt integral na telemetria.
- Enviar somente pergunta e trechos recuperados do condomínio autorizado. A saída estruturada
  documental passa pelo validador local; IDs de citações são resolvidos exclusivamente contra os
  trechos recebidos. Sem evidência, gerar orientação geral sem alegar fato local.
- Gerar boas-vindas e falas de configuração por um provedor configurado. Sem provedor, informar
  indisponibilidade, sem apresentar frase local pré-programada como fala da Alvitra.
- A biblioteca legal oficial continua separada do conhecimento do modelo. Uma norma específica
  só pode ser citada se a fonte recuperada sustentar a afirmação e sua aplicabilidade.
- Registrar consumo de tokens e latência. O custo faturado deve ser acompanhado na OpenAI
  Platform; até haver conversão cambial e tarifário versionado, não tratar o campo legado
  `estimatedCostMicrounits` em BRL como custo efetivo da OpenAI.

## Consequências

- Cada API externa é cobrada conforme sua conta e exige chave, faturamento e limite operacional.
- Fotos e busca de imagens seguem o ADR 0023. PDFs sintéticos podem usar o OCR OpenAI já existente.
- A demonstração pública sem chave continua adequada para conferir a interface, mas não para
  conversar com a Alvitra. A publicação de conversa gerada requer provedor configurado e uma
  decisão de custos/privacidade própria.
- Nenhum dado real pode ser enviado antes dos gates contratuais, de retenção, LGPD e piloto.
