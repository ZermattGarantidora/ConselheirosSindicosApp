# Revisão do autor — contexto da convenção e inferência de vigência

- **Status:** delta revisado pelo autor; revisão independente para integração pendente
- **Autor/revisor:** Codex
- **Data:** 2026-11-03
- **P0/P1 encontrados no delta:** 0
- **Identificação:** manifesto
  `e592c03e66a77cef9a7311e66905fb248ff61bcad320a6931da917c011097c65`, baseline em
  `.local/convention-scope-fix/baseline/`.

Revisados os dois arquivos de produção, dois de testes, requisitos/aceitação, delta de prompt
e rastreabilidade. A tarefa financeira passa a depender do relatório local do envio; a regra
de evidência distingue falta de registro e aprovação/subscrições não comprovadas. Não há
afirmação automática de validade, substituição de fonte oficial por documento privado,
nova geração de reparo ou alteração da autorização. As alterações existentes foram preservadas.

Cinco regressões falharam antes da correção, 100 testes focados e 1.866 testes completos
aprovados; cobertura acima do piso nos quatro indicadores, build API, visão e scanner aprovados.
Evals determinísticos básicos 20/20 e documentais 50/50. Três smokes Sol 6.1 low sintéticos
foram revisados com v28, sem os dois comportamentos relatados. Evidências e limites estão em
[resultados](../specs/057-respostas-diretas-e-analise-conjunta/convention-scope-results-2026-11-03.md).

Após autorização explícita para o reinício da API em memória, o prompt v28 foi ativado no preview;
o cadastro e o PDF da sessão atual foram restaurados localmente e o catálogo reportou o arquivo
pronto. Este registro não autoriza merge nem substitui code review independente do branch completo.
