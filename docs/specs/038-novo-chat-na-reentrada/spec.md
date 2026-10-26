# Spec 038 — Novo chat na reentrada com conversas anteriores preservadas

**Status:** implementada localmente; integração e revisão pendentes  
**Responsável:** produto e engenharia  
**Atualizado em:** 2026-10-26

## 0. Alinhamento com a visão do projeto

### Partes do briefing atendidas

| Dimensão da visão     | Seções do briefing | Como esta spec contribui                                                                 |
| --------------------- | ------------------ | ---------------------------------------------------------------------------------------- |
| Problema e hipótese   | §§2 e 4            | Separa novos assuntos sem perder conversas já realizadas.                                |
| Público               | §3                 | Atende síndicos moradores e profissionais que retornam à Alvitra.                        |
| Proposta de valor     | §§5 e 6.2          | Retoma o contexto confirmado sem repetir cadastro e começa uma conversa nova.            |
| Prioridades do MVP    | §7, Bloco 3        | Detalha novo chat e histórico na lateral já autorizada.                                  |
| Segurança e confiança | §§8–10             | Conversas pertencem ao usuário e condomínio autorizados; não mudam a memória documental. |
| Validação e métricas  | §13                | Testa retorno ao chat, preservação de tarefas e zero acesso cruzado.                     |

### Limites respeitados

- Sem novo módulo, provedor, autenticação ou chamada de IA para organizar chats.
- Títulos e agrupamentos passam a ser mantidos no servidor; conteúdo não é copiado para localStorage.
- A demonstração segue em memória conforme ADR 0021: reentrada/recarga conserva os chats enquanto o servidor continua ativo; reinício do servidor sintético ainda perde dados. PostgreSQL conserva os chats entre reinícios.
- Não altera contexto enviado ao modelo, recuperação documental, vigência ou prompts.

### Divergências da visão

Nenhuma. “Retomar o chat” no §6.2 preserva o contexto confirmado; não exige reabrir a última conversa. O pedido explícito de 2026-10-20 autoriza persistir a organização antes limitada à sessão pela Spec 018.

### Checklist de alinhamento

- [x] O briefing completo foi lido na versão atual.
- [x] A spec resolve um problema ou testa uma hipótese descrita no briefing.
- [x] O público e a proposta de valor permanecem coerentes.
- [x] Prioridades e itens fora do escopo foram respeitados.
- [x] Princípios de segurança, custo e confirmação humana foram preservados.
- [x] Critérios de sucesso contribuem para as métricas de validação do briefing.
- [x] Não existe divergência silenciosa.

## 1. Objetivo

A cada entrada após sair, recarregar ou abrir outra aba, ativar uma conversa vazia e manter as anteriores na lista de chats do mesmo usuário e condomínio.

## 2. Promessa testada

> Ao voltar, começo um novo assunto e posso abrir minhas conversas anteriores na lateral.

## 3. Usuário primário

Síndico com contexto confirmado, retornando à aplicação.

## 4. Escopo

- Entrada ativa novo identificador de chat, com a lateral recolhida.
- Cada chat novo começa com uma saudação contextual nova da Alvitra, sem repetir o cadastro.
- Salvar agrupamento, título, perguntas/respostas e referências dos anexos recebidos.
- Restaurar chats separados; carregar seus turnos ao selecionar, com paginação sem truncamento silencioso.
- Renomear e excluir a organização no servidor; excluir não apaga a trilha auditável nem documentos.
- Histórico anterior à separação aparece em “Histórico anterior”.

## 5. Fora do escopo

- Persistência permanente do servidor gratuito de demonstração, sincronização de rascunhos e recuperação de envios não concluídos.
- Exclusão de evidências, reenvio automático de anexos ou compartilhamento de chats entre usuários.

## 6. Pré-condições

Autorização vigente revalidada no servidor. O cadastro continua uma única vez; chat novo não repete configuração.

## 7. Requisitos funcionais

### RQ-3801 — Nova conversa a cada entrada

Depois de resolver o contexto e listar os chats anteriores, criar um novo chat sem turnos anteriores na interface e torná-lo ativo. A Alvitra inicia esse chat com uma saudação contextual nova, sem repetir cadastro; ela não é copiada de outra conversa. A criação no servidor ocorre no primeiro envio ou renomeação, evitando acumular conversas vazias a cada recarga.

### RQ-3802 — Organização e histórico preservados

Mensagens respondidas são vinculadas ao chat em sua persistência original. O último turno é salvo imediatamente, sem depender de sair ou trocar de chat. Títulos são derivados do primeiro assunto, sem nova chamada de IA. Renomeação é preservada; exclusão oculta somente o chat. Referências de anexos recebidos podem reabrir somente originais ainda autorizados. Histórico legado mantém sua separação de novos chats.

### RQ-3803 — Autorização e ausência de perda silenciosa

Listagem, leitura, envio, renomeação e exclusão sempre exigem usuário e condomínio autorizados. Um membro não acessa o chat de outro membro do mesmo condomínio. O identificador de chat nunca altera o tenant. Falha em listar ou carregar histórico mostra erro e não substitui o histórico por uma lista vazia supostamente salva. Paginação conserva turnos com horários iguais usando também o identificador da pergunta.

### RQ-3804 — Compatibilidade

Perguntas antigas sem chat explícito continuam no histórico legado. A migração é aditiva; preserva perguntas, respostas, documentos e citações. Abas distintas recebem novos IDs e não sobrescrevem agrupamentos uma da outra. Mudar condomínio abre contexto separado, preservando as conversas no servidor.

### RQ-3805 — Nova conversa manual sem cópia

“Nova conversa” ativa um identificador novo e um chat sem turnos, anexos ou rascunho da conversa
anterior. A primeira mensagem é uma saudação nova da Alvitra, gerada para o perfil já confirmado e
sem repetir cadastro; ela não copia a saudação ou mensagens de configuração da conversa anterior.
No modo local sem provedor, a saudação deixa claro somente o início da nova conversa, sem afirmar
fatos sobre o condomínio. Cliques sucessivos não acumulam chats vazios sem envio ou renomeação.
Conversas salvas e seus últimos turnos permanecem acessíveis na lateral.

## 8. Contratos

- `GET/POST /v1/condominiums/:condominiumId/chats`: listar/criar metadados autorizados; criação por ID é idempotente e não reativa chat excluído.
- `PATCH/DELETE /v1/condominiums/:condominiumId/chats/:chatId`: renomear/ocultar.
- Histórico aceita filtro de chat e cursor composto; perguntas aceitam `chatId`; upload aceita `x-chat-id`.
- IDs/títulos inválidos retornam 400; sem identidade 401; sem associação 403; chat ausente/de outro usuário/oculto 404; falha operacional não simula sucesso.

## 9. Requisitos não funcionais

Reutilizar PostgreSQL/RLS e memória da demonstração, sem dependência nova. Não guardar conteúdo/títulos no navegador nem registrar mensagens em logs. Listas e histórico usam páginas de até 100 itens.

## 10. Critérios de sucesso

Reentrada abre chat sem turnos antigos, conserva os chats com seus títulos e permite abrir/continuar cada conversa. O último turno persiste sem ação adicional; dois usuários/condomínios e abas permanecem isolados.

## 11. Questões em aberto

Persistência permanente na demonstração exige decisão operacional própria; não reutilizar o Neon exclusivo de integração como banco da demonstração.

## Gate competitivo

1. Mantém a conversa e a lateral existentes.
2. Pertence ao Bloco 3 explicitamente solicitado.
3. Reduz confusão entre assuntos e melhora retorno ao produto.
4. Preserva isolamento, evidências, abstenção e confirmação de ações externas.
5. Une continuidade da conversa à memória documental autorizada.
6. Testes reproduzem reentrada, último turno, paginação e acesso cruzado.
7. Reutiliza persistência existente sem serviço adicional.

## Gate para mudar o status

Exige aceitação, rastreabilidade, validação de visão e gates aplicáveis; integração/revisão pendente impede aprovação para merge.
