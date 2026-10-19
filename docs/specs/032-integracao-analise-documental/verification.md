# Verificação da integração documental — 2026-10-16

## Resultado implementado

As quatro frentes estão conectadas no recorte sintético das Specs 028–032: PDF processado → páginas autorizadas → extração com procedência → cálculo financeiro ou campos normativos explícitos → relatório operacional no turno do chat. O relatório não altera o prompt aprovado nem se apresenta como fala gerada. Os derivados são transitórios sobre páginas já armazenadas; não há migração de dados, novo cache, serviço ou provedor.

## Gates executados

| Verificação | Resultado |
|---|---|
| `pnpm run check` | 99 arquivos, 574 testes aprovados; formatação, lint, tipagem, 32 specs e segredos aprovados |
| Cobertura global — statements / branches / functions / lines | 88,62% / 82,08% / 95,63% / 90,93% |
| `pnpm run test:e2e` | 27 testes aprovados |
| Integração Neon sintética | 7 testes aprovados com URL dedicada, TLS, confirmação e marcador persistente |
| `pnpm run evals` | 20 casos aprovados |
| `pnpm run evals:documentary` | 41/50 determinísticos executados e aprovados; nove pendentes; 50 semânticos não executados |
| `pnpm run build:web` | aprovado |
| `pnpm run audit:dependencies` | nenhuma vulnerabilidade conhecida reportada |
| `git diff --check` | aprovado |

A integração Neon foi executada com `node --env-file=.env.local node_modules/vitest/vitest.mjs run --config vitest.integration.config.ts`, equivalente à suíte `pnpm run test:integration`, carregando apenas a configuração local já existente. O guard sintético foi preservado. Nenhuma URL ou credencial foi copiada para este registro.

O teste ponta a ponta envia dois PDFs pela API, processa, compara centavos, verifica ambas as fontes e impede nova comparação após arquivar um documento. O teste PostgreSQL lê os dois IDs sob um único contexto autorizado, comprova RLS e exclui o documento arquivado. O teste de apresentação renderiza o componente real e comprova valores, fontes e escape de HTML documental.

## Revisão

Revisão independente no chat `01a145dc-c150-7693-8f77-0f08ba5a8a2a`: foi encontrado e corrigido conflito não sinalizado dentro da mesma versão. A regressão está em `tests/unit/document-analysis.test.ts` e AC-3009. A revisão subsequente não apontou P0/P1. Os testes foram executados pelo integrador; o revisor não alegou tê-los reexecutado.

Registro do snapshot revisado e limites de liberação: `docs/reviews/2026-10-16-integracao-documental.md`.

## Limites que permanecem

- A extração é conservadora, sem reconhecimento universal de geometria ou classificação semântica de prosa livre.
- O comparador exige dois meses explícitos AAAA-MM e rubricas equivalentes por normalização; duplicidades exigem revisão.
- O relatório operacional não é persistido na restauração do histórico.
- Os nove determinísticos pendentes são descritos individualmente em `evals:documentary`; não contam como aprovação. São três particularidades de tabela, discrepância visual 8/3 no OCR e cinco cenários adicionais de instrução documental.
- Os 50 casos semânticos ainda exigem execução probabilística e revisão de contador, jurista ou síndico conforme o tema. Nenhuma avaliação por provedor pago ou revisão humana especializada foi realizada.
- Estes resultados não declaram excelência documental, baseline de produto, autorização de dados reais ou prontidão de rollout. A Spec 031 permanece parcial; sua revisão especializada não pode ser preenchida por testes de código.
