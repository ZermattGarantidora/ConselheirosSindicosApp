# Identidade no runtime persistente — 27/11/2026

## Problema observado e base

PR #23 foi aprovado por FeBuen0 e integrado em
`ff8aaa8c4b6ccaa5cc270892545839f32aa7ab45`. Comparação com o HEAD revisado `c57c2f5`
não contém arquivos diferentes; CI da main `46052276264`, job `140686269958`, aprovado.
API e worker publicaram o mesmo merge: deploys `dep-dc4t3btg1s2s73fnkav0` e
`dep-dc4t3m3l550s73akbgmg`. Worker passou no preflight e iniciou sem jobs pendentes.

O teste HTTPS privado confirmou health 200, `authMode=real`, `historyPersistence=durable`
e acesso por código habilitado, mas o primeiro login retornou 503. Nenhuma chamada de IA
foi feita e o orçamento segue disabled. Health saudável não prova entrada ou continuidade.

Consulta somente leitura no Supabase confirmou que o login de serviço não possui USAGE
direto de `app` nem EXECUTE da função de limite de entrada; `app_runtime` possui EXECUTE
das funções de limite e busca do código. Esse estado é o esperado para o login NOINHERIT.
O erro vem dos três adaptadores de identidade que consultam funções com `pool.query`
sem assumir o papel, enquanto os adaptadores de domínio já usam transações com papel local.

## Correção delimitada

RQ-7804/AC-7810 foram detalhados antes da implementação. A composição da API fornece aos
stores de código/sessão, autenticação e segurança de conta um executor que reserva conexão,
abre transação, assume somente `app_runtime`, executa a consulta parametrizada e confirma
COMMIT antes de devolver resultado. Erros conservam o objeto/SQLSTATE original, necessário
aos contratos existentes de conflito e indisponibilidade. Não há retry novo no executor.
Rollback antecede release; sua falha descarta a conexão.

O CLI administrativo continua usando sua conexão própria; provisionar códigos não ganha
permissão no runtime. Sem novo grant, migration, dependência, chave, sessão global de papel,
mudança de escopo por condomínio ou fallback em memória. Controles de IA e documentos não mudam.

## Validação e limites

- `test:persistent-runtime`: 76 testes aprovados; cobertura statements/branches/functions/lines
  97,80/98,88/85,71/100%. Executor novo coberto integralmente.
- Regressão de composição simula login NOINHERIT: limite, entrada positiva, dois aparelhos,
  restauração e logout independente, além dos três stores com papel local.
- Falhas de conexão/BEGIN/papel/consulta/COMMIT, rollback falho, resultado somente após commit
  e transações concorrentes usam sintéticos, sem `.env`, banco ou provedor externo.
- Gate de alinhamento: 78 specs aprovadas. Tipos aprovados.

Gates completos, revisão independente e CI do delta serão registrados no PR da correção.
Os contratos mockados não são apresentados como entrada corrigida no destino. Depois da
publicação revisada será repetido o teste HTTPS, antes de ativar a política BRL100 já aprovada.
Restauração no destino isolado, revisão humana e liberação de dados reais permanecem gates próprios.
