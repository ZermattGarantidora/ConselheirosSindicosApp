# Critérios de aceitação — Spec 020

## AC-2001 — Conversar sem anexo

**Dado** uma pessoa em contexto autorizado  
**Quando** envia cumprimento ou pergunta inicial sem documento  
**Então** a conversa avança sem exigir anexo.

## AC-2002 — Pedir somente o necessário

**Dado** uma pergunta documental sem evidência suficiente  
**Quando** a Alvitra se abstém  
**Então** indica apenas o documento ou validação diretamente necessário  
**E** não solicita uma lista genérica de arquivos.

## AC-2003 — Preservar vetorização autorizada

**Dado** um documento explicitamente enviado no chat  
**Quando** o processamento termina  
**Então** ele permanece disponível somente para consultas autorizadas do mesmo condomínio.
