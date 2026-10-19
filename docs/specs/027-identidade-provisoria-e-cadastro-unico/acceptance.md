# Critérios de aceitação — Spec 027

## AC-2706 — Demonstração local sem fala fictícia

Dado runtime de desenvolvimento/local, quando entrar, então a interface abre sem requisitar boas-vindas/retomada ao provedor e informa operacionalmente a ausência de IA. Não exibe balão vazio nem fala pronta. Novo cadastro permanece pendente e sem anexos/turnos de configuração; perfil previamente confirmado pode ser restaurado e consultar documentos autorizados. Não inferir nome de usuário como nome de tratamento nem criar contexto automático. Runtime com provedor mantém a configuração normal.

## AC-2701 — Entrar somente com nome de usuário

**Dado** que a pessoa abre a demonstração  
**Quando** a tela de entrada aparece  
**Então** existe somente o campo “Nome de usuário” e o botão “Entrar”  
**E** um texto informa que o acesso é provisório, sem senha e usado para separar testes  
**E** informa que a autenticação definitiva será feita futuramente pelo WhatsApp.

## AC-2702 — Separar usuários sintéticos

**Dado** dois nomes de usuário diferentes  
**Quando** cada pessoa entra e cria seu contexto  
**Então** recebem identificadores sintéticos diferentes  
**E** condomínios, documentos e histórico de uma identidade não aparecem para a outra.

## AC-2703 — Fazer o cadastro apenas na primeira vez

**Dado** um nome sem condomínio autorizado  
**Quando** entra no chat  
**Então** a Alvitra pergunta como a pessoa prefere ser chamada  
**E** se a pessoa responder apenas uma saudação ou algo que não pareça nome, a Alvitra pergunta
novamente sem salvar essa resposta no perfil  
**E** quando for uma saudação, responde ao cumprimento antes da pergunta  
**E** não oferece exemplo nem sugere um nome para a pessoa  
**E** quando a pessoa pedir um exemplo, responde ao pedido sem salvar a frase como nome\
**E** somente depois pergunta quantos condomínios administra  
**E** coleta nome e unidades de cada condomínio na conversa  
**Quando** a pessoa fizer uma pergunta, pedir uma explicação, corrigir um dado ou responder com
linguagem natural, inclusive números por extenso  
**Então** a Alvitra interpreta o turno junto do histórico recente e responde de acordo com o sentido  
**E** não usa uma lista local de frases para decidir a intenção  
**E** permanece na pergunta atual quando não houver uma resposta válida para ela  
**Quando** a pessoa declarar explicitamente uma correção de nome durante outra pergunta do cadastro\
**Então** a Alvitra atualiza o nome e repete a pergunta interrompida\
**E** não exibe asteriscos de Markdown como texto da mensagem\
**Quando** o mesmo nome entra novamente depois da configuração  
**Então** o chat é retomado sem repetir as perguntas de cadastro.

## AC-2704 — Chamar o síndico pelo nome

**Dado** um nome de usuário válido informado na entrada  
**Quando** a pessoa acessa pela primeira vez  
**Então** esse identificador não é usado como nome pessoal  
**E** a Alvitra pergunta na conversa como a pessoa prefere ser chamada  
**Quando** conclui o cadastro, retoma o chat ou responde uma mensagem  
**Então** a fala é endereçada ao nome confirmado na conversa  
**E** esse nome não é inferido do identificador, de documentos nem compartilhado com outra identidade.

## AC-2705 — Retomar após recarga ou nova aba

**Dado** que a pessoa já entrou na demonstração  
**Quando** recarrega o app ou abre outra aba  
**Então** o último nome fica preenchido para facilitar a entrada  
**E** ainda é possível substituí-lo por outro nome antes de entrar  
**E** conversas e documentos não são persistidos pelo mecanismo de preenchimento.
