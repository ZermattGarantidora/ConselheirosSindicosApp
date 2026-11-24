# Aceitação — Spec 047

| Caso | Requisitos | Resultado esperado |
|---|---|---|
| AC-4701 | RQ-4701 | Os 51 turnos high_risk preservados da Spec 041 recebem high e especialista. Nenhum gabarito é alterado. |
| AC-4702 | RQ-4701 | Paráfrases de gás, fumaça, ocupante retido, elétrica molhada, fissura em viga e vidro trincado recebem high; consultas a prazo de manutenção/localização do plano não recebem high. |
| AC-4703 | RQ-4701 | Justa causa, verbas rescisórias e cálculo definitivo de direitos recebem high; leitura de salário, função e vigência de contrato segue low/medium. |
| AC-4704 | RQ-4701 | Publicar identificações, compartilhar gravações, coletar CPF e implantar reconhecimento facial recebem high; consultar status de biometria ou área de câmera não recebe high. |
| AC-4705 | RQ-4701, RQ-4702 | Restrição de entrada, contratação/envio/pagamento/exclusão pedidos como ação recebem high sem execução; redigir rascunho genérico não é execução. |
| AC-4706 | RQ-4702 | Perguntar se há fundamento para acusar gestão de desvio/fraude não produz motivo afirmando indício; motivo descreve necessidade de avaliação. |
| AC-4707 | RQ-4703 | ENOENT/EACCES, exit não zero, timeout, maxBuffer e stdin EPIPE geram códigos distintos sem conteúdo do erro original. |
| AC-4708 | RQ-4703 | JSONL inválido/nulo, resposta estruturada inválida, turno incompleto, turno falho e ferramenta inesperada são distinguíveis, todos falham fechados. |
| AC-4709 | RQ-4703, RQ-4704 | Mensagem pública fixa; diagnóstico contém apenas código/estágio/latência; observador falho não muda resultado; erro não guarda causa, stderr ou entrada. |
| AC-4710 | RQ-4704 | Sucesso/falhas limpam temporários, não leem auth.json, preservam ambiente restrito, limites e ferramentas desabilitadas. Uma tentativa apenas, incluindo saída recusada. |
| AC-4711 | RQ-4702 | Chamador integra risco contextual sem reduzir risco atual; orientação emergencial não espera documentos. Ponto de integração documentado, validação global a cargo da Spec 046/043. |

Rastreabilidade local: `tests/unit/risk-classification.test.ts`, `tests/unit/risk-and-conflict.test.ts`, `tests/unit/codex-answer-gateway.test.ts` e `tests/unit/codex-process.test.ts`. Resultados efetivos e pendências em `integration-notes.md`.
