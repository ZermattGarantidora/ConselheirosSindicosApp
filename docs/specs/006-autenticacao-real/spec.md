# Spec 006 — Autenticação real por e-mail e senha

**Status:** aprovada para implementação local
**Responsável:** produto e engenharia
**Atualizado em:** 2026-09-21

## 0. Alinhamento com a visão do projeto

| Dimensão da visão | Seções do briefing | Como esta spec contribui |
| --- | --- | --- |
| Problema e hipótese        | §§1, 2 e 11        | Permite que o síndico retorne ao conselheiro com identidade persistente, reduzindo fricção e preservando o histórico autorizado.                        |
| Público                    | §3                 | Atende síndicos profissionais e moradores que precisam de uma conta individual para acessar sua carteira de condomínios.                                |
| Proposta de valor          | §§5 e 10           | Mantém a experiência simples e contextual sem substituir as fontes documentais por uma identidade genérica.                                             |
| Prioridades do MVP         | §§7, 11 e 14       | Implementa a autenticação prevista no MVP e prepara a criação de um ou mais condomínios por usuário.                                                    |
| Segurança e confiança      | §§9, 12, 13 e 14   | Evita senha em texto puro, usa sessão revogável, impede acesso anônimo às operações protegidas e mantém `condominium_id` como fronteira de autorização. |
| Estratégia técnica e custo | §15                | Usa o monólito e PostgreSQL já adotados, sem adicionar provedor externo ou dependência SaaS antes da validação.                                         |
| Validação e métricas       | §§16 e 17          | Permite medir ativação, retorno e recorrência por usuário sem usar documentos confidenciais para prospecção.                                            |

### Limites respeitados

- A primeira versão usa e-mail e senha com armazenamento transacional no PostgreSQL; não adiciona login social ou provedor externo.
- O modo sem `DATABASE_URL` continua explicitamente demonstrativo e não cria contas persistentes.
- Verificação de e-mail, recuperação de senha, MFA, rate limiting distribuído e gestão de sessões de dispositivos ficam fora desta fatia e são pré-requisitos para um piloto público.
- Não cria condomínios automaticamente ao registrar a conta e não altera o isolamento documental existente.
- Não implementa contabilidade, boletos, portaria, marketplace ou ações externas.

### Divergências da visão

Nenhuma. A autenticação já está prevista no MVP do briefing; esta spec apenas substitui o adaptador determinístico local para o ambiente com banco persistente.

### Checklist de alinhamento

- [x] O briefing completo foi lido na versão atual.
- [x] A spec resolve um problema ou testa uma hipótese descrita no briefing.
- [x] O público e a proposta de valor permanecem coerentes.
- [x] Prioridades e itens fora do escopo foram respeitados.
- [x] Princípios de segurança, custo e confirmação humana foram preservados.
- [x] Critérios de sucesso contribuem para as métricas de validação do briefing.
- [x] Não existe divergência silenciosa.

## 1. Objetivo

Permitir que uma pessoa crie uma conta persistente com e-mail e senha, faça login e retorne ao ambiente autenticado sem expor credenciais ou misturar sua identidade com a demonstração sintética.

## 2. Promessa testada

> Minha conta permanece protegida e me leva de volta somente aos condomínios que estão autorizados para mim.

## 3. Usuário primário

Síndico profissional ou síndico morador que inicia o uso do conselheiro com dados próprios e precisa voltar ao produto em outra sessão.

## 4. Escopo

- Cadastro de conta com nome, e-mail normalizado e senha.
- Login e logout por sessão opaca armazenada em cookie seguro.
- Consulta da sessão atual para restaurar a interface após recarregar a página.
- Persistência de usuário e sessões no PostgreSQL.
- Hash de senha com `scrypt`, salt aleatório e comparação em tempo constante.
- Continuidade do acesso demonstrativo somente no modo local sem banco.
- Tela de entrada com alternância clara entre entrar e criar conta.

## 5. Fora do escopo

- Login social, SSO, MFA ou provedor de identidade externo.
- Verificação de posse do e-mail, recuperação de senha e troca de senha.
- Convites, equipes e permissões administrativas de conta.
- Rate limiting distribuído, detecção antifraude e gestão de dispositivos.
- Persistência de condomínios criados sem uma associação autorizada.

## 6. Pré-condições

- O ambiente persistente usa PostgreSQL com as migrations aplicadas.
- A aplicação define `DATABASE_URL` somente fora do modo demonstrativo.
- O servidor é acessado por HTTPS em produção para que o cookie possa ser `Secure`.

## 7. Requisitos funcionais

### RQ-601 — Criar conta

O sistema deve aceitar nome, e-mail e senha válidos, normalizar o e-mail, rejeitar duplicidade sem revelar dados de outra conta e criar uma conta ativa persistente.

### RQ-602 — Autenticar sessão

Após cadastro ou login bem-sucedido, o servidor deve emitir uma sessão opaca, renovável por nova autenticação e vinculada ao usuário. A sessão deve ser enviada somente em cookie `HttpOnly`, `SameSite=Lax` e `Secure` em produção.

### RQ-603 — Proteger operações

Rotas de condomínios, documentos, perguntas, histórico, fontes e feedback devem resolver o usuário pela sessão autenticada no modo persistente. O cabeçalho de identidade de desenvolvimento não pode autenticar uma conta real.

### RQ-604 — Encerrar sessão

O logout deve revogar a sessão no servidor e limpar o cookie, sem apagar usuário, condomínios ou documentos.

### RQ-605 — Restaurar sessão

Ao abrir o cliente, a interface deve consultar a sessão atual e retornar ao estado autenticado ou mostrar o formulário de entrada sem apresentar dados protegidos.

### RQ-606 — Isolamento por condomínio

Uma conta autenticada deve continuar sujeita à membership vigente e às políticas de `condominium_id`; autenticar-se não concede acesso a nenhum condomínio por si só.

### RQ-607 — Entrada orientada antes da autenticação

Antes de exibir os formulários de acesso, o cliente deve apresentar uma página de entrada responsiva que explique o propósito do Conselheiro Documental e ofereça caminhos claros para entrar ou criar uma conta. A composição deve priorizar telas estreitas, manter a separação entre orientação e autenticação e não anunciar o acesso demonstrativo como uma conta persistente.

A explicação complementar sobre evidência deve fazer parte da composição editorial da página, sem card, painel ou moldura que simule uma tela dentro da tela.

### RQ-608 — Falha recuperável na descoberta do ambiente

Se a verificação inicial do ambiente não responder, a entrada não pode permanecer bloqueada indefinidamente. O cliente deve sair do estado de espera após um limite curto e oferecer um caminho de retorno para a apresentação, preservando o acesso demonstrativo local quando aplicável.

## 8. Contratos

- `POST /v1/auth/register` recebe `{ displayName, email, password }` e retorna `201` com o usuário público e a expiração da sessão.
- `POST /v1/auth/login` recebe `{ email, password }` e retorna `200` com o usuário público e a expiração da sessão.
- `GET /v1/auth/session` retorna `200` com o usuário público ou `401` sem sessão válida.
- `POST /v1/auth/logout` revoga a sessão atual e retorna `204`.
- Erros de entrada retornam `400`; credenciais inválidas retornam `401`; e-mail já cadastrado retorna `409` sem confirmar dados além do necessário.
- Rotas de domínio no modo persistente ignoram `x-development-user-id` e retornam `401` sem sessão válida.

## 9. Requisitos não funcionais

- Nenhuma senha pode ser persistida ou registrada em texto puro.
- Tokens de sessão devem ser aleatórios, não conter o e-mail e ser persistidos apenas por hash.
- O e-mail deve ser normalizado antes de verificar duplicidade.
- Cookies devem ter `HttpOnly`, `SameSite=Lax`, `Path=/` e `Secure` em produção.
- Mensagens de autenticação não devem revelar se um e-mail existe quando a senha estiver incorreta.
- Dados reais não podem entrar em fixtures, testes ou evals; testes usam e-mails sintéticos reservados.
- Toda operação protegida deve continuar carregando o usuário resolvido para o contexto autorizado do condomínio.

## 10. Critérios de sucesso

- Uma pessoa consegue criar uma conta, recarregar a página e permanecer autenticada sem editar headers ou código.
- Uma senha incorreta não permite acesso e não revela a existência de outra conta.
- Logout invalida a sessão imediatamente para as rotas protegidas.
- Duas contas sintéticas não compartilham memberships, histórico ou documentos.
- A cobertura dos módulos novos atende ao piso de 80% definido nos gates do projeto.

## 11. Questões em aberto

- Qual serviço de envio será usado para verificação de e-mail e recuperação de senha antes de um piloto público?
- Qual política de retenção e exclusão de contas será aprovada para dados reais?
- Qual limite de tentativas e mecanismo de rate limiting será adotado fora do ambiente local?

## Gate para implementação local

Esta spec autoriza contas persistentes com e-mail e senha em ambiente PostgreSQL controlado. A disponibilização pública exige decidir e registrar verificação de e-mail, recuperação de senha, rate limiting, observabilidade e política LGPD específica.
