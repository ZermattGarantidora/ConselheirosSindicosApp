# Correções do startup persistente — 27/11/2026

**Base:** PR #22 integrado em `a9313922c024e9c5024c239de3b9837f5b78a061`; conteúdo
idêntico a `ed2b1e07cbbaa93294ca73dae01a663939d3a84c`, revisão independente e aprovação
GitHub de `FeBuen0`. CI da main `46045944201` aprovado.

## Evidência e correção

Após autorização explícita para conectar API, aplicar 044 e provisionar duas contas
sintéticas com teto global de R$100/dia, a 044 foi aplicada com histórico e as duas contas
foram criadas manualmente pelo usuário. SQL somente leitura confirmou dois usuários/códigos.
Nenhum dado real foi usado; política continua disabled e não houve chamada de IA.

O worker publicou `a931392` e passou no preflight de fila. A API preservou a versão anterior
durante três tentativas recusadas, posteriormente canceladas:

1. A sincronização do Blueprint reaplicou `DEMO_MODE=true`, incompatível com o manifesto.
   O Blueprint canônico passa a declarar `false`, conforme a transição prevista na Spec 078.
2. `chatSessionConnectionString` recusava o pooler Supabase já em 5432, inclusive sua própria
   saída. Reconhece 5432/6543 e a porta padrão, sempre conservando banco, usuário e TLS.
   Poolers desconhecidos continuam recusados.
3. O preflight consultava `to_regprocedure('app...')` antes de assumir `app_runtime`.
   O login NOINHERIT corretamente não recebe USAGE direto do schema. O papel é assumido
   antes da consulta, mantendo `session_user` como identidade verificada e todos os predicados
   de privilégio/RLS. Nenhum GRANT novo, tabela, migration ou exceção foi introduzido.

Diagnóstico Node/pg somente leitura no worker publicado: as portas 5432/6543 autenticaram
como `alvitra_service`, assumiram `app_runtime` e leram a função 044. A consulta exata do
preflight extraída do módulo falhou com `42501 permission denied for schema app` antes do
papel; com o papel assumido primeiro retornou `ready:true`. Catálogo administrativo confirmou
login restrito, runtime MEMBER, zero memberships elevadas/owner, runtime NOLOGIN/NOINHERIT
sem pais e oito tabelas essenciais RLS/FORCE. Credenciais/CA nunca aparecem no relatório.

## Regressões e validação

- RQ-7803/7804 e AC-7807/7809 atualizados antes da implementação; Spec 025 distingue o
  perfil demo histórico da transição persistente autorizada.
- Mocks recusam a consulta de readiness anterior ao papel, reproduzindo o 42501 observado.
- Testes de sessão cobrem modos Supabase, preservação de opções e idempotência; startup
  cobre os dois modos com CA e `rejectUnauthorized:true` nos dois pools.
- Teste operacional exige `DEMO_MODE=false` no Blueprint efetivo.
- Quatro arquivos focados: **141/141 aprovados**. Comando da Spec 078: **66/66**, cobertura
  statements/branches/functions/lines **97,40/98,88/83,33/100%**. Tipos, lint e gate de 78 specs
  aprovados. Build, formatação, revisão independente final e CI serão registrados no PR.

O startup e os ensaios completos no destino continuam pendentes. O teste HTTPS anterior
observou a versão antiga em modo development e não validou persistência. Nenhum resultado
de mock ou SQL isolado é apresentado como jornada concluída ou liberação do piloto.
