# Spec 022 — Raio-X de balancetes, Bloco 7 da reestruturação

**Status:** implementada e aguardando aprovação do usuário  
**Responsável:** produto e engenharia  
**Atualizado em:** 2026-10-09

## 0. Alinhamento com a visão do projeto

### Partes do briefing atendidas

| Dimensão da visão | Seções do briefing | Como esta spec contribui |
| ---------------------- | ------------------ | ----------------------------------------------------------------------------------------- |
| Problema e hipótese    | §§2 e 4            | Transforma documentos financeiros difíceis em orientação verificável para o síndico.      |
| Proposta de valor      | §§5 e 6            | A conversa sintetiza o que está saudável, o que merece atenção e o próximo passo.         |
| Prioridade autorizada  | §7, Bloco 7        | Implementa a análise de documentos e a comparação de balancetes autorizadas pelo usuário. |
| Evidências e confiança | §§9 e 10           | Achados dependem de evidência recebida, não presumem irregularidade e citam a origem.     |
| Validação              | §13                | Permite medir compreensão, abstenção e pedido de contexto específico.                     |

### Limites respeitados

- Não cria ação financeira, auditoria, aprovação de contas, cobrança ou comunicação externa.
- Não declara fraude, irregularidade ou conciliação sem evidência suficiente.
- Não substitui contador, conselho ou validação humana em tema financeiro relevante.
- Não cria os níveis da conta, telas elaboradas ou regras de perfil do Bloco 8.

### Divergências da visão

Nenhuma. O usuário autorizou explicitamente o Bloco 7.

### Checklist de alinhamento

- [x] O briefing completo foi lido na versão atual.
- [x] A spec resolve um problema ou testa uma hipótese descrita no briefing.
- [x] O público e a proposta de valor permanecem coerentes.
- [x] Prioridades e itens fora do escopo foram respeitados.
- [x] Princípios de segurança, custo e confirmação humana foram preservados.
- [x] Critérios de sucesso contribuem para as métricas de validação do briefing.
- [x] Não existe divergência silenciosa.

## 1. Objetivo

Quando o síndico pedir a leitura de um balancete, a Alvitra deve produzir um raio-X financeiro fundamentado, comparar somente períodos equivalentes disponíveis e deixar explícito o que não foi possível verificar.

## 2. Promessa testada

> O síndico entende rapidamente o que está saudável, o que precisa de atenção e qual documento específico falta para completar a análise.

## 3. Usuário primário

Síndico que precisa interpretar balancetes e prestações de contas sem receber conclusões financeiras sem base.

## 4. Escopo

- Detectar pedidos de análise de balancete, balanço, prestação de contas ou raio-X financeiro.
- Orientar a resposta para até três achados prioritários e os dez pontos de conferência definidos para o raio-X.
- Exigir estados explícitos: `ok`, `atenção` ou `não foi possível verificar`.
- Comparar somente períodos comparáveis com valores de origem, diferença absoluta e percentual válido.
- Pedir o balancete de mês anterior específico quando a comparação não tiver base.
- Versionar a skill `alvitra-balancete-analysis` junto ao projeto para orientar futuras análises e preservar o método aprovado.

## 5. Fora do escopo

- Conclusão automática de fraude, irregularidade, conformidade contábil ou conciliação bancária.
- Extração estruturada de planilhas, cálculos autônomos fora da evidência recuperada e auditoria profissional.
- Envio de avisos, cobrança, aprovação de despesas ou qualquer ação externa.

## 6. Pré-condições

- A pergunta está autorizada para o `condominium_id` ativo.
- O pipeline documental existente fornece somente evidências autorizadas, com documento, versão, página e trecho verificáveis.

## 7. Requisitos funcionais

### RQ-2201 — Raio-X orientado por evidência

Pedidos financeiros de balancete recebem orientação para priorizar até três achados e cobrir liquidez, inadimplência, orçamento, despesas extraordinárias, conciliação, reserva, suporte documental, variações, obrigações futuras e transparência. Cada ponto usa somente `ok`, `atenção` ou `não foi possível verificar`.

### RQ-2202 — Comparação prudente

A comparação apresenta origem, diferença absoluta e percentual somente quando válido; variação não é evidência de irregularidade. Sem período comparável, a resposta pede o mês faltante de forma específica.

### RQ-2203 — Limites financeiros preservados

Não há afirmação de conciliação sem extrato ou equivalente. Risco financeiro relevante recebe recomendação de revisão humana; citações continuam limitadas à evidência recuperada e autorizada.

## 8. Contratos

O contrato de resposta existente continua responsável por validar `answerMode`, risco e citações. A especialização de balancete é ativada apenas por pergunta financeira identificada; ela não amplia permissões, fontes ou dados disponíveis ao gateway.

## 9. Requisitos não funcionais

- A identificação da intenção é determinística e coberta por teste.
- A skill de análise financeira é versionada no repositório e não amplia permissões, fontes ou ações externas.
- Não há nova dependência, provedor externo ou acesso a dados fora do contexto autorizado.
- A instrução especializada não registra o conteúdo de documentos fora dos mecanismos de auditoria existentes.

## 10. Critérios de sucesso

- pedidos de balancete recebem um formato consistente, prudente e verificável;
- ausência de histórico resulta em pedido do período específico, não em comparação inventada;
- a análise preserva as regras de citação, abstenção e revisão humana do briefing.

## 11. Questões em aberto

- A extração determinística de rubricas e cálculos entre documentos poderá ser avaliada após validar o formato conversacional com balancetes sintéticos representativos.
