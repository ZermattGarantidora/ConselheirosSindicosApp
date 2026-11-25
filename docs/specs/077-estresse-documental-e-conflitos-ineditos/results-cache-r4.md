# Cache e instrumentação — rodada corretiva sem tolerância a regressão

**Data:** 24/11/2026. **Rodada:** `2026-11-24-stress-cache-r4`.
**Decisão:** gate técnico factual/segurança aprovado nesta amostra; mantém opt-in, sem adoção global por velocidade. Revisão humana/independente pendente.

## Baseline e candidato preservado

A comparação principal é com a [baseline corrigida r2](results-conflicts-r2.md): 40/40 por
braço, médias 15,671/15,604 s e equivalência USD 1,3186968/0,9493181 (Sol/híbrido).
A [primeira tentativa de cache r3](results-cache-r3.md) ficou mais rápida, mas caiu para
38/40 no julgamento inicial do Sol e expôs referências internas em dois textos. Foi reprovada e não adotada.
Seu custo, suas respostas e seus hashes permanecem separados dos resultados desta rodada.

O candidato mantém layout compacto por bijeção, schema equivalente e cwd genérico vazio,
com mapas/schema/sessão privados por chamada. Pergunta, fontes, história livre, personalidade,
modelos/esforços, recuperação, budgets e limite de reparos permanecem. O CLI usa cache
automático; nenhum controle exclusivo da API ou aquecimento adicional foi introduzido.

Esta correção recusa alias interno no corpo, salvo literal presente na pergunta/fontes,
e aciona somente o reparo existente. Não remove texto para aprovar resposta. O journal passa
a reconhecer “não comprova aprovação” como ressalva de interpretação já validada, preservando
usuário, tenant, documento, estado, claims e hash. Replay da mesma saída antiga: 403 no snapshot
r3 e 200 no código corrigido, com zero chamadas ao provedor em ambos. Testes positivos e
negativos incluem referências fora do mapa, literal verdadeiro, vigência e fontes pendentes.

## Método e gate

Mesmos 40 casos e oracle, sete PDFs nativos, 350 páginas, 25.200 registros, bytes/páginas
idênticos, sem OCR novo. Dois workers, ordem alternada, memória desligada. Código congelado
antes da inferência; gates próprios concluídos antes de medir. Resultados concluídos não são
refeitos. Uso/modelo/input de toda tentativa é conferido nos recibos e eventos brutos.

Somente aceitar 40/40 completos por braço, com associação, citações, ressalvas, conflitos,
abstenção, escalonamento e isolamento preservados. Check automático original é mantido e
desacordos recebem justificativa por resposta/hash. Aprovação especializada humana continua
pendente. Candidato com regressão permanece desabilitado por padrão.

## Resultados

**40/40 completos por braço na revisão técnica do autor por IA**, sem nova falha factual,
de isolamento, fonte fabricada, execução externa ou apresentação de referência interna.
O encaminhamento jurídico excessivo de 031 permanece nos dois braços, como na baseline.
Os 83 recibos foram conferidos; zero consumo desconhecido e zero resultado recuperado como
se fosse nova inferência. Fontes exigidas recuperadas nos 40 pares; modelos iniciais, tarefa,
risco, budgets e textos recuperados são os mesmos da baseline e as fontes iguais entre braços.

| Métrica | Sol fixo | Híbrido |
|---|---:|---:|
| Completos, revisão técnica por IA | 40/40 | 40/40 |
| Check automático original | 40/40 | 38/40 |
| Tentativas / reparos | 40 / 0 | 43 / 3 |
| Equivalência total, USD | 1,0877432 | 0,84342878 |
| USD por caso / resposta completa | 0,02719358 | 0,02108572 |
| Tempo médio, s | 13,115 | 13,628 |
| Mediana, s | 12,733 | 13,022 |
| P95, s | 18,958 | 25,107 |
| Máximo, s | 20,926 | 31,049 |
| Chamadas efetivas Sol / Luna | 40 / 0 | 30 / 13 |
| Tokens de entrada reutilizados | 28,23% | 25,17% |
| Tentativas com cache hit | 23/40 | 22/43 |

O híbrido ficou **22,46% mais barato** que Sol fixo, com média 0,513 s maior e P95 6,149 s
maior nesta rodada. Não há evidência de que ele seja mais rápido. A recuperação e os modelos
iniciais não foram alterados; os destinos totais mudam pelos reparos. No híbrido, 007 reparou
valor adicional recusado pelo validador monetário, 008 referência interna no corpo e 014
cobertura de fontes do conflito. As três entregas ficaram completas, e todas as tentativas
entraram nos custos/tempos. Não foram relaxados filtros para evitar o reparo.

### Antes e depois contra r2

| Métrica | Sol antes → agora | Híbrido antes → agora |
|---|---:|---:|
| Qualidade técnica | 40/40 → 40/40 | 40/40 → 40/40 |
| Média, s | 15,671 → 13,115 | 15,604 → 13,628 |
| Variação da média | −16,31% | −12,67% |
| P95, s | 21,675 → 18,958 | 21,847 → 25,107 |
| Variação do P95 | −12,54% | **+14,92%** |
| Equivalência total, USD | 1,3186968 → 1,0877432 | 0,9493181 → 0,84342878 |
| Variação de custo | −17,51% | −11,15% |
| Reuse de tokens | 14,44% → 28,23% | 17,04% → 25,17% |

O cache reutilizou 185.472/657.045 tokens no Sol e 176.128/699.713 no híbrido. As saídas
também variaram: 16.258 → 12.605 tokens no Sol e 17.584 → 14.570 no híbrido, este incluindo
os reparos. Portanto, não se atribui toda a queda de tempo/custo somente ao cache.
Não foi zerado o cache do provedor; r4 sucede r3 e pode se beneficiar de aquecimento natural.
Não houve chamada extra para aquecer ou descartar um resultado ruim.

O gate técnico de qualidade passou, mas **o P95 híbrido piorou**. A decisão é manter o
layout reversível e opt-in; não alterar automaticamente o roteamento ou recomendar adoção
global por velocidade. Nesta medição Sol fixo foi mais rápido e estável, híbrido foi mais
barato. Uma nova decisão de padrão exige considerar a espera nos casos com reparo.

### Desacordos do automático e correção de julgamento

Híbrido-026 responde integralmente sobre sábado às 21h30 e nega transportar a exceção de
domingo; não repete as 17h de domingo que não foram perguntadas, mesma decisão da baseline.
Híbrido-040 recusa confirmar norma/quórum ausentes, não afirma valor, contagem, aprovação ou
outro fato local e pede município/documentos e advogado. É abstenção correta conforme RQ-7704
e briefing §9; não se fabrica citação de norma que a fonte não contém. O automático exige
citação da fonte local mesmo nessa abstenção e ficou reprovado. Oracle, respostas e checks
não foram alterados; decisões estão vinculadas aos hashes e abertas à revisão humana.

O julgamento inicial de Sol-040 em r3 como incompleto foi excessivo pela mesma regra de
abstenção. A revisão complementar corresponde a 39/40 nessa rodada, sem sobrescrever seu
38/40 inicial, auditoria ou análise histórica. R3 continua reprovada pelo 403 e pelos aliases.
`abstention-adjudication.json` registra os dois hashes e a correção do julgamento do autor.

## Instrumentação e limites

Etapas do caso de uso: recuperação, geração, validação, persistência e total. Etapas do
gateway: preparação, processo, parsing e limpeza. Marcos do subprocesso: spawn, primeiro
byte, início de turno e primeiro evento completo de resposta. Ausência é null e não zero.
Primeiro evento completo não é TTFT; o período após início de turno ainda inclui espera e
geração do serviço. A latência do harness contém verificações próprias e é mantida separada.
Observadores protegidos não alteram saída/timeout/retry e não recebem texto ou stderr.

| Etapa média por caso | Sol fixo | Híbrido |
|---|---:|---:|
| Recuperação | 1,483 s | 1,494 s |
| Geração, incluindo reparos | 11,581 s | 12,111 s |
| Validação comum | 3,12 ms | 5,42 ms |
| Persistência em memória | 0,04 ms | 0,08 ms |

As quatro etapas e o total foram observados nos 40 casos de cada braço. A geração continua
dominando a espera; retirar validações economizaria poucos milissegundos. No subprocesso,
spawn médio foi 22,34/23,39 ms e o início de turno ocorreu em 1,965/1,889 s. Esses marcos têm
cobertura 40/40 e 43/43 tentativas, pelos recibos. A telemetria completa de fases do gateway
está disponível em 40/40 e 42/43 retornos: a saída recusada por alias não retornou esse objeto,
embora seus marcos nativos estejam no recibo. A falta não foi preenchida com zero.

Rodada em `.local/dense-stress/2026-11-24-stress-cache-r4/`; software em
`.local/latency-cache/gates-r4/`. Passaram formatação global, lint, TypeScript, build da API,
**2.979 unitários**, **275 E2E**, evals 20/20 e documentários 50/50. Cobertura
statements/branches/functions/lines: **85,67 / 81,99 / 91,10 / 87,50%**.
Os 50 semânticos anteriores continuam pendentes. Scanner integral e alinhamento das 77 specs
passaram, sem padrão conhecido encontrado; logs `secrets.log` e `spec-vision-final.log`.

`analysis.json`, `performance-analysis.json`, `technical-audit.json`, `verification.json`,
`paired-verification.json`, respostas e `attempts/` conservam as provas. Replay sem inferência
em `.local/latency-cache/replay-015-before-r4.json` e `replay-015-after-r4.json`. A decisão
complementar de abstenção fica em `.local/latency-cache/abstention-adjudication.json`.
Formulário especializado com 80 decisões humanas em branco:
`output/reports/dense-stress-2026-11-24-stress-cache-r4/revisao-especializada.md`.
[Revisão do delta e limites](../../reviews/2026-11-24-latency-cache.md).

- Manifest: `5513ae7e475efb69e8ae59f046cc6f07ee1fb790d7d20cbaebffbeda3486163e`.
- Código/harness: `8c4c77de9578cc27bf4ca361c52a919aa09c216cc7b6a7eaefa8bbcdfc87d22d`.
- Corpus: `670ced8aa05418e3458e7f98bd7b81b0dc628dfdeb502a187936f9ba1ad23f10`.
- Oracle: `ac2f5da57a9c7840b66f3787d1df99538fb9bfd7d6807edfb1dbf4dad3a022a7`.

Custos equivalentes usam a tarifa histórica de 30/10/2026 e todos os recibos, sem alegar fatura
ou preço atual. O CLI não discrimina cache writes. Uma rodada não prova causalidade, SLA,
variância ou ausência universal de regressão. Sem dados reais, banco remoto, merge ou deploy.
Não houve reinício do app nem ativação global do candidato. Os dois experimentos desta tarefa
(r3 e r4) somam USD 3,98405762 equivalentes, em 163 tentativas conhecidas, incluindo a rodada
reprovada; não se ocultou esse consumo ao apresentar somente a comparação final de r4.
