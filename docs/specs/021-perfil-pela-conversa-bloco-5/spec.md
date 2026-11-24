# Spec 021 — Perfil construído pela conversa, Bloco 5

**Status:** implementada; jornada inicial detalhada pela Spec 024
**Responsável:** produto e engenharia  
**Atualizado em:** 2026-11-03

## 0. Alinhamento com a visão do projeto

### Partes do briefing atendidas

| Dimensão da visão | Seções do briefing | Como esta spec contribui |
|---|---|---|
| Problema e experiência | §§2, 4 e 6 | Reduz formulários e constrói contexto no momento útil da conversa. |
| Prioridade | §7, Bloco 5 | Aprende dados do síndico e condomínio aos poucos, sem formulário. |
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
gradual, mantendo-as no contexto autorizado. A apresentação de documentos permanece no catálogo
autorizado sobre a conversa, conforme a jornada vigente.

## 2. Escopo

- o prompt pede uma informação por vez somente quando ela for útil;
- o servidor aprende apenas frases explícitas sobre nome, e-mail, telefone, unidades, nome do
  condomínio e administradora;
- dados aprendidos atualizam o perfil já autorizado do condomínio;
- a interface não mistura esses dados entre condomínios.

## 3. Requisitos

### RQ-2001 — Coleta natural e proporcional

A Alvitra pede uma informação por vez, somente quando sua ausência impedir ou melhorar de forma
relevante a ajuda. Não transforma a conversa em onboarding.

### RQ-2002 — Confirmação explícita

Somente declarações explícitas da própria pessoa atualizam o perfil. Perguntas, inferências,
documentos e conteúdo da resposta não atualizam dados.

Uma preferência explícita de tratamento confirmada pelo fluxo conversacional pode ser
“Síndico” ou “Síndica”, inclusive sem acento. A demonstração deve salvar e restaurar essa
preferência sem contradizer a confirmação do servidor com “Informe como você prefere ser
chamado”. Isso não comprova cargo ou identidade real nem transforma uma saudação ou texto
ambíguo em nome. Limites de formato, tamanho e isolamento permanecem.

Correção de 03/11/2026 após teste manual: a IA aceitava “Síndico”, mas a lista antiga de
respostas não nominais no navegador recusava salvá-lo. Atende briefing §§6.2, 7 (Bloco 5),
10 e 13, sem nova coleta, mudança de prompt ou expansão de escopo. O gate competitivo
preserva o chat e a confirmação explícita, reduz atrito e usa regressão de gravação/restauração.

Depois do cadastro, o nome do condomínio só muda mediante pedido explícito do síndico para
renomear, mudar, alterar ou corrigir esse nome, com o novo nome informado no próprio pedido.
Uma declaração como “o condomínio se chama Bosque”, uma citação do arquivo, histórico ou “sim”
para usar um documento não autoriza renomeação. A configuração inicial continua na Spec 024.

### RQ-2003 — Perfil autorizado e isolado

O perfil confirmado permanece vinculado ao contexto autorizado e não é exibido em outro
condomínio. O catálogo documental não autoriza alterações no perfil.

### RQ-2104 — Perfil registrado disponível nas respostas

Após o cadastro conversacional, a API lê o perfil do condomínio autorizado e fornece nome e
quantidade de unidades ao gateway em contexto estruturado não privilegiado. Esses campos são
dados de cadastro informado, sem comprovação documental. Não copiar telefone, e-mail, endereço,
CNPJ, fotos, histórico de configuração do navegador ou dados de outros condomínios. O cliente
não pode fornecer esse contexto no corpo da pergunta. Falha de leitura ou escopo divergente
interrompe a geração com erro de contexto, sem simular esquecimento.

A projeção é carregada novamente a cada consulta, inclusive em um chat novo ou com histórico
desligado. Não amplia a janela de oito interações nem cria memória global: usa o perfil já
existente do condomínio atual. Perfil e histórico, junto ao foco da tarefa, respeitam os
12.000 bytes; o cadastro básico recebe espaço antes dos turnos mais antigos, sem cortar mensagens.
Perguntas sobre nome, unidades ou resumo do cadastro podem usar esses relatos sem pedir documentos
ou repetir o cadastro. Perguntas sobre regras, saldos, decisões ou informações não cadastradas
mantêm os controles de evidência e abstenção. A fala continua gerada, sem resposta pronta.

Correção autorizada pelo relato de 29/10/2026: a conversa confirmava nome/unidades e em seguida
negava conhecê-los. Atende briefing §§2, 6.2–6.5, 7 (Bloco 5), 9–10 e 13, sem antecipar blocos
ou alterar prompt, provedor, dependência ou persistência. O gate competitivo mantém o chat,
reduz repetição, preserva isolamento e procedência, diferencia cadastro de memória documental,
valida o fluxo HTTP e seus controles negativos e reutiliza o repositório existente.

## 4. Critérios de sucesso

- a conversa pode aprender dados sem formulário longo;
- nenhum dado é aprendido de texto ambíguo ou de documento;
- dados de outro condomínio não aparecem no menu;
- citações, abstenção, riscos e vetorização permanecem inalterados.
- dados básicos registrados chegam às respostas após o cadastro e permanecem isolados entre condomínios.
