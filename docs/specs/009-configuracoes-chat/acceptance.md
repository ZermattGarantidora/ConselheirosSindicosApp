# Critérios de aceitação — Spec 009

## AC-901 — Abrir configurações

**Dado** um condomínio selecionado no chat  
**Quando** o usuário toca em “Configurações”  
**Então** vê as preferências da conversa, o condomínio ativo e a seção “Sair da gestão e apagar condomínio”.

## AC-902 — Preferências locais

**Dado** a tela de configurações aberta  
**Quando** o usuário desativa histórico ou lembrete de evidências  
**Então** a renderização do chat muda imediatamente sem fazer chamada de exclusão ou alterar registros persistidos.

## AC-903 — Limpar conversa visível

**Dado** a tela de configurações aberta  
**Quando** o usuário seleciona “Limpar conversa visível”  
**Então** a tela do chat é reiniciada e a interface informa que o histórico salvo não foi apagado.

## AC-904 — Confirmar exclusão do condomínio

**Dado** uma membership ativa com papel de síndico no condomínio selecionado  
**Quando** o usuário confirma “Apagar condomínio”  
**Então** o cadastro, documentos, conversas, histórico, auditoria e associações daquele condomínio são apagados permanentemente, ele retorna à lista sem o condomínio e vê o aviso correspondente.

## AC-905 — Cancelar exclusão

**Dado** o diálogo de confirmação aberto  
**Quando** o usuário seleciona “Cancelar”  
**Então** nenhuma chamada de exclusão é feita e a tela de configurações permanece aberta.

## AC-906 — Acesso não autorizado

**Dado** uma sessão ausente, sem membership ativa ou com papel diferente de síndico  
**Quando** alguém tenta apagar um condomínio  
**Então** a API retorna `401` ou `403`, não altera dados e o cliente mostra uma mensagem sem detalhes internos.

## AC-907 — Isolamento da exclusão

**Dado** uma exclusão confirmada  
**Quando** outra conta consulta seus próprios condomínios  
**Então** a conta, os outros condomínios e seus dados continuam intactos; somente o `condominium_id` confirmado foi removido.
