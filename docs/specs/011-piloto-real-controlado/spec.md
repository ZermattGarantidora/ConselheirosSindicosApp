# Spec 011 — Piloto real controlado

**Status:** rascunho para revisão e decisão operacional  
**Responsável:** produto, segurança e operação  
**Atualizado em:** 2026-09-21

## 0. Alinhamento com a visão do projeto

### Partes do briefing atendidas

| Dimensão da visão | Seções do briefing | Como esta spec contribui |
| --- | --- | --- |
| Problema e hipótese | §§1, 2 e 4 | Mede se o núcleo documental economiza tempo sem reduzir confiança. |
| Público | §§3 e 11 | Limita o convite inicial a poucos síndicos profissionais ou moradores, acompanhados pela equipe. |
| Proposta de valor | §§5 e 10 | Valida respostas documentais citadas, versões e abstenções em vez de um chat genérico. |
| Prioridades do MVP | §§7, 11 e 14 | Exercita cadastro, condomínio, documentos, chat, citações e feedback, sem antecipar integrações. |
| Segurança e confiança | §§12 e 13 | Exige autorização documental, isolamento, LGPD, incidentes, abstenção e encaminhamento humano. |
| Validação e métricas | §§16–18 | Mede confiança, correção, tempo economizado, recorrência e custo por resposta aprovada. |

### Limites respeitados

- Nenhum convite, contato comercial, upload real ou ação externa é iniciado por esta spec.
- A oferta da Zermatt permanece separada, opcional e fora da primeira coorte de uso documental.
- Não inclui WhatsApp, integrações externas, automações, decisões irreversíveis, contabilidade ou portaria.
- Neon de integração sintética e os artefatos locais atuais não podem receber dados reais.

### Divergências da visão

Nenhuma. A realização do piloto depende dos gates abaixo; a spec não declara prontidão antes deles.

### Checklist de alinhamento

- [x] O briefing completo foi lido na versão atual.
- [x] A spec resolve um problema ou testa uma hipótese descrita no briefing.
- [x] O público e a proposta de valor permanecem coerentes.
- [x] Prioridades e itens fora do escopo foram respeitados.
- [x] Princípios de segurança, custo e confirmação humana foram preservados.
- [x] Critérios de sucesso contribuem para as métricas de validação do briefing.
- [x] Não existe divergência silenciosa.

## 1. Objetivo

Conduzir uma coorte fechada de 3 a 5 síndicos por quatro semanas para avaliar o valor do núcleo documental, sem expor dados entre condomínios ou transformar respostas em ações automáticas.

## 2. Promessa testada

> Consigo encontrar respostas fundamentadas nos documentos autorizados do meu condomínio, conferir a fonte e saber quando preciso validar com uma pessoa especialista.

## 3. Usuário primário

Síndico profissional independente ou síndico morador que administra um condomínio e aceita participar voluntariamente do piloto acompanhado.

## 4. Escopo

- Coorte máxima de cinco condomínios, com um responsável principal por condomínio.
- Cadastro, autenticação, seleção de condomínio, upload de documentos explicitamente autorizados, chat documental, citações, feedback e suporte humano.
- Perguntas e documentos ficam restritos ao condomínio autorizado; respostas sem evidência se abstêm.
- Observação minimizada de métricas agregadas: ativação, perguntas, feedback, tempo até primeira resposta útil, recorrência, latência, custo estimado e incidentes.
- Exercício de revogação, exportação, exclusão, restore e incidente no ambiente de piloto antes de dados reais.

## 5. Fora do escopo

- Uso de dados reais em fixtures, testes, evals, logs, tickets ou repositório.
- Contato comercial automático, classificação de lead por conteúdo documental ou oferta dentro da resposta da IA.
- Upload por terceiros não autorizados, acesso de moradores, equipes, administradoras ou integrações.
- Envio automático de mensagens, comunicados, pendências, notificações ou ações externas.

## 6. Pré-condições bloqueantes

- Provedor, conta, região e proprietário do ambiente de piloto aprovados e documentados; o ambiente é separado de desenvolvimento, staging e Neon sintético.
- Banco com TLS, RLS verificado, storage privado, criptografia em trânsito e em repouso, backups testados e plano de restore aprovado.
- Limite compartilhado entre instâncias, proteção de borda, gestão de segredos e observabilidade sem conteúdo documental em logs.
- Política LGPD aprovada: finalidade, base legal, responsáveis, retenção, exportação, exclusão, suboperadores e comunicação de incidente.
- Termo de participação e autorização documental aprovados pelo responsável competente; cada participante confirma quais documentos pode enviar.
- Verificação de e-mail, recuperação de senha e revisão independente de segurança concluídas.
- Evals, testes de isolamento, purge, revogação, backup/restore e incidente aprovados no ambiente efetivo.

## 7. Requisitos funcionais

### RQ-1101 — Entrada consentida e controlada

O participante só entra após convite individual aprovado pela operação, aceite do termo e confirmação de que possui autorização para enviar os documentos. A recusa não reduz a utilidade de nenhum recurso e não gera contato comercial.

### RQ-1102 — Operação documental segura

Cada operação permanece vinculada a `condominium_id` autorizado. Upload, processamento, cache, recuperação, resposta, citação, feedback, exportação, exclusão e logs devem respeitar essa fronteira.

### RQ-1103 — Resposta e suporte humano

Toda resposta documental mostra fonte verificável ou se abstém. Temas de alto risco recomendam especialista; a equipe de suporte não confirma interpretação jurídica, contábil ou técnica como parecer profissional.

### RQ-1104 — Encerramento e resposta a incidente

O piloto pode ser pausado por incidente, pedido de exclusão, falta de autorização ou falha de gate. A operação executa revogação, exportação, exclusão, restore e comunicação somente conforme a política aprovada e com registro minimizado.

## 8. Contratos

- O ambiente de piloto só aceita tráfego HTTPS e não expõe `DATABASE_URL`, chaves, logs documentais ou arquivos por URL pública.
- Um convite, termo, autorização de documento, operação de exclusão ou incidente possui identificador operacional minimizado e responsável definido; o conteúdo documental não é copiado para esse registro.
- A exclusão e a exportação devem gerar recibo sem texto documental e demonstrar que não alcançaram outro condomínio.
- `429` de limite, `401` de sessão e `403` de autorização continuam respostas seguras e não revelam o estado de outros condomínios.

## 9. Requisitos não funcionais

- Não há achado P0/P1 aberto, vazamento de tenant, citação fabricada ou resposta afirmativa sem evidência.
- Restore de backup, purge e revogação são testados no ambiente efetivo antes da coorte e após qualquer alteração relevante de infraestrutura.
- Logs, métricas e tickets usam IDs pseudonimizados, hashes e contagens; nunca páginas, perguntas ou trechos reais.
- O custo de IA é monitorado por condomínio e por resposta aprovada, com limite compartilhado e alerta operacional.
- A coorte não é ampliada enquanto houver incidente aberto, falha de gate ou uma métrica de confiança abaixo do limiar definido pela equipe.

## 10. Critérios de sucesso

- 100% das respostas afirmativas revisadas possuem citação verificável; 100% dos casos sem evidência se abstêm.
- Zero incidentes de isolamento, acesso revogado aceito, segredo exposto ou ação externa não confirmada.
- Cada participante conclui uma primeira consulta documental sem assistência técnica.
- A equipe mede retorno semanal, tempo economizado, feedback, custo e solicitações espontâneas de suporte sem analisar conteúdo para prospecção.

## 11. Decisões pendentes que bloqueiam o início

- Qual provedor/região/categoria de dados será usado no ambiente de piloto?
- Quem é o responsável por segurança, LGPD, operação, suporte e decisão de pausa?
- Quais são os prazos de retenção, o SLA de exclusão e a política de backup/restore?
- Qual é o termo de participação e a forma de comprovar autorização documental?
- Qual é o canal de suporte, a janela de atendimento e o protocolo de comunicação de incidentes?
- Quais são os limiares de custo, confiança e recorrência para pausar ou ampliar a coorte?

## Gate para mudar o status

Esta spec só pode sair de `rascunho para revisão e decisão operacional` após todas as pré-condições bloqueantes terem evidência aprovada. Somente então um convite individual poderá ser preparado; o envio exige confirmação humana no momento da ação.
