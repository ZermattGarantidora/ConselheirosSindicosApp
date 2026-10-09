# Critérios de aceitação — Spec 019

## AC-1901 — Abrir menu

**Dado** um contexto autorizado  
**Quando** a pessoa aciona o controle do canto superior direito  
**Então** vê “Condomínios”, “Meus dados” e “Preferências” sem sair do chat.

## AC-1902 — Listar e trocar condomínio

**Dado** uma pessoa com mais de um condomínio autorizado  
**Quando** abre “Condomínios” e escolhe um item  
**Então** a API lista somente associações vigentes  
**E** a troca revalida o contexto no servidor antes de carregar o histórico.

## AC-1903 — Negar troca indevida

**Dado** um identificador de condomínio não autorizado  
**Quando** é enviado diretamente ao endpoint de contexto  
**Então** a API responde sem expor histórico ou documentos daquele condomínio.

## AC-1904 — Iniciar inclusão na conversa

**Dado** o menu de condomínios  
**Quando** a pessoa escolhe adicionar outro condomínio  
**Então** o compositor recebe a solicitação em linguagem natural  
**E** nenhum condomínio é criado automaticamente.
