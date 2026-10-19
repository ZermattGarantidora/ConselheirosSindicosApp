# Spec 024 — Entrada separada e configuração inicial conversacional

**Status:** implementada; entrada e identidade provisória complementadas pela Spec 027
**Responsável:** produto e engenharia  
**Atualizado em:** 2026-10-13

## 0. Alinhamento com a visão do projeto

### Partes do briefing atendidas

| Dimensão da visão | Seções do briefing | Como esta spec contribui                                                                     |
| ------------------- | ------------------ | -------------------------------------------------------------------------------------------- |
| Hipótese e problema | §§2 e 4            | Coleta o contexto mínimo sem formulário e reduz a ambiguidade da primeira conversa.          |
| Experiência         | §§1 e 6            | Separa a entrada mínima do chat e faz a Alvitra iniciar a configuração.                      |
| Menu e perfil       | §7, Blocos 4 e 5   | Organiza condomínios e documentos, e coleta nome e unidades pela conversa.                   |
| Memória documental  | §8                 | Mantém documentos vinculados ao condomínio autorizado e visíveis por tipo.                   |
| Segurança           | §§9 e 10           | Nenhum documento cruza condomínio e nenhuma criação ocorre sem resposta explícita da pessoa. |
| Validação           | §§13 e 14          | Testa tempo até contexto útil, clareza da primeira conversa e configuração sem envio imediato. |

### Limites respeitados

- A página de entrada não coleta e-mail, senha ou telefone; WhatsApp continua futuro.
- A configuração não usa formulário, não exige envio imediato de documento e não executa ação externa.
- “Dados” mostra apenas documentos de condomínios autorizados.
- A conversa continua sendo a única interface de trabalho depois da entrada.

### Divergências da visão

Nenhuma. O briefing foi atualizado na mesma decisão explícita do usuário para substituir a entrada direta no chat pela página mínima de acesso e redefinir o menu.

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
- menu com “Condomínios” e “Dados”;
- atalho para ver somente os documentos do condomínio atualmente selecionado, logo abaixo do nome dele no menu;
- documentos autorizados agrupados por tipo em “Dados”;
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

O menu “Dados” consulta somente condomínios autorizados e agrupa os documentos enviados por tipo, identificando o condomínio de origem.

### RQ-2405 — Tela documental do condomínio atual

O menu identifica o condomínio atualmente selecionado e, logo abaixo do nome, oferece o atalho “Ver documentos deste condomínio”. O atalho abre uma tela documental própria, com retorno ao chat, que mostra apenas documentos autorizados para esse mesmo condomínio, agrupados por tipo. A tela exibe um indicador de contexto calculado somente a partir dos tipos de documentos já processados; ele não representa certeza, vigência ou conhecimento não documentado.

## 8. Contratos

- `GET /v1/chat/condominiums` lista somente contextos autorizados.
- `GET /v1/condominiums/:condominiumId/documents` lista documentos autorizados por condomínio.
- a criação conversacional aceita o mínimo confirmado: nome e quantidade de unidades; dados adicionais podem ser aprendidos depois.

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
- “Dados” agrupa documentos por tipo sem misturar tenants;
- o atalho do condomínio atual não exibe documentos de outro condomínio;
- a tela documental informa de forma transparente o contexto disponível a partir dos documentos processados;
- o cadastro não solicita documento e a ausência de anexo não bloqueia o uso.
- um contexto já configurado retoma a conversa sem repetir perguntas de cadastro ou exibir perguntas prontas.

## 11. Questões em aberto

- Telefone e código pelo WhatsApp serão especificados antes da autenticação definitiva.
