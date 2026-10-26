# Aceitação — Spec 040

## AC-4001 — Recusar destino inseguro

Dada uma URL ausente, não PostgreSQL, fora do domínio Supabase ou sem TLS, quando o comando de integração é iniciado, então ele falha antes de conectar ou aplicar migrations.

## AC-4002 — Exigir confirmação e marcador

Dado um endpoint Supabase válido, quando a confirmação não é exatamente `synthetic-only` ou o marcador persistente não existe, então migrations e fixtures não são executadas.

Dado o workflow manual de integração, quando ele é acionado sem o segredo do projeto sintético ou
sem a confirmação `synthetic-only`, então o comando protegido falha antes de aplicar migrations ou
executar fixtures.

## AC-4003 — Preservar isolamento no Supabase

Dado o projeto Supabase sintético marcado e dois condomínios com dados e vetores distintos, quando uma consulta é executada como `app_runtime` em um deles, então nenhum candidato ou evidência do outro é retornado.

## AC-4004 — Remover caminho operacional Neon

Dado que migrations e a suíte RLS passaram contra o projeto Supabase sintético, quando uma pessoa segue README, `.env.example`, `AGENTS.md` e os comandos do `package.json`, então encontra somente o fluxo Supabase para integração sintética. Antes dessa validação, o fluxo Neon continua disponível como contingência. Registros de revisões históricas não são reescritos.
