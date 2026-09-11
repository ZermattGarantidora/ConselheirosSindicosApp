# Relatório do piloto sintético B7

**Identificador:** `b7-synthetic-2026-09-10-v1`
**Data:** 2026-09-10
**Ambiente:** Vitest E2E, API Fastify em memória, gateway extrativo local
**Dados:** documentos fictícios gerados por IA, marcados como `FICTÍCIO — GERADO POR IA — SOMENTE TESTE`

## Resultado

| Métrica | Resultado |
| --- | ---: |
| Cenários executados | 100 |
| Cenários aprovados | 100 |
| Falhas P0 | 0 |
| P50 de latência | 0,28 ms |
| P95 de latência | 0,75 ms |
| Latência máxima | 20,66 ms |
| Custo estimado de IA | R$ 0,00 |
| Chamadas a provedor externo | 0 |
| Ações externas | 0 |
| Contatos comerciais acionados | 0 |

Categorias cobertas: respostas fundamentadas em Alameda e Bosque, abstenção,
prompt injection, tentativa de acesso proibido e perguntas inválidas.

## Comando reproduzível

```powershell
pnpm run pilot:synthetic
```

## Pacote de revisão humana

Os 100 casos foram revisados manualmente por uma pessoa diferente do implementador,
com resultado de 100 aprovados, 0 pendentes e 0 reprovados. O registro está em
`docs/reviews/b7-corpus-human-review-2026-09-10.md`; a conclusão é limitada ao
corpus sintético e não substitui os gates de uma liberação externa.

## Conclusão e limites

O fluxo técnico sintético passou integralmente e a revisão humana dos casos foi
concluída, fechando T704 apenas no escopo sintético/local. Isso não comprova uso
recorrente, disposição de pagamento, experiência com síndicos ou comportamento
com dados reais, nem autoriza seleção definitiva de modelo, produção,
armazenamento remoto ou contato comercial.
