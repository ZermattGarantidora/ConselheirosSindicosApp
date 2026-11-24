# Reserva durável de consumo — verificação local

**Estado:** preparação local concluída; integração central, SQL e liberação pendentes.  
**Data:** 09/11/2026. **Autoria/autorrevisão:** agente da frente Segurança.  
**Revisão independente humana:** não realizada nem presumida.

## Escopo e rastreabilidade

Spec 072 e aceitação foram escritas antes do comportamento, após leitura do briefing completo,
MVP, estratégia e contratos relacionados. ADR 0044 foi ampliado e a migration 040, ainda não
aplicada por esta frente, prepara política desabilitada e recibos privados. Sem nova dependência,
fornecedor, prompt, cobrança ou autorização positiva. Specs 011/068 conservam sessão permanente
por aparelho, histórico completo e WhatsApp somente na abertura pública.

Três módulos novos preparam custo/quantidade diários UTC por condomínio/conta e global,
concorrência, reserva idempotente, claim único, conclusão durável e incerteza sem retry automático.
Recibo contém apenas metadados/hashes; recuperação do texto depende do journal/ledger privado.
Um condomínio compartilha teto entre usuários; setup pré-condomínio é somente conta. Moedas
não são misturadas e relógio anterior a recibo confirmado falha fechado.

## Evidências executadas

| Verificação | Resultado e artefato |
|---|---|
| `node node_modules/vitest/vitest.mjs run --config tests/vitest.operation-budget.config.ts --coverage --reporter=json --outputFile=docs/reviews/pilot-budget-tests-r2-2026-11-09.json` | **30/30 testes**, incluindo quatro processos independentes; relatórios anteriores preservados |
| `node node_modules/vitest/vitest.mjs run --config tests/vitest.pilot-security.config.ts --reporter=json --outputFile=docs/reviews/pilot-security-expanded-tests-2026-11-09.json` | **77/77 testes em dez arquivos**, zero falhas; sem cobertura nessa seleção |
| Cobertura V8 dos três módulos novos, sem exclusão | Statements **94,37%**, branches **93,95%**, functions **95%**, lines **98,02%**; quatro pisos de 80% atendidos no conjunto focado |
| ESLint instalado nos três módulos, teste, fixture e duas configurações | Aprovado; nenhum lint global executado |
| TypeScript instalado, `--noEmit --target ES2024 --module NodeNext --moduleResolution NodeNext --strict --noUncheckedIndexedAccess --exactOptionalPropertyTypes --skipLibCheck` nos três módulos, teste, fixture e configuração de orçamento | Aprovado; nenhum typecheck global alegado |
| Prettier instalado, `--check` nos arquivos focados e package.json | Aprovado após corrigir somente formatação no teste |
| Gate canônico de visão em cópia isolada com Specs 011/068/072 | **Três specs aprovadas estruturalmente**, sem enfraquecer o script; gate global pendente |
| `git diff --check` no escopo da rodada | Sem erro; arquivos novos também lidos integralmente na autorrevisão |

Cobertura original exclusiva em `.local/pilot-security/budget-coverage-7868/coverage-summary.json`,
cópia em `pilot-budget-coverage-2026-11-09.json`. O gate isolado usa
`.local/pilot-security/budget-spec-vision-9afd8f4fe5ba4ceeb48a16652d7fc7e4/`;
script, briefing e specs copiados sem edição. Comandos permanentes `test:pilot:budget` e
`test:pilot:security` registrados em package.json/README/AGENTS, sem instalar dependências.

Os testes demonstram corrida entre processos, limites agregados, payload/usuário divergentes,
cancelamento anterior ao claim, máximo conservador, confirmação de commit perdida, reinício,
virada de dia, falha de journal, revogação após geração, corrupção, moeda e relógio regressivo.
Callbacks são fictícios, temporários próprios e nenhum transporte/provedor externo é chamado.
O PostgreSQL é mockado: transação, parâmetros, roles, token em hash, rollback e respostas inválidas.
Isso não certifica a execução da função SQL, RLS ou desempenho no destino.

## Revisão e limites

Autorrevisão percorreu os três módulos, migration 040, fixture multiprocesso, testes/configs,
Spec 072/aceitação/ADR, mudanças documentais e comandos desta rodada. Recibos operacionais
sem FK/cascade não apagam quotas na exclusão do domínio; não autorizam acesso órfão e sua
retenção precisa de decisão específica. Arquivo local exige `synthetic-only`, compartilha
somente o mesmo volume e nunca serve como fallback do PostgreSQL.

O wrapper não foi ligado aos arquivos centrais de outras frentes. Falta fechar um total
monetário autoritativo com o ledger documental, sem somar compromissos espelhados, e provar
resultado/journal/recibo juntos. Reconciliação de `started/unknown`, tetos/moeda aprovados,
SQL/restore, política/fornecedores e revisão independente continuam requisitos de ativação.

Minutas adicionais de incidentes/suporte, direitos/exportação/exclusão e redaction/acesso
operacional foram preparadas, sem decisões jurídicas ou responsáveis fictícios. A fila passou
a ser por dependências, sem lotes diários; 16/11 permanece somente a meta final.

Relatório e hashes desta rodada em `pilot-budget-snapshot-2026-11-09.json`. O manifesto é um
snapshot local de checkout concorrente, não commit de release. Gates globais, integração
destrutiva, evals pagos, deploy, dados reais e revisão completa da candidata não foram executados.
As inspeções das outras frentes têm relatórios separados; P1 documental reproduzido continua
pendente do dono. Nenhuma aprovação de merge, profissional ou uso real é emitida aqui.
