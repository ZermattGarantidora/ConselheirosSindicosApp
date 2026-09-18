# ADR 0013 — Login Google via OAuth 2.0/OpenID Connect

**Status:** aceito para a fatia local controlada  
**Data:** 2026-09-17

## Contexto

A autenticação por e-mail e senha já emite sessões opacas e não associa condomínios automaticamente. Foi solicitada uma alternativa de entrada com Google, mas o produto não deve expor tokens no navegador, aceitar identidade controlada pelo cliente ou criar dependência de dados além do necessário.

## Decisão

Implementar o fluxo Authorization Code no servidor da API usando os endpoints oficiais do Google:

- escopos mínimos `openid email profile`;
- cookie HttpOnly de `state`, com validade de 10 minutos e comparação em tempo constante;
- troca do código e consulta ao UserInfo com `fetch` nativo do Node, sem SDK adicional nesta fatia;
- aceitar somente perfis com `email_verified=true`;
- guardar o `google_subject` no PostgreSQL e criar ou vincular a conta existente pelo e-mail verificado;
- emitir o mesmo cookie de sessão da aplicação, sem entregar access token ou client secret ao cliente;
- habilitar a opção somente quando `GOOGLE_CLIENT_ID`, `GOOGLE_CLIENT_SECRET` e `GOOGLE_OAUTH_REDIRECT_URI` estiverem definidos no servidor.

## Consequências

### Positivas

- Menos fricção no primeiro acesso.
- Sessão e autorização continuam sob controle da aplicação.
- Nenhuma dependência npm adicional ou integração de API Google além da autenticação.

### Negativas e riscos aceitos

- O projeto passa a depender da disponibilidade e das políticas do Google para autenticação.
- Vincular por e-mail verificado exige política de desvinculação antes de produção pública.
- OAuth público ainda exige revisão de rate limiting, observabilidade, LGPD e recuperação de conta.

## Alternativas consideradas

### Google Identity Services no cliente

Adiado nesta fatia: adicionaria script externo e exigiria validação de ID token no backend; o Authorization Code mantém o segredo no servidor e usa o proxy local já existente.

### SDK ou provedor SaaS de identidade

Adiado: adicionaria dependência, custo e tratamento de dados antes da validação da necessidade.

### Aceitar somente o e-mail retornado no navegador

Rejeitado: permite falsificação de identidade e não protege a sessão.

## Critérios para revisitar

- necessidade de outros provedores, SSO ou Google Workspace;
- publicação pública ou auditoria de segurança;
- evidência de custo, disponibilidade ou privacidade insuficientes.
