# ADR 0015 — Transporte Gemini por `generateContent`

**Status:** aceito para a fatia local controlada  
**Data:** 2026-09-23

## Contexto

A ADR 0010 definiu a Gemini atrás de `AnswerGateway` e escolheu inicialmente a API Interactions REST. Na verificação real de 23 de setembro de 2026, o modelo configurado apareceu como disponível, mas a chamada Interactions não respondeu dentro do limite de 60 segundos. O mesmo modelo respondeu com sucesso pelo método `generateContent` declarado em sua lista de métodos suportados.

O transporte precisa funcionar sem mudar os limites de produto: somente pergunta e evidências autorizadas, nenhuma ferramenta, busca web, memória remota ou ação externa, e validação local obrigatória.

## Decisão

Substituir somente o detalhe de transporte da ADR 0010 pelo endpoint REST `models/{model}:generateContent`:

- a pergunta e as evidências continuam dentro do prompt delimitado;
- respostas documentais solicitam JSON estruturado por `responseMimeType` e `responseJsonSchema`;
- orientações sem evidência usam texto e são envolvidas localmente como `answerMode: abstained`, sem citações;
- não são enviados histórico de conversa, ferramentas, cache explícito ou configuração de memória;
- a chave permanece apenas no backend;
- a saída continua sujeita aos validadores locais de contrato, citações, risco e isolamento.

O transporte usa até três tentativas totais para falhas transitórias de rede, timeout,
resposta vazia ou inválida, HTTP 408, 429 e 5xx. As tentativas compartilham um único
orçamento de tempo e usam espera exponencial curta, limitada pelo cabeçalho
`Retry-After` quando ele for válido. Falhas 400, 401 e 403 não são repetidas. Depois
de esgotar as tentativas, o contrato existente pode acionar o fallback documental
local, sem esconder que a resposta foi produzida nesse modo.

As escolhas de provedor, modelo padrão, fallback local e telemetria mínima da ADR 0010 permanecem válidas.

## Consequências

### Positivas

- O gateway usa um método explicitamente suportado pelo modelo configurado.
- A resposta estruturada e a reconstrução local das citações são preservadas.
- O endpoint público da aplicação e o contrato `AnswerGateway` não mudam.

### Negativas e riscos aceitos

- A aplicação continua dependente da disponibilidade e do contrato da API Gemini.
- Alterações futuras no esquema REST exigirão novo teste de contrato.
- O provedor processa o conteúdo enviado conforme seus termos; documentos reais continuam fora do teste gratuito até análise contratual apropriada.

## Alternativas consideradas

### Manter Interactions e aumentar o timeout

Rejeitada: o problema ocorreu mesmo com 60 segundos, enquanto `generateContent` respondeu com o mesmo modelo. Aumentar a espera não corrige a incompatibilidade observada.

### Trocar o modelo

Rejeitada: o modelo configurado está disponível e suporta `generateContent`; não há evidência de que uma troca de modelo seja necessária.

### Usar SDK do provedor

Adiada: o `fetch` nativo mantém a integração pequena e o contrato atual já cobre timeout, erros e telemetria.

## Critérios para revisitar

- indisponibilidade recorrente do `generateContent`;
- necessidade de streaming, cache ou lote;
- mudança de política de dados para documentos reais;
- evidência de qualidade ou custo que justifique outro modelo ou provedor.
