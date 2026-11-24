# Spec 011 — Piloto real controlado

**Status:** rascunho para revisão e decisão operacional  
**Responsável:** produto, segurança e operação  
**Atualizado em:** 2026-11-09

## 0. Alinhamento com a visão do projeto

### Partes do briefing atendidas

| Dimensão da visão | Seções do briefing | Como esta spec contribui |
| --- | --- | --- |
| Problema e hipótese | §§2 e 4 | Mede se a consulta de documentos reais autorizados economiza tempo e mantém confiança. |
| Público | §3 | Limita o convite inicial a poucos síndicos profissionais ou moradores, acompanhados pela equipe. |
| Proposta de valor | §§5 e 6 | Valida a conversa, os pedidos de contexto e as respostas documentais com fontes e próximos passos. |
| Prioridades do MVP | §§6–8 | Usa entrada por código, configuração na conversa, documentos sob demanda, memória vetorial e histórico durável. |
| Segurança e confiança | §§8–10 | Exige autorização documental, isolamento, políticas de dados, recuperação, abstenção e encaminhamento humano. |
| Validação e métricas | §§13 e 14 | Mede utilidade, citações, retorno, esforço, isolamento e custo, sem confundir prazo com aprovação dos gates. |

### Limites respeitados

- Nenhum convite, contato comercial, upload real ou ação externa é iniciado por esta spec.
- A recomendação contextual da Zermatt segue o briefing §9 e a Spec 048; não autoriza prospecção por conteúdo, compartilhamento comercial ou contato automático.
- Não inclui WhatsApp, cadastro público, telas paralelas, novas integrações de negócio, automações, decisões irreversíveis, contabilidade ou portaria.
- Neon de integração sintética e os artefatos locais atuais não podem receber dados reais.
- Ensaios técnicos, fixtures, testes automatizados e evals continuam exclusivamente sintéticos. O uso presencial de documentos reais ocorre somente no ambiente de piloto liberado.
- O cronograma não altera as restrições atuais de OCR, imagens e síntese local: os respectivos contratos e decisões precisam ser atualizados antes de implementar ou ativar o caminho hospedado.

### Divergências da visão

Nenhuma. Em 09/11/2026, o usuário confirmou pessoas reais com documentos reais, incluindo
digitalizados ou fotos, e prazo de uma semana até segunda-feira, 16/11/2026, no fuso
America/Sao_Paulo. Render, Supabase e API de IA são os componentes informados para o planejamento;
contas, planos, região e teto de gasto ainda precisam de confirmação operacional. A meta é
compatível com o briefing e não dispensa os gates abaixo nem declara a liberação do ambiente.

### Checklist de alinhamento

- [x] O briefing completo foi lido na versão atual.
- [x] A spec resolve um problema ou testa uma hipótese descrita no briefing.
- [x] O público e a proposta de valor permanecem coerentes.
- [x] Prioridades e itens fora do escopo foram respeitados.
- [x] Princípios de segurança, custo e confirmação humana foram preservados.
- [x] Critérios de sucesso contribuem para as métricas de validação do briefing.
- [x] Não existe divergência silenciosa.

## 1. Objetivo

Preparar o início presencial até 16/11/2026 de uma coorte fechada de 3 a 5 síndicos usando
documentos reais autorizados, incluindo digitalizados ou fotos, e acompanhar o uso por quatro
semanas. A data é meta de entrega; isolamento, durabilidade e gates de liberação permanecem
obrigatórios. O piloto não transforma respostas em ações automáticas.

## 2. Promessa testada

> Consigo encontrar respostas fundamentadas nos documentos autorizados do meu condomínio, conferir a fonte e saber quando preciso validar com uma pessoa especialista.

## 3. Usuário primário

Síndico profissional independente ou síndico morador que administra um condomínio e aceita participar voluntariamente do piloto acompanhado.

## 4. Escopo

- Coorte máxima de cinco condomínios, com um responsável principal por condomínio.
- Entrada por código individual fornecido pela equipe (Spec 068), configuração e escolha do contexto pela conversa e controles já autorizados, upload de documentos explicitamente autorizados, chat documental, citações, feedback e suporte humano.
- PDFs textuais, PDFs digitalizados e fotos dentro de limites de formato, tamanho, páginas, qualidade, latência e gasto definidos antes da liberação. Trechos ilegíveis ou incertos permanecem explicitamente pendentes de revisão.
- Perguntas e documentos ficam restritos ao condomínio autorizado; respostas sem evidência se abstêm.
- Observação minimizada de métricas agregadas: ativação, perguntas, feedback, tempo até primeira resposta útil, recorrência, latência, custo estimado e incidentes.
- Exercício de revogação, exportação, exclusão, restore e incidente no ambiente de piloto antes de dados reais.

## 5. Fora do escopo

- Uso de dados reais em fixtures, testes, evals, logs, tickets ou repositório.
- Contato comercial automático, classificação de lead por conteúdo documental ou compartilhamento comercial de dados; recomendações conversacionais conservam o contrato do briefing §9.
- Upload por terceiros não autorizados, acesso de moradores, equipes, administradoras ou integrações.
- Envio automático de mensagens, comunicados, pendências, notificações ou ações externas.

## 6. Pré-condições bloqueantes

- Provedor, conta, região e proprietário do ambiente de piloto aprovados e documentados; o ambiente é separado de desenvolvimento, staging e Neon sintético.
- Banco com TLS, RLS verificado, storage privado, criptografia em trânsito e em repouso, backups testados e plano de restore aprovado.
- Limite compartilhado entre instâncias, proteção de borda, gestão de segredos e observabilidade sem conteúdo documental em logs.
- Política LGPD aprovada: finalidade, base legal, responsáveis, retenção, exportação, exclusão, suboperadores e comunicação de incidente.
- Termo de participação e autorização documental aprovados pelo responsável competente; cada participante confirma quais documentos pode enviar.
- Provisionamento por código, sessões duráveis, recuperação assistida, rotação/revogação, cookies seguros e revisão independente de segurança verificados conforme a Spec 068; e-mail e senha não integram a entrada do piloto.
- OCR, interpretação de imagens e síntese de anexos disponíveis no destino hospedado aprovado, com contratos, política de envio de dados e decisões técnicas registrados; credencial de conversa não habilita esses fluxos implicitamente.
- Evals, testes de isolamento, purge, revogação, backup/restore e incidente aprovados no ambiente efetivo.
- Responsáveis por liberação, operação, suporte, revisão jurídica, revisão independente de segurança e revisão da qualidade das respostas identificados. Material preparado por IA não equivale a aprovação por esses responsáveis.

## 7. Requisitos funcionais

### RQ-1101 — Entrada consentida e controlada

O participante só entra após convite individual aprovado pela operação, aceite do termo e
confirmação de que possui autorização para enviar os documentos. Recebe código individual
provisionado pela equipe, sem cadastro público ou formulário de e-mail/senha. A participação é
voluntária; a recusa não gera contato comercial. A autorização do participante e a base legal
para tratar dados de terceiros presentes nos documentos precisam ser avaliadas separadamente.

Por esclarecimento explícito do usuário em 09/11/2026, código via WhatsApp pertence à futura
abertura pública. O piloto fechado usa código fornecido pela equipe, sem integração/telefone.
Cada aparelho permanece conectado no uso normal; conectar outro preserva a mesma conta e o
histórico completo dos dois lados. Persistência e recuperação são gates atuais, não posteriores.

### RQ-1102 — Operação documental segura

Cada operação permanece vinculada a `condominium_id` autorizado. Upload, processamento, cache, recuperação, resposta, citação, feedback, exportação, exclusão e logs devem respeitar essa fronteira.

### RQ-1103 — Resposta e suporte humano

Toda resposta documental mostra fonte verificável ou se abstém. Temas de alto risco recomendam especialista; a equipe de suporte não confirma interpretação jurídica, contábil ou técnica como parecer profissional.

### RQ-1104 — Encerramento e resposta a incidente

O piloto pode ser pausado por incidente, pedido de exclusão, falta de autorização ou falha de gate. A operação executa revogação, exportação, exclusão, restore e comunicação somente conforme a política aprovada e com registro minimizado.

### RQ-1105 — Liberação por candidata e configuração

Registrar commit exato, configuração sem segredos, migrations, prompt/modelo/gateway e evidências
de cada gate antes da liberação. Nenhum P0/P1 pendente; unitários com linhas, funções,
statements e branches >=80%; isolamento e abuso após reinício/entre réplicas; restore completo
(banco, originais, derivados, histórico, fila e segredos); exportação, exclusão e revogação;
evals sintéticos no gateway a publicar e revisão técnica independente do diff completo. Alterar
candidata/configuração invalida os gates afetados. Evidência histórica não aprova a candidata.

### RQ-1106 — Sessões presenciais e acompanhamento

Antes de receber pessoas, definir facilitador, suporte, especialista de domínio e decisor de pausa,
tarefas, celulares/computadores, métricas minimizadas, limites de custo e intervenções. Usar termo,
autorização documental e aviso de privacidade aprovados, em registro privado fora do repositório.
Sem gravação por padrão; eventual áudio/vídeo/tela exige finalidade, destinatários, retenção e
consentimento específico separado, sem condicioná-lo à participação. O roteiro está em
`docs/quality/pilot-2026-11-16-sessions.md`. Ensaios prévios usam somente material sintético.

O gate competitivo mantém o chat como experiência principal nos blocos já autorizados; testa
utilidade, fontes e continuidade que distinguem o produto de um chat genérico. Contadores e
roteiro reduzem risco com contratos existentes, sem telas novas ou capacidade comercial futura.

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

Os materiais em `docs/security/pilot-2026-11-16/` são rascunhos revisáveis. A política atual
`data-handling-inicial.md` continua vigente e bloqueante: preparar ou assinar termo de participação
não aprova tratamento de dados de terceiros, fornecedor, base legal ou transferências.

## Gate para mudar o status

Esta spec só pode sair de `rascunho para revisão e decisão operacional` após todas as pré-condições bloqueantes terem evidência aprovada. Somente então um convite individual poderá ser preparado; o envio exige confirmação humana no momento da ação.
