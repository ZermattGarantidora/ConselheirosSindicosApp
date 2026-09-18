# Spec 008 — Login com Google

**Status:** aprovada para implementação local controlada; interface pausada temporariamente  
**Responsável:** produto e engenharia  
**Atualizado em:** 2026-09-17

## 0. Alinhamento com a visão do projeto

### Partes do briefing atendidas

| Dimensão da visão | Seções do briefing | Como esta spec contribui |
| --------------------- | ------------------ | ----------------------------------------------------------------------------------------------------------------------------- |
| Problema e hipótese   | §§1, 2 e 11        | Reduz a fricção de entrada para que o síndico chegue rapidamente ao próprio contexto documental.                              |
| Público               | §3                 | Atende síndicos profissionais e moradores que já possuem uma conta Google.                                                    |
| Proposta de valor     | §§5 e 10           | Mantém uma entrada simples sem substituir a autorização específica por condomínio.                                            |
| Prioridades do MVP    | §§7, 11 e 14       | Complementa a autenticação do MVP sem antecipar funções operacionais posteriores.                                             |
| Segurança e confiança | §§9 e 12           | Usa Authorization Code, `state` anti-CSRF, e-mail verificado e sessão HttpOnly; não aceita identidade enviada pelo navegador. |
| Validação e métricas  | §§16 e 17          | Permite medir abandono e tempo até o primeiro valor no acesso, sem usar documentos para prospecção.                           |

### Limites respeitados

- O login Google é uma alternativa à autenticação existente, não cria condomínio automaticamente e preserva o isolamento por `condominium_id`.
- O servidor troca o código OAuth e consulta o UserInfo do Google; client secret e tokens não chegam ao cliente Zermatt.
- Convites, recuperação de senha, MFA, gestão de dispositivos, integrações de mensagens e ações externas continuam fora desta fatia.
- O recurso só é habilitado quando as variáveis OAuth do servidor estão configuradas.

### Divergências da visão

Nenhuma. A solicitação explicita uma alternativa de autenticação prevista no MVP; a estratégia competitiva continua tratando o acesso como suporte à facilidade de uso, não como diferencial isolado.

### Checklist de alinhamento

- [x] O briefing completo foi lido na versão atual.
- [x] A spec resolve um problema ou testa uma hipótese descrita no briefing.
- [x] O público e a proposta de valor permanecem coerentes.
- [x] Prioridades e itens fora de escopo foram respeitados.
- [x] Princípios de segurança, custo e confirmação humana foram preservados.
- [x] Critérios de sucesso contribuem para as métricas de validação do briefing.
- [x] Não existe divergência silenciosa.

## 1. Objetivo

Permitir que uma pessoa entre ou crie sua conta usando Google e retorne à mesma lista de condomínios autorizados, sem associação automática.

### Estado atual

Por solicitação do produto, a opção de entrada com Google está temporariamente ocultada na
interface de login. O fluxo de servidor, a migration e os testes de segurança permanecem
preservados para uma reativação futura; enquanto pausado, não é necessário configurar credenciais
Google no ambiente local.

## 2. Promessa testada

> Entro com a conta Google que já uso e vejo apenas os condomínios autorizados para mim.

## 3. Usuário primário

Síndico profissional ou síndico morador autenticado no ambiente persistente.

## 4. Escopo

- Botão “Continuar com Google” na entrada real.
- Fluxo OAuth 2.0 Authorization Code com OpenID Connect (`openid email profile`).
- Cookie de `state` HttpOnly, com expiração curta e comparação em tempo constante.
- Validação de e-mail verificado pelo endpoint UserInfo do Google.
- Criação ou vinculação da conta por `google_subject`, emissão da sessão existente e retorno à aplicação.

## 5. Fora do escopo

- Login Google no modo demonstrativo sem banco.
- Refresh tokens, acesso a APIs do Google, importação de contatos ou Google Workspace admin.
- Verificação adicional de e-mail, recuperação de senha, MFA ou gestão de dispositivos.
- Envio automático de mensagens, integração com WhatsApp ou qualquer ação externa.

## 6. Pré-condições

- PostgreSQL persistente com a migration 013 aplicada.
- Projeto OAuth configurado no Google Cloud com URI de redirecionamento exata.
- `GOOGLE_CLIENT_ID`, `GOOGLE_CLIENT_SECRET` e `GOOGLE_OAUTH_REDIRECT_URI` definidos somente no servidor.

## 7. Requisitos funcionais

### RQ-801 — Iniciar OAuth

O botão deve redirecionar para o Google com `response_type=code`, escopos mínimos e `state` aleatório.

### RQ-802 — Validar retorno

O callback deve recusar state ausente ou divergente, código ausente, erro do provedor e perfil sem e-mail verificado.

### RQ-803 — Criar ou vincular conta

Um subject Google novo cria uma conta ativa sem senha local; e-mail já cadastrado pode ser vinculado ao subject verificado. A sessão resultante usa o mesmo cookie HttpOnly do login por senha.

### RQ-804 — Preservar autorização

Após o login, a lista deve conter somente memberships ativas da conta. Nenhum condomínio é criado ou selecionado automaticamente.

### RQ-805 — Falha segura

OAuth não configurado retorna estado explícito e não expõe client secret, access token ou detalhes sensíveis ao navegador.

### RQ-806 — Pausa temporária da interface

Enquanto o recurso estiver pausado, a entrada real não deve exibir o botão, divisor ou instrução de
login com Google. A autenticação por e-mail e senha permanece disponível.

## 8. Contratos

- `GET /v1/auth/google` inicia o fluxo ou retorna `503` quando não configurado.
- `GET /v1/auth/google/callback` cria a sessão e redireciona para a aplicação; falhas redirecionam com código genérico de erro.
- `/health` inclui `googleAuthEnabled`.
- O cliente não recebe tokens Google; recebe apenas o cookie de sessão da aplicação.

## 9. Requisitos não funcionais

- O client secret só pode ser lido pelo processo da API.
- `state` deve ser imprevisível, expirar em até 10 minutos e ser limpo após o callback.
- O servidor deve aceitar somente resposta HTTPS do Google e e-mail `email_verified=true`.
- Dados reais de contas Google não entram em fixtures, testes ou evals; testes usam subjects e e-mails sintéticos.

## 10. Critérios de sucesso

- Uma pessoa consegue iniciar o login pelo botão e retornar à aplicação autenticada quando o OAuth está configurado.
- Uma conta Google nova vê a lista vazia e consegue criar o próprio condomínio pelo fluxo já existente.
- State inválido, cancelamento e perfil não verificado não criam sessão.
- O segredo OAuth não aparece em respostas, logs ou código do cliente.

## 11. Questões em aberto

- Política de vinculação e desvinculação de outros provedores antes de um piloto público.
- Verificação, recuperação, MFA, rate limiting distribuído e gestão de dispositivos continuam pré-requisitos de publicação.

## Gate para implementação local

Esta spec autoriza o fluxo Google somente em ambiente persistente controlado e com credenciais configuradas no servidor. Produção pública exige revisão de OAuth, LGPD, rate limiting, monitoramento e política de contas.
