# Critérios de aceitação — Spec 024

> A Spec 068 substitui os critérios de entrada por nome e saída da demonstração por
> código fornecido, sessão persistente e conexão de aparelhos pelo Perfil (05/11/2026).

> A localização dos controles em AC-2405/2406 é substituída por AC-4401/4403/4404 da Spec 044;
> continuam exigidos autorização, agrupamento documental, Perfil e retorno à conversa.

## AC-2401 — Entrar antes do chat

**Dado** que a pessoa abre o aplicativo  
**Quando** ainda não entrou  
**Então** vê uma página mínima com o botão “Entrar”  
**E** não vê compositor, conversas ou menu da conta.

## AC-2402 — Alvitra inicia a conversa

**Dado** que a entrada foi concluída  
**Quando** o chat aparece  
**Então** a primeira mensagem é da Alvitra  
**E** usa linguagem sem marcação de gênero em toda a saudação e na pergunta sobre o nome\
**E** não usa “bem-vindo”, “bem-vinda”, variantes com espaço, “(a)” ou “o/a”, nem deduz gênero pelo nome\
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

## AC-2403a — A fala acompanha a próxima pergunta

**Dado** um cadastro sintético com um condomínio, ainda sem quantidade de apartamentos\
**Quando** a pessoa confirma o nome do condomínio\
**Então** a resposta pergunta quantos apartamentos ou unidades ele possui\
**E** não anuncia o contexto salvo ou concluído nem salta para o convite aos documentos\
**E** o servidor fornece ao gateway as próximas etapas possíveis sem alterar o system prompt\
**Quando** a saída estruturada é válida, mas a fala omite a próxima pergunta ou anuncia conclusão antecipada\
**Então** permite no máximo uma reparação da fala pelo mesmo gateway e tarefa, preservando intenção, campo e valor validados\
**E** publica e registra somente a fala reparada válida\
**E** uma segunda fala incompatível ou uma reparação que altera o dado causa falha recuperável, sem avanço ou gravação de conclusão\
**E** JSON inválido ou com propriedades extras continua recusado, sem relaxar o contrato\
**E** uma fala válida usa uma só geração; dúvidas sem atualização não avançam\
**E** correções retomam o campo pendente e vários condomínios só encerram após as últimas unidades.

## AC-2404 — Explicar por que os documentos são essenciais

**Dado** que a pessoa concluiu o cadastro dos condomínios  
**Quando** a Alvitra confirma a conclusão  
**Então** explica que enviar os documentos relevantes é essencial para conhecer o condomínio e ajudar com precisão\
**E** diz que, sem eles, fica difícil ajudar sobre suas regras, decisões, valores e histórico\
**E** convida ao envio pela conversa, sem lista genérica\
**E** não diz “não precisa enviar”, não oferece adiamento espontâneo nem trata os arquivos como opcionais\
**E** não aguarda upload ou confirmação de anexos para concluir o cadastro\
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
**E** a saudação é neutra mesmo usando o nome confirmado, inclusive ao abrir uma nova conversa\
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

## AC-2412 — Continuar escrevendo sem clicar no campo

**Dado** que a pessoa entrou no chat e o campo de mensagem está disponível\
**Quando** o chat abre, muda de conversa ou retorna de um controle auxiliar\
**Então** o campo recebe foco sem exigir clique e sem deslocar a página\
**Quando** envia uma mensagem ou anexo pelo Enter ou botão de envio\
**Então** ao terminar a operação, com sucesso ou falha recuperável, o campo habilitado recebe foco novamente\
**E** o mesmo vale a cada resposta da configuração inicial\
**E** campos desabilitados nunca recebem foco automático\
**E** o foco não é puxado para o compositor enquanto menu, barra lateral, biblioteca, visualizador ou citação estiverem abertos\
**E** Tab, seleção de texto e cliques em outros controles continuam funcionando, sem captura de foco ao sair do campo.

## AC-2413 — Azul principal consistente

**Quando** a pessoa abre a entrada, conversa, menus ou documentos\
**Então** a cor principal é `#0A1330`, aplicada à marca e aos preenchimentos dos botões principais e mensagens da pessoa\
**E** hover, sombras e foco seguem a mesma paleta\
**E** no modo escuro, textos, ícones e indicadores usam variantes legíveis, mantendo a cor dos preenchimentos principais\
**E** a aparência continua utilizável a partir de 320 px e a navegação por teclado mantém foco visível.

## AC-2414 — Toda fala mantém a tipografia grande

**Dado** que a conversa contém mensagens da configuração e respostas posteriores da Alvitra\
**Quando** a pessoa lê a resposta atual, o histórico, orientações ou falas sobre documentos\
**Então** todas essas falas usam a mesma fonte editorial da configuração, com tamanho `clamp(18.9px, 2.7vw, 25.2px)` e entrelinha `1.42`, conforme RQ-1606/AC-1608 da Spec 016 e RQ-2412 desta spec\
**E** pontos de atenção, próximos passos e recomendação de especialista seguem esse padrão\
**E** a fala de confirmação do condomínio de um documento também segue esse padrão\
**E** a tipografia permanece uniforme em modo claro e escuro e em larguras a partir de 320 px\
**E** palavras longas podem quebrar sem causar rolagem horizontal\
**E** mensagens da pessoa, controles, fontes, relatórios calculados e estados operacionais mantêm a apresentação própria.
