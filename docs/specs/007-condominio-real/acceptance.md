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

**Dado** um CNPJ já cadastrado em contexto não autorizado para a sessão
**Quando** uma conta tenta criar outro condomínio com esse CNPJ  
**Então** a API retorna `409`  
**E** não cria uma segunda associação
**E** não revela o nome nem o identificador do condomínio existente.

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

## AC-709 — Retomar envio após criação parcial

**Dado** que uma tentativa anterior criou o condomínio e a membership da própria conta, mas não salvou a ata
**Quando** a pessoa repete o cadastro com o mesmo CNPJ e mantém a ata selecionada
**Então** a API retorna o contexto já autorizado com `resumedRegistration: true`
**E** não cria outro condomínio nem outra membership
**E** a interface informa que encontrou o cadastro anterior e continua do envio documental.

**Dado** que a criação e a membership foram confirmadas, mas a primeira resposta da API falhou antes de chegar à interface
**Quando** a API recupera o CNPJ somente entre os condomínios autorizados para a mesma sessão
**Então** retorna `200` com `resumedRegistration: true` na própria solicitação
**E** a interface continua o envio dos documentos sem exigir novo clique
**E** nenhum dado de outro condomínio é revelado.

## AC-710 — Revalidar bloqueio transitório do upload

**Dado** que o primeiro envio de um PDF retorna `401` ou `403`
**Quando** o contexto do mesmo condomínio ainda pertence à sessão e contém `document:upload`
**Então** o cliente repete o envio uma única vez com o mesmo arquivo e metadados
**E** envia explicitamente o cookie de mesma origem
**E** não cria outro condomínio.

**Dado** que a revalidação falha ou não confirma `document:upload`
**Então** o cliente preserva a negação original
**E** não repete o upload.
