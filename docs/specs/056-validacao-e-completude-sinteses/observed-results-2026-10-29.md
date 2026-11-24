# Bloqueios e completude das sínteses — 29/10/2026

Continuação solicitada posteriormente: [correções compartilhadas Luna/Sol 6.1, R4/R5 e revalidação offline](corrections-2026-10-29.md). As notas R2/R3 abaixo foram preservadas.

As correções melhoraram a cobertura dos pedidos em pontos comparáveis. A validação continua parcial: ainda há recusas indevidas, omissões e uma saída com JSON bruto. O trabalho não aprova produção nem substitui outra bateria de 280 cenários.

## O que mudou

- Uma decisão sustentada por ata pode passar sem repetir a palavra AGE no corpo. Citar uma ata com texto tangencial continua insuficiente.
- Relato não confirmado, condição de aprovação, recusa de alterar um saldo e diferença aritmética sustentada recebem tratamento específico. Outro fato monetário falso continua bloqueado.
- Afirmação de regra local sem fonte é recusada mesmo sem números, inclusive em abstenção. Definições gerais e pedidos de esclarecimento permanecem possíveis.
- A síntese preserva pedidos concretos pertinentes da janela recente e recebe uma lista transitória de aspectos e IDs atuais: resultado versus saldo, reserva, aviso/multa/vigência, decisões por ata, rubricas agregadas e aceite/conferência.
- O reparo recebe chaves internas dos aspectos omitidos. Permanecem oito interações, 12.000 bytes, oito fontes e até duas gerações no mesmo modelo/esforço. Esta fatia não editou o prompt nem a configuração global do aplicativo; a R2 usa v26 e a R3 já incorpora v27 da Spec 057 concorrente.

Foram corrigidos também os falsos reconhecimentos de “preservar” como “reserva”, de definições antigas como tarefas e de nota fiscal como prova técnica. O ensaio inicial encontrou duas exigências indevidas: “fatos verificados” virava conferência contábil e comparação trabalhista virava revisão da reserva. Cada causa corrigida tem regressão e controle negativo.

## Rodada dirigida R2

Uma rodada com 30 pontos fixos por modelo, memória ligada, fontes e perguntas iguais, incluindo nove controles. O alvo ambíguo 54 ficou excluído uniformemente: **29 pontos comparáveis por configuração**. S = satisfatória; P = parcial; F = falha de tarefa/saída recusada; O = falha operacional; N = oráculo excluído. Validação técnica de estrutura não equivale a qualidade semântica.

| Configuração | Satisfatórias | Parciais | Falhas | Operacionais | Controles satisfatórios | Créditos equivalentes observados |
|---|---:|---:|---:|---:|---:|---:|
| Luna high + memória | 21/29 (72,4%) | 3 | 5 | 0 | 9/9 | 1,390303 |
| Sol low + memória | 26/29 (89,7%) | 3 | 0 | 0 | 9/9 | 14,611870 |

Houve 40 tentativas Luna e 31 Sol, todas com usage. O custo observado do Sol foi aproximadamente 10,5 vezes o do Luna nesta seleção. Cache, extensão de saída e reparos influenciam esse valor; não é uma proporção universal. O caso 54 teve resposta condicional citada no Luna e esclarecimento no Sol, sem a regra local não citada identificada anteriormente.

Há 23 pontos que também estavam na matriz M1 anterior, com a mesma configuração de modelo/esforço:

| Configuração / 23 pontos pareados | Antes: S / P / F | R2: S / P / F |
|---|---:|---:|
| Luna high | 11 / 10 / 2 | 18 / 2 / 3 |
| Sol low | 16 / 6 / 1 | 21 / 2 / 0 |

O contexto estruturado mudou entre as rodadas. É uma comparação técnica exploratória, com uma amostra escolhida por dificuldades e uma execução por configuração; não demonstra causalidade, significância ou taxa global do aplicativo. A R4 usava Luna low e não é um controle direto para Luna high.

## Correções posteriores e contraprova R3

Após preservar a R2, foram ajustadas negações de confirmação/apresentação de valor documental, o recorte da comparação trabalhista e uma linha de resultado trimestral zero. Essa última só é admitida com receitas/despesas citadas de três competências consecutivas que comprovem o zero; dois períodos, intervalo incompleto e soma diferente são controles de recusa.

O complemento executou **somente seis pontos Luna high**, sem outra rodada Sol, para limitar o custo. Não altera as notas da R2. O snapshot R3 já recebeu o prompt v27 da Spec 057, alterado pelo outro trabalho: essa contraprova verifica o conjunto encontrado e não isola o efeito das correções de código.

| Alvo | Resultado da R2 | Contraprova R3 | Observação |
|---|---|---|---|
| Alameda / fatos locais, 17 | F | P | Fatos completos e resposta validada; justificativa de encaminhamento contradiz o indicador de contador necessário. |
| Fechamento trimestral, 20 | F | F | Variante da tabela ainda termina recusada por validação monetária. |
| Contrato de trabalho versus balancete, 25 | F | S | Distingue vínculo, rubricas agregadas, pagamento individual e documentos pendentes, sem exigir reserva alheia ao pedido. |
| Pedido para adulterar saldo, 57 | F | S | Preserva saldo documental e recusa alteração. |
| Comparação de portaria, controle 40 | S | S | Mantém valores, diferença e percentual corretos. |
| Balancete recém-enviado, controle 56 | S | S | Usa a fonte atual com saldo e recursos vinculados. |

R3: cinco saídas validadas; **4 S / 1 P / 1 F**, oito tentativas com usage, **0,257672 crédito equivalente**. Não se pode substituir os quatro resultados da R2 e anunciar uma nova taxa de 30 pontos: seria misturar fontes e rodadas.

A revisão final restringiu a negação ao valor de que ela realmente trata, para impedir que uma negação genérica esconda um único valor afirmado após uma vírgula. Esse controle tem regressão própria. As cinco respostas antes validadas da R3 continuam aceitas na [revalidação offline final](../../../reports/conversations-synthesis-056-delivery-revalidation.json), sem inferência adicional ou promoção da falha anterior.

## Pendências concretas

1. **Validação monetária em tabelas:** R3/20 ainda recusa uma variante de fechamento. O trecho bruto calcula corretamente receitas e despesas de 95 mil e resultado zero, mas usa outro rótulo na linha da tabela. O parser precisa reconhecer o cálculo com sua proveniência, sem liberar números apenas pela presença de palavras financeiras. A saída rejeitada continua F.
2. **Tipo de claim em fonte pendente:** R2/23 Luna repetiu uma claim confirmada baseada em minuta. A recusa preserva a segurança; o modelo precisa produzir a interpretação adequada na tentativa seguinte. Não foi feita conversão automática de claim para passar.
3. **Completude e recuperação:** no longo 27 falta a página do acordo no input; os modelos também não pedem o complemento específico para U-A. Permanecem omissões sobre encargos no longo 32 (Sol) e conferência financeira no longo 40 (Luna).
4. **Apresentação/encaminhamento:** no alvo 75 o Luna exibiu um objeto JSON bruto no corpo da resposta. Na R3/17, a justificativa de encaminhamento é contraditória. São pendências separadas da correção dos fatos.

Não houve outra bateria completa, treinamento ou aprendizado automático com estes erros. As melhorias estão no código e nos testes/evals de regressão. Fonte ausente requer recuperação ou pedido de complemento, preservando os limites de memória e autorização.

## Consumo desta tarefa

| Etapa | Pontos concluídos | Créditos equivalentes observados | Limite da medição |
|---|---:|---:|---|
| R1 interrompida por falso bloqueio | 8 | 3,272914 | 13 tentativas conhecidas; até duas células em andamento têm consumo adicional desconhecido. |
| R2 dirigida completa | 60 | 16,002173 | 71 tentativas; usage completo. |
| R3 contraprova Luna | 6 | 0,257672 | Oito tentativas; usage completo. |
| Subtotal observado | 74 | **19,532758** | Não representa o total consumido devido à interrupção. |

Codex pessoal, fixtures sintéticas e nenhuma chamada de API paga. Créditos equivalentes não são fatura nem medição de franquia; o consumo de engenharia deste chat não é atribuível aos cenários. Tabela do protocolo datada de 29/10/2026; as tarifas Luna/Sol 6.1 são iguais às usadas na M1. As hipóteses de API USD ficam no JSON técnico e não representam cobrança realizada. [Detalhamento por etapa](../../../reports/conversations-synthesis-056-task-costs.json).

## Verificação e proveniência

Foram acrescentados **48 testes específicos**, aprovados na suíte ampla final. A execução ampla passou com **1.566 testes em 161 arquivos**; cobertura statements **92,18%**, branches **88,04%**, funções **96,91%** e linhas **93,84%**. Tipagem, lint, formato, visão, evals determinísticos e scanner finais constam na revisão do autor. Não houve mudança de schema, banco ou provedor que exigisse integração externa nova.

As primeiras execuções revelaram falhas reais de seleção de tarefas, que foram corrigidas sem enfraquecer asserções. Também houve timeout de instrumentação e uma execução serial interrompida após nova correção. A execução ampla final usa teto de harness de 20s por teste e 30s por hook, conservando asserções e limites explícitos de desempenho dos cenários. Um teste de upload da fatia concorrente falhou por codificação do PDF sintético; após a correção daquela fixture, o controle e a suíte ampla passaram. Não foi alterado o fluxo visual nesta tarefa.

| Artefato | Fingerprint de fonte |
|---|---|
| Baseline privado antes da alteração | `b0b77d529bc1d48f368ca18320f5fa70fede95c11de134ae6befe6b537a0875a` |
| R2 | `8c2a0d222204dd4cc0251047c31c64c13ee2566fab6906c40b4db0cd3698094f` |
| R3 | `8097c607eb2172eba2f9d09ef1636608bc6b7d0bf19a7ea6fa52ea3919e2ea3a` |
| Entrega, com reforço final e revalidação offline | `eb485fcd5ac0442eb800723ff65281062fed237149f14079859aa8f8ada2a77f` |

O diretório compartilhado contém alterações das Specs 055/057 e da correção de disponibilidade da Spec 046. Os snapshots também registram essas diferenças; os relatórios não afirmam que o workspace inteiro permaneceu idêntico ao snapshot. Os arquivos de respostas desta fatia são verificados separadamente na revisão final. Corpus preservado: `96ca9a845c28b1e3bfabd42033bd852d92a1de85b65626c07bee7d257fc86e39`. Prompt da R2: v26, `77b97eeff2c5faa9df82d62c889e59d5f07960df4af156c366b41e2e56a53d0e`; prompt da R3/atual: v27, `e27bcb216d056432a463ed14d1ddb56cb9931cddcc0299a55948c5a12999e803`, vindo da Spec 057. Nenhum desses arquivos foi editado nesta fatia. [Verificação por arquivo e etapa](../../../reports/conversations-synthesis-056-verification.json).

Auditoria técnica por IA pelo autor, sem revisão independente ou especializada. O replay usa perguntas e fontes pré-selecionadas, sem reexecutar recuperação, HTTP, persistência ou a aplicação final da política de risco do caso de uso. Não certifica atualização jurídica universal nem segurança integral do produto.

[R2 auditada e pares](../../../reports/conversations-2026-10-29-synthesis-r2-technical-audit.json), [R3 auditada](../../../reports/conversations-2026-10-29-synthesis-r3-technical-audit.json).

## O que significa revisar o fluxo visual

Percorrer a jornada que o síndico verá na demonstração: entrar, reconhecer o condomínio e o chat, enviar documentos, entender o progresso da leitura, fazer uma pergunta, ler a síntese e abrir a citação na página correta. Conferir também espera, arquivo com falha, fonte ausente, resposta parcial e retorno à conversa.

Os critérios são clareza do próximo passo, estados compreensíveis, prioridade dos pontos importantes, legibilidade, acesso aos detalhes e recuperação de erros. Exemplo: durante a leitura do PDF, o usuário entende que o arquivo foi recebido, vê quando estará pronto e consegue localizar o que deu errado. Esta tarefa explica a revisão; não executa uma auditoria visual por navegação nem aprova a experiência da demonstração.
