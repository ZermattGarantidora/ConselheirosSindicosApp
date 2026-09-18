# Critérios de aceitação — Spec 007

## AC-701 — Conta nova sem associação automática

**Dado** uma conta recém-criada sem memberships  
**Quando** a sessão é aberta  
**Então** a lista de condomínios fica vazia  
**E** nenhum condomínio sintético é exibido ou selecionado.

## AC-702 — Criar primeiro condomínio

**Dado** um síndico autenticado sem condomínios  
**Quando** ele informa nome, CNPJ, cidade, UF e confirma os dados  
**Então** a API cria o condomínio e uma membership `manager` na mesma transação  
**E** retorna o identificador do novo contexto.

## AC-703 — Grupo aparece após criação

**Dado** o condomínio criado pela conta  
**Quando** a interface atualiza a lista  
**Então** o condomínio aparece como um grupo de conversa  
**E** a seleção abre o chat com o contexto correspondente.

## AC-704 — Isolamento entre contas

**Dado** duas contas persistentes  
**Quando** a segunda consulta `GET /v1/condominiums` ou tenta abrir o contexto da primeira  
**Então** não recebe o condomínio nem os documentos da primeira conta.

## AC-705 — Rejeitar duplicidade

**Dado** um CNPJ já cadastrado  
**Quando** uma conta tenta criar outro condomínio com esse CNPJ  
**Então** a API retorna `409`  
**E** não cria uma segunda associação.

## AC-706 — Separar demonstração

**Dado** a API persistente  
**Quando** o cliente envia somente `x-development-user-id` às rotas reais  
**Então** a chamada sem cookie de sessão retorna `401`  
**E** nenhum dado de demonstração é usado.

## AC-707 — Mostrar pendências antes do envio

**Dado** um formulário com campos obrigatórios, ata ou confirmação ausentes  
**Quando** a pessoa tenta criar o condomínio  
**Então** a interface lista cada item que precisa ser corrigido antes do envio.

## AC-708 — Identificar etapa do erro

**Dado** que a API ou o armazenamento rejeita a criação ou o upload da ata  
**Quando** a operação falha  
**Então** a interface informa se o erro ocorreu ao criar o condomínio ou salvar os documentos e mostra o motivo retornado pela API.
