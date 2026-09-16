# ADR 0010 — Gateway Gemini para testes locais

- **Status:** Aceito
- **Data:** 2026-09-14

## Contexto

O MVP precisa validar a redação com IA sobre evidências recuperadas, preservando a capacidade de trocar provedores. Para testes locais, o usuário autorizou a configuração da Gemini API por chave própria.

## Decisão

Implementar um adaptador Gemini atrás de `AnswerGateway`, usando a API Interactions REST com `store: false`, chave lida exclusivamente de `GEMINI_API_KEY`, modelo configurável por `GEMINI_MODEL` e JSON estruturado. O adaptador é selecionado somente quando a chave existe; sem ela, o gateway sintético local é mantido.

O adaptador só recebe a pergunta e evidências já autorizadas. Ele não habilita busca web, ferramentas, memória remota ou ações externas. A saída continua submetida ao validador local de citações, conflito e risco.

## Consequências

- A chave não é exposta ao cliente e não é versionada.
- O ambiente local continua executável sem dependência externa.
- Uso da faixa gratuita é limitado a corpus sintético; documentos reais exigem análise contratual e configuração apropriada do provedor.
- O custo informado pelo provedor é registrado de forma minimizada quando disponível.
