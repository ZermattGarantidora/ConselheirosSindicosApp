# Spec 018 — Múltiplos chats e barra lateral, Bloco 3 da reestruturação

**Status:** implementada e aguardando aprovação do usuário  
**Responsável:** produto e engenharia  
**Atualizado em:** 2026-10-09

## 0. Alinhamento com a visão do projeto

### Partes do briefing atendidas

| Dimensão da visão | Seções do briefing | Como esta spec contribui |
|---|---|---|
| Problema e hipótese | §§2 e 4 | Permite retomar ou separar tarefas sem trocar a conversa por telas paralelas. |
| Público e proposta de valor | §§3, 5 e 6 | Mantém o chat como experiência principal para síndicos. |
| Prioridade autorizada | §7, Bloco 3 | Entrega vários chats, lateral recolhida, novo chat, histórico, renomear e excluir. |
| Memória documental e evidências | §§8 e 9 | Não modifica upload, vetorização, recuperação, citações, abstenção ou conflitos. |
| Segurança e confiança | §10 | Toda chamada de domínio continua usando somente o `condominium_id` autorizado pelo servidor. |
| Validação | §§13 e 14 | Exercita recorrência no chat sem aumentar o atrito até a conversa útil. |

### Limites respeitados

- A lateral organiza somente a experiência de conversa; não cria dashboard, configurações, perfil ou seletor de condomínios.
- Menu sanduíche com “Condomínios”, “Meus dados” e “Preferências” pertence ao Bloco 4 e não é apresentado.
- Não há mudança de personalidade (Bloco 2), perfil conversacional (Bloco 5), regras documentais (Blocos 6 e 7) nem níveis de conta (Bloco 8).
- Perguntas, documentos e evidências continuam no contexto autorizado já iniciado; excluir uma conversa na interface não apaga trilhas documentais auditáveis.

### Divergências da visão

Nenhuma. A autorização explícita desta implementação é limitada ao Bloco 3.

### Checklist de alinhamento

- [x] O briefing completo foi lido na versão atual.
- [x] A spec resolve um problema ou testa uma hipótese descrita no briefing.
- [x] O público e a proposta de valor permanecem coerentes.
- [x] Prioridades e itens fora do escopo foram respeitados.
- [x] Princípios de segurança, custo e confirmação humana foram preservados.
- [x] Critérios de sucesso contribuem para as métricas de validação do briefing.
- [x] Não existe divergência silenciosa.

## 1. Objetivo

Permitir que a pessoa crie e organize conversas na própria experiência de chat, sem expor telas paralelas ou enfraquecer a fronteira documental autorizada.

## 2. Promessa testada

> Posso iniciar outra conversa, voltar ao histórico e organizar meus assuntos sem sair da Alvitra.

## 3. Usuário primário

Síndicos profissionais independentes, pequenas empresas de sindicatura e síndicos moradores descritos no §3 do briefing.

## 4. Escopo

- barra de conversas à esquerda, recolhida ao abrir;
- abertura deslizante no desktop e como overlay no celular;
- criação, seleção, renomeação e exclusão de chats pela própria barra;
- preservação dos turnos já concluídos ao alternar ou iniciar uma nova conversa;
- lista do histórico autorizado carregado pela API como primeira conversa da sessão.

## 5. Fora do escopo

- persistência de metadados de organização da barra; ela não grava títulos ou relações de chat no navegador nem altera a trilha auditável do servidor;
- menu ou seleção de condomínio;
- exclusão de perguntas, respostas, documentos, embeddings, citações, feedback ou auditoria;
- qualquer capacidade dos Blocos 2 e 4–8.

## 6. Pré-condições

- a sessão possui contexto autorizado conforme Spec 016;
- o histórico recebido continua limitado pelo servidor ao condomínio e usuário autorizados.

## 7. Requisitos funcionais

### RQ-1701 — Barra de conversas recolhida

A página apresenta um controle acessível para abrir a barra lateral. No desktop, ela desliza da esquerda; no celular, abre sobre o chat com fundo de bloqueio para a interação subjacente.

### RQ-1702 — Organização de chats na sessão

A pessoa pode criar, selecionar, renomear e excluir chats. A primeira conversa representa o histórico autorizado já carregado. Alternar de chat preserva qualquer turno concluído da conversa ativa.

### RQ-1703 — Segurança documental preservada

Criar, nomear, selecionar ou excluir um chat não envia identificadores de tenant ao servidor nem muda a autorização. Perguntas, uploads, feedback e fontes continuam usando somente o contexto autorizado da Spec 016.

## 8. Contratos

- Não altera os contratos HTTP existentes.
- A organização dos chats é estado efêmero da sessão do cliente; histórico, perguntas, respostas e evidências seguem os contratos de `GET /history`, `POST /questions` e upload da Spec 016.

## 9. Requisitos não funcionais

- controles têm nome acessível e continuam operáveis por teclado;
- a lateral permanece escondida por padrão e não reduz a área de conversa;
- em largura a partir de 320 px, o overlay não permite interação acidental com o chat subjacente;
- nenhum título ou conteúdo é persistido no armazenamento do navegador.

## 10. Critérios de sucesso

- a pessoa abre rapidamente uma segunda conversa e retorna à anterior;
- histórico, fontes, upload e composer permanecem funcionais;
- em celular e desktop a lateral abre e fecha sem comprometer a leitura do chat;
- os testes confirmam que a organização não cria chamadas sem contexto autorizado.

## 11. Questões em aberto

- Persistir a organização dos chats entre sessões exigirá uma spec e modelagem próprias com `condominium_id`, usuário, RLS, retenção e auditoria. Não é antecipada nesta fatia visual.

## Gate para mudar o status

Esta spec só pode ser considerada concluída com critérios de aceitação, rastreabilidade, gates aplicáveis e revisão do diff completo. A aprovação do usuário não autoriza o Bloco 4.
