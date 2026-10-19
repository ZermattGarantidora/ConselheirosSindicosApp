# Spec 036 — Avaliação semântica documental

**Status:** pacote independente e replay sintético integrados; modelo e revisão especializada pendentes  
**Responsável:** qualidade e engenharia  
**Atualizado em:** 2026-10-16

## 0. Alinhamento com a visão do projeto

### Partes do briefing atendidas

| Dimensão da visão | Seções do briefing | Como esta spec contribui |
|---|---|---|
| Problema e hipótese | §§2 e 4 | Mede respostas a perguntas documentais reais do síndico com material conferível. |
| Experiência principal | §§5 e 6 | Avalia a conversa e não cria uma tela paralela de decisão. |
| Bloco autorizado | §7, Bloco 7 | Complementa análise de documentos e comparação prudente, sem ampliar o produto. |
| Memória e evidências | §§8 e 9 | Garante fontes isoladas, citações verificáveis, conflitos e abstenções no harness. |
| Segurança e validação | §§10 e 13 | Mantém dados sintéticos e separa contrato mecânico de julgamento de especialistas. |

### Limites respeitados

- Não chama API paga, não inclui dados reais e não cria novo provedor.
- Não trata replay local como qualidade de modelo, nem substitui contador, jurista ou síndico.
- Não altera resposta, retrieval, prompts, autorização ou documentos de produção para satisfazer a avaliação.
- Não autoriza piloto, rollout, parecer profissional ou ação externa.

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

Preparar os 50 cenários semânticos da Spec 031 para revisão humana reproduzível, com pergunta, documentos sintéticos, fontes, critérios mecânicos e rubricas de correção.

## 2. Promessa testada

> Uma avaliação de resposta documental revela tanto a fonte que o sistema usou quanto o julgamento humano necessário para decidir se a resposta foi útil e prudente.

## 3. Escopo

- Transformar os 50 cenários semânticos existentes em fichas com fontes sintéticas concretas.
- Oferecer replay opcional por `AnswerGateway` fornecido explicitamente.
- Validar mecanicamente tenant, contrato de citação e formato da resposta retornada pelo gateway.
- Gerar pacote de trabalho para contador, jurista e síndico, sem preencher seus julgamentos.
- Usar documentos e perguntas escritos independentemente do resultado esperado, sem inserir gabarito, rubricas ou instruções de julgamento na evidência enviada ao gateway. Ausência de página, versão, trecho, legibilidade ou original permanece explícita e impede usar a fonte como evidência completa.
- A vigência das fontes sintéticas permanece `pending`, sem fabricar confirmação. O replay testa o contrato do gateway diretamente; não representa autorização do pipeline de produção para publicar essas fontes.
- Registrar o comando local e exportar fichas e respostas do replay sintético para revisão, sem iniciar provedor por variáveis de ambiente. O relatório preserva cada resposta e telemetria, ou a pendência de gateway, com campos de revisão humana em branco.

## 4. Fora do escopo

- Seleção, pagamento ou chamada de provedor; classificação automática de qualidade semântica.
- Aprovar, reprovar ou recalibrar modelo sem registros de revisores qualificados.
- Substituir os testes determinísticos, o contrato de evidências ou a revisão de código.

## 5. Requisitos funcionais

### RQ-3601 — Fichas concretas

Cada cenário semântico possui pergunta, ao menos uma fonte sintética com documento, versão, página e conteúdo, resultado esperado, severidade, rubricas e revisores requeridos.

### RQ-3602 — Replay mecânico não avaliativo

Sem gateway, o relatório fica `pending_gateway`. Com gateway configurado, o replay valida somente o contrato e permanece `pending_specialist_review`, mesmo quando todos os 50 retornam uma resposta válida.

### RQ-3603 — Julgamento independente

O revisor registra aprovação, reprovação ou evidência insuficiente, sustentação de citação, extrapolação, abstenção/conflito/escalonamento e justificativa. Temas financeiros exigem contador; normativos ou contratuais exigem jurista; todos incluem leitura de utilidade pelo síndico.

## 6. Contratos

`semantic/cases.ts` deriva fichas do inventário canônico; `semantic/replay.ts` aceita apenas um `AnswerGateway` fornecido pelo chamador e usa `validateGeneratedAnswer`. As fontes do replay pertencem a um `condominium_id` sintético único. O retorno nunca expõe `approved` sem registro especializado externo ao código.

## 7. Critérios de sucesso

- 50 fichas completas e rastreáveis, uma para cada cenário semântico da Spec 031.
- Replay sem gateway reporta zero respostas e pendência explícita.
- Replay local configurado confirma 50 contratos válidos, mas continua pendente de especialista.
- Nenhuma chamada de provedor, dado real ou avaliação humana fictícia.

## 8. Questões em aberto

- Escolha e configuração autorizada de gateway para avaliação probabilística.
- Agenda e registro de avaliações de contador, jurista e síndico.
- Execução probabilística exige escolha autorizada de gateway e orçamento; a integração local disponibiliza somente replay sintético de contrato, identificado como tal.

## Gate para mudar o status

Esta spec não pode ser declarada pronta sem gateway autorizado quando aplicável, julgamentos independentes registrados e decisão de baseline aprovada; o replay mecânico não satisfaz esse gate.
