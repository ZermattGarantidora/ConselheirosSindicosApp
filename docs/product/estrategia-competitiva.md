# Diretriz de estratégia competitiva

**Status:** ativa  
**Responsáveis:** produto e engenharia  
**Atualizado em:** 2026-09-03
**Revisão prevista:** trimestral ou quando surgir evidência relevante de mercado ou de piloto

## 1. Autoridade e relação com a visão

Esta diretriz orienta posicionamento, priorização e diferenciação do produto. Ela deriva do `BRIEFING_PRODUTO_CONSELHEIRO_SINDICO.md` e de `docs/product/mvp.md` e não amplia silenciosamente o escopo definido nesses documentos.

Em especial, esta diretriz detalha:

- a visão de um conselheiro operacional que não seja apenas um chat com arquivos, conforme §§1, 5 e 10 do briefing;
- o público inicial de síndicos profissionais com aproximadamente 3 a 20 condomínios, conforme §3;
- o problema inicial de encontrar, cruzar e explicar informações com evidência, conforme §4;
- o controle de versão, vigência, procedência, conflitos e confirmação humana, conforme §§9, 11 e 12;
- a validação de confiança, recorrência, economia de tempo, disposição de pagamento e custo sustentável, conforme §§15 a 18 e 21.
- o papel do aplicativo como canal acessível de relacionamento e aquisição para a Zermatt, sem comprometer a independência das respostas, conforme §§1, 5, 12, 16 a 21.

Em caso de conflito, prevalecem o briefing e, depois, a definição do MVP. Uma divergência estratégica só pode prosseguir com aprovação explícita e atualização da fonte superior correspondente.

## 2. Decisão de posicionamento

O produto deve se posicionar como um **conselheiro documental auditável, robusto e fácil de usar para síndicos**, e não como um sistema completo de gestão condominial nem como um chatbot genérico para moradores.

### Público principal

Síndicos profissionais independentes e pequenas empresas de sindicatura que administram aproximadamente 3 a 20 condomínios e já convivem com administradoras, ERPs, pastas, planilhas e canais de comunicação existentes.

### Trabalho principal

Ajudar o síndico a encontrar a regra, decisão ou obrigação aplicável; verificar a base usada; reconhecer ausência, fragilidade ou conflito de evidência; e preparar um próximo passo seguro.

### Promessa competitiva

> Encontre a regra ou decisão correta no documento aplicável, com versão, página e trecho verificáveis — ou saiba claramente por que não há base suficiente.

### Unidade de valor

A unidade de valor não é uma mensagem trocada com a IA. É uma **decisão fundamentada aceita pelo usuário**, uma abstenção correta que evita erro ou uma obrigação confirmada a partir de evidência.

### Papel comercial para a Zermatt

O aplicativo é um canal de aquisição orientado por produto: primeiro entrega utilidade recorrente e conquista confiança; depois oferece, de forma separada e opcional, a possibilidade de conhecer ou simular os serviços da Zermatt. A assinatura deve ajudar a cobrir o custo variável e operacional, mas a margem direta do software não é o principal resultado econômico.

Uma oportunidade comercial só conta como valor quando o próprio usuário manifesta interesse ou autoriza contato. O conteúdo confidencial dos documentos não pode ser usado para prospecção oculta, e a orientação da IA não pode ser alterada para favorecer conversão.

## 3. Premissa competitiva

Permitir upload de documentos, perguntas em linguagem natural e citações já é uma capacidade oferecida por IAs genéricas e por fornecedores especializados. Portanto, esses elementos isolados são requisitos básicos, não diferenciais suficientes.

O produto deve ser claramente superior em pelo menos uma combinação verificável de:

1. autoridade documental: procedência, versão, vigência e relação entre documentos;
2. qualidade da evidência: cada afirmação sustentada por trecho verificável;
3. tratamento explícito de ausência, OCR fraco, ambiguidade e conflito;
4. transformação controlada da evidência em próximo passo;
5. isolamento auditável entre condomínios;
6. qualidade e custo medidos por resposta aprovada.
7. conversa natural e facilidade de uso sem exigir conhecimento de prompts;
8. confiança suficiente para gerar relacionamento comercial voluntário, sem pressão ou viés.

Se uma entrega não fortalece a hipótese central, uma dessas capacidades ou uma aprendizagem necessária de validação, ela deve ser adiada.

## 4. Panorama competitivo de referência

Este panorama registra evidências públicas consultadas em 2026-09-01. As páginas dos fornecedores representam alegações comerciais, não validação independente. Antes de uma decisão relevante de posicionamento, preço ou parceria, as informações devem ser verificadas novamente.

| Grupo | Exemplos | Força observada | Implicação para o projeto |
|---|---|---|---|
| IAs documentais condominiais | [MeuSind](https://meusind.com.br/documentos-do-condominio/), [SíndicoAI](https://sindicoai.com/) | Consulta de convenção, regimento e atas, com indicação pública de fonte; atendimento e fluxos por WhatsApp | Fonte citada e especialização condominial não bastam como diferenciação |
| Plataformas operacionais com IA | [MeuSíndico.IA](https://meusindico.ia.br/), [SindIA](https://sindia.ia.br/), [Mr. Condo](https://mrcondo.com.br/), [Condarium](https://www.condarium.com/) | Chamados, comunicação, reservas, tarefas e outras ações conectadas à IA | Não competir inicialmente por amplitude nem por autonomia operacional |
| Gestão de carteira | [Dico](https://www.dico.digital/), [Síndico.Cloud](https://sindico.cloud/) | Visão multi-condomínio, documentos, contratos, manutenções, prazos e operação consolidada | Acompanhamento de obrigações precisa nascer da evidência, não ser apenas outra agenda manual |
| Incumbentes e ecossistemas | [uCondo](https://www.ucondo.com.br/ia-mora-assistente), [Superlógica](https://superlogica.com/condominios/), [Group Software](https://www.groupsoftware.com.br/solucoes/condominios/) | Distribuição, financeiro, comunicação, integrações e possibilidade de incorporar IA ao sistema existente | O produto deve coexistir com o ecossistema atual e vencer em profundidade e confiança |
| Substitutos genéricos | [NotebookLM](https://support.google.com/notebooklm/answer/16164461), [ChatGPT Projects](https://help.openai.com/en/articles/10169521), [Claude Projects](https://support.anthropic.com/en/articles/9517075-what-are-projects) | Upload de arquivos, memória de projeto, recuperação e respostas fundamentadas | O MVP precisa ser materialmente melhor do que carregar PDFs em uma IA genérica |

## 5. Diferenciais obrigatórios

### 5.1 Autoridade documental

O sistema deve tratar o acervo como informação governada, não como uma coleção indiferenciada de arquivos.

Cada versão documental aplicável deve preservar:

- condomínio autorizado;
- tipo e procedência;
- identidade imutável de conteúdo;
- versão;
- vigência conhecida ou pendente;
- relação com versões anteriores;
- qualidade de extração ou OCR;
- estado de revisão pelo usuário.

Uma versão nova não substitui silenciosamente a anterior. Quando fontes aplicáveis forem incompatíveis e não houver regra determinística suficiente, o conflito deve ser exibido.

### 5.2 Contrato de evidência

Uma afirmação documental só pode ser apresentada quando estiver associada a evidência recuperada e autorizada. A citação deve conter documento, versão, página e trecho, e o trecho deve existir na página indicada e sustentar o sentido da afirmação.

Uma resposta fluente sem evidência suficiente é falha. Nessa situação, o sistema deve se abster, explicar o que foi consultado e indicar qual documento ou validação pode resolver a lacuna.

### 5.3 Diagnóstico do acervo

O onboarding deve reduzir o risco antes da primeira pergunta. O produto deve evoluir para identificar e tornar visíveis:

- documentos essenciais ausentes;
- duplicidades;
- arquivos ilegíveis ou com OCR de baixa confiança;
- versão ou vigência não confirmada;
- possível substituição entre documentos;
- conflitos perceptíveis;
- metadados que exigem confirmação humana.

Essa capacidade deve ser construída na sequência autorizada pelas specs; não antecipa escopo fora da fatia ativa.

### 5.4 Próximo passo controlado

Respostas fundamentadas podem originar rascunhos de comunicados ou pendências quando essas capacidades entrarem na sequência do MVP. O resultado derivado deve manter vínculo com as evidências e exigir confirmação humana antes de qualquer ação externa.

Fatos encontrados, interpretação e recomendação devem permanecer separados. Temas de alto risco devem recomendar o especialista adequado e nunca produzir parecer definitivo.

### 5.5 Isolamento demonstrável

Segurança e LGPD não devem aparecer apenas como alegações. O projeto deve demonstrar isolamento em banco, arquivos, busca, embeddings, cache, jobs, prompts, respostas e logs. Toda operação de domínio deve partir de um `condominium_id` autorizado no servidor.

Vazamento entre condomínios, citação fabricada e afirmação documental sem evidência são falhas P0 com tolerância zero.

### 5.6 Qualidade e custo mensurados

Modelos, prompts e estratégias de recuperação devem ser escolhidos pelo custo total de produzir uma resposta aprovada. A arquitetura deve usar o caminho mais econômico que cumpra o piso medido de qualidade, segurança e privacidade, com escalonamento somente quando necessário.

O nome ou prestígio do modelo não é diferencial de produto. O ativo é a capacidade de avaliar, rotear, corrigir e manter qualidade de forma independente do provedor.

### 5.7 Facilidade sem perda de profundidade

O produto pode tratar problemas documentais e operacionais complexos, mas deve esconder a complexidade técnica da experiência. O síndico deve conseguir começar rapidamente, perguntar em linguagem natural, continuar a conversa sem reformular prompts e entender resposta, fonte, ressalva e próximo passo sem treinamento especializado.

Facilidade de uso deve ser medida por tempo até o primeiro valor, conclusão do onboarding, abandono, necessidade de suporte e capacidade de usuários reais obterem respostas corretas sem orientação da equipe.

### 5.8 Separação entre orientação e oferta comercial

Qualquer convite para conhecer a Zermatt deve ser visual e semanticamente separado da resposta da IA, ser compatível com a necessidade apresentada e permitir recusa sem insistência ou perda de funcionalidade. Solicitação de contato, simulação ou envio de dados à equipe comercial exige confirmação explícita.

O sistema não deve classificar silenciosamente um condomínio como oportunidade comercial a partir do conteúdo de convenções, atas, contratos ou outros documentos. Sinais comerciais e métricas devem ser minimizados, transparentes e baseados em ações consentidas do usuário.

## 6. Sequenciamento obrigatório

### Fase atual — primeira fatia da Spec 001

Priorizar exclusivamente o núcleo necessário para provar confiança documental:

- identidade, autorização e isolamento entre ao menos dois condomínios;
- ingestão de PDF textual ou digitalizado;
- metadados de procedência, versão, vigência e qualidade do OCR;
- recuperação isolada;
- resposta fundamentada com citação verificável;
- abstenção, conflito, falha segura e escalonamento;
- feedback, auditoria, custo e latência.

Extração de obrigações e geração de comunicados pertencem ao MVP, mas permanecem fora desta primeira fatia até que a Spec 001 cumpra seus critérios.

### Próximas capacidades do MVP

Depois de validar o núcleo documental, avançar em fatias pequenas para:

1. demais formatos documentais autorizados pelo briefing;
2. resumos estruturados;
3. rascunhos de comunicados baseados em fatos confirmados;
4. extração de datas, obrigações e responsáveis para pendências confirmáveis;
5. feedback e correções que melhorem a avaliação sem alterar trilhas históricas.
6. caminho comercial mínimo e separado para o usuário solicitar informações ou uma simulação da Zermatt, somente depois que a utilidade e a confiança do núcleo estiverem demonstradas.

### Somente após validação

Comparação de orçamentos, análise contratual aprofundada, preparação de assembleias, gestão de fornecedores, permissões ampliadas, integrações e painel consolidado de carteira só devem avançar quando as evidências de uso e compra justificarem a expansão.

## 7. Fronteiras que não devem ser cruzadas inicialmente

O projeto não deve buscar paridade de funcionalidades com suítes condominiais. Permanecem fora do escopo inicial:

- contabilidade, boletos e gestão bancária;
- portaria e controle de acesso;
- aplicativo completo para moradores;
- reservas, encomendas e jornada operacional completa do morador;
- marketplace ou despacho autônomo de fornecedores;
- envio automático de mensagens;
- ações irreversíveis ou sem confirmação humana;
- parecer jurídico definitivo;
- integrações amplas antes de comprovar uso recorrente.
- contato comercial automático ou sem consentimento explícito;
- prospecção ou qualificação comercial baseada silenciosamente em documentos confidenciais;
- alteração de respostas, recomendações ou alertas para favorecer conversão.

WhatsApp, novas integrações e automações não são atalhos para validação da hipótese central. Só devem ser priorizados quando houver evidência de que influenciam recorrência, economia de tempo ou compra sem comprometer os princípios de confiança.

## 8. Gate para decisões de produto

Toda proposta de nova funcionalidade, mudança de prioridade ou expansão de escopo deve responder:

1. Qual seção do briefing autoriza e limita a proposta?
2. Qual hipótese central ou métrica de validação ela ajuda a testar?
3. Ela melhora autoridade documental, evidência, segurança, recorrência ou custo de modo mensurável?
4. Por que o usuário não resolveria o mesmo trabalho carregando arquivos em uma IA genérica?
5. A proposta pertence à fase atual, ao restante do MVP ou ao período posterior à validação?
6. Como preserva isolamento, abstenção, conflitos, rastreabilidade e confirmação humana?
7. Qual teste, eval ou observação de piloto demonstrará que funcionou?
8. O benefício compensa custo de implantação, suporte e complexidade permanente?
9. A proposta preserva a separação entre orientação independente e interesse comercial da Zermatt?
10. Se houver geração de oportunidade, qual ação explícita do usuário representa consentimento e como a recusa será respeitada?

Se uma resposta essencial estiver ausente, a proposta permanece em descoberta e não deve entrar em implementação.

## 9. Validação competitiva

O benchmark deve usar o mesmo conjunto de documentos e perguntas para o produto, ao menos um concorrente especializado e ao menos uma IA genérica. A avaliação deve ser cega sempre que possível.

O conjunto deve cobrir pelo menos:

- pergunta direta com uma fonte;
- cruzamento de convenção, regimento, atas e contratos;
- versão anterior versus versão vigente;
- conflito sem prioridade determinística;
- ausência de evidência;
- OCR incompleto ou de baixa qualidade;
- citação que parece relevante, mas não sustenta a conclusão;
- pergunta de alto risco;
- tentativa de prompt injection documental;
- tentativa de acesso ou mistura entre condomínios.

Dados reais de clientes e dados pessoais não podem entrar em fixtures, testes ou evals. Casos provenientes de pilotos devem ser sanitizados ou transformados em casos sintéticos antes de integrar o conjunto permanente.

## 10. Métricas

### Métrica principal de produto

**Decisões fundamentadas aceitas por condomínio ativo por semana.**

Uma decisão fundamentada aceita é uma resposta que o usuário classifica como correta e suficientemente sustentada, ou que origina um próximo passo confirmado.

### Métrica principal de negócio

**Oportunidades comerciais qualificadas e consentidas por usuários ativos.**

Uma oportunidade qualificada exige manifestação explícita do usuário para conhecer, simular ou conversar sobre os serviços da Zermatt. Visualização de oferta, tema de uma pergunta ou conteúdo de documento não são suficientes para classificar alguém como lead.

### Métricas de confiança

- respostas corretas e fundamentadas;
- citações que realmente sustentam as afirmações;
- uso da versão aplicável;
- abstenções corretas;
- conflitos detectados e exibidos;
- recomendações adequadas de especialista;
- correções, rejeições e respostas desatualizadas;
- incidentes de isolamento, com tolerância zero.

### Métricas de valor e negócio

- redução de tempo por tarefa;
- retorno semanal;
- perguntas e decisões aceitas por condomínio;
- tempo e abandono do onboarding;
- conversão de piloto para pago;
- ativação de múltiplos condomínios por profissional;
- custo médio por resposta aprovada;
- percentual de tarefas resolvidas por caminhos econômicos.
- preço pago em relação ao custo variável por usuário ativo;
- solicitações voluntárias de contato ou simulação;
- oportunidades qualificadas por usuários e condomínios ativos;
- custo do aplicativo por oportunidade qualificada;
- conversão de oportunidade consentida em conversa comercial e, depois, em contrato;
- percepção de que a oferta é transparente, opcional e não invasiva.

Volume de mensagens, documentos ou tokens não deve ser usado isoladamente como evidência de valor.

## 11. Ativos defensáveis a acumular

O projeto deve acumular, de forma compatível com privacidade e consentimento:

- casos de eval representativos do domínio;
- relações estruturadas entre tipos, versões, vigências e conflitos documentais;
- correções e motivos de rejeição sanitizados;
- padrões de abstenção e escalonamento;
- evidência de economia de tempo e confiança;
- controles e testes de isolamento reproduzíveis;
- histórico de custo por tarefa e por resposta aprovada.
- aprendizado agregado sobre conversão consentida, momento da oferta e percepção de confiança, sem incorporar conteúdo confidencial de clientes.

O modelo de IA utilizado pode mudar. Esses ativos, a disciplina de avaliação e a confiança conquistada são a base de diferenciação duradoura.

## 12. Regra de manutenção

Esta diretriz deve ser revisada antes de alterações relevantes de posicionamento, público, sequência do roadmap ou proposta de valor, e ao menos trimestralmente enquanto a hipótese de produto estiver em validação.

Uma revisão deve:

1. verificar novamente as principais alegações dos concorrentes;
2. incorporar evidências de entrevistas, pilotos, métricas e perdas comerciais;
3. confirmar alinhamento com briefing e MVP;
4. remover diferenciais que tenham se tornado comuns;
5. registrar qualquer mudança de prioridade nas specs e critérios de aceitação correspondentes antes da implementação.
