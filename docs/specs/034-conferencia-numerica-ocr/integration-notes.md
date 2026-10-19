# Notas de integração — Spec 034

## Estado atual

O contrato é local e transitório. Nenhum operador, banco, tela ou segundo OCR produz confirmações neste recorte; portanto uma versão OCR com números financeiros continua em revisão por padrão seguro.

## Integração futura necessária

Um fluxo de revisão humana deverá consultar o original privado autorizado, criar confirmação com identidade e auditoria, persistir o resultado sob RLS e reprocessar a versão. Qualquer segundo fornecedor ou chamada automática requer ADR e avaliação de custo, privacidade e qualidade.

## Avaliação

O executor `evals/documentary-quality/ocr/executors.ts` está conectado ao runner canônico. Cobre a divergência 8/3 na regra de consistência e no processamento de PDF digitalizado com adaptador OCR simulado. Isso comprova bloqueio de discrepância, não transcrição visual correta. Revisão visual real, revisão especialista e avaliação de provedor permanecem pendentes.
