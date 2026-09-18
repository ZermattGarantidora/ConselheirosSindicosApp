# Spec 007 — Criação real de condomínio pelo síndico

**Status:** aprovada para implementação local  
**Responsável:** produto e engenharia  
**Atualizado em:** 2026-09-17

## 0. Alinhamento com a visão do projeto

### Partes do briefing atendidas

| Dimensão da visão | Seções do briefing | Como esta spec contribui |
|---|---|---|
| Problema e hipótese | §§1, 2 e 4 | Coloca o síndico no fluxo correto: criar seu contexto antes de consultar documentos e decisões. |
| Público | §3 | Atende síndicos profissionais e moradores que iniciam a carteira de condomínios. |
| Proposta de valor | §§5 e 10 | Faz a memória persistente nascer vinculada ao condomínio correto, sem misturar contextos. |
| Prioridades do MVP | §§7 e 14 | Entrega criação de um ou mais condomínios, associação de gestor e início do onboarding documental. |
| Segurança e confiança | §§9 e 12 | Cria condomínio e membership em transação, exige sessão real e preserva `condominium_id` como fronteira de autorização. |
| Validação e métricas | §§16 e 17 | Permite medir tempo até o primeiro valor, ativação e retorno por condomínio ativo. |

### Limites respeitados

- O cadastro de conta não cria nem associa condomínio automaticamente.
- A criação é iniciada explicitamente pelo usuário autenticado e concede apenas a ele o papel de síndico gestor do novo condomínio.
- A lista de grupos mostra somente memberships ativas da própria conta; condomínios sintéticos continuam restritos ao modo de demonstração.
- Convites, equipes, permissões administrativas ampliadas, integrações de mensagens e ações externas permanecem fora desta fatia.

### Divergências da visão

Nenhuma. O briefing define que o usuário cria o condomínio na entrada (§11) e inclui criação de um ou mais condomínios no MVP (§14).

### Checklist de alinhamento

- [x] O briefing completo foi lido na versão atual.
- [x] A spec resolve um problema ou testa uma hipótese descrita no briefing.
- [x] O público e a proposta de valor permanecem coerentes.
- [x] Prioridades e itens fora de escopo foram respeitados.
- [x] Princípios de segurança, custo e confirmação humana foram preservados.
- [x] Critérios de sucesso contribuem para as métricas de validação do briefing.
- [x] Não existe divergência silenciosa.

## 1. Objetivo

Permitir que um síndico autenticado crie o próprio condomínio, veja-o na lista de grupos e prossiga para o onboarding de documentos sem receber associação automática a outro contexto.

## 2. Promessa testada

> Eu crio meu condomínio e começo a organizar sua memória sem ver dados de nenhum outro.

## 3. Usuário primário

Síndico profissional ou síndico morador autenticado que ainda não possui memberships no produto.

## 4. Escopo

- Listagem dos condomínios ativos autorizados para a sessão.
- Criação persistente de um condomínio com nome, CNPJ, localização e metadados básicos.
- Criação transacional da membership ativa com papel `manager` para a conta criadora.
- Continuidade do formulário de documentos iniciais após a autorização do novo contexto.
- Entrada visual em formato de grupos/conversas, sem integração com WhatsApp externo.

## 5. Fora do escopo

- Associação automática durante cadastro ou login.
- Convites, aprovação de moradores, equipes ou troca de papel.
- Importação de condomínios de administradoras ou provedores externos.
- Envio automático de mensagens ou integração com WhatsApp.
- Exclusão, transferência ou fusão de condomínios.

## 6. Pré-condições

- API em modo persistente com a migration 012 aplicada.
- Sessão autenticada por cookie HttpOnly.
- Banco PostgreSQL com as tabelas de identidade, condomínios e memberships disponíveis.

## 7. Requisitos funcionais

### RQ-701 — Nenhuma associação automática

Cadastro e login devem levar a uma lista vazia quando a conta não possui membership ativa. O sistema não pode selecionar condomínio sintético ou de outra conta.

### RQ-702 — Listar condomínios autorizados

`GET /v1/condominiums` deve retornar somente condomínios ativos com membership vigente da sessão autenticada.

### RQ-703 — Criar condomínio do síndico

`POST /v1/condominiums` deve criar o condomínio e sua membership `manager` na mesma transação. A conta criadora deve ser a única identidade associada inicialmente.

### RQ-704 — Iniciar memória documental

Depois de criar o contexto, o usuário pode anexar os documentos iniciais. Cada upload deve usar o `condominium_id` retornado e revalidar a membership no servidor.

### RQ-705 — Separar demonstração

Rotas e dados do modo demonstrativo não podem ser usados para criar ou listar condomínios reais.

### RQ-706 — Explicar pendências e falhas

Antes do envio, a interface deve listar os campos, documentos ou confirmações que ainda faltam.
Se a API ou o armazenamento documental rejeitar a operação, a mensagem deve identificar a etapa
que falhou e preservar o motivo retornado, sem expor detalhes sensíveis.

## 8. Contratos

- `GET /v1/condominiums` retorna `200 { condominiums: [...] }` ou `401` sem sessão.
- `POST /v1/condominiums` recebe nome, CNPJ, cidade, UF e contato/metadados opcionais; retorna `201` com `condominiumId`, papel, permissões e perfil público do condomínio.
- CNPJ duplicado retorna `409` sem criar uma nova membership.
- Falhas de validação retornam `400`; falhas de sessão retornam `401`.
- O cliente abre a lista de grupos após login e oferece `Criar meu condomínio` quando a lista está vazia.

## 9. Requisitos não funcionais

- A criação de condomínio e membership deve ser atômica; falha em uma parte não pode deixar registro órfão.
- A consulta da lista deve executar sob papel restrito e função autorizada, sem grant de escrita direto ao cliente.
- Nenhum condomínio de outra conta pode aparecer na lista, no histórico, na busca ou no chat.
- O fluxo deve ser utilizável por teclado e em telas estreitas.

## 10. Critérios de sucesso

- Uma conta nova vê a lista vazia e consegue criar o próprio condomínio sem editar código ou headers.
- Após a criação, o condomínio aparece como grupo autorizado e abre a conversa contextual.
- Outra conta não vê nem acessa o condomínio criado.
- O tempo entre login e criação do primeiro contexto é mensurável e não exige treinamento técnico.

## 11. Questões em aberto

- Fluxos de convite e associação de outras pessoas serão definidos após validar a criação individual.
- Política de alteração e exclusão do perfil do condomínio será definida antes de um piloto público.

## Gate para implementação local

Esta spec autoriza a criação persistente em ambiente controlado com sessão real. Convites, administração de equipe, exclusão e publicação pública continuam condicionados a novas decisões de produto, segurança e LGPD.
