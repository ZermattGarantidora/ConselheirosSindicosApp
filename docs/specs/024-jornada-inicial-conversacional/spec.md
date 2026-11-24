# Spec 024 — Entrada separada e configuração inicial conversacional

> A Spec 068, autorizada em 05/11/2026, substitui a entrada por nome de usuário e a
> lembrança local por código fornecido pela equipe, sessão persistente e código em Perfil.
> As demais regras conversacionais e de autorização desta spec permanecem aplicáveis.

> A Spec 044 substitui a localização e composição visual dos requisitos RQ-2404, RQ-2405 e
> RQ-2407: condomínios e chats à esquerda; documentos e Perfil à direita. As demais regras de
> cadastro, aparência, saída e autorização permanecem. Os trechos anteriores de menu abaixo são históricos.

**Status:** implementada; entrada e identidade provisória complementadas pela Spec 027
**Responsável:** produto e engenharia  
**Atualizado em:** 2026-11-03

## 0. Alinhamento com a visão do projeto

### Partes do briefing atendidas

| Dimensão da visão | Seções do briefing | Como esta spec contribui                                                                     |
| ------------------- | ------------------ | -------------------------------------------------------------------------------------------- |
| Hipótese e problema | §§2 e 4            | Coleta o contexto mínimo sem formulário e reduz a ambiguidade da primeira conversa.          |
| Experiência         | §§1 e 6            | Separa a entrada mínima do chat e faz a Alvitra iniciar a configuração.                      |
| Escrita contínua    | §§1, 2 e 6.5       | Deixa o campo de mensagem pronto ao abrir e retomar o chat, reduzindo cliques sem criar outro fluxo. |
| Identidade visual  | §§1, 6 e 7, Bloco 4 | Usa o azul principal solicitado nos controles e na conversa, com contraste nos modos claro e escuro. |
| Leitura da conversa | §§1, 2 e 6 | Mantém a tipografia grande da configuração em todas as falas da Alvitra, evitando mudança de escala ao continuar a conversa. |
| Acolhimento         | §§1, 6.2 e 7, Bloco 2 | Mantém boas-vindas geradas e naturais, sem atribuir gênero à pessoa pelo nome ou acesso provisório. |
| Menu e perfil       | §7, Blocos 4 e 5   | Oferece perfil compacto sobre o chat, com nome confirmado, tema, saída e documentos autorizados; coleta nome e unidades pela conversa. |
| Memória documental  | §8                 | Mantém documentos vinculados ao condomínio autorizado e visíveis por tipo.                   |
| Segurança           | §§9 e 10           | Nenhum documento cruza condomínio e nenhuma criação ocorre sem resposta explícita da pessoa. |
| Validação           | §§13 e 14          | Testa tempo até contexto útil, clareza da primeira conversa e configuração sem envio imediato. |

### Limites respeitados

- A página de entrada não coleta e-mail, senha ou telefone; WhatsApp continua futuro.
- A configuração não usa formulário, não exige envio imediato de documento e não executa ação externa.
- “Perfil” permite apenas consulta do nome, alternância de tema, saída e acesso aos documentos de condomínios autorizados; não cria editor, planos, notificações ou configurações avançadas.
- A conversa continua sendo a única interface de trabalho depois da entrada.

### Divergências da visão

Nenhuma. O briefing foi atualizado na mesma decisão explícita do usuário para substituir a entrada direta no chat pela página mínima de acesso e redefinir o menu.
Em 2026-10-20, o usuário solicitou substituir “Dados” por “Perfil”, com modo escuro, saída e poucas
opções básicas. O ajuste de apresentação foi refletido no Bloco 4 do briefing e na projeção do MVP.

O gate competitivo (§4 da diretriz) mantém o chat como experiência principal e limita a mudança ao
menu já autorizado: reduz atrito de leitura e troca de acesso, preserva documentos isolados e
retomada contextual. O valor documental continua vindo da memória verificável, sem alterar a IA.
Testes de preferências, saída e autorização verificam o resultado; a implementação local não
introduz dependências, serviços ou custo de IA e não antecipa blocos posteriores.

O ajuste de boas-vindas solicitado em 2026-10-27 detalha o acolhimento já autorizado: preserva a
geração contextual e a memória documental verificável, reduz desconforto na primeira interação e
na retomada, sem novo fluxo, provedor ou chamada adicional. Testes do prompt de configuração e
uma conferência sintética da geração verificam a linguagem sem marcação de gênero.

O foco automático solicitado em 2026-10-27 detalha a continuidade da conversa: atua no compositor
existente, reduz cliques entre mensagens e preserva a navegação por teclado nos controles
auxiliares. Não muda IA, documentos, autorização ou custos. Testes de foco e conferência no
navegador validam a redução de atrito, sem dependência ou bloco adicional.

O pedido de 2026-10-27 sobre a mensagem de documentos detalha briefing §§1, 6.4, 7 (Bloco 6) e 9:
a fala deve destacar o envio como essencial para conhecer o condomínio e a dificuldade de ajudar
com precisão sem essa base. O gate competitivo é atendido por esclarecer o diferencial da memória
documental na conversa existente, preservando orientação geral, isolamento e envio explícito.
Testes e geração sintética validam a mudança, sem novo fluxo, provedor ou chamada adicional.

O azul principal solicitado em 2026-10-27 detalha a aparência da experiência existente: mantém
o chat, pertence aos controles já autorizados, torna a marca consistente e preserva contraste e
significado dos estados. O gate competitivo é atendido sem fluxo, dependência ou custo adicional;
build, regressões visuais existentes e conferência no navegador validam o resultado.

A uniformização tipográfica solicitada em 2026-10-29 detalha a conversa existente (briefing §§1,
2 e 6): mantém o chat como experiência principal e a leitura contínua, sem antecipar blocos.
Atende ao gate competitivo por reduzir atrito na consulta da memória documental já autorizada,
preservando evidências, isolamento e confirmação humana. Uma regra de apresentação compartilhada,
regressão de interface e conferência visual demonstram o resultado, sem dependência, serviço,
chamada de IA ou complexidade de domínio adicional.

A correção de 03/11/2026 detalha briefing §§6.2–6.5 e 7, Bloco 5: confirmar o nome do
condomínio não encerra a configuração nem substitui a pergunta de apartamentos. Atende ao gate
competitivo por manter a conversa existente e reduzir um bloqueio na coleta do contexto, sem
novo fluxo ou dependência. Uma validação de saída e, somente quando necessária, uma tentativa
adicional no mesmo gateway impedem publicar a omissão conhecida. Testes sintéticos verificam
sequência, correções, limite de tentativas e ausência de gravação da fala rejeitada. O custo
normal permanece uma geração; uma reparação pode acrescentar uma geração com o mesmo teto.

### Checklist de alinhamento

- [x] O briefing completo foi lido na versão atual.
- [x] A spec resolve um problema ou testa uma hipótese descrita no briefing.
- [x] O público e a proposta de valor permanecem coerentes.
- [x] Prioridades e itens fora do escopo foram respeitados.
- [x] Princípios de segurança, custo e confirmação humana foram preservados.
- [x] Critérios de sucesso contribuem para as métricas de validação do briefing.
- [x] Não existe divergência silenciosa.

## 1. Objetivo

Fazer a Alvitra receber o síndico em uma página mínima de entrada e conduzir no chat uma configuração adaptada à quantidade de condomínios, sem exigir que os documentos sejam enviados naquele momento.

## 2. Promessa testada

> Entro, respondo perguntas simples na conversa e deixo a Alvitra pronta para conhecer meus condomínios e documentos.

## 3. Usuário primário

Síndico profissional ou morador entrando pela primeira vez ou complementando sua carteira de condomínios.

## 4. Escopo

- página anterior ao chat com um único botão “Entrar”;
- menu sanduíche no canto superior direito do chat;
- menu com “Condomínios” e “Perfil”;
- identificação visual do condomínio atual dentro da lista de condomínios;
- perfil compacto com nome confirmado na conversa, escolha de tema claro ou escuro (claro por padrão) e saída da conta;
- lista expansível de condomínios no próprio menu, com acesso “Documentos enviados” dentro do condomínio selecionado;
- boas-vindas iniciadas pela Alvitra, que pergunta como a pessoa prefere ser chamada e conduz o cadastro do condomínio;
- ao retomar um contexto já autorizado, saudação conversacional sem repetir perguntas de cadastro;
- nenhuma pergunta pronta ou sugestão clicável no início do chat;
- configuração de quantidade de condomínios, nome e quantidade de apartamentos, sem etapas ou contagem redundantes quando houver somente um;
- sequência de um condomínio por vez, com progresso explícito, somente quando houver mais de um;
- explicação clara de que enviar os documentos relevantes é essencial para conhecer o condomínio e que, sem eles, fica difícil ajudar com precisão, com convite ao envio pela conversa.

## 5. Fora do escopo

- autenticação por WhatsApp;
- formulário de onboarding ou criação de condomínio;
- upload documental obrigatório dentro do cadastro inicial;
- alteração das regras de autorização, vetorização, citações ou retenção.

## 6. Pré-condições

- a API identifica a pessoa ou a identidade sintética local;
- toda criação e consulta de documento preserva `condominium_id` e autorização vigente.

## 7. Requisitos funcionais

### RQ-2401 — Entrada mínima separada

Antes da conversa, a interface mostra somente a apresentação da Alvitra e o botão “Entrar”. Depois da entrada, esse botão desaparece e seu lugar no cabeçalho é ocupado pelo menu sanduíche.

### RQ-2402 — Cadastro guiado pela Alvitra

A primeira mensagem dá boas-vindas e pergunta como a pessoa prefere ser chamada, em uma mensagem da própria Alvitra, sem sugestões ou perguntas clicáveis. Em seguida, pergunta quantos condomínios a pessoa administra. Quando a resposta for um, pede diretamente o nome e a quantidade de apartamentos ou unidades, sem dizer “um por vez” nem mostrar “1 de 1”. Quando houver mais de um, configura um por vez e informa o progresso entre eles.

Após confirmar um dado, a fala gerada precisa perguntar pelo próximo campo pendente, conforme
a transição validada. Confirmar o nome do condomínio exige perguntar a quantidade de apartamentos
ou unidades, sem anunciar o contexto concluído ou salvo. Correções de campos anteriores retomam
a pergunta interrompida; depois das unidades de um condomínio intermediário, pede o nome do
seguinte. A confirmação final fica restrita ao último condomínio com unidades informadas.

As boas-vindas e a pergunta sobre como chamar a pessoa usam linguagem sem marcação de gênero,
inclusive quando houver nome confirmado. A geração pode usar construções como “Olá” e “Que bom
ter você aqui”, sem frase fixa. Não usa “bem-vindo”, “bem-vinda”, variantes com espaço, “(a)” ou
“o/a”, nem deduz gênero pelo nome ou identificador provisório.

As mensagens da Alvitra são identificadas visualmente pela posição à esquerda e por uma linha
lateral anil discreta, mantendo fundo transparente e a tipografia editorial da conversa. O nome
“Alvitra” não se repete sobre cada mensagem.

No modo de demonstração, o nome de usuário informado antes do chat identifica somente o acesso
provisório e não responde essa pergunta nem alimenta o perfil do síndico.

### RQ-2403 — Comunicar a importância essencial dos documentos

Ao concluir o contexto inicial, a Alvitra explica que enviar os documentos relevantes é essencial para conhecer o condomínio e ajudar com precisão sobre suas regras, decisões, valores e histórico. Diz de forma natural que, sem eles, fica difícil oferecer essa ajuda e convida ao envio pela conversa. Não diz “não precisa enviar”, não sugere adiamento espontâneo nem trata os arquivos como opcionais. Pede somente o material pertinente à necessidade apresentada, sem lista genérica. A conclusão do cadastro não aguarda upload ou confirmação sobre anexos. Enquanto o material não estiver disponível, a Alvitra mantém orientação geral e próximos passos, sem apresentar conclusões locais como confirmadas.

### RQ-2406 — Continuidade conversacional

Quando já existir um contexto autorizado, a Alvitra não reinicia o cadastro nem pede novamente o nome da pessoa, a quantidade de condomínios ou dados já confirmados. Ela cumprimenta a pessoa e abre espaço para uma solicitação em linguagem natural, sem perguntas sugeridas ou botões de atalho no início do chat.

A saudação de retomada e a abertura de uma nova conversa seguem a mesma regra de acolhimento
sem marcação de gênero de RQ-2402, mesmo quando usam o nome confirmado.

A espera de uma pergunta contempla as duas gerações já permitidas para resposta e reparação,
cada uma limitada a 300 segundos, com margem de 30 segundos. O navegador não abandona a resposta
após 70 segundos enquanto o servidor ainda trabalha. Isso não cria tentativa ou reparação nova.

### RQ-2404 — Dados documentais organizados

“Condomínios” expande sua lista no próprio menu, sem abrir uma tela intermediária. O condomínio
selecionado contém o acesso “Documentos enviados”, que consulta somente os arquivos autorizados
desse condomínio e os agrupa por tipo. O retorno dessa lista leva ao início do menu.

### RQ-2407 — Perfil compacto

“Perfil” substitui “Dados” no menu. Exibe somente o nome de tratamento confirmado na conversa,
“Aparência” com as opções “Claro” e “Escuro” e “Sair da conta”. Sem nome confirmado, exibe “Seu
perfil”, sem usar o identificador provisório como nome pessoal. Mantém um aviso curto de acesso
provisório quando estiver no modo de demonstração e permanece utilizável a partir de 320 px. A saída
fica no rodapé do perfil, em um botão vermelho com texto branco.

O menu sanduíche ocupa a lateral direita desde abaixo do cabeçalho até a base da tela, com
rolagem interna quando necessária. Os itens do menu principal ficam agrupados no topo.
“Condomínios” fica no início e expande sua lista abaixo do próprio botão; a lista destaca o
condomínio atual, sem cartão separado no topo do menu. “Documentos enviados” aparece somente
dentro do condomínio selecionado; o perfil não repete atalhos de condomínios ou documentos.

### RQ-2408 — Tema de aparência

O seletor “Aparência” oferece “Claro” e “Escuro”, funciona por teclado e informa a opção selecionada
às tecnologias assistivas. Sem escolha válida salva, usa sempre o modo claro, independentemente
da preferência do sistema operacional.
Muda as superfícies e textos da entrada, chat, compositor, menus, histórico e tela documental.
O tema é uma preferência de aparência deste navegador, sem conteúdo de condomínio. A escolha
persiste após recarga e saída, inclusive quando a pessoa escolheu o modo escuro. Se o
armazenamento estiver indisponível, o tema continua funcionando na página atual.

### RQ-2409 — Sair da conta

No modo de demonstração, remove apenas a lembrança do último acesso e retorna à entrada com nome
vazio. A saída descarta o estado em memória da página, incluindo anexos, respostas e operações
pendentes, preservando cadastros e documentos para retomada explícita posterior. No modo real,
revoga a sessão pela API existente antes de voltar à entrada. Uma falha de revogação mantém a
pessoa no perfil, informa o erro e permite tentar novamente; não simula saída bem-sucedida.

### RQ-2405 — Tela documental do condomínio atual

Revisado pelo pedido explícito de 2026-10-26: “Condomínios” expande a lista no próprio menu, que
destaca o selecionado e contém seu atalho “Documentos enviados”. O cartão de condomínio atual no
topo e uma tela intermediária de condomínios deixam de ser apresentados. A consulta documental
continua autorizada e limitada ao condomínio selecionado.

### RQ-2410 — Campo de mensagem pronto para escrever

O campo de mensagem recebe foco quando o chat fica disponível, inclusive no cadastro inicial,
na abertura ou troca de conversa e ao retornar de um menu ou documento. Depois de enviar uma
mensagem ou anexo, ou de uma falha recuperável, o foco volta quando o campo é habilitado novamente.
As mesmas condições que desabilitam o campo continuam impedindo digitação e envio.

O foco automático não desloca a rolagem nem interfere enquanto a barra lateral, menu da conta,
menu de anexos, biblioteca documental, visualizador ou citação estiverem abertos. A pessoa pode
usar Tab, selecionar texto e interagir com outros controles; não há captura global de teclas,
temporizador contínuo ou redirecionamento obrigatório ao perder o foco.

### RQ-2411 — Azul principal

O azul principal da Alvitra é `#0A1330`. A marca, os botões principais e as mensagens da pessoa
usam essa base; sombras, foco e estados de hover derivam da mesma paleta. Entrada, chat, menus
e documentos compartilham os tokens de cor. Os preenchimentos principais mantêm essa cor nos
dois temas; textos, ícones e indicadores sobre superfícies escuras usam uma variante clara para
preservar legibilidade. O tema claro continua sendo o padrão.

### RQ-2412 — Tipografia uniforme nas falas da Alvitra

Toda fala da Alvitra usa a fonte editorial e a escala grande já adotadas na configuração:
`var(--font-display)`, tamanho `clamp(18.9px, 2.7vw, 25.2px)` e entrelinha `1.42`, conforme a
redução de 10% autorizada em RQ-1606/AC-1608 da Spec 016 em 03/11/2026. A regra vale para
boas-vindas, configuração, respostas atuais e do histórico, pontos de atenção, próximos passos,
recomendação de especialista e falas sobre documentos, inclusive a confirmação de condomínio.
O padrão permanece igual nos modos claro e escuro, com ajuste responsivo a partir de 320 px e
quebra de palavras longas para não exceder a largura da mensagem. Controles, fontes documentais,
relatórios calculados, estados operacionais e mensagens da pessoa mantêm sua tipografia própria.

## 8. Contratos

- `GET /v1/chat/condominiums` lista somente contextos autorizados.
- `GET /v1/condominiums/:condominiumId/documents` lista documentos autorizados por condomínio.
- a criação conversacional aceita o mínimo confirmado: nome e quantidade de unidades; dados adicionais podem ser aprendidos depois.
- `POST /v1/auth/logout` encerra a sessão real com credenciais da mesma origem; nenhuma chamada externa nova é introduzida.
- somente a preferência `alvitra.appearance` e a remoção de `alvitra.demo.identity` são necessárias no navegador; a saída não apaga perfis nem arquivos.

## 9. Requisitos não funcionais

- a experiência funciona a partir de 320 px;
- nenhum dado de documento é carregado antes da autorização;
- a jornada guiada é determinística e testável sem provedor de IA;
- falhas de criação ou carregamento permanecem visíveis e recuperáveis na conversa.

## 10. Critérios de sucesso

- o chat nunca aparece atrás do botão de entrada;
- a primeira pergunta parte da Alvitra e pede como a pessoa prefere ser chamada, sem usar pergunta pronta;
- um único condomínio é configurado sem contagem ou anúncio de sequenciamento;
- mais de um condomínio é configurado sequencialmente, com progresso útil;
- o cadastro é concluído com nome da pessoa, quantidade de condomínios, nome e unidades de cada condomínio;
- o perfil reúne poucas opções básicas; documentos continuam agrupados por tipo sem misturar tenants;
- alternar o tema melhora a leitura sem alterar contexto, mensagens ou autorização;
- sair retorna à entrada sem reapresentar o nome anterior e permite retomar o cadastro explicitamente;
- o menu alcança a base da tela, mantém os itens no topo e evita atalhos redundantes no perfil;
- documentos enviados continuam autorizados, agrupados por tipo e identificados por condomínio;
- a conclusão do cadastro enfatiza que os documentos são essenciais e que a ausência deles dificulta a ajuda local; o fluxo continua oferecendo orientação geral enquanto aguarda o envio.
- um contexto já configurado retoma a conversa sem repetir perguntas de cadastro ou exibir perguntas prontas.
- o campo de mensagem recebe foco ao ficar disponível e permite continuar escrevendo entre turnos sem novo clique, preservando os controles auxiliares e a navegação por teclado.
- todas as falas da Alvitra mantêm a fonte e o tamanho grande da configuração ao continuar ou retomar a conversa, inclusive orientações e falas documentais, em desktop e celular.

## 11. Questões em aberto

- Telefone e código pelo WhatsApp serão especificados antes da autenticação definitiva.
