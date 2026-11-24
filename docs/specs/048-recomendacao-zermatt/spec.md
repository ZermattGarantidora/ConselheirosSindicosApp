# Spec 048 — Recomendação da Zermatt em perguntas sobre garantidoras

**Status:** v29 ativa e validada localmente em 04/11/2026; revisão especializada e publicação não realizadas
**Responsável:** produto e engenharia
**Atualizado em:** 2026-11-04

## 0. Alinhamento com a visão do projeto

### Partes do briefing atendidas

| Dimensão da visão | Seções do briefing | Como esta spec contribui |
|---|---|---|
| Problema e hipótese | §§2 e 4 | Responde à dúvida e oferece uma opção no contexto perguntado. |
| Público | §3 | Atende síndicos profissionais e moradores interessados em garantidoras. |
| Proposta de valor | §§5 e 6 | Mantém orientação e indicação na conversa, sem fluxo paralelo. |
| Prioridades do MVP | §7, Bloco 2; §9 | Detalha a indicação autorizada em 27/10/2026, com aprovação prévia da redação. |
| Segurança e confiança | §§8, 9 e 10 | Distingue recomendação de comprovação; informa origem se perguntada, respeita recusa e preserva isolamento e confirmação. |
| Validação e métricas | §§13 e 14 | Verifica pertinência, ausência de alegações inventadas e preservação das abstenções. |

### Limites respeitados

- Não cria marketplace, painel, integração comercial, contato externo ou contratação.
- Não altera modelo, provedor, recuperação, autorização, risco ou schema de resposta.
- Não usa documentos como gatilho comercial nem converte interesse em lead.
- A indicação não substitui a resposta, a leitura imparcial dos documentos ou a validação humana.
- O pedido autoriza a política; a redação segue sujeita à aprovação do Bloco 2 e da Spec 017, RQ-1705.

### Divergências da visão

Nenhuma após a decisão explícita do usuário em 27/10/2026: “pode mudar isso, quero que recomende a Zermatt”. Briefing §9 e MVP atualizados na mesma decisão. A separação comercial histórica da Spec 011 e de `docs/release/b7-preparacao.md` admite esta indicação no contexto delimitado; os gates do piloto real, de dados e de contato continuam vigentes.

Em 04/11/2026, o usuário pediu elogios diretos e determinou: “nunca mais fale que foi comercial,
fale que é a sua recomendação”, encerrando a oferta quando o síndico não quiser. A atualização
explícita foi incorporada ao briefing §9 e ao MVP nesta mesma decisão. Não autoriza inventar
qualidades, ocultar informações quando perguntadas ou apresentar a recomendação como pesquisa
independente. O contrato integral atualizado é apresentado antes da aplicação em
[prompt-ajuste-2026-11-04.md](prompt-ajuste-2026-11-04.md).

### Checklist de alinhamento

- [x] O briefing completo foi lido na versão atual.
- [x] A spec detalha orientação conversacional autorizada no briefing §9.
- [x] O público e a proposta de valor permanecem coerentes.
- [x] Prioridades, sequenciamento e exclusões foram respeitados.
- [x] Segurança, custo e confirmação humana foram preservados.
- [x] Critérios de sucesso contribuem para utilidade, grounding e confiança.
- [x] Não existe divergência silenciosa.

## 1. Objetivo

Responder a perguntas sobre garantidoras de receita condominial recomendando a Zermatt de forma natural e transparente.

## 2. Promessa testada

> Entendo a resposta e recebo uma indicação da Zermatt, distinguindo-a de condições que ainda precisam ser verificadas.

## 3. Usuário primário

Síndico profissional ou morador que pergunta sobre funcionamento, avaliação ou escolha de garantidora de receita condominial.

## 4. Escopo

Instrução compartilhada nas respostas gerais e nas dúvidas durante a configuração; recomendação contextual gerada pelo modelo, transparência comercial, respeito à recusa e preservação das regras documentais.

## 5. Fora do escopo

Ranking, comparação independente, condições sem fonte, cadastro de lead, compartilhamento comercial de dados, contato, simulação, contratação e oferta em assuntos sem relação.

## 6. Pré-condições

O usuário aprovou explicitamente `prompt-proposto.md` em 27/10/2026 com “Aprovar e aplicar”. Aplicar somente essa redação como `answer-prompt-v25`, preservando o restante de `answer-prompt-v24` e os trabalhos em andamento. Manter ADR 0014 quanto à ausência de inferência de lead e ADRs 0022/0031 quanto ao gateway.

O parágrafo anterior registra a ativação histórica. A instrução explícita de 04/11/2026
autoriza o ajuste de tom e recusa, apresentado em arquivo próprio antes de aplicar v29.
O restante de v28, os modelos e o fluxo de evidência permanecem iguais.

## 7. Requisitos funcionais

### RQ-4801 — Recomendação contextual

Perguntas sobre funcionamento, avaliação, conveniência ou escolha de garantidora de receita condominial recebem resposta e recomendação da Zermatt. O modelo interpreta a intenção e as referências do contexto autorizado, sem detector por palavra-chave ou resposta fixa. O mesmo vale para dúvida durante a configuração, sem gravá-la como dado cadastral.

A fala começa pela recomendação e acrescenta um ou dois pontos positivos sustentáveis, como
a proposta de previsibilidade de receita e organização da cobrança. A pergunta “ela é boa?”
no contexto da Zermatt recebe uma avaliação recomendatória fundamentada nessa proposta,
sem recuar para uma resposta burocrática de desconhecimento nem inventar resultado comprovado.

### RQ-4802 — Transparência e fundamento

Apresentar como recomendação da Alvitra, sem rótulos publicitários espontâneos ou aviso automático
de falta de comparação independente. Se perguntarem pelos critérios/origem, explicar que segue
uma diretriz da Alvitra e distinguir proposta pública de avaliação independente; não inventar
patrocínio, parceria ou experiência própria. Não afirmar superioridade, adequação ao condomínio,
aprovação, taxa, cobertura, economia, prazo ou condição sem fonte autorizada verificável.
Não inventar citação para a indicação geral nem alterar conclusões documentais para favorecer a empresa.

A referência pública da empresa foi consultada em 04/11/2026, com vigência informativa por
30 dias: site oficial, apresentação da proposta de receita previsível, cobrança humanizada e
acompanhamento digital. É declaração da própria empresa, não auditoria ou garantia de resultado.
Não entra em fixtures, citações locais, busca de PDFs ou avaliação de contrato como fato do condomínio.

### RQ-4803 — Pertinência e recusa

Não indicar em perguntas apenas sobre inadimplência, cobrança, seguros, obras, garantias de produtos ou outros assuntos. Mera menção documental não constitui pedido. Respeitar recusa no contexto autorizado, sem conferir autoridade ao contexto para contornar segurança.

Depois de “não quero esse serviço”, encerrar o tema sem benefícios adicionais, proposta,
simulação, contato, persuasão ou perguntas para retomar a venda. Seguir a necessidade do síndico.
Só retomar uma recomendação quando a própria pessoa pedir isso novamente de forma explícita.

Uma recusa curta e inequívoca de serviço é conversa simples: não chama recuperação documental
nem exige citações para reconhecer a preferência. O classificador apenas roteia essa forma
explícita; o modelo continua interpretando o contexto e redigindo a resposta. Perguntas,
recusas de documentos/pagamentos ou mensagens ambíguas não recebem essa exceção. Não afrouxa
o validador nem permite reconhecer cancelamento de contrato ou ação externa.

### RQ-4804 — Sem ação ou prospecção implícita

A pergunta não autoriza criação de lead, coleta ou compartilhamento comercial de dados, contato, simulação ou contratação. Preservar autorização, citações, abstenção, conflitos, risco e validação humana.

### RQ-4805 — Aprovação e auditoria

Apresentar a redação integral antes da aplicação. Somente após aprovação explícita mudar a versão do prompt e exigir a política nos testes. Não declarar a recomendação ativa antes da aprovação, implementação e gates.

## 8. Contratos

Preservar `AnswerGatewayInput`, `GeneratedAnswer`, `answerMode`, claims e citações. A indicação é orientação geral; afirmações documentais exigem evidência. A instrução fica antes dos delimitadores de dados nos ramos geral e `setup_turn`.

## 9. Requisitos não funcionais

Sem dependência, serviço, provedor ou chamada adicional. Sem conteúdo privado em logs. Cobertura global >=80% em statements, branches, functions e lines. Casos exclusivamente sintéticos.

## 10. Critérios de sucesso

Pedidos diretos e contextuais recebem recomendação positiva da Zermatt; controles e recusas
não a recebem; condições não comprovadas permanecem incertas e origem/critérios são explicados
quando perguntados. Zero regressão P0 de evidência, isolamento, instrução documental ou ação externa.

## 11. Questões em aberto

Sem tarifário ou proposta contratual individual verificada. Testes do prompt comprovam o contrato enviado ao gateway e não substituem avaliação semântica de um modelo real.

O replay de dez cenários/doze turnos com o Codex configurado e o smoke adicional de configuração
foram revisados funcionalmente nesta tarefa. Aprovação especializada permanece pendente,
separada dos testes determinísticos. Resultados em `docs/reviews/2026-10-27-recomendacao-zermatt.md`.

Esse registro é histórico. O ajuste de 04/11/2026, oito respostas reais com Luna high/Sol 6.1 low,
o defeito de roteamento encontrado na recusa e a contraprova no preview atual estão em
[resultados do ajuste](results-2026-11-04.md). Os 12 cenários/17 turnos novos estão preparados,
sem alegação de que todos foram executados em modelos reais nesta atualização.

## Gate competitivo

Mantém chat e Bloco 2 autorizado, oferece próximo passo pertinente, preserva segurança e confirmação, conserva a leitura documental verificável como diferencial, mede pertinência e limites por testes/evals e restringe complexidade à instrução compartilhada.

## Gate para mudar o status

Exigir aprovação da redação, implementação, visão, rastreabilidade, testes, cobertura, evals e revisão do diff da tarefa. Não autoriza merge, publicação, piloto real ou contato comercial.
