# Spec 052 — Contexto da tarefa e abstenção útil

**Status:** implementada; testes locais e bateria Luna posterior concluídos, com limitações semânticas abertas  
**Responsável:** engenharia da Alvitra  
**Atualizado em:** 2026-10-28

## 0. Alinhamento com a visão do projeto

### Partes do briefing atendidas

| Dimensão da visão | Seções do briefing | Como esta spec contribui |
|---|---|---|
| Problema e hipótese | §§2 e 4 | Reduz perda de referências e conclusões incompletas ao consultar documentos. |
| Público | §3 | Mantém foco em síndicos moradores e profissionais no chat autorizado. |
| Proposta de valor | §§5 e 6 | Organiza o pedido atual e solicita somente a evidência faltante. |
| Prioridades do MVP | §7, Blocos 2, 6 e 7 | Corrige conversa e consulta documental existentes, sem novas telas. |
| Segurança e confiança | §§8–10 | Mantém isolamento, fontes verificáveis, limites da memória e validação humana. |
| Validação e métricas | §§12–14 | Acrescenta regressões e prepara comparação posterior somente com Luna. |

### Limites respeitados

Sem memória global, resumo de fatos, leitura além da janela recente, replay documental, serviço, provedor, dependência, schema ou ação externa novos. Preservar oito interações, 12.000 bytes e oito evidências. Não alterar texto nem versão do system prompt v26. As informações adicionais são dados internos da requisição, serializados dentro do contexto não privilegiado já existente. A entrega inicial autorizava implementação e testes determinísticos, com retorno antes da bateria. Após esse retorno, o usuário solicitou explicitamente os 280 cenários somente Luna com memória; essa etapa segue o [plano de execução](run-plan-2026-10-28.md), sem ampliar escopo de produção.

### Divergências da visão

Nenhuma. O pacote corrige o núcleo autorizado, sem antecipar outros blocos. Atende ao gate competitivo: preserva o chat, melhora tarefas resolvidas com evidência e próximo passo, reutiliza recuperação e validação e mede o benefício sem classificador remoto ou estado persistente adicional.

### Checklist de alinhamento

- [x] O briefing completo foi lido na versão atual.
- [x] A spec resolve um problema e testa uma hipótese descrita no briefing.
- [x] Público e proposta de valor permanecem coerentes.
- [x] Prioridades e itens fora do escopo foram respeitados.
- [x] Segurança, custo e confirmação humana foram preservados.
- [x] Os critérios validam utilidade, evidência e custo da conversa.
- [x] Não existe divergência silenciosa.

## 1. Objetivo

Retomar a tarefa, cobrir os assuntos solicitados e distinguir documento ausente de resposta inválida, com menor dependência do modelo para reconstruir a intenção.

## 2. Promessa testada

> A Alvitra considera os itens do pedido disponível e explica precisamente qual fonte falta, sem inventar o que saiu da janela de contexto.

## 3. Usuário primário

Síndico que retoma consultas e pede um quadro ou conclusão com documentos de um condomínio autorizado.

## 4. Escopo

Continuações e fronteiras de assunto; foco efêmero com perguntas literais e tópicos da janela autorizada; controles limitados de cobertura em sínteses; identificação de falta de fonte para saldo/disponibilidade e piso coletivo; correção única também na orientação geral inválida; plano executável de evals somente Luna. A entrega inicial não executou modelos; a execução posterior explicitamente solicitada compara os mesmos 280 cenários com a referência Luna anterior.

## 5. Fora do escopo

Treinamento, ampliar memória, recuperar mensagens distantes, resumir fatos documentais, alterar roteamento Luna/Sol, prompt, esforço ou configuração do aplicativo em execução; corrigir indisponibilidade do computador; piloto e produção. Novas repetições além da rodada solicitada não são iniciadas automaticamente.

## 6. Pré-condições

Specs 026, 035, 041, 043, 046, 047 e 051; ADRs 0002, 0031 e 0032. Preservar datasets, oráculos, snapshots e resultados históricos. O usuário pediu esta implementação e retorno antes de outra bateria somente Luna.

## 7. Requisitos funcionais

### RQ-5201 — Referências e foco limitado

Reconhecer retomadas como “finalize”, “termine”, “aquela”, “reenviei” e pedido de evidência faltante para aceite. Reconhecer “mudar de assunto”, além de “mudando de assunto”. O foco deriva somente das perguntas da janela autorizada, sem copiar respostas antigas, documentos ou inferir fatos. Destacar perguntas literais e tópicos para sínteses. Não usar IDs de cenário ou gabaritos. Se os itens originais não estão disponíveis, sinalizar a janela parcial e permitir esclarecimento, sem inventar uma tarefa inteira. Pergunta persistida e enviada ao gateway permanece original.

### RQ-5202 — Fonte pertinente e lacuna explícita

Saldo/disponibilidade ordinária exige fonte financeira recuperada; convenção com taxa de salão não basta. Confirmação de piso exige instrumento coletivo aplicável recuperado; menção à CCT ausente dentro de contrato não conta como instrumento disponível. Essas lacunas são dados para geração natural, não falas prontas nem pareceres. Manter evidências úteis em perguntas compostas; fonte tangencial não confirma conclusão local. Não declarar arquivo ausente de todo o acervo: somente não recuperado para a consulta. Piso e outros temas sensíveis mantêm revisão humana.

A identificação de família documental é limitada ao título e a campos financeiros explícitos nos trechos. Reconhecer um título de instrumento coletivo não certifica seu conteúdo, aplicabilidade, jurisdição ou vigência; os controles existentes e a revisão humana continuam obrigatórios.

### RQ-5203 — Cobertura e correção segura

Em síntese com pelo menos dois tópicos explícitos, detectar omissão lexical de tópico como motivo de correção, sem avaliar verdade por palavra-chave. Aceitar resposta que explique a falta de evidência de um tópico. No máximo duas tentativas totais por caminho, inclusive orientação geral, usando as mesmas fontes e o mesmo modelo selecionado; sem terceiro fallback gerador. Todas as tentativas e reprovações são auditadas. Não preencher omissões com texto pré-programado nem promover abstenção ou resposta inválida a fato confirmado. Citações, claims, conflitos, conteúdo hostil e fidelidade continuam validados.

### RQ-5204 — Preparação e entrega sem nova rodada paga

Adicionar condição única `luna-memory-on`, sem roteamento para Sol, ao runner existente. `evals:luna` deve mostrar plano sem chamadas por padrão e exigir `--execute` para execução real futura. Preservar condições históricas e comparação híbrida. Testes locais usam gateways sintéticos; não alterar `.env.local`. Informar explicitamente que ganhos de qualidade e custo do código novo ainda dependem da próxima bateria real.

## 8. Contratos

Payload HTTP preservado. Contexto interno ganha foco opcional, limitado e não privilegiado; seu orçamento inclui os dados derivados. Nova causa fechada de validação para omissão de tópico. Auditoria conserva contagens/códigos sem texto de perguntas ou foco. Nenhuma tabela ou persistência adicional.

## 9. Requisitos não funcionais

Zero acesso entre tenants ou chats, nenhuma chamada externa em testes, no máximo oito fontes e oito interações, 12.000 bytes de turnos e foco. Cobertura mínima de 80% nos quatro indicadores, sem enfraquecer gates, datasets ou oráculos.

## 10. Critérios de sucesso

Regressões reproduzem continuações perdidas, fonte tangencial financeira, CCT ausente, síntese parcial e correção geral; controles negativos preservam consulta independente, orientações gerais, fontes válidas e recusa de claims sem suporte. Gates locais passam. O plano Luna contém 280 cenários/1.010 turnos em uma condição e zero chamadas. Não atribuir melhora sem executar e revisar a bateria posterior.

## 11. Questões em aberto

Foco e cobertura lexicais são auxiliares limitados. Não garantem completude semântica ou recuperam pedidos fora da janela. A bateria posterior mediu qualidade e consumo; revisão especializada e investigação de falsos positivos permanecem pendentes.

## 12. Validação posterior autorizada em 28/10/2026

O pedido explícito posterior autoriza uma rodada Luna com memória, sem Sol ou alteração de código durante a execução. Os [resultados observados](observed-results-2026-10-28.md) registram 280 cenários/1.010 turnos, 58/79 satisfatórias na amostra técnica contra 51/79 anteriores e 21,860563 créditos equivalentes observados. Os finais longos permanecem em 23/40, com regressões e omissões abertas. Esses resultados não garantem a promessa em toda conversa nem aprovam piloto; a guarda lexical não registrou omissões nesta bateria. AC-5207 exige procedência, limites e falhas preservados, sem promover a auditoria IA a aprovação especializada.

## Gate para mudar o status

Alinhamento, aceitação, rastreabilidade, regressões, cobertura e revisão do diff concluídos. A bateria posterior teve autorização explícita e deve ser apresentada com suas limitações; não autoriza piloto, produção ou novas rodadas automáticas.
