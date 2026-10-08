# Definição do MVP

**Status:** proposta inicial derivada do briefing  
**Atualizado em:** 2026-10-06

## Relação com a visão

`BRIEFING_PRODUTO_CONSELHEIRO_SINDICO.md` é a visão canônica. Este documento é uma projeção operacional resumida e não substitui o briefing. Toda spec deve ser conferida diretamente contra o briefing completo; em caso de incompatibilidade, a spec deve ser corrigida ou a mudança de visão deve ser explicitamente aprovada e registrada no briefing.

## Visão

Oferecer ao síndico um conselheiro de IA robusto e fácil de usar para consultar documentos do condomínio, receber respostas fundamentadas e registrar próximos passos sem depender de memória pessoal, conhecimento técnico ou releitura manual.

O produto não é apenas um chat com arquivos. Seu valor está no isolamento entre condomínios, controle de versão e vigência, evidências verificáveis, memória institucional e acompanhamento de obrigações.

## Público inicial

Síndicos profissionais independentes e pequenas empresas de sindicatura que administram aproximadamente 3 a 20 condomínios.

## Problema inicial

Encontrar, cruzar e explicar informações específicas de convenções, regimentos, atas e contratos com rapidez e evidência documental suficiente para apoiar uma decisão.

## Promessa do MVP

> Encontre respostas confiáveis nos documentos do condomínio, acompanhe obrigações e prepare decisões em minutos, sempre com indicação da fonte.

## Papel do MVP para a Zermatt

O aplicativo é um canal de aquisição, relacionamento e construção de confiança para a Zermatt Garantidora. Seu principal indicador de sucesso econômico é o número de oportunidades comerciais qualificadas e consentidas entregues ao time comercial. A assinatura deve ser acessível e ajudar a cobrir os custos de IA, infraestrutura e operação; a margem direta do software não é o objetivo econômico principal.

Quando o fluxo correspondente estiver implementado e testado, o MVP deve oferecer um caminho comercial mínimo, separado da orientação da IA, pelo qual o usuário possa solicitar voluntariamente conhecer ou simular os serviços da Zermatt. Respostas, recomendações e alertas não podem ser influenciados por interesse comercial, e nenhum contato pode ocorrer sem confirmação explícita.

## Capacidades do MVP

1. Autenticar usuários e autorizar acesso por condomínio.
2. Criar e manter condomínios com dados separados, incluindo nome, endereço, administradora, quantidade de unidades, contato da gestão, descrição curta e fotos privadas de identificação; esses dados de apresentação não substituem documentos como base de respostas.
3. Receber PDF, DOCX, planilhas e imagens digitalizadas.
4. Classificar documentos, registrar procedência, versão e vigência.
5. Processar texto e OCR com indicador de qualidade.
6. Responder perguntas usando somente evidências autorizadas do condomínio selecionado.
7. Citar documento, versão, página e trecho.
8. Resumir convenções, atas e contratos.
9. Gerar rascunhos de comunicados com confirmação humana.
10. Extrair datas, obrigações e responsáveis para uma lista de pendências.
11. Registrar feedback, fontes, versão de prompt/modelo, latência e custo estimado.
12. Permitir que o usuário solicite, em um fluxo separado e opcional, informações ou uma simulação dos serviços da Zermatt.
13. Analisar balancetes em PDF, recalcular totais e gerar um rascunho de prestação de contas com evidências e revisão humana.
14. Interpretar visualmente fotos enviadas explicitamente no chat, identificar a descrição gerada por IA e permitir busca textual por embeddings multimodais no PostgreSQL, com isolamento e evidência por condomínio.

## Formato de resposta

- resposta direta;
- base documental;
- pontos de atenção;
- próximo passo sugerido;
- indicação de especialista quando aplicável.

Fatos encontrados, interpretação e recomendação devem permanecer claramente separados.

## Fora do escopo inicial

- contabilidade completa, auditoria automática e aprovação automática de contas;
- boletos e operações bancárias;
- portaria e controle de acesso;
- aplicativo completo para moradores;
- marketplace de fornecedores;
- parecer jurídico definitivo;
- envio automático de mensagens;
- decisões ou alterações irreversíveis;
- integrações amplas antes de validar uso recorrente.
- prospecção baseada no conteúdo confidencial dos documentos;
- contato comercial sem solicitação ou confirmação do usuário;
- recomendação comercial disfarçada de orientação imparcial da IA.

## Princípios

- evidência antes da resposta;
- isolamento por condomínio em todas as camadas;
- abstenção segura quando a base for insuficiente;
- confirmação humana para ações externas;
- transparência sobre fontes, conflitos e incerteza;
- privacidade e direitos compatíveis com a LGPD;
- arquitetura independente de provedor de IA;
- menor custo capaz de cumprir o piso de qualidade.
- experiência fácil de usar sem limitar a profundidade do produto;
- independência entre orientação da IA e oferta comercial;
- consentimento explícito antes de qualquer contato da Zermatt.

## Hipóteses que o MVP deve validar

- os documentos disponíveis contêm contexto suficiente;
- a recuperação encontra a versão e os trechos corretos;
- respostas citadas aumentam a confiança;
- o fluxo economiza tempo mensurável;
- o uso se repete semanalmente;
- existe disposição de pagamento;
- o custo de IA é sustentável por condomínio ativo.
- usuários satisfeitos solicitam voluntariamente conhecer a Zermatt;
- a oferta comercial pode ser transparente e não invasiva sem reduzir confiança ou recorrência.

## Indicadores de validação

### Principal de negócio

- número de oportunidades comerciais qualificadas e consentidas aceitas pelo time comercial da Zermatt.

### Produto, confiança e eficiência

- respostas corretas e fundamentadas;
- citações que realmente sustentam a resposta;
- abstenções corretas;
- redução de tempo por tarefa;
- retorno semanal e perguntas por condomínio;
- correções e rejeições;
- conversão de piloto para pago;
- custo médio por resposta aprovada.
- tempo até o primeiro valor percebido;
- conversão de usuários ativos em solicitações voluntárias de contato ou simulação;
- percentual de solicitações aceitas como oportunidades qualificadas pelo time comercial;
- conversão de oportunidades em conversas, propostas e contratos;
- custo do aplicativo por usuário ativo e por oportunidade qualificada;
- percepção de independência e ausência de pressão comercial.

## Primeira fatia vertical

A primeira entrega implementável é descrita em `docs/specs/001-consulta-documental/`: carregar PDFs de dois condomínios, fazer uma pergunta, recuperar somente evidências autorizadas, responder com citações ou se abster e registrar feedback e telemetria. O caminho comercial da Zermatt não pertence a essa primeira fatia; ele só deve ser testado depois que o núcleo de confiança estiver funcionando.

## Próximas fatias verticais autorizadas

Por decisão explícita de produto em 2026-09-24, a prioridade imediata é garantir a leitura integral
dos PDFs: todas as páginas devem ser contabilizadas, a estrutura de linhas deve ser preservada e
qualquer página vazia, ilegível ou incompleta impede o estado de documento pronto. A interface deve
mostrar a completude e as páginas que exigem revisão.

Em 2026-10-06, o usuário autorizou como próxima fatia, depois da leitura integral de PDFs, a
interpretação de fotos enviadas pelo síndico no chat. A foto só é transmitida à Gemini API com aviso
visível e clique explícito de envio, usando projeto com faturamento ativo; a cota gratuita é
proibida. Original, descrição visual claramente atribuída à IA, texto reconhecido e vetor
multimodal ficam vinculados ao mesmo condomínio no PostgreSQL. Esta autorização não libera dados
reais ou pilotos: permanecem bloqueados até os gates de LGPD, avaliação de fornecedor, retenção,
exclusão e resposta a incidentes.

Depois dessa fatia, a análise assistida de balancetes será entregue em três partes: conferência e
cálculos básicos; análise financeira e perguntas naturais; e rascunho imprimível de prestação de
contas. O resultado nunca significa contas aprovadas, auditoria concluída ou conciliação bancária.
Dados ambíguos, ilegíveis ou incompletos permanecem em revisão e toda correção humana é auditada.

O desenvolvimento não depende de concluir um piloto formal. Cada módulo avança quando sua fatia
end-to-end está utilizável, os gates aplicáveis passam e o usuário consegue testá-la. Segurança,
isolamento, privacidade, evidência e revisão humana continuam sendo bloqueios obrigatórios.
