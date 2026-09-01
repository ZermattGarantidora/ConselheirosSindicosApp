# ADR 0003 — Evidência primeiro e gateway independente de provedor

**Status:** aceito  
**Data:** 2026-08-31

## Contexto

O MVP depende de OCR, extração, embeddings/busca, classificação e geração. Modelos variam em custo, qualidade, latência, privacidade e disponibilidade. Enviar documentos inteiros ou usar sempre o modelo mais capaz prejudica o objetivo de preço acessível.

A maior promessa do produto é responder com base verificável. Uma resposta fluente sem evidência é uma falha, não uma degradação aceitável.

## Decisão

Usar um gateway interno independente de provedor e um pipeline evidence-first:

1. resolver permissões e escopo;
2. recuperar somente trechos relevantes;
3. avaliar suficiência, conflito e risco;
4. escolher a classe de modelo mais barata que atinja o piso medido;
5. exigir saída estruturada;
6. validar citações e regras depois da geração;
7. registrar versões, custo e latência;
8. abster-se ou escalar quando o piso não puder ser cumprido.

O modelo recebe apenas evidências autorizadas e identificadas. Conteúdo de documentos é delimitado como dado não confiável.

## Classes iniciais de tarefa

- determinística: datas, estados, filtros e validação de schemas;
- econômica: classificação, etiquetas e perguntas diretas bem suportadas;
- intermediária: cruzamento de fontes, conflitos e interpretação moderada;
- avançada: situações raras de alta complexidade, sempre com validação humana quando houver alto risco.

Roteamento é decisão de produto medida por evals, não uma lista fixa de fornecedores.

## Contrato do gateway

Entrada mínima:

- tipo de tarefa e versão do prompt;
- classe de risco;
- budget de custo/tokens/tempo;
- schema esperado;
- evidências autorizadas com IDs;
- política de dados aplicável.

Saída mínima:

- resultado estruturado;
- modelo/provedor e versão efetivos;
- consumo, cache, latência e custo estimado;
- motivo de roteamento/fallback;
- erros normalizados.

## Evals e mudanças

- estabelecer baseline antes de alterar prompt, modelo ou retrieval;
- executar os casos contra o caminho da aplicação;
- bloquear qualquer regressão P0;
- manter prompts versionados e revisáveis;
- adicionar casos a partir de bugs e feedback sanitizado;
- comparar custo por resposta aprovada, não apenas preço por token;
- exigir decisão registrada para mudança relevante de provedor ou política de dados.

## Cache

Resultados de OCR, texto normalizado e embeddings podem ser reutilizados por identidade imutável de conteúdo. Respostas e retrieval só podem usar cache com chave que inclua tenant, permissões relevantes, versões documentais, pipeline e prompt.

## Consequências positivas

- reduz dependência comercial;
- permite controlar custo por tarefa;
- facilita comparação de modelos com o mesmo contrato;
- torna abstenção e validação parte do produto;
- limita a quantidade de dados enviada a terceiros.

## Consequências negativas

- exige contratos e adaptadores internos;
- resultados variam entre provedores e demandam normalização;
- roteamento, fallback e cache aumentam o espaço de testes;
- avaliação contínua se torna uma responsabilidade permanente.

## Alternativas rejeitadas

### Um único modelo premium para tudo

Simplifica a implementação, mas aumenta custo e dependência sem garantir grounding.

### Modelo econômico fixo para tudo

Pode falhar no piso de qualidade e gerar custo indireto por repetição, correção e perda de confiança.

### Enviar todos os documentos a cada pergunta

Rejeitado por custo, latência, privacidade, limites de contexto e maior superfície de prompt injection.

## Critérios para revisitar

- evals demonstrarem que um pipeline mais simples mantém qualidade;
- mudanças contratuais ou regulatórias de provedores;
- custo operacional do roteamento superar a economia medida;
- novos casos de uso exigirem ferramentas ou modelos especializados.
