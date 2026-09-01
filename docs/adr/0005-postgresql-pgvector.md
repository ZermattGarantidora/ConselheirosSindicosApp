# ADR 0005 — PostgreSQL com RLS e busca híbrida no mesmo banco

**Status:** aceito  
**Data:** 2026-08-31

## Contexto

A primeira fatia precisa persistir identidade, associações, documentos, versões, páginas, trechos, perguntas, respostas, citações, feedback, custo e auditoria. O dado transacional, o texto pesquisável e os embeddings devem preservar a mesma fronteira de condomínio e a mesma proveniência.

Separar o índice vetorial da base relacional antes do piloto criaria duas superfícies de autorização, sincronização, exclusão e recuperação de desastre. SQLite, por sua vez, não exercita as políticas de linha que protegem o invariante mais crítico do produto.

## Decisão

Usar PostgreSQL como fonte transacional e a extensão `pgvector` para as representações semânticas. A versão exata do servidor e da extensão será fixada junto do ambiente de execução; nenhuma dependência hospedada é escolhida por este ADR.

O desenho inicial segue estas regras:

1. tabelas de tenant usam chave primária composta por `condominium_id` e `id`;
2. referências entre entidades de tenant usam chaves estrangeiras compostas, impedindo vínculos cruzados;
3. todas as tabelas de tenant habilitam e forçam Row-Level Security com negação por padrão;
4. papéis de runtime não são proprietários das tabelas nem possuem `BYPASSRLS`;
5. a política do runtime de usuário exige o condomínio ativo e uma associação vigente;
6. cada transação de runtime fixa `app.user_id` e `app.condominium_id`; sem condomínio selecionado, o RLS não retorna dados de tenant;
7. o worker usa papel separado, escopo transacional de um único condomínio e privilégios limitados às tabelas necessárias;
8. arquivos originais permanecem em storage privado; o banco guarda identidade, metadados, procedência e chave opaca do objeto;
9. texto integral de páginas e chunks pode ficar no PostgreSQL para busca, citação e consistência, sujeito à política de retenção;
10. a busca inicial combina full-text search e distância vetorial exata somente depois do filtro autorizado;
11. não haverá índice HNSW ou IVFFlat compartilhado no MVP; um índice aproximado só entra após medição e desenho que preserve isolamento e recall por tenant;
12. `processing_jobs` é a fonte transacional do trabalho assíncrono inicial; uma fila externa continua opcional e exigirá outro ADR;
13. migrations e testes P0 usam PostgreSQL real. SQLite não é substituto para testes de políticas, constraints ou retrieval.

O modelo físico detalhado está em `docs/architecture/database-schema.md`.

## Razões

- PostgreSQL oferece transações, constraints compostas, full-text search e Row-Level Security na mesma unidade de consistência.
- RLS habilitado sem política aplicável nega acesso por padrão. `FORCE ROW LEVEL SECURITY` também sujeita o proprietário da tabela, embora os papéis de runtime não devam ser proprietários.
- `pgvector` permite busca exata e híbrida no PostgreSQL. O modo exato é adequado ao corpus pequeno do piloto e não troca recall por velocidade.
- A própria documentação do `pgvector` alerta que filtros em índices aproximados são aplicados depois da varredura e que um índice aproximado compartilhado entre tenants pode afetar recall e desempenho.
- Manter texto e vetores junto dos metadados reduz custo operacional e facilita exportação, exclusão, auditoria e testes de canário.

## Consequências positivas

- uma única transação pode preservar pergunta, evidências, resposta, citações e telemetria;
- o banco impede relações cruzadas mesmo se uma query de aplicação omitir um join;
- busca, versionamento e auditoria compartilham a mesma proveniência;
- menos serviços precisam ser operados antes da validação do produto;
- testes exercitam a mesma classe de mecanismo de isolamento usada em produção.

## Consequências negativas

- desenvolvimento local e CI precisam disponibilizar PostgreSQL e `pgvector` sem depender de SQLite;
- chaves e índices ficam mais verbosos por começarem com `condominium_id`;
- o worker exige papel e políticas próprias;
- busca vetorial exata deixará de ser suficiente em algum volume, exigindo medição e evolução;
- texto extraído aumenta o volume e a sensibilidade dos backups do banco.

## Alternativas consideradas

### PostgreSQL mais banco vetorial separado

Adiada. Aumenta sincronização, autorização, purge, custo e observabilidade antes de existir escala que justifique a separação.

### SQLite no desenvolvimento e PostgreSQL em produção

Rejeitada para os gates de integração. Não valida RLS, `pgvector`, concorrência de jobs nem as mesmas constraints do ambiente final.

### Banco separado por condomínio

Rejeitado para o MVP conforme o ADR 0002. O custo de provisionamento, migrations e conexões é desproporcional ao piloto.

### Índice HNSW compartilhado desde o início

Adiado. Filtros pós-varredura podem reduzir o número de resultados por tenant e conflitam com o requisito de filtrar antes do ranking.

## Critérios para revisitar

- busca híbrida exata ultrapassar o limite P95 definido para o piloto;
- volume de chunks tornar custo, vacuum, backup ou restore inadequados;
- exigência contratual de banco, schema, partição ou chave criptográfica por cliente;
- evidência de que uma fila externa reduz falhas ou custo operacional;
- necessidade de suportar múltiplos perfis de embedding com dimensões incompatíveis em grande escala;
- um serviço especializado demonstrar ganho mensurável sem reduzir isolamento, auditabilidade ou capacidade de purge.

## Referências técnicas

- [PostgreSQL — Row Security Policies](https://www.postgresql.org/docs/current/ddl-rowsecurity.html)
- [PostgreSQL — CREATE POLICY](https://www.postgresql.org/docs/current/sql-createpolicy.html)
- [pgvector — indexação, filtros, multitenancy e busca híbrida](https://github.com/pgvector/pgvector)
