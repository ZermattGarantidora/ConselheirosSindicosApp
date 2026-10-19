# Critérios de aceitação — Spec 034

## AC-3407 — Chave não autoriza envio externo

Dada chave geral ou específica sem todos os gates, ou ambiente de produção, quando reconhecer um PDF, então há zero chamadas de rede e estado indisponível/revisão. Dado harness sintético explícito com chave específica e gates válidos, somente o fetch simulado do teste recebe o arquivo. Servidor e worker de uploads permanecem ligados ao OCR indisponível, mesmo com flags configuradas. PDFs textuais continuam funcionais.

## AC-3401 — OCR alto sem confirmação

Dado um OCR sintético de alta qualidade que extrai `R$ 88,00`, quando não existe confirmação independente, então a versão fica em `needs_review` e não pode sustentar análise financeira.

## AC-3402 — Algarismo divergente

Dado OCR `R$ 88,00` e confirmação independente autorizada de `R$ 83,00` para a mesma fonte, quando a consistência é avaliada, então o estado é `discrepant`, nenhum valor é escolhido e a versão fica em revisão.

## AC-3403 — Escopo da confirmação

Dada confirmação de outro condomínio, documento, versão, página ou rubrica, quando avaliada, então ela não confirma o valor OCR e a operação é recusada ou permanece em revisão.

## AC-3404 — Confirmação total

Dadas todas as entradas financeiras OCR confirmadas exatamente por fonte independente autorizada, quando a versão é processada, então o fluxo pode marcá-la pronta sem alterar o valor OCR.

## AC-3405 — Extração financeira vazia ou parcial

Dado OCR de alta qualidade de balancete sem entradas utilizáveis, linha monetária recusada ou tabela financeira ambígua, quando a extração retorna zero entradas ou apenas parte confirmável, então a versão permanece em revisão. Confirmações exatas das demais entradas não removem essa pendência.

## AC-3406 — Texto não financeiro

Dada ata textual OCR de alta qualidade, sem valores ou sinais de extração financeira pendente, quando não há entradas financeiras, então sua prontidão não é bloqueada por falta de confirmação numérica.
