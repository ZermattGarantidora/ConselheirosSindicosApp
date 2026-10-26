# Spec 040 — Migração operacional para Supabase

**Status:** preparada; validação externa e corte do Neon pendentes  
**Responsável:** produto e engenharia  
**Atualizado em:** 2026-10-26

## 0. Alinhamento com a visão do projeto

### Partes do briefing atendidas

| Dimensão da visão | Seções do briefing | Como esta spec contribui |
| -------------------------- | ------------------ | ------------------------------------------------------------------------------------------- |
| Problema e hipótese        | §§2 e 4            | Preserva o núcleo documental necessário para respostas úteis e fundamentadas.               |
| Proposta de valor          | §5                 | Mantém documentos, versões e evidências consultáveis sem mudar a experiência.               |
| Prioridades do MVP         | §§6–8              | Mantém chat e vetorização documental; não cria funcionalidade antes dos blocos autorizados. |
| Segurança e confiança      | §§8–10             | Mantém RLS, `condominium_id`, origem e isolamento de embeddings no mesmo PostgreSQL.        |
| Estratégia técnica e custo | §12                | Usa PostgreSQL com RLS/pgvector e deixa provedores substituíveis.                           |
| Validação e métricas       | §§13–14            | Preserva testes de isolamento e impede que fixtures contaminem ambiente persistente.        |

### Limites respeitados

- Não adota Supabase Auth, Storage, Edge Functions ou um banco vetorial separado.
- Não envia dados reais, documentos reais ou credenciais ao repositório.
- Não altera interface, prompts, regras de recuperação ou contratos de evidência.

### Divergências da visão

Nenhuma. A troca de plataforma preserva PostgreSQL com RLS/pgvector previsto no §12.

### Checklist de alinhamento

- [x] O briefing completo foi lido na versão atual.
- [x] A spec resolve uma necessidade operacional compatível com a memória documental descrita no §8.
- [x] O público e a proposta de valor permanecem coerentes.
- [x] Prioridades e itens fora do escopo foram respeitados.
- [x] Princípios de segurança, custo e confirmação humana foram preservados.
- [x] Critérios de sucesso contribuem para isolamento e respostas fundamentadas.
- [x] Não existe divergência silenciosa.

## 1. Objetivo

Preparar a migração para Supabase e só remover Neon depois que migrations e integração RLS passarem contra um projeto Supabase sintético, dedicado e protegido.

## 2. Promessa testada

> O banco Supabase com PostgreSQL e pgvector mantém o isolamento documental verificável, sem permitir que testes sintéticos atinjam dados a preservar.

## 3. Usuário primário

Equipe de engenharia que opera a memória documental da Alvitra para síndicos dos segmentos do §3.

## 4. Escopo

- guardas de URL, TLS, confirmação explícita e marcador persistente para Supabase;
- comando de migrations e suíte de integração protegidos;
- workflow manual no GitHub Actions que recebe somente o segredo do projeto sintético e exige a
  confirmação `synthetic-only` antes de executar migrations e a suíte RLS;
- documentação e exemplos de ambiente sem referências operacionais ao Neon;
- manutenção de PostgreSQL, RLS e pgvector no mesmo banco.

## 5. Fora do escopo

- provisionar projetos Supabase, copiar dados ou usar dados reais;
- migrar autenticação, arquivos ou frontend para APIs do Supabase;
- trocar provedor de embeddings ou introduzir vetor DB externo.

## 6. Pré-condições

Existe um projeto Supabase vazio e exclusivo para fixtures sintéticas, com `pgvector` disponível e uma credencial administrativa mantida fora do repositório.

## 7. Requisitos funcionais

### RQ-4001 — Destino de integração protegido

Migrations e testes aceitam somente URL PostgreSQL Supabase com TLS, confirmação `synthetic-only` e marcador persistente. Qualquer falha interrompe antes de alterar schema ou executar fixtures.

### RQ-4002 — Isolamento e vetorização preservados

O projeto sintético mantém `app_runtime` sem login e sem `BYPASSRLS`, RLS por `condominium_id`, `pgvector` e os perfis de embedding existentes.

### RQ-4003 — Sem dependência operacional de Neon

Após a validação Supabase, nenhum comando, variável, script, exemplo de configuração ou guia operacional ativo exige Neon. Até então, o caminho Neon permanece funcional como contingência.

## 8. Contratos

- `SUPABASE_INTEGRATION_DATABASE_URL`: URL PostgreSQL de endpoint Supabase com `sslmode=require` ou `verify-full`.
- `SUPABASE_INTEGRATION_CONFIRMATION`: valor literal `synthetic-only`.
- `pnpm run db:migrate:supabase`: valida os dois valores e o marcador antes de aplicar migrations.
- O workflow `.github/workflows/supabase-integration.yml` é manual; recebe a URL somente pelo
  segredo `SUPABASE_INTEGRATION_DATABASE_URL` e não é executado em pushes ou pull requests.

## 9. Requisitos não funcionais

- Nenhuma credencial é versionada ou enviada ao navegador.
- Testes executam `TRUNCATE` somente no projeto marcado e dedicado.
- Falha de rede, URL incompatível ou papel inseguro falha fechada.

## 10. Critérios de sucesso

- testes unitários cobrem aceitação e rejeição de destino Supabase;
- migrations e integração passam em projeto Supabase sintético provisionado;
- testes comprovam ausência de leitura cruzada entre dois condomínios e perfis vetoriais.

## 11. Questões em aberto

- Definir projeto, região, proprietário e política de custo do Supabase antes de conectar a credencial externa; isso não autoriza dados reais.
