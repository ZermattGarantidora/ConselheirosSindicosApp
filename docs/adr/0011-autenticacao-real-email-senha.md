# ADR 0011 — Autenticação própria com e-mail, senha e sessões opacas

**Status:** aceito para a primeira fatia persistente
**Data:** 2026-09-16

## Contexto

O briefing inclui autenticação no MVP, enquanto o ADR 0006 autorizava apenas um adaptador determinístico de desenvolvimento. A decisão de produto agora é criar contas reais. O projeto ainda não escolheu um provedor externo de identidade, e adicionar um SaaS antes de validar a experiência ampliaria custo, dependência e superfície de dados.

## Decisão

Para o ambiente persistente, o monólito implementará uma primeira autenticação própria com:

- e-mail normalizado, nome de exibição e senha;
- `scrypt` do runtime Node, com salt aleatório e comparação em tempo constante;
- tokens de sessão aleatórios emitidos apenas uma vez ao cliente e armazenados no banco somente como hash SHA-256;
- cookie `HttpOnly`, `SameSite=Lax`, `Path=/` e `Secure` quando `APP_ENV=production`;
- tabela de sessões revogáveis e expiração limitada;
- funções `SECURITY DEFINER` do PostgreSQL para operações de identidade que não devem furar RLS por acesso direto às tabelas;
- rotas protegidas que resolvem o usuário pela sessão, sem aceitar o cabeçalho de identidade de desenvolvimento.

O modo sem `DATABASE_URL` permanece sintético e explicitamente demonstrativo. Verificação de e-mail, recuperação de senha, MFA, rate limiting distribuído e login social são requisitos posteriores antes de um piloto público.

## Consequências

### Positivas

- Entrega persistência sem lock-in de provedor externo.
- Mantém a fronteira de `condominium_id` e os repositórios existentes.
- Permite testes determinísticos com um serviço em memória e um adaptador PostgreSQL isolado.

### Negativas e riscos aceitos

- A equipe passa a ser responsável pelo ciclo de vida de credenciais e sessões.
- Sem verificação e recuperação de e-mail, a conta não está pronta para exposição pública.
- Rate limiting e observabilidade adicionais continuam obrigatórios para produção.

## Alternativas consideradas

### Provedor SaaS de identidade

Adiado até existir avaliação de privacidade, custo, residência de dados, contrato e necessidade de login social.

### Guardar senha ou sessão no cliente

Rejeitado: expõe credenciais/token a scripts e não permite revogação confiável no servidor.

### Reutilizar o adaptador determinístico

Rejeitado para contas reais: ele não persiste identidades, não verifica segredos e aceita um identificador controlado pelo cliente.

## Critérios para revisitar

- piloto público autorizado e política LGPD aprovada;
- necessidade de verificação, recuperação, MFA ou login social;
- evidência de que operar credenciais próprias custa mais ou oferece menos segurança que um provedor avaliado.
