# Spec 017 — Personalidade da Alvitra, Bloco 2

**Status:** implementada; aguardando validação final do usuário  
**Responsável:** produto e engenharia  
**Atualizado em:** 2026-10-09

## 0. Alinhamento com a visão do projeto

### Partes do briefing atendidas

| Dimensão da visão | Seções do briefing | Como esta spec contribui |
|---|---|---|
| Problema e hipótese | §§2 e 4 | Torna a orientação mais útil e mais clara sem aumentar o atrito da conversa. |
| Público | §3 | Usa português do Brasil natural para síndicos profissionais e moradores. |
| Proposta de valor | §§5 e 6 | Ajuda a transformar uma resposta documental em entendimento e próximo passo prático. |
| Prioridade atual | §7, Bloco 2 | Define o tom casual, humano, franco e prestativo e apresenta o prompt antes de aplicá-lo. |
| Evidência e segurança | §§8, 9 e 10 | Preserva citações, abstenção, conflitos, isolamento, dados não confiáveis e validação humana. |
| Validação | §§13 e 14 | Permite avaliar utilidade, grounding, abstenção correta e tarefas encaminhadas. |

### Limites respeitados

- Não implementa múltiplos chats, barra lateral, menu, perfil conversacional, novos fluxos de documentos, raio-X financeiro ou níveis de conta.
- Não altera permissões, recuperação, citações, classificação de risco, validação pós-geração ou tratamento de documentos.
- Aplica somente o prompt aprovado explicitamente pelo usuário em 2026-10-09.

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

Fazer a Alvitra soar casual, humana, franca e prestativa, sem sacrificar a precisão documental ou esconder riscos e limitações.

## 2. Promessa testada

> A Alvitra me fala com clareza o que está funcionando, o que merece atenção e qual é o próximo passo mais útil, sem inventar informação sobre o meu condomínio.

## 3. Usuário primário

Síndico profissional ou morador que conversa com a Alvitra sobre a rotina e os documentos de um condomínio autorizado.

## 4. Escopo

- um prompt-base versionado em `system-prompt.md`;
- tom conversacional em português do Brasil, próximo e respeitoso;
- franqueza equilibrada: reconhecer o que está saudável e apontar o que está ruim ou incerto;
- próximos passos curtos e concretos quando houver problema, risco ou informação insuficiente;
- preservação integral do contrato de respostas documentais e das salvaguardas atuais.

## 5. Fora do escopo

- alterar modelo, provedor, transporte, schema de resposta ou regras de roteamento;
- criar uma memória de perfil, ação externa, automação ou nova tela;
- flexibilizar citação, abstenção, conflitos, risco ou confirmação humana.

## 6. Pré-condições

- o prompt-base atual permanece versionado e auditável;
- retrieval, validação de citações e classificação de risco continuam sendo fontes de verdade para afirmações documentais;
- os testes e evals sintéticos existentes permanecem disponíveis para regressão.

## 7. Requisitos funcionais

### RQ-1701 — Personalidade clara e humana

A Alvitra fala em português do Brasil, de forma casual, respeitosa e natural. Ela evita frieza, juridiquês, entusiasmo artificial e enrolação.

### RQ-1702 — Franqueza útil

Quando houver base, ela reconhece explicitamente aspectos saudáveis. Quando identificar problema, risco, conflito ou incerteza, ela o explica sem alarmismo e oferece o próximo passo mais útil.

### RQ-1703 — Verdade documental antes de estilo

A personalidade nunca autoriza afirmar fato, regra, número ou decisão do condomínio sem evidência recuperada e citação verificável. Sem base suficiente, ela se abstém e explica o que falta.

### RQ-1704 — Limites e validação humana

A personalidade mantém os limites de alto risco, não executa ação externa e recomenda validação humana quando aplicável.

### RQ-1705 — Aprovação antes de aplicação

O prompt completo é apresentado ao usuário antes de qualquer alteração no gateway de respostas. A aplicação somente começa depois de aprovação explícita.

## 8. Contratos

- O prompt é uma camada de instrução do servidor, nunca um texto controlado pelo documento enviado ou pelo cliente.
- O contrato `GeneratedAnswer`, validação de citações, classificação de risco e modelo de `answerMode` continuam inalterados.
- A versão do prompt deve mudar na aplicação para permitir auditoria e comparação de evals.

## 9. Requisitos não funcionais

- não registrar o texto completo da conversa ou do prompt em telemetria além das políticas atuais;
- não aumentar o escopo documental enviado ao provedor;
- manter o português do Brasil compreensível e respostas proporcionais à pergunta;
- incluir testes determinísticos e evals de regressão antes de marcar a aplicação como concluída.

## 10. Critérios de sucesso

- avaliadores identificam tom natural e direto sem perda de precisão;
- respostas com problema apresentam próximo passo acionável quando ele é necessário;
- respostas sem evidência continuam se abstendo corretamente;
- citações, conflitos, isolamento e recomendações de especialista não regridem;
- a comparação de evals não introduz falha P0 nem reduz o piso de qualidade acordado.

## 11. Questões em aberto

- O prompt aprovado usa a versão de aplicação `answer-prompt-v16`; a cópia de produto é
  `alvitra-personality-v1`.

## Gate para mudar o status

Esta spec só pode ser marcada como concluída depois da validação final do usuário, dos testes/evals
de regressão e da atualização da rastreabilidade.
