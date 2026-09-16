# Critérios de aceitação — Spec 003

**Status:** aprovado para implementação local
**Atualizado em:** 2026-09-15

## AC-301 — Mostrar a entrada demonstrativa

**Dado** que a pessoa abre o cliente local
**Quando** a página termina de carregar
**Então** ela vê primeiro a tela de acesso demonstrativo
**E** a interface deixa claro que nenhuma credencial real é solicitada.

## AC-302 — Criar e selecionar condomínio sintético

**Dado** que a API local usa o registro de desenvolvimento
**Quando** a pessoa cria um identificador de condomínio de teste
**Então** a API retorna uma membership de gestor em memória
**E** a interface seleciona esse condomínio e libera a pergunta.

## AC-303 — Abster sem documento no condomínio criado

**Dado** um condomínio criado no ambiente de teste sem documentos
**Quando** a pessoa pergunta sobre uma regra
**Então** a resposta tem `answerMode` igual a `abstained`
**E** não exibe fonte de outro condomínio.

## AC-304 — Não registrar criação fora do modo de desenvolvimento

**Dado** uma API sem registro de desenvolvimento habilitado
**Quando** uma chamada tenta criar condomínio de teste
**Então** o endpoint responde `404`.

## AC-305 — Aplicar a identidade visual Zermatt

**Dado** as telas de acesso, onboarding e conversa
**Quando** a interface é exibida
**Então** os controles e superfícies usam azul e branco com contraste legível.

## AC-306 — Preservar áreas seguras em telas móveis

**Dado** que a conversa é aberta em uma tela estreita, inclusive com recorte de câmera ou barra de navegação
**Quando** o cabeçalho e o compositor são exibidos
**Então** os controles mantêm margem lateral e inferior segura
**E** o compositor mantém uma margem inferior mínima mesmo quando o navegador não fornece o recorte do aparelho
**E** nenhum campo de mensagem ou botão é cortado pela borda da tela.

## AC-307 — Expandir a área de mensagem

**Dado** que o síndico escreve uma pergunta com múltiplas linhas
**Quando** o conteúdo ocupa mais de uma linha
**Então** a área de mensagem cresce automaticamente até cinco linhas
**E** passa a rolar internamente sem expandir além desse limite.

## AC-308 — Listar condomínios no mobile

**Dado** que a conversa está aberta em uma tela estreita
**Quando** a pessoa toca em “Trocar condomínio”
**Então** ela vê uma lista pesquisável de condomínios, com o contexto atual destacado
**E** pode selecionar outro condomínio ou abrir a criação de um contexto de teste
**E** a tela não apresenta conversas de outros condomínios
**E** o cabeçalho da lista não exibe uma seta de retorno.

## AC-309 — Sair da conversa no mobile

**Dado** que a conversa de um condomínio está aberta em uma tela estreita
**Quando** a pessoa toca na seta circular destacada no canto superior esquerdo ou arrasta horizontalmente a tela
**Então** a lista de condomínios é aberta para escolher outro contexto
**E** o gesto vertical continua reservado para rolar a conversa.

## AC-310 — Reabrir o histórico da conversa

**Dado** que o usuário já fez perguntas em um condomínio autorizado
**Quando** a conversa é aberta novamente
**Então** as perguntas e respostas anteriores do próprio usuário são carregadas em ordem cronológica
**E** o histórico fica limitado ao condomínio autorizado e não mistura dados de outro usuário ou condomínio.

## AC-311 — Abrir o cadastro completo pelo botão de adição

**Dado** que a pessoa está na lista móvel de condomínios
**Quando** toca no botão `+`
**Então** uma página própria de cadastro é aberta
**E** ela encontra os dados básicos, endereço, contato e informações administrativas
**E** a página orienta que somente dados sintéticos podem ser usados.

## AC-312 — Exigir a ata de constituição

**Dado** que a pessoa preencheu os dados cadastrais
**Quando** tenta concluir sem anexar a ata de assembleia geral de constituição em PDF
**Então** o cadastro não é enviado
**E** a interface informa de forma direta qual documento está faltando.

## AC-313 — Criar, enviar e indexar os documentos no contexto correto

**Dado** um cadastro sintético válido com uma ata textual em PDF e confirmação de aplicabilidade
**Quando** a pessoa conclui o cadastro
**Então** a API cria a associação do gestor antes dos uploads
**E** armazena cada arquivo sob o identificador do novo condomínio
**E** adiciona os trechos textuais ao índice em memória do mesmo condomínio
**E** abre o chat com o novo contexto selecionado.

## AC-314 — Impedir uso de documento ilegível ou de outro condomínio

**Dado** um PDF sem texto utilizável ou um contexto de condomínio diferente
**Quando** o chat procura evidências
**Então** o PDF ilegível é sinalizado para revisão e não sustenta a resposta
**E** os trechos enviados a um condomínio não aparecem na busca de outro.
