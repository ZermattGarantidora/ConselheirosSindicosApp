# Roadmap diário por blocos

**Status:** referência operacional do projeto  
**Atualizado em:** 2026-09-02

Este documento define a nomenclatura usada para acompanhar o trabalho diário. Os blocos organizam entregas por dependência e importância; não representam versões do produto nem substituem as tarefas da Spec 001.

## Regra de execução

- A meta normal é concluir um bloco principal por dia.
- Blocos grandes devem ser divididos em subblocos, sem pular testes, segurança ou documentação.
- Um bloco só é concluído quando seu código, testes, documentação e gates aplicáveis estiverem coerentes.
- A sequência padrão é B1 → B2 → B3 → B4 → B5 → B6 → B7.

## Blocos

### B1 — Neon e isolamento RLS ✅

Concluído em 2026-09-02.

- Banco Neon exclusivo de integração sintética.
- Marcador persistente, TLS e confirmação `synthetic-only`.
- Validação de segurança do papel `app_runtime`.
- Isolamento por `app.user_id` e `app.condominium_id`.
- 4/4 cenários reais de RLS aprovados.
- T203 concluída.

### B2 — Fechamento da entrega atual ✅

Concluído em 2026-09-02.

- `pnpm run check` e `pnpm run test:e2e` aprovados após as últimas alterações.
- PATH do `pnpm` corrigido no hook Git e validado pelo próprio Git.
- Diff completo revisado sem achados P0/P1.
- Registro de code review criado e gate `verify:merge` aprovado.
- Alterações documentais pendentes commitadas.

### B3 — Documentos 🔴

- Modelar documentos, versões, páginas, chunks e jobs.
- Implementar upload privado com validação e hash.
- Extrair texto de PDF preservando páginas.
- Criar adaptador de OCR e indicador de qualidade.
- Implementar vigência e estados de processamento.
- Automatizar AC-004 a AC-007.

### B4 — Retrieval 🔴

- Definir contrato de evidência e estratégia de chunking.
- Implementar indexação textual e semântica.
- Filtrar por condomínio antes do ranking.
- Avaliar suficiência, conflito e relevância.
- Implementar cache por condomínio, permissão e versão.
- Testar isolamento em todas as interfaces.

### B5 — Chat fundamentado 🔴

- Criar o endpoint real do chat.
- Fixar o contexto autorizado antes de cada consulta.
- Gerar respostas com citações verificáveis.
- Implementar abstenção, conflito e falha segura.
- Implementar risco e escalonamento para especialista.
- Conectar a interface web ao backend.

### B6 — Feedback, auditoria e evals 🔴

- Implementar feedback imutável.
- Criar auditoria e telemetria mínima.
- Executar o corpus sintético e os evals.
- Medir correção, citações, abstenção, custo e latência.
- Criar regressões automatizadas.

### B7 — Preparação e execução do piloto 🔴

- Testar upload malicioso e prompt injection.
- Validar exportação, exclusão, retenção e revogação.
- Preparar procedimento de incidentes e rollback.
- Ampliar o corpus com documentos anonimizados.
- Executar checklist de release.

### B8 — Itens adiados ⏸️

- GitHub, CI remoto e proteção remota de branch.
- Provedor real de IA.
- Dados reais de clientes.
- Piloto em produção antes dos gates de segurança e qualidade.
- Ações externas automatizadas.

## Versão e piloto

`v0.1` será a primeira versão candidata a uso, depois que B3 a B6 estiverem implementados e os gates aplicáveis passarem.

O piloto é uma fase controlada de validação da `v0.1`, com usuários e condomínios selecionados, documentos autorizados ou anonimizados, revisão humana e métricas de qualidade. Portanto, `v0.1` e piloto são relacionados, mas não são a mesma coisa.
