# Definição do MVP

**Status:** ativa, derivada do briefing
**Atualizado em:** 2026-10-09

## Relação com a visão

`BRIEFING_PRODUTO_CONSELHEIRO_SINDICO.md` é a visão canônica. Este documento projeta essa visão em
uma ordem operacional e não autoriza antecipar blocos.

## MVP

O MVP é uma conversa direta com a Alvitra. O síndico abre o aplicativo, escreve o que precisa e
recebe ajuda no próprio chat. A Alvitra pede informações ou documentos somente quando necessários.

O núcleo técnico preservado recebe documentos, guarda o original privado, processa texto ou OCR,
gera embeddings isolados por condomínio, recupera evidências e responde com citações verificáveis
ou abstenção.

## Sequência aprovada

1. limpar a experiência e abrir direto no chat;
2. definir a personalidade da Alvitra, com aprovação do prompt antes da aplicação;
3. adicionar múltiplos chats e barra lateral recolhida;
4. adicionar menu com condomínios, dados e preferências;
5. construir o perfil pela conversa;
6. pedir e manter documentos sob demanda;
7. entregar análise de documentos e raio-X de balancetes;
8. preparar a base ajustável para níveis da conta.

## Fatia atual

Os Blocos 1 a 8 foram autorizados explicitamente. O Bloco 2 altera somente o prompt do servidor;
o Bloco 3 depende da entrada direta do Bloco 1 e continua limitado à organização visual de conversas:

- a raiz abre o chat e apresenta somente um botão “Entrar” como controle de acesso;
- cadastro, formulários de login, criação de condomínio, landing page, onboarding, painel
  administrativo, configurações e telas paralelas saem da experiência;
- telefone e código pelo WhatsApp ficam preparados como direção futura, sem implementação nesta
  fatia;
- envio de documentos pelo chat, vetorização, consulta documental, citações e feedback continuam;
- isolamento, autorização, abstenção, conflitos, rastreabilidade e revisão humana não mudam.
- o prompt aprovado da Alvitra é casual, humano, franco e orientado a próximos passos, sem alterar
  o contrato de evidências, citações, risco ou validação humana;
- a lista de conversas fica recolhida à esquerda, abre de modo deslizante no desktop e como overlay
  no celular;
- a pessoa pode criar, acessar, renomear e excluir chats dentro da sessão atual, sem persistir títulos
  ou alterar a trilha auditável documental.
- o menu contextual lista e troca somente condomínios autorizados e inicia pedidos de inclusão pela conversa;
- “Meus dados” e “Preferências” permanecem contextuais, sem formulários nesta fatia.
- dados explícitos aprendidos na conversa atualizam o perfil autorizado e aparecem em “Meus dados”.
- documentos não são obrigatórios; a conversa só pede o material diretamente necessário e preserva o pipeline vetorial autorizado.
- a conta tem uma base de nível calculável por dados confirmados, sem regra comercial ou tela nesta fatia.
- pedidos de balancete recebem um raio-X prudente e fundamentado: achados prioritários, pontos de conferência, comparação somente quando houver meses equivalentes e pedido do período específico quando faltar histórico.

## Fora da fatia atual

A coleta de telefone e a validação de código pelo WhatsApp também são futuras. Não devem ser implementadas por antecipação.

## Critérios de sucesso do Bloco 1

- abrir `/` apresenta imediatamente a conversa com a Alvitra;
- existe um único botão “Entrar”, sem e-mail, senha, telefone ou cadastro nesta fatia;
- não existe navegação visível para cadastro, onboarding, criação de condomínio, configurações ou
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
