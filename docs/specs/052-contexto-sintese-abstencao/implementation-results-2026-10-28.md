# Contexto e abstenção antes da próxima bateria Luna

**Data:** 28/10/2026  
**Status:** implementação e validação local concluídas; nova bateria real pendente.

**Atualização posterior:** o status e os próximos passos abaixo descrevem a entrega anterior à nova autorização. Depois de apresentá-la, o usuário pediu explicitamente a bateria Luna com memória. Ela foi concluída em 28/10; veja [resultados, comparação e limitações](observed-results-2026-10-28.md). As métricas locais abaixo e os resultados históricos foram preservados.

## Mudanças implementadas

| Problema | Mudança | Limite preservado |
|---|---|---|
| Retomadas como “finalize”, “termine”, “aquela” e “reenviei” não usavam o histórico na busca | Reconhecimento dessas referências e de pedidos de evidência faltante para aceite; “mudar de assunto” corta o contexto anterior | Somente janela recente autorizada, sem procurar mensagens antigas |
| O modelo perde os itens do pedido ao concluir | Foco efêmero com perguntas literais e tópicos explícitos, enviado no contexto existente | Sem resumo de fatos, cópia de resposta documental, fonte nova ou persistência adicional |
| Convenção com taxa do salão aparece em pergunta de saldo | Identificação de falta de fonte financeira pertinente e orientação geral com lacuna explícita | Não importa saldo de outro condomínio nem afirma ausência do arquivo em todo o acervo |
| Contrato menciona CCT, mas o instrumento não foi recuperado | Lacuna de instrumento coletivo no contexto do pedido de confirmação de piso | Não confirma piso, aplicabilidade, vigência ou regularidade trabalhista por inferência |
| Síntese deixa um tópico explícito de fora | Guarda limitada de omissão lexical, com uma correção usando o mesmo modelo e as mesmas fontes | Menção ao tópico não prova completude ou verdade; claims e citações continuam validados |
| Orientação geral inválida termina imediatamente em aviso genérico | Uma correção com código controlado e auditoria de todas as tentativas | No máximo duas tentativas por caminho; falha de processo e conteúdo protegido não disparam repetição indiscriminada |

A guarda considera tópicos na resposta principal, depois da sanitização, sem contar uma atenção que será removida da apresentação. Excluir salário/contratos de um pedido não obriga mencioná-los; “resumo seguro” não cria um pedido de apólice, e disponibilidade de agenda não cria um pedido financeiro. Os controles preservam perguntas conceituais e fontes financeiras efetivamente recuperadas.

O foco cabe no orçamento de 12.000 bytes junto com os turnos, sem cortar ou acrescentar interações. Se não houver espaço, o foco pode ser reduzido ou omitido. O histórico permanece limitado a oito interações; o pedido original fora dessa janela continua exigindo esclarecimento. Memória desligada não recebe esse contexto.

## Validação local

As 22 regressões novas em `tests/unit/answer-task-context.test.ts` passaram. Elas cobrem referências, fronteira de assunto, bytes UTF-8, fontes tangenciais, CCT, síntese geral/documental, claims inválidos, teto de tentativas, baixa qualidade, revogação entre tentativas e condição Luna exclusiva inclusive em alto risco. São testes determinísticos com gateways sintéticos; não medem a qualidade do modelo real.

Typecheck, lint, formatação e alinhamento das 52 specs passaram. O hash de `prompt-catalog.ts` é idêntico ao início da tarefa: texto e versão v26 do system prompt não foram alterados. Nenhuma dependência, provedor, schema, migração ou configuração de `.env.local` foi adicionada ou modificada.

A primeira suíte ampla encontrou um teste de upload incompatível com uma alteração concorrente da interface; essa alteração e o teste foram preservados. A tentativa seguinte teve o diretório temporário de cobertura removido enquanto outra suíte rodava no mesmo checkout. A repetição final usa `.local/luna-quality-coverage-final`, fora do diretório compartilhado `coverage/`, mantendo os mesmos limites e asserções. Os logs anteriores permanecem disponíveis.

Resultado final: **153 arquivos e 1.370 testes aprovados**, incluindo 22 novos desta fatia. A contagem global também inclui testes de upload acrescentados pelo trabalho concorrente; eles não são atribuídos à Spec 052. Cobertura: statements **91,89%**, branches **87,39%**, funções **96,79%** e linhas **93,59%**. O novo módulo de contexto atingiu 100% nos quatro indicadores, o que verifica os caminhos determinísticos exercitados e não prova qualidade semântica.

Logs de verificação: `.local/luna-quality-gates.log`, `.local/luna-quality-gates-final.log` e `.local/luna-quality-gates-isolated-coverage.log`; relatórios finais em `.local/luna-quality-coverage-final/`. Scanner final aprovado: nenhum padrão conhecido encontrado; log `.local/luna-quality-secrets.log`. Não houve envio de perguntas/documentos a modelos nesta etapa.

## Próxima bateria preparada

| Campo | Plano conferido |
|---|---|
| Condição | `luna-memory-on` |
| Modelo | `gpt-6-luna` |
| Uso de Sol | Nenhum; não há roteamento nesta condição |
| Memória | Ligada |
| Cenários | 280, sendo 240 curtos e 40 longos |
| Turnos | 1.010 |
| Esforço | `low`, igual à referência anterior |
| Concorrência sugerida | 2 cenários, para reduzir competição no computador |
| Chamadas do plano | Zero |

`pnpm run evals:luna` mostra somente o plano. O comando para a execução futura é:

```powershell
pnpm run evals:luna --execute --run-key=2026-10-28-luna-quality-r1 --rounds=1 --concurrency=2
```

O nome da execução é novo; uma mudança de data pode usar outro identificador. O runner congela as fontes e preserva checkpoints, tokens, cache, tentativas e falhas. A tabela de tarifas contém modelos históricos, mas somente a condição Luna é executada.

O plano conferido está em `.local/luna-quality-plan.json`. Dataset e corpus permanecem com hashes `4e721a0c6f408791f0aca1d3ac45d0d82ed890549d8b5dd4fb2ffbeef21a193b` e `96ca9a845c28b1e3bfabd42033bd852d92a1de85b65626c07bee7d257fc86e39`. Casos, oráculos, relatórios anteriores e o PDF executivo não foram reescritos.

## O que ainda precisa ser medido

A bateria real não foi iniciada, conforme o pedido de retornar antes de fazê-la. A referência Luna anterior é 51/79 satisfatórias na amostra auditada, com 22/40 fechamentos longos satisfatórios. Esses valores não foram atribuídos ao código novo.

A próxima execução deverá medir melhora ou regressão, omissões nas sínteses, precisão dos pedidos de documento, falsos positivos das guardas e consumo das correções. Foco literal e checagem lexical não garantem qualidade semântica; identificar um documento pelo título não certifica seu conteúdo, jurisdição ou vigência. Repetições e revisão especializada continuam necessárias antes de aprovar piloto.
