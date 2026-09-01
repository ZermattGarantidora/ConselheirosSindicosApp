# ADR 0002 — Isolamento por condomínio em defesa em profundidade

**Status:** aceito  
**Data:** 2026-08-31

## Contexto

Um síndico pode administrar vários condomínios, e cada condomínio contém documentos potencialmente pessoais, financeiros, contratuais e jurídicos. Misturar dados é um risco crítico de produto, segurança e confiança.

Filtros aplicados somente na interface ou no prompt não são suficientes. Busca vetorial, cache, storage, jobs e logs também podem produzir vazamento.

## Decisão

Tratar `condominium_id` como fronteira obrigatória de tenant em todas as entidades e artefatos derivados. Aplicar defesa em profundidade:

1. autenticar o usuário;
2. resolver a associação vigente no servidor;
3. criar um contexto autorizado imutável;
4. aplicar política de escopo no repositório/caso de uso;
5. reforçar no banco com políticas de linha ou mecanismo equivalente;
6. separar caminhos/chaves no storage;
7. incluir e validar tenant em mensagens e jobs;
8. filtrar o índice antes de ranking;
9. segmentar caches por tenant, permissão e versão;
10. minimizar logs e manter tenant apenas como identificador seguro de correlação.

Um identificador enviado pelo cliente nunca substitui a autorização resolvida pelo servidor.

## Regras de modelagem

- tabelas de domínio carregam `condominium_id` não nulo;
- relações compostas devem impedir associação entre registros de tenants diferentes;
- entidades derivadas repetem o tenant em vez de inferi-lo apenas por joins profundos;
- tabelas globais são raras, documentadas e não contêm dados do cliente;
- exclusão, exportação e retenção devem conseguir enumerar todos os artefatos do condomínio.

## Verificação

- testes negativos em cada interface de dados;
- dois tenants sintéticos com frases-canário exclusivas;
- testes de cache, jobs, storage e índice, não apenas SQL;
- revogação concorrente durante sessão;
- tentativa de IDOR com identificadores conhecidos;
- inspeção de prompt e telemetria para confirmar ausência cruzada;
- gate P0 com tolerância zero.

## Consequências positivas

- falha em uma camada não implica automaticamente vazamento;
- consultas e auditorias tornam a fronteira explícita;
- simplifica direitos de exportação e exclusão por condomínio;
- testes conseguem usar canários determinísticos.

## Consequências negativas

- schemas, índices e chaves ficam mais verbosos;
- contexto de tenant deve atravessar todas as chamadas;
- jobs e scripts administrativos exigem cuidado adicional;
- políticas do banco aumentam a complexidade de testes e migrations.

## Alternativas rejeitadas

### Um único filtro na camada de aplicação

Insuficiente diante de bugs, queries administrativas, caches e novos caminhos de acesso.

### Um banco separado por condomínio desde o MVP

Oferece uma fronteira física mais forte, mas aumenta provisionamento, migrations, conexões, custo e operação antes da validação. Pode ser necessário para segmentos futuros.

### Isolamento somente por organização profissional

Rejeitado: uma carteira pode administrar vários condomínios, mas isso não autoriza mistura entre eles.

## Critérios para revisitar

- exigência contratual de banco ou chave por cliente;
- segmento corporativo com isolamento físico;
- limitação comprovada do mecanismo de política escolhido;
- mudança da unidade jurídica de tenancy.
