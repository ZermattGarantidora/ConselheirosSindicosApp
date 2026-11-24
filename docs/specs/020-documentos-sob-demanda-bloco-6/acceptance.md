# Critérios de aceitação — Spec 020

## AC-2001 — Conversar sem anexo

**Dado** uma pessoa em contexto autorizado  
**Quando** envia cumprimento ou pergunta inicial sem documento  
**Então** a conversa avança sem exigir anexo
**E** ao explicar o envio na conclusão da configuração, apresenta os documentos relevantes como essenciais para conhecer o condomínio e ajudar com precisão\
**E** explica que, sem eles, fica difícil ajudar sobre fatos locais e convida ao envio pela conversa\
**E** não diz “não precisa enviar”, não sugere adiamento espontâneo nem pede arquivos em cumprimentos\
**E** a orientação geral continua disponível enquanto aguarda o material.

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
**E** um envio sem texto recebe confirmação e raio-X inicial automaticamente conforme AC-4501/4502, sem gerar pergunta em nome do usuário.

## AC-2005 — Receber sem aguardar a leitura

**Dado** uma extração ainda pendente\
**Quando** o original já foi armazenado e registrado\
**Então** o upload responde 202 com sua versão sem esperar a extração\
**E** o catálogo autorizado permite acompanhar processamento e seu estado final\
**E** falha de processamento é registrada como falha, sem expor conteúdo em erro.

## AC-2006 — Falhas não perdem a mensagem nem simulam leitura

**Quando** o upload falha, a versão exige revisão, não é encontrada ou a espera supera 60 segundos\
**Então** a pergunta não é enviada como se o arquivo tivesse sido lido\
**E** a mensagem é preservada para tentar novamente e a Alvitra explica a limitação de leitura
na conversa; falhas de transporte/provedor usam indicação técnica sem simular sua fala\
**E** o arquivo recebido pode ser aberto mesmo sem leitura pronta.

## AC-2007 — Original integral e privado

**Quando** o síndico abre um documento do catálogo, um anexo recebido ou uma citação de arquivo disponível\
**Então** visualiza os bytes do original completo, com opção de baixar e voltar ao chat\
**E** a página da citação é apenas a posição inicial, sem recortar o arquivo\
**E** acesso anônimo, associação revogada, versão de outro condomínio ou arquivo removido é negado\
**E** ao fechar ou trocar o contexto as URLs temporárias são revogadas\
**E** fonte removida mantém o trecho histórico explicitamente identificado.

## AC-2008 — Selecionar, acrescentar e remover arquivos

**Quando** o síndico seleciona vários PDFs/fotos e depois acrescenta outros\
**Então** todos os válidos aparecem na seleção, com remoção individual\
**E** inválidos têm erro identificado pelo nome, sem descartar os válidos ou a mensagem\
**E** o mesmo arquivo não é duplicado ao ser selecionado novamente\
**E** nada é enviado antes da seta ou Enter; Shift+Enter permanece quebra de linha.

## AC-2009 — Lote com uma confirmação e leitura em sequência

**Dado** três arquivos válidos e uma pergunta\
**Quando** confirma o envio uma vez\
**Então** cada arquivo usa o endpoint individual e o mesmo chat/condomínio autorizados\
**E** o próximo upload só começa após terminar o acompanhamento da leitura anterior\
**E** cada arquivo tem nome, progresso, resultado e original abrível após recepção\
**E** a pergunta é enviada exatamente uma vez após todos ficarem prontos\
**E** sem texto, há recebimento e raio-X por arquivo, sem pergunta fabricada.

## AC-2010 — Falha parcial e confirmações independentes

**Quando** um arquivo falha no envio, na leitura ou excede a espera, ou pede confirmação\
**Então** os demais continuam e o resultado individual permanece visível\
**E** apenas uploads não recebidos ficam na seleção para nova tentativa\
**E** não há repetição automática de originais já aceitos\
**E** a pergunta conjunta é preservada e não é enviada com uma parte do lote\
**E** múltiplas pendências podem ser confirmadas/canceladas uma a uma, sem perder as demais\
**E** trocar o contexto interrompe o restante do lote e descarta resultados tardios.

## AC-2011 — Liberar a caixa de mensagem ao enviar anexos

**Dado** um ou vários arquivos selecionados na caixa de mensagem\
**Quando** o síndico confirma o envio pela seta ou Enter\
**Então** a lista de anexos selecionados desaparece imediatamente da caixa durante o envio e a leitura do lote\
**E** o progresso de cada arquivo permanece no chat, inclusive os que aguardam na fila\
**E** ao terminar com sucesso, a caixa permanece sem os anexos enviados\
**E** se um upload falhar, apenas arquivos não recebidos reaparecem para nova tentativa\
**E** falha de leitura ou confirmação pendente de arquivo recebido não o recoloca na caixa\
**E** arquivos apenas selecionados continuam visíveis antes da confirmação, mesmo quando outro estado da interface desabilita temporariamente seus controles.
