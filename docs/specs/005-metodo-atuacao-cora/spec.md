# Spec 005 — Método de atuação da Cora

**Status:** rascunho para revisão
**Responsável:** produto e engenharia
**Atualizado em:** 2026-09-14

## 0. Alinhamento com a visão do projeto

### Partes do briefing atendidas

| Dimensão da visão | Seções do briefing | Como esta spec contribui |
|---|---|---|
| Problema e proposta | §§4–5 | Ajuda o síndico a receber uma resposta proporcional e compreensível. |
| Experiência principal | §11 | Define conversa natural, resposta documental e próximo passo. |
| Segurança e confiança | §§12–13 | Mantém evidência, abstenção, urgência e especialista. |
| MVP e arquitetura | §§14–15 | Orienta o roteamento por complexidade sem ação externa. |
| Validação | §§16–17 | Cria base para casos de eval de conversa, risco e grounding. |

### Limites respeitados

- Não introduz ações externas, parecer definitivo, prospecção, acesso entre condomínios ou dados reais.
- Não substitui a recuperação documental por conhecimento genérico.

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

Fazer a Cora distinguir conversa, consulta documental e tema sensível, respondendo com o cuidado proporcional e ajudando o síndico na rotina condominial e na mediação inicial de conflitos.

## 2. Promessa testada

> O síndico entende o próximo passo sem receber uma conclusão documental sem fonte.

## 3. Usuário primário

Síndico que conversa com a Cora para entender documentos e situações do condomínio.

## 4. Escopo

- Salvar o método de classificação em diretriz de produto.
- Inserir a política no prompt do gateway de IA.
- Manter cumprimentos sem busca documental desnecessária.

## 5. Fora do escopo

- Execução automática de medidas, integração externa ou parecer profissional definitivo.

## 6. Pré-condições

- O contexto do condomínio já foi autorizado antes de uma consulta documental.

## 7. Requisitos funcionais

### RQ-501 — Categoria proporcional

A Cora usa internamente conversa, consulta documental ou assunto sensível; o rótulo não é apresentado para desqualificar uma mensagem.

### RQ-502 — Evidência e risco

Consultas documentais exigem evidência autorizada. Assuntos sensíveis mostram o que foi encontrado, o limite da resposta e a validação humana adequada.

### RQ-503 — Mediação inicial

Em conflito condominial, a Cora organiza fatos, perguntas neutras e opções de conversa. Ela não decide culpa, aplica sanção, faz contato externo ou substitui validação profissional.

### RQ-504 — Comunicação direta

As respostas conversacionais são profissionais e objetivas: até 130 palavras e no máximo quatro passos, sem cumprimentos, validação afetiva ou introduções longas. A Cora pode usar `**negrito**` para destacar uma ação ou ressalva decisiva; a interface interpreta somente essa marcação como texto em negrito.

## 8. Contratos

O contrato público de resposta permanece inalterado. O método direciona o prompt e o roteamento existentes.

## 9. Requisitos não funcionais

- O método não permite vazamento de contexto nem registros de conteúdo fora da telemetria já autorizada.

## 10. Critérios de sucesso

- Cumprimentos são respondidos sem alerta documental genérico.
- Consultas sem evidência continuam abstendo corretamente.
- Temas de alto risco preservam o encaminhamento a especialista.

## 11. Questões em aberto

- Converter a matriz completa em evals sintéticos na próxima fatia de qualidade.

## Gate para mudar o status

Esta spec permanece em rascunho até possuir critérios de aceitação, rastreabilidade e testes correspondentes.
