# Briefing de produto — Alvitra

**Status:** visão canônica aprovada
**Atualizado em:** 2026-11-12

## 1. Visão do produto

A Alvitra é uma assistente de IA que ajuda síndicos a cuidar dos condomínios por meio de uma única
experiência principal: a conversa. Antes dela existe somente uma página mínima de acesso, sem
cadastro ou formulários longos visíveis. Por decisão explícita de 05/11/2026, essa página pede somente um código de acesso
fornecido pela equipe e mostra o botão “Entrar”. O navegador lembra a sessão com credencial segura
persistente; IP não identifica nem autentica o aparelho. Depois de entrar, informações,
documentos e ações entram na experiência de modo contextual, quando a conversa precisar deles.

O produto deve parecer simples para o síndico mesmo quando executa trabalho documental complexo.
A Alvitra conversa em linguagem natural, consulta somente o contexto autorizado, mostra a base das
afirmações documentais, reconhece quando não há evidência suficiente e ajuda a definir o próximo
passo. Atua como consultora proativa e acessível: fala como gente, sem avisos mecânicos ou
formatações robóticas, e explica termos contábeis quando forem indispensáveis.

A conversa pode começar sem anexos e aceita perguntas abertas sobre sindicatura e condomínios. Ela
combina orientação de IA com a legislação oficial aplicável que estiver disponível e verificada.
Os documentos relevantes são necessários para a Alvitra conhecer o condomínio e responder com
segurança sobre suas regras, decisões, valores e histórico, mas não precisam ser enviados durante
o cadastro inicial: podem chegar aos poucos, depois. Enquanto o documento necessário não estiver
disponível, a Alvitra oferece orientação geral e próximos passos, deixa explícito o que ainda não
pode concluir sobre aquele condomínio e permanece pronta para aprofundar a resposta quando o
material chegar. A Alvitra também pode responder a assuntos
gerais fora desse domínio e relacionar a orientação ao trabalho do síndico quando isso fizer
sentido. Suas mensagens de conversa
são geradas para o contexto, inclusive boas-vindas e perguntas de configuração; textos prontos não
substituem uma resposta. Confirmações, avisos sobre documentos e seus resultados são comunicados
pela Alvitra na conversa, sem cartões de aviso ou telas substituindo sua fala. Autorizar o uso de
um documento não altera o nome do condomínio: depois do cadastro, somente um pedido explícito do
síndico autoriza renomeá-lo. Estados operacionais da interface, como erros de rede e progresso, podem
ter redação fixa e devem ser identificados como interface, não como fala da Alvitra.

## 2. Hipótese central

Síndicos perdem tempo procurando informações, interpretando documentos e comparando períodos. Uma
assistente conversacional que aprende o contexto aos poucos e usa uma memória documental
verificável pode reduzir esse esforço sem exigir que o usuário aprenda uma estrutura de sistema.

A hipótese de experiência é que uma única conversa reduz atrito e torna o valor perceptível mais
cedo do que onboarding, formulários e telas paralelas.

## 3. Público inicial

- síndicos profissionais independentes e pequenas empresas de sindicatura;
- síndicos moradores que precisam consultar e organizar informações do próprio condomínio.

## 4. Problema inicial

Permitir que o síndico peça ajuda em linguagem natural e receba uma resposta útil, sustentada pelos
documentos autorizados quando a resposta envolver fatos, regras ou números do condomínio.

Exemplos:

- entender uma regra da convenção ou do regimento;
- localizar uma decisão em ata;
- analisar um documento enviado durante a conversa;
- comparar balancetes e identificar variações quando houver histórico suficiente.
- orientar sobre questões gerais da rotina do síndico, planejamento, comunicação e manutenção,
  mesmo sem documento do condomínio.
- criar documentos novos e preparar cópias revisadas de documentos autorizados pela conversa,
  incluindo rascunhos de ata a partir de áudio, com revisão e confirmação antes da geração do PDF.

## 5. Proposta de valor

> Converse com a Alvitra para cuidar do condomínio; ela pede o contexto necessário no momento certo,
> consulta os documentos disponíveis e ajuda a transformar o que encontrou em próximos passos.

## 6. Experiência principal

O aplicativo é o chat com a Alvitra. Não há onboarding obrigatório nem telas de trabalho paralelas.

1. A página inicial pede somente o código fornecido pela equipe e mostra “Entrar”, sem cadastro
   público. Uma sessão válida retoma automaticamente a conversa neste navegador.
2. Depois de entrar pela primeira vez, a Alvitra pergunta na conversa como o síndico prefere ser
   chamado e só então pergunta quantos condomínios administra. O código de acesso não é nome de tratamento e não substitui essa pergunta. Ao retornar, a Alvitra
   usa o nome confirmado na conversa e retoma o chat sem repetir o cadastro.
3. A configuração acontece na própria conversa. Se houver apenas um condomínio, a Alvitra pergunta
   diretamente seu nome e quantidade de apartamentos, sem anunciar etapas ou contagem. Se houver
   mais de um, configura um por vez e informa o progresso somente quando ele ajuda a orientar a pessoa.
4. O cadastro inicial não exige o envio de documentos. Eles são necessários para a Alvitra conhecer
   o condomínio e sustentar respostas locais confiáveis, mas podem ser enviados depois, aos poucos.
   Até que o material relevante chegue, a Alvitra oferece orientação geral, explica o limite e não
   apresenta como confirmada uma conclusão sobre aquele condomínio.
5. Depois da configuração inicial, o síndico escreve o que precisa e a Alvitra responde ou pede, de
   forma natural, a informação ou o documento que falta.
6. Documentos enviados pelo chat são processados, vetorizados e ficam disponíveis para consultas
   posteriores autorizadas.
7. Informações aprendidas na conversa podem alimentar o perfil do síndico e do condomínio quando a
   capacidade correspondente for implementada.

Por decisão explícita de 05/11/2026, a equipe fornece os códigos de acesso enquanto o cadastro
pelo WhatsApp não existe. O código da própria conta fica disponível em Perfil para conectar outros
aparelhos. Cada aparelho recebe sessão independente e persistente, sem expiração automática no
servidor, lembrada por cookie seguro e renovado no uso. Não se usa IP como credencial. Sair encerra
somente o aparelho atual; a equipe pode rotacionar o código e revogar seus acessos. Limpeza de
cookies, limites do navegador ou revogação podem exigir nova entrada. Códigos e sessões são
validados no servidor e não removem a autorização por condomínio (Spec 068).

Cadastro, entrega e recuperação pelo WhatsApp permanecem futuros e exigem especificação antes
da integração. Para essa evolução, por decisão explícita de 05/11/2026, cada novo aparelho informa
novamente o mesmo telefone e recebe um novo código de uso único. Confirmá-lo abre uma sessão
independente da mesma conta, sem desconectar os aparelhos já conectados. Emitir ou consumir esse
código não revoga outras sessões; sair encerra apenas o acesso atual. A confirmação fica vinculada
à tentativa de entrada, nunca à igualdade de IP entre aparelhos.
A demonstração continua identificada como ambiente sintético: persistir a
credencial não torna durável seu histórico em RAM.

Controles auxiliares podem aparecer sobre o chat apenas quando previstos nos blocos abaixo. Eles
não se tornam fluxos de onboarding nem substituem a conversa como interface principal.

## 7. Escopo por blocos

### Bloco 1 — limpeza e nova página inicial

- remover cadastro, senha e e-mail; manter somente o código fornecido pela equipe e “Entrar”;
- deixar a coleta de telefone e o código pelo WhatsApp para uma implementação futura;
- remover da experiência a criação de condomínio;
- remover landing page, onboarding, painel administrativo, configurações e outras telas paralelas;
- apresentar antes do chat uma página mínima com marca, código de acesso e “Entrar”;
- manter envio, processamento, recuperação e vetorização de documentos;
- manter evidências, citações, abstenção, conflitos, feedback e recomendações de validação humana
  dentro da conversa.

### Bloco 2 — personalidade da Alvitra

- definir um tom casual, humano, franco e prestativo;
- apontar o que está bom e o que está ruim;
- quando algo estiver ruim, oferecer próximos passos claros;
- apresentar o system prompt ao usuário antes de aplicá-lo.
- gerar cada mensagem de conversa conforme o contexto, sem respostas ou saudações pré-programadas.

### Bloco 3 — múltiplos chats e barra lateral

- permitir vários chats;
- no produto lançado, guardar permanentemente o histórico dos dois lados da conversa,
  incluindo mensagens do síndico e da Alvitra, para consulta posterior autorizada;
- manter a lista na lateral esquerda, escondida por padrão;
- oferecer novo chat, histórico, renomear e excluir;
- usar painel deslizante no desktop e overlay no celular.
- listar os condomínios autorizados por nome nessa lateral e, ao escolher um, abrir suas
  conversas, com retorno à carteira; a organização permanece vinculada ao condomínio e usuário.

### Bloco 4 — menu sanduíche

- abrir no canto superior direito um painel com documentos do condomínio da conversa e "Perfil";
- manter a lista de condomínios e a criação opcional na lateral esquerda, junto às conversas;
- permitir que a criação também aconteça pela conversa.
- em "Perfil", mostrar o nome confirmado na conversa, a escolha entre modo claro e escuro, com
  claro como padrão, o código para conectar outros aparelhos e a saída da conta atual,
  mantendo no painel direito acesso aos documentos autorizados enviados, organizados por tipo e
  identificados pelo condomínio da conversa; esse controle compacto sobre o chat substitui "Dados" e não cria um
  módulo de configurações ou formulário de cadastro.
- oferecer “Melhor visualização” para abrir a biblioteca organizada sobre o chat, com busca,
  categorias, estados e retorno à conversa; a porcentagem de base disponível explicita quantos
  arquivos enviados podem apoiar consultas, sem prometer acerto ou cobertura de todos os assuntos.

### Bloco 5 — perfil construído pela conversa

- perguntar, na primeira conversa, como o síndico prefere ser chamado;
- iniciar a conversa perguntando quantos condomínios o síndico administra;
- chamar o síndico pelo nome confirmado na conversa e não repetir o cadastro quando o contexto já
  estiver configurado; o código de acesso não alimenta o perfil;
- pedir diretamente nome e quantidade de apartamentos quando houver um único condomínio;
- quando houver mais de um, configurar um por vez e comunicar o progresso de forma útil;
- alimentar os dados do condomínio com o que foi confirmado na conversa.

### Bloco 6 — documentos sob demanda

- não exigir documentos durante o cadastro inicial, permitindo que sejam enviados depois e aos
  poucos;
- tratar os documentos relevantes como necessários para conhecer o condomínio e sustentar respostas
  locais confiáveis, pedindo cada um somente quando ele for relevante para confirmar ou aprofundar
  a resposta;
- manter a orientação geral e os próximos passos disponíveis enquanto aguarda o envio, sem inventar
  uma conclusão local;
- vetorizar os documentos enviados e disponibilizá-los à Alvitra nas conversas autorizadas.

### Bloco 7 — análise de documentos e raio-X de balancetes

- analisar a qualidade do material recebido e sugerir melhorias;
- por decisão explícita de 12/11/2026, criar documentos novos e revisar a maioria dos tipos
  documentais da rotina do síndico, como convenções, regimentos, atas, comunicados, contratos e
  relatórios, conforme os formatos e limites suportados. O pedido e a revisão acontecem no chat;
- aceitar PDF, fotos e Word (.docx) como origens autorizadas. A saída desta evolução é somente
  PDF separado: o original permanece intacto, e incompatibilidades, partes não lidas e mudanças
  de estrutura precisam ficar explícitas, sem prometer edição fiel de qualquer arquivo;
- gerar rascunhos de ata a partir de áudio do síndico relatando/ditando ou da gravação completa
  de reunião, com tratamentos, duração e custo próprios. A transcrição conserva referências
  temporais, incertezas e origem; falantes não identificados não recebem nomes presumidos;
- conforme esclarecimento de 12/11/2026, o síndico grava e envia o áudio pedindo a ata.
  Anexar ou selecionar uma gravação não inicia a geração por conta própria. O pedido explícito
  inicia a preparação do rascunho; sua revisão e a confirmação do PDF continuam humanas;
- a ata deve ser redigida pela Alvitra, resumindo e organizando assuntos, propostas,
  deliberações e encaminhamentos sustentados pelo áudio. Transcrição organizada não substitui
  essa redação. Ambiguidades, conflitos e informações ausentes ficam explícitos, sem completar
  nomes, votos, quórum, valores ou prazos por suposição;
- quando identificar uma melhoria possível, apresentar a proposta e perguntar se o síndico
  deseja aplicá-la. Pedidos explícitos de alteração também produzem texto revisável na conversa;
  gerar o PDF somente após confirmação da versão exata. Mudanças posteriores exigem nova confirmação;
- fatos, valores, participantes, votos, deliberações e alterações normativas não podem ser
  inventados. Relatos e transcrições conservam sua procedência e não comprovam automaticamente
  deliberação, quórum, assinatura ou aprovação. Mudanças substantivas exigem fonte ou confirmação
  adequada ao tipo de informação, com conflito e revisão humana de maior risco explícitos;
- depois de analisar um PDF legível e identificar correções seguras, resumir na conversa o que
  pode mudar e perguntar se o síndico quer uma cópia revisada. Gerar o PDF somente após a resposta
  afirmativa; um pedido inicial explícito e inequívoco para gerar a cópia já expressa essa decisão.
  A cópia é identificada como rascunho e mantém o original intacto; mudanças factuais exigem
  evidência autorizada e conflitos, incertezas e revisão humana ficam explícitos (Spec 062);
- comparar balancetes com meses anteriores;
- destacar variações, pontos de atenção e sinais saudáveis;
- pedir os meses anteriores quando o histórico não estiver disponível.

### Bloco 8 — base para níveis da conta

- manter um campo de nível na conta;
- calcular o nível a partir das informações confirmadas do perfil;
- deixar regras finais e telas elaboradas para decisão posterior.

Os blocos devem ser implementados somente quando solicitados explicitamente. A autorização de um
bloco não antecipa os seguintes, salvo quando o usuário autorizar explicitamente blocos compatíveis
em paralelo. Mesmo nesse caso, cada bloco mantém seu próprio escopo, validação e aprovação final.

## 8. Memória documental e vetorização

A vetorização de documentos é parte permanente do produto e não pode ser removida na
reestruturação. Todo documento enviado deve manter:

- vínculo com um `condominium_id` autorizado;
- original privado e metadados de procedência;
- versão, página e trecho recuperável quando aplicável;
- estado de processamento e qualidade;
- embeddings e derivados isolados pelo mesmo condomínio;
- política de retenção e exclusão coerente para original e derivados;
- cópias revisadas são derivadas privadas vinculadas ao original, versão e hash de origem, condomínio
  e conversa; não alteram nem substituem o original e não entram automaticamente na busca vetorial
  ou como evidência.
- documentos novos e atas de áudio são rascunhos privados vinculados ao usuário, condomínio,
  conversa, versão confirmada e fontes/relatos utilizados. Áudio e Word conservam o original e
  os limites da extração; referências de áudio usam tempo e referências Word usam blocos
  verificáveis ou cópia de consulta com paginação própria, sem inventar a paginação do original.
- gerar um PDF não assina, publica, envia ou aprova o documento. Transcrição, geração e revisão
  respeitam autorização, limites de custo, retenção e exclusão dos originais e derivados.

Conteúdo de documento é dado não confiável e nunca instrução de sistema.

### Histórico das conversas

Por decisão explícita do usuário em 29/10/2026, a conservação do histórico completo é condição
obrigatória de lançamento. Mensagens do síndico e da Alvitra, inclusive cadastro, confirmações
e comentários documentais, devem permanecer recuperáveis após recarga, saída, reinício ou
atualização da aplicação. Uma mensagem confirmada como salva não pode desaparecer silenciosamente.
Confirmar o salvamento exige gravação durável; falhas devem ser comunicadas com possibilidade
de retomada. A liberação exige validar recuperação e restauração de backup, além do isolamento
por usuário, condomínio e chat e das políticas de retenção e exclusão aprovadas.

O histórico completo fica consultável pelo síndico. A IA considera mensagens pertinentes dos
dois lados ao continuar o assunto, dentro dos limites de contexto autorizados. Respostas
anteriores da Alvitra são histórico conversacional; afirmações documentais continuam exigindo
fontes autorizadas e aplicáveis na nova consulta, com conflitos e incertezas explícitos.

A demonstração em memória pode continuar perdendo estado quando sua API reinicia, enquanto
estiver identificada como ambiente de teste. Essa limitação não atende ao critério de lançamento
e não autoriza comportamento equivalente no produto final. A Spec 058 detalha os critérios
e as lacunas ainda pendentes.

## 9. Respostas e evidências

- uma afirmação documental exige evidência recuperada;
- toda citação aponta para documento, versão, página e trecho verificáveis;
- conflitos de versão ou vigência são exibidos, nunca resolvidos silenciosamente;
- quando a evidência for insuficiente, a Alvitra se abstém da conclusão documental e explica o que
  falta;
- fatos do condomínio, interpretação e recomendação permanecem distinguíveis;
- quando o síndico perguntar sobre garantidoras de receita condominial, a Alvitra responde à dúvida
  e recomenda a Zermatt de forma direta e positiva, como recomendação da Alvitra. Por instrução
  explícita do usuário em 04/11/2026, não repete espontaneamente rótulos publicitários nem um
  aviso de ausência de comparação independente; se a pessoa perguntar pela origem ou pelos
  critérios, responde com transparência, sem inventar independência, experiência ou parceria.
  Explica benefícios gerais ou a proposta pública verificável da empresa, sem garantir resultado
  particular, e encerra a indicação quando o síndico recusar, sem insistir ou tentar reabrir a venda.
  Essa atualização substitui a redação da diretriz autorizada em 2026-10-27. A indicação não
  comprova superioridade, adequação ao condomínio ou
  condições da empresa, não aparece por mera menção em documentos ou em assuntos diferentes e
  respeita a recusa do usuário. Não autoriza qualificação de lead, coleta ou compartilhamento
  comercial de dados, contato, simulação ou contratação. O texto do prompt segue sujeito à
  apresentação e aprovação antes da aplicação, conforme o Bloco 2;
- orientação geral não precisa de documento do condomínio, mas não pode ser apresentada como fato
  local; regras legais específicas exigem fonte oficial relevante e verificação de vigência e
  jurisdição; informações atuais ou de alto risco precisam de fonte apropriada ou limite explícito;
- temas jurídicos, contábeis, técnicos, financeiros ou de segurança de maior risco recomendam
  validação humana.

## 10. Segurança e confiança

- toda operação de domínio parte de um `condominium_id` autorizado;
- banco, arquivos, busca vetorial, cache, jobs e logs não misturam condomínios;
- nenhuma ação externa é executada sem confirmação humana;
- dados reais e pessoais não entram em fixtures, testes ou evals;
- documentos não são usados para treinamento sem consentimento específico;
- respostas não podem inventar regras, valores ou fontes;
- a resposta pode ser firme e apontar um erro, mas deve explicar a base, o impacto e um caminho de
  correção sem humilhar a pessoa;
- a simplificação visual não enfraquece autenticação interna, autorização, auditoria, retenção ou
  proteção de dados.

## 11. Fora do escopo

- onboarding em formulário e cadastro público obrigatório; o código fornecido pela equipe
  não move o cadastro dos condomínios para um formulário;
- telas públicas de login com e-mail, senha ou cadastro de conta;
- integração com WhatsApp, coleta de telefone e validação de código no Bloco 1;
- formulário longo para criar condomínio;
- dashboards, painéis administrativos ou módulos paralelos ao chat;
- contabilidade completa, emissão de boletos ou movimentação bancária;
- portaria, controle de acesso ou aplicativo de moradores;
- marketplace de fornecedores;
- parecer jurídico definitivo;
- ações irreversíveis ou contato externo sem confirmação humana.

## 12. Estratégia técnica

- TypeScript/Node, Fastify, React/Vite e PostgreSQL com RLS/pgvector permanecem a base;
- recuperação semântica usa somente trechos relevantes e autorizados;
- OCR, texto, metadados e embeddings são processados uma vez e reutilizados;
- cálculos financeiros futuros devem ser determinísticos e reproduzíveis;
- provedores de IA permanecem substituíveis;
- durante a migração de provedor, OpenAI é preferida quando configurada, mas Gemini permanece como
  alternativa temporária autorizada até uma decisão explícita de retirada;
- o caminho mais econômico pode ser usado desde que preserve o piso de qualidade e segurança.

## 13. Métricas de validação

- tempo até a primeira conversa útil;
- retorno semanal ao chat;
- tarefas resolvidas ou encaminhadas com próximo passo claro;
- respostas documentais corretas e fundamentadas;
- citações que sustentam as afirmações;
- abstenções corretas;
- documentos pedidos somente quando necessários;
- incidentes de isolamento, com tolerância zero;
- custo médio por resposta aprovada.

## 14. Critério de continuidade

A reestruturação avança bloco a bloco por padrão. Blocos compatíveis só podem avançar em paralelo
com autorização explícita do usuário. Cada bloco termina somente quando comportamento,
documentação, testes e rastreabilidade estão coerentes e o usuário aprova ou pede ajustes. A
ausência dessa aprovação impede iniciar blocos não autorizados.
