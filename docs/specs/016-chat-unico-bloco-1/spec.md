# Spec 016 — Chat único, Bloco 1 da reestruturação

**Status:** implementada e aguardando aprovação do usuário
**Responsável:** produto e engenharia  
**Atualizado em:** 2026-10-09

## 0. Alinhamento com a visão do projeto

### Partes do briefing atendidas

| Dimensão da visão | Seções do briefing | Como esta spec contribui |
|---|---|---|
| Problema e hipótese | §§2 e 4 | Reduz o tempo até a primeira interação útil e mantém a ajuda em linguagem natural. |
| Público | §3 | Oferece uma entrada direta para síndicos profissionais e moradores. |
| Proposta de valor | §§5 e 6 | Faz da conversa a única experiência e pede contexto dentro dela. |
| Prioridade atual | §7, Bloco 1 | Remove as telas antigas e abre a raiz diretamente no chat. |
| Memória documental | §8 | Preserva upload, processamento, vetorização e recuperação por condomínio. |
| Segurança e confiança | §§9 e 10 | Mantém evidências, abstenção, conflitos, autorização e revisão humana. |
| Validação | §§13 e 14 | Mede entrada direta, permanência do fluxo documental e bloqueia avanço sem aprovação. |

### Limites respeitados

- Não define nem aplica a personalidade do Bloco 2.
- Não cria múltiplos chats, barra lateral, menu, perfil conversacional, raio-X ou níveis.
- Não transforma a simplificação visual em acesso sem autorização ao domínio.
- Não remove processamento, embeddings, busca ou citações documentais.

### Divergências da visão

Nenhuma. A retirada de formulários de autenticação, cadastro e criação de condomínio foi aprovada
explicitamente pelo usuário. Em 2026-10-09, o usuário refinou a entrada para manter um único botão
“Entrar”; telefone e código pelo WhatsApp continuam como direção futura.

### Checklist de alinhamento

- [x] O briefing completo foi lido na versão atual.
- [x] A spec resolve um problema ou testa uma hipótese descrita no briefing.
- [x] O público e a proposta de valor permanecem coerentes.
- [x] Prioridades e itens fora do escopo foram respeitados.
- [x] Princípios de segurança, custo e confirmação humana foram preservados.
- [x] Critérios de sucesso contribuem para as métricas de validação do briefing.
- [x] Não existe divergência silenciosa.

## 1. Objetivo

Fazer a página inicial abrir diretamente em uma conversa funcional com a Alvitra, eliminando da
experiência as telas e componentes que não pertencem ao conceito de chat único.

## 2. Promessa testada

> Abro a Alvitra e já posso conversar ou anexar um documento, sem passar por outra tela.

## 3. Usuário primário

Síndico profissional ou morador com contexto interno autorizado pelo servidor.

## 4. Escopo

- uma única raiz visual de chat;
- remoção de landing page, formulários de login, cadastro, onboarding, criação de condomínio,
  seletor, perfil, configurações e painel administrativo da interface;
- um único botão “Entrar”, que inicia o carregamento de um contexto já autorizado, sem escolha
  visual nesta fatia;
- histórico, perguntas, respostas, citações e feedback dentro da conversa;
- envio explícito de PDF ou imagem pelo compositor;
- manutenção do processamento e da vetorização existentes.

## 5. Fora do escopo

- qualquer implementação dos Blocos 2 a 8;
- coleta de telefone, envio de código ou integração com WhatsApp;
- criação conversacional de conta ou condomínio;
- escolha entre vários condomínios;
- mudança de system prompt;
- remoção de tabelas, migrations ou serviços internos necessários a autorização, auditoria,
  retenção e vetorização.

## 6. Pré-condições

- a API informa o modo de execução;
- existe ao menos um contexto autorizado para a sessão ou para a identidade sintética local;
- o pipeline documental continua disponível.

## 7. Requisitos funcionais

### RQ-1601 — Entrada direta

Ao carregar `/`, o aplicativo renderiza imediatamente o chat com a marca Alvitra e um único botão
“Entrar”. Não apresenta e-mail, senha, telefone, cadastro, onboarding ou criação de condomínio.

### RQ-1602 — Contexto automático e seguro

Depois do clique em “Entrar”, o cliente obtém um contexto já autorizado. Em modo sintético usa a
identidade de desenvolvimento; em modo persistente usa apenas a sessão HttpOnly existente. A
ausência de contexto produz uma mensagem no chat e não expõe dados.

### RQ-1603 — Conversa documental

O usuário envia uma pergunta pelo compositor, vê a própria mensagem, recebe a resposta no mesmo
fluxo e pode abrir cada citação. Abstenção, conflito, pontos de atenção, próximo passo e indicação de
especialista permanecem disponíveis.

### RQ-1604 — Documento no chat

Uma pessoa com `document:upload` pode selecionar PDF, JPEG ou PNG e somente o envia ao acionar o
botão de envio. O arquivo continua no pipeline atual de armazenamento, processamento e vetorização.

### RQ-1605 — Ausência das experiências removidas

O bundle principal não contém estados de tela ou componentes para landing page, autenticação,
cadastro, onboarding, criação/listagem de condomínio, perfil, configurações ou painel
administrativo. A revisão sintética deixa de ser uma rota alternativa do bundle principal.

## 8. Contratos

- `GET /v1/runtime` informa o modo de execução e o provedor disponível.
- `GET /v1/chat/bootstrap` resolve, no servidor, o primeiro condomínio autorizado e retorna
  `condominiumId`, papel e permissões; retorna `401`, `403` ou `404` sem revelar outro tenant.
- `GET /v1/condominiums/:condominiumId/history` carrega o histórico autorizado.
- `POST /v1/condominiums/:condominiumId/questions` cria uma resposta documental.
- `POST /v1/condominiums/:condominiumId/documents` mantém o upload e o processamento existentes.
- endpoints internos legados não são expostos pela interface e podem ser retirados em uma decisão
  posterior quando não forem mais necessários à migração ou segurança.

## 9. Requisitos não funcionais

- o layout ocupa a viewport e permanece utilizável a partir de 320 px de largura;
- controles interativos têm nome acessível e área de toque adequada;
- falha de inicialização ou rede é apresentada como mensagem compreensível no chat;
- nenhum identificador vindo do cliente é suficiente para autorizar acesso;
- nenhuma alteração pode reduzir os testes de isolamento e vetorização existentes.

## 10. Critérios de sucesso

- a raiz mostra o chat sem etapa anterior;
- a entrada oferece somente o botão “Entrar”, sem formulário;
- o código do bundle principal não referencia as experiências removidas;
- perguntas, histórico, citações e feedback continuam funcionais;
- o envio de documento continua exigindo ação explícita e chega ao pipeline vetorial;
- os gates aplicáveis passam sem enfraquecer asserções de segurança.

## 11. Questões em aberto

- Em uma etapa futura, o botão “Entrar” pedirá somente telefone e validará um código enviado pelo
  WhatsApp. Persistência, recuperação, troca de aparelho e revogação da sessão serão especificadas
  antes dessa integração; o Bloco 1 não cria esse fluxo.
- A escolha de condomínio será tratada no menu do Bloco 4.

## Gate para mudar o status

Esta spec só pode ser considerada concluída com critérios de aceitação, rastreabilidade, build,
testes e revisão do diff completo. A aprovação do usuário encerra o Bloco 1, mas não autoriza o
Bloco 2 automaticamente.
