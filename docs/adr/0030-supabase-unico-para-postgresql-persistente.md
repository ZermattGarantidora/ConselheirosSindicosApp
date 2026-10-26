# ADR 0030 — Supabase como plataforma PostgreSQL persistente

**Status:** proposto; depende de provisionamento e validação externa  
**Data:** 2026-10-26

## Contexto

O produto já usa PostgreSQL, RLS e `pgvector` no mesmo banco para preservar o vínculo entre documentos, embeddings, evidências e `condominium_id`. O usuário quer substituir Neon por Supabase, mas Neon permanece como contingência até o projeto Supabase ser provisionado e validado.

## Decisão

- Após validação, Supabase será a única plataforma PostgreSQL gerenciada autorizada para ambientes persistentes do produto e para integração sintética.
- O banco vetorial continua sendo a extensão `pgvector` no PostgreSQL do Supabase; não haverá serviço vetorial separado nesta decisão.
- A aplicação continua acessando o runtime por `DATABASE_URL`; credenciais não chegam ao navegador.
- Integração usa projeto Supabase vazio, dedicado e distinto de desenvolvimento persistente, staging e produção. Ela recebe somente `SUPABASE_INTEGRATION_DATABASE_URL`, TLS obrigatório, confirmação literal `synthetic-only` e o marcador persistente em `infrastructure/supabase/001-integration-guard.sql`.
- `pnpm run db:migrate:supabase` e a suíte de integração recusam destino sem essas guardas. A suíte executa `TRUNCATE`, portanto nunca pode apontar para um banco que preserve dados.
- RLS, o papel sem login `app_runtime`, filtros explícitos de `condominium_id` e perfis de embedding permanecem obrigatórios. Supabase Auth e Storage não são adotados por esta decisão.

## Consequências

- A remoção de Neon de código, configurações, documentação operacional e pipeline de testes só ocorre após os critérios de sucesso desta decisão.
- Mantém migrations SQL e adaptadores PostgreSQL portáveis; não altera citações, recuperação, documentos, provedores de IA ou experiência do chat.
- Antes de qualquer dado real, continuam obrigatórios os gates de região, LGPD, backup, restauração, retenção, exclusão e revisão de segurança do ADR 0012 e da Spec 011.

## Alinhamento e gate de decisão

- O briefing §§8–10 e §12 exige memória vetorial isolada, evidências verificáveis, RLS e custo controlado. Manter transações e vetores no mesmo PostgreSQL reduz fronteiras de isolamento.
- A estratégia competitiva §§3–4 exige controles de isolamento reproduzíveis; a troca preserva os testes de RLS e não adiciona funcionalidade visível nem antecipa blocos do produto.
- A decisão é reversível no nível de aplicação porque `DATABASE_URL`, migrations e SQL permanecem portáveis. Neon continua disponível como contingência durante a transição.

## Critérios para revisitar

- `pgvector` no Supabase deixar de atender aos requisitos de dimensão, recall, custo ou isolamento;
- uma avaliação aprovada demonstrar que um banco vetorial separado melhora materialmente a segurança ou a utilidade sem quebrar proveniência e autorização;
- antes de ativar Supabase Auth, Storage ou qualquer dado real.
