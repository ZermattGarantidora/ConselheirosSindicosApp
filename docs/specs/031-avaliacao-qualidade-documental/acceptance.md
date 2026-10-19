# Critérios de aceitação — Spec 031

## AC-3105 — Fechamento determinístico

Dados os mapas de tabelas/OCR e os cinco cenários adversariais pela API, quando o comando canônico roda, então executa 50 casos com identificadores únicos e nenhuma pendência determinística. Qualquer falha ou executor ausente produz saída de erro. A discrepância OCR usa adaptador sintético, não é avaliação visual do provedor. Casos semânticos continuam separados e pendentes de avaliação especializada.

## AC-3101 — Casos completos e diversos

Dado o inventário da Spec 031, quando validado localmente, então contém 100 casos sintéticos distintos, 50 determinísticos e 50 semânticos, e cada caso declara tarefa, entrada, fontes esperadas, resultado, severidade e ao menos três critérios de julgamento.

## AC-3102 — Execução determinística real

Dado o contrato financeiro e extração estruturada já implementados, quando o executor roda, então executa somente os cenários cujas entradas e asserções são fielmente atendidas por esses contratos, valida cálculo, ausência, ambiguidade ou isolamento financeiro aplicáveis e marca os demais como `pendingIntegration`, sem lhes atribuir aprovação.

## AC-3103 — Métricas honestas

Dado o relatório, quando os casos semânticos ainda não foram julgados por especialista nem executados no caminho integrado, então eles aparecem como pendentes e não como aprovados; chamadas de provedor e dados reais permanecem em zero.

## AC-3104 — Segurança e evidência

Dado cenários de fontes incompletas, conflito, OCR incerto, instrução maliciosa ou risco alto, quando forem avaliados pelo caminho integrado futuro, então a decisão esperada é abstenção, exposição do conflito, tratamento do conteúdo como dado e/ou escalonamento humano, nunca fabricação de citação ou ação externa.
