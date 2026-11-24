# Revisão local — conferência automática de balancetes

- **Status:** revisão local; sem autorização de merge
- **Revisão:** alterações da Spec 049 no diretório de trabalho de 2026-10-27
- **Autor e revisão local:** Codex
- **Revisor independente:** pendente; esta revisão não substitui o gate de merge

## Escopo

Conferência local dos dez pontos, comparação histórica automática, cruzamentos com orçamento,
contas bancárias, reserva, suportes e obrigações documentadas. Interface apresenta prioridades,
estados, pedidos específicos e fontes. A seleção do catálogo e a revalidação abrangem todas as
versões elegíveis do condomínio. Outros tipos documentais mantêm resumo da versão recebida.

O diretório já continha alterações extensas, inclusive as Specs 041–048 e o resumo de anexos.
Elas foram preservadas. A revisão desta rodada abrange o novo módulo `financial-review.ts`,
os pontos de integração em `document-snapshot.ts`, `document-analysis.ts`, `create-api.ts` e
`App.tsx`, os testes correspondentes e a documentação da Spec 049/ADR 0034.

## Verificações de código

- Inteiros em centavos e fontes de todas as parcelas; sem cálculo por modelo.
- Competência explícita, conta bancária correspondente e escopo mensal; duplicidades e
  divergências de regime/plano impedem seleção silenciosa.
- Apoios exigem vínculo ao lançamento, valor e período. Duplicidade não reutiliza um
  comprovante para certificar dois lançamentos.
- Datas de obrigações são validadas no calendário; totais e abrangência declarada permanecem
  distinguíveis da completude real. Saldo final não presume caixa livre.
- Reader e validação literal mantêm tenant, versão, página, trecho e offsets Unicode.
  Revogação e remoção/mudança de fonte durante geração impedem publicação.
- Conteúdo hostil falha com mensagem segura; o gateway continua recebendo apenas estados,
  sem nomes, valores ou documentos. Não há novo prompt, provedor, schema ou dependência.

## Execução

O wrapper `pnpm` não executou porque o Corepack tentou baixar pnpm 11.19.0 e o DNS do registry
falhou. Os scripts foram executados pelos mesmos binários já instalados: Prettier, ESLint,
TypeScript, Vitest, Vite, `validate-spec-vision.ps1`, scanner e runners de evals.

A primeira suíte identificou a incompatibilidade de um rótulo repetitivo com a regra existente
de apresentação do chat. A ação financeira passou a uma lista contextual, sem alterar o teste.
Outra rodada concorrente sofreu timeouts em testes variados; após uma execução completa aprovada
com dois workers, um novo timeout isolado motivou a conferência final em série (um worker), sem
aumentar timeouts nem relaxar asserções. A checagem de tipos também encontrou uma referência
capturada por função interna que perdia o estreitamento do tipo; uma variável local explicitamente
validada resolveu a questão sem asserção de tipo ou mudança de regra financeira.

A execução em série carregou prompts antigos enquanto outro trabalho atualizava seus testes:
três divergências fora da Spec 049. A validação final usa uma cópia congelada e isolada do
estado atual, com os oito arquivos de código/teste desta tarefa conferidos por SHA-256.
Uma primeira localização dentro de `node_modules` foi ignorada pelo coletor de cobertura;
essa coleta vazia foi descartada. A execução válida fora dessa árvore passou nos 1.289 testes
e atingiu 91,58% de statements, 87,00% de branches, 96,66% de functions e 93,38% de lines.
O novo módulo atingiu 99,65%, 97,39%, 100% e 100%, respectivamente.

Os resultados finais e a evidência ficam na matriz de rastreabilidade e em
`reports/049-quality-final.log` / `reports/049-coverage-summary.json`. A cópia temporária é
removida após preservar os resultados; não constitui novo checkout ou entrega de outro projeto.

Formatação, lint, typecheck, builds API/web, gate de 50 specs e scanner de segredos aprovados.
Evals existentes aprovados: 20/20 e 50/50 determinísticos, sem chamadas a provedor real.
O manifesto `reports/049-source-manifest.json` registra a igualdade dos arquivos entre a cópia
validada e o diretório de trabalho. Nenhum achado P0/P1 identificado na revisão local desta fatia;
revisão independente e status checks remotos continuam obrigatórios antes de qualquer merge.

## Limites

Fixtures inteiramente sintéticas. Reconhecimento conservador de rótulos e vínculos, sem promessa
de parser universal, auditoria ou aprovação de contas. Revisão contábil especializada e
validação da experiência permanecem pendentes. Não houve commit, merge, deploy ou piloto real.
