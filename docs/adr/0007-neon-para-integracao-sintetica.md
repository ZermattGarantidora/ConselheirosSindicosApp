# ADR 0007 — Neon temporário para integração sintética

**Status:** aceito  
**Data:** 2026-09-01

## Contexto

O ambiente local com Docker exige uma instalação que ainda não está disponível na máquina de desenvolvimento. A Spec 001 e o ADR 0005 exigem PostgreSQL real para provar RLS; SQLite não é alternativa válida. O usuário autorizou explicitamente usar Neon enquanto o ambiente local não estiver pronto.

## Decisão

Usar um projeto Neon dedicado, sem dados reais, somente para executar migrations e testes de integração de PostgreSQL/RLS.

- a conexão será fornecida exclusivamente pela variável `NEON_INTEGRATION_DATABASE_URL` e nunca será versionada;
- o projeto/branch será identificado como integração sintética e não poderá compartilhar dados com qualquer ambiente de piloto ou produção;
- a migration cria a extensão `vector` e o papel sem login `app_runtime`, sem `BYPASSRLS`;
- os testes exigem a confirmação explícita `NEON_INTEGRATION_CONFIRMATION=synthetic-only`, recusam qualquer host que não termine em `.neon.tech` e continuam usando somente fixtures sintéticas;
- Docker local continua como alternativa futura, mas deixa de bloquear a validação atual.

## Consequências

- a equipe valida RLS no mecanismo real sem instalar Docker nesta etapa;
- há uma dependência externa temporária, documentada e limitada ao banco de integração;
- nenhum dado de cliente, documento real, piloto, provedor de IA, storage remoto ou autenticação real é autorizado por esta decisão;
- credenciais precisam permanecer fora do repositório e ser revogadas se expostas.

## Alinhamento e gate de decisão

- O briefing §§1, 4, 12, 14 e 15 exige isolamento por condomínio, baixo custo, evidências verificáveis e arquitetura portável.
- A diretriz competitiva §§3, 5.5 e 6 exige isolamento demonstrável e testes reproduzíveis; esta decisão só viabiliza o teste P0 de persistência e não antecipa funcionalidade de produto.
- A hipótese validada é a segurança do núcleo documental, medida pelos cenários AC-001 a AC-003 e RQ-001 da Spec 001.
- A decisão não muda público, posicionamento, escopo nem proposta de valor; o benefício operacional compensa a dependência por ser limitado, reversível e sem dados reais.

## Critérios para revisitar

- Docker local estiver funcionando e oferecer a opção mais simples para desenvolvimento;
- houver piloto autorizado, que exigirá uma decisão separada de ambiente, retenção, região, backup e tratamento de dados;
- a política de dados ou os requisitos de segurança exigirem outra região, provedor ou isolamento físico.
