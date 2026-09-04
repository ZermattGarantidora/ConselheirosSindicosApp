# Briefing de produto — Conselheiro virtual para síndicos

## 1. Visão do produto

Construir um conselheiro de IA robusto, fácil de usar, acessível e confiável para síndicos. O produto deve reunir profundidade documental e inteligência operacional em uma experiência intuitiva: o usuário explica sua necessidade em linguagem natural e o sistema encontra o contexto autorizado do condomínio, apresenta a resposta, as evidências, os pontos de atenção e o próximo passo aplicável.

O produto pode ser sofisticado em suas capacidades, mas não deve transferir essa complexidade ao síndico. A IA deve compreender conversas, localizar e cruzar os documentos e versões corretos, produzir recomendações fundamentadas, gerar alertas relevantes e reconhecer situações de risco, conflito ou incerteza.

O produto não deve ser apenas um “ChatGPT com documentos”. Seu valor precisa estar em transformar documentos dispersos em respostas fundamentadas, tarefas acompanháveis e alertas úteis, reduzindo tempo, esquecimento e risco operacional.

Para a Zermatt Garantidora, o aplicativo será um canal de aquisição, relacionamento e construção de confiança com síndicos. Seu objetivo econômico principal não é maximizar a margem da assinatura, mas viabilizar uso recorrente e gerar oportunidades comerciais qualificadas para os serviços da Zermatt, sempre de forma transparente, opcional e consentida.

As respostas, recomendações e alertas da IA devem permanecer independentes do interesse comercial da Zermatt. A utilidade vem antes da oferta: uma oportunidade comercial só pode ser apresentada separadamente quando houver relação legítima com a necessidade do usuário, e nenhum contato pode ocorrer sem uma ação ou confirmação clara do síndico.

O produto deve operar com **o menor custo sustentável capaz de preservar o piso de qualidade**. A acessibilidade de preço é parte da proposta de valor e da arquitetura, não uma otimização posterior. Cada tarefa deve usar o caminho mais econômico que alcance o nível mínimo exigido de precisão, segurança e qualidade. A redução de custo nunca pode justificar uma resposta menos confiável.

## 2. Hipótese central

Síndicos perdem tempo procurando informações, interpretando regras, cobrando fornecedores, acompanhando prazos e redigindo comunicações. Um conselheiro com memória específica do condomínio pode reduzir esse esforço e ajudar o síndico a decidir com mais segurança.

Esta é uma hipótese a validar. Não assumir que chat é necessariamente a melhor interface, que o síndico pagará pelo produto ou que confiará em recomendações jurídicas e financeiras feitas por IA.

Também é hipótese a validar que utilidade recorrente e confiança no aplicativo podem gerar interesse comercial qualificado pelos serviços da Zermatt sem tornar a experiência invasiva, enviesar recomendações ou reduzir a confiança do síndico.

## 3. Público inicial recomendado

### Principal

Síndicos profissionais independentes ou pequenas empresas de sindicatura que administram aproximadamente 3 a 20 condomínios.

Motivos:

- o problema se repete em vários condomínios;
- economia de tempo tem valor financeiro direto;
- possuem maior frequência de uso;
- tendem a ter processos e documentos mais organizados;
- um cliente pode ativar vários condomínios;
- conseguem avaliar melhor a qualidade das respostas.

### Público secundário

- síndicos moradores de condomínios médios e grandes;
- administradoras que desejam aumentar a produtividade de gerentes e atendentes;
- conselheiros, subsíndicos e funcionários, com permissões limitadas.

Administradoras grandes não devem ser o primeiro público: normalmente exigem integrações, segurança, implantação, suporte e vendas mais complexas.

## 4. Problema inicial a resolver

**Encontrar, cruzar e explicar informações específicas do condomínio com evidência documental.**

Exemplos:

- “O que a convenção diz sobre locação por temporada?”
- “Quem pode votar nesta assembleia?”
- “Esta decisão exige assembleia ou pode ser tomada pelo síndico?”
- “Qual foi a última decisão registrada sobre vagas de garagem?”
- “Quando este contrato vence e como funciona a rescisão?”

As respostas devem:

1. usar somente documentos autorizados;
2. mostrar documento, página e trecho que sustentam a resposta;
3. separar fatos do condomínio, interpretação e recomendação;
4. declarar quando não houver evidência suficiente;
5. recomendar especialista quando houver risco jurídico, contábil, técnico ou de segurança.

## 5. Proposta de valor

> Converse naturalmente com uma IA que entende o contexto do condomínio, encontra a fonte correta e ajuda a tomar decisões e acompanhar obrigações com segurança.

Benefícios esperados:

- menos tempo procurando e relendo documentos;
- menos dependência de memória pessoal e mensagens antigas;
- menor risco de perder prazos ou contrariar regras internas;
- comunicação mais rápida e consistente;
- histórico organizado para troca de gestão;
- ganho de escala para síndicos profissionais.
- experiência fácil de usar, sem exigir conhecimento técnico ou comandos complexos;
- preço acessível, viabilizado por uso eficiente e seletivo de modelos de IA.

### Valor para a Zermatt

- relacionamento recorrente com síndicos antes de qualquer abordagem comercial;
- oportunidades qualificadas geradas por interesse explícito do usuário;
- fortalecimento da confiança e da lembrança da marca por utilidade real;
- aprendizado sobre as necessidades dos síndicos sem usar documentos confidenciais para prospecção oculta;
- custo de aquisição mensurável em relação ao uso e às oportunidades consentidas.

## 6. Principais oportunidades

1. **Consulta documental com fontes:** responder sobre convenção, regimento, atas e contratos citando a origem.
2. **Memória institucional:** preservar decisões e contexto quando muda o síndico ou a administradora.
3. **Agenda de obrigações:** extrair vencimentos, reajustes, inspeções, renovações e compromissos.
4. **Análise de contratos:** resumir obrigações, multas, reajustes, riscos e condições de rescisão.
5. **Comparação de orçamentos:** normalizar escopos, apontar itens ausentes e evitar comparação apenas pelo preço.
6. **Comunicação assistida:** criar comunicados consistentes com as regras e o histórico do condomínio.
7. **Preparação de assembleias:** pauta, convocação, documentos de apoio, perguntas previsíveis e resumo posterior.
8. **Triagem de ocorrências:** identificar recorrência, urgência, responsável e próximo passo.
9. **Gestão proativa:** alertar sobre itens atrasados ou próximos do vencimento.
10. **Escalonamento seguro:** reconhecer situações que precisam de advogado, contador, engenheiro, seguradora ou administradora.

## 7. Funcionalidades priorizadas

### Prioridade 1 — MVP

1. Cadastro de condomínios separados, sem mistura de dados.
2. Upload de PDF, DOCX, planilhas e imagens digitalizadas.
3. Organização por tipo de documento e data de vigência.
4. Chat com respostas fundamentadas nos documentos.
5. Citação clicável com documento, página e trecho.
6. Resumo estruturado de convenções, atas e contratos.
7. Geração de comunicados a partir do contexto recuperado.
8. Extração de datas, obrigações e responsáveis para uma lista de pendências.
9. Feedback do usuário: correto, incorreto, incompleto ou desatualizado.
10. Registro das fontes e do raciocínio operacional apresentado ao usuário.
11. Caminho comercial separado e opcional para que o usuário solicite conhecer ou simular os serviços da Zermatt, sempre com confirmação explícita.

### Prioridade 2 — após validação

- comparação estruturada de orçamentos;
- análise de contratos com checklist de riscos;
- preparação e resumo de assembleias;
- gestão de fornecedores;
- permissões para conselho e equipe;
- integração com e-mail, calendário e sistemas de administradoras;
- painel multi-condomínio para síndicos profissionais.

### Não construir inicialmente

- contabilidade completa;
- emissão de boletos e gestão bancária;
- aplicativo completo para moradores;
- controle de acesso e portaria;
- marketplace de fornecedores;
- automação irreversível de decisões;
- parecer jurídico definitivo;
- integração com muitos sistemas antes de comprovar uso recorrente.
- prospecção automática baseada no conteúdo confidencial dos documentos;
- contato comercial sem solicitação ou confirmação do usuário;
- recomendação comercial disfarçada de orientação imparcial da IA.

## 8. Funcionalidades proativas

1. **Manutenções atrasadas:** identificar tarefas vencidas ou sem comprovação de execução.
2. **Contratos e seguros:** avisar sobre vencimento, renovação automática, reajuste e janela de cancelamento.
3. **Gastos anormais:** sinalizar aumentos relevantes ou despesas fora do padrão histórico.
4. **Problemas recorrentes:** agrupar ocorrências semelhantes e indicar possíveis causas ou fornecedores envolvidos.
5. **Resumo semanal:** apresentar prioridades, riscos, pendências, compromissos e decisões necessárias naquela semana.

Toda sugestão proativa deve mostrar por que o alerta foi criado, quais dados foram usados e qual é o nível de confiança.

## 9. Dados e documentos necessários

### Essenciais para o MVP

- convenção condominial e alterações;
- regimento interno;
- atas de assembleias;
- contratos ativos;
- orçamentos e propostas;
- cronogramas e relatórios de manutenção;
- cadastro básico de fornecedores;
- lista de pendências informada pelo síndico.

### Posteriores

- despesas e balancetes;
- apólices e sinistros;
- chamados e ocorrências;
- laudos, certificados e garantias;
- e-mails e comunicados;
- calendário de obrigações;
- histórico de aprovações e responsáveis.

Os documentos precisam ter versão, vigência e procedência. Um documento mais recente não deve substituir silenciosamente outro sem registrar a relação entre eles.

## 10. Diferencial em relação a ChatGPT, Gemini e Claude

O diferencial não pode ser apenas permitir perguntas. O produto deve oferecer:

- separação segura entre condomínios;
- memória persistente, estruturada e controlável;
- respostas com fontes precisas;
- controle de versões e vigência dos documentos;
- permissões por condomínio e função;
- alertas e acompanhamento de obrigações;
- fluxos específicos de contratos, atas, orçamentos e manutenções;
- histórico auditável;
- critérios explícitos para encaminhamento a especialistas;
- experiência multi-condomínio.
- conversa natural e contextual sem exigir que o síndico aprenda a formular prompts;
- experiência fácil de usar apesar da complexidade documental e operacional tratada pelo sistema.

Se essas capacidades não forem claramente melhores do que carregar arquivos em uma IA genérica, o produto terá pouco poder de diferenciação.

## 11. Experiência principal

### Entrada

1. Usuário cria o condomínio.
2. Envia um conjunto pequeno de documentos essenciais.
3. Sistema classifica os arquivos, extrai datas e aponta documentos ausentes ou duplicados.
4. Usuário confirma o que está vigente.

O onboarding deve exigir poucos passos, explicar claramente o estado de cada documento e permitir que o síndico comece sem treinamento técnico.

### Uso

1. Usuário pergunta ou seleciona uma tarefa.
2. Sistema recupera apenas o contexto relevante daquele condomínio.
3. Resposta apresenta conclusão, evidências, ressalvas e próximo passo.
4. Usuário pode abrir a fonte, corrigir a resposta ou transformar o resultado em comunicado ou pendência.
5. Quando houver relação legítima com os serviços da Zermatt, a interface pode apresentar separadamente um convite opcional para conhecer o serviço ou solicitar uma simulação.

### Formato recomendado da resposta

- **Resposta direta**
- **Base documental**
- **Pontos de atenção**
- **Próximo passo sugerido**
- **Quando consultar um especialista**

## 12. Princípios de segurança e confiança

- Nunca apresentar orientação jurídica como certeza quando houver interpretação possível.
- Não inventar regras ausentes nos documentos.
- Informar conflitos entre convenção, regimento, atas e contratos.
- Permitir que o usuário veja e corrija os dados extraídos.
- Exigir confirmação humana antes de enviar mensagens, alterar prazos ou executar ações externas.
- Registrar acesso, alterações, respostas e fontes utilizadas.
- Criptografar dados em trânsito e armazenados.
- Implementar exclusão, exportação, retenção e controle de acesso compatíveis com a LGPD.
- Não usar documentos dos clientes para treinamento sem consentimento específico.
- Separar claramente “informação encontrada”, “interpretação da IA” e “recomendação”.
- Não alterar respostas ou recomendações para favorecer uma oportunidade comercial da Zermatt.
- Não usar o conteúdo dos documentos para qualificação ou prospecção comercial sem consentimento específico, claro e informado.
- Separar visualmente a orientação da IA de qualquer convite comercial.
- Não iniciar contato comercial sem confirmação humana explícita, nem reduzir a utilidade do produto quando uma oferta for recusada.

## 13. Situações que exigem especialista

O produto deve recomendar validação humana em temas como:

- disputas jurídicas ou risco de processo;
- aplicação de multas controvertidas;
- acidentes, obras estruturais e segurança;
- interpretação legal sem base documental suficiente;
- questões trabalhistas e tributárias;
- suspeita de fraude ou desvio;
- sinistros e cobertura securitária;
- contratos de alto valor ou rescisões relevantes;
- proteção de dados pessoais;
- decisões que possam gerar responsabilidade civil ou criminal.

## 14. MVP mais simples possível

Uma aplicação web com:

- autenticação;
- criação de um ou mais condomínios;
- upload de documentos;
- processamento de texto e OCR;
- busca semântica com isolamento por condomínio;
- chat com citações de página;
- geração de comunicado;
- extração de datas e pendências;
- feedback sobre as respostas;
- painel básico de documentos e obrigações.
- acesso separado e opcional para solicitar informações ou uma simulação dos serviços da Zermatt.

Não automatizar ações externas no MVP. O objetivo inicial é provar que as respostas são confiáveis, economizam tempo e geram uso recorrente.

## 15. Estratégia técnica inicial

- Arquitetura preparada para trocar ou combinar provedores de IA.
- Modelo econômico para classificação, extração e redação simples.
- Modelo mais capaz para interpretação de documentos e decisões complexas.
- Recuperação de contexto por condomínio, documento, versão, data e nível de permissão.
- Respostas geradas somente após localizar evidências suficientes.
- OCR com indicador de qualidade para documentos escaneados.
- Avaliação automatizada e humana de precisão, citação, cobertura e alucinação.

### Arquitetura orientada a custo

- Não enviar todos os documentos a cada pergunta; recuperar somente páginas e trechos relevantes.
- Usar cache de prompts, resultados de OCR, resumos, embeddings e conteúdos recorrentes.
- Processar documentos uma vez e reutilizar texto, metadados, datas e entidades extraídas.
- Usar modelos pequenos para classificação, roteamento, extração, títulos, comunicados simples e identificação inicial de datas.
- Escalar para um modelo intermediário apenas quando a pergunta exigir interpretação ou cruzamento de fontes.
- Reservar modelos premium para situações raras, complexas ou de maior risco.
- Permitir que regras determinísticas resolvam tarefas que não precisam de LLM, como comparação de datas e disparo de vencimentos.
- Limitar respostas desnecessariamente longas e controlar o orçamento máximo de tokens por tarefa.
- Executar rotinas não urgentes, quando possível, em horários ou modalidades de processamento mais baratos.
- Manter compatibilidade com múltiplos provedores para aproveitar melhor relação entre preço e qualidade e evitar dependência comercial.
- Registrar custo estimado por pergunta, funcionalidade, condomínio, modelo e provedor.
- Criar limites de gasto e alertas internos para impedir consumo anormal.

### Política de seleção de modelos

Escolher modelos por **custo total para produzir uma resposta correta**, e não apenas pelo preço nominal de 1 milhão de tokens. Um modelo barato que exige várias tentativas, contexto excessivo ou revisão humana pode custar mais no resultado final.

Antes da escolha, montar um conjunto de pelo menos 100 casos reais e comparar os modelos em:

- precisão da resposta;
- fidelidade à convenção, atas e contratos;
- qualidade das citações;
- taxa de alucinação;
- qualidade em português;
- capacidade de reconhecer incerteza e necessidade de especialista;
- latência;
- custo médio por resposta aprovada;
- requisitos de privacidade e tratamento de dados;
- estabilidade e disponibilidade da API.

O modelo vencedor pode variar por tarefa. A arquitetura deve aceitar um roteamento semelhante a:

| Tipo de tarefa | Classe de modelo recomendada |
|---|---|
| Classificar documento, extrair datas e gerar etiquetas | Econômico |
| Escrever comunicado simples a partir de fatos confirmados | Econômico |
| Localizar trechos e responder perguntas diretas | Econômico, com escalonamento se necessário |
| Cruzar convenção, regimento e atas | Intermediário |
| Comparar contratos ou orçamentos complexos | Intermediário |
| Tema jurídico sensível, conflito documental ou alto risco | Avançado e validação humana |

Não escolher o provedor apenas pelo preço dos tokens. O preço é fundamental, mas existe um piso inegociável de qualidade, privacidade e segurança. Avaliar qualidade em português, fidelidade às fontes, proteção de dados, disponibilidade, latência e estabilidade comercial.

## 16. Plano de validação antes do produto completo

1. Entrevistar de 15 a 25 síndicos profissionais e moradores.
2. Solicitar documentos anonimizados de 5 a 10 condomínios.
3. Reunir pelo menos 100 perguntas reais já enfrentadas por esses síndicos.
4. Criar um protótipo assistido: o usuário envia pergunta e documentos; a equipe usa IA e revisa a resposta manualmente.
5. Medir tempo atual versus tempo com o protótipo.
6. Avaliar as respostas às cegas com síndicos e especialistas.
7. Cobrar por um piloto, ainda que pequeno, para validar disposição de pagamento.
8. Observar uso durante quatro a oito semanas, não apenas intenção declarada.
9. Medir se usuários satisfeitos solicitam voluntariamente conhecer a Zermatt e se a presença da oferta comercial afeta sua percepção de confiança.

### Métricas de sucesso

- percentual de respostas consideradas corretas e fundamentadas;
- percentual de citações que realmente sustentam a resposta;
- redução de tempo por tarefa;
- perguntas por condomínio por semana;
- retorno semanal dos usuários;
- documentos adicionados por usuário;
- correções e respostas rejeitadas;
- alertas considerados úteis;
- conversão de piloto gratuito para pago;
- disposição de indicar o produto.
- custo de IA por condomínio ativo;
- custo médio por resposta aprovada;
- percentual de tarefas resolvidas por modelos econômicos;
- percentual de perguntas escaladas para modelos mais caros;
- tempo até o usuário obter valor na primeira sessão;
- oportunidades comerciais qualificadas com consentimento explícito;
- percentual de usuários ativos que solicitam conhecer ou simular os serviços da Zermatt;
- custo do aplicativo por usuário ativo e por oportunidade qualificada;
- percepção do usuário de que a abordagem comercial é transparente e não invasiva;

## 17. Critérios de continuidade

Continuar investindo se houver evidência de que:

- usuários retornam espontaneamente toda semana;
- o produto economiza tempo mensurável;
- respostas com fontes aumentam a confiança;
- pelo menos um segmento aceita pagar;
- profissionais ativam vários condomínios;
- erros graves são raros, detectáveis e controláveis.
- o preço acessível ajuda a cobrir o custo variável do aplicativo sem reduzir o uso útil;
- usuários satisfeitos geram oportunidades comerciais voluntárias e qualificadas para a Zermatt.

Reavaliar a hipótese se:

- o chat for usado somente ocasionalmente;
- usuários preferirem encaminhar tudo à administradora ou ao advogado;
- a preparação dos documentos exigir esforço excessivo;
- a IA não conseguir distinguir versões e regras conflitantes;
- usuários não confiarem em enviar dados;
- o custo de aquisição e suporte superar o valor percebido.
- a abordagem comercial reduzir a confiança ou a recorrência;
- o aplicativo atrair uso, mas não gerar interesse qualificado pelos serviços da Zermatt.

## 18. Modelo de cobrança a testar

- assinatura acessível por condomínio;
- assinatura por carteira, com faixas de condomínios e limites justos de utilização;
- plano profissional com usuários adicionais;
- taxa opcional de implantação para organização inicial dos documentos;
- plano corporativo para administradoras, somente após validação.

O aplicativo não será gratuito por padrão. O preço deve ajudar a cobrir os custos de inteligência artificial, infraestrutura, suporte e operação, além de desestimular abuso, sem buscar maximizar a margem direta do software. Evitar cobrança por mensagem na interface, pois pode desestimular o uso; preferir uma assinatura compreensível, com limites justos, roteamento de modelos e cache.

O preço-alvo deve ser definido depois dos pilotos. A equação econômica deve considerar o custo por usuário ativo, o custo por resposta aprovada e o custo por oportunidade comercial qualificada. O usuário não precisa saber qual modelo respondeu; ele deve receber a melhor resposta dentro do padrão de qualidade contratado.

## 19. Riscos principais

### Produto

- baixa frequência de uso;
- percepção de ser apenas um chat genérico;
- onboarding trabalhoso;
- alertas excessivos ou irrelevantes.
- oferta comercial percebida como insistente, oculta ou conflitante com o interesse do síndico;
- preço tão baixo que atraia abuso ou impeça manter a qualidade esperada.

### Técnicos

- alucinações;
- OCR incorreto;
- recuperação da versão errada;
- mistura de dados entre condomínios;
- falhas em documentos longos ou mal digitalizados;
- dependência de um único fornecedor de IA.

### Jurídicos e de confiança

- vazamento de dados pessoais e financeiros;
- orientação interpretada como parecer profissional;
- decisão errada baseada em resposta incompleta;
- ausência de consentimento ou base legal para determinados dados;
- falta de transparência sobre armazenamento e uso das informações.
- uso indevido de documentos ou comportamento do usuário para prospecção comercial;
- confusão entre recomendação independente da IA e oferta de serviços da Zermatt.

## 20. Decisões que ainda precisam ser validadas

- qual segmento sente a dor com maior intensidade;
- quem paga: síndico, condomínio ou administradora;
- se a interface principal deve ser chat, painel de prioridades ou uma combinação;
- quais três tarefas geram uso recorrente;
- nível de revisão humana necessário;
- quais integrações realmente influenciam a compra;
- preço aceitável por condomínio;
- modelo de IA com melhor relação entre qualidade, privacidade e custo.
- custo máximo de IA aceitável por condomínio ativo e por resposta aprovada;
- quais tarefas podem usar modelos econômicos sem perda relevante de confiança;
- qual preço acessível ajuda a cobrir o custo variável sem prejudicar adoção e recorrência;
- o que caracteriza uma oportunidade comercial qualificada para a Zermatt;
- em qual momento e formato uma oferta opcional é útil sem ser invasiva;
- quais sinais comerciais podem ser usados com consentimento sem analisar documentos confidenciais para prospecção.

## 21. Recomendação do que construir primeiro

Construir primeiro um **consultor documental com fontes e memória por condomínio**, acompanhado de extração simples de obrigações.

O primeiro fluxo deve permitir que o síndico envie convenção, regimento, algumas atas e contratos; faça perguntas; receba respostas com página e trecho; e transforme a resposta em um comunicado ou pendência.

Esse núcleo testa as premissas mais importantes:

- os documentos contêm contexto suficiente;
- a IA consegue responder com precisão;
- o usuário confia em respostas citadas;
- há economia real de tempo;
- o uso se repete;
- existe disposição de pagamento.

Somente depois disso adicionar automações, integrações e módulos operacionais.

Depois que o núcleo documental demonstrar utilidade e confiança, o piloto deve testar um caminho comercial mínimo, separado da conversa da IA, pelo qual o síndico possa solicitar voluntariamente informações ou uma simulação da Zermatt. Esse fluxo não deve alterar a resposta, usar documentos para prospecção oculta nem iniciar contato sem confirmação explícita.

## 22. Instrução resumida para o Codex

> Desenvolva um MVP web de um conselheiro de IA robusto e fácil de usar para síndicos. O sistema deve manter dados completamente separados por condomínio, receber documentos, processar PDFs e imagens, controlar versão e vigência, responder perguntas usando apenas fontes recuperadas daquele condomínio e citar documento, página e trecho. Também deve gerar comunicados e extrair datas e obrigações para uma lista de pendências. Não implemente contabilidade, boletos, portaria, marketplace ou envio automático de mensagens. Priorize conversa natural, confiança, baixo custo operacional, rastreabilidade, LGPD, confirmação humana e capacidade de trocar ou combinar provedores de IA. Implemente roteamento por complexidade, cache, recuperação apenas dos trechos relevantes, limites de tokens e medição do custo por tarefa e condomínio. Use o caminho mais econômico que alcance o nível mínimo de qualidade e escale somente quando necessário. Toda resposta deve separar conclusão, evidência, ressalvas e próximo passo, declarando quando não houver base suficiente ou quando for necessário consultar um especialista. O aplicativo deve cobrar um preço acessível para ajudar a cobrir seus custos e funcionar como canal de relacionamento da Zermatt, com qualquer oferta comercial separada da orientação da IA, opcional e dependente de confirmação explícita. Não use documentos confidenciais para prospecção oculta.

## 23. Referências de mercado e preços consultadas

- OpenAI, comparação de modelos: <https://developers.openai.com/api/docs/models/compare>
- DeepSeek, modelos e preços: <https://api-docs.deepseek.com/quick_start/pricing/>
- Estimativa setorial de condomínios baseada no Censo Condominial uCondo: <https://portal.crea-sc.org.br/premio-sindicos-planning-2026-abre-inscricoes-e-destaca-categorias-alinhadas-ao-crescimento-do-setor-condominial-em-sc/>
- Pesquisa Datafolha/Superlógica sobre profissionalização dos síndicos: <https://blog.superlogica.com/imprensa/releases/46-dos-sindicos-ja-sao-profissionais/>

Os números de mercado devem ser tratados como estimativas setoriais, pois não há uma contagem nacional consolidada de pessoas únicas atuando como síndico. Para dimensionamento comercial, preferir número de condomínios e carteiras administradas.
