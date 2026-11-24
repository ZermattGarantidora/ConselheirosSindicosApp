# Convenção sem tarefa financeira e sem inferência indevida de vigência

## Implementação

Requisitos RQ-5703/5704 e AC-5714/5715. O comentário automático sempre continha uma instrução
para relacionar balancetes, mesmo no envio isolado de uma convenção. A instrução agora depende
de análise financeira local do envio. O prompt compartilhado v28 também impede introduzir
balancetes ou sua ausência em um comentário sem esse escopo e distingue registro,
aprovação/subscrição e ausência de comprovação no material. Pedidos financeiros explícitos,+lotes financeiros, fontes e limites de validação permanecem cobertos pelas regressões.

O delta apresentado e autorizado está em `prompt-adjustments-2026-11-03.md`. As fontes oficiais
fundamentam o limite de inferência; não são convertidas em evidências documentais de um cliente.
Não foi reutilizado o PDF privado do usuário nos testes nem nos smokes.

## Verificação

- Cinco regressões novas falharam antes da correção; após a implementação, 100 testes focados
  passaram em cinco arquivos, incluindo gateways, roteamento e cache de instruções.
- `pnpm run check` aprovado: 1.866 testes em 175 arquivos; formatação, lint, tipagem, visão de
  63 specs e scanner de segredos. Cobertura: statements 91,53%, branches 87,96%, functions
  96,39%, lines 93,13%.
- `pnpm run build:api` aprovado.
- Evals básicos determinísticos: 20/20, nenhum P0 falhou. Evals documentais determinísticos:
  50/50; os 50 cenários semânticos desse comando continuam pendentes de revisão/modelo.
- Três smokes reais, uma geração por exemplo, pelo Codex/Sol 6.1 low autorizado, todos com
  convenções inteiramente fictícias e telemetria `answer-prompt-v28`.

| Exemplo sintético | Resultado observado |
|---|---|
| Aprovação/subscrição documentadas e registro ainda não realizado | Distinguiu aprovação e registro, preservou cautela sobre a confirmação atual e não afirmou falta de vigência ou invalidade pelo registro. |
| Minuta com aprovação e subscrições explicitamente pendentes | Tratou mandato/rateio como proposta, com ajuda ligada à deliberação. |
| Aprovação/subscrições não comprovadas no arquivo | Disse que a confirmação estava em aberto e explicitou que isso não permitia concluir que as etapas não ocorreram. |

Nenhuma das três falas nem seus campos auxiliares introduziu balancetes. A inspeção das falas é
revisão técnica do autor; três exemplos não demonstram correção universal nem revisão jurídica
especializada. Totais informados pelo gateway: 40.335 tokens de entrada, 1.250 de saída, zero
tokens de cache reportados. O contador local de custo estimado não mede cobrança ou franquia.

## Rastreabilidade e ativação

Manifesto dos quatro arquivos de código/testes em
`.local/convention-scope-fix/source-manifest.json`, SHA-256
`e592c03e66a77cef9a7311e66905fb248ff61bcad320a6931da917c011097c65`.
Baseline, logs e resultados sintéticos dos smokes ficam nesse diretório ignorado pelo Git.

A API reportava `historyPersistence=volatile`. Após a explicação da perda de histórico,
cadastros e catálogo em RAM conforme briefing §8, o usuário autorizou “Reiniciar e ativar agora”.
Somente o processo identificado da API foi reiniciado com o build compilado que exporta
`answer-prompt-v28`; `/health` retornou `ok` e o Vite permaneceu ativo. O cadastro e o PDF da
sessão “nós” foram preservados e restaurados localmente; o catálogo confirmou o arquivo pronto,
sem gerar nova análise. Cópias temporárias dessa restauração foram removidas. O histórico em
RAM foi descartado conforme autorizado. Sem commit, merge ou deploy de produção; alterações
existentes do diretório compartilhado foram preservadas.
