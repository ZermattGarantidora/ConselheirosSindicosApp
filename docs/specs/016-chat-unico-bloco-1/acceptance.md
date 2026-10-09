# Critérios de aceitação — Spec 016

## AC-1601 — Abrir direto no chat

**Dado** que a pessoa acessa a raiz do aplicativo  
**Quando** o cliente é carregado  
**Então** a conversa com a Alvitra aparece imediatamente  
**E** o único controle de acesso é o botão “Entrar”  
**E** não há landing page, formulário de login, cadastro, onboarding ou formulário de condomínio.

## AC-1602 — Inicializar contexto autorizado

**Dado** um contexto autorizado disponível  
**Quando** a pessoa aciona “Entrar”  
**Então** o servidor retorna apenas `condominiumId`, papel e permissões desse contexto  
**E** o histórico correspondente é carregado  
**E** outro condomínio não pode ser escolhido por adulteração do cliente.

## AC-1603 — Falhar sem vazar dados

**Dado** que não há sessão ou contexto autorizado  
**Quando** a pessoa aciona “Entrar”  
**Então** nenhuma conversa ou documento é carregado  
**E** a interface mostra uma mensagem compreensível dentro do chat.

## AC-1604 — Conversar e verificar fonte

**Dado** um contexto iniciado  
**Quando** a pessoa envia uma pergunta documental  
**Então** vê a pergunta e a resposta no mesmo fluxo  
**E** pode abrir documento, versão, página e trecho de cada citação  
**E** vê a limitação quando a resposta se abstém ou encontra conflito.

## AC-1605 — Enviar documento sem perder vetorização

**Dado** permissão `document:upload`  
**Quando** a pessoa seleciona um PDF, JPEG ou PNG  
**Então** o arquivo permanece pendente até o clique de envio  
**E** depois é encaminhado ao pipeline existente de armazenamento, processamento e embeddings  
**E** o chat informa sucesso, revisão necessária ou falha.

## AC-1606 — Remover experiências paralelas

**Dado** o bundle principal do cliente  
**Quando** suas rotas, estados e textos são inspecionados  
**Então** não existem formulários de autenticação, cadastro, onboarding, criação/listagem de
condomínio, perfil, configurações ou painel administrativo  
**E** o único controle de autenticação visível é “Entrar”  
**E** não há rota alternativa de revisão sintética na aplicação principal.

## AC-1607 — Layout responsivo e acessível

**Dado** desktop ou celular a partir de 320 px  
**Quando** a conversa é usada  
**Então** histórico e compositor permanecem legíveis  
**E** anexar, remover anexo, enviar, abrir fonte e avaliar resposta funcionam por teclado e toque.
