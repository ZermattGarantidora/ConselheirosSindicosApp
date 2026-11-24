# ADR 0038 — Roteamento no runtime e cache de instruções

**Status:** aceito para implementação e validação sintética local  
**Data:** 2026-11-03

## Contexto e autorização

O usuário pediu incorporar a redução de custo ao app e ao teste local. A Spec 061 detalha o
briefing §§8–10 e 12–13: caminho econômico preservando evidência, isolamento e qualidade.
O roteamento da Spec 051 estava somente na fábrica Codex; a API usava um modelo fixo.

## Decisão

As fábricas de ambiente passam a escolher híbrido por padrão: Luna high ou Sol 6.1 low segundo
a política determinística existente. `*_ANSWER_ROUTING=single` permite reversão e respeita o
modelo configurado. Construtores diretos e evals de modelo único mantêm seus contratos anteriores.
Não há classificador pago, dupla geração nem tentativa de escalada entre modelos por erro.

A Responses API recebe o mesmo texto v27 dividido em instruções genéricas, metadados confiáveis
dinâmicos e dados não confiáveis. Somente instruções genéricas recebem breakpoint explícito,
modo explicit e TTL de 30m em Luna/Sol. Não armazenar respostas no provedor nem criar cache
documental ou de retrieval. O cache não inclui contexto de tenant, histórico, IDs ou evidências.
Modelos customizados conservam o transporte anterior. O Codex mantém seu cache automático,
sem presumir controles de API disponíveis no CLI.

A síntese integral de lote continua exclusiva do destino já autorizado na Spec 057:
Codex/ChatGPT e Sol 6.1 low, inclusive quando as perguntas normais usam híbrido. Não se envia
esse payload à Luna ou à API. Isso sucede somente a condição técnica `routing=single` do
ADR 0036; destino, modelo, limites e revalidação permanecem.

## Consequências e limites

Sem provedor, dependência, schema, mudança de prompt ou chamada adicional para classificar.
Histórico durável, memória limitada, cálculos e processamento documental são reutilizados.
Cache tem cobrança de escrita e não garante economia em tráfego sem repetição. Budgets curtos
podem limitar Luna high; respeitar teto e falhar de modo seguro, sem aumentá-lo silenciosamente.
Não aprova dados reais, hospedagem pública do Codex, nova cobrança, deploy, merge ou piloto.
Tarifas nominais e testes com mocks não provam custo por resposta aprovada em produção.

## Fontes oficiais consultadas em 03/11/2026

- [OpenAI Docs — Luna](https://developers.openai.com/api/docs/models/gpt-6-luna)
- [OpenAI Docs — Sol 6.1](https://developers.openai.com/api/docs/models/gpt-6.1-sol)
- [OpenAI Docs — prompt caching](https://developers.openai.com/api/docs/guides/prompt-caching)
