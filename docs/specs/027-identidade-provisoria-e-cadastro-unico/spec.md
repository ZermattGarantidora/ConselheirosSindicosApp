# Spec 027 — Identidade provisória e cadastro único no modo de demonstração

**Status:** implementada e aguardando validação do usuário
**Responsável:** produto e engenharia
**Atualizado em:** 2026-10-19

## 0. Alinhamento com a visão do projeto

### Partes do briefing atendidas

| Dimensão da visão | Seções do briefing | Como esta spec contribui |
| --------------------- | --------------------- | ------------------------------------------------------------------------------------------------- |
| Problema e hipótese   | §§1, 2 e 4            | Evita repetir o cadastro e permite retomar o contexto com uma entrada curta.                      |
| Experiência           | §6 e §7, Blocos 1 e 5 | Mantém uma única informação provisória antes do chat e conduz os dados do condomínio na conversa. |
| Público e proposta    | §§3 e 5               | Personaliza a conversa para o síndico sem criar formulário longo.                                 |
| Segurança e confiança | §§8–10                | Separa identidades sintéticas e mantém condomínios e documentos no contexto autorizado.           |
| Validação             | §§13 e 14             | Testa continuidade, tempo até a conversa e ausência de repetição do cadastro.                     |

### Limites respeitados

- O nome de usuário é exclusivo do modo de demonstração e não constitui autenticação real.
- Não coleta senha, e-mail, telefone, documento pessoal ou dado de pagamento.
- A autenticação futura por telefone e código no WhatsApp continua fora desta fatia.
- O cadastro de condomínios continua na conversa e não exige envio imediato de documentos; os arquivos relevantes continuam necessários para respostas locais confiáveis e podem ser enviados depois.
- A identidade informada pelo cliente de demonstração não autoriza acesso em modo persistente.

### Divergências da visão

Nenhuma pendente. A entrada de demonstração deixa de ter somente o botão “Entrar” e passa a pedir um nome de usuário.
A mudança foi solicitada explicitamente pelo usuário em 2026-10-15 e foi incorporada ao briefing na
mesma decisão. A experiência definitiva de autenticação continua sendo telefone e código no
WhatsApp.

### Checklist de alinhamento

- [x] O briefing completo foi lido na versão atual.
- [x] A spec resolve um problema e testa a hipótese da conversa útil sem repetição de cadastro.
- [x] O público e a proposta de valor permanecem coerentes.
- [x] Itens posteriores e fora do escopo foram preservados.
- [x] Isolamento, evidência, custo e confirmação humana foram preservados.
- [x] Critérios de sucesso contribuem para continuidade e tempo até valor.
- [x] A divergência aprovada foi registrada no briefing.

## 1. Objetivo

Permitir que cada pessoa use um nome de usuário provisório no ambiente de demonstração, retome seu
contexto sem repetir o cadastro e confirme, na primeira conversa, o nome pelo qual deseja ser
chamada.

## 2. Promessa testada

> Informo um identificador de acesso, confirmo na conversa como quero ser chamado, configuro meus
> condomínios uma vez e a Alvitra retoma esse contexto quando volto.

## 3. Usuário primário

Síndico profissional ou morador testando a experiência local ou a demonstração sintética publicada.

## 4. Escopo

- campo único de nome de usuário antes do chat;
- aviso visível de que o acesso é provisório, sem senha e destinado a testes;
- identidade sintética determinística e separada por nome de usuário;
- retomada do contexto configurado quando o mesmo nome for usado novamente;
- coleta conversacional, somente no primeiro acesso, do nome pelo qual o síndico prefere ser
  chamado;
- cadastro conversacional de quantidade de condomínios, nome e unidades somente quando ainda não
  houver contexto autorizado;
- uso do nome do síndico nas boas-vindas, na conclusão do cadastro, na retomada e nas respostas da
  Alvitra;
- lembrança local do último nome usado apenas para facilitar recarga e abertura de nova aba.

## 5. Fora do escopo

- senha, e-mail, telefone, WhatsApp, recuperação de conta ou autenticação forte;
- garantia de identidade, exclusividade global do nome ou uso dessa entrada em produção real;
- persistência de conteúdo de chats no navegador;
- alteração de autorização, RLS, vetorização, citações ou retenção documental.

## 6. Pré-condições

- o servidor está explicitamente no modo de demonstração/desenvolvimento;
- toda operação de domínio continua vinculada ao `condominium_id` autorizado para a identidade
  sintética selecionada.

## 7. Requisitos funcionais

### RQ-2701 — Entrada provisória transparente

A página de entrada pede somente um nome de usuário, permite entrar pelo botão ou pela tecla Enter e
informa que o acesso é provisório, sem senha e usado apenas para separar sessões de teste. O aviso
explica que a autenticação definitiva será feita futuramente pelo WhatsApp.

### RQ-2702 — Identidade sintética estável e isolada

O mesmo nome normalizado produz a mesma identidade sintética no navegador. Nomes diferentes não
compartilham condomínios, documentos ou histórico. O identificador de desenvolvimento não é usado
quando a autenticação real estiver ativa.

### RQ-2703 — Cadastro uma única vez

Sem cadastro concluído, a Alvitra primeiro pergunta como a pessoa prefere ser chamada e depois
pergunta quantos condomínios ela administra. Em seguida, coleta nome e quantidade de unidades de
cada condomínio na conversa. Com um contexto já configurado, retoma diretamente o chat e não repete
essas perguntas. Saudações, respostas genéricas e frases que não representem um nome não são salvas
como nome de tratamento; a Alvitra pergunta novamente de forma natural.
Quando a resposta for uma saudação, a Alvitra corresponde ao cumprimento com cordialidade antes da
pergunta. Ela não oferece exemplos nem sugere nomes nessa retomada.
Quando a pessoa pedir ajuda ou um exemplo, a solicitação não é salva como nome: a Alvitra responde
ao pedido e mantém a pergunta atual. Uma declaração explícita como “meu nome é Alex, me chame
assim” corrige o nome de tratamento em qualquer etapa da configuração e a Alvitra retoma a pergunta
que havia sido interrompida. Marcas de formatação geradas pelo provedor nunca aparecem como
asteriscos literais na conversa.

Esses comportamentos são resolvidos por interpretação contextual do turno e do histórico recente,
não por frases prontas nem por expressões regulares de intenção no navegador. A resposta do modelo
é convertida em uma decisão estruturada e validada no servidor. Perguntas, pedidos de explicação,
saudações e comentários permanecem na etapa atual; somente uma resposta entendida e válida avança
o cadastro. Correções explícitas atualizam o campo correspondente sem transformar a própria frase
em dado cadastral.

### RQ-2704 — Tratamento pelo nome

O nome de usuário da entrada serve somente para localizar a identidade sintética. O nome de
tratamento confirmado na conversa acompanha o contexto da resposta. As etapas seguintes do
cadastro, a retomada e as respostas usam esse nome explicitamente. O gateway recebe o nome de
tratamento como contexto e a resposta final é endereçada à pessoa mesmo quando o provedor omite o
vocativo.

### RQ-2705 — Entrada degradada sem provedor

Somente quando o runtime informar autenticação de desenvolvimento e provedor local, a indisponibilidade de geração não bloqueia a abertura da interface. Um aviso operacional, não uma fala da assistente, explica que não há IA externa. Não são feitas chamadas de boas-vindas/retomada nem inventadas falas. Perfil já confirmado pode ser restaurado sob a mesma autorização existente. Novo perfil permanece pendente, sem coletar nome por heurística, criar associação ou habilitar anexos sem cadastro/contexto autorizado; o envio de turnos de configuração fica desativado. O modo normal com provedor e o modo persistido não ganham bypass. Esta degradação aplica o briefing §1 (estados operacionais distintos da fala), §§6 e 8–10; não substitui cadastro conversacional nem cria novo fluxo de produto.

## 8. Contratos

- o cliente envia `x-development-user-id` no modo de desenvolvimento e só envia o nome de tratamento
  após ele ser confirmado na conversa;
- `GET /v1/chat/bootstrap` resolve apenas condomínios autorizados para essa identidade;
- `POST /v1/condominiums/:condominiumId/questions` resolve o nome no servidor antes de gerar a
  resposta;
- o último nome de usuário é lembrado sob uma chave local exclusiva da identidade provisória;
- o perfil mínimo local mantém separadamente o nome de tratamento confirmado e os condomínios
  necessários para restaurar a demonstração após reinício; conversas e documentos não são gravados
  nessa chave.
- cada turno da configuração envia ao servidor a etapa, os dados já confirmados, a mensagem atual e
  somente o histórico recente necessário para interpretação;
- o servidor aceita apenas as intenções e os campos previstos no contrato, valida nome e limites
  numéricos e devolve a fala natural separada da atualização estruturada;
- texto do usuário e histórico são dados não confiáveis e não podem alterar o contrato, permissões
  ou escopo da configuração.

## 9. Requisitos não funcionais

- o formulário permanece utilizável a partir de 320 px e possui rótulo e mensagens acessíveis;
- o nome tem entre 2 e 60 caracteres, sem caracteres de controle;
- uma saudação ou resposta genérica isolada, como “olá”, não é aceita como nome de tratamento;
- dados sintéticos de usuários diferentes não se misturam;
- nenhum segredo ou dado de usuário entra em logs, fixtures ou telemetria em texto claro.

## 10. Critérios de sucesso

- um nome de usuário novo inicia o cadastro perguntando como a pessoa prefere ser chamada e depois
  pergunta a quantidade de condomínios;
- o mesmo nome retoma um contexto configurado sem repetir o cadastro;
- um nome diferente não enxerga o contexto anterior;
- a Alvitra não usa o nome de usuário como nome pessoal e usa o nome confirmado na conversa nas
  etapas seguintes, na retomada e nas respostas;
- o aviso de acesso provisório fica visível antes da entrada;
- todos os testes de isolamento, documentos, respostas e cobertura continuam aprovados.

## 11. Questões em aberto

- definir, antes da autenticação definitiva, recuperação de acesso, troca de aparelho, expiração e
  revogação de sessão no fluxo por WhatsApp.

## Gate para mudar o status

Exige critérios de aceitação, rastreabilidade, testes determinísticos de identidade e retomada,
validação visual em celular e desktop e execução dos gates aplicáveis.
