# Spec 026 — Conversa aberta e contextual da Alvitra

**Status:** implementação sintética em validação; dados reais bloqueados
**Responsável:** produto e engenharia
**Atualizado em:** 2026-11-04

## 0. Alinhamento com a visão do projeto

### Partes do briefing atendidas

| Dimensão da visão | Seções do briefing | Como esta spec contribui |
| --------------------- | --------------------------- | --------------------------------------------------------------------------------------------------------------------- |
| Problema e hipótese   | §§1, 2 e 4                  | Permite começar pela pergunta real sem anexo imediato e explica quando o documento é necessário para responder localmente. |
| Público e proposta    | §§3 e 5                     | Mantém o foco em síndicos profissionais e moradores e transforma achados em próximos passos.                          |
| Experiência           | §§6 e 7, Blocos 2, 5, 6 e 7 | Gera mensagens contextuais na conversa, incluindo configuração, orientação e análise de anexos.                       |
| Evidência e segurança | §§8–10                      | Combina orientação geral e lei aplicável, separa fatos locais e preserva tenant, citação, abstenção e revisão humana. |
| Técnica e validação   | §§12–14                     | Usa gateway substituível, mede qualidade, custo e respostas aprovadas por evals.                                      |

### Limites respeitados

O ajuste de comunicação solicitado em 2026-10-27 aplica briefing §§1, 6.4, 7 (Bloco 6) e 9:
explicita que enviar documentos relevantes é essencial para conhecer o condomínio e que a
ausência deles dificulta a ajuda local. Atende ao gate competitivo por esclarecer o valor da
memória documental na conversa, sem módulo ou chamada adicional. Preserva orientação geral,
isolamento, citações e pedidos contextuais; testes e geração sintética verificam o resultado.

- O chat continua sendo a interface principal; não cria dashboard ou módulo paralelo.
- A conversa e a configuração começam sem upload obrigatório; respostas sobre fatos e regras particulares do condomínio exigem os documentos relevantes e evidência autorizada.
- A legislação oficial só fundamenta uma regra legal quando a fonte relevante, a jurisdição e a vigência puderem ser verificadas; conhecimento do modelo não é citação legal.
- Fotos e documentos seguem os fluxos de ingestão, acesso, retenção e revisão já especificados; esta spec não libera dados reais nem amplia formatos aceitos.
- Não executa ações externas sem confirmação humana e não oferece parecer profissional definitivo.

### Divergências da visão

Nenhuma após a instrução explícita do usuário de 2026-10-15, incorporada ao briefing nesta mesma decisão. O prompt foi apresentado ao usuário e aprovado na mesma conversa com o ajuste de citar leis e documentos somente quando necessário.

### Checklist de alinhamento

- [x] O briefing completo foi lido na versão atual.
- [x] A spec resolve um problema e testa a hipótese da conversa útil sem atrito.
- [x] O público e a proposta de valor permanecem coerentes.
- [x] Itens fora do escopo e sequenciamento foram respeitados.
- [x] Isolamento, evidência, custo e confirmação humana foram preservados.
- [x] Critérios de sucesso validam utilidade, grounding e custo.
- [x] Não existe divergência silenciosa.

## 1. Objetivo

A Alvitra responde de forma própria e natural a perguntas abertas, analisa anexos autorizados e diz com franqueza o que encontrou, por quê e como o síndico pode avançar.

## 2. Promessa testada

> Posso perguntar do meu jeito e enviar o material que tenho; a Alvitra responde como uma boa parceira de trabalho, explica a base e aponta o próximo passo.

## 3. Usuário primário

Síndico profissional ou morador usando a conversa para orientar decisões e tarefas do condomínio.

## 4. Escopo

- mensagens de conversa geradas a partir da intenção, do estado e do contexto autorizado, inclusive saudação e configuração inicial;
- perguntas gerais sobre sindicatura sem exigir anexo, usando orientação de IA e legislação oficial aplicável disponível;
- explicação de que o documento local relevante é necessário para uma resposta específica, sem exigir seu envio imediato nem bloquear a orientação geral que já pode ser oferecida;
- perguntas de outros temas respondidas normalmente, com relação à sindicatura somente quando útil;
- análise de documentos e fotos já aceitos pelo produto, com evidência, qualidade e limitações visíveis;
- tom agradável, direto e firme quando houver erro ou risco comprovável;
- resposta que distingue fato observado, interpretação e recomendação;
- adaptadores OpenAI e Gemini atrás do gateway existente, sujeitos a decisão técnica registrada,
  configuração segura e teste sintético antes de ativação;
- migração gradual para OpenAI, preservando Gemini como alternativa temporária de resposta,
  análise visual e busca de fotos até sua retirada ser aprovada explicitamente.

## 5. Fora do escopo

- novos formatos de arquivo, vídeo ou análise de várias imagens de uma vez;
- navegação autônoma na web, ações externas, contato com terceiros ou decisões profissionais definitivas;
- uso de dados reais antes dos gates de privacidade, retenção e fornecedor;
- resposta local sem evidência ou inferência visual apresentada como diagnóstico.

## 6. Pré-condições

- o prompt em `system-prompt-proposto.md` foi apresentado e aprovado antes da aplicação;
- a conta do provedor ativo, a chave de API, o faturamento e os limites de custo são configurados
  pelo operador fora do repositório;
- a biblioteca legal oficial identifica fonte, versão, vigência e jurisdição das normas que usar;
- as rotas de chat e anexos preservam autenticação e `condominium_id` autorizado;
- há baseline de evals sintéticos para grounding, abstenção, tom, risco e custo.

## 7. Requisitos funcionais

### RQ-2601 — Conversa gerada

Toda mensagem atribuída à Alvitra é gerada conforme o estado da conversa e a entrada atual. Boas-vindas, perguntas de configuração, retomada e respostas não são frases fixas. Mensagens técnicas da interface podem ser fixas e não aparecem como fala da Alvitra. Se o provedor estiver indisponível, a interface informa a indisponibilidade sem fingir que houve resposta da assistente.

Durante a configuração, cada turno da pessoa é interpretado no contexto recente da conversa. A
Alvitra distingue uma resposta à pergunta atual de uma dúvida, pedido de exemplo, correção,
saudação ou comentário e responde naturalmente antes de decidir se o cadastro deve avançar. O
cliente não seleciona a intenção por listas de frases ou palavras-chave. Somente um valor
estruturado, compatível com a etapa e validado pelo servidor, pode alterar o cadastro.

### RQ-2602 — Perguntas abertas

Perguntas gerais recebem orientação útil sem documento do condomínio. Quando uma regra legal for
necessária, a Alvitra usa somente fonte oficial recuperada, relevante para a jurisdição e com
vigência verificável. Se a norma necessária não estiver disponível, explica o limite e ainda oferece
orientação prática que não dependa de afirmar essa regra. Em outros temas, responde ao pedido e só
traz a perspectiva do síndico quando houver relação natural. Informação dependente de atualização
ou risco alto não recebe certeza sem base adequada.

### RQ-2603 — Fatos locais e anexos

Afirmações específicas do condomínio exigem evidência recuperada do contexto autorizado, com
documento, versão, página e trecho. Quando a resposta local depender de um documento ausente, a
Alvitra explica por que seu envio é essencial e por que a falta dele dificulta a ajuda com precisão,
pede somente o material pertinente e continua respondendo com orientação geral e base legal disponível. A fala
não minimiza a necessidade, não diz “não precisa enviar” e não oferece adiamento espontâneo. Se o usuário
não enviar o material naquele momento, ela segue a conversa e mantém a lacuna explícita;
ao recebê-lo, aprofunda a resposta. Documento ou foto ilegível, incerto ou conflitante leva à
limitação correspondente. Descrição de imagem é rotulada como observação de IA e conferível no
original.

### RQ-2604 — Franqueza construtiva

Quando houver problema, a Alvitra o nomeia, explica o motivo e o impacto, e propõe um a três passos concretos. Quando algo estiver saudável, reconhece sem elogio inventado. Evita humilhação, alarmismo e concordância automática.

O ajuste solicitado em 2026-10-27 reforça o tom de consultora proativa e acessível: falar como
gente, explicar termos contábeis indispensáveis e evitar formatação robótica. A interface não
acrescenta rótulos “Atenção”, “Próximo passo” ou blocos mecânicos de insuficiência à fala gerada.
Limitações reais, conflitos, fontes e recomendação de validação humana continuam disponíveis na
própria conversa. O system prompt já aprovado permanece inalterado nesta correção de apresentação.

### RQ-2605 — Provedores e validação

A OpenAI e a Gemini são integradas pelo servidor sob o mesmo contrato do gateway. OpenAI tem
prioridade quando configurada; Gemini atende quando OpenAI não estiver configurada e serve como
alternativa temporária quando o provedor principal estiver indisponível. O aplicativo valida
autorização antes de enviar contexto e valida saída, citações e risco depois da geração. Falha dos
provedores não pode produzir uma resposta fabricada como se fosse da Alvitra.

Para uso pessoal em demonstração local, o opt-in da [Spec 042](../042-conversas-locais-plano-codex/spec.md)
usa o plano ChatGPT por meio do Codex CLI em todas as mensagens geradas, inclusive configuração.
Esse modo é exclusivo, sem fallback para APIs com cobrança separada; a seleção padrão acima
permanece nos demais ambientes. Não autoriza dados reais, hospedagem pública ou mudança do prompt.

A exceção local explicitamente solicitada em 04/11/2026 está delimitada na
[Spec 066](../066-documentos-teste-locais/spec.md): contexto opt-in de simulação para não recusar
documentos apenas pela origem sintética nem repetir avisos rotineiros de teste, sem alterar a
personalidade, os validadores ou o comportamento padrão de produção.

Na interpretação `setup_turn`, a Gemini também recebe um JSON Schema de saída com exatamente
`intent`, `field`, `value` e `reply`, todos obrigatórios, sem propriedades adicionais. O formato
é pedido no transporte mesmo sem evidência documental; o validador local continua recusando
campos extras, tipos e transições inválidos. Não descartar silenciosamente um campo extra para
avançar o cadastro nem alterar o prompt aprovado. Isso detalha briefing §§6 e 10: conversa
natural sem transformar saída arbitrária do provedor em dado cadastral.

A correção de 03/11/2026 também valida a coerência da fala com a transição de cadastro
(AC-2403a da Spec 024). O servidor informa as transições como dados do turno, sem mudar o
system prompt aprovado ou classificar a intenção da pessoa por palavras-chave. Para atualizações
válidas que ainda deixam um campo pendente, verifica a pergunta desse campo e sinais explícitos
de conclusão prematura. Uma única reparação no mesmo gateway/tarefa pode reescrever a fala,
mantendo intenção, campo e valor. Falha persistente não produz fala pronta nem atualiza o
cadastro. Os limites por geração permanecem; não há classificador pago ou escalada de modelo.

### RQ-2606 — Fotos durante a migração de provedor

Uma foto autorizada pode ser interpretada pelo adaptador OpenAI preferencial ou pelo adaptador
Gemini temporariamente preservado; descrição, texto percebido e limitações permanecem separados e
verificáveis no original. Cada índice usa o perfil vetorial compatível com o adaptador ativo, sem
comparar silenciosamente vetores OpenAI e Gemini. Busca, processamento na API e no worker,
autorização, retenção e citações seguem escopados ao condomínio. Fotos antigas não podem ser
declaradas migradas sem recomputar seus vetores.

O teste de disponibilidade e a consulta vetorial de fotos usam o perfil do adaptador ativo,
não uma constante de provedor. O vetor devolvido deve corresponder a todos os identificadores
desse perfil e ter dimensões/valores válidos; mesma dimensão não torna perfis compatíveis.
Sem fotos elegíveis no perfil ativo, não há chamada externa de embedding de imagem.

## 8. Contratos

- Entrada: intenção, estado conversacional minimizado, `condominium_id` autorizado, pergunta e evidências recuperadas.
- Saída: mensagem, modo de resposta, citações permitidas, limitações, próximo passo e telemetria minimizada.
- O estado conversacional não confere autoridade a documentos ou mensagens do usuário.
- O provedor de resposta é configurável; chave e conteúdo sensível não entram no cliente ou em logs.

## 9. Requisitos não funcionais

- zero mistura de condomínios em retrieval, chamada ao modelo, cache ou resposta;
- custo por resposta e latência observáveis sem armazenar texto integral em telemetria;
- avaliação sintética de tom, utilidade, factualidade, citação, abstenção, conflitos, fotos e pressão para concordar;
- respostas proporcionais à pergunta e adequadas em celular e desktop.

## 10. Critérios de sucesso

- perguntas gerais úteis sem documentos e sem fatos locais inventados;
- a necessidade do documento relevante fica clara sem bloquear a conversa; envio posterior permite aprofundar a resposta;
- regras legais citadas correspondem a fonte oficial relevante, vigente e da jurisdição aplicável;
- todas as falas da Alvitra no fluxo inicial e normal são geradas para o contexto;
- análise de documento ou foto preserva procedência e limitação;
- achados negativos incluem motivo e próximo passo quando houver base;
- nenhum caso P0 de tenant, citação ou ação externa; custo médio por resposta aprovada medido.

## 11. Questões em aberto

- medição comparativa de qualidade e custo de OpenAI e Gemini e orçamento operacional;
- verificação contratual e de retenção antes de qualquer documento real;
- reindexação operacional das fotos antigas antes de descontinuar qualquer perfil vetorial;
- cobertura e atualização da biblioteca legal além da Constituição já importada, inclusive normas estaduais e municipais quando a pergunta exigir.

## Gate para mudar o status

Exige aprovação explícita do prompt, decisão de provedor registrada, critérios de aceitação, rastreabilidade, testes e evals aplicáveis. Dados reais seguem seus gates próprios.
