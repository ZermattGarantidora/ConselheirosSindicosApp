# Spec 009 — Configurações do chat e exclusão do condomínio

**Status:** aprovada para implementação local controlada  
**Responsável:** produto e engenharia  
**Atualizado em:** 2026-09-17

## 0. Alinhamento com a visão do projeto

### Partes do briefing atendidas

| Dimensão da visão | Seções do briefing | Como esta spec contribui |
| --------------------- | ------------------ | ------------------------------------------------------------------------------------------------------------------------------------------- |
| Problema e hipótese   | §§1, 2, 4 e 11     | Mantém o chat compreensível e dá ao síndico controle claro sobre o contexto e o ciclo de vida do condomínio que ele criou.                  |
| Público               | §§3 e 11           | Atende síndicos profissionais e moradores que alternam entre condomínios e precisam controlar o próprio acesso e seus cadastros.            |
| Proposta de valor     | §§5 e 10           | Preserva uma conversa documental simples, com histórico e lembrete de evidências ajustáveis pelo usuário.                                   |
| Prioridades do MVP    | §§7, 11 e 14       | Detalha a experiência de conversa, a criação e a exclusão segura de um condomínio sem antecipar integrações externas ou gestão operacional. |
| Segurança e confiança | §§9, 12 e 14       | Exige `condominium_id` autorizado, confirmação humana, papel de síndico e exclusão isolada dos dados do condomínio selecionado.             |
| Validação e métricas  | §§16 e 17          | Permite observar se a pessoa entende as preferências e a consequência irreversível da exclusão.                                             |

### Limites respeitados

- “Sair da gestão e apagar condomínio” só pode ser executado pelo síndico responsável do condomínio selecionado.
- A exclusão remove permanentemente o cadastro, documentos, respostas, conversas, histórico, auditoria e associações daquele condomínio; não remove a conta do usuário nem dados de outros condomínios.
- A limpeza de conversa visível continua sendo apenas local e não substitui a exclusão do condomínio.
- Exportação, retenção detalhada, transferência de titularidade, equipes, integração com WhatsApp e envio automático de mensagens continuam fora desta fatia.
- As preferências de exibição são locais ao dispositivo nesta primeira versão; não representam configuração compartilhada do condomínio.

### Divergências da visão

Nenhuma. A exclusão atende ao requisito do briefing de implementar controles de ciclo de vida compatíveis com a LGPD (§14), com escopo restrito ao condomínio autorizado e confirmação explícita.

### Checklist de alinhamento

- [x] O briefing completo foi lido na versão atual.
- [x] A spec resolve um problema ou testa uma hipótese descrita no briefing.
- [x] O público e a proposta de valor permanecem coerentes.
- [x] Prioridades e itens fora do escopo foram respeitados.
- [x] Princípios de segurança, custo e confirmação humana foram preservados.
- [x] Critérios de sucesso contribuem para as métricas de validação do briefing.
- [x] Não existe divergência silenciosa.

## 1. Objetivo

Dar ao usuário controles básicos para a conversa e uma ação explícita para apagar definitivamente o condomínio que ele administra, sem confundir isso com limpar mensagens ou apagar a conta.

## 2. Promessa testada

> Ajusto a forma como vejo o chat e, se eu confirmar a saída, apago somente o condomínio selecionado e todos os dados vinculados a ele.

## 3. Usuário primário

Síndico profissional ou síndico morador autenticado e com uma membership ativa de `manager` no condomínio selecionado.

## 4. Escopo

- Tela de configurações acessível no cabeçalho do chat.
- Preferência local para mostrar ou ocultar o histórico carregado na tela.
- Preferência local para mostrar ou ocultar o lembrete de evidências documentais.
- Ação para limpar apenas a conversa visível no dispositivo, sem apagar o histórico persistido.
- Ação “Sair da gestão e apagar condomínio” com diálogo de confirmação, disponível somente ao síndico responsável.
- Exclusão transacional e isolada do condomínio, seus documentos, conversas, histórico, auditoria e memberships.
- Retorno à lista de condomínios após a exclusão, com mensagem clara de que os dados foram apagados permanentemente.

## 5. Fora do escopo

- Exclusão da conta do usuário ou de qualquer outro condomínio.
- Remoção seletiva de mensagens da conversa sem apagar o condomínio.
- Transferência de titularidade, convites, administração de permissões ou gestão de equipe.
- Configurações compartilhadas entre usuários ou dispositivos.
- Integração com WhatsApp, envio automático ou qualquer ação externa.

## 6. Pré-condições

- Uma sessão autenticada (real ou identidade de desenvolvimento) e um condomínio selecionado.
- A membership correspondente está ativa e tem papel `manager` para o usuário.
- Para o modo real, as migrations `014_leave_condominium_management.sql` e `015_delete_condominium.sql` estão aplicadas no PostgreSQL persistente.

## 7. Requisitos funcionais

### RQ-901 — Configurações da conversa

O chat deve abrir uma tela de configurações com as preferências de histórico, lembrete de evidências e limpeza da conversa visível. As preferências devem atualizar a renderização sem alterar dados do servidor.

### RQ-902 — Exclusão iniciada pelo síndico

O usuário deve iniciar “Sair da gestão e apagar condomínio” somente para o condomínio selecionado e somente quando seu papel for `manager`. A interface deve explicar que a ação apaga o condomínio inteiro, não a conta, e pedir confirmação antes da chamada.

### RQ-903 — Exclusão autorizada

Após confirmação, a API deve validar a sessão, o `condominium_id` e a membership ativa de síndico, executar a exclusão transacional de todos os registros vinculados ao condomínio e retornar `204`. O cliente deve limpar o contexto local e voltar à lista.

### RQ-904 — Falha segura

Sessão ausente, membership inexistente ou papel diferente de `manager` não pode apagar dados. A interface deve exibir mensagem compreensível e permanecer na tela de configurações.

## 8. Contratos

- `DELETE /v1/condominiums/:condominiumId` usa a sessão HttpOnly e retorna `204` quando o síndico apaga o condomínio; `401` para sessão ausente; `403` para condomínio não autorizado ou papel insuficiente.
- `DELETE /v1/development/test-condominiums/:condominiumId` usa `x-development-user-id` somente no ambiente demonstrativo e retorna `204` ou erro explícito.
- A função SQL `app.delete_condominium_for_user(auth_subject, condominium_id)` revalida a conta e a membership `manager`, apaga os registros do condomínio em ordem de dependência e não alcança outros `condominium_id`.
- A função SQL legada `app.leave_condominium_for_user` e seu endpoint de membership permanecem apenas para compatibilidade técnica; a ação da interface usa exclusivamente o endpoint de exclusão do condomínio.
- A limpeza da conversa visível é somente de estado de interface; nenhum endpoint de exclusão de histórico é chamado por essa opção.

## 9. Requisitos não funcionais

- Toda operação deve manter o isolamento por `condominium_id` e aceitar somente a identidade autenticada pelo servidor.
- A confirmação deve ser explícita, acessível por teclado e informar que a exclusão é permanente e irreversível.
- A conta global do usuário e dados de outros condomínios devem permanecer intactos.
- Mensagens de erro não devem expor SQL, tokens, credenciais ou detalhes internos.
- Nenhum dado real de cliente entra em fixtures, testes ou evals.

## 10. Critérios de sucesso

- Uma pessoa encontra as configurações no chat em até uma interação e entende o efeito de cada opção.
- Desativar o histórico ou o lembrete altera somente a visualização local.
- A exclusão confirmada remove o condomínio da lista do síndico e apaga seus registros vinculados, sem afetar a conta ou outros condomínios.
- Um usuário sem sessão ou sem papel de síndico recebe `401`/`403`, nenhum registro é alterado e a interface informa o motivo sem detalhes internos.

## 11. Questões em aberto

- Persistência das preferências por usuário e dispositivo poderá ser avaliada após validação do uso.
- Política de retenção, exportação e eventual período de recuperação antes da exclusão definitiva exigem decisão específica de produto, LGPD e autorização administrativa.

## Gate para implementação local

Esta spec autoriza a implementação local e sintética da exclusão permanente iniciada pelo síndico, com confirmação explícita e isolamento por condomínio. Ela não autoriza apagar contas, dados de outros condomínios, integrar WhatsApp ou publicar o fluxo sem revisão de permissões e privacidade.
