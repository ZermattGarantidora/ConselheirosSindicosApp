# Integração — Spec 047

**Status: integração central concluída e validada tecnicamente; revisão especializada pendente.**
Atualizado em 27/10/2026. Este chat não fará novas alterações nos arquivos centrais.

## Fechamento pelo integrador — Specs 043/046

O caso de uso captura CodexAnswerGatewayUnavailableError.code nas três rotas, preserva
InvalidAnswerValidationError e não faz retry de transporte nem fallback pago. A continuação
considera o maior risco entre pergunta atual e perguntas anteriores autorizadas; testes HTTP
cobrem emergência, revogação e isolamento. Os três módulos próprios desta spec foram preservados.

Os bloqueios globais registrados historicamente abaixo foram tratados na integração, sem
relaxar asserções: 1.234/1.234 testes na implementação v24 e 1.241/1.241 na árvore compartilhada
v25, cobertura global acima de80% nos quatro indicadores; integração Neon sintética12/12,
evals20/20 e documentais50/50. A rodada real r7 original240/260 terminou sem falhas mecânicas
ou operacionais e com51/51 high_risk classificados high e especialista obrigatório.

Resultado técnico por IA:229 satisfatórios, dez parciais e uma falha de atendimento. Não é
aprovação especializada nem certificação da árvore compartilhada posterior. Consulte o
[comparativo final](../046-correcoes-evidencias-e-busca/observed-results-2026-10-27.md) e a
[revisão do integrador](../../reviews/2026-10-27-evidencias-continuidade.md). Os relatos abaixo
permanecem como registro da entrega anterior à integração, não como estado atual dos gates.

## Entrega e propriedade

- `apps/api/answers/risk-classification.ts`: critérios de emergência, trabalho, privacidade, acesso, ação externa e demais decisões de alto risco observadas. Motivos de fraude/desvio descrevem risco da análise, sem alegar indício documental.
- `apps/api/answers/codex-answer-gateway.ts`: códigos/estágios controlados, observação opcional minimizada, normalização de preparação/limpeza/parsing e preservação da rejeição de validação documental.
- `apps/api/answers/codex-process.ts`: distinção por metadados nativos de lançamento, exit, timeout, buffer e stdin; ambiente e limites preservados.
- Testes próprios: `tests/unit/risk-classification.test.ts`, `tests/unit/codex-answer-gateway.test.ts`, `tests/unit/codex-process.test.ts`.
- Documentação: `spec.md`, `acceptance.md` e estas notas na pasta 047.

Não foram editados `answer-use-case.ts`, `prompt-catalog.ts`, `answer-gateway.ts`, contratos compartilhados, `citation-validator.ts`, conflitos, retrieval, triagem, `server.ts`, `create-api.ts`, README, AGENTS, package.json ou traceability. O gateway importa a rejeição de citação que o outro chat passou a lançar; não altera o validador.

## Contratos mantidos e solicitações concretas ao integrador

### Risco contextual — RQ-4701/4702 e AC-4711

Assinatura inalterada: `classifyQuestionRisk(question: string): RiskAssessment`.
Resultado imutável com `riskClass`, `specialistType`, `reason`; mesmo conjunto de especialistas.
A função não recebe histórico nem consulta documentos. A Spec 043 deve classificar a pergunta atual e o contexto autorizado de continuação sem reduzir o maior risco. Não concatenar resposta documental anterior como evidência; recuperar fontes novamente.

O chamador deve aplicar o especialista em todas as rotas (documental, geral, abstenção/fallback).
Em emergência, a classificação independe de anexos: orientar proteção/atendimento imediatamente,
sem condicionar a ajuda a upload. Este módulo não introduz espera, geração adicional ou fluxo de coleta.
Validar a fala emergencial pela rodada real consolidada: estes testes não certificam texto do modelo.

### Diagnóstico central — RQ-4703/4704

Erro operacional exportado por `codex-answer-gateway.ts`:

```typescript
class CodexAnswerGatewayUnavailableError extends AnswerGatewayUnavailableError {
  readonly code: CodexGatewayErrorCode;
  readonly stage: CodexFailureStage;
}
```

**Mudança central mínima solicitada:** nos catches que hoje gravam `answer_gateway_unavailable`,
usar `error.code` quando `error instanceof CodexAnswerGatewayUnavailableError`, preservando os
códigos existentes para os demais adaptadores. Fazer isso também nos caminhos de orientação geral
e no catch de falha de orientação após validação. Não copiar `error.message` arbitrário, stdout,
stderr ou `cause` para a auditoria. A mensagem pública operacional já é fixa e segura.
Não serializar objeto Error completo nem adicionar conteúdo às propriedades existentes.

Callback opcional em `createCodexAnswerGateway({ onDiagnostic })`:

```typescript
type CodexDiagnostic = Readonly<{
  code: CodexGatewayErrorCode | "codex_completed";
  stage: CodexFailureStage | "completed";
  latencyMs: number;
}>;
```

Aceita observador síncrono ou assíncrono; falhas são ignoradas com segurança, sem bloquear a geração.
O evento não contém tenant, ID de chat, prompt, pergunta, documento, caminho, stderr ou causa.
Se conectá-lo à auditoria, vincular ao escopo autorizado da requisição no chamador. Não correlacionar
chamadas concorrentes por um estado global compartilhado. Captura pela exceção tipada já permite
registrar falhas sem mudar `AnswerGatewayInput/Result` ou a factory de ambiente.

| Estágio | Códigos |
|---|---|
| preparation | `codex_preparation_failed` |
| process | `codex_process_start_failed`, `codex_process_failed`, `codex_process_timeout`, `codex_output_limit` |
| transport | `codex_stdin_failed` |
| parsing | `codex_event_invalid`, `codex_turn_incomplete`, `codex_answer_invalid` |
| output | `codex_turn_failed`, `codex_tool_disallowed`, `codex_answer_rejected` |
| cleanup | `codex_cleanup_failed` |
| completed | `codex_completed` |

`codex_turn_failed` significa evento explícito de erro do CLI com causa desconhecida: não inferir
transporte, autorização, limite, timeout ou transitoriedade por sua mensagem. O diagnóstico de
transporte desta fatia é o stdin; não interpreta mensagens livres remotas como códigos.
Timeout só é atribuído aos metadados nativos de encerramento forçado pelo limite de execução;
maxBuffer tem precedência e código próprio. Falha de stdin não suplanta o erro nativo do processo.
Se limpeza e geração falharem, preservar o erro controlado original e observar também a limpeza.

Rejeição de citação pelo parser compartilhado preserva `InvalidAnswerValidationError` e seu código
(`citation_not_authorized`, por exemplo), com mensagem local fixa; o callback emite
`codex_answer_rejected`. O chamador mantém seu tratamento de validação e não deve convertê-la em
erro de processo. O teste antigo que descartava citação desconhecida foi dividido em sucesso com
citação autorizada e rejeição explícita da desconhecida, fortalecendo a fronteira.

**Retry:** nenhuma repetição automática. A rodada não demonstra causa transitória elegível.
Cada erro testado invoca o adaptador uma só vez, inclusive ferramenta, parsing, autorização/citação
e saída recusada. Não usar API OpenAI ou Gemini como fallback. Uma orientação geral que o caso de uso
permita após reprovação documental continua sendo decisão central, com prompt/contexto próprios;
não é retry de transporte neste adaptador e não pode reexpor segredo protegido.

## Validação dos módulos

- 166 testes próprios aprovados nos três arquivos de risco, gateway e processo.
- Cobertura dos três módulos: **100% statements, 100% branches, 100% functions, 100% lines**.
  Relatório local ignorado: `reports/spec-047-coverage/coverage-summary.json` e HTML na mesma pasta.
- 51/51 turnos originais `high_risk` classificados high; variantes independentes, consultas rotineiras
  e motivos não probatórios incluídos. Não foram alterados os 240 casos/gabaritos.
- Replay sintético focado pelo endpoint: **52/52 contratos válidos e 52 escalonamentos**
  (51 `high_risk` + crosscutting-22); zero falhas mecânicas, zero chamadas ao provedor.
  Relatório separado: `reports/spec-047-focused-contracts.json`. É validação mecânica com gateway
  sintético: 50 abstenções e duas respostas documentais; não mede qualidade semântica de modelo,
  não reclassifica a falha original e não substitui a rodada real consolidada.
- Smoke nativo do processo: **5/5**, usando somente Node (sucesso, exit 7 com stderr sintético,
  timeout, maxBuffer e executável inexistente), **zero chamadas a provedor**.
- Lint e Prettier dos seis arquivos próprios aprovados; `tsc --noEmit` global aprovado na última execução.
- Gate de visão aprovado nas 47 specs; scanner de segredos aprovado; `git diff --check` do risco aprovado.
- Revisão técnica própria do escopo: contratos, escalonamento, origem de mensagens, limpeza e ausência
  de fallback/retry conferidos. Não é revisão independente do branch nem autorização de merge.

Comando reprodutível da cobertura focada (com ferramentas instaladas):

```powershell
node node_modules/vitest/vitest.mjs run tests/unit/risk-classification.test.ts tests/unit/codex-answer-gateway.test.ts tests/unit/codex-process.test.ts --coverage --coverage.include=apps/api/answers/risk-classification.ts --coverage.include=apps/api/answers/codex-answer-gateway.ts --coverage.include=apps/api/answers/codex-process.ts --coverage.reportsDirectory=reports/spec-047-coverage
```

O arquivo legado `risk-and-conflict.test.ts` foi preservado: seus testes de classificação passaram;
em execução posterior, a parte de conflito falhou porque a implementação concorrente mudou a redação
esperada (`incompatíveis`). Essa parte não integra a cobertura focada final.

## Gates globais executados e pendências reais

Resultados são snapshots de uma árvore compartilhada em edição; não certificam a versão integrada.

| Gate | Resultado observado |
|---|---|
| `pnpm run check` | Interrompido pelo Prettier em 14 arquivos do outro chat. Sem formatá-los por fora. |
| `pnpm run test:coverage` | 1172/1178 testes passaram; 6 falhas centrais; por isso sem relatório de cobertura global final. |
| `pnpm run test:e2e` | 123/127 passaram; 4 falhas centrais na execução posterior. |
| `pnpm run evals` | 19/20 passaram; EVAL-008 falhou por texto esperado sobre convenção e noventa dias. P0, continua bloqueando aprovação global. |
| `pnpm run evals:documentary` | 50/50 determinísticos passaram; 50 casos semânticos e revisão especializada continuam pendentes. |

Na execução completa de cobertura, falharam: `chat-reentry` AC-3804 (`ConversationMemoryError`),
dois testes `documentary-quality` (replay mecânico 15/50), `conversation-evals` (contrato de campos
acrescidos pelo outro chat), `openai-answer-gateway` (ainda esperava descarte de citação não autorizada)
e `postgres-scoped-retrieval` (ainda esperava filtros antigos). Esses arquivos não foram editados aqui.
No E2E posterior, o teste de campos já estava ajustado pelo outro chat, mas o replay sintético
retornou 254/260 turnos mecanicamente válidos (seis falhas); manter o gate bloqueado até investigação.
Não atribuir automaticamente essas falhas ao modelo ou à qualidade dos módulos desta fatia.

O ambiente inicialmente bloqueou download do Corepack por DNS e rename do cache do Vitest (`EPERM`).
Executar os gates fora do sandbox resolveu essas limitações. As falhas globais listadas acima são
falhas observadas dos testes, não justificativas para enfraquecer asserções. Nenhuma alteração em
login, auth.json ou configuração global foi realizada pelo código ou pelos testes desta fatia.

Sem alteração de banco, storage ou dependência; integração PostgreSQL/RLS e nova rodada real dos
240 cenários devem ser conduzidas pelo integrador após estabilização. Não executamos novo modelo,
não alteramos system prompt e não há certificação especializada, aprovação da aplicação ou merge.

## Linhas prontas para a centralização

Para `docs/quality/traceability.md`:

```markdown
| RQ-4701/RQ-4702 | AC-4701–AC-4706/AC-4711 | Classificação proporcional, motivos não probatórios e integração de emergência/continuação | tests/unit/risk-classification.test.ts; Spec 043/046 para orientação e contexto | 51/51 high_risk; variantes e controles; integração semântica pendente |
| RQ-4703/RQ-4704 | AC-4707–AC-4710 | Diagnóstico Codex minimizado, limpeza, ausência de retry/fallback | tests/unit/codex-answer-gateway.test.ts; tests/unit/codex-process.test.ts | 166 testes próprios aprovados no conjunto; cobertura dos três módulos 100% nos quatro indicadores; captura central de códigos pendente |
```

Para README, na descrição do adaptador local:

> O Codex distingue falhas de processo, stdin, parsing e saída recusada por códigos controlados,
> sem registrar stderr ou conteúdo. Não faz retry automático nem fallback para API paga.
> Consulte a Spec 047 para diagnóstico e limites de integração.

AGENTS/package.json: nenhum novo comando canônico ou dependência; não há linha obrigatória adicional.
Os drivers em `tmp/verify-spec-047-*.ts` são diagnósticos locais transitórios, não um novo harness/eval de produto.

## Preservação da rodada original

- Bruto: `c8af558626bc5883cd3782cb15fefe7ad4bb4645107bdd2259520b2511fb5bf3`.
- Engenharia: `5d5a87b7f3fed04b285e53d835819fcfb4fcdd848eb22cdf7e138cb5013569cc`.
- Resumo: `8d698a2f2125d5f739d1dd187db01d8b8f2c5ebabbc8981b5a87345ed5189e25`.
- Retry separado: `256c2cbfafc21c7c37b30d1d72c5245e3bb9aff9ecee267d3dba9a730fab5589`.

A indisponibilidade original de crosscutting-22 permanece. Seus 7,65 s não comprovam timeout;
o retry separado não substitui a ocorrência nem melhora a baseline original.
