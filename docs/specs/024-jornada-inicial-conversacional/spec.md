# Spec 024 — Entrada separada e configuração inicial conversacional

**Status:** implementada; entrada e identidade provisória complementadas pela Spec 027
**Responsável:** produto e engenharia  
**Atualizado em:** 2026-10-26

## 0. Alinhamento com a visão do projeto

### Partes do briefing atendidas

| Dimensão da visão | Seções do briefing | Como esta spec contribui                                                                     |
| ------------------- | ------------------ | -------------------------------------------------------------------------------------------- |
| Hipótese e problema | §§2 e 4            | Coleta o contexto mínimo sem formulário e reduz a ambiguidade da primeira conversa.          |
| Experiência         | §§1 e 6            | Separa a entrada mínima do chat e faz a Alvitra iniciar a configuração.                      |
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
- explicação clara de que documentos não são exigidos naquele momento, mas são necessários para a Alvitra conhecer o condomínio e dar respostas locais confiáveis; podem ser enviados depois, aos poucos.

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

As mensagens da Alvitra são identificadas visualmente pela posição à esquerda e por uma linha
lateral anil discreta, mantendo fundo transparente e a tipografia editorial da conversa. O nome
“Alvitra” não se repete sobre cada mensagem.

No modo de demonstração, o nome de usuário informado antes do chat identifica somente o acesso
provisório e não responde essa pergunta nem alimenta o perfil do síndico.

### RQ-2403 — Documentos necessários, enviados depois

O cadastro não pede documento nem espera uma resposta sobre anexos. Ao concluir o contexto inicial, a Alvitra explica que os documentos relevantes são necessários para conhecer o condomínio e responder com segurança sobre regras, decisões, valores e histórico, mas que a pessoa não precisa enviá-los naquele momento: convenções, regimentos, atas, contratos e balancetes podem ser enviados depois, aos poucos. Sem o material necessário, a Alvitra mantém orientação geral e próximos passos, mas não apresenta conclusões locais como confirmadas.

### RQ-2406 — Continuidade conversacional

Quando já existir um contexto autorizado, a Alvitra não reinicia o cadastro nem pede novamente o nome da pessoa, a quantidade de condomínios ou dados já confirmados. Ela cumprimenta a pessoa e abre espaço para uma solicitação em linguagem natural, sem perguntas sugeridas ou botões de atalho no início do chat.

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
- o cadastro não solicita documento e a ausência de anexo não bloqueia o uso.
- um contexto já configurado retoma a conversa sem repetir perguntas de cadastro ou exibir perguntas prontas.

## 11. Questões em aberto

- Telefone e código pelo WhatsApp serão especificados antes da autenticação definitiva.
