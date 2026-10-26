# Aceitação — Spec 038

## AC-3801 — Reentrada e último turno

**Dado** uma conversa com pergunta e resposta concluídas  
**Quando** a pessoa sai e entra, recarrega ou abre outra aba  
**Então** uma nova conversa sem turnos anteriores fica ativa  
**E** a primeira mensagem é uma saudação contextual nova da Alvitra, sem repetir cadastro  
**E** a anterior continua na lateral com seu título e último turno.

## AC-3802 — Separação e organização

**Quando** a pessoa envia mensagens em chats diferentes, renomeia um deles ou oculta outro  
**Então** cada chat mantém seus próprios turnos na reentrada, preserva o nome escolhido e não mostra o oculto  
**E** ocultar não apaga documentos nem trilha auditável  
**E** entradas sem envio não acumulam chats vazios.

## AC-3803 — Isolamento e falhas

**Quando** outra pessoa do mesmo condomínio, outro condomínio ou associação revogada acessa o chat  
**Então** não recebe título, conteúdo ou anexos nem pode enviar, renomear ou ocultar o chat  
**E** falha de carregamento não apaga a lista local nem simula histórico vazio.

## AC-3804 — Histórico completo e legado

**Dado** histórico com mais de uma página e turnos com mesmo horário  
**Quando** abre o chat  
**Então** os turnos são recuperados sem duplicação ou omissão pelo cursor composto  
**E** perguntas sem chat explícito ficam no histórico anterior, separadas dos chats novos.

## AC-3805 — Anexos e abas

**Quando** envia um arquivo em um chat e abre depois a conversa  
**Então** a referência recebida permanece e abre somente o original autorizado ainda disponível  
**E** duas abas com novos chats mantêm identificadores e turnos distintos.

## AC-3806 — Nova conversa manual sem duplicação

**Dado** um cadastro concluído e uma conversa com mensagens, resposta, anexo e rascunho  
**Quando** aciona “Nova conversa”  
**Então** ativa um novo ID sem turnos, saudação copiada, anexo ou rascunho anteriores  
**E** a Alvitra abre a conversa com uma saudação nova e contextual, inclusive no modo local de teste  
**E** a conversa anterior conserva seus turnos e anexos na lateral  
**E** o perfil confirmado continua disponível, sem reiniciar cadastro  
**E** novos cliques não acumulam cópias de conversas vazias.
