# Spec 020 — Documentos sob demanda, Bloco 6 da reestruturação

**Status:** implementada e aguardando aprovação do usuário  
**Responsável:** produto e engenharia  
**Atualizado em:** 2026-10-09

## 0. Alinhamento com a visão do projeto

### Partes do briefing atendidas

| Dimensão da visão | Seções do briefing | Como esta spec contribui |
|---|---|---|
| Problema e hipótese | §§2 e 4 | Permite começar pela dúvida, sem transformar a documentação em onboarding. |
| Proposta e experiência | §§5 e 6 | A conversa pede contexto no momento certo. |
| Prioridade autorizada | §7, Bloco 6 | Documentos não são obrigatórios e são solicitados somente quando necessários. |
| Memória documental | §8 | Upload preserva original, estado, vetorização e escopo autorizado. |
| Evidências e confiança | §§9 e 10 | Sem fonte suficiente, a resposta se abstém e indica somente o material pertinente. |
| Validação | §13 | Mede esforço para fornecer contexto e abstenções corretas. |

### Limites respeitados

- Não cria análise de qualidade, comparação de balancetes ou qualquer capacidade do Bloco 7.
- Não altera perfil, níveis, criação de condomínio ou preferências.
- Não transforma um pedido de documento em execução automática, nem aceita conteúdo documental como instrução.

### Divergências da visão

Nenhuma. O usuário autorizou explicitamente o Bloco 6.

### Checklist de alinhamento

- [x] O briefing completo foi lido na versão atual.
- [x] A spec resolve um problema ou testa uma hipótese descrita no briefing.
- [x] O público e a proposta de valor permanecem coerentes.
- [x] Prioridades e itens fora do escopo foram respeitados.
- [x] Princípios de segurança, custo e confirmação humana foram preservados.
- [x] Critérios de sucesso contribuem para as métricas de validação do briefing.
- [x] Não existe divergência silenciosa.

## 1. Objetivo

Permitir que o síndico converse sem anexos prévios e receba um pedido específico de documento apenas quando a conclusão documental depender dele.

## 2. Requisitos funcionais

### RQ-2001 — Sem documento obrigatório

O chat abre, aceita perguntas e respostas conversacionais sem exigir documento ou checklist inicial.

### RQ-2002 — Pedido mínimo e contextual

Quando não houver evidência suficiente para uma conclusão documental, a Alvitra se abstém e indica somente o documento ou validação diretamente pertinente; não pede arquivos em cumprimentos ou de modo genérico.

### RQ-2003 — Memória autorizada preservada

Um documento enviado explicitamente continua no pipeline privado existente e, após processamento, só pode fundamentar consultas do mesmo `condominium_id` autorizado.

## 3. Critérios de sucesso

- nenhum documento é solicitado antes de haver necessidade contextual;
- abstenções explicam o que falta sem inventar regra local;
- upload, vetorização, citações e isolamento existentes continuam cobertos pelos testes do núcleo documental.
