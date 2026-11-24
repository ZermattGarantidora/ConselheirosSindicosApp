# Revisão por IA — preparação operacional da Spec 070

**Resultado:** nenhum defeito acionável confirmado no escopo abaixo.  
**Status:** revisão técnica por IA; não é aprovação humana independente, merge ou liberação.  
**Revisor:** agente da frente Segurança, dados e validação, diferente da frente autora.  
**Data:** 09/11/2026. Hashes dos arquivos de código/configuração em
`pilot-security-snapshot-2026-11-09.json`, seção `reviewedInfrastructureFiles`.

## Escopo efetivamente lido

Adições tratadas como arquivos novos no checkout: `scripts/pilot-preparation.ts`,
`scripts/verify-pilot-preparation.ts`, `scripts/pilot-recovery.ts`,
`scripts/verify-pilot-recovery.ts`, `tests/unit/pilot-operations.test.ts`, `render.pilot.yaml`,
`.github/workflows/pilot-operations.yml` e os quatro arquivos em `infrastructure/pilot/`.
Foram lidos Spec 070/aceitação, ADR 0042 e nota de infraestrutura; conferidos os chamadores de
migrations, acesso/código, chat, original e fila necessários ao ensaio.

A revisão percorreu guardas de loopback literal/nome/marcador/confirmação, ambiente mínimo de
subprocessos, exclusividade da saída, snapshot compartilhado, checksum/manifesto, transação do
restore, ausência de comandos de limpeza, ACL/RLS/roles/ownership, negação de tenant cruzado e
mensagens genéricas. SQLs agregados são de operação, não health checks públicos. O verificador
tem subconjunto YAML fechado e mantém `activationAuthorized=false` mesmo com decisões preenchidas.

## Verificação e limites

Executado nesta frente: `node scripts/run-tsx.mjs scripts/verify-pilot-preparation.ts`.
Resultado: configuração válida, zero conexões declaradas, **14 decisões pendentes**, ativação
negada. Comandos `pilot:preparation`, `test:pilot:operations` e `test:pilot:recovery:local`
integrados em package.json/README/AGENTS após leitura da nota e código; nenhum runner de banco
foi executado para realizar a integração.

Testes/cobertura da operação são evidência declarada pela frente autora, não reexecução desta
revisão. O ensaio PostgreSQL/pg_dump/pg_restore não foi executado; AC-7004 continua pendente.
Mocks de dump/catálogo não certificam execução SQL, equivalência de privilégios restaurados ou
compatibilidade do CLI. O snapshot lido pode mudar enquanto a frente encerra seus trabalhos;
qualquer alteração invalida a conclusão para os arquivos afetados.

O escopo local exige o mesmo operador/papéis e escritores congelados; não comprova ownership,
WAL/PITR, RPO/RTO, segredos, retenção ou replay de exclusões/revogações no destino Supabase.
Não há aprovação de fornecedor/região/política, cobertura global ou diff completo do branch.
Esses limites já estão explícitos na spec/nota e seguem bloqueantes de ativação; não são
convertidos em defeitos do ensaio exclusivamente local. A política sintética permanece vigente.

Nenhum arquivo da frente autora foi modificado nesta revisão e nenhum comentário foi enviado
a outro chat ou terceiro. Aplicada a skill local `code-review`; não foram inventadas assinaturas
jurídicas, especializadas ou independentes humanas.
