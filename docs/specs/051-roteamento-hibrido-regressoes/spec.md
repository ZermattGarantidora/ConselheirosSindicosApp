# Spec 051 — Roteamento Luna/Sol e regressões conversacionais

**Status:** implementada e avaliada sinteticamente; sem aprovação de piloto  
**Responsável:** engenharia da Alvitra  
**Atualizado em:** 2026-10-28

## 0. Alinhamento com a visão do projeto

### Partes do briefing atendidas

| Dimensão da visão | Seções do briefing | Como esta spec contribui |
|---|---|---|
| Problema e hipótese | §§1–3 | Reduz respostas incompletas e incorretas na consulta documental do síndico. |
| Público | §4 | Usa os mesmos casos sintéticos de rotina de síndicos brasileiros. |
| Proposta de valor | §§5–6 | Melhora a continuidade na conversa única, com fontes verificáveis. |
| Prioridades do MVP | §7, Blocos 2, 6 e 7 | Refina conversa e análise já autorizadas, sem nova interface. |
| Segurança e confiança | §§8–10 | Mantém isolamento, revalidação, abstenção, conflitos e validação humana. |
| Validação e métricas | §§12–14 | Compara qualidade e consumo observados, favorecendo o caminho mais barato quando adequado. |

### Limites respeitados

Sem ERP, ações externas, novos provedores, dados reais, treinamento automático, memória global ou resumos. Não aumenta a janela de oito turnos/12.000 bytes. Não altera o system prompt v26 já existente; eventual revisão de texto continua sujeita à apresentação/aprovação prevista na Spec 026. Não amplia uso do plano Codex para produção.

### Divergências da visão

Nenhuma. Implementação e nova rodada foram solicitadas explicitamente pelo usuário. O gate competitivo permanece atendido: conversa única; blocos existentes; menos erros e custo; evidências e autorização preservadas; regressões e comparação mensuráveis; regras locais pequenas e reversíveis, sem classificador pago adicional.

### Checklist de alinhamento

- [x] O briefing completo foi lido na versão atual.
- [x] A spec resolve um problema ou testa uma hipótese descrita no briefing.
- [x] O público e a proposta de valor permanecem coerentes.
- [x] Prioridades e itens fora do escopo foram respeitados.
- [x] Princípios de segurança, custo e confirmação humana foram preservados.
- [x] Critérios de sucesso contribuem para as métricas de validação do briefing.
- [x] Não existe divergência silenciosa.

## 1. Objetivo

Escolher Luna nas consultas simples e Sol nas complexas, corrigindo falhas compartilhadas de contexto, busca, conflitos e fidelidade numérica antes de medir o ganho.

## 2. Promessa testada

> A Alvitra usa o modelo mais barato adequado à tarefa, sem dispensar evidência, segurança e transparência sobre limitações.

## 3. Usuário primário

Síndico que consulta documentos autorizados e conduz tarefas de vários turnos no mesmo chat.

## 4. Escopo

Roteamento determinístico antes da geração; regressões derivadas dos erros observados na Spec 050; melhoria de contexto/busca; comparação exploratória dos mesmos 280 cenários (240 curtos, 40 longos), Luna com memória versus híbrido com memória, no mesmo snapshot.

## 5. Fora do escopo

Treinamento, atualização automática de regras por feedback, troca de modelo por indisponibilidade, repetição sistemática Luna→Sol, mudança de provedor ou chave, aprovação especializada automática, lançamento e merge.

## 6. Pré-condições

Specs 026, 035, 041–043, 046, 047 e 050; ADRs 0002, 0031 e 0032. Preservar relatórios, conjunto de casos e oráculos anteriores. ADR 0035 registra a política. Execução real exclusivamente sintética e local pelo acesso Codex já autorizado.

## 7. Requisitos funcionais

### RQ-5101 — Escolha antes da geração

Luna é a base. Sol atende risco alto, conflito documental, pedidos explícitos de adulteração/ocultação de fatos, versões pendentes relevantes, análise financeira/comparação de períodos, síntese de várias fontes e continuação complexa. Contagem de fontes considera fontes distintas e o objetivo da pergunta; mera extensão do histórico não torna toda consulta complexa. Decisão usa somente entrada autorizada, nunca ID de cenário/oráculo. Registrar motivo controlado e modelo efetivo por tentativa. A correção de validação conserva o modelo selecionado para a mesma entrada; não adiciona segunda geração por roteamento. A configuração local é reversível; não altera imagem/OCR ou provedores pagos.

### RQ-5102 — Contexto limitado e atual

Resolver continuações como “estão demorando”, “posso acender a luz” e “conclua” usando perguntas recentes autorizadas. Correção explícita de período prevalece na busca. Mudança explícita de assunto ou encerramento da emergência impede contaminação por risco antigo. Não alterar pergunta persistida nem reenviar respostas documentais. Sinalizar janela parcial sem afirmar conhecer o início da conversa; buscar no máximo nove registros para enviar somente os oito permitidos.

Imperativos de redação, pronomes e referências à validação humana também retomam contexto. Pedido de confirmação de adequação ao piso/CCT é alto risco trabalhista; consulta simples sobre qual CCT foi recebida não é elevada por palavra isolada.

### RQ-5103 — Cobertura de evidências

Manter máximo de oito trechos; priorizar assunto, período pedido, versões relevantes e páginas complementares em perguntas compostas. Não usar resumo de resposta antiga como fonte nem relaxar qualidade, vigência ou autorização. Reconhecer conflito explícito também quando uma fonte descreve a divergência entre regras, sem declarar validade jurídica.

As duas fontes do conflito devem sustentar o mesmo assunto. Retenção de imagens por 30 dias não é prazo de locação. Consulta de barulho não vira conflito de locação pela presença incidental de cláusulas de prazo; pergunta de locação ou revisão de conflitos permanece elegível.

### RQ-5104 — Fidelidade e regressão

Recusar valor monetário factual sem suporte no trecho citado, inclusive em resumo que tenta alterar saldo. Orientação hipotética claramente delimitada não se torna fato. A guarda limitada reconhece diferenças e somas explícitas de até três operandos, considerando no máximo 64 valores distintos dos trechos para limitar trabalho; não substitui avaliação semântica nem prova correspondência de rubrica por mera coincidência numérica. Abstenção não pode esconder afirmação local positiva sem fonte. Preservar correção única e abstenção segura quando a validação falha; não promover saída inválida. Adicionar controles negativos e variações de valores/frases em testes, sem condicionamento por cenário.

A guarda adicional de abstenção exige sinal de especificidade local, como valor, data, referência ao material recebido ou evento concreto. Definições gerais de pauta, ata ou contrato não constituem prova sobre o documento do condomínio. Os demais validadores de claims e citações permanecem obrigatórios. Ajuste posterior à matriz completa recebe replay dirigido separado, sem reescrever as notas anteriores.

### RQ-5105 — Comparação honesta

Executar Luna/memória e híbrido/memória sobre código, dados e esforço low idênticos. Congelar snapshot, checkpoints e hashes; contabilizar tentativas reprovadas e falhas. Custos mistos usam modelo efetivo de cada tentativa e cache observado. Usage ausente é desconhecido, nunca zero. Reutilizar os 80 alvos de auditoria técnica por condição, com a mesma ambiguidade excluída uniformemente; não confundir auditoria IA com aprovação especializada ou acurácia global. Sol da rodada anterior é referência histórica com mudança de código, não comparação causal. Uma rodada é exploratória; três rodadas e especialistas continuam exigidos para certificação.

## 8. Contratos

Gateway e payload público existentes. Metadados de memória explicitam janela limitada. Telemetria de roteamento usa códigos fechados, sem conteúdo de conversa. Relatórios preservam consumo por modelo, falhas, latência, cobertura e hashes; valor faturado permanece desconhecido.

## 9. Requisitos não funcionais

Sem chamada de modelo para classificar, dependência nova, rede adicional, logs textuais ou acesso entre tenants. Cobertura mínima de 80% em linhas, branches, funções e statements. Execução interrompe indisponibilidade persistente conforme Spec 050, sem fallback pago.

## 10. Critérios de sucesso

Regressões determinísticas passam, nenhuma quebra de isolamento/citação, comparação completa e consumo rastreável. Demonstrar melhora nos casos corrigidos sem mascarar falhas novas. Gates semânticos da Spec 041 permanecem obrigatórios para piloto; insuficiência deve aparecer no resultado, não ser arredondada para aprovação.

## 11. Questões em aberto

O [resultado observado](observed-results-2026-10-28.md) registra distribuição, benefício, consumo e erros remanescentes. A política ainda precisa reduzir escalonamentos desnecessários e melhorar sínteses longas. Ajuste de esforço ou prompt exige experimento separado. Uma amostra intencional não permite estimar custo global por resposta correta.

## Gate para mudar o status

Critérios em acceptance.md, rastreabilidade e gates executados; resultados publicados com limitações. Esta fatia não autoriza produção, merge nem aprovação profissional.
