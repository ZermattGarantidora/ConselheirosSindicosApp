# Revisão parcial por IA — Segurança e integração operacional

**Data:** 09/11/2026. **Revisor:** frente Infraestrutura, diferente do autor de Segurança.
**Estado:** sem achado concreto novo no escopo abaixo; não aprova merge, branch ou piloto.

## Resultado

O P1 de reuso de política foi corrigido nos arquivos observados: o executor passa a revisão
ao ledger e o ledger a confere antes de recuperar resultado/reserva e antes das transições por
owner. A identidade lógica permanece igual; trocar revisão não cria atalho para reenvio. Recibo
legado sem revisão falha fechado. A reprodução anterior e os sete casos red/green de Segurança
foram consultados; sete casos passaram novamente nesta revisão, em arquivo sintético. A prova
PostgreSQL/restore em outro processo também recusou B, recuperou A e conservou estado incerto.

Lidos integralmente: `operation-budget.ts`, `local-operation-budget-store.ts`,
`postgres-operation-budget-store.ts`, `hosted-operation-budget.ts`, `login-attempt-limit.ts`,
`postgres-access-code-store.ts`, migration 040; executor/ledger documentais e migration 039.
Inspecionados contratos/testes de consumo, política, composição e nota de Segurança. A revisão
usou a skill `code-review`; o revisor escreveu o harness operacional, não os módulos revistos.

Verificados em SQL real local: serialização de reserva/claim, limites, pool restrito e SET LOCAL
ROLE, contador pre-auth, política default negativa, negação de leitura direta, isolamento/RLS,
persistência de recibos e recuperação, finalização com token, falta de takeover de unknown e
composição vinculada ao autorizador/resolvedor no replay. A fábrica pareada nova é necessária
para revalidar escopo sem consumir outra quota; o harness passou a usá-la inteira.

## Evidência e delimitação

- `.local/pilot-operations/68c143ec562d415280f5e00c2eb4161b/result.json` registra hashes de 14
  entradas da integração e 40 migrations estáveis antes/depois; os recibos `ledger-seed-result.json`
  e `ledger-verify-result.json` identificam processos distintos, SQL real e ausência de provedor.
- `.local/pilot-security/integration-1794250311567-24312/results.json`: 15 testes de composição.
- `.local/pilot-security/integration-1794250529616-12492/results.json`: sete testes de política.
- Relatórios anteriores `docs/reviews/pilot-policy-regression-red-2026-11-09.json` (0/7) e
  `pilot-policy-regression-green-2026-11-09.json` (7/7) pertencem à frente Segurança.
- Hashes do escopo operacional final:
  `.local/pilot-operations/integration-source-hashes-2026-11-09.json`.

Nenhum achado P0/P1 adicional confirmado nesta leitura. Não foram revisados integralmente os
centenas de deltas preexistentes, todas as rotas/startup/worker da outra frente ou o diff de uma
revisão Git fixa. SQL local não certifica fornecedor, borda/proxy, retenção, exclusões pós-restore,
privacidade jurídica, semântica/OCR efetivos ou comportamento de IA externa. Gates globais e
revisão atual completa continuam obrigatórios. Não há revisão humana/profissional declarada.
