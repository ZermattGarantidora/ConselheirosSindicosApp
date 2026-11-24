# Spec 060 — Protocolo, fala natural e completude após a rodada 059

**Status:** implementação e revalidação sintética concluídas; limitações registradas, sem prontidão para produção  
**Responsável:** desenvolvimento Alvitra  
**Atualizado em:** 2026-11-06

## 0. Alinhamento com a visão do projeto

### Partes do briefing atendidas

| Dimensão da visão | Seções do briefing | Como esta spec contribui |
|---|---|---|
| Problema e hipótese | §§2, 4 | Corrige falhas observadas ao interpretar perguntas e comparar documentos. |
| Público | §3 | Atende o síndico que confere decisões, contas e contratos na conversa. |
| Proposta de valor | §§1, 5–6 | Mantém fala natural, evidência e próximos passos pertinentes. |
| Prioridades do MVP | §7, Blocos 2, 3 e 6–7 | Corrige o comportamento já autorizado, sem nova interface ou expansão funcional. |
| Segurança e confiança | §§8–10 | Mantém evidência atual, isolamento, abstenção, conflitos e decisão humana. |
| Validação e métricas | §§12–14 | Repete a bateria congelada, com regressões, custos e auditoria comparável. |

### Limites respeitados

Sem memória global, resumo persistente, ampliação de oito interações/12.000 bytes/oito fontes,
novo provedor, API paga, dados reais, execução de ferramentas ou implantação. O histórico durável
da Spec 058 permanece intacto. Não alterar o system prompt nem oráculos para favorecer modelos.

O gate competitivo permanece atendido: a correção acontece no chat autorizado, reduz falhas de
evidência/utilidade, conserva isolamento e confirmação humana e melhora as relações verificáveis
entre páginas e versões. Regressões e a mesma bateria medem o benefício; não há serviço ou estado
permanente adicional. Nenhum bloco posterior é antecipado.

### Divergências da visão

Nenhuma.

### Checklist de alinhamento

- [x] O briefing completo foi lido na versão atual.
- [x] A spec resolve um problema ou testa uma hipótese descrita no briefing.
- [x] O público e a proposta de valor permanecem coerentes.
- [x] Prioridades e itens fora do escopo foram respeitados.
- [x] Princípios de segurança, custo e confirmação humana foram preservados.
- [x] Critérios de sucesso contribuem para as métricas de validação do briefing.
- [x] Não existe divergência silenciosa.

## 1. Objetivo

Corrigir protocolo, JSON na fala, recuperação e completude pendentes da Spec 059 e repetir a
bateria completa com Luna high e Sol 6.1 low, conforme pedido explícito do usuário.

## 2. Promessa testada

> A resposta permanece legível e fundamentada, usa as páginas necessárias e distingue falha do
> protocolo, falta de fonte e contexto insuficiente.

## 3. Usuário primário

Síndico que analisa contas, contratos, cobranças e providências humanas na mesma conversa.

## 4. Escopo

Diagnóstico mínimo de eventos Codex, compatibilidade estrita com eventos passivos documentados,
rejeição de envelopes na fala geral/documental, reserva de facetas em perguntas sobre várias
unidades, requisitos de fechamento pertinentes e retentativa limitada com feedback específico.

## 5. Fora do escopo

Ignorar ferramentas desconhecidas, extrair uma resposta de envelope inválido para promovê-la a
acerto, inventar fatos ou tópicos fora da janela, enfraquecer validações de valores/citações,
reescrever mensagens antigas, alterar notas históricas ou liberar produção.

## 6. Pré-condições

Specs 043, 052–056 e 058–059; ADRs 0031, 0032 e 0037. Sessão ChatGPT já autorizada, somente dados
sintéticos. Preservar a rodada 059 e o estado preexistente do workspace antes das mudanças.

## 7. Requisitos funcionais

### RQ-6001 — Eventos compatíveis sem habilitar ações

Classificar eventos por seu contrato, sem tratar todo item como ferramenta. Eventos passivos
conhecidos podem ser descartados após validação de estrutura; seus textos nunca viram instrução,
resposta ou memória. Ferramentas, tipo desconhecido, erro e término inválido continuam recusados.
Diagnóstico registra somente códigos e tipos limitados, nunca conteúdo de prompt, evento bruto,
credencial ou texto de documento. Não presumir a causa das três falhas históricas sem evidência.

### RQ-6002 — Fala sem envelope de protocolo

Envelopes com `answer` ou `response`, inclusive cercas Markdown e texto adjacente, são recusados
nos caminhos geral e documental. Reparo limitado solicita fala natural; não extrair/reclassificar
o conteúdo automaticamente. JSON técnico legítimo permanece permitido.

No adaptador Codex opt-in de documentos sintéticos, o contrato técnico deve corresponder ao
caminho executado: sem evidências, solicitar somente fala natural; com evidências, manter o JSON
estruturado com citações. As instruções sobre `answerMode` e claims do JSON não entram no prefixo
do caminho de texto livre. A variante fica versionada na telemetria. Isso corrige o formato do
adaptador, sem alterar a personalidade, desativar a rejeição de envelopes ou adicionar tentativas.

### RQ-6003 — Facetas e referências pertinentes

Síntese de ambas/cada unidade conserva saldo, proposta, aceite e prova de pagamento das referências
atuais dentro das oito fontes, sem recuperar fonte removida ou baixa qualidade. Correção singular
continua excluindo a referência superada. Contrato e minuta preservam campos disponíveis por versão.

O título ou cabeçalho repetido de um instrumento não demonstra a faceta de uma página. Na reserva
de proposta/acordo, priorizar o trecho que descreve condições e seu estado de aceite ou pagamento,
em vez de considerar suficiente a palavra “acordos” no cabeçalho da página de principal. A rodada
congelada que revelou essa lacuna permanece preservada; a versão corrigida exige nova rodada.

### RQ-6004 — Completude com limites verificáveis

Fechamentos exigem somente aspectos pertinentes ao pedido recente e sustentáveis pelas fontes
atuais. Comprovantes, segregação de reserva, conflitos, aviso/multa e avaliação/liberação técnica
não desaparecem quando pedidos. A detecção considera equivalências de linguagem e negações sem
aceitar números, condições ou fatos errados. Reparo informa categorias faltantes, sem fornecer
gabarito. Contexto antigo ambíguo exige esclarecimento, e tópicos fora da janela não são inventados.

Ao inferir referências de unidades pelas fontes atuais, exigir identificação de unidade ou linha
financeira correspondente. Palavras hifenizadas de metadados, como “data-base”, não criam entidades
nem requisitos de acordo. Um próximo passo prudente não deve ser recusado por uma entidade espúria;
omissões das unidades efetivamente identificadas continuam detectadas.

Em consultas com fonte pendente, o schema exige interpretação conservadora de todas as claims
documentais da comparação, evitando incentivar uma troca de citação para manter o rótulo factual;
não corrigir essa classificação depois da geração. Retorno explícito à
competência corrigida não herda exigência de comprovante de outro mês. Diferença entre recebimentos
e pagamentos pode expressar resultado, conservadas as guardas de cálculo e segregação.

O gateway determinístico identificado como sintético deve conseguir exercitar um rascunho de
pauta a partir do contexto recente, em vez de responder sempre com a mesma recusa sem documentos.
Pode retomar um título explicitamente informado pelo usuário ou um rascunho geral validado ainda
presente na janela, aplicar correção e manter a conferência de versões como pendência. O título
é preferência conversacional, não fato documental. Sem referência suficiente, pede confirmação
sem inventar título ou decisões. Não recebe ID de caso nem gabarito, não busca turnos antigos e
não cria uma resposta pronta no gateway generativo do produto. Os validadores de cobertura e
segurança continuam aplicados; o replay sintético permanece inelegível para qualidade de modelo.

### RQ-6005 — Revalidação íntegra

Após gates e revisão do delta, executar uma rodada nova: 280 cenários/1.010 turnos por modelo,
Luna high/Sol 6.1 low, concorrência quatro, mesmo corpus/dataset/alvos e exclusão 54. Auditar 80
posições por modelo, 79 comparáveis, registrando tentativas, falhas dentro/fora da amostra,
hashes, consumo conhecido/desconhecido e limitações. Sem reroll para substituir resposta ruim.

Complemento de 06/11/2026: preservar a bateria histórica e a rodada que revelou quatro envelopes
e `CONV-long-36/30`; acrescentar regressões com títulos/perguntas alternativos. Reexecutar os 50
casos semânticos com o gateway local autorizado, os 280 contratos de conversas e a sequência
completa de 30 turnos com IA real. Esse recorte não é nova comparação integral Luna/Sol nem
aprovação especializada; toda falha nova permanece registrada na rodada correspondente.

## 8. Contratos

O diagnóstico do protocolo expõe somente enums/tipos sanitizados e limitados. Requisitos de
completude continuam dados internos controlados, sem número ou resposta do oráculo. Fonte atual e
autorização vigente prevalecem sobre qualquer fala anterior. O novo run usa identificação própria.

## 9. Requisitos não funcionais

Zero acesso cruzado, ferramenta executada por instrução documental ou exposição de segredo;
regressão sintética por defeito; cobertura global dos quatro indicadores >=80%; memória e
recuperação dentro dos limites existentes. Não alterar as migrações já aplicadas.

## 10. Critérios de sucesso

Regressões e gates aplicáveis aprovados; diagnóstico e correções rastreáveis; bateria completa e
íntegra, com auditoria e pendências explícitas. Percentual maior é resultado observado, não motivo
para ajustar rubrica, excluir falha ou promover abstenção genérica a acerto.

## 11. Questões em aberto

O tipo de evento responsável pelas falhas antigas não foi preservado; reprodução e documentação
atual delimitarão a correção. A janela limitada pode exigir repetir tópicos antigos. Validação
profissional, revisão independente e lançamento permanecem gates separados.

## 12. Resultado da revalidação

A [rodada final 060b](results-2026-10-31.md) concluiu 560 cenários e 2.020 turnos, com
160 registros auditados e verificação de integridade aprovada. Na amostra fixa de 79 posições
comparáveis por condição, Luna high teve 71 satisfatórias, sete parciais e uma falha (89,9%);
Sol 6.1 low teve 76 satisfatórias e três parciais (96,2%). Não se trata de acurácia global,
revisão cega ou aprovação profissional. A rodada intermediária e todas as falhas foram preservadas.

As regressões passaram em 1.717 testes de unidade/E2E e 15 integrações sintéticas, com cobertura
dos quatro indicadores acima de 80%. A recuperação da proposta e a inferência de unidades foram
confirmadas nos fechamentos de 20 e 30 turnos, sem ampliar fonte ou memória.

Persistem omissões de completude e três respostas em modo `failed` por evento MCP recusado:
CONV-crosscutting-17/1 nos dois modelos e CONV-long-39/8 no Luna. A última integra a amostra e
foi classificada como falha. O diagnóstico identifica `item.started/mcp_tool_call`; não permite
inferir efeito externo nem a causa dos eventos históricos. O conteúdo de ferramenta não foi
promovido a resposta documental. Revisão independente, validação profissional e critérios de
lançamento seguem pendentes; esta spec não autoriza produção ou merge.

## Gate para mudar o status

Complemento de 06/11/2026: os quatro envelopes da bateria posterior e o fechamento de pauta
receberam correções e regressões próprias. A [revalidação dirigida](results-2026-11-06.md)
preserva as rodadas e as pendências distintas; não substitui a comparação histórica nem
declara prontidão de produção.

Concluir aceitação, rastreabilidade, regressões, revisão do delta e relatório da rodada. Não marcar
como pronta para produção enquanto existirem gates de lançamento ou revisão independente pendentes.
