# Notas de integração — Spec 030

## Integração final — 2026-10-16

A Spec 032 chama `normativeFactsFromPages` e `analyzeNormativeDocuments` sobre páginas autorizadas e exibe achados com fontes no turno. Além das linhas anotadas, o adaptador aceita cabeçalhos e rótulos naturais explícitos, sem classificar prosa livre. A rastreabilidade global foi registrada. O prompt não foi alterado; o relatório é operacional. As pendências de conexão ao runtime descritas abaixo pertencem ao recorte anterior à integração.

**Atualizado em:** 2026-10-16

## Integrações pendentes

- A Spec 028 deve publicar um adaptador explícito de sua extração para `StructuredNormativeFact`; esta fatia não importa código em construção na pasta documental.
- Retrieval, respostas e prompts não são alterados. Quando integrarem estes achados, devem manter a fonte completa e não formular validade, vigência, quórum atendido ou prevalência sem evidência e regra verificáveis.
- Evals transversais devem consumir somente fixtures sintéticas e cobrir conflito, abstenção, isolamento e escalonamento jurídico/financeiro relevante.
- A atualização coordenada de `docs/quality/traceability.md`, comandos globais e documentação pública permanece fora desta frente compartilhada.

## Decisões preservadas

- Datas são atributos de fonte e não resolvem conflito ou vigência.
- `registered_quorum` e `required_quorum` não autorizam inferir `quorum_met`.
- Ausência de valor é representada por `unknown`, não por string vazia ou valor padrão.
