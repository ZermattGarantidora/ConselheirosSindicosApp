# ADR 0009 — OCR com OpenAI para corpus sintético

**Status:** aceito para desenvolvimento sintético
**Data:** 2026-09-03

## Contexto

PDFs digitalizados não contêm texto utilizável pelo PDF.js e exigem OCR. O usuário autorizou usar a OpenAI para OCR, inicialmente somente com corpus sintético. A decisão revoga parcialmente a proibição de provedor externo do ADR 0006, sem autorizar piloto ou dados reais.

## Decisão

Usar a API Responses da OpenAI, por meio de um adaptador `OcrAdapter`, para transcrever PDF escaneado quando a extração local não retornar texto utilizável.

- o worker envia exclusivamente o PDF validado do job escopado ao condomínio; nunca URL de storage, cache ou documento de outro job;
- o adaptador usa `store: false`, não utiliza file search, vetores ou ferramentas externas e não registra conteúdo, chave ou resposta em logs;
- a saída é JSON estruturado por página, com índice, texto e sinal de qualidade; saída incompleta, inválida ou erro remoto resulta em `needs_review`, nunca em `ready`;
- o modelo inicial é `gpt-5.6-luna`, escolhido para o benchmark sintético por suportar entrada de imagem e ter o menor preço publicado entre os modelos atuais com esse recurso; o nome fica configurável e não representa escolha definitiva para piloto;
- `OPENAI_OCR_API_KEY` fica exclusivamente no ambiente local ignorado pelo Git; ausência da chave desabilita o adaptador sem tentativa de rede;
- nenhum documento real, dado pessoal, piloto ou produção é autorizado por esta decisão.

## Alinhamento com a visão do projeto

O briefing §§7, 9, 11, 12, 14 e 15 autoriza processamento de PDFs digitalizados, exige controle por condomínio, qualidade de OCR, confirmação humana e escolha por custo total, privacidade e segurança. A Spec 001 RQ-002, RQ-009 e RQ-013 exige OCR, tratamento de conteúdo como dado não confiável e falha segura. A diretriz competitiva §§5.1, 5.3, 5.5 e 5.6 exige qualidade explícita, isolamento demonstrável e custo mensurado.

A decisão continua dentro da fase atual porque implementa somente o adaptador de OCR previsto na T304; não adiciona chat, automação externa, retrieval de terceiros nem funcionalidade posterior.

## Avaliação e limites

Antes de liberar `ready` automaticamente para OCR da OpenAI, executar corpus sintético representativo e estabelecer baseline de transcrição por página, qualidade em português, latência e custo. Enquanto esse baseline não existir, o sinal de qualidade fornecido pelo modelo continua sujeito à política de revisão e não substitui a conferência do original.

Antes de qualquer dado real, cumprir o gate já definido em `docs/security/data-handling-inicial.md`: política específica de retenção, exclusão, backups, base legal, avaliação de fornecedor, resposta a incidente e teste de purge/revogação.

## Consequências

- Introduz custo variável, dependência externa e uma nova fronteira de dados, limitada a documentos sintéticos nesta etapa.
- Preserva portabilidade porque o restante do pipeline depende somente de `OcrAdapter`.
- Exige telemetria futura de modelo, custo, latência e falhas antes de uso em piloto.

## Referências

- [OpenAI Responses API — entrada de arquivos e saída estruturada](https://developers.openai.com/api/reference/typescript/resources/beta/subresources/responses/methods/create)
- [OpenAI — modelos com entrada de imagem e preços](https://developers.openai.com/api/docs/models/compare)
