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

## AC-2405 — Menu de condomínios e dados

**Dado** que a pessoa está no chat  
**Quando** abre o menu sanduíche do canto superior direito  
**Então** vê “Condomínios” e “Dados”  
**E** “Dados” apresenta os documentos autorizados agrupados por tipo e condomínio.

## AC-2406 — Documentos do condomínio atual

**Dado** que a pessoa está em um condomínio autorizado  
**Quando** abre o menu sanduíche  
**Então** vê o nome do condomínio atual  
**E** logo abaixo encontra “Ver documentos deste condomínio”  
**Quando** abre esse atalho  
**Então** vê uma tela documental separada, com retorno ao chat  
**E** a tela apresenta somente documentos desse condomínio, agrupados por tipo  
**E** mostra uma barra de contexto calculada pelos tipos de documentos já processados, sem sugerir que a Alvitra sabe informações não enviadas.

## AC-2407 — Retomar uma conversa configurada

**Dado** que a pessoa já informou seu nome e configurou um condomínio autorizado  
**Quando** entra novamente no chat  
**Então** a Alvitra cumprimenta a pessoa e convida uma solicitação em linguagem natural  
**E** não repete perguntas de cadastro  
**E** não apresenta perguntas prontas ou sugestões clicáveis.
