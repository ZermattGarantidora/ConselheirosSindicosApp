# Definição do MVP

**Status:** ativa, derivada do briefing
**Atualizado em:** 2026-10-20

## Relação com a visão

`BRIEFING_PRODUTO_CONSELHEIRO_SINDICO.md` é a visão canônica. Este documento projeta essa visão em
uma ordem operacional e não autoriza antecipar blocos.

## MVP

O MVP é uma conversa com a Alvitra precedida somente por uma página mínima de entrada. No modo de
demonstração, a pessoa informa apenas um nome de usuário provisório, com aviso explícito de teste.
Depois de “Entrar”, a Alvitra pergunta na conversa como a pessoa prefere ser chamada, sem usar o
identificador da entrada como dado de perfil. Em seguida, apenas para contextos ainda não
configurados, adapta a configuração à quantidade informada: segue direto
para os dados quando há um condomínio e usa uma sequência orientada quando há vários. O cadastro
termina sem exigir anexos, mas os documentos relevantes são necessários para a Alvitra conhecer o
condomínio e responder com segurança sobre seus fatos; eles podem ser enviados depois, aos poucos.

O núcleo técnico preservado recebe documentos, guarda o original privado, processa texto ou OCR,
gera embeddings isolados por condomínio, recupera evidências e responde com citações verificáveis
ou abstenção.

A conversa também responde perguntas gerais sobre o trabalho do síndico sem exigir anexos,
combinando orientação de IA e legislação oficial aplicável disponível. Quando uma resposta local
depende de um documento, a Alvitra explica por que ele é necessário e solicita somente o material
relevante, sem interromper a orientação geral e os próximos passos que já pode oferecer. Se a
pessoa não o enviar naquele momento, a conversa prossegue; a conclusão sobre fatos ou regras
daquele condomínio espera pela evidência e pode ser aprofundada depois do envio.
Mensagens da Alvitra, inclusive na configuração inicial, são geradas para o contexto; textos fixos
ficam restritos a estados operacionais da interface. Em temas fora do domínio, a Alvitra responde
normalmente e relaciona o assunto à sindicatura quando isso ajudar, sem forçar a relação. Anexos
de fotos e documentos seguem seus fluxos autorizados e suas limitações de evidência.

## Sequência aprovada

1. limpar a experiência e deixar somente uma entrada mínima antes do chat;
2. definir a personalidade da Alvitra, com aprovação do prompt antes da aplicação;
3. adicionar múltiplos chats e barra lateral recolhida;
4. adicionar menu com condomínios e perfil compacto, com acesso aos documentos;
5. construir o perfil pela conversa;
6. pedir e manter documentos sob demanda;
7. entregar análise de documentos e raio-X de balancetes;
8. preparar a base ajustável para níveis da conta.

## Fatia atual

Os Blocos 1 a 8 foram autorizados explicitamente. O Bloco 2 altera somente o prompt do servidor;
o Bloco 3 organiza as conversas sem alterar a trilha documental:

- a raiz apresenta uma página mínima com nome de usuário provisório e “Entrar” na demonstração, e
  só então abre o chat;
- cadastro, formulários de login, criação de condomínio por formulário, painel
  administrativo, configurações e telas paralelas saem da experiência;
- telefone e código pelo WhatsApp ficam preparados como direção futura, sem implementação nesta
  fatia;
- envio de documentos pelo chat, vetorização, consulta documental, citações e feedback continuam;
- isolamento, autorização, abstenção, conflitos, rastreabilidade e revisão humana não mudam.
- o prompt aprovado da Alvitra é casual, humano, franco e orientado a próximos passos, sem alterar
  o contrato de evidências, citações, risco ou validação humana;
- a ampliação aprovada em 2026-10-15 pede respostas abertas e mensagens contextuais geradas; sua
  implementação depende de nova spec, aprovação prévia do prompt e evals antes de ativação;
- a lista de conversas fica recolhida à esquerda, abre de modo deslizante no desktop e como overlay
  no celular;
- a pessoa pode criar, acessar, renomear e excluir a organização de chats; cada reentrada abre um
  novo chat e conserva os anteriores na lateral, com agrupamento por usuário e condomínio no
  servidor, sem alterar a trilha auditável documental (Spec 038). A demonstração continua sujeita
  à perda de estado quando seu servidor em memória reinicia.
- o menu contextual contém "Condomínios" e "Perfil", vai até a base da tela e mantém os itens no topo;
  lista e troca somente contextos autorizados, sem atalhos redundantes dentro do perfil;
- "Perfil" mostra o nome confirmado, escolha de tema claro ou escuro (claro por padrão) e saída da conta, e mantém um acesso aos documentos
  autorizados organizados por tipo e identificados pelo condomínio;
- “Nova conversa” abre um chat vazio sem copiar cadastro, mensagens, anexos ou rascunho; cliques
  sucessivos não acumulam conversas vazias e as anteriores salvas permanecem na lateral;
- a Alvitra pergunta quantos condomínios a pessoa administra; para um, pede diretamente nome e
  quantidade de apartamentos; para vários, configura um por vez e informa o progresso útil;
- o mesmo nome de usuário retoma o contexto sem repetir o cadastro; na primeira entrada, a Alvitra
  pergunta como o síndico prefere ser chamado e usa esse nome confirmado nas mensagens;
- documentos não precisam ser enviados durante o cadastro, mas são necessários para conhecer o
  condomínio e sustentar respostas locais; a conversa pede somente o material relevante, permite
  enviá-lo depois, continua oferecendo orientação geral e próximos passos enquanto ele não chega e
  preserva o pipeline vetorial autorizado.
- a conta tem uma base de nível calculável por dados confirmados, sem regra comercial ou tela nesta fatia.
- pedidos de balancete recebem um raio-X prudente e fundamentado: achados prioritários, pontos de conferência, comparação somente quando houver meses equivalentes e pedido do período específico quando faltar histórico.

## Fora da fatia atual

A coleta de telefone e a validação de código pelo WhatsApp também são futuras. Não devem ser implementadas por antecipação.

## Critérios de sucesso do Bloco 1

- abrir `/` apresenta a página mínima de entrada e o botão “Entrar”;
- depois da entrada, o botão dá lugar ao menu sanduíche e a Alvitra faz a primeira pergunta;
- não existe navegação visível para cadastro, criação de condomínio por formulário, configurações ou
  painel administrativo;
- uma pergunta continua produzindo resposta com o contrato documental existente;
- um PDF anexado no chat continua entrando no processamento e na memória vetorial;
- a interface funciona em largura móvel e desktop;
- testes confirmam a ausência das experiências removidas e a permanência do fluxo documental.

## Critérios de sucesso do Bloco 3

- a barra de conversas fica escondida por padrão e abre de forma adequada em desktop e celular;
- novo chat, histórico, renomear e excluir são acessíveis sem criar telas paralelas;
- organização visual não altera o contexto autorizado, o contrato documental ou a trilha auditável;
- testes cobrem os controles e a preservação do fluxo de conversa.

## Princípios preservados

- evidência antes de afirmação documental;
- isolamento por `condominium_id` em todas as camadas;
- abstenção quando a base for insuficiente;
- transparência sobre conflito e incerteza;
- confirmação humana para ação externa;
- conteúdo documental tratado como dado não confiável;
- nenhum dado real em testes ou evals.
