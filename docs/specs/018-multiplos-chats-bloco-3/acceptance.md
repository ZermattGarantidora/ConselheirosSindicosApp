# Critérios de aceitação — Spec 018

## AC-1701 — Abrir a lista de conversas

**Dado** que a pessoa abre a Alvitra  
**Quando** observa o chat  
**Então** a barra de conversas está escondida por padrão  
**E** pode ser aberta pelo controle acessível no cabeçalho  
**E** no desktop ela desliza da esquerda.

## AC-1702 — Usar a barra no celular

**Dado** uma tela a partir de 320 px  
**Quando** a pessoa abre a lista de conversas  
**Então** a barra aparece como overlay sobre o chat  
**E** um fundo permite fechá-la sem acionar controles do chat.

## AC-1703 — Criar e alternar chats

**Dado** uma conversa autorizada em andamento  
**Quando** a pessoa cria uma nova conversa ou seleciona uma anterior  
**Então** o novo chat fica ativo  
**E** os turnos concluídos da conversa anterior permanecem preservados  
**E** nenhuma pergunta, upload, citação ou feedback muda de `condominium_id`.

## AC-1704 — Renomear e excluir na interface

**Dado** um chat listado  
**Quando** a pessoa o renomeia ou confirma sua exclusão  
**Então** a lista reflete a mudança  
**E** excluir o chat não exclui perguntas, respostas, documentos, evidências ou trilhas auditáveis do servidor.

## AC-1705 — Preservar o contrato documental

**Dado** um contexto autorizado  
**Quando** a pessoa conversa, envia documento, abre fonte ou avalia uma resposta em qualquer chat  
**Então** o cliente mantém os contratos autorizados da Spec 016  
**E** citações, abstenção, conflitos e orientação humana permanecem disponíveis.
