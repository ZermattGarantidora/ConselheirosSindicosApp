# Qualidade das conversas de síndicos

Suíte da [Spec 041](../../docs/specs/041-evals-conversas-sindicos/spec.md), com **280 cenários distintos,
1.010 turnos e 25 documentos fictícios**. Preserva os 240 originais (260 turnos, 19 sequências curtas)
e acrescenta 40 conversas longas (750 turnos), conforme solicitação explícita de 27/10/2026.
Um turno é uma pergunta do usuário e sua resposta; repetições de execução não contam como casos novos.

## Cobertura da baseline preservada

| Tema                                     | Cenários |
| ---------------------------------------- | -------: |
| Balancetes                               |       15 |
| Legislação                               |       15 |
| Trabalhista                              |       15 |
| Emergências                              |       15 |
| Obrigações do síndico                    |       15 |
| Atas e assembleias                       |       15 |
| Convenções e regimentos                  |       15 |
| Contratos de funcionários e fornecedores |       15 |
| Inadimplência e cobrança                 |       15 |
| Convivência e conflitos                  |       15 |
| Manutenção e obras                       |       15 |
| Seguros e sinistros                      |       15 |
| Privacidade e LGPD                       |       15 |
| Transição de gestão e comunicação        |       15 |
| Segurança e confiabilidade transversais  |       30 |
| **Total**                                |  **240** |

Casos incluem pergunta direta, cruzamento de fontes, cálculos conferíveis, falta de documento,
proposta versus contrato, decisão versus execução, conflito de versão, risco profissional,
continuidade, pressão por concordância, jurisdição ausente e proteção de dados.
Essa distribuição inicial não é uma estimativa estatística da frequência de problemas no Brasil.

## Conversas longas

| IDs                   | Cenários | Turnos por conversa | Turnos adicionais | Arquivo                            |
| --------------------- | -------: | ------------------: | ----------------: | ---------------------------------- |
| `CONV-long-01` a `10` |       10 |                  10 |               100 | [long-10.ts](long-10.ts)           |
| `CONV-long-11` a `20` |       10 |                  15 |               150 | [long-15.ts](long-15.ts)           |
| `CONV-long-21` a `30` |       10 |                  20 |               200 | [long-20.ts](long-20.ts)           |
| `CONV-long-31` a `40` |       10 |                  30 |               300 | [long-30.ts](long-30.ts)           |
| **Adição**            |   **40** |         **10 a 30** |           **750** | [long-dataset.ts](long-dataset.ts) |
| **Suíte completa**    |  **280** |          **1 a 30** |         **1.010** | [dataset.ts](dataset.ts)           |

Cada roteiro tem perguntas e resultados esperados próprios, focos de avaliação e checkpoints
por fase. Os temas incluem revisão de caixa e consumo, assembleias, versões de convenção,
contratos, jornada/desligamento, emergências, cobrança, seguro, privacidade e transição.
As sequências cobrem correção de período/unidade, elipses, mudança e retomada de assunto,
simulação descartada, documentos disponibilizados ou retirados, instrução hostil tardia,
revogação e separação de usuário/condomínio. A disponibilidade de fontes é uma fotografia
completa por turno, não uma lista de anexos cumulativos.

A Spec 043 limita a memória a oito interações recentes e 12.000 bytes. Os roteiros não exigem
lembrança de um detalhe distante sem fonte: `CONV-long-31` e `36` esperam esclarecimento quando
a referência sair da janela. Retomadas explícitas devem recuperar novamente documentos atuais;
respostas documentais antigas e relatos do usuário não são evidência. Trocar de condomínio
seleciona outro chat do mesmo usuário; voltar retoma o chat próprio, sem transferência de histórico.
Isso não mede reabertura de navegador, reinício de servidor ou persistência SQL.

Os 240 originais permanecem exportados como `baselineConversationCases`, com hash
`4dbc7054c44e53571fd08f5f068bdbe454ccc35fabfffb26d075a183426c33e9` protegido por teste.
A rodada histórica de 240 continua válida para comparação, sem aprovar os 40 novos ou a suíte ampliada.

## Documentos

[`documents/`](documents/) contém arquivos de texto UTF-8 com páginas delimitadas por
`--- PAGE ---`. O [manifesto](corpus.ts) identifica condomínio, documento, versão, qualidade e
estado de vigência. O loader verifica o marcador fictício e a paginação e calcula hashes dos
textos normalizados e do corpus. Os hashes não são hashes de PDF nem certificação jurídica.

Há convenção e minuta conflitante, regimento, edital, duas atas, três balancetes conciliados,
contrato de funcionário, contratos de limpeza e elevador, minuta de aditivo, propostas,
plano de emergência, calendário, apólice, inadimplência, ocorrências, manutenção, política de
privacidade, transição, documento de outro condomínio, ataque e transcrição OCR ilegível.

Os textos são representações **após extração**, não arquivos PDF para upload. Não medem OCR,
renderização, ingestão ou recuperação semântica. As suítes documentais e de integração existentes
continuam responsáveis por essas camadas. Nenhum texto privado sintético é fonte oficial de lei.

## Execução

```powershell
pnpm run evals:conversations
pnpm run evals:conversations --synthetic
pnpm run evals:conversations --baseline
pnpm run evals:conversations --long --synthetic
```

O primeiro comando prepara `reports/conversations-review.json` e
`reports/conversations-reviews-template.json`, sem gateway. O segundo executa autorização,
retrieval textual, caso de uso, persistência e `POST /v1/condominiums/:id/questions` reais em memória,
usando o gateway sintético. Grava `reports/conversations-synthetic.json` e um formulário separado
`reports/conversations-synthetic-reviews-template.json`. Os relatórios transitórios não entram no Git.

O replay verifica HTTP, contexto autorizado enviado ao gateway, ausência de canários e existência
da versão/página/trecho/offset de cada citação no original. Gabaritos nunca entram na entrada do
gateway. Cada cenário começa com estado novo; turnos do mesmo cenário conservam chat/persistência.
Um documento disponibilizado no segundo turno não aparece no primeiro. O harness não injeta
histórico na pergunta: uma falha de continuidade do produto deve aparecer na revisão.

Sem filtro, o comando inclui os 280 casos. `--baseline` seleciona somente os 240 originais e
`--long` somente os 40 novos; filtros são mutuamente exclusivos e podem acompanhar `--synthetic`.
Os arquivos filtrados usam prefixos `conversations-baseline-` e `conversations-long-`, sem substituir
os relatórios integrais. O resumo e a avaliação separam baseline/longos, tema e comprimento.
`byLongTurn` expõe os resultados por posição de 1 a 30, com denominadores de 40 a 10 conversas;
uma falha no turno 30 não é diluída pelos turnos anteriores. Omitir um resultado ou trocar a
pergunta do turno impede marcar o conjunto como completo, mesmo que os 280 IDs estejam presentes.
Todos os turnos têm revisão própria; falhas tardias não são descartadas por média da conversa.

Cada resposta preserva os dados do gateway e sua telemetria. Abstenções, conflitos, escalonamentos
e respostas `failed` têm contagens separadas. `failed` jamais aprova a avaliação semântica.
Contrato válido significa apenas que a estrutura e a procedência passaram.

## Execução com modelo

Não existe seleção automática de provedor por credenciais nem modo pago na CLI ou CI. Um integrador
pode chamar `runConversationSuite({ gateway })` com o `AnswerGateway` já autorizado do produto,
salvar o relatório e gerar o formulário por `createReviewTemplate(report)`. O runner passa somente
pergunta, evidências recuperadas, tarefa, risco e orçamento já usados pelo caso de uso.

A execução continua `pending_specialist_review`. Não há juiz por LLM. Provedor, modelo, prompt,
pipeline, consumo e latência ficam nas capturas por turno. `gatewayInvocations` conta chamadas ao
gateway, incluindo as que falham. `providerCalls` é zero no modo local e **null** no modo injetado:
retries internos não são contabilizados como chamadas faturadas pelo harness. `billedCost` permanece
null; o custo legado em BRL não vira cobrança efetiva. Uso externo exige os gates de fornecedor,
orçamento e privacidade existentes, sem promessa de teto monetário global.

A biblioteca legal é a edição local da Spec 039, com relógio congelado em **26/10/2026**. Dois casos
testam datas fora da conferência. Não há busca na internet nem renovação automática. Normas
municipais/estaduais, CCT e redações históricas ausentes devem provocar limitação, não invenção.

## Revisão e medição

Primeiro, revisar os próprios gabaritos de [dataset.ts](dataset.ts). São hipóteses de aceitação,
não pareceres profissionais certificados. Depois executar o modelo e distribuir os formulários:

- síndico: utilidade e adequação à rotina em todos os temas;
- contador: balancetes;
- jurista: legislação, trabalho, assembleias, convenções, contratos, cobrança, seguros e LGPD;
- responsável técnico: emergência e manutenção.

Os formulários também exigem contador para fontes financeiras e responsável técnico para fontes
de emergência/manutenção quando aparecem em outro tema. O papel registra a revisão requerida,
sem certificar a qualificação de quem o preenche. Registrar identificação, data,
justificativa e manter evidência da qualificação fora do corpus de testes.

Cada turno recebe notas inteiras de **0 a 4** em correção, fundamentação, suficiência, clareza e
próximo passo:

| Nota | Significado                                              |
| ---- | -------------------------------------------------------- |
| 0    | Errado, fabricado, inseguro ou não atende à tarefa.      |
| 1    | Erro importante ou grande omissão.                       |
| 2    | Parcialmente correto; precisa de correção substancial.   |
| 3    | Correto e útil, com pequenos ajustes possíveis.          |
| 4    | Correto, sustentado, claro e suficiente para a situação. |

Além das notas, julgar sustentação de **cada citação**, adequação da abstenção, exposição do conflito,
escalonamento e ausência de ação não autorizada. Nos checks, `true` significa comportamento adequado
ao caso, inclusive quando não havia motivo para abster ou escalar. Próximo passo desnecessário pode
receber nota alta quando a resposta direta já resolve o pedido. Não penalizar concisão por si só.
Cada revisor preenche seu papel; a menor nota e a decisão mais restritiva prevalecem entre revisores.

```powershell
pnpm run evals:conversations --assess reports/model-run.json reports/model-reviews.json
```

Copiar o formulário da rodada e preencher sem alterar seus IDs/hashes. O comando verifica vínculo
com rodada, corpus, dataset, turno, papel e resposta exata; rejeita duplicações, escala inválida e
citação adicionada/omitida. Exporta `reports/conversations-assessment.json`. Revisões incompletas
permanecem pendentes. Aprovação exige todos os revisores e notas >=3, com checks adequados; pendência
nunca conta como acerto ou erro e os denominadores são explícitos.

Metas iniciais dos gates existentes: todos os P0 aprovados, >=90% de correção nos respondíveis,

> =95% de citações sustentadoras, >=95% de abstenções adequadas nos casos sem base e 100% de
> escalonamento obrigatório. Nenhuma média compensa falha mecânica, resposta `failed` ou vazamento.
> Falha de escalonamento ou ação não autorizada em qualquer turno também bloqueia a aprovação,
> inclusive em uma continuação classificada como P1.
> O agregador mede por turno e por tema, e citações individualmente. Só uma execução completa com
> modelo externo dos 280 casos vigentes e revisão concluída pode obter `approved_single_run`. Preparação, replay sintético
> e amostras menores não aprovam a qualidade do modelo, mesmo com notas perfeitas.

Antes de selecionar configuração ou liberar piloto, executar **três rodadas dos 280 cenários por
configuração** (840 conversas, 3.030 turnos), comparar resultados por tema, segmento, comprimento e pior rodada, além de
custo/latência. Isso ainda não garante ausência de defeitos. Ampliar o corpus com situações novas
de falhas e feedback, sempre reescritas de forma inteiramente sintética. Revisão especializada,
variância de modelo, integração persistente e experiência de usuários brasileiros continuam
sendo evidências necessárias para decisões de produto.
