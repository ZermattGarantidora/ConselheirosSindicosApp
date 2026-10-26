# Critérios de aceitação — Spec 024

## AC-2401 — Entrar antes do chat

**Dado** que a pessoa abre o aplicativo  
**Quando** ainda não entrou  
**Então** vê uma página mínima com o botão “Entrar”  
**E** não vê compositor, conversas ou menu da conta.

## AC-2402 — Alvitra inicia a conversa

**Dado** que a entrada foi concluída  
**Quando** o chat aparece  
**Então** a primeira mensagem é da Alvitra  
**E** pergunta como a pessoa prefere ser chamada  
**E** não apresenta perguntas prontas ou sugestões clicáveis  
**E** depois pergunta quantos condomínios ela administra\
**E** a mensagem fica à esquerda, com fundo transparente e uma linha lateral anil discreta\
**E** não repete o nome “Alvitra” sobre o texto da mensagem.

## AC-2403 — Adaptar a configuração à quantidade

**Dado** que a pessoa informou a quantidade de condomínios  
**Quando** informou que administra um condomínio  
**Então** a Alvitra pergunta diretamente o nome desse condomínio  
**E** não diz “um por vez” nem mostra “1 de 1”  
**Quando** informou que administra mais de um condomínio  
**Então** a Alvitra pede nome e quantidade de apartamentos de um condomínio por vez  
**E** informa o progresso ao passar para o seguinte.

## AC-2404 — Cadastro sem envio imediato

**Dado** que a pessoa concluiu o cadastro dos condomínios  
**Quando** a Alvitra confirma a conclusão  
**Então** não pede documento nem aguarda uma confirmação sobre anexos  
**E** explica que os documentos relevantes são necessários para conhecer o condomínio e dar respostas locais confiáveis
**E** informa que eles podem ser enviados depois, aos poucos
**E** permite iniciar uma conversa imediatamente.

## AC-2405 — Menu de condomínios e perfil

**Dado** que a pessoa está no chat  
**Quando** abre o menu sanduíche do canto superior direito  
**Então** vê “Condomínios” e “Perfil”\
**E** ao acionar “Condomínios”, a lista se expande no próprio menu, sem abrir uma tela intermediária\
**E** o condomínio selecionado contém “Documentos enviados”, com os arquivos autorizados daquele condomínio agrupados por tipo
**E** voltar da lista leva ao início do menu, sem perder o contexto do chat.

## AC-2406 — Menu até a base, sem atalhos redundantes

**Dado** que a pessoa está em um condomínio autorizado  
**Quando** abre o menu sanduíche  
**Então** vê o condomínio atual destacado dentro da lista de “Condomínios”\
**E** o painel vai desde abaixo do cabeçalho até a base da tela em desktop e celular\
**E** os itens ficam no topo e o conteúdo pode rolar sem sair da tela\
**E** não encontra cartão separado do condomínio atual, “Ver documentos deste condomínio” nem “Ver condomínios” dentro do perfil\
**E** “Documentos enviados” aparece somente dentro do condomínio selecionado e mostra apenas seus arquivos autorizados.

## AC-2407 — Retomar uma conversa configurada

**Dado** que a pessoa já informou seu nome e configurou um condomínio autorizado  
**Quando** entra novamente no chat  
**Então** a Alvitra cumprimenta a pessoa e convida uma solicitação em linguagem natural  
**E** não repete perguntas de cadastro  
**E** não apresenta perguntas prontas ou sugestões clicáveis.

## AC-2408 — Perfil enxuto

**Dado** que a pessoa entrou no chat\
**Quando** abre “Perfil”\
**Então** vê seu nome confirmado na conversa, ou “Seu perfil” quando ainda não o confirmou\
**E** encontra apenas escolha de aparência e saída da conta\
**E** o identificador provisório não é apresentado como nome pessoal\
**E** o aviso de acesso provisório aparece somente na demonstração\
**E** “Sair da conta” fica no rodapé, em botão vermelho com texto branco\
**E** as opções permanecem acessíveis em desktop e celular de 320 px.

## AC-2409 — Alternar e lembrar o tema

**Dado** que não há preferência salva\
**Quando** abre o aplicativo\
**Então** o tema inicial é claro, mesmo quando o sistema operacional prefere o modo escuro\
**E** “Aparência” oferece as opções “Claro” e “Escuro”, com “Claro” selecionado\
**Quando** seleciona uma das opções pelo clique ou teclado\
**Então** a aparência muda em toda a interface, preservando conversa e contexto\
**E** o controle informa a opção selecionada às tecnologias assistivas\
**E** a escolha é restaurada após recarregar e após sair da conta\
**E** armazenamento indisponível ou inválido usa o claro como padrão e não impede a escolha\
**E** uma escolha válida de modo escuro já salva continua sendo respeitada.

## AC-2410 — Sair e retomar explicitamente

**Dado** um perfil sintético configurado com documentos\
**Quando** escolhe “Sair da conta”\
**Então** retorna à entrada com o nome vazio e sem chat, anexo ou resposta visível\
**E** a lembrança do último acesso é removida sem apagar perfis, documentos ou preferência de tema\
**E** entrar com outro nome não exibe o contexto anterior\
**E** informar novamente o mesmo nome permite retomar o cadastro autorizado.

## AC-2411 — Revogação real e falha recuperável

**Dado** que a autenticação real está ativa\
**Quando** escolhe sair\
**Então** a interface solicita a revogação pela API da mesma origem antes de retornar à entrada\
**E** bloqueia cliques duplicados enquanto aguarda\
**E** uma falha da API é mostrada no perfil, sem limpar a identidade nem anunciar saída concluída\
**E** a pessoa pode tentar novamente.
