# Revisão local — conversas pelo plano Codex

- **Status:** autorrevisão concluída; validação técnica local aprovada
- **Referência:** diff local da Spec 042 sobre `3b702db6f91dbbeb2ede1a6063053296298d913c`
- **Autor e revisão local:** mesmo agente Codex; não é revisão independente
- **Data:** 2026-10-26
- **P0/P1 pendentes no escopo:** 0

## Escopo revisado

Conteúdo integral de `codex-answer-gateway.ts`, `codex-process.ts`, seus testes unitários e
`codex-conversations.e2e.test.ts`; alterações de seleção do gateway em `server.ts`, contrato
de runtime em `create-api.ts`, identificação em `App.tsx`, exportação dos helpers OpenAI,
`.env.example`, documentação da Spec 042, exceção explícita da Spec 026 e ADR 0031.

Revisados autenticação ChatGPT forçada, ambiente filho sem chaves ou banco, execução sem shell,
ferramentas/MCP/plugins/hooks desabilitados, sessões efêmeras independentes, limpeza dos
temporários, completude do JSONL, schema e reconstrução de citações, indisponibilidade segura e
ausência de fallback para APIs pagas. A recuperação e o validador documental permanecem no produto.

O diff rastreado completo foi inspecionado para identificar alterações concomitantes. A Spec 041,
seu corpus e a correção documental associada pertencem a outro trabalho e foram preservados;
esta revisão não substitui a revisão específica daquele conjunto. `.env.local` é ignorado pelo
Git e teve somente as opções locais do modo Codex atualizadas, sem copiar credenciais.

## Validação

| Comando/caso | Resultado |
|---|---|
| `pnpm run check` | Aprovado: formato, lint, tipos, cobertura, visão e segredos |
| Suíte com cobertura | 132 arquivos, 950 testes; statements 90,73%, branches 85,25%, functions 96,36%, lines 92,77% |
| Módulos novos Codex | 100% em statements, branches, functions e lines |
| `pnpm run test:e2e` | 111/111 em 19 arquivos |
| `pnpm run evals` | 20/20; sem provedor externo |
| `pnpm run evals:documentary` | 50/50 determinísticos; 50 semânticos e revisão especializada pendentes |
| `pnpm run build:web` e `pnpm run build:api` | Aprovados |
| `git diff --check` | Sem erros |
| Smoke real com ChatGPT | Boas-vindas, interpretação e pergunta geral pelo endpoint; consulta documental pelo gateway com citação validada |
| Runtime iniciado com `.env.local` | Portas 3000 e 5173: `aiProvider=codex`, `authMode=development` |

O smoke usa CLI `0.164.0-alpha.11.1` e `gpt-6.1-sol`. O envio de perguntas, contexto recente e
trechos sintéticos ao Codex/OpenAI e o consumo da cota foram autorizados explicitamente pelo
usuário. Rodadas iniciais recusaram um aviso do recurso experimental de descoberta de skills;
a configuração passou a suprimir esse aviso, mantendo a recusa de erros e ferramentas
inesperadas, com asserção de regressão.

## Limites e decisão

O modo é pessoal, local, sintético e opt-in. O harness acrescenta contexto e overhead; a consulta
documental observada usou 11.524 tokens de entrada e 172 de saída em 5.815 ms. Não há promessa
de equivalência com a API, medição de cota restante ou teto de tokens por chamada do CLI. O
timeout limita duração e o buffer limita a saída capturada. OCR, imagens, embeddings e runners
de eval não passam automaticamente a usar o plano. Atualizar o CLI exige repetir o smoke.

Não houve merge, commit, push ou publicação. Integração futura continua sujeita à revisão e aos
checks exigidos pela política do projeto. Esta validação não aprova dados reais nem qualidade
semântica da bateria de evals.
