# Spec 023 — Base para níveis da conta, Bloco 8

**Status:** implementada e aguardando aprovação do usuário  
**Responsável:** produto e engenharia  
**Atualizado em:** 2026-10-09

## 0. Alinhamento com a visão do projeto

### Partes do briefing atendidas

| Dimensão da visão | Seções do briefing | Como esta spec contribui |
|---|---|---|
| Hipótese e proposta | §§2 e 5 | Prepara evolução gradual sem exigir formulário adicional. |
| Experiência | §6 | Não cria tela, onboarding ou fluxo paralelo. |
| Prioridade | §7, Bloco 8 | Mantém campo de nível e cálculo ajustável por informação confirmada. |
| Segurança | §10 | O nível não concede acesso nem substitui associação autorizada. |
| Validação | §13 | Permite avaliar evolução sem alterar a resposta documental. |

### Limites respeitados

- Não define preço, benefícios, bloqueios, telas ou regra comercial final.
- Não muda autorização, `condominium_id`, recuperação, vetorização ou documentos.
- Não implementa nenhum bloco posterior.

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

Adicionar uma base persistível e uma política determinística, ajustável, para calcular o nível a partir de e-mail confirmado e quantidade de condomínios ativos.

## 2. Requisitos

- `app.users` mantém `account_level` e a data de cálculo.
- A política inicial retorna `starting` ou `confirmed` e pode ter seu limiar alterado sem criar regra comercial.
- O nível não é exibido nem usado para autorizar ações.
