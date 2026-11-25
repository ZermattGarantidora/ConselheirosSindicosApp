# Instrumentação e cache — repetição dos mesmos 40 casos

**Data:** 24/11/2026. **Rodada:** `2026-11-24-stress-cache-r3`.
**Decisão de qualidade:** candidato reprovado; não adotado. Histórico preservado.

## Mudança avaliada

A [baseline corrigida](results-conflicts-r2.md) permanece intacta: 40/40 completos por braço,
zero reparos, médias 15,671/15,604 s, equivalência USD 1,3186968/0,9493181 (Sol/híbrido).
O usuário autorizou instrumentação e otimização de cache sem aceitar regressão de qualidade.

O candidato `compact-v1` representa as evidências por referências curtas por posição, somente
durante a chamada. O schema conserva as mesmas restrições por bijeção, incluindo a proibição
de claims factuais nas comparações com minuta. Referências estruturadas do contrato são
traduzidas e a resposta é decodificada antes dos validadores existentes. IDs reais, documento,
versão, página e trecho são reconstruídos localmente. Referência fora do mapa é recusada.
Pergunta, conteúdo das fontes, histórico livre, personalidade e regras não são reescritos.

O cwd compacto é um diretório genérico estável e vazio, recusado se simbólico ou não vazio.
O schema fica em temporário privado diferente por geração e é apagado ao término. Sessões
continuam efêmeras, ferramentas desligadas e config/project docs do computador ignorados.
Nenhum conteúdo, mapa ou resposta é compartilhado entre condomínios. Não há cache local de
respostas/retrieval nem chamada extra para aquecer cache. O CLI conserva cache automático;
o ganho só pode ser afirmado pelo usage observado. [Decisão e limites](../../adr/0049-instrumentacao-e-layout-codex-para-cache.md).

O layout permanece opt-in: `CODEX_ANSWER_REFERENCE_FORMAT=compact-v1`; `original` conserva
o caminho anterior. O manifest fixa essa opção. Um candidato com regressão não vira padrão.

## Instrumentação

Relógio monotônico mede recuperação, geração documental, validação, persistência e duração
do caso de uso. O gateway mede preparação, processo, parsing e limpeza. O processo registra
spawn, primeiro byte, início de turno e primeiro evento completo de resposta quando observados.
**Primeiro evento completo não é TTFT** nem separa a fila interna do provedor da geração.
Marco indisponível é null; ausência não é convertida em zero. A latência do harness continua
separada e inclui verificações próprias. Etapas não cobertas em um caminho são reportadas
como não observadas, sem atribuir o restante a uma fase inventada.

Observadores internos são protegidos contra erros síncronos/assíncronos e não mudam saída,
timeout, tentativa, limpeza ou validação. Os diagnósticos carregam apenas durações, enums,
contadores e hashes; eventos do caso de uso têm escopo de condomínio autorizado. Nenhum
conteúdo da pergunta, fonte, resposta ou stderr é enviado nesses diagnósticos.

## Comparabilidade e critério de aceitação

Mesmos 40 casos, rubrica, sete PDFs nativos, 350 páginas e 25.200 registros. Os sete originais
e todas as páginas extraídas são idênticos aos da baseline; não houve OCR novo. Dois workers,
ordem alternada, memória desligada, budgets e políticas de modelos/reparo permanecem iguais.
Gates próprios terminaram antes da inferência. Código congelado e igual entre os dois braços.

Aceitar somente 40/40 completos por braço, com mesmas exigências de associação, citações,
ressalvas, conflitos, abstenção, escalonamento e segurança. Conservar o automático original,
falhas, reparos, consumo desconhecido e auditoria por resposta/hash. Aprovação humana não é
fabricada. Uma resposta concluída não é refeita para melhorar nota.

## Resultados

| Métrica | Sol fixo | Híbrido |
|---|---:|---:|
| Completos no julgamento técnico inicial por IA | 38/40 | 40/40 |
| Equivalência total, USD | 1,1762548 | 0,87663084 |
| Média, s | 12,911 | 13,091 |
| Mediana, s | 12,520 | 12,860 |
| P95, s | 17,106 | 18,565 |
| Tentativas / reparos | 40 / 0 | 40 / 0 |
| Tokens de entrada reutilizados antes → agora | 14,44% → 20,87% | 17,04% → 19,77% |

Os tempos observados e o reaproveitamento melhoraram, mas **isso não compensa regressão de
qualidade**. Sol-015 entregou HTTP 403 após geração, e Sol-040 deu abstenção segura porém sem
a citação exigida da fonte disponível. Saída bruta não foi contada como entregue. Sol-009
e híbrido-038 exibiram aliases internos no corpo. O encaminhamento jurídico excessivo 031
permaneceu nos dois braços, como na baseline. Não houve vazamento de tenant ou ação externa.

Os 80 recibos são conhecidos, sem consumo desconhecido; todos os casos, modelos iniciais,
risco, budgets e textos recuperados foram conferidos contra a baseline. O check automático
e os dois desacordos lexicais (Sol-010 “agendado”, híbrido-026 domingo não perguntado) foram
preservados. Auditoria por hash cobre todas as respostas, inclusive falhas e apresentação.

O replay de Sol-015 com a saída salva reproduziu o HTTP 403 com **zero inferência nova**.
A causa é a qualificação do journal: “não comprova aprovação” em uma claim interpretativa
já validada não era reconhecida por sua expressão de ressalva. Não é falta de autorização
real e não autoriza remover os guardas. A continuação corrige essa recusa e impede alias
interno no texto por validação/reparo, sem apagar conteúdo. Outra rodada terá outro manifest;
esta conclusão e seus custos não serão substituídos pela repetição.

`analysis.json`, `performance-analysis.json`, `technical-audit.json`, `paired-verification.json`
e recibos conservam a prova em `.local/dense-stress/2026-11-24-stress-cache-r3/`. O formulário
especializado tem 80 campos humanos em branco. O gate técnico de qualidade é `false`.

Revisão complementar do autor: a classificação inicial de Sol-040 como incompleto foi
excessiva. A resposta se abstém de norma/quórum ausentes sem afirmar fato local e atende à
RQ-7704, que já distingue abstenção correta de falha. Essa revisão corresponde a 39/40 no
Sol; o 38/40 inicial, sua auditoria, o automático e sua análise permanecem preservados.
Os hashes/justificativa estão em `.local/latency-cache/abstention-adjudication.json`.
R3 continua reprovada pelo HTTP 403 e pelos aliases visíveis. Não houve alteração do oracle
ou das respostas para aprovar o candidato.

## Provas e gates

- Manifest: `0d747cf87f862e3febf5f3fc6018c8a659279eaa433b829fabec51cc3eeafa7a`.
- Código/harness: `e963c007ebcfddfd9be7d6e251f3fec62b81dd59e7c3bf19816b6c22747fd280`.
- Corpus: `670ced8aa05418e3458e7f98bd7b81b0dc628dfdeb502a187936f9ba1ad23f10`.
- Oracle: `ac2f5da57a9c7840b66f3787d1df99538fb9bfd7d6807edfb1dbf4dad3a022a7`.

Rodada privada em `.local/dense-stress/2026-11-24-stress-cache-r3/`; gates em
`.local/latency-cache/gates/`. Passaram formatação global, ESLint, TypeScript, build da API,
**2.973 unitários**, **275 E2E**, evals determinísticos 20/20 e documentários 50/50.
Cobertura statements/branches/functions/lines: **85,66 / 82,00 / 91,10 / 87,49%**.
Os 50 semânticos anteriores continuam pendentes. Scanner integral final passou no fechamento
da tarefa, com log em `.local/latency-cache/gates-r4/secrets.log`; os gates de r3 permanecem preservados.

Custo é equivalência pela tarifa histórica de 30/10/2026, não fatura, franquia ou preço atual.
Cache é contabilizado pelos tokens observados; o CLI não fornece discriminação de escrita
de cache nesta integração. Uma rodada local não isola causalidade, não estima SLA ou variância.
Sem mudança de provider/modelo/esforço, rollout, reinício de app, merge, deploy ou banco remoto.
