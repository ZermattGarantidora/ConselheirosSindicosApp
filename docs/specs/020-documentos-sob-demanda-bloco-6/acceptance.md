# Critérios de aceitação — Spec 020

## AC-2001 — Conversar sem anexo

**Dado** uma pessoa em contexto autorizado  
**Quando** envia cumprimento ou pergunta inicial sem documento  
**Então** a conversa avança sem exigir anexo
**E** informa que os documentos relevantes são necessários para conhecer o condomínio e responder sobre fatos locais, mas podem ser enviados depois.

## AC-2002 — Pedir somente o necessário

**Dado** uma pergunta documental sem evidência suficiente  
**Quando** a Alvitra se abstém  
**Então** indica apenas o documento ou validação diretamente necessário  
**E** não solicita uma lista genérica de arquivos.

## AC-2003 — Preservar vetorização autorizada

**Dado** um documento explicitamente enviado no chat  
**Quando** o processamento termina  
**Então** ele permanece disponível somente para consultas autorizadas do mesmo condomínio.

## AC-2004 — Mensagem e arquivo no mesmo envio

**Dado** um arquivo selecionado e uma mensagem digitada\
**Quando** o síndico confirma pela seta ou Enter\
**Então** o texto aparece imediatamente e o arquivo é enviado uma vez\
**E** a pergunta original é consultada uma vez depois que a versão enviada fica pronta\
**E** um envio sem texto não gera pergunta automática.

## AC-2005 — Receber sem aguardar a leitura

**Dado** uma extração ainda pendente\
**Quando** o original já foi armazenado e registrado\
**Então** o upload responde 202 com sua versão sem esperar a extração\
**E** o catálogo autorizado permite acompanhar processamento e seu estado final\
**E** falha de processamento é registrada como falha, sem expor conteúdo em erro.

## AC-2006 — Falhas não perdem a mensagem nem simulam leitura

**Quando** o upload falha, a versão exige revisão, não é encontrada ou a espera supera 60 segundos\
**Então** a pergunta não é enviada como se o arquivo tivesse sido lido\
**E** a mensagem é preservada para tentar novamente, com aviso operacional claro\
**E** o arquivo recebido pode ser aberto mesmo sem leitura pronta.

## AC-2007 — Original integral e privado

**Quando** o síndico abre um documento do catálogo, um anexo recebido ou uma citação de arquivo disponível\
**Então** visualiza os bytes do original completo, com opção de baixar e voltar ao chat\
**E** a página da citação é apenas a posição inicial, sem recortar o arquivo\
**E** acesso anônimo, associação revogada, versão de outro condomínio ou arquivo removido é negado\
**E** ao fechar ou trocar o contexto as URLs temporárias são revogadas\
**E** fonte removida mantém o trecho histórico explicitamente identificado.
