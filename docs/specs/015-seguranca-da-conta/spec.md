# Spec 015 — Verificação, recuperação, MFA e sessões da conta

**Status:** implementada em ambiente local/controlado; entrega real de e-mail pendente de provedor aprovado
**Responsável:** produto e engenharia
**Atualizado em:** 2026-10-08

## 0. Alinhamento com a visão do projeto

### Partes do briefing atendidas

| Dimensão da visão | Seções do briefing | Como esta spec contribui |
| --------------------- | ------------------ | ----------------------------------------------------------------------------------------------------------------------------------------------- |
| Problema e hipótese   | §§1, 2 e 11        | Permite que o síndico retorne com segurança ao histórico e aos condomínios autorizados, sem transferir complexidade técnica para a experiência. |
| Público               | §3                 | Protege contas de síndicos profissionais e moradores que podem administrar vários condomínios.                                                  |
| Proposta de valor     | §§5 e 10           | Aumenta confiança, continuidade e controle da memória persistente do usuário.                                                                   |
| Prioridades do MVP    | §§7 e 14           | Detalha a autenticação já prevista no MVP; não antecipa módulos operacionais posteriores.                                                       |
| Segurança e confiança | §§12, 15 e 19      | Verifica posse do e-mail, permite recuperar acesso, adiciona segundo fator e torna sessões revogáveis por dispositivo.                          |
| Validação e métricas  | §§16 e 17          | Reduz abandono por perda de acesso e permite testar retorno recorrente com contas protegidas.                                                   |

### Limites respeitados

- A decisão explícita do usuário em 2026-10-08 antecipa os controles de conta que a Spec 006 tratava como pré-requisitos para piloto público.
- Nenhum documento, pergunta ou dado de condomínio é enviado pelo fluxo de e-mail.
- Nenhum fornecedor de e-mail é escolhido silenciosamente. A implementação local usa uma prévia explícita e substituível; produção permanece bloqueada sem adaptador aprovado.
- MFA limita-se a TOTP e códigos de recuperação. SMS, WhatsApp, push, passkeys e biometria ficam fora desta fatia.
- Gerenciamento de sessões permite listar e revogar acessos; não coleta localização precisa, IP persistido nem impressão digital do dispositivo.
- A fatia não libera dados reais nem piloto público sem os demais gates de LGPD, retenção, fornecedor, incidentes e segurança.

### Divergências da visão

Nenhuma. A autenticação faz parte do MVP; esta spec aumenta o piso de segurança por solicitação explícita sem alterar o problema, público ou proposta de valor.

### Checklist de alinhamento

- [x] O briefing completo foi lido na versão atual.
- [x] A spec resolve um problema ou testa uma hipótese descrita no briefing.
- [x] O público e a proposta de valor permanecem coerentes.
- [x] Prioridades e itens fora do escopo foram respeitados.
- [x] Princípios de segurança, custo e confirmação humana foram preservados.
- [x] Critérios de sucesso contribuem para as métricas de validação do briefing.
- [x] Não existe divergência silenciosa.

## 1. Objetivo

Permitir que uma pessoa comprove a posse do e-mail, recupere ou troque a senha, proteja a conta com TOTP e encerre sessões de outros dispositivos sem perder seus condomínios ou histórico autorizado.

## 2. Promessa testada

> Consigo recuperar e proteger minha conta e encerrar acessos que não reconheço, sem expor meus dados ou os documentos do condomínio.

## 3. Usuário primário

Síndico profissional ou morador que usa uma conta persistente e precisa manter acesso recorrente e controlado ao produto.

## 4. Escopo

- Verificação obrigatória de e-mail para novas contas locais.
- Reenvio de verificação com resposta que não revela contas de terceiros.
- Solicitação e confirmação de redefinição de senha por token de uso único.
- Troca de senha autenticada mediante confirmação da senha atual.
- MFA por TOTP de seis dígitos, com ativação confirmada e códigos de recuperação de uso único.
- Desafio MFA após senha correta, antes de criar a sessão.
- Listagem de sessões com rótulo reduzido de dispositivo, criação, último uso e expiração.
- Revogação de uma sessão ou de todas as outras sessões.
- Tokens e códigos persistidos somente por hash; segredo TOTP criptografado com chave do servidor.
- Prévia local de links de ação apenas em desenvolvimento explícito.

## 5. Fora do escopo

- Serviço comercial de entrega de e-mail sem ADR e aprovação do fornecedor.
- SMS, WhatsApp, push, passkeys, biometria e perguntas de segurança.
- Recuperação de uma conta sem acesso ao e-mail ou aos códigos de recuperação.
- Painel administrativo para inspecionar segredos, tokens, senhas ou sessões de usuários.
- Identificação invasiva de dispositivo, geolocalização ou retenção de IP.

## 6. Pré-condições

- PostgreSQL com a migration da fatia aplicada.
- URL pública de ação configurada no servidor.
- Chave de 32 bytes configurada no servidor para criptografar segredos MFA.
- Produção possui adaptador de e-mail aprovado; a prévia local não pode ser ativada em produção.

## 7. Requisitos funcionais

### RQ-1501 — Verificar e-mail

Nova conta local nasce sem acesso documental e recebe token aleatório de uso único. A confirmação válida marca o e-mail como verificado. Contas Google continuam dependendo do `email_verified` validado pelo fluxo OAuth.

### RQ-1502 — Evitar enumeração

Solicitações de reenvio e recuperação retornam a mesma resposta pública para e-mail existente, ausente, já verificado ou sem senha local.

### RQ-1503 — Recuperar e trocar senha

O token de recuperação expira em 30 minutos, só pode ser usado uma vez e a redefinição revoga todas as sessões. A troca autenticada exige a senha atual e revoga todas as outras sessões.

### RQ-1504 — Proteger com MFA

O usuário autenticado recebe um segredo TOTP pendente, confirma um código válido e só então ativa o MFA. A ativação entrega códigos de recuperação uma única vez. Senha correta em conta com MFA cria apenas um desafio curto; a sessão nasce após TOTP ou código de recuperação válido.

### RQ-1505 — Gerenciar sessões

O usuário pode listar somente suas sessões, identificar a atual e revogar uma sessão específica ou todas as demais. Revogar a atual limpa o cookie local.

### RQ-1506 — Falhar com segurança

Tokens expirados, consumidos ou inválidos, excesso de tentativas MFA e configuração criptográfica ausente falham sem expor segredo, hash, existência da conta ou detalhes do banco.

## 8. Contratos

- `POST /v1/auth/register` retorna `202`, sem sessão, para nova conta local e informa que a verificação é necessária.
- `POST /v1/auth/verify-email/request` sempre retorna `202`.
- `POST /v1/auth/verify-email/confirm` recebe `{ token }` e retorna `204` quando válido.
- `POST /v1/auth/password-reset/request` sempre retorna `202`.
- `POST /v1/auth/password-reset/confirm` recebe `{ token, password }` e retorna `204` quando válido.
- `POST /v1/auth/password/change` exige sessão e recebe `{ currentPassword, newPassword }`.
- `POST /v1/auth/login` retorna sessão normal ou `202` com desafio MFA sem cookie de sessão.
- `POST /v1/auth/mfa/challenge` recebe `{ challengeId, code }` e cria a sessão somente após validação.
- `POST /v1/auth/mfa/setup`, `/enable` e `/disable` exigem sessão válida.
- `GET /v1/auth/sessions`, `DELETE /v1/auth/sessions/:sessionId` e `POST /v1/auth/sessions/revoke-others` exigem sessão válida.
- Respostas de desenvolvimento podem conter `developmentActionUrl` somente quando a prévia local estiver explicitamente ativa e `APP_ENV` não for `production`.

## 9. Requisitos não funcionais

- Tokens de verificação, reset, desafio e códigos de recuperação usam entropia criptográfica e são persistidos apenas por SHA-256.
- Segredo TOTP usa AES-256-GCM com chave exclusiva do servidor e nunca aparece em log.
- TOTP usa período de 30 segundos, seis dígitos e janela máxima de um período para cada lado.
- Desafio MFA expira em cinco minutos e bloqueia após cinco tentativas inválidas.
- A sessão não persiste IP nem user-agent completo; o servidor reduz o cabeçalho a um rótulo genérico de até 80 caracteres.
- Redefinição e troca de senha usam o mesmo `scrypt` e o mesmo piso de 12 caracteres da Spec 006.
- Nenhum endpoint retorna hash de senha, token persistido, segredo cifrado ou existência de e-mail em solicitações públicas.

## 10. Critérios de sucesso

- Nova conta local não acessa condomínios antes da verificação.
- Usuário recupera acesso com token válido e todos os acessos anteriores deixam de funcionar.
- Conta com MFA não recebe sessão apenas com a senha.
- Código de recuperação funciona uma única vez.
- Usuário consegue identificar e revogar outra sessão sem afetar contas de terceiros.
- Testes cobrem expiração, reuso, enumeração, tentativas, criptografia e isolamento.

## 11. Questões em aberto

- Qual fornecedor, região e política de retenção serão aprovados para entrega de e-mail em produção?
- MFA será opcional ou obrigatório para administradores e para o piloto público?
- Qual política de recuperação assistida será adotada quando o usuário perder e-mail e códigos?

## Gate para mudar o status

A fatia só pode ser considerada pronta quando migration, serviço, rotas, interface, testes determinísticos, rastreabilidade e gate de visão passarem; produção continua bloqueada sem entrega de e-mail aprovada e exercício de recuperação de conta.
