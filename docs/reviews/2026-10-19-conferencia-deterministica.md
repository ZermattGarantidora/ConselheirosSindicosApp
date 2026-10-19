# Fronteira entre IA e regras determinísticas — 2026-10-19

## Escopo entregue

O usuário pediu ajustar a separação entre tarefas exatas e interpretação. A inspeção confirmou
que comparação financeira, autorização, isolamento e validação de citações já usam código local.
Esta fatia reforça precisão e referências dos relatórios; não substitui a conversa por frases prontas.
As Specs 029 e 032 e suas aceitações foram atualizadas antes da implementação, sem ampliar o
briefing. O gate competitivo foi registrado em RQ-3204. ADRs 0002, 0003 e 0024 permanecem aplicáveis.

### Mudanças

- O cálculo continua em centavos `bigint`, com truncamento percentual explícito em duas casas.
  Antes de converter o percentual escalado para `number`, verifica o limite inteiro seguro.
  Excesso produz `precision_limit`, não número impreciso ou mensagem falsa de base zero.
- Todo achado publicado no relatório passa por conferência literal local: tenant, versão,
  documento, título, página e offsets em code points. Fonte inválida ou ambígua invalida o
  relatório inteiro; o endpoint usa sua degradação segura já existente.
- O índice de caracteres é transitório do pedido e reutiliza a página durante a validação;
  não introduz cache persistente, migração, retenção adicional ou mistura entre condomínios.
- Testes diretos bloqueiam rede. E2E demonstra que falha simulada da geração não impede o
  cálculo do relatório e não provoca nova chamada para resolver a conta.

## Verificação

| Gate | Resultado |
| --- | --- |
| `pnpm run check` | 673/673, 107 arquivos; formatação, lint, tipagem, 36 specs e scanner aprovados |
| Cobertura global | statements 89,21%; branches 82,94%; functions 95,78%; lines 91,47% |
| `pnpm run test:e2e` | 52/52; também incluídos no gate completo após o último ajuste de código |
| `pnpm run evals` | 20/20 locais |
| `pnpm run evals:documentary` | 50/50 determinísticos; nenhum semântico aprovado |
| Integração Neon dedicada a fixtures sintéticas | 7/7, guardas existentes; sem migração |
| `pnpm run build:web` | aprovado; nenhuma mudança visual nesta fatia |
| `git diff --check` | aprovado |

Na primeira tipagem, o teste de offsets ausentes não compilou por contrariar propositalmente
o contrato TypeScript. A entrada inválida passou a ser explicitamente forçada na fronteira
de teste; a asserção de rejeição não foi enfraquecida. O gate completo final passou.
A integração emitiu aviso de semântica TLS de versão futura do driver, sem falhar nem reduzir TLS.

## Revisão local

Inspeção integral das alterações desta fatia, seus chamadores, requisitos e testes, orientada
pela skill de code review. Foram examinados autorização antes da conferência, limites de
trabalho, duplicidade, Unicode, tipos inválidos, falha integral, divisão por zero, precisão
e independência do gateway. Sem achado P0/P1 nas alterações examinadas.

É autorrevisão, não revisão independente do branch. A árvore extensa de trabalho anterior foi
preservada. Nenhum commit, merge, publicação, chave ou provedor foi alterado/ativado. Todos os
documentos de teste são fictícios e as chamadas de gateway de teste são simuladas.

## O que não está concluído

- Conferência literal de fonte não demonstra que o trecho sustenta semanticamente uma
  conclusão nem que o OCR corresponde ao papel. Ambiguidades e riscos continuam exigindo revisão.
- Não existe garantia de que texto livre gerado nunca contenha erro matemático: o relatório
  calculado é separado e não consome números propostos pelo modelo. Roteamento híbrido de modelos
  e um contrato de interpretação restrita aos fatos calculados exigem fatia própria.
- Limitação de quantidade/tokens não é bloqueio monetário global. Ainda falta implementar
  contabilização e reserva de orçamento de todas as chamadas, inclusive OCR, retries e fallbacks,
  antes de prometer teto rígido de consumo pago. Nenhum valor ou câmbio foi presumido.
- Idempotência existente não equivale a deduplicação universal de uploads. Cache/reuso ampliado
  exige identidade de conteúdo, tenant, permissão, versão e política de retenção adequadas.
- Não se implementou conciliação bancária ou parecer profissional, nem a quarta frente de
  revisão das fichas semânticas. Piloto real, avaliação de modelo e aprovação especializada
  continuam sujeitos aos gates existentes.
- Merge continua exigindo revisão independente integral atualizada, CI e testes no commit a integrar.
