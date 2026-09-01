# ADR 0006 — Stack local e serviços externos adiados

**Status:** aceito  
**Data:** 2026-09-01

## Contexto

A Spec 001 precisa começar pela fatia de identidade e isolamento, mas o produto ainda não possui corpus avaliado, contrato com provedor de IA, ambiente de nuvem ou política de retenção para dados de clientes. Escolher serviços externos agora aumentaria custo e superfície de dados sem provar a hipótese central do produto.

## Decisão

Para desenvolvimento local e testes sintéticos, adotar:

- API HTTP em TypeScript/Node com Fastify;
- cliente web em React/Vite, inicialmente aproveitando o fluxo de onboarding e chat do protótipo estático;
- PostgreSQL com RLS e `pgvector`, conforme ADR 0005, acessado por SQL e migrations versionadas para manter as políticas e constraints auditáveis;
- filesystem privado como adaptador de storage local; toda chamada usa uma interface de storage escopada por condomínio;
- tabela transacional `processing_jobs` e worker Node como fila inicial, com locks e retry no PostgreSQL; não será introduzida fila externa nesta fase;
- Vitest para testes determinísticos e um adapter de eval que chamará o mesmo caso de uso da aplicação usando exclusivamente o corpus sintético versionado.

Autenticação local usará um adapter determinístico exclusivo de desenvolvimento e testes. Um provedor de identidade para usuários reais, storage remoto, OCR externo, embeddings e modelos de IA ficam fora desta decisão. Eles exigem ADR próprio, avaliação de privacidade/custo/qualidade e, quando aplicável, contrato de tratamento de dados antes de qualquer piloto.

## Consequências

- A primeira fatia pode validar autorização e isolamento sem credenciais, dados reais ou dependências de SaaS.
- A aplicação preserva um único ecossistema de linguagem, mas API e cliente continuam módulos separados e testáveis.
- O schema e as migrations precisam ser executados em PostgreSQL desde os testes de integração; SQLite não é substituto para RLS.
- A troca futura de filesystem por storage privado remoto, ou de fila no banco por serviço dedicado, ocorre atrás de contratos e requer nova decisão registrada.
- Nenhum piloto, upload de documento real ou chamada a provedor externo é autorizado por este ADR.

## Critérios para revisitar

- primeiro piloto autorizado com política de dados e retenção aprovada;
- benchmarks mostrarem que a fila no banco não atende latência, volume ou recuperação de falhas;
- o protótipo revelar necessidade de outro framework de interface;
- evals comparativos indicarem um provedor de OCR, embeddings ou IA que atinja o piso de qualidade e privacidade.
