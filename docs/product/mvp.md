# Definição do MVP

**Status:** ativa, derivada do briefing
**Atualizado em:** 2026-11-12

## Relação com a visão

`BRIEFING_PRODUTO_CONSELHEIRO_SINDICO.md` é a visão canônica. Este documento projeta essa visão em
uma ordem operacional e não autoriza antecipar blocos.

## MVP

O MVP é uma conversa com a Alvitra precedida somente por uma página mínima de entrada. Por decisão explícita de 05/11/2026, a pessoa informa somente um código fornecido pela equipe.
A sessão fica persistente neste navegador e o código da conta aparece em Perfil para conectar
outros aparelhos. Não há cadastro público; IP não autentica o aparelho (Spec 068).
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

Por decisão explícita do usuário em 2026-10-27, perguntas sobre garantidoras de receita
condominial devem receber uma recomendação direta e positiva da Zermatt pela Alvitra.
Por instrução explícita de 04/11/2026, a fala não repete rótulos publicitários; mantém
transparência se perguntarem pela origem/critérios e encerra o assunto quando houver recusa,
sem insistência ou nova oferta. Benefícios gerais e proposta pública verificável não são
promessa de resultado individual nem comparação independente.
A Spec 048 detalha a fatia conversacional: sem alegações não verificadas, prospecção por conteúdo
documental, contato externo ou compartilhamento de dados. A redação foi aprovada explicitamente
em 27/10/2026 e aplicada como `answer-prompt-v25`; a atualização de tom foi solicitada
explicitamente em 04/11/2026 e está documentada na Spec 048. Orientação e evidência permanecem preservadas.

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

- a raiz apresenta código fornecido pela equipe e “Entrar”; uma sessão válida retoma
  automaticamente o chat, sem pedir código novamente;
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
- a lateral esquerda lista os condomínios autorizados por nome e abre as conversas do escolhido;
  a troca revalida contexto e histórico, com retorno à carteira (Spec 044);
- o painel direito contém os documentos do condomínio da conversa e "Perfil", vai até a base da
  tela e mantém os itens no topo, sem repetir a carteira de condomínios;
- "Perfil" mostra o nome confirmado, escolha de tema claro ou escuro (claro por padrão), código
  para conectar outros aparelhos e saída da conta atual, e mantém um acesso aos documentos
  autorizados no painel direito, organizados por tipo e identificados pelo condomínio ativo;
- “Melhor visualização” abre biblioteca contextual sobre o chat, com busca, categorias, estados e
  contagem de arquivos disponíveis e percentual somente nos detalhes fechados por padrão;
  uma convenção isolada não anuncia base completa. Há área exclusiva de balancetes reconhecidos
  pelo conteúdo, com os demais tipos nas suas categorias. O cálculo é explícito e não mede acerto da IA,
  completude temática ou vigência documental;
- “Nova conversa” abre um chat vazio sem copiar cadastro, mensagens, anexos ou rascunho; cliques
  sucessivos não acumulam conversas vazias e as anteriores salvas permanecem na lateral;
- a Alvitra pergunta quantos condomínios a pessoa administra; para um, pede diretamente nome e
  quantidade de apartamentos; para vários, configura um por vez e informa o progresso útil;
- a mesma conta retoma o contexto por sessão ou código sem repetir o cadastro; na primeira entrada, a Alvitra
  pergunta como o síndico prefere ser chamado e usa esse nome confirmado nas mensagens;
- documentos não precisam ser enviados durante o cadastro, mas são necessários para conhecer o
  condomínio e sustentar respostas locais; a conversa pede somente o material relevante, permite
  enviá-lo depois, continua oferecendo orientação geral e próximos passos enquanto ele não chega e
  preserva o pipeline vetorial autorizado.
- a conta tem uma base de nível calculável por dados confirmados, sem regra comercial ou tela nesta fatia.
- pedidos de balancete recebem um raio-X prudente e fundamentado: achados prioritários, pontos de conferência, comparação somente quando houver meses equivalentes e pedido do período específico quando faltar histórico.
- cada arquivo enviado recebe confirmação e um raio-X inicial automático na conversa assim que a leitura segura termina, mesmo sem pergunta; a seleção local de dados e fontes da versão enviada preserva as pendências e os limites de leitura (Spec 045).
- o chat aceita vários arquivos na mesma seleção, com remoção individual e uma confirmação de envio;
  uploads e acompanhamento da leitura seguem em sequência, com resultado por arquivo e pergunta
  conjunta somente quando todos ficam prontos (Spec 020, RQ-2007).
- balancetes recebem automaticamente os dez pontos de conferência, comparação com os meses anteriores disponíveis e cruzamentos com apoios elegíveis do mesmo condomínio; prioridades, documentos faltantes e próximos passos têm fontes verificáveis e abstenções específicas (Spec 049).
- a apresentação inicial destaca até três prioridades; a conferência completa e fontes agrupadas
  ficam abríveis. Lotes reúnem resultados por tema após as leituras, preservando detalhes por
  arquivo e pendências. O prompt v27 incorpora o comentário direto e oferta de ajuda contextual;
  a síntese integral usa somente o Codex/modelo explicitamente autorizado, com limite e sem
  fallback. Pergunta com anexos segue o fluxo de consulta existente (Spec 057; ADR 0036).
- após analisar um PDF legível e identificar correções seguras, a Alvitra resume as mudanças e
  pergunta no chat se o síndico quer uma cópia revisada; só gera depois da resposta afirmativa.
  Um pedido inicial explícito e inequívoco para gerar a cópia já expressa essa decisão. O PDF é
  identificado como rascunho, ligado à origem e não substitui o original nem vira fonte
  automaticamente; mudanças factuais exigem evidência, e dúvidas ou conflitos impedem a alteração
  até revisão humana (Spec 062).

## Evolução documental autorizada

A evolução documental autorizada em 12/11/2026 é detalhada pela Spec 073: criar e revisar
documentos da rotina do síndico, receber PDF/fotos/Word e áudio (relato ou reunião), apresentar
rascunho e mudanças no chat e gerar somente PDF após confirmação da versão exata. Inclui
oferta contextual de melhorias. Ata a partir de áudio deve resumir e organizar os assuntos,
propostas, decisões relatadas e encaminhamentos, sem inventar nomes, votos, valores ou prazos;
transcrição integral fica separada para conferência. Não autoriza inventar fatos, substituir originais, assinar,
publicar ou enviar automaticamente. A implementação e os provedores reais permanecem sujeitos
às specs, decisões de dados/custo e gates próprios. A Spec 062 conserva a fatia de revisão de PDF.

## Fora da fatia atual

A coleta de telefone e a validação de código pelo WhatsApp também são futuras. Não devem ser implementadas por antecipação.

O comportamento dessa evolução foi definido pelo usuário em 05/11/2026: em cada novo aparelho,
a pessoa informa novamente o mesmo telefone e confirma um novo código de uso único. A nova sessão
pertence à mesma conta e não desconecta as sessões existentes. Enviar, reenviar ou consumir um
código não revoga outros aparelhos; sair encerra apenas a sessão atual. IP não identifica o
aparelho nem determina qual tentativa será confirmada. O envio real ainda exige especificação
de integração e decisão de provedor; essa definição não ativa WhatsApp na demonstração atual.

## Condição obrigatória antes do lançamento — histórico completo

Decisão do usuário em 29/10/2026: o produto deve conservar mensagens do síndico e da Alvitra,
inclusive as falas fora do fluxo de perguntas, e permitir recuperar a conversa completa após
reinícios e atualizações. A confirmação depende de gravação durável; falha não pode parecer
sucesso. Recuperação, backup/restauração e isolamento devem ser demonstrados antes da liberação.
A IA deve considerar as mensagens pertinentes dos dois lados sem transformar resposta antiga em
comprovação documental atual nem misturar usuários, condomínios ou chats.

O caminho PostgreSQL existente persiste perguntas e respostas normais. As falas de cadastro,
abertura e documentos ainda têm lacunas de registro/reexibição, e o replay documental segue
limitado pelo ADR 0032. A Spec 058 registra a implementação/validação faltantes como bloqueantes
do lançamento. A demonstração atual usa RAM: recarregar a página preserva o estado do servidor,
mas reiniciar sua API o perde. Esse comportamento de teste foi esclarecido ao usuário e não
vale como evidência de persistência de produção.

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
