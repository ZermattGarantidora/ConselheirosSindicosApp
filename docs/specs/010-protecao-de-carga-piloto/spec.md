# Spec 010 — Proteção de carga do piloto

**Status:** aprovada para implementação local controlada  
**Responsável:** produto e engenharia  
**Atualizado em:** 2026-09-21

## 0. Alinhamento com a visão do projeto

### Partes do briefing atendidas

| Dimensão da visão | Seções do briefing | Como esta spec contribui |
| --- | --- | --- |
| Problema e hipótese | §§1, 2 e 4 | Mantém a consulta documental disponível e previsível mesmo diante de uso repetitivo ou acidental. |
| Público | §§3 e 11 | Protege síndicos que trabalham em vários condomínios sem permitir que uma carga anormal comprometa os demais. |
| Proposta de valor | §§5 e 10 | Preserva o diferencial de respostas fundamentadas e isoladas, em vez de degradar a segurança para atender volume. |
| Prioridades do MVP | §§7 e 14 | Limita upload e consulta, que já fazem parte do núcleo documental, sem incluir integração ou automação externa. |
| Segurança e confiança | §§12 e 15 | Aplica limites de trabalho por usuário e condomínio antes de processamento custoso e registra uma falha segura. |
| Validação e métricas | §§16–18 | Ajuda a manter custo por condomínio e resposta aprovada dentro de um patamar mensurável. |

### Limites respeitados

- Não autoriza dados reais, usuários externos, produção ou o piloto comercial.
- Não adiciona serviço externo, telemetria de conteúdo, ferramenta de IA, automação ou integração.
- O limite local é uma proteção de desenvolvimento; implantação distribuída exigirá decisão separada para armazenamento compartilhado, WAF, observabilidade, retenção e resposta a incidentes.

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

Evitar que um usuário ou condomínio use repetidamente operações custosas de upload e consulta a ponto de prejudicar disponibilidade ou custo do ambiente local controlado.

## 2. Promessa testada

> Quando atinjo o limite temporário de uma operação cara, recebo uma orientação clara para tentar novamente; meus dados e os demais condomínios permanecem protegidos.

## 3. Usuário primário

Síndico autenticado que envia documentos ou faz consultas documentais no condomínio autorizado.

## 4. Escopo

- Contagem local em janela fixa para upload e perguntas documentais.
- Chave de limite formada por operação, usuário autenticado e `condominium_id` autorizado.
- Limites aplicados apenas após autenticação e autorização, imediatamente antes da operação custosa.
- Resposta HTTP `429`, com `Retry-After` e mensagem segura quando o limite for atingido.

## 5. Fora do escopo

- Limite distribuído, WAF, bloqueio por IP, cobrança, cotas comerciais ou penalidades.
- Alterar permissões, resposta documental, conteúdo de documentos ou políticas de retenção.
- Autorizar rollout externo, documentos reais ou dados pessoais em testes/evals.

## 6. Pré-condições

- Usuário autenticado ou identidade de desenvolvimento válida.
- `condominium_id` autorizado para a operação solicitada.

## 7. Requisitos funcionais

### RQ-1001 — Limite de operações custosas

O servidor deve limitar perguntas documentais e uploads por combinação de operação, usuário e condomínio. O padrão local é de 30 perguntas por minuto e 5 uploads por 10 minutos.

### RQ-1002 — Isolamento e falha segura

Um limite atingido em um condomínio, por outro usuário ou em outra operação não pode afetar escopos diferentes. Ao atingir o limite, a API deve retornar `429` sem executar a operação, sem expor dados internos e com um tempo mínimo para nova tentativa.

## 8. Contratos

- `POST /v1/condominiums/:condominiumId/questions` e `POST /v1/condominiums/:condominiumId/documents` retornam `429` quando o limite aplicável for atingido.
- A resposta possui cabeçalho `Retry-After` em segundos e a mensagem `Tente novamente em instantes.`.
- Erros de autenticação e autorização mantêm seus contratos `401` e `403`; não criam nem consomem um limite.

## 9. Requisitos não funcionais

- A chave de limite não inclui pergunta, conteúdo documental, token, e-mail ou outro dado pessoal além do identificador interno já autorizado.
- A implementação local não escreve conteúdo em logs, métricas ou fixtures.
- Os limites e seus testes são determinísticos e usam relógio injetado.

## 10. Critérios de sucesso

- Nenhuma operação cara ocorre depois de o limite do escopo autorizado ser atingido.
- Uma carga anormal em um escopo não bloqueia outro condomínio, usuário ou tipo de operação.
- O comportamento é verificável por teste determinístico e preserva os gates de segurança e cobertura.

## 11. Questões em aberto

- Os valores de cota de um piloto real dependem de preço, capacidade, modelo, SLA e medição de custo.
- Uma implantação externa requer decisão de arquitetura para limites compartilhados e controles de borda.

## Gate para implementação local

Esta spec só está pronta quando os critérios de aceitação, a matriz de rastreabilidade e os testes determinísticos estiverem atualizados, e `pnpm run check` estiver aprovado. Ela não libera dados reais nem rollout externo.
