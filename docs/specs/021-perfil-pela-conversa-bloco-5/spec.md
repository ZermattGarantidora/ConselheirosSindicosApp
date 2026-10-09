# Spec 021 — Perfil construído pela conversa, Bloco 5

**Status:** implementada; aguardando validação do usuário  
**Responsável:** produto e engenharia  
**Atualizado em:** 2026-10-09

## 0. Alinhamento com a visão do projeto

### Partes do briefing atendidas

| Dimensão da visão | Seções do briefing | Como esta spec contribui |
|---|---|---|
| Problema e experiência | §§2, 4 e 6 | Reduz formulários e constrói contexto no momento útil da conversa. |
| Prioridade | §7, Bloco 5 | Aprende dados do síndico e condomínio aos poucos e os exibe em “Meus dados”. |
| Segurança | §§8–10 | Mantém `condominium_id`, associação autorizada, dados explícitos e nenhuma ação externa. |
| Validação | §§13–14 | Mede utilidade sem degradar evidência, isolamento ou abstenção. |

### Limites respeitados

- Não cria formulário de cadastro, nova conta, automação externa ou coleta compulsória.
- Não infere dados pessoais a partir de documentos, respostas da IA ou mensagens ambíguas.
- Não implementa regras documentais do Bloco 6, análise financeira ou níveis de conta.

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

Permitir que a Alvitra obtenha informações úteis do síndico e do condomínio de forma natural e
gradual, mantendo-as visíveis em “Meus dados” dentro do chat.

## 2. Escopo

- o prompt pede uma informação por vez somente quando ela for útil;
- o servidor aprende apenas frases explícitas sobre nome, e-mail, telefone, unidades, nome do
  condomínio e administradora;
- dados aprendidos atualizam o perfil já autorizado do condomínio;
- “Meus dados” mostra somente valores confirmados e dados existentes do contexto ativo.

## 3. Requisitos

### RQ-2001 — Coleta natural e proporcional

A Alvitra pede uma informação por vez, somente quando sua ausência impedir ou melhorar de forma
relevante a ajuda. Não transforma a conversa em onboarding.

### RQ-2002 — Confirmação explícita

Somente declarações explícitas da própria pessoa atualizam o perfil. Perguntas, inferências,
documentos e conteúdo da resposta não atualizam dados.

### RQ-2003 — Perfil autorizado visível

“Meus dados” exibe os dados confirmados do síndico e do condomínio ativo. O acesso exige o mesmo
contexto autorizado; trocar o condomínio recarrega o perfil correspondente.

## 4. Critérios de sucesso

- a conversa pode aprender dados sem formulário longo;
- nenhum dado é aprendido de texto ambíguo ou de documento;
- dados de outro condomínio não aparecem no menu;
- citações, abstenção, riscos e vetorização permanecem inalterados.
