# Revisão do autor — custo operacional no runtime

- **Status:** REVISÃO DO AUTOR CONCLUÍDA — NÃO AUTORIZA MERGE
- **Commit ou diff revisado:** delta da Spec 061 sobre o workspace pré-existente; nove arquivos de código/teste com manifesto SHA-256 `f851afae28b5a540302000507e7a1b149de3f0f623aaa4cfc1ad552e8d6466ba` em `.local/cost-061/source-manifest.json`, mais documentação/configuração descrita abaixo.
- **Revisor independente:** pendente
- **Autor/revisor desta etapa:** Codex
- **Data:** 2026-11-03
- **P0 abertos no delta:** 0 encontrados na revisão do autor
- **P1 abertos no delta:** 0 encontrados na revisão do autor

## Escopo revisado

Cinco módulos de produção: política/fábricas de roteamento, gateway OpenAI, gateway Codex,
persistência do motivo no caso de uso e ligação do lote no servidor. Quatro arquivos de teste:
novas regressões de runtime unitárias/E2E e ajustes dos testes OpenAI e Codex existentes.
Revisados integralmente os deltas em README, `.env.example`, rastreabilidade e ADRs 0022,
0035 e 0036, além dos novos ADR 0038, spec, aceitação e resultado 061. Alterações anteriores
do workspace foram preservadas; esta revisão não aprova o branch completo.

Verificados seleção de uma única geração, esforço, opt-out single, ausência de fallback novo,
falha segura, orçamento preservado e telemetria sem conteúdo. O prefixo cacheável contém somente
instruções genéricas, sem pergunta, tenant, evidências ou histórico. O texto v27 permanece idêntico.
O lote mantém Codex/Sol 6.1, limites e revalidação; o híbrido não o desabilita ou envia à API.
Histórico durável, cálculos, OCR/embeddings e regras de autorização não foram alterados.

## Comandos executados

- `pnpm run check`: aprovado, 1.727 testes/171 arquivos, todos os quatro indicadores acima de 80%.
- `pnpm run evals`: 20/20, zero falhas P0.
- `pnpm run evals:documentary`: 50/50 determinísticos.
- `pnpm run build:api` e `pnpm run build:web`: aprovados.
- Dois smokes sintéticos reais pelo Codex, usando `.env.local` em híbrido: Luna high e Sol 6.1 low concluídos.

Gates usaram pnpm instalado e diretórios temporários do workspace, conforme o
[resultado](../specs/061-custo-operacional-luna-sol/results.md). Não houve API paga ou dado real.
A tentativa anterior do smoke no sandbox falhou sem usage; permaneceu registrada como desconhecida.

## Limites de validação

Sem nova matriz probabilística ou inferência API. Eficiência de cache e qualidade com budgets
curtos precisam de medição da API antes de produção. Não se declara economia faturada,
aprovação especializada ou transferência das notas da Spec 060 ao híbrido.

## Decisão

Implementação disponível para o teste pessoal local após reiniciar a API. Nenhum commit,
merge, deploy, migração ou reinício do servidor do usuário. Revisão independente do diff completo,
CI no commit a integrar e gates de dados/piloto continuam obrigatórios antes de integração/liberação.
