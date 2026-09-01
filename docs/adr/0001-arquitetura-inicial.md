# ADR 0001 — Monólito modular com worker assíncrono

**Status:** aceito  
**Data:** 2026-08-31

## Contexto

O MVP precisa entregar autenticação, isolamento, documentos, OCR, retrieval, respostas, feedback e auditoria. A equipe ainda precisa validar a utilidade e a disposição de pagamento; complexidade operacional precoce aumenta custo e reduz velocidade de aprendizado.

Processamento de documentos é mais demorado e sujeito a retry que as operações interativas. Ele não deve bloquear a requisição web.

## Decisão

Construir uma aplicação como monólito modular, com limites claros de domínio e uma unidade principal de implantação. Executar processamento de documentos em worker assíncrono que compartilha contratos e, preferencialmente, a mesma base de código.

Módulos iniciais:

- identity/membership;
- condominiums;
- documents/processing;
- retrieval;
- answers;
- feedback/audit;
- AI gateway.

O banco relacional é a fonte transacional. Arquivos ficam em storage privado. Fila e índice de busca podem ser serviços separados, mas não criam serviços de domínio independentes no MVP.

## Consequências positivas

- menos implantações, contratos distribuídos e falhas operacionais;
- transações e consistência mais simples;
- refatoração rápida enquanto o domínio ainda está sendo descoberto;
- testes locais e e2e mais acessíveis;
- worker atende tarefas demoradas sem introduzir microserviços prematuros.

## Consequências negativas

- disciplina é necessária para impedir acoplamento entre módulos;
- componentes não escalam de forma completamente independente;
- uma falha de configuração pode afetar uma superfície maior;
- eventual extração de serviços exigirá contratos estáveis.

## Alternativas consideradas

### Microserviços desde o início

Rejeitada para o MVP por custo operacional, consistência distribuída e excesso de fronteiras ainda não validadas.

### Funções independentes por funcionalidade

Pode funcionar para jobs pontuais, mas aumenta dispersão de configuração, observabilidade e políticas de tenant. Pode ser adotada como detalhe de implantação depois.

### Uma aplicação totalmente síncrona

Rejeitada porque OCR, parsing, embeddings e retries não pertencem ao ciclo de uma requisição interativa.

## Critérios para revisitar

- um módulo precisa escalar ou implantar independentemente de forma sustentada;
- requisitos de isolamento exigem uma fronteira física adicional;
- a fila de processamento compromete a aplicação interativa;
- equipes independentes passam a possuir domínios estáveis;
- medição demonstra gargalo que não pode ser resolvido dentro do monólito.
