# Roteamento Luna/Sol — resultados de 28/10/2026

**Status:** matriz completa, regressão posterior e gates de código concluídos. Não autoriza piloto ou produção.

O roteamento está implementado e optativo na demonstração local. Luna atende consultas básicas; Sol recebe risco alto, conflito, versões pendentes, integridade factual, análise financeira e síntese de várias fontes. A escolha ocorre antes da geração, sem classificador LLM e sem repetir sistematicamente Luna→Sol. A correção única de validação conserva o modelo selecionado.

Foram melhorados contexto recente, correção do mês consultado, recuperação de páginas complementares, identificação de conflitos e validação de valores. Os erros corrigidos têm regressões determinísticas. Isso é evolução versionada do sistema; os modelos não foram treinados e o chat não aprende automaticamente com cada erro.

## Matriz executada

Run-key `2026-10-27-hybrid-r2`, uma rodada, esforço `low`, memória ligada nos dois braços e quatro cenários independentes simultâneos. Cada braço executou os mesmos **280 cenários e 1.010 turnos**: 240 cenários curtos/260 turnos e 40 longos/750 turnos. Total: **560 conversas, 2.020 turnos e 2.337 tentativas de processo**. Saídas rejeitadas e falhas permaneceram contabilizadas. Não houve API paga nem juiz LLM adicional.

- Snapshot: `ec2a07fb4e019dbdfaa21d5b2b330c700e4a83e159af1b975d9f0d81377a5733`.
- Dataset: `4e721a0c6f408791f0aca1d3ac45d0d82ed890549d8b5dd4fb2ffbeef21a193b`.
- Corpus: `96ca9a845c28b1e3bfabd42033bd852d92a1de85b65626c07bee7d257fc86e39`.
- Os 240 casos originais e todos os oráculos foram preservados. O system prompt v26 permaneceu igual nos dois braços.

O runner encerrou com `complete=true`, sem erro interno. A conferência dos 560 checkpoints verificou hashes do snapshot, casos, respostas auditadas e entradas de cada tentativa. Os 2.020 turnos passaram nos controles mecânicos de contrato, autorização, tenant e citações. Isso não prova que toda afirmação textual tenha sustentação semântica. O replay usa endpoint real em memória e texto extraído sintético; não certifica OCR, UI ou persistência PostgreSQL.

## Qualidade auditada

Foram revisados os 80 alvos pré-fixados em cada braço: 160 registros vinculados ao hash de cada resposta. Um alvo ambíguo (`crosscutting-06/2`, referência a “taxa daqui”) foi excluído uniformemente, como na rodada histórica, sem alterar o oráculo. **79 posições por braço** entram nas taxas.

A revisão técnica foi feita por IA pelo autor da implementação, em amostra intencional de continuidade e segurança. Não é taxa de acerto dos 1.010 turnos, revisão independente ou aprovação especializada. Satisfatória resolve a tarefa com fontes e limites; parcial omite parte material; falha não entrega a tarefa; indisponibilidade operacional permanece no denominador.

| Configuração com memória | Satisfatórias | Parciais | Falhas semânticas/de tarefa | Operacionais na amostra |
|---|---:|---:|---:|---:|
| Luna | 51/79 (64,6%) | 20 | 8 | 0 |
| Híbrido Luna/Sol | 57/79 (72,2%) | 16 | 4 | 2 |

O ganho observado foi de **7,6 pontos percentuais**. Nos pares auditados, 11 posições passaram de parcial/falha para satisfatória, mas cinco satisfatórias deixaram de sê-lo, incluindo duas indisponibilidades. A média não deve esconder essas regressões. Uma rodada não demonstra significância estatística.

| Recorte da amostra | Luna | Híbrido |
|---|---:|---:|
| Continuações curtas, 18 válidas | 15/18 (83,3%) | 17/18 (94,4%) |
| Finais de todos os 40 cenários longos | 22/40 (55,0%) | 23/40 (57,5%) |
| Intermediários longos, 21 posições | 14/21 (66,7%) | 17/21 (81,0%) |

A principal limitação continua no fechamento das conversas longas: integrar todos os assuntos, evidências, pendências e próximas verificações. Os 750 turnos longos por braço não receberam revisão semântica integral.

## Consumo e latência

Créditos equivalentes Standard são calculados sobre tokens efetivamente observados e cache por tentativa. A coluna USD aplica preços de API aos mesmos tokens, como hipótese; não houve cobrança de API medida nesta execução. O valor faturado permanece desconhecido. [Tabela oficial de créditos](https://learn.chatgpt.com/docs/pricing) e [preços de API](https://developers.openai.com/api/docs/pricing), consultados em 27/10/2026.

| Configuração | Créditos equivalentes observados | API USD hipotética | Tentativas / sem usage | Mediana / p95 por turno |
|---|---:|---:|---:|---:|
| Luna | 21,685691* | 0,86742764* | 1.194 / 5 | 5,45 s / 12,35 s |
| Híbrido | 205,8870735* | 8,23548294* | 1.143 / 14 | 6,61 s / 19,93 s |

\* São **subtotais**: 19 tentativas sem usage não valem zero. O consumo integral é desconhecido. Trabalho de engenharia/auditoria deste chat e outros usos da conta não são atribuíveis pelo CLI.

O híbrido consumiu **9,49 vezes** o subtotal Luna, com mediana 21,3% maior. Das 1.143 tentativas híbridas, **662 foram Luna e 481 Sol (42,1%)**. O roteamento ainda envia uma parcela grande ao Sol; esse custo adicional não se justifica automaticamente pelo ganho de seis respostas satisfatórias na amostra. Não se pode dividir custo de todos os turnos pelo número de acertos amostrados para obter custo por resposta correta.

| Parte da matriz | Luna: créditos | Híbrido: créditos |
|---|---:|---:|
| 240 curtos / 260 turnos | 5,0509125 | 43,3220045 |
| 40 longos / 750 turnos | 16,6347785* | 162,565069* |
| Total | 21,685691* | 205,8870735* |

A memória recente foi enviada em todas as chamadas, vazia no início de cada chat quando necessário. Houve histórico não vazio em 869 chamadas Luna e 831 híbridas, contando correções. Os máximos foram oito interações e 2.754/3.326 bytes, dentro do limite de 12.000 bytes. Não é memória global da conta.

Na parte final ocorreram intervalos de relógio de várias horas e timeouts com duração observada muito acima dos 120 segundos configurados. A causa não foi confirmada; uma pausa do computador é uma hipótese, não uma conclusão. Os máximos brutos ficaram em aproximadamente 20,12 milhões de ms (5,59 horas) nos dois braços e foram preservados. Não devem ser apresentados como tempo puro de inferência dos modelos.

No conjunto completo houve cinco respostas `failed` em Luna: uma recusa de validação e quatro falhas operacionais; no híbrido, 11: uma recusa de validação e dez falhas operacionais. A contagem difere das falhas semânticas da amostra: uma resposta formalmente válida também pode não resolver a tarefa. Os códigos e turnos estão no relatório de verificação.

## Comparação histórica e custos adicionais

Na rodada anterior, Luna com memória teve 43/79 satisfatórias e subtotal de 20,919619 créditos; Sol com memória teve 56/79 e 374,254590 créditos. Agora Luna ficou em 51/79 e o híbrido em 57/79. Há mudanças de código e prompt entre os snapshots históricos: são referências descritivas, não prova causal das correções nem comparação controlada híbrido versus Sol. O subtotal híbrido foi 45,0% menor que o Sol histórico, com consumo faltante atual. Somente Luna versus híbrido na matriz R2 compartilham o mesmo snapshot.

| Execução desta tarefa, fora da comparação histórica | Créditos equivalentes observados |
|---|---:|
| Smokes iniciais | 1,3134000 |
| Exploração R1 interrompida | 102,6456740* |
| Matriz completa R2 | 227,5727645* |
| Regressão dirigida final: Luna / híbrido | 0,4130550 / 1,4225205 |
| **Subtotal observado desta tarefa** | **333,3674140*** |

A R1 foi interrompida após descobrir um falso conflito entre retenção de imagens por 30 dias e prazo de locação. Seus 514 checkpoints/930 turnos foram preservados e não usados como matriz completa; havia até quatro cenários em andamento sem checkpoint no encerramento, com consumo adicional desconhecido. A correção precedeu o novo snapshot R2. Os custos desses testes não foram apagados. O total inclui apenas consumo observável, não a fatura ou a franquia exata da conta.

O subtotal consolidado de 333,367414 créditos corresponde a USD 13,33469656 de API hipotética. Inclui os 19 processos sem usage apenas como registros desconhecidos, sem lhes atribuir custo zero. A comparação histórica da Spec 050 permanece separada e não está novamente somada neste total.

## Correções verificadas e pendências

Regressões e exemplos da auditoria mostram recuperação de julho após correção de mês, comparação entre minuta e versão confirmada, classificação contextual de emergência, pedido de CCT para confirmar piso, reconhecimento da janela parcial e eliminação do falso conflito imagens/locação. A guarda monetária limita valores sem suporte e distingue hipótese explícita. Rejeições monetárias não provam, por si só, alucinação: o texto bruto rejeitado não foi retido, e falsos positivos continuam possíveis.

Prioridades remanescentes:

1. **Contexto da tarefa e sínteses longas.** Finais de `long-17`, `long-36` e `long-38` ainda omitem partes do pedido; referências curtas e mudança de assunto precisam de limites mais precisos. Não resolver ampliando memória ou resumindo fatos antigos sem revalidação.
2. **Encaminhamento mais seletivo.** Separar consulta factual simples da decisão/síntese que exige Sol e impedir que risco antigo contamine assuntos já encerrados. Medir a redução de custo por motivo sem retirar validação humana de temas de alto risco.
3. **Abstenção útil e modos compatíveis.** Em `labor-15/2` e `long-39/8`, avisos genéricos podem ocultar que o documento necessário está ausente ou que falta uma fonte. Em `long-35/30`, o híbrido terminou em aviso genérico após `mode_incompatible`; recuperação incompleta das duas fontes e decisão de modo precisam ser alinhadas.
4. **Disponibilidade da execução.** Investigar pausas/timeouts e falhas de processo antes de usar a medição de latência como compromisso de produto. Não trocar silenciosamente de provedor nem ocultar tentativas sem usage.

O achado adicional da matriz R2 em `long-36/4,5` era uma falsa recusa de definições gerais de ata/pauta. O ajuste distingue definição de afirmação local, preserva validação de claims/citações e recebeu 11 regressões novas. Ele foi aplicado **depois** do snapshot R2: as notas e respostas acima permanecem anteriores a esse ajuste.

O replay `2026-10-28-hybrid-generic-regression` terminou com **60/60 turnos**, zero respostas `failed`, zero falhas mecânicas e usage em todas as 60 tentativas. Snapshot `84af61502f587257bd486c5ddc32f05790d7bc1aba857628de4c88f7150f5242`: somente `answer-fidelity.ts` difere do snapshot R2. Nos dois braços, pauta/ata foram definidas sem recusa indevida ou fato local inventado. A distinção entre sugestão/decisão também deixou de gerar a recusa; o híbrido ainda omitiu responsável/instância competente. Na pauta final, Luna reuniu os quatro assuntos e o híbrido manteve somente versões, com omissão material. A remoção de um falso positivo não resolve todas as limitações de continuidade.

Custos dirigidos: Luna 0,413055 créditos (API hipotética USD 0,0165222) e híbrido 1,4225205 (USD 0,05690082), sem usage faltante. Não substitui execução integral do código final, não isola toda variação de amostragem e não promove a pontuação R2.

## Artefatos e conclusão de verificação

- [Métricas da matriz](../../../reports/conversations-2026-10-27-hybrid-r2-metrics.json).
- [160 decisões da auditoria técnica](../../../reports/conversations-2026-10-27-hybrid-r2-technical-audit.json).
- [Verificação de hashes, isolamento, memória e falhas](../../../reports/conversations-2026-10-27-hybrid-r2-verification.json).
- [Resumo bruto da execução](../../../reports/conversations-comparison-2026-10-27-hybrid-r2.json).
- [Custos da exploração interrompida](../../../reports/conversations-2026-10-27-hybrid-r1-interrupted-metrics.json).
- [Verificação e consumo do replay dirigido](../../../reports/conversations-2026-10-28-hybrid-generic-regression-verification.json).
- [Consumo consolidado de todas as execuções desta tarefa](../../../reports/conversations-2026-10-28-hybrid-task-costs.json).
- [Mapa de erros e regressões](regressions.md).

Manifestos, snapshots, logs e checkpoints estão em `.local/conversation-comparisons/<run-key>/`. As fichas especializadas exportadas continuam sem aprovação; a auditoria técnica não foi convertida em parecer profissional. Três rodadas e os gates semânticos da Spec 041 continuam necessários para certificar o piloto.

No código final, **150 arquivos/1.333 testes passaram**, incluindo 44 novas regressões desta fatia. Cobertura: statements 91,77%, branches 87,22%, funções 96,75% e linhas 93,52%. Typecheck, lint, formatação e gate de visão passaram. Os mesmos binários instalados foram usados diretamente porque Corepack/pnpm não resolviam o registro no ambiente; não houve instalação de dependências.

A primeira repetição final teve três timeouts enquanto o replay real rodava. A tentativa seguinte foi interrompida pelo ambiente antes de concluir, com código de saída `1073807364`; a causa não foi confirmada. A execução final fora do sandbox passou com os mesmos dois workers, timeouts e asserções, sem chamadas a modelos. Os logs anteriores foram preservados. Isso não apaga a instabilidade observada no ambiente.

Logs: `.local/hybrid-quality-gates-final.log`, `.local/hybrid-quality-gates-final-isolated.log` e `.local/hybrid-quality-gates-final-stable.log`; cobertura em `coverage/hybrid/`. Não houve alteração de banco/schema, migração ou novo provedor. A revisão do diff foi do autor, sem aprovação independente de merge. Scanner final de segredos aprovado após o término dos processos Codex; gate de visão repetido no estado final, com 51 specs aprovadas.

A implementação está disponível pela opção local `CODEX_ANSWER_ROUTING=hybrid`; `.env.local` e a configuração do aplicativo em execução não foram alteradas. Não houve deploy, commit, push ou merge.
